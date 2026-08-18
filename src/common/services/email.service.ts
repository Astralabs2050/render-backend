import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resendApiKey: string | undefined;
  private readonly smtp: Transporter | null;
  private readonly fromEmail: string;

  constructor(private configService: ConfigService) {
    this.resendApiKey = this.configService.get<string>('RESEND_API_KEY');
    const rawFrom =
      this.configService.get<string>('RESEND_FROM_EMAIL') ||
      this.configService.get<string>('SMTP_FROM_EMAIL') ||
      this.configService.get<string>('SENDGRID_FROM_EMAIL') ||
      'onboarding@resend.dev';
    this.fromEmail = rawFrom.includes('<') ? rawFrom : `Astra <${rawFrom}>`;

    const smtpHost = this.configService.get<string>('SMTP_HOST');
    const smtpUser = this.configService.get<string>('SMTP_USER');
    const smtpPassword = this.configService.get<string>('SMTP_PASSWORD');
    const smtpPort = Number(this.configService.get('SMTP_PORT') || 587);
    this.smtp =
      smtpHost && smtpUser && smtpPassword
        ? nodemailer.createTransport({
            host: smtpHost,
            port: smtpPort,
            secure: smtpPort === 465,
            requireTLS: smtpPort === 587,
            auth: { user: smtpUser, pass: smtpPassword },
          })
        : null;
  }

  async sendOtpEmail(email: string, otp: string): Promise<boolean> {
    const subject = 'Your Astra verification code';
    const text = `Your Astra verification code is ${otp}. It expires in 15 minutes.`;
    const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Your Astra code</h2>
            <p>Enter this code to verify your email:</p>
            <div style="background-color: #f4f4f4; padding: 12px; font-size: 28px; font-weight: bold; text-align: center; letter-spacing: 6px;">
              ${otp}
            </div>
            <p>This code expires in 15 minutes.</p>
            <p>If you did not request this, you can ignore this email.</p>
          </div>
        `;
    return this.sendMail(email, subject, text, html);
  }

  async sendNotificationEmail(
    email: string,
    title: string,
    message: string,
    actionUrl?: string,
  ): Promise<boolean> {
    const appUrl = this.configService.get('APP_URL') || 'http://localhost:3000';
    const fullActionUrl = actionUrl ? `${appUrl}${actionUrl}` : null;
    const html = `
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
        `;
    return this.sendMail(email, title, message, html);
  }

  private async sendMail(
    to: string,
    subject: string,
    text: string,
    html: string,
  ): Promise<boolean> {
    if (await this.sendViaResend(to, subject, text, html)) {
      return true;
    }
    if (await this.sendViaSmtp(to, subject, text, html)) {
      return true;
    }
    this.logger.error(`Failed to send email to ${to} via Resend and SMTP`);
    if (this.configService.get('NODE_ENV') === 'development') {
      this.logger.warn(`DEV MODE: Email failed, but OTP is logged above`);
    }
    return false;
  }

  private async sendViaResend(
    to: string,
    subject: string,
    text: string,
    html: string,
  ): Promise<boolean> {
    if (!this.resendApiKey) return false;
    try {
      const { data } = await axios.post(
        'https://api.resend.com/emails',
        {
          from: this.fromEmail,
          to: [to],
          subject,
          text,
          html,
        },
        {
          timeout: 20000,
          family: 4,
          headers: {
            Authorization: `Bearer ${this.resendApiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );
      this.logger.log(`Email sent via Resend to ${to}${data?.id ? ` (${data.id})` : ''}`);
      return true;
    } catch (error) {
      const detail = error.response?.data?.message || error.message;
      this.logger.warn(`Resend send failed for ${to}: ${detail}`);
      return false;
    }
  }

  private async sendViaSmtp(
    to: string,
    subject: string,
    text: string,
    html: string,
  ): Promise<boolean> {
    if (!this.smtp) return false;
    try {
      await this.smtp.sendMail({
        from: this.fromEmail,
        to,
        subject,
        text,
        html,
      });
      this.logger.log(`Email sent via SMTP to ${to}`);
      return true;
    } catch (error) {
      this.logger.warn(`SMTP send failed for ${to}: ${error.message}`);
      return false;
    }
  }
}
