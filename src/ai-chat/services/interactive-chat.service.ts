import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatService } from './chat.service';
import { DesignWorkflowService } from './design-workflow.service';
import { NFTService } from '../../web3/services/nft.service';
import { JobService } from '../../marketplace/services/job.service';
import { OpenAIService } from './openai.service';
import { StreamChatService } from './stream-chat.service';
import { PromptService } from './prompt.service';
import { SendMessageDto } from '../dto/chat.dto';
import { ChatState, ChatMessage } from '../entities/chat.entity';
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
    @InjectRepository(ChatMessage)
    private messageRepository: Repository<ChatMessage>,
  ) {}
  async startDesignChat(userId: string) {
    const chat = await this.chatService.createChat(userId, {
      title: 'New Design Chat',
    });
    await this.streamChatService.createChannel(chat.id, userId);
    const welcomeMessage = "Hey! 👋 Ready to bring your fashion idea to life?\n\nYou can:\n- Design a **custom outfit** for a special occasion, or\n- Drop a **limited-edition look** for others to buy\n\nJust upload a sketch or describe the idea, and I'll help you design it, list it, and find a Maker to bring it to life.";
    await this.streamChatService.sendAIMessage(chat.id, welcomeMessage);
    await this.chatService.sendMessage(userId, {
      chatId: chat.id,
      content: welcomeMessage,
    });
    return { ...chat, welcomeMessage };
  }
  async processMessage(userId: string, dto: SendMessageDto) {
    let chat;
    try {
      chat = await this.chatService.getChat(userId, dto.chatId);
    } catch (error) {
      chat = await this.startDesignChat(userId);
      dto.chatId = chat.id;
    }
    // Mark chat as managed by interactive flow to prevent legacy auto-replies
    // Also store model preference if provided
    const updatedMetadata = {
      ...chat.metadata,
      managedByInteractive: true,
      ...(dto.model && { preferredModel: dto.model })
    };
    if (!chat.metadata?.managedByInteractive || (dto.model && dto.model !== chat.metadata?.preferredModel)) {
      await this.chatService.updateChat(dto.chatId, { metadata: updatedMetadata });
      chat.metadata = updatedMetadata;
    }
    const messageData: any = {
      chatId: dto.chatId,
      content: dto.content,
    };
    
    if (dto.sketchData) {
      messageData.metadata = { sketchData: dto.sketchData };
    }
    
    await this.chatService.sendMessage(userId, messageData);

    // Action-type short-circuit handlers (chat-only flow)
    if (dto.actionType && dto.actionType.startsWith('design:')) {
      const action = dto.actionType;
      try {
        if (action === 'design:start') {
          const chatNow = await this.chatService.getChat(userId, dto.chatId);
          const conversationHistory = chatNow.messages.map(m => `${m.role}: ${m.content}`).join('\n');
          if (!chatNow.metadata?.confirmRequested) {
            const confirmMsg = 'Generate 3 visual variations now? (yes/no)';
            await this.streamChatService.sendAIMessage(dto.chatId, confirmMsg);
            await this.chatService.updateChat(dto.chatId, { state: ChatState.INFO_GATHER, metadata: { ...chatNow.metadata, confirmRequested: true } });
            return { chatId: dto.chatId, state: 'info_gather', aiResponse: confirmMsg, awaitingConfirmation: true };
          }
          // If somehow confirmRequested is already true and the client still sent design:start,
          // fall back to waiting for a plain "yes" message handled by handleInfoGathering.
          const reply = 'Please reply "yes" to proceed or "no" to continue refining.';
          await this.streamChatService.sendAIMessage(dto.chatId, reply);
          return { chatId: dto.chatId, state: 'info_gather', aiResponse: reply, awaitingConfirmation: true };
        }
        if (action === 'design:variation') {
          const chatNow = await this.chatService.getChat(userId, dto.chatId);
          const basePrompt = this.buildDesignPrompt(chatNow.messages);
          const preferredModel = chatNow.metadata?.preferredModel;
          const result = await this.designWorkflowService.processDesignVariation(userId, dto.chatId, `${basePrompt} ${dto.content}`, preferredModel);
          const reply = `Generated new variations. Select one (variation_1/2/3) or refine again.`;
          await this.streamChatService.sendAIMessage(dto.chatId, reply);
          return { chatId: dto.chatId, state: 'design_preview', designPreviews: result.designImages, aiResponse: reply };
        }
        if (action === 'design:select') {
          const sel = (dto.content || '').trim().toLowerCase();
          const valid = ['variation_1','variation_2','variation_3'];
          if (!valid.includes(sel)) {
            const reply = `Please choose one of: variation_1, variation_2, variation_3.`;
            await this.streamChatService.sendAIMessage(dto.chatId, reply);
            return { chatId: dto.chatId, state: 'design_preview', aiResponse: reply };
          }
          const chatNow = await this.chatService.getChat(userId, dto.chatId);
          await this.chatService.updateChat(dto.chatId, { metadata: { ...chatNow.metadata, selectedVariety: sel } });
          const reply = `Selected ${sel}. Provide approval details in JSON: {"name":"...","price":150,"quantity":8,"deadline":"YYYY-MM-DD"}`;
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
            const reply = `Missing fields: ${missing.join(', ')}. Example: {"name":"...","price":150,"quantity":8,"deadline":"2025-12-31"}`;
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
          const reply = `Approved. Created DRAFT design: ${result.nft?.id}. You can "design:publish" to trigger minting, or "design:hire" to hire a maker (will require mint if still draft).`;
          await this.streamChatService.sendAIMessage(dto.chatId, reply);
          return { chatId: dto.chatId, state: ChatState.DESIGN_PREVIEW, aiResponse: reply, nft: result.nft };
        }
        if (action === 'design:publish') {
          const reply = `Ready to mint. Please provide transaction hash via action design:mint with content {"transactionHash":"0x..."}.`;
          await this.streamChatService.sendAIMessage(dto.chatId, reply);
          return { chatId: dto.chatId, aiResponse: reply, web3Required: true };
        }
        if (action === 'design:mint') {
          let payload: any = {};
          try { payload = JSON.parse(dto.content || '{}'); } catch {}
          const tx = payload.transactionHash;
          if (!tx) {
            const reply = `Please send transactionHash: {"transactionHash":"0x..."}`;
            await this.streamChatService.sendAIMessage(dto.chatId, reply);
            return { chatId: dto.chatId, aiResponse: reply };
          }
          const chatNow = await this.chatService.getChat(userId, dto.chatId);
          if (!chatNow.nftId) {
            const reply = `No approved design found. Approve first with design:approve.`;
            await this.streamChatService.sendAIMessage(dto.chatId, reply);
            return { chatId: dto.chatId, aiResponse: reply };
          }
          const nft = await this.designWorkflowService.mintAndPublishDesign(userId, chatNow.nftId, tx);
          const reply = `Minted and published. NFT ${nft.id} is now PUBLISHED.`;
          await this.streamChatService.sendAIMessage(dto.chatId, reply);
          return { chatId: dto.chatId, aiResponse: reply, nft };
        }
        if (action === 'design:hire') {
          let payload: any = {};
          try { payload = JSON.parse(dto.content || '{}'); } catch {}
          const chatNow = await this.chatService.getChat(userId, dto.chatId);
          if (!chatNow.nftId) {
            const reply = `No approved design found. Approve first with design:approve.`;
            await this.streamChatService.sendAIMessage(dto.chatId, reply);
            return { chatId: dto.chatId, aiResponse: reply };
          }
          const nft = await this.nftService.findById(chatNow.nftId);
          if (nft.status === 'draft') {
            const reply = `Design is still DRAFT. Please mint first (design:publish → design:mint).`;
            await this.streamChatService.sendAIMessage(dto.chatId, reply);
            return { chatId: dto.chatId, aiResponse: reply };
          }
          const required = ['quantity','deadlineDate','productTimeline','budgetRange','shippingRegion','fabricSource','skillKeywords','experienceLevel'];
          const missing = required.filter(f => payload[f] === undefined);
          if (missing.length) {
            const reply = `Missing fields: ${missing.join(', ')}. Example: {"quantity":8,"deadlineDate":"2025-12-31","productTimeline":"3-4 weeks","budgetRange":{"min":800,"max":2500},"shippingRegion":"United States","fabricSource":"Premium cotton","skillKeywords":["sewing","pattern-making"],"experienceLevel":"advanced","requirements":"High quality production"}`;
            await this.streamChatService.sendAIMessage(dto.chatId, reply);
            return { chatId: dto.chatId, aiResponse: reply };
          }
          const createJobDto: any = {
            title: `Hire Maker for ${nft.name}`,
            description: payload.requirements,
            requirements: `Quantity: ${payload.quantity}\nDeadline: ${payload.deadlineDate}\nTimeline: ${payload.productTimeline}\nBudget Range: $${payload.budgetRange?.min}-$${payload.budgetRange?.max}\nShipping: ${payload.shippingRegion}\nFabric Source: ${payload.fabricSource}\nExperience Level: ${payload.experienceLevel}\nSkills: ${(payload.skillKeywords||[]).join(', ')}`,
            budget: payload.budgetRange?.max,
            currency: 'USD',
            priority: 'medium',
            deadline: new Date(payload.deadlineDate).toISOString(),
            tags: ['maker-hiring','production', payload.experienceLevel, `budget-${payload.budgetRange?.min}-${payload.budgetRange?.max}`, ...(payload.skillKeywords||[])],
            referenceImages: [nft.imageUrl],
            chatId: dto.chatId,
            designId: nft.id,
          };
          const job = await this.jobService.createJob(createJobDto, userId);
          const reply = `Maker hiring request created. Job ${job.id} is now visible to makers.`;
          await this.streamChatService.sendAIMessage(dto.chatId, reply);
          return { chatId: dto.chatId, aiResponse: reply, job };
        }
      } catch (err) {
        const msg = `Sorry, something went wrong: ${err?.message || 'unknown error'}`;
        await this.streamChatService.sendAIMessage(dto.chatId, msg);
        return { chatId: dto.chatId, aiResponse: msg };
      }
    }
    
    // Sync user message to database via Stream Chat
    await this.streamChatService.syncUserMessageToDatabase(dto.chatId, dto.content, userId);
    switch (chat.state) {
      case ChatState.WELCOME:
        return this.handleInitialDesignInput(userId, dto.chatId, dto.content);
      case ChatState.INTENT:
        return this.handleIntentResponse(userId, dto.chatId, dto.content);
      case ChatState.INFO_GATHER:
        return this.handleInfoGathering(userId, dto.chatId, dto.content, chat.metadata);
      case ChatState.DESIGN_PREVIEW:
        return this.handleDesignSelection(userId, dto.chatId, dto.content);
      default:
        return this.handleGeneralMessage(userId, dto.chatId, dto.content);
    }
  }
  private async handleInitialDesignInput(userId: string, chatId: string, content: string) {
    const chat = await this.chatService.getChat(userId, chatId);
    const conversationHistory = chat.messages.map(msg => `${msg.role}: ${msg.content}`).join('\n');
    const aiResponse = await this.generateContextualResponse(content, conversationHistory, 'welcome');
    const nextState = await this.determineConversationState(aiResponse, conversationHistory + `\nuser: ${content}\nassistant: ${aiResponse}`);
    if (nextState !== 'welcome') {
      await this.chatService.updateChat(chatId, { state: nextState as ChatState });
    }
    await this.streamChatService.sendAIMessage(chatId, aiResponse);
    return { chatId, state: nextState, aiResponse, designPreviews: undefined };
  }
  private async generateContextualResponse(userMessage: string, conversationHistory: string, currentState: string): Promise<string> {
    const systemPrompt = this.promptService.getSystemPrompt();
    const contextPrompt = `${systemPrompt}
Current conversation state: ${currentState}
Conversation so far:
${conversationHistory}
User just said: "${userMessage}"
Respond naturally and guide the conversation toward fashion design. Your goals:
1. If greeting/casual: Be friendly, ask what they'd like to design
2. If showing interest: Ask if it's for them or to sell (A/B question)
3. If they chose A/B: Gather specifics (event, style, colors, etc.)
4. Collect as many details as possible before suggesting design generation
Be conversational, smooth, and BRIEF. Keep responses short and focused. Don't repeat questions already answered.`;
    try {
      const response = await this.openaiService.generateResponse(contextPrompt);
      return response.trim();
    } catch (error) {
      return "Hey there! 👋 What kind of fashion design are you thinking about creating?";
    }
  }
  private async determineConversationState(aiResponse: string, fullConversation: string): Promise<string> {
    try {
      const statePrompt = `Based on this conversation, what state should we be in?
Conversation:
${fullConversation}
States:
- welcome: Still greeting/getting started
- intent: Asked about personal vs commercial (A/B question)
- info_gather: Collecting design details
- ready_to_generate: Has enough info to create design
Reply with ONLY the state name.`;
      const response = await this.openaiService.generateResponse(statePrompt);
      const state = response.trim().toLowerCase();
      if (state.includes('intent')) return 'intent';
      if (state.includes('info') || state.includes('gather')) return 'info_gather';
      if (state.includes('ready') || state.includes('generate')) return 'info_gather';
      return 'welcome';
    } catch (error) {
      return 'welcome';
    }
  }
  private async handleIntentResponse(userId: string, chatId: string, content: string) {
    const chat = await this.chatService.getChat(userId, chatId);
    const conversationHistory = chat.messages.map(msg => `${msg.role}: ${msg.content}`).join('\n');
    const aiResponse = await this.generateContextualResponse(content, conversationHistory, 'intent');
    const nextState = await this.determineConversationState(aiResponse, conversationHistory + `\nuser: ${content}\nassistant: ${aiResponse}`);
    if (nextState !== 'intent') {
      await this.chatService.updateChat(chatId, { 
        state: nextState as ChatState,
        metadata: { ...chat.metadata, lastUserInput: content }
      });
    }
    await this.streamChatService.sendAIMessage(chatId, aiResponse);
    return { chatId, state: nextState, aiResponse, designPreviews: undefined };
  }
  private async handleInfoGathering(userId: string, chatId: string, content: string, metadata: any) {
    const chat = await this.chatService.getChat(userId, chatId);
    const conversationHistory = chat.messages.map(msg => `${msg.role}: ${msg.content}`).join('\n');
    // Cooldown: if we already generated 3 in the last 2 minutes, don't regenerate
    const lastDone = chat.metadata?.lastGenerationCompletedAt ? new Date(chat.metadata.lastGenerationCompletedAt).getTime() : 0;
    const recent = lastDone && (Date.now() - lastDone < 2 * 60 * 1000);
    // Confirmation gate: always ask before generating
    const confirmRequested = !!chat.metadata?.confirmRequested;
    if (!confirmRequested) {
      const confirmMsg = 'I can generate 3 visual variations for your design now. Would you like me to proceed? (yes/no)';
      await this.streamChatService.sendAIMessage(chatId, confirmMsg);
      await this.chatService.updateChat(chatId, { metadata: { ...chat.metadata, confirmRequested: true } });
      return { chatId, state: 'info_gather', aiResponse: confirmMsg, awaitingConfirmation: true };
    }
    // If user explicitly confirmed, proceed immediately without re-checking intent
    const isConfirming = await this.isUserConfirming(content, conversationHistory);
    if (isConfirming && recent && (chat.designPreviews?.length || 0) >= 3) {
      const msg = "I already generated 3 variations. Please pick one (variation_1/2/3) or tell me what to tweak.";
      await this.streamChatService.sendAIMessage(chatId, msg);
      return { chatId, state: 'info_gather', aiResponse: msg };
    }
    // If not confirming and a generation is already in progress, ask user to wait
    if (!isConfirming && chat.metadata?.generating === true) {
      const waitMsg = 'Working on your variations… one moment please.';
      await this.streamChatService.sendAIMessage(chatId, waitMsg);
      return { chatId, state: 'info_gather', aiResponse: waitMsg, awaitingConfirmation: false };
    }
    if (isConfirming) {
      const generatingMessage = "Perfect! Let me generate a visual design for you... This will take a moment.";
      await this.streamChatService.sendAIMessage(chatId, generatingMessage);
      const designPrompt = this.buildDesignPrompt(chat.messages);
      const sketchBase64 = this.extractSketchFromMessages(chat.messages);
      const preferredModel = chat.metadata?.preferredModel;
      const result = await this.designWorkflowService.processDesignRequest(userId, {
        prompt: designPrompt,
        fabricImageBase64: sketchBase64,
        model: preferredModel,
        // Ensure centralized guard can use the chat context
        ...( { chatId } as any ),
      } as any);
      const images = result.designImages || [];
      const completionMessage = `Here are your design variations! 🎨\n\n${images.map((url, i) => `**Variation ${i + 1}**: ${url || 'Design created'}`).join('\n')}\n\nWhich one do you like best?`;
      await this.streamChatService.sendAIMessage(chatId, completionMessage);
      await this.chatService.updateChat(chatId, { state: ChatState.DESIGN_PREVIEW, metadata: { ...chat.metadata, confirmRequested: false, generating: false, lastGenerationCompletedAt: new Date().toISOString() } });
      return { 
        chatId, 
        state: 'design_preview',
        designPreviews: images,
        job: result?.job,
        nft: result?.nft,
        aiResponse: completionMessage,
      };
    }
    // Otherwise, continue gathering info conversationally
    const aiResponse = await this.generateContextualResponse(content, conversationHistory, 'info_gather');
    await this.streamChatService.sendAIMessage(chatId, aiResponse);
    return { chatId, state: 'info_gather', aiResponse, designPreviews: undefined };
  }
  private async handleDesignSelection(userId: string, chatId: string, content: string) {
    const chat = await this.chatService.getChat(userId, chatId);
    const conversationHistory = chat.messages.map(msg => `${msg.role}: ${msg.content}`).join('\n');
    
    // Check if we're waiting for confirmation and user is providing more details
    if (chat.metadata?.confirmVariationRequested) {
      const confirm = await this.isUserConfirming(content, conversationHistory);
      if (confirm) {
        const generatingMessage = "Generating another variation for you...";
        await this.streamChatService.sendAIMessage(chatId, generatingMessage);
        const designPrompt = this.buildDesignPrompt(chat.messages);
        const sketchBase64 = this.extractSketchFromMessages(chat.messages);
        
        // Get the user's modification request from metadata and combine with current input
        const pendingMod = chat.metadata?.pendingModification || '';
        const userModification = pendingMod + (pendingMod ? ' ' + content : content);
        const enhancedPrompt = `${designPrompt} - ${userModification}`;
        const preferredModel = chat.metadata?.preferredModel;

        const result = await this.designWorkflowService.processDesignVariation(userId, chatId, enhancedPrompt, preferredModel);
        const completionMessage = "Here's a new set of variations! Do you like one of these better?";
        await this.streamChatService.sendAIMessage(chatId, completionMessage);
        await this.chatService.updateChat(chatId, { 
          metadata: { 
            ...chat.metadata, 
            confirmVariationRequested: false,
            pendingModification: null,
            lastGenerationCompletedAt: new Date().toISOString()
          } 
        });
        return { 
          chatId, 
          state: 'design_preview',
          aiResponse: completionMessage
        };
      } else {
        // User is providing more details, update the pending modification
        const pendingMod = chat.metadata?.pendingModification || '';
        const updatedModification = pendingMod + (pendingMod ? ' ' + content : content);
        await this.chatService.updateChat(chatId, { 
          metadata: { 
            ...chat.metadata, 
            pendingModification: updatedModification
          } 
        });
        const msg = "Got it! Any other details you'd like to add, or should I proceed with the design? (yes/no)";
        await this.streamChatService.sendAIMessage(chatId, msg);
        return { chatId, state: 'design_preview', aiResponse: msg };
      }
    }
    
    // If we already have 3 previews recently, block further generation until selection or tweak
    const lastDone = chat.metadata?.lastGenerationCompletedAt ? new Date(chat.metadata.lastGenerationCompletedAt).getTime() : 0;
    const recent = lastDone && (Date.now() - lastDone < 2 * 60 * 1000);
    const hasThree = (chat.designPreviews?.length || 0) >= 3;
    const wantsNewVariation = await this.wantsNewVariation(content);
    if (wantsNewVariation) {
      if (recent && hasThree) {
        const msg = "I already generated 3 variations. Please pick one (variation_1/2/3) or tell me what to tweak.";
        await this.streamChatService.sendAIMessage(chatId, msg);
        return { chatId, state: 'design_preview', aiResponse: msg };
      }
      // Confirmation gate before creating another variation
      const ask = 'I can generate another variation now. Would you like me to proceed? (yes/no)';
      await this.streamChatService.sendAIMessage(chatId, ask);
      await this.chatService.updateChat(chatId, { 
        metadata: { 
          ...chat.metadata, 
          confirmVariationRequested: true,
          pendingModification: content // Store the user's modification request
        } 
      });
      return { chatId, state: 'design_preview', aiResponse: ask };
    }
    
    // Check if user is selecting/approving a specific design
    const designSelection = await this.detectDesignSelection(content);
    if (designSelection) {
      // Ask for minting confirmation
      const mintingConfirmationMsg = `Perfect! You've selected ${designSelection}. Would you like to bring this to life? This will make it available in your "My Designs" collection. (yes/no)`;
      await this.streamChatService.sendAIMessage(chatId, mintingConfirmationMsg);
      await this.chatService.updateChat(chatId, { 
        metadata: { 
          ...chat.metadata, 
          selectedDesign: designSelection,
          awaitingMintConfirmation: true
        } 
      });
      return { chatId, state: 'design_preview', aiResponse: mintingConfirmationMsg };
    }

    // Check if user is confirming minting
    if (chat.metadata?.awaitingMintConfirmation) {
      const confirmMinting = await this.isUserConfirming(content, conversationHistory);
      if (confirmMinting) {
        const handoffMsg = `Great! I'll prepare your design for minting. The frontend will now handle the payment and minting process. Once minted, your design will appear in "My Designs" collection.`;
        await this.streamChatService.sendAIMessage(chatId, handoffMsg);
        await this.chatService.updateChat(chatId, { 
          state: ChatState.DESIGN_APPROVED,
          metadata: { 
            ...chat.metadata, 
            awaitingMintConfirmation: false,
            readyForMinting: true,
            selectedVariation: chat.metadata?.selectedDesign
          } 
        });
        return { chatId, state: 'design_approved', aiResponse: handoffMsg };
      } else {
        const cancelMsg = `No problem! You can continue browsing the variations or request changes. Which design do you prefer?`;
        await this.streamChatService.sendAIMessage(chatId, cancelMsg);
        await this.chatService.updateChat(chatId, { 
          metadata: { 
            ...chat.metadata, 
            awaitingMintConfirmation: false,
            selectedDesign: null
          } 
        });
        return { chatId, state: 'design_preview', aiResponse: cancelMsg };
      }
    }

    // Handle other cases (general comments)
    const aiResponse = await this.generateContextualResponse(content, conversationHistory, 'design_preview');
    await this.streamChatService.sendAIMessage(chatId, aiResponse);
    return { chatId, state: 'design_preview', aiResponse, designPreviews: undefined };
  }
  private async handleGeneralMessage(userId: string, chatId: string, content: string) {
    const chat = await this.chatService.getChat(userId, chatId);
    const conversationHistory = chat.messages.map(msg => `${msg.role}: ${msg.content}`).join('\n');
    const aiResponse = await this.generateContextualResponse(content, conversationHistory, 'general');
    await this.streamChatService.sendAIMessage(chatId, aiResponse);
    return { chatId, state: chat.state, aiResponse, designPreviews: undefined };
  }
  private async shouldGenerateDesign(conversationHistory: string): Promise<boolean> {
    try {
      const response = await this.openaiService.generateChatResponse([
        { role: 'system', content: 'Decide if we should generate design variations NOW. Consider both detail sufficiency and user intent for the AI to proceed. Reply only "yes" or "no".' },
        { role: 'user', content: `Conversation so far:\n${conversationHistory}\n\nShould we generate variations now?` }
      ]);
      return /^(yes|y)/i.test(response.trim());
    } catch (error) {
      return false;
    }
  }
  private async isUserConfirming(content: string, conversationHistory?: string): Promise<boolean> {
    try {
      const prompt = `Analyze if the user is confirming to proceed with generating design variations.

Context: The system asked if the user wants to generate variations, and now we need to determine if their response is a confirmation.

User intent analysis:
- CONFIRM: Any affirmative response indicating they want to proceed
- HOLD: Negative responses, requests for more changes, questions, or uncertainty

Consider natural language patterns and context. The user may confirm in various ways beyond just "yes".

Conversation context:
${conversationHistory || ''}

User response: "${content}"

Respond with exactly one word: "CONFIRM" or "HOLD"`;
      
      const response = await this.openaiService.generateResponse(prompt);
      return response.trim().toUpperCase() === 'CONFIRM';
    } catch (error) {
      return false;
    }
  }
  private async wantsNewVariation(content: string): Promise<boolean> {
    try {
      const response = await this.openaiService.generateResponse(
        `Analyze the user's message and determine their intent regarding design variations.

        The user might want:
        1. NEW VARIATION - They want to generate new/different design options (modifications, changes, improvements, or completely new variations)
        2. SELECT/COMMENT - They are selecting from existing variations, commenting on current designs, or asking questions

        Consider the context:
        - Any request for changes, modifications, additions, or improvements = NEW VARIATION
        - Any expression of wanting different options or alternatives = NEW VARIATION  
        - Selecting specific variations (like "variation_1", "I like #2") = SELECT/COMMENT
        - General comments without modification requests = SELECT/COMMENT

        Respond with exactly one word: "NEW" or "SELECT"

        User message: "${content}"`
      );
      return response.trim().toUpperCase().includes('NEW');
    } catch (error) {
      return false;
    }
  }
  
  private async detectDesignSelection(content: string): Promise<string | null> {
    try {
      const response = await this.openaiService.generateResponse(
        `Analyze if the user is selecting/approving a specific design variation.

        Look for:
        - Explicit selections
        - Approval phrases
        - Clear preference statements indicating they want to proceed with a specific design

        If they are selecting a design, respond with the variation number in format "variation_X" (where X is 1, 2, or 3).
        If they are not selecting a specific design, respond with "NONE".

        User message: "${content}"`
      );
      
      const result = response.trim().toLowerCase();
      if (result.includes('variation_')) {
        return result.match(/variation_[123]/)?.[0] || null;
      }
      return null;
    } catch (error) {
      return null;
    }
  }
  
  private buildDesignPrompt(messages: ChatMessage[]): string {
    const userMessages = messages.filter(msg => msg.role === 'user').map(msg => msg.content).join(' ');
    return `Fashion design based on: ${userMessages}`;
  }

  private extractSketchFromMessages(messages: ChatMessage[]): string | null {
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      if (message.metadata && message.metadata.sketchData) {
        const base64 = message.metadata.sketchData.split(',')[1];
        return base64;
      }
    }
    return null;
  }
}