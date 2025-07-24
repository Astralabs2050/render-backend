import { User } from '../../users/entities/user.entity';
export declare class Helpers {
    static generateOtp(): string;
    static hashPassword(password: string): Promise<string>;
    static comparePassword(password: string, hash: string): Promise<boolean>;
    static sanitizeUser(user: User): Partial<User>;
    static isOtpExpired(otpCreatedAt: Date): boolean;
    static logData(label: string, data: any): void;
}
