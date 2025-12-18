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

  async sendNotificationEmail(
    email: string,
    title: string,
    message: string,
    actionUrl?: string,
  ): Promise<boolean> {
    try {
      const appUrl = this.configService.get('APP_URL') || 'http://localhost:3000';
      const fullActionUrl = actionUrl ? `${appUrl}${actionUrl}` : null;

      const mailOptions = {
        from: this.configService.get('SMTP_FROM_EMAIL') || this.configService.get('SMTP_USER'),
        to: email,
        subject: title,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333;">${title}</h2>
            <p style="color: #666; font-size: 16px; line-height: 1.5;">${message}</p>
            ${fullActionUrl ? `
              <div style="margin-top: 20px;">
                <a href="${fullActionUrl}" 
                   style="background-color: #007bff; color: white; padding: 12px 24px; 
                          text-decoration: none; border-radius: 4px; display: inline-block;">
                  View Details
                </a>
              </div>
            ` : ''}
            <hr style="margin-top: 30px; border: none; border-top: 1px solid #eee;" />
            <p style="color: #999; font-size: 12px;">
              This is an automated notification. Please do not reply to this email.
            </p>
          </div>
        `,
      };

      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Notification email sent to ${email}: ${title}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send notification email to ${email}: ${error.message}`);
      return false;
    }
  }
}