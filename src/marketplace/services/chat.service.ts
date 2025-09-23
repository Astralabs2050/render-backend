import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { Chat } from '../entities/chat.entity';
import { Message, MessageType } from '../entities/message.entity';
import { Job } from '../entities/job.entity';
import { DeliveryDetails } from '../entities/delivery-details.entity';
import { Measurements } from '../entities/measurements.entity';
import { DeliveryDetailsDto, MeasurementsDto } from '../dto/delivery-measurements.dto';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Chat)
    private chatRepository: Repository<Chat>,
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    @InjectRepository(Job)
    private jobRepository: Repository<Job>,
    @InjectRepository(DeliveryDetails)
    private deliveryDetailsRepository: Repository<DeliveryDetails>,
    @InjectRepository(Measurements)
    private measurementsRepository: Repository<Measurements>,
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

  async sendMessage(
    chatId: string, 
    senderId: string, 
    content: string, 
    type: MessageType = MessageType.TEXT,
    deliveryDetails?: DeliveryDetailsDto,
    measurements?: MeasurementsDto,
    actionType?: string,
    attachments?: string[]
  ): Promise<any> {
    try {
      const chat = await this.validateChatAccess(chatId, senderId);
      if (!chat) throw new ForbiddenException('Not authorized to send messages in this chat');

      // Handle payment action validations
      if (actionType === 'payment_request' && chat.makerId !== senderId) {
        throw new ForbiddenException('Only the maker can request payment');
      }
      if (actionType === 'payment_approved' && chat.creatorId !== senderId) {
        throw new ForbiddenException('Only the creator can approve payment');
      }

      return await this.chatRepository.manager.transaction(async manager => {
        const message = manager.create(Message, {
          chatId,
          senderId,
          content,
          type,
          actionType,
          attachments: attachments || [],
        });

        const savedMessage = await manager.save(message);
        
        if (deliveryDetails) {
          const existing = await manager.findOne(DeliveryDetails, { where: { chatId } });
          if (existing) {
            await manager.update(DeliveryDetails, { chatId }, deliveryDetails);
          } else {
            await manager.save(DeliveryDetails, { chatId, ...deliveryDetails });
          }
        }

        if (measurements) {
          const existing = await manager.findOne(Measurements, { where: { chatId } });
          if (existing) {
            await manager.update(Measurements, { chatId }, measurements);
          } else {
            await manager.save(Measurements, { chatId, ...measurements });
          }
        }

        // Handle payment approval - release escrow
        if (actionType === 'payment_approved') {
          const chatToUpdate = await manager.findOne(Chat, { where: { id: chatId } });
          if (!chatToUpdate || chatToUpdate.escrowStatus !== 'funded') {
            throw new BadRequestException('Escrow must be funded before payment can be approved');
          }
          await manager.update(Chat, chatId, { escrowStatus: 'completed' });
        }
        
        await manager.update(Chat, chatId, { lastMessageAt: new Date() });

        const messageWithSender = await manager.findOne(Message, {
          where: { id: savedMessage.id },
          relations: ['sender']
        });

        return {
          ...messageWithSender,
          sender: {
            id: messageWithSender.sender.id,
            fullName: messageWithSender.sender.fullName,
            email: messageWithSender.sender.email,
            userType: messageWithSender.sender.userType,
            avatar: messageWithSender.sender.profilePicture || null,
          },
        };
      });
    } catch (error) {
      throw error;
    }
  }

  async getMessages(chatId: string, userId: string): Promise<any[]> {
    const chat = await this.validateChatAccess(chatId, userId);
    if (!chat) throw new ForbiddenException('Not authorized to view this chat');

    const messages = await this.messageRepository.find({
      where: { chatId },
      relations: ['sender'],
      order: { createdAt: 'ASC' },
    });

    return messages.map(message => ({
      ...message,
      sender: {
        id: message.sender.id,
        fullName: message.sender.fullName,
        email: message.sender.email,
        userType: message.sender.userType,
        avatar: message.sender.profilePicture || null,
      },
    }));
  }

  async getUserChats(userId: string): Promise<any[]> {
    try {
      const chats = await this.chatRepository.find({
        where: [{ creatorId: userId }, { makerId: userId }],
        relations: ['job', 'creator', 'maker'],
        order: { lastMessageAt: 'DESC' },
      });

      if (!chats.length) return [];

      const chatIds = chats.map(c => c.id);
      
      const lastMessages = await this.messageRepository
        .createQueryBuilder('m')
        .leftJoinAndSelect('m.sender', 's')
        .where('m.id IN (' +
          'SELECT DISTINCT ON ("chatId") id FROM messages ' +
          'WHERE "chatId" = ANY(:chatIds) ' +
          'ORDER BY "chatId", "createdAt" DESC'
        + ')', { chatIds })
        .getMany();

      const unreadCounts = await this.messageRepository.query(`
        SELECT m."chatId", COUNT(*) as count
        FROM messages m
        WHERE m."chatId" = ANY($1)
          AND m."isRead" = false
          AND m."senderId" != $2
        GROUP BY m."chatId"
      `, [chatIds, userId]);

      const lastMessageMap = new Map(lastMessages.map(m => [m.chatId, m]));
      const unreadCountMap = new Map(unreadCounts.map(u => [u.chatId, parseInt(u.count)]));

      return chats.map(chat => ({
        ...chat,
        creator: {
          id: chat.creator.id,
          fullName: chat.creator.fullName,
          email: chat.creator.email,
          userType: chat.creator.userType,
          avatar: chat.creator.profilePicture || null,
        },
        maker: {
          id: chat.maker.id,
          fullName: chat.maker.fullName,
          email: chat.maker.email,
          userType: chat.maker.userType,
          avatar: chat.maker.profilePicture || null,
        },
        unreadCount: unreadCountMap.get(chat.id) || 0,
        lastMessage: lastMessageMap.get(chat.id) ? {
          content: lastMessageMap.get(chat.id).content,
          type: lastMessageMap.get(chat.id).type,
          createdAt: lastMessageMap.get(chat.id).createdAt,
          sender: {
            id: lastMessageMap.get(chat.id).sender.id,
            fullName: lastMessageMap.get(chat.id).sender.fullName,
            email: lastMessageMap.get(chat.id).sender.email,
            userType: lastMessageMap.get(chat.id).sender.userType,
            avatar: lastMessageMap.get(chat.id).sender.profilePicture || null,
          },
        } : null,
      }));
    } catch (error) {
      throw error;
    }
  }

  async validateChatAccess(chatId: string, userId: string): Promise<Chat | null> {
    return this.chatRepository.findOne({
      where: [
        { id: chatId, creatorId: userId },
        { id: chatId, makerId: userId }
      ]
    });
  }

  async createEscrow(chatId: string, amount: number, userId: string): Promise<Chat> {
    const chat = await this.chatRepository.findOne({ 
      where: { id: chatId },
      relations: ['job']
    });
    if (!chat) throw new NotFoundException('Chat not found');
    
    if (chat.creatorId !== userId) {
      throw new ForbiddenException('Only job creator can create escrow');
    }

    chat.escrowAmount = amount;
    chat.escrowStatus = 'pending';
    
    return this.chatRepository.save(chat);
  }

  async fundEscrow(chatId: string, userId: string): Promise<Chat> {
    const chat = await this.chatRepository.findOne({ where: { id: chatId } });
    if (!chat) throw new NotFoundException('Chat not found');
    
    if (chat.creatorId !== userId) {
      throw new ForbiddenException('Only job creator can fund escrow');
    }

    chat.escrowStatus = 'funded';
    return this.chatRepository.save(chat);
  }

  async releaseEscrow(chatId: string, userId: string): Promise<Chat> {
    const chat = await this.chatRepository.findOne({ where: { id: chatId } });
    if (!chat) throw new NotFoundException('Chat not found');
    
    if (chat.creatorId !== userId) {
      throw new ForbiddenException('Only job creator can release escrow');
    }

    chat.escrowStatus = 'completed';
    return this.chatRepository.save(chat);
  }

  async markMessagesAsRead(chatId: string, userId: string): Promise<void> {
    const chat = await this.validateChatAccess(chatId, userId);
    if (!chat) throw new ForbiddenException('Not authorized to access this chat');

    const otherUserId = userId === chat.creatorId ? chat.makerId : chat.creatorId;
    await this.messageRepository.update(
      { chatId, senderId: otherUserId, isRead: false },
      { isRead: true }
    );
  }

  async getDeliveryDetails(chatId: string, userId: string): Promise<DeliveryDetails | null> {
    const chat = await this.validateChatAccess(chatId, userId);
    if (!chat) throw new ForbiddenException('Not authorized to access this chat');

    return this.deliveryDetailsRepository.findOne({ where: { chatId } });
  }

  async getMeasurements(chatId: string, userId: string): Promise<Measurements | null> {
    const chat = await this.validateChatAccess(chatId, userId);
    if (!chat) throw new ForbiddenException('Not authorized to access this chat');

    return this.measurementsRepository.findOne({ where: { chatId } });
  }

  async markJobCompleted(chatId: string, userId: string): Promise<Message> {
    const chat = await this.validateChatAccess(chatId, userId);
    if (!chat) throw new ForbiddenException('Not authorized to access this chat');
    
    if (chat.creatorId !== userId) {
      throw new ForbiddenException('Only the job creator can mark job as completed');
    }

    return this.sendMessage(chatId, userId, 'Job has been completed', MessageType.SYSTEM, undefined, undefined, 'job_completed');
  }




}