import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    // Initialize SMTP transporter for Office365
    const port = parseInt(this.configService.get('SMTP_PORT') || '587');
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('SMTP_HOST'),
      port: port,
      secure: port === 465, // true for 465, false for other ports
      requireTLS: port === 587, // Use STARTTLS for port 587
      auth: {
        user: this.configService.get('SMTP_USER'),
        pass: this.configService.get('SMTP_PASSWORD'),
      },
      tls: {
        ciphers: 'SSLv3',
        rejectUnauthorized: false,
      },
    });
  }

  async sendOtpEmail(email: string, otp: string): Promise<boolean> {
    try {
      const mailOptions = {
        from: this.configService.get('SMTP_FROM_EMAIL') || this.configService.get('SMTP_USER'),
        to: email,
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

      await this.transporter.sendMail(mailOptions);
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