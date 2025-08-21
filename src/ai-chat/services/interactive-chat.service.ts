import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatService } from './chat.service';
import { DesignWorkflowService } from './design-workflow.service';
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
    const messageData: any = {
      chatId: dto.chatId,
      content: dto.content,
    };
    
    if (dto.sketchData) {
      messageData.metadata = { sketchData: dto.sketchData };
    }
    
    await this.chatService.sendMessage(userId, messageData);
    
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
    const shouldGenerate = await this.shouldGenerateDesign(conversationHistory + `\nuser: ${content}`);
    if (shouldGenerate) {
      const isConfirming = await this.isUserConfirming(content);
      if (isConfirming) {
        const generatingMessage = "Perfect! Let me generate a visual design for you... This will take a moment.";
        await this.streamChatService.sendAIMessage(chatId, generatingMessage);
        const designPrompt = this.buildDesignPrompt(chat.messages);
        const sketchBase64 = this.extractSketchFromMessages(chat.messages);
        const variations = [];
        for (let i = 1; i <= 3; i++) {
          const result = await this.designWorkflowService.processDesignRequest(userId, {
            prompt: `${designPrompt} - Variation ${i}`,
            fabricImageBase64: sketchBase64,
          });
          variations.push(result);
        }
        const completionMessage = `Here are your design variations! 🎨\n\n${variations.map((v, i) => `**Variation ${i + 1}**: ${v.designImages?.[0] || 'Design created'}`).join('\n')}\n\nWhich one do you like best?`;
        await this.streamChatService.sendAIMessage(chatId, completionMessage);
        await this.chatService.updateChat(chatId, { state: ChatState.DESIGN_PREVIEW });
        return { 
          chatId, 
          state: 'design_preview',
          designPreviews: variations.flatMap(v => v.designImages || []),
          job: variations[0]?.job,
          nft: variations[0]?.nft,
          aiResponse: completionMessage,
          variations: variations,
        };
      } else {
        const confirmMessage = "I have enough details to create your design! Should I generate some visual options for you?";
        await this.streamChatService.sendAIMessage(chatId, confirmMessage);
        return { chatId, state: 'info_gather', aiResponse: confirmMessage, designPreviews: undefined };
      }
    } else {
      const aiResponse = await this.generateContextualResponse(content, conversationHistory, 'info_gather');
      await this.streamChatService.sendAIMessage(chatId, aiResponse);
      return { chatId, state: 'info_gather', aiResponse, designPreviews: undefined };
    }
  }
  private async handleDesignSelection(userId: string, chatId: string, content: string) {
    const chat = await this.chatService.getChat(userId, chatId);
    const conversationHistory = chat.messages.map(msg => `${msg.role}: ${msg.content}`).join('\n');
    const wantsNewVariation = await this.wantsNewVariation(content);
    if (wantsNewVariation) {
      const generatingMessage = "Generating another variation for you...";
      await this.streamChatService.sendAIMessage(chatId, generatingMessage);
      const designPrompt = this.buildDesignPrompt(chat.messages);
      const sketchBase64 = this.extractSketchFromMessages(chat.messages);
      const result = await this.designWorkflowService.processDesignRequest(userId, {
        prompt: `${designPrompt} - New Variation`,
        fabricImageBase64: sketchBase64,
      });
      const completionMessage = "Here's a new variation! Do you like this one better?";
      await this.streamChatService.sendAIMessage(chatId, completionMessage);
      return { 
        chatId, 
        state: 'design_preview',
        designPreviews: result.designImages || [],
        aiResponse: completionMessage,
      };
    }
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
        { role: 'system', content: 'You are evaluating if a user has provided enough fashion design details to generate a visual design. Reply only "yes" or "no".' },
        { role: 'user', content: `Based on this conversation, does the user have enough design details to generate a visual design?
Conversation:
${conversationHistory}` }
      ]);
      return response.trim().toLowerCase().includes('yes');
    } catch (error) {
      return false;
    }
  }
  private async isUserConfirming(content: string): Promise<boolean> {
    try {
      const response = await this.openaiService.generateResponse(
        `Is the user confirming/agreeing to proceed with design generation, or are they adding more details/asking questions?
        CONFIRMING examples: "yes", "go ahead", "proceed", "let's do it", "sounds good", "create it"
        NOT CONFIRMING examples: "wait, also add...", "what about...", "can you make it...", "I want to change..."
        Reply only "CONFIRM" or "MORE_INFO".
        User message: "${content}"`
      );
      return response.trim().toUpperCase().includes('CONFIRM');
    } catch (error) {
      return false;
    }
  }
  private async wantsNewVariation(content: string): Promise<boolean> {
    try {
      const response = await this.openaiService.generateResponse(
        `Does the user want a new/different design variation or are they selecting/commenting on existing ones?
        NEW VARIATION examples: "try another", "show me more", "different style", "can you make another"
        SELECTING/COMMENTING examples: "I like #2", "this one looks good", "not quite right", "too formal"
        Reply only "NEW" or "SELECT".
        User message: "${content}"`
      );
      return response.trim().toUpperCase().includes('NEW');
    } catch (error) {
      return false;
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