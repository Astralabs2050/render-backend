import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { AiChat, AiChatMessage } from '../entities/chat.entity';
import { CreateChatDto, SendMessageDto } from '../dto/chat.dto';
import { User } from '../../users/entities/user.entity';
import { ImageGenerationService } from '../image-generation/image-generation.service';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @InjectRepository(AiChat)
    private chatRepository: Repository<AiChat>,
    @InjectRepository(AiChatMessage)
    private messageRepository: Repository<AiChatMessage>,
    private configService: ConfigService,
    private imageGenerationService: ImageGenerationService,
  ) {}

  async createChat(userId: string, dto: CreateChatDto): Promise<AiChat> {
    const chat = this.chatRepository.create({
      ...dto,
      userId,
    });

    return this.chatRepository.save(chat);
  }

  async getChats(userId: string): Promise<AiChat[]> {
    return this.chatRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async getChat(userId: string, chatId: string): Promise<AiChat> {
    const chat = await this.chatRepository.findOne({
      where: { id: chatId, userId },
      relations: ['messages'],
      order: { messages: { createdAt: 'ASC' } },
    });

    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    return chat;
  }

  async sendMessage(userId: string, dto: SendMessageDto): Promise<AiChatMessage> {
    const { content, chatId, imageBase64 } = dto;

    // Verify chat exists and belongs to user
    const chat = await this.chatRepository.findOne({
      where: { id: chatId, userId },
    });

    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    // Create user message
    const userMessage = this.messageRepository.create({
      content,
      role: 'user',
      chatId,
    });
    await this.messageRepository.save(userMessage);

    // Process image if provided
    let imageUrl = null;
    if (imageBase64) {
      // In a real implementation, save the image and get its URL
      // imageUrl = await this.saveImage(imageBase64);
      userMessage.imageUrl = 'mock-image-url';
      await this.messageRepository.save(userMessage);
    }

    // Generate AI response
    const aiResponse = await this.generateAiResponse(content, imageUrl);
    
    // Create AI message
    const aiMessage = this.messageRepository.create({
      content: aiResponse,
      role: 'assistant',
      chatId,
    });
    const savedAiMessage = await this.messageRepository.save(aiMessage);

    // If the message is about generating an outfit, trigger image generation
    if (this.isOutfitGenerationRequest(content)) {
      await this.imageGenerationService.generateImages({
        prompt: content,
        chatId,
        messageId: savedAiMessage.id,
        provider: 'stable-diffusion',
      });
    }

    return savedAiMessage;
  }

  private async generateAiResponse(content: string, imageUrl?: string): Promise<string> {
    try {
      // In a real implementation, call an AI service like OpenAI
      // const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      //   model: imageUrl ? 'gpt-4-vision-preview' : 'gpt-4',
      //   messages: [
      //     {
      //       role: 'system',
      //       content: 'You are a fashion design assistant. Help users design outfits and provide detailed descriptions.'
      //     },
      //     {
      //       role: 'user',
      //       content: imageUrl 
      //         ? [
      //             { type: 'text', text: content },
      //             { type: 'image_url', image_url: { url: imageUrl } }
      //           ]
      //         : content
      //     }
      //   ],
      // }, {
      //   headers: {
      //     'Authorization': `Bearer ${this.configService.get('OPENAI_API_KEY')}`,
      //   },
      // });
      
      // For now, return mock responses
      if (this.isOutfitGenerationRequest(content)) {
        return "I'll create a white satin dress with cutouts and a train for you. Here are some design ideas:\n\n1. A floor-length white satin gown with side cutouts and a flowing train\n2. An asymmetrical white satin dress with geometric cutouts and a short train\n3. A structured white satin mini dress with back cutouts and a detachable train\n\nI'm generating these designs for you to preview. Which style would you prefer?";
      } else {
        return "I'm here to help with your fashion design needs. Would you like me to create a specific outfit design for you?";
      }
    } catch (error) {
      this.logger.error(`AI response generation error: ${error.message}`);
      return "I'm sorry, I couldn't process your request at the moment. Please try again later.";
    }
  }

  private isOutfitGenerationRequest(content: string): boolean {
    const keywords = ['make', 'create', 'design', 'generate', 'dress', 'outfit', 'clothing'];
    const lowercaseContent = content.toLowerCase();
    
    return keywords.some(keyword => lowercaseContent.includes(keyword));
  }
}