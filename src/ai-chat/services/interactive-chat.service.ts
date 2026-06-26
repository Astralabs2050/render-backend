import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatService } from './chat.service';
import { DesignWorkflowService } from './design-workflow.service';
import { NFTService } from '../../web3/services/nft.service';
import { JobService } from '../../marketplace/services/job.service';
import { OpenAIService } from './openai.service';
import { StreamChatService } from './stream-chat.service';
import { PromptService } from './prompt.service';
import { CreditService } from '../../credits/services/credit.service';
import { AIActionType } from '../../credits/entities/credit-transaction.entity';
import { SendMessageDto } from '../dto/chat.dto';
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
    private readonly nftService: NFTService,
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

    // Welcome message — introduces Astra and immediately asks the fabric question
    // which is the fork between Path A (has fabric) and Path B (has an idea)
    const welcomeMessage = this.promptService.getPromptForState(
      ChatState.WELCOME,
      true,
    );

    await this.streamChatService.sendAIMessage(chat.id, welcomeMessage);
    await this.chatService.sendMessage(userId, {
      chatId: chat.id,
      content: welcomeMessage,
    });

    // Store the first intake sub-step in metadata so we know what we're waiting for
    await this.chatService.updateChat(chat.id, {
      metadata: {
        intakeStep: 'fabric_question' as IntakeStep,
        hasFabric: null,
        occasion: null,
        eventDate: null,
        stylePreference: null,
        fabricDescription: null,
      },
    });

    return { ...chat, welcomeMessage };
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
    const messageData: any = {
      chatId: dto.chatId,
      content: dto.content,
    };

    if (dto.sketchData) {
      messageData.metadata = { sketchData: dto.sketchData };
    }

    await this.chatService.sendMessage(userId, messageData);

    // Sanitize before any AI processing — strips phone numbers, emails, URLs
    const sanitizedContent = this.promptService.sanitizeUserMessage(
      dto.content || '',
    );

    // Action-type short-circuit handlers — these are frontend-triggered actions
    // for the design approval and minting flow (unchanged from original)
    if (dto.actionType && dto.actionType.startsWith('design:')) {
      return this.handleDesignAction(userId, dto, chat);
    }

    await this.streamChatService.syncUserMessageToDatabase(
      dto.chatId,
      dto.content,
      userId,
    );

    // Route by state
    switch (chat.state) {
      case ChatState.WELCOME:
      case ChatState.INTENT:
      case ChatState.INFO_GATHER:
        // All intake states handled by the structured intake flow
        return this.handleIntake(userId, dto.chatId, sanitizedContent, dto.sketchData);

      case ChatState.DESIGN_PREVIEW:
        return this.handleDesignSelection(userId, dto.chatId, sanitizedContent);

      default:
        return this.handleGeneralMessage(userId, dto.chatId, sanitizedContent);
    }
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
        const hasFabric = await this.detectFabricAnswer(content);

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
        const hasPhoto = !!sketchData || await this.detectImageInMessage(content);

        if (!hasPhoto) {
          const nudge =
            "I need a photo of the fabric to design around it — tap the photo icon to upload one, or describe the fabric if you're not able to upload right now.";
          await this.streamChatService.sendAIMessage(chatId, nudge);
          return { chatId, state: 'info_gather', aiResponse: nudge };
        }

        // Photo received — extract description and move to occasion
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

        await this.streamChatService.sendAIMessage(chatId, askStyle);
        await this.chatService.updateChat(chatId, {
          metadata: {
            ...metadata,
            occasion: occasionInfo.occasion,
            eventDate: occasionInfo.eventDate,
            occasionRole: occasionInfo.role,
            intakeStep: 'style' as IntakeStep,
          },
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

        await this.streamChatService.sendAIMessage(chatId, readyMsg);
        await this.chatService.updateChat(chatId, {
          metadata: {
            ...metadata,
            stylePreference,
            intakeStep: 'ready_to_generate' as IntakeStep,
            confirmRequested: true,
          },
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
        const isConfirming = await this.isUserConfirming(content);

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
        const fabricImageBase64 = this.extractSketchFromMessages(chat.messages);

        let result;
        try {
          // ── WEEK 1: stub ───────────────────────────────────────────────────
          // Real gpt-image-2 integration comes in week 2.
          // For now, return placeholder images so the full conversation flow
          // can be tested end-to-end without the image API.
          // Replace this block in week 2 with the real call:
          //
          //   result = await this.designWorkflowService.processDesignRequest(userId, {
          //     prompt: designPrompt,
          //     fabricImageBase64,
          //     model: chat.metadata?.preferredModel,
          //     chatId,
          //   });
          //
          result = {
            designImages: [
              'https://placehold.co/600x800?text=Design+1',
              'https://placehold.co/600x800?text=Design+2',
              'https://placehold.co/600x800?text=Design+3',
            ],
          };
          // ── END WEEK 1 STUB ────────────────────────────────────────────────
        } catch (error) {
          // Refund credits if generation fails
          await this.creditService.refundCredits(
            userId,
            1,
            'Design generation failed',
            chatId,
          );
          throw error;
        }

        const images = result.designImages || [];
        const newBalance = await this.creditService.getBalance(userId);

        const completionMsg =
          `Here are your 3 designs for your ${metadata.occasion || 'occasion'} 🎨 Which one feels most like you?\n\n` +
          images.map((url, i) => `**Design ${i + 1}:** ${url}`).join('\n') +
          `\n\n💳 Credits remaining: ${newBalance}`;

        await this.streamChatService.sendAIMessage(chatId, completionMsg);
        await this.chatService.updateChat(chatId, {
          state: ChatState.DESIGN_PREVIEW,
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
        };
      }

      default: {
        // Fallback — shouldn't be reached but handle gracefully
        return this.handleGeneralMessage(userId, chatId, content);
      }
    }
  }

  // ─── Design selection ─────────────────────────────────────────────────────
  // Handles the DESIGN_PREVIEW state — user picks a design or requests changes.
  private async handleDesignSelection(
    userId: string,
    chatId: string,
    content: string,
  ) {
    const chat = await this.chatService.getChat(userId, chatId);
    const conversationHistory = chat.messages
      .map((m) => `${m.role}: ${m.content}`)
      .join('\n');

    // Check if waiting for variation confirmation
    if (chat.metadata?.confirmVariationRequested) {
      const confirm = await this.isUserConfirming(content);
      if (confirm) {
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
            chat.metadata?.preferredModel,
          );
        } catch (error) {
          await this.creditService.refundCredits(
            userId,
            1,
            'Variation generation failed',
            chatId,
          );
          throw error;
        }

        const newBalance = await this.creditService.getBalance(userId);
        const reply = `Here are your new variations! Which one do you prefer?\n\n💳 Credits remaining: ${newBalance}`;
        await this.streamChatService.sendAIMessage(chatId, reply);
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
          creditBalance: newBalance,
        };
      } else {
        const pendingMod = chat.metadata?.pendingModification || '';
        await this.chatService.updateChat(chatId, {
          metadata: {
            ...chat.metadata,
            pendingModification: `${pendingMod} ${content}`.trim(),
          },
        });
        const msg = "Got it! Anything else to add, or shall I generate with those changes? (yes/no)";
        await this.streamChatService.sendAIMessage(chatId, msg);
        return { chatId, state: 'design_preview', aiResponse: msg };
      }
    }

    // Check if user wants a new variation
    const wantsVariation = await this.wantsNewVariation(content);
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

    // Check if user is selecting a specific design
    const designSelection = await this.detectDesignSelection(content);
    if (designSelection) {
      const confirmMsg = `Great choice! You've selected ${designSelection}. Want to move forward with this design and find a tailor to make it?`;
      await this.streamChatService.sendAIMessage(chatId, confirmMsg);
      await this.chatService.updateChat(chatId, {
        metadata: {
          ...chat.metadata,
          selectedDesign: designSelection,
          awaitingMintConfirmation: true,
        },
      });
      return {
        chatId,
        state: 'design_preview',
        aiResponse: confirmMsg,
        quickButtons: ['Yes, find me a tailor', 'No, show me more options'],
      };
    }

    // Check if user is confirming design and moving to tailor
    if (chat.metadata?.awaitingMintConfirmation) {
      const confirmMinting = await this.isUserConfirming(content);
      if (confirmMinting) {
        const handoffMsg = `Let's find you a tailor! I'm preparing your design brief now.`;
        await this.streamChatService.sendAIMessage(chatId, handoffMsg);
        await this.chatService.updateChat(chatId, {
          state: ChatState.DESIGN_APPROVED,
          metadata: {
            ...chat.metadata,
            awaitingMintConfirmation: false,
            readyForMinting: true,
            selectedVariation: chat.metadata?.selectedDesign,
          },
        });
        return { chatId, state: 'design_approved', aiResponse: handoffMsg };
      } else {
        const cancelMsg = `No problem! Take your time — which of the three designs do you prefer?`;
        await this.streamChatService.sendAIMessage(chatId, cancelMsg);
        await this.chatService.updateChat(chatId, {
          metadata: {
            ...chat.metadata,
            awaitingMintConfirmation: false,
            selectedDesign: null,
          },
        });
        return { chatId, state: 'design_preview', aiResponse: cancelMsg };
      }
    }

    // General comment on the designs
    const aiResponse = await this.generateContextualResponse(
      content,
      conversationHistory,
      'design_preview',
    );
    await this.streamChatService.sendAIMessage(chatId, aiResponse);
    return { chatId, state: 'design_preview', aiResponse };
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
          result = await this.designWorkflowService.processDesignVariation(userId, dto.chatId, `${basePrompt} ${dto.content}`, chatNow.metadata?.preferredModel);
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
        const reply = 'Ready to mint. Please provide transaction hash via action design:mint with content {"transactionHash":"0x..."}.';
        await this.streamChatService.sendAIMessage(dto.chatId, reply);
        return { chatId: dto.chatId, aiResponse: reply, web3Required: true };
      }

      if (action === 'design:mint') {
        let payload: any = {};
        try { payload = JSON.parse(dto.content || '{}'); } catch {}
        const tx = payload.transactionHash;
        if (!tx) {
          const reply = 'Please send transactionHash: {"transactionHash":"0x..."}';
          await this.streamChatService.sendAIMessage(dto.chatId, reply);
          return { chatId: dto.chatId, aiResponse: reply };
        }
        const chatNow = await this.chatService.getChat(userId, dto.chatId);
        if (!chatNow.nftId) {
          const reply = 'No approved design found. Approve first with design:approve.';
          await this.streamChatService.sendAIMessage(dto.chatId, reply);
          return { chatId: dto.chatId, aiResponse: reply };
        }
        const nft = await this.designWorkflowService.mintAndPublishDesign(userId, chatNow.nftId, tx);
        const reply = `Minted and published. NFT ${nft.id} is now live.`;
        await this.streamChatService.sendAIMessage(dto.chatId, reply);
        return { chatId: dto.chatId, aiResponse: reply, nft };
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
  private async detectFabricAnswer(content: string): Promise<boolean | null> {
    const lower = content.toLowerCase();

    // Fast keyword check first — saves an API call for obvious answers
    const yesWords = ['yes', 'yeah', 'yep', 'yup', 'i have', 'i do', 'got', 'have fabric', 'have a fabric'];
    const noWords = ['no', 'nope', 'nah', 'don\'t have', 'no fabric', 'just an idea', 'just idea', 'idea only'];

    if (yesWords.some((w) => lower.includes(w))) return true;
    if (noWords.some((w) => lower.includes(w))) return false;

    // Ambiguous — ask GPT-4o to decide
    try {
      const response = await this.openaiService.generateResponse(
        `The user was asked "Do you have a fabric you'd like to use?"
Their reply: "${content}"
Do they have fabric? Reply with exactly one word: YES, NO, or UNCLEAR.`,
      );
      const r = response.trim().toUpperCase();
      if (r === 'YES') return true;
      if (r === 'NO') return false;
      return null;
    } catch {
      return null;
    }
  }

  // ─── AI helper: detect image in message ───────────────────────────────────
  private async detectImageInMessage(content: string): Promise<boolean> {
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
    const parts: string[] = [];

    if (metadata?.occasion) parts.push(`Occasion: ${metadata.occasion}`);
    if (metadata?.occasionRole) parts.push(`Role: ${metadata.occasionRole}`);
    if (metadata?.fabricDescription) parts.push(`Fabric: ${metadata.fabricDescription}`);
    if (metadata?.stylePreference) parts.push(`Style direction: ${metadata.stylePreference}`);
    if (metadata?.eventDate) parts.push(`Event date: ${metadata.eventDate}`);

    if (parts.length === 0) {
      return 'Bespoke fashion design for a special occasion';
    }

    return `Bespoke fashion design. ${parts.join('. ')}.`;
  }

  // ─── Helper: extract sketch from messages ─────────────────────────────────
  private extractSketchFromMessages(messages: ChatMessage[]): string | null {
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      if (message.metadata?.sketchData) {
        return message.metadata.sketchData.split(',')[1];
      }
    }
    return null;
  }

  // ─── AI helper: is user confirming ────────────────────────────────────────
  private async isUserConfirming(content: string): Promise<boolean> {
    const lower = content.toLowerCase().trim();
    const yesWords = ['yes', 'yeah', 'yep', 'yup', 'go ahead', 'do it', 'proceed', 'generate', 'sure', 'ok', 'okay', 'let\'s go'];
    if (yesWords.some((w) => lower.includes(w))) return true;
    if (lower.startsWith('no') || lower.includes('don\'t') || lower.includes('not yet')) return false;

    try {
      const response = await this.openaiService.generateResponse(
        `Is the user confirming they want to proceed? Message: "${content}". Reply with exactly: CONFIRM or HOLD`,
      );
      return response.trim().toUpperCase() === 'CONFIRM';
    } catch {
      return false;
    }
  }

  // ─── AI helper: wants new variation ───────────────────────────────────────
  private async wantsNewVariation(content: string): Promise<boolean> {
    try {
      const response = await this.openaiService.generateResponse(
        `Is the user asking for new/different design variations, or are they selecting/commenting on existing ones?
Message: "${content}"
Reply with exactly: NEW or SELECT`,
      );
      return response.trim().toUpperCase() === 'NEW';
    } catch {
      return false;
    }
  }

  // ─── AI helper: detect design selection ───────────────────────────────────
  private async detectDesignSelection(content: string): Promise<string | null> {
    try {
      const response = await this.openaiService.generateResponse(
        `Is the user selecting a specific design variation?
Message: "${content}"
If yes, reply with the variation in format variation_1, variation_2, or variation_3.
If no, reply with: NONE`,
      );
      const result = response.trim().toLowerCase();
      return result.match(/variation_[123]/)?.[0] || null;
    } catch {
      return null;
    }
  }
}