import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class PaystackService {
  private readonly logger = new Logger(PaystackService.name);
  private readonly baseUrl = 'https://api.paystack.co';

  constructor(private configService: ConfigService) {}

  private getSecretKey(): string {
    const fromConfig = this.configService.get<string>('PAYSTACK_SECRET_KEY');
    const fromEnv = process.env.PAYSTACK_SECRET_KEY;
    return (fromConfig || fromEnv || '').trim();
  }

  private assertConfigured(): string {
    const secretKey = this.getSecretKey();
    if (!secretKey || !secretKey.startsWith('sk_')) {
      throw new BadRequestException(
        'Paystack is not configured. Set a valid PAYSTACK_SECRET_KEY (sk_test_... or sk_live_...) in the backend environment and restart the server.',
      );
    }
    return secretKey;
  }

  async initializeTransaction(
    email: string,
    amount: number,
    metadata?: any,
    reference?: string,
    callbackUrl?: string,
  ): Promise<any> {
    const secretKey = this.assertConfigured();
    try {
      const payload: Record<string, any> = {
        email,
        amount: Math.round(amount * 100), // Convert to kobo
        metadata,
      };
      if (reference) payload.reference = reference;
      if (callbackUrl) payload.callback_url = callbackUrl;

      const response = await axios.post(
        `${this.baseUrl}/transaction/initialize`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${secretKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data.data;
    } catch (error) {
      this.logger.error(`Paystack initialization failed: ${error.message}`);
      if (error.response) {
        this.logger.error(`Paystack response: ${JSON.stringify(error.response.data)}`);
      }
      if (error.response?.status === 401) {
        throw new BadRequestException(
          'Paystack rejected the API key. Check PAYSTACK_SECRET_KEY in the backend .env file.',
        );
      }
      throw error;
    }
  }

  async verifyTransaction(reference: string): Promise<any> {
    this.logger.log(`Verifying transaction reference: ${reference}`);
    const secretKey = this.assertConfigured();
    try {
      const response = await axios.get(
        `${this.baseUrl}/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${secretKey}`,
          },
          timeout: 10000,
        }
      );

      return response.data.data;
    } catch (error) {
      this.logger.error(`Paystack verification failed: ${error.message}`);
      if (error.response) {
        this.logger.error(`Paystack response: ${JSON.stringify(error.response.data)}`);
      }
      if (error.response?.status === 401) {
        throw new BadRequestException(
          'Paystack rejected the API key. Check PAYSTACK_SECRET_KEY in the backend .env file.',
        );
      }
      throw error;
    }
  }
}
