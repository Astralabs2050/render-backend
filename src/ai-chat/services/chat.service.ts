import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Chat, ChatMessage, ChatState } from '../entities/chat.entity';
import { Milestone, MilestoneStatus } from '../entities/milestone.entity';
import { CreateChatDto, SendMessageDto, GenerateDesignDto, ListDesignDto, MakerProposalDto, EscrowActionDto } from '../dto/chat.dto';
import { PromptService } from './prompt.service';
import { OpenAIService } from './openai.service';
import { StreamChatService } from './stream-chat.service';
import { UsersService } from '../../users/users.service';
import { NFTService } from '../../web3/services/nft.service';
import { EscrowService } from '../../web3/services/escrow.service';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @InjectRepository(Chat)
    private chatRepository: Repository<Chat>,
    @InjectRepository(ChatMessage)
    private messageRepository: Repository<ChatMessage>,
    @InjectRepository(Milestone)
    private milestoneRepository: Repository<Milestone>,
    private promptService: PromptService,
    private openaiService: OpenAIService,
    private streamChatService: StreamChatService,
    private usersService: UsersService,
    private nftService: NFTService,
    private escrowService: EscrowService,
  ) { }

  async createChat(userId: string, dto: CreateChatDto): Promise<Chat> {
    const user = await this.usersService.findOne(userId);

    const chat = this.chatRepository.create({
      title: dto.title || 'New Design Chat',
      userId: userId,
      creatorId: userId,
      state: ChatState.WELCOME,
    });

    const savedChat = await this.chatRepository.save(chat);

    // Create Stream Chat channel
    await this.streamChatService.upsertUser(userId, user);
    await this.streamChatService.upsertUser('astra-ai', {
      fullName: 'Astra AI',
      userType: 'user', // Use standard role
      avatar: 'https://example.com/astra-ai-avatar.png'
    });
    await this.streamChatService.createChannel(savedChat.id, userId);

    // Add system message
    await this.addSystemMessage(savedChat.id, this.promptService.getSystemPrompt());

    // Add welcome message
    const welcomePrompt = this.promptService.getPromptForState(ChatState.WELCOME, true);
    await this.addAssistantMessage(savedChat.id, welcomePrompt);

    return savedChat;
  }

  async getChats(userId: string): Promise<Chat[]> {
    return this.chatRepository.find({
      where: [
        { userId: userId },
        { creatorId: userId },
        { makerId: userId }
      ],
      order: { updatedAt: 'DESC' },
    });
  }

  async getChat(userId: string, chatId: string): Promise<Chat> {
    const chat = await this.chatRepository.findOne({
      where: [
        { id: chatId, userId: userId },
        { id: chatId, creatorId: userId },
        { id: chatId, makerId: userId }
      ],
      relations: ['messages'],
      order: { messages: { createdAt: 'ASC' } },
    });

    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    return chat;
  }

  async sendMessage(userId: string, dto: SendMessageDto): Promise<ChatMessage> {
    const { content, chatId, imageBase64, actionType } = dto;

    // Verify chat exists and user has access
    const chat = await this.chatRepository.findOne({
      where: [
        { id: chatId, userId: userId },
        { id: chatId, creatorId: userId },
        { id: chatId, makerId: userId }
      ],
    });

    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    const isCreator = chat.creatorId === userId;

    // Sanitize user message
    const sanitizedContent = this.promptService.sanitizeUserMessage(content);

    // Create user message
    const userMessage = this.messageRepository.create({
      content: sanitizedContent,
      role: 'user',
      chatId,
      actionType,
    });

    // Process image if provided
    if (imageBase64) {
      // In a real implementation, save the image and get its URL
      userMessage.imageUrl = 'mock-image-url';
    }

    const savedMessage = await this.messageRepository.save(userMessage);

    // Process the message based on chat state and generate AI response
    await this.processUserMessage(chat, savedMessage, isCreator);

    return savedMessage;
  }

  async generateDesign(dto: GenerateDesignDto): Promise<any> {
    const { chatId, prompt, referenceImageBase64 } = dto;

    const chat = await this.chatRepository.findOne({
      where: { id: chatId },
    });

    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    // Add a message indicating design generation is in progress
    await this.addAssistantMessage(chatId, "Generating your design... This will take a moment.");

    // Generate design image using DALL-E
    const imageUrl = await this.openaiService.generateDesignImage(prompt, referenceImageBase64);

    // Extract design metadata
    const metadata = await this.openaiService.generateDesignMetadata(prompt);

    // Update chat metadata and state
    chat.metadata = { ...chat.metadata, design: metadata };
    chat.state = ChatState.DESIGN_PREVIEW;
    chat.designImageUrl = imageUrl;

    await this.chatRepository.save(chat);

    // Add assistant message with design preview and image
    const previewPrompt = this.promptService.getPromptForState(ChatState.DESIGN_PREVIEW, true, {
      name: metadata.name,
      price: metadata.price,
      days: metadata.timeframe,
      imageUrl: imageUrl
    });

    await this.addAssistantMessage(chatId, `${previewPrompt}\n\n🎨 **Design Image Generated!**\nView your design: ${imageUrl}`);

    return metadata;
  }

  async listDesign(dto: ListDesignDto): Promise<any> {
    const { chatId, name, category, price, timeframe } = dto;

    const chat = await this.chatRepository.findOne({
      where: { id: chatId },
    });

    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    try {
      // Create NFT from the design
      const nft = await this.nftService.createNFT({
        name,
        description: `Custom fashion design: ${name}`,
        category,
        price,
        quantity: 1,
        imageUrl: chat.designImageUrl || 'https://placeholder.com/512x512',
        creatorId: chat.creatorId,
        chatId: chat.id,
        attributes: [
          { trait_type: 'Category', value: category },
          { trait_type: 'Price', value: price },
          { trait_type: 'Timeframe', value: timeframe },
          { trait_type: 'Created Via', value: 'AI Chat' },
        ],
      });

      // Mint the NFT
      const mintedNFT = await this.nftService.mintNFT({
        nftId: nft.id,
      });

      // List the NFT
      await this.nftService.listNFT(mintedNFT.id);

      const jobData = {
        id: `job-${Date.now()}`,
        nftId: mintedNFT.id,
        tokenId: mintedNFT.tokenId,
        contractAddress: mintedNFT.contractAddress,
        name,
        category,
        price,
        timeframe,
        status: 'active',
        ipfsUrl: mintedNFT.ipfsUrl,
      };

      // Update chat metadata and state
      chat.metadata = { ...chat.metadata, job: jobData, nft: mintedNFT };
      chat.state = ChatState.LISTED;
      chat.jobId = jobData.id;
      
      await this.chatRepository.save(chat);

      // Add assistant message with NFT details
      const listedPrompt = this.promptService.getPromptForState(ChatState.LISTED, true);
      await this.addAssistantMessage(
        chatId, 
        `${listedPrompt}\n\n🎨 **NFT Minted Successfully!**\nToken ID: ${mintedNFT.tokenId}\nContract: ${mintedNFT.contractAddress}\nIPFS: ${mintedNFT.ipfsUrl}`
      );

      return jobData;
    } catch (error) {
      this.logger.error(`Failed to list design as NFT: ${error.message}`);
      
      // Fallback to regular job listing without NFT
      const jobData = {
        id: `job-${Date.now()}`,
        name,
        category,
        price,
        timeframe,
        status: 'active',
        error: 'NFT minting failed, listed as regular job',
      };

      chat.metadata = { ...chat.metadata, job: jobData };
      chat.state = ChatState.LISTED;
      chat.jobId = jobData.id;
      
      await this.chatRepository.save(chat);

      const listedPrompt = this.promptService.getPromptForState(ChatState.LISTED, true);
      await this.addAssistantMessage(chatId, `${listedPrompt}\n\n⚠️ Note: NFT minting failed, but your design is still listed as a job.`);

      return jobData;
    }
  }

  async addMakerProposal(dto: MakerProposalDto): Promise<any> {
    const { chatId, makerId, price, timeframe, portfolio } = dto;

    const chat = await this.chatRepository.findOne({
      where: { id: chatId },
    });

    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    const maker = await this.usersService.findOne(makerId);

    // Update chat metadata and state
    const proposalData = {
      makerId,
      makerName: maker.fullName,
      offer: price,
      turnaround: timeframe,
      portfolio: portfolio || 'No portfolio provided',
    };

    chat.metadata = { ...chat.metadata, proposal: proposalData };
    chat.state = ChatState.MAKER_PROPOSAL;

    await this.chatRepository.save(chat);

    // Add assistant message
    const proposalPrompt = this.promptService.getPromptForState(ChatState.MAKER_PROPOSAL, true, proposalData);
    await this.addAssistantMessage(chatId, proposalPrompt);

    return proposalData;
  }

  async handleEscrowAction(dto: EscrowActionDto): Promise<any> {
    const { chatId, action, milestoneId } = dto;

    const chat = await this.chatRepository.findOne({
      where: { id: chatId },
    });

    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    if (action === 'init') {
      // Initialize escrow and create milestones
      const escrowId = `escrow-${Date.now()}`;
      chat.escrowId = escrowId;
      chat.state = ChatState.FABRIC_SHIPPING;
      chat.makerId = chat.metadata?.proposal?.makerId;

      await this.chatRepository.save(chat);

      // Create milestones
      await this.createMilestones(chat);

      // Add assistant message
      const shippingPrompt = this.promptService.getPromptForState(ChatState.FABRIC_SHIPPING, true, {
        maskedAddress: '123 Main St, City, Country',
      });
      await this.addAssistantMessage(chatId, shippingPrompt);

      return { escrowId };
    } else if (action === 'unlock') {
      if (!milestoneId) {
        throw new NotFoundException('Milestone ID is required');
      }

      const milestone = await this.milestoneRepository.findOne({
        where: { id: milestoneId, chatId },
      });

      if (!milestone) {
        throw new NotFoundException('Milestone not found');
      }

      milestone.status = MilestoneStatus.COMPLETED;
      milestone.completedAt = new Date();
      await this.milestoneRepository.save(milestone);

      // Update chat state based on milestone order
      if (milestone.order === 0) {
        chat.state = ChatState.SAMPLE_REVIEW;
      } else if (milestone.order === 1) {
        chat.state = ChatState.FINAL_REVIEW;
      } else if (milestone.order === 2) {
        chat.state = ChatState.DELIVERY;
      } else if (milestone.order === 3) {
        chat.state = ChatState.COMPLETED;
      }

      await this.chatRepository.save(chat);

      // Add assistant message
      const nextPrompt = this.promptService.getPromptForState(chat.state, true);
      await this.addAssistantMessage(chatId, nextPrompt);

      return { milestone };
    }

    return { success: true };
  }

  private async processUserMessage(chat: Chat, message: ChatMessage, isCreator: boolean): Promise<void> {
    // Get all messages for context
    const messages = await this.messageRepository.find({
      where: { chatId: chat.id },
      order: { createdAt: 'ASC' },
    });

    // Format messages for OpenAI
    const formattedMessages = messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    // Get AI response
    const aiResponse = await this.openaiService.generateChatResponse(formattedMessages);

    // Save AI response
    await this.addAssistantMessage(chat.id, aiResponse);

    // Process state transitions based on user message and current state
    await this.processStateTransition(chat, message, isCreator);
  }

  private async processStateTransition(chat: Chat, message: ChatMessage, isCreator: boolean): Promise<void> {
    const content = message.content.toLowerCase();
    let newState = chat.state;

    switch (chat.state) {
      case ChatState.WELCOME:
        if (content.includes('dress') || content.includes('outfit') || content.includes('design') || message.imageUrl) {
          newState = ChatState.INTENT;
        }
        break;
      case ChatState.INTENT:
        if (content.includes('a') || content.includes('myself') || content.includes('personal')) {
          newState = ChatState.INFO_GATHER;
        } else if (content.includes('b') || content.includes('others') || content.includes('sell')) {
          newState = ChatState.INFO_GATHER;
        }
        break;
      case ChatState.INFO_GATHER:
        // Auto-generate design when user provides design details
        if (content.length > 20 && (content.includes('dress') || content.includes('outfit') || content.includes('design') ||
          content.includes('color') || content.includes('style') || content.includes('fabric'))) {
          // Trigger automatic design generation
          await this.autoGenerateDesign(chat.id, message.content);
          return; // Skip normal state transition since we're handling it in autoGenerateDesign
        }
        break;
      case ChatState.MAKER_PROPOSAL:
        if (content.includes('accept') || content.includes('yes')) {
          newState = ChatState.ESCROW_PAYMENT;
        }
        break;
      case ChatState.SAMPLE_REVIEW:
        if (content.includes('approve')) {
          // This would normally be handled by the escrow action endpoint
        }
        break;
    }

    // If state changed, update chat and send appropriate message
    if (newState !== chat.state) {
      chat.state = newState;
      await this.chatRepository.save(chat);

      const statePrompt = this.promptService.getPromptForState(newState, isCreator, chat.metadata);
      await this.addAssistantMessage(chat.id, statePrompt);
    }
  }

  private async autoGenerateDesign(chatId: string, prompt: string): Promise<void> {
    try {
      this.logger.log(`Auto-generating design for chat ${chatId} with prompt: ${prompt}`);

      // Call the existing generateDesign method
      await this.generateDesign({
        chatId,
        prompt,
      });
    } catch (error) {
      this.logger.error(`Auto design generation failed: ${error.message}`);
      // Send error message to user
      await this.addAssistantMessage(chatId, "I had trouble generating your design. Let me try a different approach - could you describe your design idea again?");
    }
  }

  private async addSystemMessage(chatId: string, content: string): Promise<ChatMessage> {
    const message = this.messageRepository.create({
      content,
      role: 'system',
      chatId,
    });

    return this.messageRepository.save(message);
  }

  private async addAssistantMessage(chatId: string, content: string, attachments: any[] = []): Promise<ChatMessage> {
    // Save to database
    const message = this.messageRepository.create({
      content,
      role: 'assistant',
      chatId,
    });

    const savedMessage = await this.messageRepository.save(message);

    // Send to Stream Chat
    const streamMessage = await this.streamChatService.sendAIMessage(chatId, content, attachments);

    // Add buttons if needed based on chat state
    const chat = await this.chatRepository.findOne({ where: { id: chatId } });
    if (chat) {
      const buttons = this.promptService.getQuickButtons(chat.state);
      if (buttons.length > 0) {
        await this.streamChatService.addReactionButtons(streamMessage.message.id, chatId, buttons);
      }
    }

    return savedMessage;
  }

  private async createMilestones(chat: Chat): Promise<void> {
    // Create the standard milestones for the escrow
    const milestones = [
      {
        name: 'Fabric Received',
        description: 'Maker confirms receipt of fabric',
        amount: 0,
        percentage: 15,
        order: 0,
        chatId: chat.id,
      },
      {
        name: 'Sample Approved',
        description: 'Creator approves the sample',
        amount: 0,
        percentage: 15,
        order: 1,
        chatId: chat.id,
      },
      {
        name: 'Final Product Approved',
        description: 'Creator approves the final product',
        amount: 0,
        percentage: 40,
        order: 2,
        chatId: chat.id,
      },
      {
        name: 'Delivery Confirmed',
        description: 'Delivery is confirmed',
        amount: 0,
        percentage: 30,
        order: 3,
        chatId: chat.id,
      },
    ];

    // Calculate amounts based on total price
    const totalPrice = chat.metadata?.proposal?.offer || 100;
    milestones.forEach(milestone => {
      milestone.amount = (totalPrice * milestone.percentage) / 100;
    });

    await this.milestoneRepository.save(milestones);
  }
}