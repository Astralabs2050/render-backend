import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { UserWallet } from './entities/user-wallet.entity';
import {
  WalletTransaction,
  WalletTransactionType,
} from './entities/wallet-transaction.entity';
import {
  ProjectEscrow,
  ProjectEscrowStatus,
  ProjectPaymentType,
  EscrowMilestoneItem,
  MilestoneItemStatus,
} from './entities/project-escrow.entity';
import {
  WithdrawalRequest,
  WithdrawalStatus,
} from './entities/withdrawal-request.entity';
import { MarketplaceChat } from '../marketplace/entities/chat.entity';
import { User } from '../users/entities/user.entity';
import { PaystackService } from '../common/services/paystack.service';
import {
  InitializeEscrowDto,
  CreateWithdrawalDto,
  UpdateWithdrawalDto,
  UpdatePayoutSettingsDto,
} from './dto/wallet.dto';

const DEFAULT_MILESTONES = [
  { label: 'Measurements & Details Sent', percent: 30 },
  { label: 'Outfit Picture Confirmed', percent: 30 },
  { label: 'Outfit Received', percent: 40 },
];

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    @InjectRepository(UserWallet)
    private walletRepository: Repository<UserWallet>,
    @InjectRepository(WalletTransaction)
    private transactionRepository: Repository<WalletTransaction>,
    @InjectRepository(ProjectEscrow)
    private escrowRepository: Repository<ProjectEscrow>,
    @InjectRepository(EscrowMilestoneItem)
    private milestoneRepository: Repository<EscrowMilestoneItem>,
    @InjectRepository(WithdrawalRequest)
    private withdrawalRepository: Repository<WithdrawalRequest>,
    @InjectRepository(MarketplaceChat)
    private chatRepository: Repository<MarketplaceChat>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private paystackService: PaystackService,
    private dataSource: DataSource,
  ) {}

  async getOrCreateWallet(userId: string): Promise<UserWallet> {
    let wallet = await this.walletRepository.findOne({ where: { userId } });
    if (!wallet) {
      wallet = this.walletRepository.create({
        userId,
        availableBalance: 0,
        pendingWithdrawal: 0,
        currency: 'NGN',
      });
      wallet = await this.walletRepository.save(wallet);
    }
    return wallet;
  }

  async getMyWallet(userId: string) {
    const wallet = await this.getOrCreateWallet(userId);
    const transactions = await this.transactionRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
    return {
      availableBalance: Number(wallet.availableBalance),
      pendingWithdrawal: Number(wallet.pendingWithdrawal),
      currency: wallet.currency,
      transactions,
    };
  }

  async getChatEscrow(chatId: string, userId: string) {
    const chat = await this.chatRepository.findOne({ where: { id: chatId } });
    if (!chat) throw new NotFoundException('Chat not found');
    if (chat.creatorId !== userId && chat.makerId !== userId) {
      throw new ForbiddenException('Not authorized');
    }

    const escrowRows = await this.escrowRepository.find({
      where: { chatId },
      relations: ['milestones'],
      order: { createdAt: 'DESC' },
      take: 1,
    });
    const escrow = escrowRows[0] || null;

    const status = String(escrow?.status || chat.escrowStatus || 'none');
    const total = Number(chat.escrowAmount || escrow?.totalAmount || 0);
    const released = Number(chat.releasedAmount || escrow?.releasedAmount || 0);
    const isHeld = ['funded', 'partially_released', 'completed'].includes(status);
    const fundedAmount = Number(
      escrow?.fundedAmount || (isHeld ? total : 0),
    );
    // Unpaid / none chats have nothing held — remaining is 0 until Paystack funds.
    const remaining = isHeld ? Math.max(0, (fundedAmount || total) - released) : 0;

    return {
      chatId,
      escrowId: escrow?.id || chat.escrowId || null,
      status,
      paymentType: escrow?.paymentType || null,
      totalAmount: total,
      fundedAmount,
      releasedAmount: released,
      remainingBalance: remaining,
      currency: escrow?.currency || 'NGN',
      milestones: (escrow?.milestones || [])
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map((m) => ({
          id: m.id,
          label: m.label,
          percent: Number(m.percent),
          amount: Number(m.amount),
          status: m.status,
          releasedAt: m.releasedAt,
          orderIndex: m.orderIndex,
        })),
    };
  }

  async initializeEscrow(chatId: string, brandId: string, dto: InitializeEscrowDto) {
    const chat = await this.chatRepository.findOne({
      where: { id: chatId },
      relations: ['creator', 'maker'],
    });
    if (!chat) throw new NotFoundException('Chat not found');
    if (chat.creatorId !== brandId) {
      throw new ForbiddenException('Only the brand can initialize escrow');
    }
    if (!chat.makerId) {
      throw new BadRequestException('Chat has no maker assigned');
    }

    const existing = await this.escrowRepository.findOne({
      where: { chatId, status: ProjectEscrowStatus.PENDING },
    });
    if (existing?.paystackReference) {
      // Allow re-init if still pending unpaid
      await this.escrowRepository.remove(existing);
    }

    const fundedExisting = await this.escrowRepository.findOne({
      where: [
        { chatId, status: ProjectEscrowStatus.FUNDED },
        { chatId, status: ProjectEscrowStatus.PARTIALLY_RELEASED },
        { chatId, status: ProjectEscrowStatus.COMPLETED },
      ],
    });
    if (fundedExisting) {
      throw new BadRequestException('Escrow already funded for this chat');
    }

    const brand = await this.userRepository.findOne({ where: { id: brandId } });
    if (!brand?.email) throw new BadRequestException('Brand email required for payment');

    const paymentType = dto.paymentType;
    let schedule = dto.milestones;
    if (paymentType === ProjectPaymentType.MILESTONE) {
      schedule = schedule?.length ? schedule : DEFAULT_MILESTONES;
      const sum = schedule.reduce((s, m) => s + Number(m.percent), 0);
      if (Math.abs(sum - 100) > 0.01) {
        throw new BadRequestException('Milestone percentages must sum to 100');
      }
    }

    const reference = `escrow_${chatId.replace(/-/g, '').slice(0, 12)}_${Date.now()}`;
    const paystack = await this.paystackService.initializeTransaction(
      brand.email,
      dto.amount,
      {
        type: 'project_escrow',
        chatId,
        brandId,
        makerId: chat.makerId,
        paymentType,
      },
      reference,
      dto.callbackUrl,
    );

    const paystackRef = paystack.reference || reference;

    const escrow = this.escrowRepository.create({
      chatId,
      brandId,
      makerId: chat.makerId,
      totalAmount: dto.amount,
      fundedAmount: 0,
      releasedAmount: 0,
      status: ProjectEscrowStatus.PENDING,
      paymentType,
      paystackReference: paystackRef,
      currency: 'NGN',
    });
    const saved = await this.escrowRepository.save(escrow);

    if (paymentType === ProjectPaymentType.MILESTONE && schedule) {
      const milestones = schedule.map((m, i) =>
        this.milestoneRepository.create({
          escrowId: saved.id,
          label: m.label,
          orderIndex: i,
          percent: m.percent,
          amount: Math.round((dto.amount * m.percent) / 100 * 100) / 100,
          status: MilestoneItemStatus.PENDING,
        }),
      );
      await this.milestoneRepository.save(milestones);
    }

    chat.escrowId = saved.id;
    chat.escrowAmount = dto.amount;
    chat.escrowStatus = 'pending';
    chat.releasedAmount = 0;
    await this.chatRepository.save(chat);

    return {
      escrowId: saved.id,
      authorizationUrl: paystack.authorization_url,
      accessCode: paystack.access_code,
      reference: paystackRef,
      amount: dto.amount,
      paymentType,
    };
  }

  async verifyEscrowPayment(chatId: string, userId: string, reference: string) {
    const escrow = await this.escrowRepository.findOne({
      where: { chatId, paystackReference: reference },
      relations: ['milestones'],
    });
    if (!escrow) {
      // Also try lookup by reference alone
      const byRef = await this.escrowRepository.findOne({
        where: { paystackReference: reference },
        relations: ['milestones'],
      });
      if (!byRef || byRef.chatId !== chatId) {
        throw new NotFoundException('Escrow payment not found');
      }
      return this.completeFunding(byRef, userId);
    }
    return this.completeFunding(escrow, userId);
  }

  async handlePaystackWebhook(payload: any) {
    if (payload?.event !== 'charge.success') return { handled: false };
    const data = payload.data;
    const reference = data?.reference;
    if (!reference) return { handled: false };

    const escrow = await this.escrowRepository.findOne({
      where: { paystackReference: reference },
      relations: ['milestones'],
    });
    if (!escrow) return { handled: false };
    if (escrow.status !== ProjectEscrowStatus.PENDING) {
      return { handled: true, alreadyFunded: true };
    }

    await this.completeFunding(escrow, escrow.brandId);
    return { handled: true };
  }

  private async completeFunding(escrow: ProjectEscrow, userId: string) {
    // Brand verify or webhook (passes brandId)
    if (userId !== escrow.brandId) {
      throw new ForbiddenException('Not authorized to verify this escrow');
    }

    const verified = await this.paystackService.verifyTransaction(escrow.paystackReference);
    if (verified.status !== 'success') {
      throw new BadRequestException('Payment not successful');
    }

    const paidAmount = (verified.amount || 0) / 100;
    if (paidAmount + 0.01 < Number(escrow.totalAmount)) {
      throw new BadRequestException('Paid amount is less than escrow total');
    }

    if (escrow.status !== ProjectEscrowStatus.PENDING) {
      return this.getChatEscrow(escrow.chatId, escrow.brandId);
    }

    escrow.fundedAmount = Number(escrow.totalAmount);
    escrow.status = ProjectEscrowStatus.FUNDED;
    await this.escrowRepository.save(escrow);

    const chat = await this.chatRepository.findOne({ where: { id: escrow.chatId } });
    if (chat) {
      chat.escrowStatus = 'funded';
      chat.escrowAmount = Number(escrow.totalAmount);
      chat.releasedAmount = 0;
      await this.chatRepository.save(chat);
    }

    this.logger.log(`Escrow ${escrow.id} funded via Paystack ${escrow.paystackReference}`);
    return this.getChatEscrow(escrow.chatId, userId === escrow.makerId ? escrow.makerId : escrow.brandId);
  }

  async releaseEscrow(
    chatId: string,
    brandId: string,
    opts: { milestoneId?: string; amount?: number },
  ) {
    const rows = await this.escrowRepository.find({
      where: { chatId },
      relations: ['milestones'],
      order: { createdAt: 'DESC' },
      take: 1,
    });
    const escrow = rows[0];
    if (!escrow) throw new NotFoundException('Escrow not found');
    if (escrow.brandId !== brandId) {
      throw new ForbiddenException('Only the brand can release funds');
    }
    if (
      escrow.status !== ProjectEscrowStatus.FUNDED &&
      escrow.status !== ProjectEscrowStatus.PARTIALLY_RELEASED
    ) {
      throw new BadRequestException('Escrow must be funded before release');
    }

    return this.dataSource.transaction(async (manager) => {
      let releaseAmount = 0;
      let milestone: EscrowMilestoneItem | null = null;

      if (escrow.paymentType === ProjectPaymentType.MILESTONE) {
        const milestones = (escrow.milestones || []).sort(
          (a, b) => a.orderIndex - b.orderIndex,
        );
        if (opts.milestoneId) {
          milestone = milestones.find((m) => m.id === opts.milestoneId) || null;
        } else {
          milestone = milestones.find((m) => m.status === MilestoneItemStatus.PENDING) || null;
        }
        if (!milestone) {
          throw new BadRequestException('No pending milestone to release');
        }
        if (milestone.status === MilestoneItemStatus.RELEASED) {
          throw new BadRequestException('Milestone already released');
        }
        releaseAmount = Number(milestone.amount);
        milestone.status = MilestoneItemStatus.RELEASED;
        milestone.releasedAt = new Date();
        await manager.save(milestone);
      } else {
        const remaining =
          Number(escrow.fundedAmount) - Number(escrow.releasedAmount);
        releaseAmount = opts.amount != null ? Number(opts.amount) : remaining;
        if (releaseAmount <= 0 || releaseAmount > remaining + 0.001) {
          throw new BadRequestException('Invalid release amount');
        }
      }

      escrow.releasedAmount = Number(escrow.releasedAmount) + releaseAmount;
      if (Number(escrow.releasedAmount) >= Number(escrow.totalAmount) - 0.01) {
        escrow.status = ProjectEscrowStatus.COMPLETED;
        escrow.releasedAmount = Number(escrow.totalAmount);
      } else {
        escrow.status = ProjectEscrowStatus.PARTIALLY_RELEASED;
      }
      await manager.save(escrow);

      const chat = await manager.findOne(MarketplaceChat, {
        where: { id: chatId },
      });
      if (chat) {
        chat.releasedAmount = Number(escrow.releasedAmount);
        chat.escrowStatus =
          escrow.status === ProjectEscrowStatus.COMPLETED ? 'completed' : 'funded';
        await manager.save(chat);
      }

      // Credit maker available balance
      let wallet = await manager.findOne(UserWallet, {
        where: { userId: escrow.makerId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!wallet) {
        wallet = manager.create(UserWallet, {
          userId: escrow.makerId,
          availableBalance: 0,
          pendingWithdrawal: 0,
          currency: 'NGN',
        });
        wallet = await manager.save(wallet);
        wallet = await manager.findOne(UserWallet, {
          where: { userId: escrow.makerId },
          lock: { mode: 'pessimistic_write' },
        });
      }

      const before = Number(wallet.availableBalance);
      const after = before + releaseAmount;
      wallet.availableBalance = after;
      await manager.save(wallet);

      const tx = manager.create(WalletTransaction, {
        userId: escrow.makerId,
        type: WalletTransactionType.RELEASE,
        amount: releaseAmount,
        balanceBefore: before,
        balanceAfter: after,
        description: milestone
          ? `Milestone released: ${milestone.label}`
          : 'One-time escrow release',
        chatId,
        escrowId: escrow.id,
        paystackReference: escrow.paystackReference,
        metadata: { milestoneId: milestone?.id },
      });
      await manager.save(tx);

      this.logger.log(
        `Released ${releaseAmount} to maker ${escrow.makerId} for chat ${chatId}`,
      );

      return {
        releasedAmount: releaseAmount,
        escrowStatus: escrow.status,
        makerAvailableBalance: after,
        milestoneId: milestone?.id || null,
        milestoneLabel: milestone?.label || null,
        milestoneIndex: milestone?.orderIndex ?? null,
      };
    });
  }

  async getPayoutSettings(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    return {
      bankName: user.bankName || null,
      accountNumber: user.accountNumber || null,
      accountName: user.accountName || null,
      configured: !!(user.bankName && user.accountNumber && user.accountName),
    };
  }

  async updatePayoutSettings(userId: string, dto: UpdatePayoutSettingsDto) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    user.bankName = dto.bankName.trim();
    user.accountNumber = dto.accountNumber.trim();
    user.accountName = dto.accountName.trim();
    await this.userRepository.save(user);
    return this.getPayoutSettings(userId);
  }

  async requestWithdrawal(userId: string, dto: CreateWithdrawalDto) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const bankName = (dto.bankName || user.bankName || '').trim();
    const accountNumber = (dto.accountNumber || user.accountNumber || '').trim();
    const accountName = (dto.accountName || user.accountName || '').trim();

    if (!bankName || !accountNumber || !accountName) {
      throw new BadRequestException(
        'Save your bank details in Payment Settings before requesting a withdrawal',
      );
    }

    return this.dataSource.transaction(async (manager) => {
      let wallet = await manager.findOne(UserWallet, {
        where: { userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!wallet) {
        throw new BadRequestException('Wallet not found');
      }
      const available = Number(wallet.availableBalance);
      if (dto.amount > available) {
        throw new BadRequestException('Insufficient available balance');
      }

      const before = available;
      const after = before - dto.amount;
      wallet.availableBalance = after;
      wallet.pendingWithdrawal = Number(wallet.pendingWithdrawal) + dto.amount;
      await manager.save(wallet);

      const request = manager.create(WithdrawalRequest, {
        userId,
        amount: dto.amount,
        bankName,
        accountNumber,
        accountName,
        status: WithdrawalStatus.PENDING,
      });
      const saved = await manager.save(request);

      const tx = manager.create(WalletTransaction, {
        userId,
        type: WalletTransactionType.WITHDRAWAL,
        amount: -dto.amount,
        balanceBefore: before,
        balanceAfter: after,
        description: `Withdrawal request to ${bankName} (${accountNumber})`,
        metadata: { withdrawalRequestId: saved.id },
      });
      await manager.save(tx);

      return saved;
    });
  }

  async listWithdrawals(userId: string) {
    return this.withdrawalRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async updateWithdrawal(
    adminId: string,
    withdrawalId: string,
    dto: UpdateWithdrawalDto,
  ) {
    const request = await this.withdrawalRepository.findOne({
      where: { id: withdrawalId },
    });
    if (!request) throw new NotFoundException('Withdrawal request not found');
    if (request.status !== WithdrawalStatus.PENDING) {
      throw new BadRequestException('Withdrawal already processed');
    }

    return this.dataSource.transaction(async (manager) => {
      const wallet = await manager.findOne(UserWallet, {
        where: { userId: request.userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!wallet) throw new NotFoundException('Wallet not found');

      if (dto.status === WithdrawalStatus.PAID) {
        wallet.pendingWithdrawal = Math.max(
          0,
          Number(wallet.pendingWithdrawal) - Number(request.amount),
        );
        await manager.save(wallet);
        request.status = WithdrawalStatus.PAID;
        request.processedAt = new Date();
        request.adminNote = dto.adminNote || `Paid by admin ${adminId}`;
      } else if (dto.status === WithdrawalStatus.REJECTED) {
        const before = Number(wallet.availableBalance);
        const after = before + Number(request.amount);
        wallet.availableBalance = after;
        wallet.pendingWithdrawal = Math.max(
          0,
          Number(wallet.pendingWithdrawal) - Number(request.amount),
        );
        await manager.save(wallet);

        const tx = manager.create(WalletTransaction, {
          userId: request.userId,
          type: WalletTransactionType.CREDIT,
          amount: Number(request.amount),
          balanceBefore: before,
          balanceAfter: after,
          description: 'Withdrawal rejected — funds returned',
          metadata: { withdrawalRequestId: request.id, adminId },
        });
        await manager.save(tx);

        request.status = WithdrawalStatus.REJECTED;
        request.processedAt = new Date();
        request.adminNote = dto.adminNote || `Rejected by admin ${adminId}`;
      } else {
        throw new BadRequestException('Invalid status');
      }

      return manager.save(request);
    });
  }
}
