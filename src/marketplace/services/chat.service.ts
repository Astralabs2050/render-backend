import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Chat } from '../entities/chat.entity';
import { Message, MessageType } from '../entities/message.entity';
import { Job } from '../entities/job.entity';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Chat)
    private chatRepository: Repository<Chat>,
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    @InjectRepository(Job)
    private jobRepository: Repository<Job>,
  ) {}

  async createChat(jobId: string, creatorId: string, makerId: string): Promise<Chat> {
    const job = await this.jobRepository.findOne({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Job not found');

    const existingChat = await this.chatRepository.findOne({
      where: { jobId, creatorId, makerId }
    });
    if (existingChat) return existingChat;

    const chat = this.chatRepository.create({
      jobId,
      creatorId,
      makerId,
      lastMessageAt: new Date(),
    });
    return this.chatRepository.save(chat);
  }

  async sendMessage(chatId: string, senderId: string, content: string, type: MessageType = MessageType.TEXT): Promise<Message> {
    const chat = await this.chatRepository.findOne({ where: { id: chatId } });
    if (!chat) throw new NotFoundException('Chat not found');

    if (chat.creatorId !== senderId && chat.makerId !== senderId) {
      throw new ForbiddenException('Not authorized to send messages in this chat');
    }

    const message = this.messageRepository.create({
      chatId,
      senderId,
      content,
      type,
    });

    const savedMessage = await this.messageRepository.save(message);
    
    chat.lastMessageAt = new Date();
    await this.chatRepository.save(chat);

    return savedMessage;
  }

  async getMessages(chatId: string, userId: string): Promise<Message[]> {
    const chat = await this.chatRepository.findOne({ where: { id: chatId } });
    if (!chat) throw new NotFoundException('Chat not found');

    if (chat.creatorId !== userId && chat.makerId !== userId) {
      throw new ForbiddenException('Not authorized to view this chat');
    }

    return this.messageRepository.find({
      where: { chatId },
      relations: ['sender'],
      order: { createdAt: 'ASC' },
    });
  }

  async getUserChats(userId: string): Promise<Chat[]> {
    return this.chatRepository.find({
      where: [
        { creatorId: userId },
        { makerId: userId }
      ],
      relations: ['job', 'creator', 'maker'],
      order: { lastMessageAt: 'DESC' },
    });
  }

  async validateChatAccess(chatId: string, userId: string): Promise<Chat | null> {
    return this.chatRepository.findOne({
      where: [
        { id: chatId, creatorId: userId },
        { id: chatId, makerId: userId }
      ]
    });
  }
}