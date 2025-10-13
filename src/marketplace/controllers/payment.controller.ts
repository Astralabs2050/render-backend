import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PaystackService } from '../../common/services/paystack.service';

@Controller('marketplace/payment')
@UseGuards(JwtAuthGuard)
export class PaymentController {
  constructor(private readonly paystackService: PaystackService) {}

  @Post('initialize')
  async initializePayment(
    @Body() body: { amount: number; chatId: string; metadata?: any },
    @Req() req
  ) {
    const paymentData = await this.paystackService.initializeTransaction(
      req.user.email,
      body.amount,
      {
        ...body.metadata,
        chatId: body.chatId,
        userId: req.user.id,
      }
    );

    return {
      status: true,
      message: 'Payment initialized',
      data: {
        authorizationUrl: paymentData.authorization_url,
        reference: paymentData.reference,
        accessCode: paymentData.access_code,
      },
    };
  }

  @Post('verify')
  async verifyPayment(@Body() body: { reference: string }) {
    const verification = await this.paystackService.verifyTransaction(body.reference);

    return {
      status: true,
      message: 'Payment verified',
      data: verification,
    };
  }
}
