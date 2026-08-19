import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatService } from './chat.service';
import { DesignWorkflowService } from './design-workflow.service';
import { JobService } from '../../marketplace/services/job.service';
import { OpenAIService } from './openai.service';
import { StreamChatService } from './stream-chat.service';
import { PromptService } from './prompt.service';
import { CreditService } from '../../credits/services/credit.service';
import { AIActionType } from '../../credits/entities/credit-transaction.entity';
import { SendMessageDto, AIModel } from '../dto/chat.dto';
import { ChatState, ChatMessage } from '../entities/chat.entity';

// ─── Intake sub-steps ──────────────────────────────────────────────────────────
// These track progress within the INFO_GATHER state.
// The state machine only has INFO_GATHER as a DB value — sub-steps live in metadata.
// This avoids a DB migration while giving us structured intake flow.
type IntakeStep =
  | 'fabric_question'   // asking if they have fabric (Path A/B fork)
  | 'fabric_photo'      // waiting for fabric photo upload (Path A only)
  | 'occasion'          // asking what the occasion is
  | 'style'             // asking about style preference
  | 'ready_to_generate' // all info collected, ready to generate designs

@Injectable()
export class InteractiveChatService {
  private readonly logger = new Logger(InteractiveChatService.name);

  constructor(
    private readonly chatService: ChatService,
    private readonly designWorkflowService: DesignWorkflowService,
    private readonly jobService: JobService,
    private readonly openaiService: OpenAIService,
    private readonly streamChatService: StreamChatService,
    private readonly promptService: PromptService,
    private readonly creditService: CreditService,
    @InjectRepository(ChatMessage)
    private messageRepository: Repository<ChatMessage>,
  ) {}

  // ─── Start chat ─────────────────────────────────────────────────────────────
  // Called when a user opens a new chat.
  // Sends the welcome message and sets state to WELCOME.
  async startDesignChat(userId: string) {
    const chat = await this.chatService.createChat(userId, {
      title: 'New Design Chat',
    });

    await this.streamChatService.createChannel(chat.id, userId);

    // Welcome is already stored as an assistant message in createChat.
    // Do NOT save it as a user message — that blocked the intake flow and hid replies.
    const welcomeMessage = this.promptService.getPromptForState(
      ChatState.WELCOME,
      true,
    );

    await this.streamChatService.sendAIMessage(chat.id, welcomeMessage);

    await this.chatService.updateChat(chat.id, {
      metadata: {
        managedByInteractive: true,
        intakeStep: 'fabric_question' as IntakeStep,
        hasFabric: null,
        occasion: null,
        eventDate: null,
        stylePreference: null,
        fabricDescription: null,
      },
    });

    return {
      ...chat,
      welcomeMessage,
      quickButtons: this.promptService.getQuickButtons(ChatState.WELCOME),
    };
  }

  // ─── Process message ─────────────────────────────────────────────────────────
  // Entry point for every user message.
  // Routes to the right handler based on the chat's current state.
  async processMessage(userId: string, dto: SendMessageDto) {
    let chat;
    try {
      chat = await this.chatService.getChat(userId, dto.chatId);
    } catch (error) {
      chat = await this.startDesignChat(userId);
      dto.chatId = chat.id;
    }

    // Keep metadata flags up to date
    const updatedMetadata = {
      ...chat.metadata,
      managedByInteractive: true,
      ...(dto.model && { preferredModel: dto.model }),
    };

    if (
      !chat.metadata?.managedByInteractive ||
      (dto.model && dto.model !== chat.metadata?.preferredModel)
    ) {
      await this.chatService.updateChat(dto.chatId, {
        metadata: updatedMetadata,
      });
      chat.metadata = updatedMetadata;
    }

    // Save the user's message
    const fabricImage = dto.imageBase64 || dto.sketchData;
    const messageData: any = {
      chatId: dto.chatId,
      content: dto.content || (fabricImage ? '[fabric photo]' : ''),
      imageBase64: dto.imageBase64,
    };

    if (fabricImage) {
      messageData.metadata = { hasImage: true };
    }

    const savedUserMessage = await this.chatService.sendMessage(userId, messageData);
    const uploadedImageUrl =
      savedUserMessage?.imageUrl && savedUserMessage.imageUrl !== 'mock-image-url'
        ? savedUserMessage.imageUrl
        : undefined;

    if (uploadedImageUrl) {
      await this.chatService.updateChat(dto.chatId, {
        metadata: {
          ...chat.metadata,
          managedByInteractive: true,
          fabricImageUrl: uploadedImageUrl,
          ...(dto.model && { preferredModel: dto.model }),
        },
      });
      chat.metadata = {
        ...chat.metadata,
        fabricImageUrl: uploadedImageUrl,
      };
    }

    // Sanitize before any AI processing — strips phone numbers, emails, URLs
    const sanitizedContent = this.promptService.sanitizeUserMessage(
      dto.content || '',
    );

    // Action-type short-circuit handlers — these are frontend-triggered actions
    // for the design approval and minting flow (unchanged from original)
    if (dto.actionType && dto.actionType.startsWith('design:')) {
      return this.handleDesignAction(userId, dto, chat);
    }

    let result;
    switch (chat.state) {
      case ChatState.WELCOME:
      case ChatState.INTENT:
      case ChatState.INFO_GATHER:
        result = await this.handleIntake(
          userId,
          dto.chatId,
          sanitizedContent,
          fabricImage || uploadedImageUrl,
        );
        break;

      case ChatState.DESIGN_PREVIEW:
        result = await this.handleDesignSelection(userId, dto.chatId, sanitizedContent);
        break;

      case ChatState.DESIGN_APPROVED:
        result = await this.handleDesignSelection(userId, dto.chatId, sanitizedContent);
        break;

      default:
        result = await this.handleGeneralMessage(userId, dto.chatId, sanitizedContent);
    }

    return { ...result, uploadedImageUrl };
  }

  // ─── Intake flow ──────────────────────────────────────────────────────────────
  // Handles all intake states: WELCOME, INTENT, INFO_GATHER
  // Uses intakeStep in metadata to track progress through sub-steps.
  // One question at a time — never asks for more than one thing.
  private async handleIntake(
    userId: string,
    chatId: string,
    content: string,
    sketchData?: string,
  ) {
    const chat = await this.chatService.getChat(userId, chatId);
    const metadata = chat.metadata || {};
    const step: IntakeStep = metadata.intakeStep || 'fabric_question';

    this.logger.log(`Intake step: ${step} | chatId: ${chatId}`);

    switch (step) {

      // ── Step 1: fabric question ──────────────────────────────────────────────
      // User answers whether they have fabric or not.
      // This is the fork between Path A and Path B.
      case 'fabric_question': {
        // Ignore echoed welcome / empty pings
        if (
          !content.trim() && !sketchData
        ) {
          const askAgain =
            "To get started: do you have a fabric you'd like to use, or a design photo to upload?";
          return {
            chatId,
            state: chat.state,
            aiResponse: askAgain,
            quickButtons: this.promptService.getQuickButtons(ChatState.WELCOME),
          };
        }
        if (/hi!?\s*i'?m astra/i.test(content) && !sketchData) {
          return {
            chatId,
            state: chat.state,
            aiResponse: this.promptService.getPromptForState(ChatState.WELCOME, true),
            quickButtons: this.promptService.getQuickButtons(ChatState.WELCOME),
          };
        }

        const hasFabric = await this.detectFabricAnswer(content, Boolean(sketchData));

        if (hasFabric === null) {
          // Unclear answer — ask again clearly
          const clarify =
            "Just to check — do you have a fabric you'd like to use, or are you starting from an idea? Tap one of the options below.";
          await this.streamChatService.sendAIMessage(chatId, clarify);
          return {
            chatId,
            state: chat.state,
            aiResponse: clarify,
            quickButtons: ['Yes, I have fabric', 'No, just an idea'],
          };
        }

        if (hasFabric) {
          // They already uploaded a fabric/design photo — skip asking again.
          if (sketchData) {
            const fabricDescription = await this.describeFabricFromPhoto(
              content,
              sketchData,
            );
            const askOccasion =
              "Got it — I have your photo. Tell me about the occasion — what's the event, and when is it?";
            await this.streamChatService.sendAIMessage(chatId, askOccasion);
            await this.chatService.updateChat(chatId, {
              state: ChatState.INFO_GATHER,
              metadata: {
                ...metadata,
                hasFabric: true,
                hasFabricPhoto: true,
                fabricDescription,
                ...(typeof sketchData === 'string' && /^https?:\/\//i.test(sketchData)
                  ? { fabricImageUrl: sketchData }
                  : {}),
                intakeStep: 'occasion' as IntakeStep,
              },
            });
            return { chatId, state: 'info_gather', aiResponse: askOccasion };
          }

          // Path A — they have fabric. Ask for a photo.
          const askPhoto =
            "Great! Upload a photo of your fabric so I can design around its colour and texture.";
          await this.streamChatService.sendAIMessage(chatId, askPhoto);
          await this.chatService.updateChat(chatId, {
            state: ChatState.INFO_GATHER,
            metadata: {
              ...metadata,
              hasFabric: true,
              intakeStep: 'fabric_photo' as IntakeStep,
            },
          });
          return { chatId, state: 'info_gather', aiResponse: askPhoto };
        } else {
          // Path B — no fabric. Skip photo, go straight to occasion.
          const askOccasion =
            "No problem at all! Tell me about the occasion — what's the event, and when is it?";
          await this.streamChatService.sendAIMessage(chatId, askOccasion);
          await this.chatService.updateChat(chatId, {
            state: ChatState.INFO_GATHER,
            metadata: {
              ...metadata,
              hasFabric: false,
              intakeStep: 'occasion' as IntakeStep,
            },
          });
          return { chatId, state: 'info_gather', aiResponse: askOccasion };
        }
      }

      // ── Step 2a: fabric photo (Path A only) ────────────────────────────────
      // Wait for an image upload. If no image yet, keep asking.
      case 'fabric_photo': {
        const hasPhoto = this.hasFabricPhoto(chat, content, sketchData);

        if (!hasPhoto) {
          const nudge =
            "I need a photo of the fabric to design around it — tap the photo icon to upload one, or describe the fabric if you're not able to upload right now.";
          await this.streamChatService.sendAIMessage(chatId, nudge);
          return { chatId, state: 'info_gather', aiResponse: nudge };
        }

        const fabricDescription = await this.describeFabricFromPhoto(
          content,
          sketchData,
        );

        const askOccasion = `Lovely fabric! Tell me about the occasion — what's the event and when is it?`;
        await this.streamChatService.sendAIMessage(chatId, askOccasion);
        await this.chatService.updateChat(chatId, {
          metadata: {
            ...metadata,
            fabricDescription,
            hasFabricPhoto: true,
            ...(typeof sketchData === 'string' && /^https?:\/\//i.test(sketchData)
              ? { fabricImageUrl: sketchData }
              : {}),
            intakeStep: 'occasion' as IntakeStep,
          },
        });
        return { chatId, state: 'info_gather', aiResponse: askOccasion };
      }

      // ── Step 2b / 3: occasion ───────────────────────────────────────────────
      // Collect the occasion type, role, and event date from one message.
      case 'occasion': {
        const occasionInfo = await this.extractOccasionInfo(content);

        if (!occasionInfo.occasion) {
          const clarify =
            "Could you tell me a bit more about the event? For example: a wedding, prom, birthday dinner — and when is it?";
          await this.streamChatService.sendAIMessage(chatId, clarify);
          return { chatId, state: 'info_gather', aiResponse: clarify };
        }

        const askStyle = this.buildStyleQuestion(
          occasionInfo.occasion,
          metadata.fabricDescription,
        );

        const nextMetadata = {
          ...metadata,
          occasion: occasionInfo.occasion,
          eventDate: occasionInfo.eventDate,
          occasionRole: occasionInfo.role,
          intakeStep: 'style' as IntakeStep,
        };
        await this.streamChatService.sendAIMessage(chatId, askStyle);
        await this.chatService.updateChat(chatId, {
          title: this.buildDesignChatTitle(nextMetadata),
          metadata: nextMetadata,
        });
        return {
          chatId,
          state: 'info_gather',
          aiResponse: askStyle,
          quickButtons: ['Fitted & Structured', 'Flowing & Relaxed', 'Surprise me'],
        };
      }

      // ── Step 4: style preference ────────────────────────────────────────────
      // Collect style direction — then we have everything to generate designs.
      case 'style': {
        const stylePreference = content;

        // All info collected — ready to generate
        const readyMsg =
          `Perfect — I have everything I need. Ready to generate 3 designs for your ${metadata.occasion || 'occasion'}? This uses 1 credit.`;

        const nextMetadata = {
          ...metadata,
          stylePreference,
          intakeStep: 'ready_to_generate' as IntakeStep,
          confirmRequested: true,
        };
        await this.streamChatService.sendAIMessage(chatId, readyMsg);
        await this.chatService.updateChat(chatId, {
          title: this.buildDesignChatTitle(nextMetadata),
          metadata: nextMetadata,
        });
        return {
          chatId,
          state: 'info_gather',
          aiResponse: readyMsg,
          awaitingConfirmation: true,
          quickButtons: ['Yes, generate my designs', 'No, let me change something'],
        };
      }

      // ── Step 5: ready to generate ───────────────────────────────────────────
      // User confirmed — check credits and generate (or stub for week 1).
      case 'ready_to_generate': {
        const isConfirming = this.isUserConfirming(content);

        if (!isConfirming) {
          // User wants to change something — go back to style question
          const goBack =
            "No problem — what would you like to change? You can describe the style, occasion, or anything else.";
          await this.streamChatService.sendAIMessage(chatId, goBack);
          await this.chatService.updateChat(chatId, {
            metadata: {
              ...metadata,
              intakeStep: 'style' as IntakeStep,
              confirmRequested: false,
            },
          });
          return { chatId, state: 'info_gather', aiResponse: goBack };
        }

        // Check credits
        const hasCredits = await this.creditService.hasEnoughCredits(
          userId,
          AIActionType.DESIGN_GENERATION,
        );
        const balance = await this.creditService.getBalance(userId);

        if (!hasCredits) {
          const noCredits = `You need credits to generate designs. Your current balance is ${balance}. Please top up to continue.`;
          await this.streamChatService.sendAIMessage(chatId, noCredits);
          return {
            chatId,
            state: 'info_gather',
            aiResponse: noCredits,
            insufficientCredits: true,
            creditBalance: balance,
          };
        }

        // Deduct credits
        await this.creditService.deductCredits(
          userId,
          AIActionType.DESIGN_GENERATION,
          chatId,
        );

        // Generating message
        const generatingMsg =
          `On it! Generating 3 designs for your ${metadata.occasion || 'occasion'} — this takes a moment ✨`;
        await this.streamChatService.sendAIMessage(chatId, generatingMsg);

        // Build a structured prompt from everything collected
        const designPrompt = this.buildStructuredDesignPrompt(metadata);
        const fabricImageBase64 = await this.resolveFabricImage(chat, sketchData);

        let result;
        try {
          const selectedModel = AIModel.GEMINI;

          result = await this.designWorkflowService.processDesignRequest(userId, {
            prompt: designPrompt,
            fabricImageBase64: fabricImageBase64 || undefined,
            model: selectedModel,
            chatId,
          });
        } catch (error) {
          await this.creditService.refundCredits(
            userId,
            1,
            'Design generation failed',
            chatId,
          );
          const failMsg =
            'I could not generate designs this time. Your credit was refunded — tap generate again.';
          await this.streamChatService.sendAIMessage(chatId, failMsg);
          return { chatId, state: 'info_gather', aiResponse: failMsg };
        }

        const images = (result.designImages || []).filter(
          (url) => url && !url.includes('placeholder') && !url.includes('placehold.co'),
        );
        if (!images.length) {
          await this.creditService.refundCredits(
            userId,
            1,
            'Design generation returned no images',
            chatId,
          );
          const failMsg =
            'I could not generate designs this time. Your credit was refunded — tap generate again.';
          await this.streamChatService.sendAIMessage(chatId, failMsg);
          return { chatId, state: 'info_gather', aiResponse: failMsg };
        }

        const newBalance = await this.creditService.getBalance(userId);

        const completionMsg = this.formatDesignReply(
          `Here are your 3 designs for your ${metadata.occasion || 'occasion'} 🎨 Which look do you want to keep? Pick Design 1, 2, or 3 — you can also keep more than one.`,
          images,
          `💳 Credits remaining: ${newBalance}`,
        );

        const attachments = images.map((url, i) => ({
          type: 'image',
          image_url: url,
          thumb_url: url,
          fallback: `Design ${i + 1}`,
        }));

        await this.streamChatService.sendAIMessage(chatId, completionMsg, attachments);
        await this.chatService.updateChat(chatId, {
          state: ChatState.DESIGN_PREVIEW,
          title: this.buildDesignChatTitle(metadata),
          metadata: {
            ...metadata,
            confirmRequested: false,
            generating: false,
            lastGenerationCompletedAt: new Date().toISOString(),
          },
        });

        return {
          chatId,
          state: 'design_preview',
          designPreviews: images,
          aiResponse: completionMsg,
          creditBalance: newBalance,
          quickButtons: this.promptService.getQuickButtons(ChatState.DESIGN_PREVIEW),
        };
      }

      default: {
        // Fallback — shouldn't be reached but handle gracefully
        return this.handleGeneralMessage(userId, chatId, content);
      }
    }
  }

  // ─── Design selection ─────────────────────────────────────────────────────
  // Handles the DESIGN_PREVIEW state — user picks one look, several looks, or requests changes.
  private async handleDesignSelection(
    userId: string,
    chatId: string,
    content: string,
  ) {
    const chat = await this.chatService.getChat(userId, chatId);
    const conversationHistory = chat.messages
      .map((m) => `${m.role}: ${m.content}`)
      .join('\n');
    const pickButtons = this.promptService.getQuickButtons(ChatState.DESIGN_PREVIEW);
    const multiPickButtons = [
      'Design 1',
      'Design 2',
      'Design 3',
      'All three',
      'Save my picks',
    ];

    if (chat.metadata?.awaitingMultiPick && !this.wantsNewVariation(content)) {
      return this.handleMultiPick(userId, chatId, chat, content, multiPickButtons);
    }

    const selections = this.detectDesignSelections(content);
    if (selections.length > 0) {
      return this.saveSelectedLooks(userId, chatId, chat, selections);
    }

    if (this.wantsMultipleLooks(content) || this.lovesThisWithoutNumber(content)) {
      const pickMsg = this.lovesThisWithoutNumber(content)
        ? 'Which look do you want to keep? Pick Design 1, 2, or 3. If you like more than one, tap “I like more than one” and I’ll save each of them.'
        : 'Tap every look you want to keep, then tap Save my picks. You can also tap All three.';
      await this.streamChatService.sendAIMessage(chatId, pickMsg);
      await this.chatService.updateChat(chatId, {
        metadata: {
          ...chat.metadata,
          awaitingMultiPick: this.wantsMultipleLooks(content),
          pendingPicks: [],
        },
      });
      return {
        chatId,
        state: 'design_preview',
        aiResponse: pickMsg,
        quickButtons: this.wantsMultipleLooks(content) ? multiPickButtons : pickButtons,
      };
    }

    // Check if waiting for variation confirmation
    if (chat.metadata?.confirmVariationRequested) {
      const decision = this.classifyYesNo(content);
      if (decision === 'yes') {
        const hasCredits = await this.creditService.hasEnoughCredits(
          userId,
          AIActionType.DESIGN_VARIATION,
        );
        const balance = await this.creditService.getBalance(userId);
        if (!hasCredits) {
          const noCredits = `You need credits to generate variations. Balance: ${balance}.`;
          await this.streamChatService.sendAIMessage(chatId, noCredits);
          return {
            chatId,
            state: 'design_preview',
            aiResponse: noCredits,
            insufficientCredits: true,
            creditBalance: balance,
          };
        }
        await this.creditService.deductCredits(
          userId,
          AIActionType.DESIGN_VARIATION,
          chatId,
        );
        const generatingMsg = 'Generating new variations for you...';
        await this.streamChatService.sendAIMessage(chatId, generatingMsg);

        const designPrompt = this.buildStructuredDesignPrompt(chat.metadata);
        const pendingMod = chat.metadata?.pendingModification || '';
        const enhancedPrompt = `${designPrompt} ${pendingMod} ${content}`.trim();

        let result;
        try {
          result = await this.designWorkflowService.processDesignVariation(
            userId,
            chatId,
            enhancedPrompt,
            AIModel.GEMINI,
          );
        } catch (error) {
          await this.creditService.refundCredits(
            userId,
            1,
            'Variation generation failed',
            chatId,
          );
          const failMsg =
            'I could not generate new designs this time. Your credit was refunded — try again in a moment.';
          await this.streamChatService.sendAIMessage(chatId, failMsg);
          return { chatId, state: 'design_preview', aiResponse: failMsg };
        }

        const newBalance = await this.creditService.getBalance(userId);
        const images = (result.designImages || []).filter(
          (url) => url && !url.includes('placeholder') && !url.includes('placehold.co'),
        );
        const reply = this.formatDesignReply(
          'Here are your new variations! Which look do you want to keep? Pick Design 1, 2, or 3 — you can also keep more than one.',
          images,
          `💳 Credits remaining: ${newBalance}`,
        );
        const attachments = images.map((url, i) => ({
          type: 'image',
          image_url: url,
          thumb_url: url,
          fallback: `Design ${i + 1}`,
        }));
        await this.streamChatService.sendAIMessage(chatId, reply, attachments);
        await this.chatService.updateChat(chatId, {
          metadata: {
            ...chat.metadata,
            confirmVariationRequested: false,
            pendingModification: null,
            lastGenerationCompletedAt: new Date().toISOString(),
          },
        });
        return {
          chatId,
          state: 'design_preview',
          aiResponse: reply,
          designPreviews: images,
          creditBalance: newBalance,
          quickButtons: this.promptService.getQuickButtons(ChatState.DESIGN_PREVIEW),
        };
      }

      if (decision === 'no') {
        const keepMsg =
          "We'll keep your current designs — no new generation. Which one feels most like you?";
        await this.streamChatService.sendAIMessage(chatId, keepMsg);
        await this.chatService.updateChat(chatId, {
          metadata: {
            ...chat.metadata,
            confirmVariationRequested: false,
            pendingModification: null,
          },
        });
        return {
          chatId,
          state: 'design_preview',
          aiResponse: keepMsg,
          quickButtons: this.promptService.getQuickButtons(ChatState.DESIGN_PREVIEW),
        };
      }

      const pendingMod = chat.metadata?.pendingModification || '';
      await this.chatService.updateChat(chatId, {
        metadata: {
          ...chat.metadata,
          pendingModification: `${pendingMod} ${content}`.trim(),
        },
      });
      const msg =
        "Noted. Say yes when you want me to generate with those changes, or no to keep the designs you already have.";
      await this.streamChatService.sendAIMessage(chatId, msg);
      return {
        chatId,
        state: 'design_preview',
        aiResponse: msg,
        quickButtons: ['Yes, generate', 'No, keep these'],
      };
    }

    // Check if user wants a new variation
    const wantsVariation = this.wantsNewVariation(content);
    if (wantsVariation) {
      const hasCredits = await this.creditService.hasEnoughCredits(
        userId,
        AIActionType.DESIGN_VARIATION,
      );
      const balance = await this.creditService.getBalance(userId);
      if (!hasCredits) {
        const noCredits = `You need credits to generate variations. Balance: ${balance}.`;
        await this.streamChatService.sendAIMessage(chatId, noCredits);
        return {
          chatId,
          state: 'design_preview',
          aiResponse: noCredits,
          insufficientCredits: true,
          creditBalance: balance,
        };
      }
      const ask = `I can generate new variations incorporating those changes. This uses 1 credit (balance: ${balance}). Shall I go ahead?`;
      await this.streamChatService.sendAIMessage(chatId, ask);
      await this.chatService.updateChat(chatId, {
        metadata: {
          ...chat.metadata,
          confirmVariationRequested: true,
          awaitingMultiPick: false,
          pendingModification: content,
        },
      });
      return {
        chatId,
        state: 'design_preview',
        aiResponse: ask,
        quickButtons: ['Yes, generate', 'No, let me describe more'],
      };
    }

    if (this.classifyYesNo(content) === 'no') {
      const stayMsg =
        "No problem. We'll keep the designs you have. Which look do you want to keep? Pick Design 1, 2, or 3.";
      await this.streamChatService.sendAIMessage(chatId, stayMsg);
      return {
        chatId,
        state: 'design_preview',
        aiResponse: stayMsg,
        quickButtons: this.promptService.getQuickButtons(ChatState.DESIGN_PREVIEW),
      };
    }

    // General comment on the designs
    const aiResponse = await this.generateContextualResponse(
      content,
      conversationHistory,
      'design_preview',
    );
    await this.streamChatService.sendAIMessage(chatId, aiResponse);
    return {
      chatId,
      state: 'design_preview',
      aiResponse,
      quickButtons: this.promptService.getQuickButtons(ChatState.DESIGN_PREVIEW),
    };
  }

  private async handleMultiPick(
    userId: string,
    chatId: string,
    chat: any,
    content: string,
    multiPickButtons: string[],
  ) {
    const pending: string[] = Array.isArray(chat.metadata?.pendingPicks)
      ? [...chat.metadata.pendingPicks]
      : [];

    if (/^save my picks$/i.test(content.trim())) {
      if (!pending.length) {
        const nudge = 'Tap Design 1, 2, or 3 first, then Save my picks.';
        await this.streamChatService.sendAIMessage(chatId, nudge);
        return {
          chatId,
          state: 'design_preview',
          aiResponse: nudge,
          quickButtons: multiPickButtons,
        };
      }
      return this.saveSelectedLooks(userId, chatId, chat, pending);
    }

    const selections = this.detectDesignSelections(content);
    if (selections.length > 1 || this.isAllThree(content)) {
      return this.saveSelectedLooks(
        userId,
        chatId,
        chat,
        this.isAllThree(content)
          ? ['variation_1', 'variation_2', 'variation_3']
          : selections,
      );
    }

    if (selections.length === 1) {
      const pick = selections[0];
      if (!pending.includes(pick)) pending.push(pick);
      const labels = pending.map((v) => `Design ${v.split('_')[1]}`).join(', ');
      const reply =
        pending.length >= 3
          ? `${labels} are in. Tap Save my picks to keep all three.`
          : `${labels} ${pending.length === 1 ? 'is' : 'are'} in. Add another, or tap Save my picks.`;
      await this.streamChatService.sendAIMessage(chatId, reply);
      await this.chatService.updateChat(chatId, {
        metadata: {
          ...chat.metadata,
          awaitingMultiPick: true,
          pendingPicks: pending,
        },
      });
      return {
        chatId,
        state: 'design_preview',
        aiResponse: reply,
        quickButtons: multiPickButtons,
      };
    }

    const askAgain =
      'Tap Design 1, 2, or 3 to add it, All three to keep every look, or Save my picks when you are ready.';
    await this.streamChatService.sendAIMessage(chatId, askAgain);
    return {
      chatId,
      state: 'design_preview',
      aiResponse: askAgain,
      quickButtons: multiPickButtons,
    };
  }

  private async saveSelectedLooks(
    userId: string,
    chatId: string,
    chat: any,
    varieties: string[],
  ) {
    const unique = [...new Set(varieties)].filter((v) =>
      /^variation_[123]$/.test(String(v)),
    );
    if (!unique.length) {
      const pickMsg =
        'Which look do you want to keep? Pick Design 1, 2, or 3 — you can also keep more than one.';
      await this.streamChatService.sendAIMessage(chatId, pickMsg);
      return {
        chatId,
        state: 'design_preview',
        aiResponse: pickMsg,
        quickButtons: this.promptService.getQuickButtons(ChatState.DESIGN_PREVIEW),
      };
    }

    const saved = [];
    try {
      const occasion = chat.metadata?.occasion
        ? String(chat.metadata.occasion)
        : 'Design';
      for (const variety of unique) {
        const n = variety.split('_')[1];
        const design = await this.designWorkflowService.saveSelectedDesignForCreator(
          userId,
          chatId,
          variety,
          `${occasion} — Design ${n}`,
        );
        saved.push(design);
      }
    } catch (error) {
      const failMsg = `I couldn't save that design yet: ${error.message}. Please try again.`;
      await this.streamChatService.sendAIMessage(chatId, failMsg);
      return { chatId, state: 'design_preview', aiResponse: failMsg };
    }

    const labels = unique.map((v) => `Design ${v.split('_')[1]}`).join(' and ');
    const approvedMsg =
      unique.length === 1
        ? `${labels} is saved in your Designs tab. Open Designs to publish it or hire a maker.`
        : `I've saved ${labels} in your Designs tab. You can publish or hire a maker for each look.`;

    await this.streamChatService.sendAIMessage(chatId, approvedMsg);
    const last = saved[saved.length - 1];
    await this.chatService.updateChat(chatId, {
      state: ChatState.DESIGN_APPROVED,
      designId: last?.id,
      metadata: {
        ...chat.metadata,
        awaitingMintConfirmation: false,
        awaitingMultiPick: false,
        pendingPicks: unique,
        selectedVariety: unique[0],
        selectedVariation: unique[0],
        selectedDesign: unique[0],
        selectedVariations: unique,
      },
    });
    return {
      chatId,
      state: 'design_approved',
      aiResponse: approvedMsg,
      design: last,
      designId: last?.id,
      selectedVariation: unique.length === 1 ? unique[0] : undefined,
      selectedImageUrl: last?.imageUrl,
    };
  }

  // ─── General message handler ───────────────────────────────────────────────
  // Fallback for any state not explicitly handled above.
  private async handleGeneralMessage(
    userId: string,
    chatId: string,
    content: string,
  ) {
    const chat = await this.chatService.getChat(userId, chatId);
    const conversationHistory = chat.messages
      .map((m) => `${m.role}: ${m.content}`)
      .join('\n');
    const aiResponse = await this.generateContextualResponse(
      content,
      conversationHistory,
      'general',
    );
    await this.streamChatService.sendAIMessage(chatId, aiResponse);
    return { chatId, state: chat.state, aiResponse };
  }

  // ─── Design action handler ─────────────────────────────────────────────────
  // Handles frontend-triggered design:* actions (approve, mint, hire etc.)
  // Largely unchanged from original — these are the post-design actions.
  private async handleDesignAction(userId: string, dto: SendMessageDto, chat: any) {
    const action = dto.actionType;
    try {
      if (action === 'design:variation') {
        const hasCredits = await this.creditService.hasEnoughCredits(userId, AIActionType.DESIGN_VARIATION);
        const balance = await this.creditService.getBalance(userId);
        if (!hasCredits) {
          const msg = `You need credits to generate variations. Balance: ${balance}.`;
          await this.streamChatService.sendAIMessage(dto.chatId, msg);
          return { chatId: dto.chatId, state: 'design_preview', aiResponse: msg, insufficientCredits: true, creditBalance: balance };
        }
        await this.creditService.deductCredits(userId, AIActionType.DESIGN_VARIATION, dto.chatId);
        const chatNow = await this.chatService.getChat(userId, dto.chatId);
        const basePrompt = this.buildStructuredDesignPrompt(chatNow.metadata);
        let result;
        try {
          result = await this.designWorkflowService.processDesignVariation(userId, dto.chatId, `${basePrompt} ${dto.content}`, AIModel.GEMINI);
        } catch (error) {
          await this.creditService.refundCredits(userId, 1, 'Variation generation failed', dto.chatId);
          throw error;
        }
        const newBalance = await this.creditService.getBalance(userId);
        const reply = `New variations generated. Which do you prefer?\n\n💳 Credits remaining: ${newBalance}`;
        await this.streamChatService.sendAIMessage(dto.chatId, reply);
        return { chatId: dto.chatId, state: 'design_preview', designPreviews: result.designImages, aiResponse: reply, creditBalance: newBalance };
      }

      if (action === 'design:select') {
        const sel = (dto.content || '').trim().toLowerCase();
        const valid = ['variation_1', 'variation_2', 'variation_3'];
        if (!valid.includes(sel)) {
          const reply = 'Please choose one of: variation_1, variation_2, variation_3.';
          await this.streamChatService.sendAIMessage(dto.chatId, reply);
          return { chatId: dto.chatId, state: 'design_preview', aiResponse: reply };
        }
        const chatNow = await this.chatService.getChat(userId, dto.chatId);
        await this.chatService.updateChat(dto.chatId, { metadata: { ...chatNow.metadata, selectedVariety: sel } });
        const reply = `Selected ${sel}. Provide approval details in JSON: {"name":"...","price":150,"quantity":1,"deadline":"YYYY-MM-DD"}`;
        await this.streamChatService.sendAIMessage(dto.chatId, reply);
        return { chatId: dto.chatId, state: 'design_preview', aiResponse: reply };
      }

      if (action === 'design:approve') {
        const chatNow = await this.chatService.getChat(userId, dto.chatId);
        const selectedVariety = (chatNow.metadata?.selectedVariety as string) || 'variation_1';
        let payload: any = {};
        try { payload = JSON.parse(dto.content || '{}'); } catch {}
        const missing: string[] = [];
        if (!payload.name) missing.push('name');
        if (typeof payload.price !== 'number') missing.push('price');
        if (typeof payload.quantity !== 'number') missing.push('quantity');
        if (!payload.deadline) missing.push('deadline');
        if (missing.length) {
          const reply = `Missing fields: ${missing.join(', ')}. Example: {"name":"...","price":150,"quantity":1,"deadline":"2025-12-31"}`;
          await this.streamChatService.sendAIMessage(dto.chatId, reply);
          return { chatId: dto.chatId, state: chatNow.state, aiResponse: reply };
        }
        const result = await this.designWorkflowService.approveDesign(userId, {
          chatId: dto.chatId,
          selectedVariety: selectedVariety as any,
          designName: payload.name,
          price: payload.price,
          collectionQuantity: payload.quantity,
          deadline: new Date(payload.deadline),
          description: payload.description,
        });
        const reply = `Design approved. Created DRAFT design: ${result.nft?.id}.`;
        await this.streamChatService.sendAIMessage(dto.chatId, reply);
        return { chatId: dto.chatId, state: ChatState.DESIGN_PREVIEW, aiResponse: reply, nft: result.nft };
      }

      if (action === 'design:publish') {
        const chatNow = await this.chatService.getChat(userId, dto.chatId);
        if (!chatNow.designId) {
          const reply = 'No saved design found yet. Pick a look first.';
          await this.streamChatService.sendAIMessage(dto.chatId, reply);
          return { chatId: dto.chatId, aiResponse: reply };
        }
        const design = await this.designWorkflowService.mintAndPublishDesign(
          userId,
          chatNow.designId,
        );
        const reply = `Design published. It is live as ${design.id}.`;
        await this.streamChatService.sendAIMessage(dto.chatId, reply);
        return { chatId: dto.chatId, aiResponse: reply, design };
      }

    } catch (err) {
      const msg = `Something went wrong: ${err?.message || 'unknown error'}`;
      await this.streamChatService.sendAIMessage(dto.chatId, msg);
      return { chatId: dto.chatId, aiResponse: msg };
    }
  }

  // ─── AI helper: contextual response ───────────────────────────────────────
  // Used for free-form responses outside the structured intake.
  // Uses the unified system prompt from PromptService.
  private async generateContextualResponse(
    userMessage: string,
    conversationHistory: string,
    currentState: string,
  ): Promise<string> {
    const systemPrompt = this.promptService.getSystemPrompt();
    const contextPrompt = `${systemPrompt}

Current state: ${currentState}
Conversation so far:
${conversationHistory}

User just said: "${userMessage}"

Respond naturally. Keep it short — one or two sentences. Guide toward the next step.`;
    try {
      const response = await this.openaiService.generateResponse(contextPrompt);
      return response.trim();
    } catch (error) {
      return "I'm here! Tell me more about what you'd like to create.";
    }
  }

  // ─── AI helper: detect fabric answer ──────────────────────────────────────
  // Returns true (has fabric), false (no fabric), or null (unclear)
  private async detectFabricAnswer(content: string, hasPhoto = false): Promise<boolean | null> {
    if (hasPhoto) return true;

    const text = (content || '').trim().toLowerCase();
    if (!text) return null;

    if (
      /\b(nope|nah|no fabric|don'?t have|do not have|from scratch|scratch|an idea|just an idea|just idea|idea only|starting from an idea|from an idea)\b/.test(
        text,
      ) ||
      text === 'idea' ||
      text === 'an idea' ||
      text === 'no'
    ) {
      return false;
    }

    if (
      /\b(yes|yeah|yep|yup|i have|i do|have fabric|have a fabric|got fabric)\b/.test(
        text,
      ) ||
      /\b(uploaded|i uploaded|here('s| is) (the |my )?(photo|image|picture|design)|attached|i (sent|shared) (a |the )?(photo|image|picture|design))\b/.test(
        text,
      )
    ) {
      return true;
    }

    // Don't block the chat on OpenAI — ask a clear follow-up instead
    return null;
  }

  // ─── AI helper: detect image in message ───────────────────────────────────
  private hasFabricPhoto(
    chat: { messages?: ChatMessage[]; metadata?: Record<string, any> },
    content: string,
    sketchData?: string,
  ): boolean {
    if (sketchData) return true;
    if (chat.metadata?.hasFabricPhoto) return true;
    if (this.detectImageInMessage(content)) return true;

    const saidAlreadySent =
      /(already (sent|uploaded|shared|sent a)|i (sent|uploaded|attached)|here('s| is) (the |my )?(photo|image|fabric))/i.test(
        content || '',
      );
    const priorImage = (chat.messages || []).some(
      (m) =>
        m.role === 'user' &&
        (Boolean(m.imageUrl) ||
          Boolean(m.metadata?.hasImage) ||
          Boolean(m.metadata?.sketchData)),
    );
    return saidAlreadySent && priorImage ? true : saidAlreadySent || priorImage;
  }

  private detectImageInMessage(content: string): boolean {
    // Check for common image-related phrases as a lightweight signal
    const imageWords = ['uploaded', 'here it is', 'photo', 'image', 'picture', 'attached'];
    return imageWords.some((w) => content.toLowerCase().includes(w));
  }

  // ─── AI helper: describe fabric from photo ────────────────────────────────
  // Called when a fabric photo is uploaded.
  // In week 2 this will use gpt-image-2 vision to analyse the fabric.
  // For week 1 it returns a placeholder description.
  private async describeFabricFromPhoto(
    content: string,
    sketchData?: string,
  ): Promise<string> {
    if (!sketchData) {
      return content || 'fabric (no description available)';
    }

    // WEEK 1 STUB — replace with real vision call in week 2
    // Real implementation will send sketchData to OpenAI vision API and return
    // a description like "deep emerald silk with natural sheen and fluid drape"
    return 'your fabric';
  }

  // ─── AI helper: extract occasion info ────────────────────────────────────
  private async extractOccasionInfo(
    content: string,
  ): Promise<{ occasion: string | null; eventDate: string | null; role: string | null }> {
    try {
      const response = await this.openaiService.generateResponse(
        `Extract occasion information from this message.
Message: "${content}"

Reply in this exact JSON format (no markdown, no backticks):
{"occasion":"wedding","eventDate":"2025-06-15","role":"guest"}

- occasion: the type of event (wedding, prom, birthday, graduation, etc.) or null if unclear
- eventDate: ISO date string if mentioned, or null
- role: their role at the event (guest, bride, groom, etc.) or null

JSON only:`,
      );
      try {
        return JSON.parse(response.trim());
      } catch {
        return { occasion: content, eventDate: null, role: null };
      }
    } catch {
      return { occasion: null, eventDate: null, role: null };
    }
  }

  // ─── Helper: build style question ─────────────────────────────────────────
  private buildStyleQuestion(occasion: string, fabricDescription?: string): string {
    if (fabricDescription && fabricDescription !== 'your fabric') {
      return `For a ${occasion} with ${fabricDescription} — are you thinking something fitted and structured, or flowing and relaxed? Or describe a look you love.`;
    }
    return `For your ${occasion} — are you thinking something fitted and structured, or flowing and relaxed? You can also describe a look you've seen and loved.`;
  }

  // ─── Helper: build structured design prompt ────────────────────────────────
  // Replaces the old "join all messages into a blob" approach.
  // Produces a structured prompt the image model can actually use.
  private buildStructuredDesignPrompt(metadata: Record<string, any>): string {
    const style = String(metadata?.stylePreference || '').trim();
    const occasion = String(metadata?.occasion || '').trim();
    const fabricDescription = String(metadata?.fabricDescription || '').trim();
    const combined = `${style} ${occasion}`.toLowerCase();

    const silhouette = /fit|structur|corset|pencil|tailor/.test(style.toLowerCase())
      ? 'fitted and structured, with couture shaping and a clear waist'
      : /flow|relax|drape|fluid|a-line|empire/.test(style.toLowerCase())
        ? 'flowing and relaxed, with considered drape and volume'
        : style ||
          'a refined occasionwear silhouette with a clear waist and considered volume';

    const garmentType = /wedding|bridal/.test(combined)
      ? 'bridal or wedding-guest occasionwear'
      : /owambe|aso ebi|traditional/.test(combined)
        ? 'contemporary African ceremonial occasionwear'
        : /gala|award|red carpet/.test(combined)
          ? 'red-carpet couture gown'
          : /cocktail/.test(combined)
            ? 'cocktail occasionwear'
            : /suit|groom|mens/.test(combined)
              ? 'tailored occasion suit'
              : 'couture occasionwear garment';

    const embellishmentLevel = /minimal|clean|simple|understated/.test(style.toLowerCase())
      ? 'restrained architectural embellishment — precise, not busy'
      : /bead|crystal|sparkle|owambe|gala|aso/.test(combined)
        ? 'rich handcrafted embellishment following the garment architecture'
        : 'considered couture embellishment that follows construction, not random surface decoration';

    const dramaLevel = /dramatic|royal|owambe|gala|red carpet/.test(combined)
      ? 'high ceremony and confident presence'
      : /minimal|understated|quiet/.test(style.toLowerCase())
        ? 'quiet luxury, controlled drama'
        : 'balanced contemporary occasionwear drama';

    return this.promptService.buildCoutureImagePrompt({
      culturalContext:
        metadata?.culturalContext ||
        'Contemporary African luxury fashion. Use the fabric, occasion and any cultural cues in the brief. Avoid costume clichés.',
      occasion: occasion || undefined,
      aesthetic: style || undefined,
      silhouette,
      garmentType,
      embellishmentLevel,
      dramaLevel,
      fabricDescription: fabricDescription || undefined,
      hasFabricPhoto: Boolean(metadata?.fabricImageUrl),
      rawBrief: [
        occasion && `Occasion: ${occasion}`,
        metadata?.occasionRole && `Role: ${metadata.occasionRole}`,
        fabricDescription && `Fabric: ${fabricDescription}`,
        style && `Style direction: ${style}`,
      ]
        .filter(Boolean)
        .join('. '),
    });
  }

  private formatDesignReply(intro: string, images: string[], footer?: string): string {
    const gallery = images
      .map((url, i) => `**Design ${i + 1}:**\n${url}`)
      .join('\n\n');
    return [intro, gallery, footer].filter(Boolean).join('\n\n');
  }

  private buildDesignChatTitle(metadata: Record<string, any> = {}): string {
    const occasion = String(metadata?.occasion || '').trim();
    const style = String(metadata?.stylePreference || '').trim();
    const prettyOccasion = occasion
      ? occasion.charAt(0).toUpperCase() + occasion.slice(1)
      : '';
    const prettyStyle = style
      ? style.length > 32
        ? `${style.slice(0, 32).trim()}…`
        : style
      : '';
    if (prettyOccasion && prettyStyle) return `${prettyOccasion} · ${prettyStyle}`;
    if (prettyOccasion) return `${prettyOccasion} designs`;
    if (prettyStyle) return prettyStyle;
    return 'Fashion design';
  }

  private async resolveFabricImage(
    chat: { messages?: ChatMessage[]; metadata?: Record<string, any> },
    sketchData?: string,
  ): Promise<string | undefined> {
    if (sketchData?.startsWith('data:')) return sketchData;
    if (sketchData && !/^https?:\/\//i.test(sketchData) && sketchData.length > 80) {
      return sketchData.includes(',') ? sketchData : `data:image/jpeg;base64,${sketchData}`;
    }

    const url =
      (sketchData && /^https?:\/\//i.test(sketchData) ? sketchData : null) ||
      chat.metadata?.fabricImageUrl ||
      this.extractSketchFromMessages(chat.messages || []);

    if (!url) return undefined;
    if (url.startsWith('data:')) return url;
    if (!/^https?:\/\//i.test(url) || url === 'mock-image-url') return undefined;

    try {
      const res = await fetch(url);
      if (!res.ok) return undefined;
      const buf = Buffer.from(await res.arrayBuffer());
      const mime = res.headers.get('content-type') || 'image/jpeg';
      return `data:${mime};base64,${buf.toString('base64')}`;
    } catch (error) {
      this.logger.warn(`Could not fetch fabric image: ${error.message}`);
      return undefined;
    }
  }

  // ─── Helper: extract sketch from messages ─────────────────────────────────
  private extractSketchFromMessages(messages: ChatMessage[]): string | null {
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      const sketch = message.metadata?.sketchData || message.metadata?.sketchUrl;
      if (typeof sketch === 'string' && sketch && sketch !== 'mock-image-url') {
        return sketch;
      }
      if (message.imageUrl && message.imageUrl !== 'mock-image-url') {
        return message.imageUrl;
      }
    }
    return null;
  }

  private classifyYesNo(content: string): 'yes' | 'no' | 'other' {
    const lower = (content || '').toLowerCase().trim();
    if (!lower) return 'other';
    if (
      /^(nope|nah|no)\b/.test(lower) ||
      /\b(no specifics|nothing else|no thanks|not yet|don't generate|do not generate|keep (these|this|it)|that's all|thats all)\b/.test(
        lower,
      )
    ) {
      return 'no';
    }
    if (
      /^(yes|yeah|yep|yup|sure|ok|okay)\b/.test(lower) ||
      (lower.length < 48 &&
        /\b(go ahead|generate|proceed|do it)\b/.test(lower))
    ) {
      return 'yes';
    }
    return 'other';
  }

  // ─── AI helper: is user confirming ────────────────────────────────────────
  private isUserConfirming(content: string): boolean {
    return this.classifyYesNo(content) === 'yes';
  }

  // ─── Helper: wants new variation ───────────────────────────────────────────
  private wantsNewVariation(content: string): boolean {
    const t = (content || '').toLowerCase().trim();
    if (this.classifyYesNo(t) === 'no') return false;
    if (/specific details like what|what do you mean|like what\??$/.test(t)) {
      return false;
    }
    return /\b(generat|another variation|new variation|different (design|one|look)|more options|show me more|show me variations|try again)\b/.test(
      t,
    );
  }

  // ─── Helper: detect design selection ───────────────────────────────────────
  private detectDesignSelections(content: string): string[] {
    const t = (content || '').toLowerCase().trim();
    if (!t) return [];
    if (this.isAllThree(t)) {
      return ['variation_1', 'variation_2', 'variation_3'];
    }
    const picks: string[] = [];
    if (/\b(design\s*1|variation[\s_-]*1|the first|first one|first look)\b/.test(t)) {
      picks.push('variation_1');
    }
    if (/\b(design\s*2|variation[\s_-]*2|the second|second one|second look)\b/.test(t)) {
      picks.push('variation_2');
    }
    if (/\b(design\s*3|variation[\s_-]*3|the third|third one|third look)\b/.test(t)) {
      picks.push('variation_3');
    }
    return [...new Set(picks)];
  }

  private isAllThree(content: string): boolean {
    const t = (content || '').toLowerCase().trim();
    return /\b(all three|all of them|every (one|design|look)|all (the )?designs|all (the )?variations|all three designs)\b/.test(
      t,
    ) || /^all three$/i.test(t);
  }

  private wantsMultipleLooks(content: string): boolean {
    const t = (content || '').toLowerCase().trim();
    return /\b(more than one|more than 1|i like more|two of them|multiple|both|a few of them)\b/.test(
      t,
    );
  }

  private lovesThisWithoutNumber(content: string): boolean {
    const t = (content || '').toLowerCase().trim();
    if (this.detectDesignSelections(t).length > 0) return false;
    return /^(i love this( one)?|love this( one)?|i like this( one)?|this one)$/i.test(
      t,
    );
  }
}