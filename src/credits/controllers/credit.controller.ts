import { Controller, Get, Post, Body, Query, Headers, UseGuards, Req, RawBodyRequest } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CreditService } from '../services/credit.service';
import { PurchaseCreditsDto, VerifyPaymentDto } from '../dto/credit.dto';

@Controller('credits')
export class CreditController {
  constructor(private readonly creditService: CreditService) {}

  @Get('balance')
  @UseGuards(JwtAuthGuard)
  async getBalance(@Req() req) {
    const balance = await this.creditService.getBalance(req.user.id);
    return {
      status: true,
      message: 'Credit balance retrieved',
      data: { balance },
    };
  }

  @Get('packages')
  async getPackages() {
    const packages = await this.creditService.getPackages();
    return {
      status: true,
      message: 'Credit packages retrieved',
      data: { packages },
    };
  }

  @Post('purchase')
  @UseGuards(JwtAuthGuard)
  async initiatePurchase(@Req() req, @Body() dto: PurchaseCreditsDto) {
    const result = await this.creditService.initiatePurchase(req.user.id, dto.packageId);
    return {
      status: true,
      message: 'Payment initialized',
      data: result,
    };
  }

  @Post('verify')
  @UseGuards(JwtAuthGuard)
  async verifyPurchase(@Body() dto: VerifyPaymentDto) {
    const result = await this.creditService.completePurchase(dto.reference);
    return {
      status: true,
      message: 'Payment verified and credits added',
      data: result,
    };
  }

  @Post('webhook')
  async handleWebhook(
    @Body() payload: any,
    @Headers('x-paystack-signature') signature: string,
  ) {
    // TODO: Verify signature with PAYSTACK_SECRET_KEY
    const result = await this.creditService.handleWebhook(payload);
    return {
      status: true,
      message: 'Webhook processed',
      data: result,
    };
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  async getHistory(
    @Req() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.creditService.getTransactionHistory(
      req.user.id,
      parseInt(page || '1'),
      parseInt(limit || '20'),
    );
    return {
      status: true,
      message: 'Transaction history retrieved',
      data: result,
    };
  }
}
