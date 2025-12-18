import { Injectable, Logger, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { CreditTransaction, TransactionType, AIActionType } from '../entities/credit-transaction.entity';
import { PaystackService } from '../../common/services/paystack.service';
import { NotificationService } from '../../notifications/services/notification.service';

export interface CreditPackage {
  id: string;
  price: number;
  credits: number;
  currency: string;
  label: string;
}

export const CREDIT_PACKAGES: CreditPackage[] = [
  { id: 'basic', price: 3, credits: 5, currency: 'USD', label: '$3 → 5 credits' },
  { id: 'standard', price: 5, credits: 10, currency: 'USD', label: '$5 → 10 credits' },
  { id: 'premium', price: 10, credits: 15, currency: 'USD', label: '$10 → 15 credits' },
];

export const CREDIT_COSTS: Record<AIActionType, number> = {
  [AIActionType.DESIGN_GENERATION]: 1,
  [AIActionType.DESIGN_VARIATION]: 1,
  [AIActionType.DESIGN_REFINEMENT]: 1,
  [AIActionType.METADATA_EXTRACTION]: 1,
};

const LOW_CREDIT_THRESHOLD = 2;

@Injectable()
export class CreditService {
  private readonly logger = new Logger(CreditService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(CreditTransaction)
    private transactionRepository: Repository<CreditTransaction>,
    private paystackService: PaystackService,
    private dataSource: DataSource,
    @Inject(forwardRef(() => NotificationService))
    private notificationService: NotificationService,
  ) {}

  async getBalance(userId: string): Promise<number> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    return user?.creditBalance ?? 0;
  }

  async getPackages(): Promise<CreditPackage[]> {
    return CREDIT_PACKAGES;
  }

  async hasEnoughCredits(userId: string, actionType: AIActionType): Promise<boolean> {
    const balance = await this.getBalance(userId);
    const cost = CREDIT_COSTS[actionType] || 1;
    return balance >= cost;
  }

  async deductCredits(
    userId: string,
    actionType: AIActionType,
    chatId?: string,
    metadata?: Record<string, any>,
  ): Promise<{ success: boolean; newBalance: number; cost: number }> {
    const cost = CREDIT_COSTS[actionType] || 1;

    return await this.dataSource.transaction(async (manager) => {
      const user = await manager.findOne(User, { 
        where: { id: userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!user) {
        throw new BadRequestException('User not found');
      }

      if (user.creditBalance < cost) {
        throw new BadRequestException('Insufficient credits');
      }

      const balanceBefore = user.creditBalance;
      const balanceAfter = balanceBefore - cost;

      user.creditBalance = balanceAfter;
      await manager.save(user);

      const transaction = manager.create(CreditTransaction, {
        userId,
        type: TransactionType.USAGE,
        amount: -cost,
        balanceBefore,
        balanceAfter,
        description: `AI action: ${actionType}`,
        aiActionType: actionType,
        chatId,
        metadata,
      });
      await manager.save(transaction);

      this.logger.log(`Deducted ${cost} credits from user ${userId}. Balance: ${balanceAfter}`);

      // Send notifications for low/zero credits
      if (balanceAfter === 0) {
        this.notificationService.notifyCreditsFinished(userId).catch(err => 
          this.logger.error(`Failed to send credits finished notification: ${err.message}`)
        );
      } else if (balanceAfter <= LOW_CREDIT_THRESHOLD && balanceBefore > LOW_CREDIT_THRESHOLD) {
        this.notificationService.notifyCreditsLow(userId, balanceAfter).catch(err =>
          this.logger.error(`Failed to send credits low notification: ${err.message}`)
        );
      }

      return { success: true, newBalance: balanceAfter, cost };
    });
  }

  async refundCredits(
    userId: string,
    amount: number,
    reason: string,
    chatId?: string,
  ): Promise<{ success: boolean; newBalance: number }> {
    return await this.dataSource.transaction(async (manager) => {
      const user = await manager.findOne(User, {
        where: { id: userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!user) {
        throw new BadRequestException('User not found');
      }

      const balanceBefore = user.creditBalance;
      const balanceAfter = balanceBefore + amount;

      user.creditBalance = balanceAfter;
      await manager.save(user);

      const transaction = manager.create(CreditTransaction, {
        userId,
        type: TransactionType.REFUND,
        amount,
        balanceBefore,
        balanceAfter,
        description: `Refund: ${reason}`,
        chatId,
      });
      await manager.save(transaction);

      this.logger.log(`Refunded ${amount} credits to user ${userId}. Balance: ${balanceAfter}`);

      return { success: true, newBalance: balanceAfter };
    });
  }

  async initiatePurchase(
    userId: string,
    packageId: string,
  ): Promise<{ authorizationUrl: string; reference: string; accessCode: string }> {
    const pkg = CREDIT_PACKAGES.find((p) => p.id === packageId);
    if (!pkg) {
      throw new BadRequestException('Invalid package');
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const result = await this.paystackService.initializeTransaction(
      user.email,
      pkg.price,
      {
        userId,
        packageId,
        credits: pkg.credits,
        type: 'credit_purchase',
      },
    );

    return {
      authorizationUrl: result.authorization_url,
      reference: result.reference,
      accessCode: result.access_code,
    };
  }

  async completePurchase(reference: string): Promise<{ success: boolean; credits: number; newBalance: number }> {
    // Check if already processed (idempotency)
    const existingTransaction = await this.transactionRepository.findOne({
      where: { paymentReference: reference },
    });

    if (existingTransaction) {
      this.logger.warn(`Payment reference ${reference} already processed`);
      const user = await this.userRepository.findOne({ where: { id: existingTransaction.userId } });
      return { success: true, credits: 0, newBalance: user?.creditBalance ?? 0 };
    }

    const verification = await this.paystackService.verifyTransaction(reference);

    if (verification.status !== 'success') {
      throw new BadRequestException('Payment verification failed');
    }

    const { userId, packageId, credits } = verification.metadata;

    return await this.dataSource.transaction(async (manager) => {
      const user = await manager.findOne(User, {
        where: { id: userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!user) {
        throw new BadRequestException('User not found');
      }

      const balanceBefore = user.creditBalance;
      const balanceAfter = balanceBefore + credits;

      user.creditBalance = balanceAfter;
      await manager.save(user);

      const pkg = CREDIT_PACKAGES.find((p) => p.id === packageId);
      const transaction = manager.create(CreditTransaction, {
        userId,
        type: TransactionType.PURCHASE,
        amount: credits,
        balanceBefore,
        balanceAfter,
        description: `Purchased ${pkg?.label || packageId}`,
        paymentReference: reference,
        metadata: { packageId, amountPaid: verification.amount / 100 },
      });
      await manager.save(transaction);

      this.logger.log(`Added ${credits} credits to user ${userId}. Balance: ${balanceAfter}`);

      // Send notification for credit purchase
      this.notificationService.notifyCreditPurchase(userId, credits, balanceAfter).catch(err =>
        this.logger.error(`Failed to send credit purchase notification: ${err.message}`)
      );

      return { success: true, credits, newBalance: balanceAfter };
    });
  }

  async handleWebhook(payload: any): Promise<{ success: boolean }> {
    const { event, data } = payload;

    if (event !== 'charge.success') {
      return { success: true };
    }

    const reference = data.reference;
    const metadata = data.metadata;

    if (metadata?.type !== 'credit_purchase') {
      return { success: true };
    }

    try {
      await this.completePurchase(reference);
      return { success: true };
    } catch (error) {
      this.logger.error(`Webhook processing failed: ${error.message}`);
      throw error;
    }
  }

  async addBonusCredits(
    userId: string,
    amount: number,
    reason: string,
  ): Promise<{ success: boolean; newBalance: number }> {
    return await this.dataSource.transaction(async (manager) => {
      const user = await manager.findOne(User, {
        where: { id: userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!user) {
        throw new BadRequestException('User not found');
      }

      const balanceBefore = user.creditBalance;
      const balanceAfter = balanceBefore + amount;

      user.creditBalance = balanceAfter;
      await manager.save(user);

      const transaction = manager.create(CreditTransaction, {
        userId,
        type: TransactionType.BONUS,
        amount,
        balanceBefore,
        balanceAfter,
        description: `Bonus: ${reason}`,
      });
      await manager.save(transaction);

      this.logger.log(`Added ${amount} bonus credits to user ${userId}. Balance: ${balanceAfter}`);

      return { success: true, newBalance: balanceAfter };
    });
  }

  async getTransactionHistory(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ transactions: CreditTransaction[]; total: number; page: number; totalPages: number }> {
    const [transactions, total] = await this.transactionRepository.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      transactions,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }
}
