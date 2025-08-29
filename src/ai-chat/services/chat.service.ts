import { Injectable, Logger, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Chat, ChatMessage, ChatState } from '../entities/chat.entity';
import { Milestone, MilestoneStatus } from '../entities/milestone.entity';
import { CreateChatDto, SendMessageDto, GenerateDesignDto, ListDesignDto, MakerProposalDto, EscrowActionDto } from '../dto/chat.dto';
import { PromptService } from './prompt.service';
import { OpenAIService } from './openai.service';
import { CloudinaryService } from '../../common/services/cloudinary.service';
import { UsersService } from '../../users/users.service';
import { JobService } from '../../marketplace/services/job.service';
import { CreateDesignDto } from '../../users/dto/create-collection.dto';
import { DESIGN_KEYWORDS } from '../config/design-keywords.config';
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
    private jobService: JobService,
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
    await this.addSystemMessage(savedChat.id, this.promptService.getSystemPrompt());
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
    const sanitizedContent = this.promptService.sanitizeUserMessage(content);
    const userMessage = this.messageRepository.create({
      content: sanitizedContent,
      role: 'user',
      chatId,
      actionType,
    });
    if (imageBase64) {
      userMessage.imageUrl = 'mock-image-url';
    }
    const savedMessage = await this.messageRepository.save(userMessage);
    // If interactive flow is managing this chat, do not run legacy auto-processing to avoid loops
    if (chat.metadata?.managedByInteractive) {
      return savedMessage;
    }
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
    await this.addAssistantMessage(chatId, "Generating your design... This will take a moment.");
    const dalleImageUrl = await this.openaiService.generateDesignImage(prompt, referenceImageBase64);
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
      cloudinaryResult = { secure_url: dalleImageUrl };
    }
    const metadata = await this.openaiService.generateDesignMetadata(prompt);
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
    await this.chatRepository.save(chat);
    const previewPrompt = this.promptService.getPromptForState(ChatState.DESIGN_PREVIEW, true, {
      name: metadata.name,
      price: metadata.price,
      days: metadata.timeframe,
      imageUrl: cloudinaryResult.secure_url
    });
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
    const jobData = {
      id: `job-${Date.now()}`,
      name,
      category,
      price,
      timeframe,
      status: 'active',
    };
    chat.metadata = { ...chat.metadata, job: jobData };
    chat.state = ChatState.LISTED;
    chat.jobId = jobData.id;
    await this.chatRepository.save(chat);
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
      const escrowId = `escrow-${Date.now()}`;
      chat.escrowId = escrowId;
      chat.state = ChatState.FABRIC_SHIPPING;
      chat.makerId = chat.metadata?.proposal?.makerId;
      await this.chatRepository.save(chat);
      await this.createMilestones(chat);
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
      const nextPrompt = this.promptService.getPromptForState(chat.state, true);
      await this.addAssistantMessage(chatId, nextPrompt);
      return { milestone };
    }
    return { success: true };
  }
  private async processUserMessage(chat: Chat, message: ChatMessage, isCreator: boolean): Promise<void> {
    const messages = await this.messageRepository.find({
      where: { chatId: chat.id },
      order: { createdAt: 'ASC' },
    });
    const formattedMessages = messages.map(msg => ({
      role: msg.role,
      content: msg.content 
    }));
    const aiResponse = await this.openaiService.generateChatResponse(formattedMessages);
    await this.addAssistantMessage(chat.id, aiResponse);
    await this.processStateTransition(chat, message, isCreator);
  }
  private async processStateTransition(chat: Chat, message: ChatMessage, isCreator: boolean): Promise<void> {
    const content = message.content.toLowerCase();
    let newState = chat.state;
    
    // Handle design variations - skip story, just generate
    if (chat.state === ChatState.DESIGN_PREVIEW && await this.isDesignChangeRequest(content)) {
      await this.generateDesignVariation(chat.id, message.content);
      return;
    }
    
    // Handle design approval
    if (chat.state === ChatState.DESIGN_PREVIEW && await this.isApprovalRequest(content)) {
      newState = ChatState.DESIGN_APPROVED;
      await this.addAssistantMessage(chat.id, "Great! I love your choice. Now let's get your design listed on the marketplace. I need a few details:");
    }
    
    switch (chat.state) {
      case ChatState.WELCOME:
        if (await this.isDesignRequest(content) || message.imageUrl) {
          newState = ChatState.INTENT;
        }
        break;
      case ChatState.INTENT:
        if (content.includes('a') || content.includes('myself') || content.includes('personal')) {
          newState = ChatState.INFO_GATHER;
        } else if (content.includes('b') || content.includes('others') || content.includes('sell')) {
          newState = ChatState.INFO_GATHER;
        } else if (await this.isUserEagerToGenerate(chat.id, message.content)) {
          newState = ChatState.INFO_GATHER;
        }
        break;
      case ChatState.INFO_GATHER:
        // Enforce explicit confirmation gate before any generation
        if (!chat.metadata?.confirmRequested) {
          chat.metadata = { ...chat.metadata, confirmRequested: true };
          await this.chatRepository.save(chat);
          await this.addAssistantMessage(chat.id, 'Generate 3 visual variations now? (yes/no)');
          return;
        }
       
        if (await this.isUserConfirming(chat.id, message.content)) {
          await this.generateThreeVariations(chat, message.content);
          return;
        }
        await this.addAssistantMessage(chat.id, "No problem. Share more details, or say 'yes' when you're ready to generate the 3 variations.");
        return;
      case ChatState.DESIGN_APPROVED:
        newState = ChatState.JOB_INFO_GATHER;
        break;
      case ChatState.JOB_INFO_GATHER:
        await this.handleJobInfoGathering(chat, message);
        return;
      case ChatState.PAYMENT_REQUIRED:
        if (await this.isPaymentConfirmation(content)) {
          await this.processPaymentAndList(chat);
          return;
        }
        break;
      case ChatState.MAKER_PROPOSAL:
        if (content.includes('accept') || content.includes('yes')) {
          newState = ChatState.ESCROW_PAYMENT;
        }
        break;
    }
    
    if (newState !== chat.state) {
      // If we are about to enter INFO_GATHER and user is eager to generate, show confirm gate immediately
      if (newState === ChatState.INFO_GATHER && !chat.metadata?.confirmRequested) {
        chat.state = ChatState.INFO_GATHER;
        chat.metadata = { ...chat.metadata, confirmRequested: true };
        await this.chatRepository.save(chat);
        await this.addAssistantMessage(chat.id, 'Generate 3 visual variations now? (yes/no)');
        return;
      }
      chat.state = newState;
      await this.chatRepository.save(chat);
      const statePrompt = this.promptService.getPromptForState(newState, isCreator, chat.metadata);
      await this.addAssistantMessage(chat.id, statePrompt);
    }
  }
  
  private async isDesignChangeRequest(content: string): Promise<boolean> {
    const prompt = `Is this a request to change or modify a design? "${content}" Answer only: yes or no`;
    const response = await this.openaiService.generateChatResponse([
      { role: 'system', content: 'You detect design change requests. Answer only yes or no.' },
      { role: 'user', content: prompt }
    ]);
    return response.toLowerCase().includes('yes');
  }
  
  private async isApprovalRequest(content: string): Promise<boolean> {
    const prompt = `Is this approving or accepting a design? "${content}" Answer only: yes or no`;
    const response = await this.openaiService.generateChatResponse([
      { role: 'system', content: 'You detect approval/acceptance. Answer only yes or no.' },
      { role: 'user', content: prompt }
    ]);
    return response.toLowerCase().includes('yes');
  }
  
  private async isDesignRequest(content: string): Promise<boolean> {
    const prompt = `Is this requesting a fashion design? "${content}" Answer only: yes or no`;
    const response = await this.openaiService.generateChatResponse([
      { role: 'system', content: 'You detect fashion design requests. Answer only yes or no.' },
      { role: 'user', content: prompt }
    ]);
    return response.toLowerCase().includes('yes');
  }
  
  private async isPaymentConfirmation(content: string): Promise<boolean> {
    const prompt = `Is this confirming or requesting to process payment? "${content}" Answer only: yes or no`;
    const response = await this.openaiService.generateChatResponse([
      { role: 'system', content: 'You detect payment confirmation requests. Answer only yes or no.' },
      { role: 'user', content: prompt }
    ]);
    return response.toLowerCase().includes('yes');
  }

  private async isUserEagerToGenerate(chatId: string, latestMessage: string): Promise<boolean> {
    try {
      const messages = await this.messageRepository.find({ where: { chatId }, order: { createdAt: 'ASC' } });
      const convo = messages.map(m => `${m.role}: ${m.content}`).join('\n');
      const prompt = `Does the user want to skip questions and generate images now? Use the entire conversation.
Conversation:\n${convo}\nUser latest: "${latestMessage}"
Reply ONLY YES or NO.`;
      const res = await this.openaiService.generateChatResponse([
        { role: 'system', content: 'Classify eagerness to generate now. Reply only YES or NO.' },
        { role: 'user', content: prompt },
      ]);
      return res.trim().toUpperCase().startsWith('YES');
    } catch {
      return false;
    }
  }
  
  private async generateDesignVariation(chatId: string, changeRequest: string): Promise<void> {
    const chat = await this.chatRepository.findOne({ where: { id: chatId } });
    if (!chat?.metadata?.design) return;
    
    await this.addAssistantMessage(chatId, "Perfect! Let me create a new variation for you...");
    
    // Generate 3 variations based on the change request
    const basePrompt = chat.metadata.design.description || 'fashion design';
    const variationPrompt = `${basePrompt} but ${changeRequest}`;
    
    try {
      // Generate 3 design variations
      const variations = [];
      for (let i = 0; i < 3; i++) {
        const dalleImageUrl = await this.openaiService.generateDesignImage(variationPrompt);
        const response = await fetch(dalleImageUrl);
        const arrayBuffer = await response.arrayBuffer();
        const imageBuffer = Buffer.from(arrayBuffer);
        const designId = `variation_${chatId}_${Date.now()}_${i}`;
        const cloudinaryResult = await this.cloudinaryService.uploadDesignImage(imageBuffer, designId, chat.userId);
        variations.push(cloudinaryResult.secure_url);
      }
      
      // Update chat with new variations
      chat.designPreviews = variations;
      await this.chatRepository.save(chat);
      
      const variationMessage = `🎨 **Here are 3 new variations based on your request:**\n\n` +
        variations.map((url, i) => `**Option ${i + 1}:** ${url}`).join('\n') +
        `\n\nWhich one do you prefer? Or would you like me to make more changes?`;
      
      await this.addAssistantMessage(chatId, variationMessage);
    } catch (error) {
      this.logger.error(`Variation generation failed: ${error.message}`);
      await this.addAssistantMessage(chatId, "I had trouble creating variations. Could you try describing the changes differently?");
    }
  }
  
  private async processPaymentAndList(chat: Chat): Promise<void> {
    try {
      await this.addAssistantMessage(chat.id, "Processing payment...");
      
      const { jobInfo } = chat.metadata;
      const totalAmount = jobInfo.price * jobInfo.amountOfPieces;
      
      // Create design collection for payment
      const designDto: CreateDesignDto = {
        name: jobInfo.name,
        price: jobInfo.price,
        amountOfPieces: jobInfo.amountOfPieces,
        location: jobInfo.location,
        deadline: jobInfo.deadline
      };
      
      const design = await this.usersService.createCollection(chat.userId, designDto, null);
      
      // Process payment using existing system
      const paymentResult = await this.usersService.processCollectionPayment(
        chat.userId, 
        design.id, 
        { paymentMethod: 'wallet' }
      );
      
      if (paymentResult.paymentStatus === 'completed') {
        // Create job listing after successful payment
        const job = await this.completeJobListing(chat.userId, chat.id);
        
        chat.state = ChatState.LISTED;
        await this.chatRepository.save(chat);
        
        await this.addAssistantMessage(chat.id, `🎉 Payment successful! Your design is now listed.\n\n**Transaction:** ${paymentResult.transactionHash}\n**Amount:** $${paymentResult.amount}\n\nMakers can now apply to create your design!`);
      } else {
        throw new Error('Payment failed');
      }
    } catch (error) {
      this.logger.error(`Payment processing failed: ${error.message}`);
      await this.addAssistantMessage(chat.id, `Payment failed: ${error.message}. Please ensure you have sufficient funds in your wallet.`);
    }
  }
  private async autoGenerateDesign(chatId: string, prompt: string): Promise<void> {
    try {
      this.logger.log(`Auto-generating design for chat ${chatId} with prompt: ${prompt}`);
      await this.generateDesign({
        chatId,
        prompt,
      });
    } catch (error) {
      this.logger.error(`Auto design generation failed: ${error.message}`);
      await this.addAssistantMessage(chatId, "I had trouble generating your design. Let me try a different approach - could you describe your design idea again?");
    }
  }

  private async generateThreeVariations(chat: Chat, basePrompt: string): Promise<void> {
    try {
      this.logger.log(`Generating 3 variations for chat ${chat.id} with prompt: ${basePrompt}`);
      const urls: string[] = [];
      for (let i = 1; i <= 3; i++) {
        const dalleImageUrl = await this.openaiService.generateDesignImage(`${basePrompt} - Variation ${i}`);
        try {
          const response = await fetch(dalleImageUrl);
          const arrayBuffer = await response.arrayBuffer();
          const imageBuffer = Buffer.from(arrayBuffer);
          const designId = `design_${chat.id}_${Date.now()}_${i}`;
          const upload = await this.cloudinaryService.uploadDesignImage(imageBuffer, designId, chat.userId);
          urls.push(upload.secure_url);
        } catch {
          urls.push(dalleImageUrl);
        }
      }
      chat.designPreviews = urls;
      chat.state = ChatState.DESIGN_PREVIEW;
      chat.metadata = { ...chat.metadata, confirmRequested: false };
      await this.chatRepository.save(chat);
      const msg = `Here are 3 design variations:\n1) ${urls[0]}\n2) ${urls[1]}\n3) ${urls[2]}\nReply with variation_1/variation_2/variation_3 to select.`;
      await this.addAssistantMessage(chat.id, msg);
    } catch (error) {
      this.logger.error(`Failed generating variations: ${error.message}`);
      await this.addAssistantMessage(chat.id, 'I ran into an issue generating variations. Please try again.');
    }
  }

  private async isUserConfirming(chatId: string, latestMessage: string): Promise<boolean> {
    try {
      const messages = await this.messageRepository.find({ where: { chatId }, order: { createdAt: 'ASC' } });
      const convo = messages.map(m => `${m.role}: ${m.content}`).join('\n');
      const prompt = `You decide if the user explicitly confirmed proceeding to generate images now.
Conversation:\n${convo}\nUser latest: "${latestMessage}"
Respond ONLY one word: CONFIRM or HOLD.`;
      const res = await this.openaiService.generateChatResponse([
        { role: 'system', content: 'Decide confirmation strictly. Output one word: CONFIRM or HOLD.' },
        { role: 'user', content: prompt },
      ]);
      return res.trim().toUpperCase().includes('CONFIRM');
    } catch (e) {
      return false;
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
    const userMessages = chat.messages
      .filter(msg => msg.role === 'user')
      .map(msg => msg.content)
      .join(' ');
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
      let cleanedResponse = aiResponse.trim();
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      cleanedResponse = cleanedResponse.trim();
      const designRequirements = JSON.parse(cleanedResponse);
      designRequirements.chatId = chatId;
      designRequirements.extractedAt = new Date().toISOString();
      return designRequirements;
    } catch (error) {
      this.logger.error(`Failed to extract design requirements: ${error.message}`);
      this.logger.error(`AI Response that failed to parse: ${aiResponse?.substring(0, 200)}...`);
      return this.basicDesignExtraction(userMessages, chatId);
    }
  }
  private basicDesignExtraction(text: string, chatId: string): any {
    const lowerText = text.toLowerCase();
    const foundGarment = DESIGN_KEYWORDS.garmentTypes.find(type => lowerText.includes(type)) || 'custom garment';
    const foundStyle = DESIGN_KEYWORDS.styles.find(style => lowerText.includes(style)) || 'modern';
    const foundColors = DESIGN_KEYWORDS.colors.filter(color => lowerText.includes(color));
    const foundMaterials = DESIGN_KEYWORDS.materials.filter(material => lowerText.includes(material));
    const foundOccasion = DESIGN_KEYWORDS.occasions.find(occasion => lowerText.includes(occasion)) || 'general';
    let budget = DESIGN_KEYWORDS.budgetRanges.mid;
    if (DESIGN_KEYWORDS.budgetKeywords.luxury.some(keyword => lowerText.includes(keyword))) {
      budget = DESIGN_KEYWORDS.budgetRanges.luxury;
    } else if (DESIGN_KEYWORDS.budgetKeywords.budget.some(keyword => lowerText.includes(keyword))) {
      budget = DESIGN_KEYWORDS.budgetRanges.budget;
    }
    return {
      title: `Custom ${foundGarment.charAt(0).toUpperCase() + foundGarment.slice(1)} Design`,
      description: text.substring(0, 500),
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
  private async handleJobInfoGathering(chat: Chat, message: ChatMessage): Promise<void> {
    const content = message.content;
    let jobInfo = chat.metadata?.jobInfo || {};
    
    // Smart extraction of job information
    const extractionPrompt = `
      Extract job listing details from this message: "${content}"
      
      Look for:
      - Design name/title
      - Price per piece (numbers with $ or currency)
      - Number of pieces/quantity
      - Location/delivery address
      - Deadline/timeframe
      
      Return ONLY valid JSON:
      {"name": "", "price": 0, "amountOfPieces": 0, "location": "", "deadline": ""}
    `;
    
    try {
      const aiResponse = await this.openaiService.generateChatResponse([
        { role: 'system', content: 'You extract structured data from text. Return only valid JSON, no explanations.' },
        { role: 'user', content: extractionPrompt }
      ]);
      
      const cleanResponse = aiResponse.replace(/```json|```/g, '').trim();
      const extracted = JSON.parse(cleanResponse);
      
      // Merge extracted info with existing
      Object.keys(extracted).forEach(key => {
        if (extracted[key] && extracted[key] !== '' && extracted[key] !== 0) {
          jobInfo[key] = extracted[key];
        }
      });
      
      chat.metadata = { ...chat.metadata, jobInfo };
      await this.chatRepository.save(chat);
      
      // Check what's still missing
      const missing = [];
      if (!jobInfo.name) missing.push('design name');
      if (!jobInfo.price || jobInfo.price <= 0) missing.push('price per piece');
      if (!jobInfo.amountOfPieces || jobInfo.amountOfPieces <= 0) missing.push('number of pieces');
      if (!jobInfo.location) missing.push('delivery location');
      if (!jobInfo.deadline) missing.push('deadline');
      
      if (missing.length > 0) {
        // Generate natural question based on what's missing
        const questionPrompt = `Generate a natural question to ask for: ${missing.join(', ')}. Be conversational and helpful.`;
        const question = await this.openaiService.generateChatResponse([
          { role: 'system', content: 'Generate natural, conversational questions for missing job information.' },
          { role: 'user', content: questionPrompt }
        ]);
        
        await this.addAssistantMessage(chat.id, question);
      } else {
        // All info collected, show summary and request payment
        chat.state = ChatState.PAYMENT_REQUIRED;
        await this.chatRepository.save(chat);
        
        const summary = `
          📝 **Job Summary**\n\n
          **Design:** ${jobInfo.name}\n
          **Price:** $${jobInfo.price} per piece\n
          **Quantity:** ${jobInfo.amountOfPieces} pieces\n
          **Total:** $${jobInfo.price * jobInfo.amountOfPieces}\n
          **Location:** ${jobInfo.location}\n
          **Deadline:** ${jobInfo.deadline}\n\n
          Ready to list this on the marketplace? Say "process payment" to complete the transaction.
        `;
        
        await this.addAssistantMessage(chat.id, summary);
      }
    } catch (error) {
      this.logger.error(`Job info extraction failed: ${error.message}`);
      
      // Fallback to asking for all info
      const currentInfo = [];
      if (jobInfo.name) currentInfo.push(`Name: ${jobInfo.name}`);
      if (jobInfo.price) currentInfo.push(`Price: $${jobInfo.price}`);
      if (jobInfo.amountOfPieces) currentInfo.push(`Pieces: ${jobInfo.amountOfPieces}`);
      if (jobInfo.location) currentInfo.push(`Location: ${jobInfo.location}`);
      if (jobInfo.deadline) currentInfo.push(`Deadline: ${jobInfo.deadline}`);
      
      const currentInfoText = currentInfo.length > 0 ? `\n\nWhat I have so far:\n${currentInfo.join('\n')}` : '';
      
      await this.addAssistantMessage(chat.id, `I need these details to list your design:\n\n• Design name\n• Price per piece\n• Number of pieces\n• Delivery location\n• Deadline${currentInfoText}\n\nPlease provide the missing information.`);
    }
  }

  async completeJobListing(userId: string, chatId: string): Promise<any> {
    const chat = await this.chatRepository.findOne({
      where: [
        { id: chatId, userId: userId },
        { id: chatId, creatorId: userId }
      ],
    });
    
    if (!chat) {
      throw new NotFoundException('Chat not found');
    }
    
    if (!chat.metadata?.jobInfo) {
      throw new BadRequestException('Job information not provided. Please complete job details first.');
    }
    
    if (chat.state !== ChatState.PAYMENT_REQUIRED) {
      throw new BadRequestException('Job listing not ready. Current state: ' + chat.state);
    }
    
    if (chat.jobId) {
      throw new ConflictException('Job already listed for this design');
    }
    
    if (!chat.designPreviews?.length) {
      throw new BadRequestException('No design images available. Please generate designs first.');
    }
    
    const { jobInfo } = chat.metadata;
    
    // Validate required job info fields
    const missing = [];
    if (!jobInfo.name) missing.push('design name');
    if (!jobInfo.price || jobInfo.price <= 0) missing.push('valid price');
    if (!jobInfo.amountOfPieces || jobInfo.amountOfPieces <= 0) missing.push('number of pieces');
    if (!jobInfo.location) missing.push('delivery location');
    if (!jobInfo.deadline) missing.push('deadline');
    
    if (missing.length > 0) {
      throw new BadRequestException(`Missing required information: ${missing.join(', ')}`);
    }
    
    // Create job with your original parameters
    const job = {
      id: `job-${Date.now()}`,
      name: jobInfo.name,
      price: jobInfo.price,
      amountOfPieces: jobInfo.amountOfPieces,
      location: jobInfo.location,
      deadline: jobInfo.deadline,
      designImages: chat.designPreviews || [],
      status: 'active',
      createdAt: new Date().toISOString(),
    };
    
    chat.metadata = { ...chat.metadata, job };
    chat.state = ChatState.LISTED;
    chat.jobId = job.id;
    await this.chatRepository.save(chat);
    
    await this.addAssistantMessage(chat.id, `🎉 Your design has been listed!\n\n**Name:** ${job.name}\n**Price:** $${job.price} per piece\n**Pieces:** ${job.amountOfPieces}\n**Location:** ${job.location}\n**Deadline:** ${job.deadline}\n\nMakers can now apply to create your design!`);
    
    return job;
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
  async processPaymentForChat(userId: string, chatId: string): Promise<any> {
    const chat = await this.chatRepository.findOne({
      where: [
        { id: chatId, userId: userId },
        { id: chatId, creatorId: userId }
      ],
    });
    
    if (!chat) {
      throw new NotFoundException('Chat not found');
    }
    
    if (chat.state !== ChatState.PAYMENT_REQUIRED) {
      throw new BadRequestException(`Payment not required. Current state: ${chat.state}`);
    }
    
    await this.processPaymentAndList(chat);
    return { success: true, chatId };
  }

  private async createMilestones(chat: Chat): Promise<void> {
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
    const totalPrice = chat.metadata?.proposal?.offer || 100;
    milestones.forEach(milestone => {
      milestone.amount = (totalPrice * milestone.percentage) / 100;
    });
    await this.milestoneRepository.save(milestones);
  }
}