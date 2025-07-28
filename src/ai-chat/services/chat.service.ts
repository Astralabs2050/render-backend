import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Chat, ChatMessage, ChatState } from '../entities/chat.entity';
import { Milestone, MilestoneStatus } from '../entities/milestone.entity';
import { CreateChatDto, SendMessageDto, GenerateDesignDto, ListDesignDto, MakerProposalDto, EscrowActionDto } from '../dto/chat.dto';
import { PromptService } from './prompt.service';
import { OpenAIService } from './openai.service';
import { CloudinaryService } from '../../common/services/cloudinary.service';
import { UsersService } from '../../users/users.service';
// Using fetch instead of axios for image download
// import { NFTService } from '../../web3/services/nft.service';
// import { EscrowService } from '../../web3/services/escrow.service';

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
    private cloudinaryService: CloudinaryService,
    private usersService: UsersService,
    // private nftService: NFTService,
    // private escrowService: EscrowService,
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

  async updateChat(chatId: string, updates: Partial<Chat>): Promise<Chat> {
    await this.chatRepository.update(chatId, updates);
    return this.chatRepository.findOne({ where: { id: chatId } });
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
    const dalleImageUrl = await this.openaiService.generateDesignImage(prompt, referenceImageBase64);

    // Download the DALL-E image and upload to Cloudinary for better performance
    let cloudinaryResult;
    try {
      const response = await fetch(dalleImageUrl);
      const arrayBuffer = await response.arrayBuffer();
      const imageBuffer = Buffer.from(arrayBuffer);
      
      const designId = `design_${chatId}_${Date.now()}`;
      cloudinaryResult = await this.cloudinaryService.uploadDesignImage(
        imageBuffer,
        designId,
        chat.userId
      );
      
      this.logger.log(`Design image uploaded to Cloudinary: ${cloudinaryResult.secure_url}`);
    } catch (error) {
      this.logger.error(`Failed to upload to Cloudinary: ${error.message}`);
      // Fallback to DALL-E URL if Cloudinary fails
      cloudinaryResult = { secure_url: dalleImageUrl };
    }

    // Extract design metadata
    const metadata = await this.openaiService.generateDesignMetadata(prompt);

    // Update chat metadata and state
    chat.metadata = { 
      ...chat.metadata, 
      design: {
        ...metadata,
        originalImageUrl: dalleImageUrl,
        cloudinaryUrl: cloudinaryResult.secure_url,
        cloudinaryPublicId: cloudinaryResult.public_id,
      }
    };
    chat.state = ChatState.DESIGN_PREVIEW;
    // chat.designImageUrl = cloudinaryResult.secure_url; // Property removed

    await this.chatRepository.save(chat);

    // Add assistant message with design preview and image
    const previewPrompt = this.promptService.getPromptForState(ChatState.DESIGN_PREVIEW, true, {
      name: metadata.name,
      price: metadata.price,
      days: metadata.timeframe,
      imageUrl: cloudinaryResult.secure_url
    });

    // Get image variants for different display sizes
    const variants = cloudinaryResult.public_id 
      ? this.cloudinaryService.getImageVariants(cloudinaryResult.public_id)
      : { thumbnail: cloudinaryResult.secure_url, medium: cloudinaryResult.secure_url, large: cloudinaryResult.secure_url };

    await this.addAssistantMessage(chatId, `${previewPrompt}\n\n🎨 **Design Image Generated!**\nView your design: ${cloudinaryResult.secure_url}\n\n📱 **Image Variants:**\n- Thumbnail: ${variants.thumbnail}\n- Medium: ${variants.medium}\n- Large: ${variants.large}`);

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

    // TODO: Integrate with Web3 services once they're properly loaded
    const jobData = {
      id: `job-${Date.now()}`,
      name,
      category,
      price,
      timeframe,
      status: 'active',
    };

    // Update chat metadata and state
    chat.metadata = { ...chat.metadata, job: jobData };
    chat.state = ChatState.LISTED;
    chat.jobId = jobData.id;
    
    await this.chatRepository.save(chat);

    // Add assistant message
    const listedPrompt = this.promptService.getPromptForState(ChatState.LISTED, true);
    await this.addAssistantMessage(chatId, listedPrompt);

    return jobData;
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
        // Disabled auto-generation - let interactive chat service handle it
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
    const message = this.messageRepository.create({
      content,
      role: 'assistant',
      chatId,
    });

    return this.messageRepository.save(message);
  }

  async extractDesignRequirements(chatId: string): Promise<any> {
    const chat = await this.chatRepository.findOne({
      where: { id: chatId },
      relations: ['messages'],
    });

    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    // Get all user messages for analysis
    const userMessages = chat.messages
      .filter(msg => msg.role === 'user')
      .map(msg => msg.content)
      .join(' ');

    // Use OpenAI to extract structured design requirements
    const extractionPrompt = `
      Analyze the following fashion design conversation and extract structured information:
      
      Conversation: "${userMessages}"
      
      Return ONLY a valid JSON object (no markdown, no code blocks, no explanations) with this exact structure:
      {
        "title": "A descriptive title for the design",
        "description": "A comprehensive description of the design",
        "style": "The style category (casual, formal, vintage, modern, etc.)",
        "colors": ["array", "of", "colors"],
        "materials": ["array", "of", "materials"],
        "garmentType": "dress/shirt/pants/jacket/etc",
        "occasion": "wedding/business/casual/party/etc",
        "budget": 300,
        "complexity": "simple/medium/complex",
        "timeframe": "7-14 days"
      }
      
      If any information is not available, use reasonable defaults. Return only the JSON object.
    `;

    let aiResponse: string = '';
    
    try {
      aiResponse = await this.openaiService.generateChatResponse([
        { role: 'system', content: 'You are a fashion design analyst. Extract structured information from conversations and return valid JSON only. Do not wrap the JSON in markdown code blocks.' },
        { role: 'user', content: extractionPrompt }
      ]);

      // Clean the AI response to remove markdown code blocks if present
      let cleanedResponse = aiResponse.trim();
      
      // Remove markdown code blocks (```json ... ```)
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      // Remove any leading/trailing whitespace
      cleanedResponse = cleanedResponse.trim();

      // Parse the cleaned AI response as JSON
      const designRequirements = JSON.parse(cleanedResponse);
      
      // Add chat metadata
      designRequirements.chatId = chatId;
      designRequirements.extractedAt = new Date().toISOString();

      return designRequirements;
    } catch (error) {
      this.logger.error(`Failed to extract design requirements: ${error.message}`);
      this.logger.error(`AI Response that failed to parse: ${aiResponse?.substring(0, 200)}...`);
      
      // Fallback to basic extraction
      return this.basicDesignExtraction(userMessages, chatId);
    }
  }

  private basicDesignExtraction(text: string, chatId: string): any {
    const lowerText = text.toLowerCase();
    
    // Basic keyword extraction
    const garmentTypes = ['dress', 'shirt', 'blouse', 'jacket', 'blazer', 'pants', 'trousers', 'skirt', 'suit', 'coat'];
    const styles = ['casual', 'formal', 'business', 'vintage', 'modern', 'bohemian', 'minimalist', 'elegant'];
    const colors = ['red', 'blue', 'green', 'black', 'white', 'yellow', 'purple', 'pink', 'orange', 'brown', 'navy', 'gray'];
    const materials = ['cotton', 'silk', 'leather', 'denim', 'wool', 'polyester', 'linen', 'satin', 'chiffon'];
    const occasions = ['wedding', 'business', 'party', 'casual', 'formal', 'work', 'date', 'vacation'];

    const foundGarment = garmentTypes.find(type => lowerText.includes(type)) || 'custom garment';
    const foundStyle = styles.find(style => lowerText.includes(style)) || 'modern';
    const foundColors = colors.filter(color => lowerText.includes(color));
    const foundMaterials = materials.filter(material => lowerText.includes(material));
    const foundOccasion = occasions.find(occasion => lowerText.includes(occasion)) || 'general';

    // Estimate budget based on keywords
    let budget = 300; // default
    if (lowerText.includes('luxury') || lowerText.includes('expensive') || lowerText.includes('high-end')) {
      budget = 800;
    } else if (lowerText.includes('affordable') || lowerText.includes('budget') || lowerText.includes('cheap')) {
      budget = 150;
    }

    return {
      title: `Custom ${foundGarment.charAt(0).toUpperCase() + foundGarment.slice(1)} Design`,
      description: text.substring(0, 500), // First 500 chars
      style: foundStyle,
      colors: foundColors.length > 0 ? foundColors : ['not specified'],
      materials: foundMaterials.length > 0 ? foundMaterials : ['not specified'],
      garmentType: foundGarment,
      occasion: foundOccasion,
      budget,
      complexity: text.length > 200 ? 'complex' : 'medium',
      timeframe: '7-14 days',
      chatId,
      extractedAt: new Date().toISOString(),
    };
  }

  async storeDesign(userId: string, chatId: string, name?: string, description?: string): Promise<any> {
    const chat = await this.chatRepository.findOne({
      where: [
        { id: chatId, userId: userId },
        { id: chatId, creatorId: userId }
      ],
    });

    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    if (!chat.metadata?.design) {
      throw new NotFoundException('No design found in this chat');
    }

    // Update design with storage info
    const storedDesign = {
      ...chat.metadata.design,
      name: name || chat.metadata.design.name || 'Stored Design',
      description: description || chat.metadata.design.description || 'Design stored from chat',
      storedAt: new Date().toISOString(),
      isStored: true,
    };

    chat.metadata = {
      ...chat.metadata,
      design: storedDesign,
    };

    await this.chatRepository.save(chat);

    return storedDesign;
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