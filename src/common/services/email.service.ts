import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sgMail from '@sendgrid/mail';
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  constructor(private configService: ConfigService) {
    sgMail.setApiKey(this.configService.get('SENDGRID_API_KEY'));
  }
  async sendOtpEmail(email: string, otp: string): Promise<boolean> {
    try {
      const msg = {
        to: email,
        from: this.configService.get('SENDGRID_FROM_EMAIL'),
        subject: 'Your Verification Code',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Verification Code</h2>
            <p>Your verification code is:</p>
            <div style="background-color: #f4f4f4; padding: 10px; font-size: 24px; font-weight: bold; text-align: center; letter-spacing: 5px;">
              ${otp}
            </div>
            <p>This code will expire in 15 minutes.</p>
            <p>If you didn't request this code, please ignore this email.</p>
          </div>
        `,
      };
      await sgMail.send(msg);
      this.logger.log(`OTP email sent to ${email}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send OTP email to ${email}: ${error.message}`);
      if (this.configService.get('NODE_ENV') === 'development') {
        this.logger.warn(`DEV MODE: Email failed, but OTP is logged above`);
      }
      return false;
    }
  }
}