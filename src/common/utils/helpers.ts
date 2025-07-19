import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

export class Helpers {
  static async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  static async comparePasswords(plainText: string, hashed: string): Promise<boolean> {
    return bcrypt.compare(plainText, hashed);
  }

  static generateOtp(): string {
    return uuidv4().substring(0, 6);
  }

  static isOtpExpired(otpCreatedAt: Date, expiryMinutes = 30): boolean {
    if (!otpCreatedAt) return true;
    
    const expirationTime = new Date(otpCreatedAt.getTime() + expiryMinutes * 60 * 1000);
    return new Date() > expirationTime;
  }

  static sanitizeUser(user: any): any {
    const { password, otp, ...result } = user;
    return result;
  }

  static logData(label: string, data: any): void {
    console.log(`\n--- ${label} ---`);
    console.log(typeof data === 'object' ? JSON.stringify(data, null, 2) : data);
    console.log(`--- End ${label} ---\n`);
  }
}