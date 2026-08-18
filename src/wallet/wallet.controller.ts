import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WalletService } from './wallet.service';
import {
  InitializeEscrowDto,
  VerifyEscrowDto,
  ReleaseEscrowDto,
  CreateWithdrawalDto,
  UpdateWithdrawalDto,
  UpdatePayoutSettingsDto,
} from './dto/wallet.dto';

@Controller()
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('wallet/me')
  @UseGuards(JwtAuthGuard)
  async getMyWallet(@Req() req) {
    const data = await this.walletService.getMyWallet(req.user.id);
    return { status: true, message: 'Wallet fetched', data };
  }

  @Get('wallet/payout-settings')
  @UseGuards(JwtAuthGuard)
  async getPayoutSettings(@Req() req) {
    const data = await this.walletService.getPayoutSettings(req.user.id);
    return { status: true, message: 'Payout settings fetched', data };
  }

  @Put('wallet/payout-settings')
  @UseGuards(JwtAuthGuard)
  async updatePayoutSettings(@Req() req, @Body() dto: UpdatePayoutSettingsDto) {
    const data = await this.walletService.updatePayoutSettings(req.user.id, dto);
    return { status: true, message: 'Payout settings saved', data };
  }

  @Post('wallet/withdrawals')
  @UseGuards(JwtAuthGuard)
  async requestWithdrawal(@Req() req, @Body() dto: CreateWithdrawalDto) {
    const data = await this.walletService.requestWithdrawal(req.user.id, dto);
    return { status: true, message: 'Withdrawal request submitted', data };
  }

  @Get('wallet/withdrawals')
  @UseGuards(JwtAuthGuard)
  async listWithdrawals(@Req() req) {
    const data = await this.walletService.listWithdrawals(req.user.id);
    return { status: true, message: 'Withdrawals fetched', data };
  }

  @Patch('wallet/withdrawals/:id')
  @UseGuards(JwtAuthGuard)
  async updateWithdrawal(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: UpdateWithdrawalDto,
  ) {
    // For now any authenticated user can process — tighten with RoleGuard(admin) later
    const data = await this.walletService.updateWithdrawal(req.user.id, id, dto);
    return { status: true, message: 'Withdrawal updated', data };
  }

  @Get('marketplace/chat/:chatId/escrow')
  @UseGuards(JwtAuthGuard)
  async getChatEscrow(@Param('chatId') chatId: string, @Req() req) {
    const data = await this.walletService.getChatEscrow(chatId, req.user.id);
    return { status: true, message: 'Escrow fetched', data };
  }

  @Post('marketplace/chat/:chatId/escrow/initialize')
  @UseGuards(JwtAuthGuard)
  async initializeEscrow(
    @Param('chatId') chatId: string,
    @Req() req,
    @Body() dto: InitializeEscrowDto,
  ) {
    const data = await this.walletService.initializeEscrow(chatId, req.user.id, dto);
    return { status: true, message: 'Escrow payment initialized', data };
  }

  @Post('marketplace/chat/:chatId/escrow/verify')
  @UseGuards(JwtAuthGuard)
  async verifyEscrow(
    @Param('chatId') chatId: string,
    @Req() req,
    @Body() dto: VerifyEscrowDto,
  ) {
    const data = await this.walletService.verifyEscrowPayment(
      chatId,
      req.user.id,
      dto.reference,
    );
    return { status: true, message: 'Escrow funded', data };
  }

  @Post('marketplace/chat/:chatId/escrow/release')
  @UseGuards(JwtAuthGuard)
  async releaseEscrow(
    @Param('chatId') chatId: string,
    @Req() req,
    @Body() dto: ReleaseEscrowDto,
  ) {
    const data = await this.walletService.releaseEscrow(chatId, req.user.id, dto);
    return { status: true, message: 'Funds released to maker wallet', data };
  }

  @Post('wallet/webhook/paystack')
  async paystackWebhook(@Body() body: any) {
    const data = await this.walletService.handlePaystackWebhook(body);
    return { status: true, data };
  }
}
