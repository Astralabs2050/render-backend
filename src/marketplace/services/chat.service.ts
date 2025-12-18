import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Chat } from '../entities/chat.entity';
import { Message, MessageType } from '../entities/message.entity';
import { Job } from '../entities/job.entity';
import { UserDeliveryDetails } from '../entities/user-delivery-details.entity';
import { UserMeasurements } from '../entities/user-measurements.entity';
import { DeliveryDetailsDto, MeasurementsDto, ApplicationAcceptedDto } from '../dto/delivery-measurements.dto';
import { NFT } from '../../web3/entities/nft.entity';
import { NotificationService as AppNotificationService } from '../../notifications/services/notification.service';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Chat)
    private chatRepository: Repository<Chat>,
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    @InjectRepository(Job)
    private jobRepository: Repository<Job>,
    @InjectRepository(UserDeliveryDetails)
    private userDeliveryDetailsRepository: Repository<UserDeliveryDetails>,
    @InjectRepository(UserMeasurements)
    private userMeasurementsRepository: Repository<UserMeasurements>,
    @InjectRepository(NFT)
    private nftRepository: Repository<NFT>,
    @Inject(forwardRef(() => AppNotificationService))
    private appNotificationService: AppNotificationService,
  ) {}

  async createChat(jobId: string | undefined, creatorId: string, makerId: string, designId?: string): Promise<Chat> {
    // Validate job exists if jobId provided
    if (jobId) {
      const job = await this.jobRepository.findOne({ where: { id: jobId } });
      if (!job) throw new NotFoundException('Job not found');
    }

    // Validate design exists if designId provided
    if (designId) {
      const design = await this.nftRepository.findOne({
        where: { id: designId },
      });

      if (!design) {
        throw new NotFoundException('Design not found');
      }
    }

    // First, check if ANY chat exists between these two users (regardless of job/design)
    // This prevents creating duplicate chats when users interact from different contexts
    const existingGeneralChat = await this.chatRepository.findOne({
      where: [
        { creatorId, makerId },
        { creatorId: makerId, makerId: creatorId } // Check reversed roles too
      ]
    });

    if (existingGeneralChat) {
      // Update the existing chat with the new context if needed
      if (jobId && !existingGeneralChat.jobId) {
        existingGeneralChat.jobId = jobId;
      }
      if (designId && !existingGeneralChat.designId) {
        existingGeneralChat.designId = designId;
      }
      existingGeneralChat.lastMessageAt = new Date();
      return this.chatRepository.save(existingGeneralChat);
    }

    // Create new chat only if no previous conversation exists
    const chat = this.chatRepository.create({
      jobId,
      creatorId,
      makerId,
      designId,
      lastMessageAt: new Date(),
    });
    return this.chatRepository.save(chat);
  }

  async createDirectChat(userId: string, recipientId: string): Promise<Chat> {
    const existingChat = await this.chatRepository.findOne({
      where: [
        { creatorId: userId, makerId: recipientId, jobId: null },
        { creatorId: recipientId, makerId: userId, jobId: null }
      ]
    });
    if (existingChat) return existingChat;

    const chat = this.chatRepository.create({
      creatorId: userId,
      makerId: recipientId,
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
    attachments?: string[],
    applicationData?: ApplicationAcceptedDto,
    amount?: number,
    designId?: string,
    price?: number,
    title?: string
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
          applicationData: applicationData || null,
          designId: designId || null,
          price: price || null,
          title: title || null,
          amount: amount || null,
        });

        const savedMessage = await manager.save(message);

        // Save delivery details and measurements to user-scoped tables only
        if (deliveryDetails) {
          const userExisting = await manager.findOne(UserDeliveryDetails, { where: { userId: senderId } });
          if (userExisting) {
            await manager.update(UserDeliveryDetails, { userId: senderId }, deliveryDetails);
          } else {
            await manager.save(UserDeliveryDetails, { userId: senderId, ...deliveryDetails });
          }
        }

        if (measurements) {
          const userExisting = await manager.findOne(UserMeasurements, { where: { userId: senderId } });
          if (userExisting) {
            await manager.update(UserMeasurements, { userId: senderId }, measurements);
          } else {
            await manager.save(UserMeasurements, { userId: senderId, ...measurements });
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

        // Send notification to the recipient
        const recipientId = chat.creatorId === senderId ? chat.makerId : chat.creatorId;
        const senderName = messageWithSender.sender?.fullName || 'Someone';
        
        // Don't notify for system messages
        if (type !== MessageType.SYSTEM) {
          this.appNotificationService.notifyNewMessage(
            recipientId,
            senderName,
            chatId,
            content,
          ).catch(err => console.error('Failed to send message notification:', err.message));
        }

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
        job: chat.job || null,
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

  async createEscrow(
    chatId: string,
    amount: number,
    userId: string,
    tokenId?: string,
    contractAddress?: string
  ): Promise<Chat> {
    const chat = await this.chatRepository.findOne({
      where: { id: chatId },
      relations: ['job']
    });
    if (!chat) throw new NotFoundException('Chat not found');

    if (chat.creatorId !== userId) {
      throw new ForbiddenException('Only the chat initiator can create escrow');
    }

    chat.escrowAmount = amount;
    chat.escrowStatus = 'pending';
    chat.releasedAmount = 0; // Initialize released amount to 0

    if (tokenId) {
      chat.escrowTokenId = tokenId;
    }
    if (contractAddress) {
      chat.escrowContractAddress = contractAddress;
    }

    return this.chatRepository.save(chat);
  }

  async fundEscrow(chatId: string, userId: string): Promise<Chat> {
    const chat = await this.chatRepository.findOne({ where: { id: chatId } });
    if (!chat) throw new NotFoundException('Chat not found');

    if (chat.creatorId !== userId) {
      throw new ForbiddenException('Only the chat initiator can fund escrow');
    }

    if (!chat.escrowAmount || Number(chat.escrowAmount) <= 0) {
      throw new BadRequestException('Escrow must be created with a valid amount before funding');
    }

    if (chat.escrowStatus === 'funded') {
      throw new BadRequestException('Escrow is already funded');
    }

    if (chat.escrowStatus === 'completed') {
      throw new BadRequestException('Cannot fund a completed escrow');
    }

    if (chat.escrowStatus === 'disputed') {
      throw new BadRequestException('Cannot fund a disputed escrow');
    }

    chat.escrowStatus = 'funded';
    return this.chatRepository.save(chat);
  }

  async releaseEscrow(chatId: string, userId: string, amount: number): Promise<Chat> {
    const chat = await this.chatRepository.findOne({ where: { id: chatId } });
    if (!chat) throw new NotFoundException('Chat not found');

    if (chat.creatorId !== userId) {
      throw new ForbiddenException('Only the chat initiator can release escrow');
    }

    if (chat.escrowStatus !== 'funded') {
      throw new BadRequestException('Escrow must be funded before release');
    }

    // Validate amount
    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    const currentReleased = Number(chat.releasedAmount || 0);
    const totalAmount = Number(chat.escrowAmount);
    const remainingBalance = totalAmount - currentReleased;

    if (amount > remainingBalance) {
      throw new BadRequestException(
        `Amount exceeds remaining balance. Remaining: ${remainingBalance}, Requested: ${amount}`
      );
    }

    // Update released amount
    chat.releasedAmount = currentReleased + amount;

    // Mark as completed if full amount has been released
    if (chat.releasedAmount >= totalAmount) {
      chat.escrowStatus = 'completed';
    }

    return this.chatRepository.save(chat);
  }

  async getEscrowByTokenId(tokenId: string, userId: string): Promise<any> {
    const chat = await this.chatRepository.findOne({
      where: { escrowTokenId: tokenId },
      relations: ['job', 'creator', 'maker']
    });

    if (!chat) {
      throw new NotFoundException('Escrow not found with this tokenId');
    }

    // Verify the user has access to view this escrow (must be creator or maker)
    if (chat.creatorId !== userId && chat.makerId !== userId) {
      throw new ForbiddenException('Not authorized to view this escrow');
    }

    const blockchainDetails = {
      shopper: chat.creator?.walletAddress || '0x93f3afd4201677F98120AE74E9dc1410537365E6', // Creator's wallet
      maker: chat.maker?.walletAddress || '0x032a2E7a380E266b1338ACB2cCE54094d92E0A2C', // Maker's wallet
      remainingBalance: Number(chat.escrowAmount) * 0.9, // Mock: 90% remaining
      milestonesCompleted: 1, // Mock value - should come from blockchain
      milestoneCount: 4, // Mock value - should come from blockchain
    };

    return {
      id: chat.escrowId || chat.id, // Use escrowId if available, otherwise chat.id
      chatId: chat.id,
      jobId: chat.jobId,
      escrowAmount: Number(chat.escrowAmount),
      escrowStatus: chat.escrowStatus,
      tokenId: parseInt(chat.escrowTokenId) || 0, // Convert to number as per requirement
      creatorId: chat.creatorId,
      makerId: chat.makerId,
      blockchainDetails,
    };
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

  async getDeliveryAndMeasurements(chatId: string, userId: string): Promise<{ deliveryDetails: UserDeliveryDetails | null; measurements: UserMeasurements | null }> {
    const chat = await this.validateChatAccess(chatId, userId);
    if (!chat) throw new ForbiddenException('Not authorized to access this chat');

    // Fetch from user-scoped tables instead of chat-scoped
    const [deliveryDetails, measurements] = await Promise.all([
      this.userDeliveryDetailsRepository.findOne({ where: { userId } }),
      this.userMeasurementsRepository.findOne({ where: { userId } })
    ]);

    return { deliveryDetails, measurements };
  }

  async getDeliveryDetails(chatId: string, userId: string): Promise<UserDeliveryDetails | null> {
    const chat = await this.validateChatAccess(chatId, userId);
    if (!chat) throw new ForbiddenException('Not authorized to access this chat');

    // Fetch from user-scoped table instead of chat-scoped
    return this.userDeliveryDetailsRepository.findOne({ where: { userId } });
  }

  async getMeasurements(chatId: string, userId: string): Promise<UserMeasurements | null> {
    const chat = await this.validateChatAccess(chatId, userId);
    if (!chat) throw new ForbiddenException('Not authorized to access this chat');

    // Fetch from user-scoped table instead of chat-scoped
    return this.userMeasurementsRepository.findOne({ where: { userId } });
  }

  async markJobCompleted(chatId: string, userId: string): Promise<Message> {
    const chat = await this.validateChatAccess(chatId, userId);
    if (!chat) throw new ForbiddenException('Not authorized to access this chat');

    if (!chat.jobId) {
      throw new BadRequestException('This is a direct chat without a job');
    }

    if (chat.creatorId !== userId) {
      throw new ForbiddenException('Only the job creator can mark job as completed');
    }

    return this.sendMessage(chatId, userId, 'Job has been completed', MessageType.SYSTEM, undefined, undefined, 'job_completed');
  }

  async deleteMessage(chatId: string, messageId: string, userId: string): Promise<void> {
    // Verify user has access to the chat
    const chat = await this.validateChatAccess(chatId, userId);
    if (!chat) throw new ForbiddenException('Not authorized to access this chat');

    // Find the message
    const message = await this.messageRepository.findOne({
      where: { id: messageId, chatId }
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Only allow users to delete their own messages
    if (message.senderId !== userId) {
      throw new ForbiddenException('You can only delete your own messages');
    }

    // Delete the message
    await this.messageRepository.remove(message);
  }

  // User-scoped delivery details and measurements methods
  async getUserDeliveryAndMeasurements(userId: string): Promise<{ deliveryDetails: UserDeliveryDetails | null; measurements: UserMeasurements | null }> {
    const [deliveryDetails, measurements] = await Promise.all([
      this.userDeliveryDetailsRepository.findOne({ where: { userId } }),
      this.userMeasurementsRepository.findOne({ where: { userId } })
    ]);

    return { deliveryDetails, measurements };
  }

  // Escrow earnings analytics for makers
  async getEscrowEarnings(userId: string, page: number = 1, limit: number = 10): Promise<any> {
    // Calculate total earnings (sum of all released amounts where > 0)
    const totalEarningsResult = await this.chatRepository
      .createQueryBuilder('chat')
      .select('COALESCE(SUM(COALESCE(chat.releasedAmount, 0)), 0)', 'total')
      .where('chat.makerId = :userId', { userId })
      .andWhere('chat.releasedAmount > 0')
      .getRawOne();

    const totalEarnings = Number(totalEarningsResult?.total || 0);

    // Calculate pending earnings (funded escrows only: escrowAmount - releasedAmount)
    const pendingEarningsResult = await this.chatRepository
      .createQueryBuilder('chat')
      .select('COALESCE(SUM(COALESCE(chat.escrowAmount, 0) - COALESCE(chat.releasedAmount, 0)), 0)', 'pending')
      .where('chat.makerId = :userId', { userId })
      .andWhere('chat.escrowStatus = :status', { status: 'funded' })
      .andWhere('chat.escrowAmount > 0')
      .getRawOne();

    const pendingEarnings = Number(pendingEarningsResult?.pending || 0);

    // Count completed jobs (jobs where full escrow amount has been released)
    const completedJobsCount = await this.chatRepository
      .createQueryBuilder('chat')
      .where('chat.makerId = :userId', { userId })
      .andWhere('CAST(chat.releasedAmount AS DECIMAL) >= CAST(chat.escrowAmount AS DECIMAL)')
      .andWhere('chat.escrowAmount > 0')
      .getCount();

    // Get total count for pagination (include all escrows with activity)
    const totalActivities = await this.chatRepository
      .createQueryBuilder('chat')
      .where('chat.makerId = :userId', { userId })
      .andWhere('chat.escrowAmount IS NOT NULL')
      .andWhere('chat.escrowAmount > 0')
      .andWhere('(chat.escrowStatus IN (:...statuses) OR chat.releasedAmount > 0)', { statuses: ['funded', 'completed'] })
      .getCount();

    const totalPages = Math.max(1, Math.ceil(totalActivities / limit));
    const safePage = Math.min(page, totalPages);
    const skip = (safePage - 1) * limit;

    // Recent escrow activities (paginated, include all escrows with activity)
    const recentActivities = await this.chatRepository
      .createQueryBuilder('chat')
      .leftJoinAndSelect('chat.creator', 'creator')
      .leftJoinAndSelect('chat.job', 'job')
      .where('chat.makerId = :userId', { userId })
      .andWhere('chat.escrowAmount IS NOT NULL')
      .andWhere('chat.escrowAmount > 0')
      .andWhere('(chat.escrowStatus IN (:...statuses) OR chat.releasedAmount > 0)', { statuses: ['funded', 'completed'] })
      .orderBy('chat.lastMessageAt', 'DESC')
      .addOrderBy('chat.updatedAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getMany();

    return {
      totalEarnings,
      pendingEarnings,
      completedJobsCount,
      recentActivities: recentActivities.map(chat => {
        const escrowAmount = Number(chat.escrowAmount || 0);
        const releasedAmount = Number(chat.releasedAmount || 0);
        const remainingAmount = escrowAmount - releasedAmount;
        const actualStatus = releasedAmount >= escrowAmount ? 'completed' : chat.escrowStatus;

        return {
          timestamp: chat.lastMessageAt || chat.updatedAt,
          name: chat.creator?.fullName || 'Unknown Creator',
          location: chat.creator?.brandOrigin || chat.creator?.location || 'N/A',
          amount: releasedAmount,
          escrowAmount,
          remainingAmount,
          status: chat.escrowStatus,
          actualStatus,
          chatId: chat.id,
          jobTitle: chat.job?.title || 'N/A'
        };
      }),
      pagination: {
        page: safePage,
        limit,
        totalActivities,
        totalPages,
        hasNext: safePage < totalPages,
        hasPrevious: safePage > 1
      }
    };
  }

}