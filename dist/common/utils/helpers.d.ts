import { User } from '../../users/entities/user.entity';
export declare class Helpers {
    static generateOtp(): string;
    static hashPassword(password: string): Promise<string>;
    static comparePassword(password: string, hash: string): Promise<boolean>;
    static isOtpExpired(otpCreatedAt: Date): boolean;
    private static deriveKey;
    private static clearSensitiveData;
    static encryptPrivateKey(privateKey: string): string;
    static decryptPrivateKey(encryptedPrivateKey: string): string;
    private static decryptV1;
    private static decryptLegacy;
    static sanitizeUser(user: User): Partial<User>;
    static logData(label: string, data: any): void;
}
