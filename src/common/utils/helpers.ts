import * as bcrypt from 'bcrypt';
import { User } from '../../users/entities/user.entity';

export class Helpers {
  /**
   * Generate a random 6-digit OTP
   */
  static generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Hash a password
   */
  static async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt();
    return bcrypt.hash(password, salt);
  }

  /**
   * Compare a password with a hash
   */
  static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Sanitize user object by removing sensitive fields
   */
  static sanitizeUser(user: User): Partial<User> {
    const { password, otp, otpCreatedAt, ...result } = user;
    return result;
  }

  /**
   * Check if OTP is expired (15 minutes)
   */
  static isOtpExpired(otpCreatedAt: Date): boolean {
    if (!otpCreatedAt) return true;
    
    const now = new Date();
    const expirationTime = new Date(otpCreatedAt.getTime() + 15 * 60 * 1000); // 15 minutes
    
    return now > expirationTime;
  }
  
  /**
   * Log data in development environment
   */
  static logData(label: string, data: any): void {
    if (process.env.NODE_ENV === 'development') {
      console.log(`\n--- ${label} ---`);
      console.log(data);
      console.log('-------------------\n');
    }
  }
}