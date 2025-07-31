import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User } from '../../users/entities/user.entity';
class SecureBuffer {
  private buffer: Buffer;
  private isCleared = false;
  constructor(size: number) {
    this.buffer = Buffer.allocUnsafe(size);
    this.buffer.fill(0);
  }
  static from(data: string | Buffer, encoding?: BufferEncoding): SecureBuffer {
    const secureBuffer = new SecureBuffer(0);
    if (typeof data === 'string') {
      secureBuffer.buffer = Buffer.from(data, encoding);
    } else {
      secureBuffer.buffer = Buffer.from(data);
    }
    return secureBuffer;
  }
  toString(encoding?: BufferEncoding): string {
    if (this.isCleared) {
      throw new Error('SecureBuffer has been cleared');
    }
    return this.buffer.toString(encoding);
  }
  get length(): number {
    return this.buffer.length;
  }
  slice(start?: number, end?: number): Buffer {
    if (this.isCleared) {
      throw new Error('SecureBuffer has been cleared');
    }
    return this.buffer.subarray(start, end);
  }
  getBuffer(): Buffer {
    if (this.isCleared) {
      throw new Error('SecureBuffer has been cleared');
    }
    return this.buffer;
  }
  clear(): void {
    if (!this.isCleared) {
      crypto.randomFillSync(this.buffer);
      this.buffer.fill(0);
      this.isCleared = true;
    }
  }
  [Symbol.dispose](): void {
    this.clear();
  }
}
class SecureString {
  private value: string;
  private isCleared = false;
  constructor(value: string) {
    this.value = value;
  }
  toString(): string {
    if (this.isCleared) {
      throw new Error('SecureString has been cleared');
    }
    return this.value;
  }
  clear(): void {
    if (!this.isCleared) {
      const chars = this.value.split('');
      for (let i = 0; i < chars.length; i++) {
        chars[i] = String.fromCharCode(Math.floor(Math.random() * 256));
      }
      this.value = chars.join('');
      this.value = '';
      this.isCleared = true;
    }
  }
  [Symbol.dispose](): void {
    this.clear();
  }
}
export class Helpers {
  static generateOtp(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }
  static async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt();
    return bcrypt.hash(password, salt);
  }
  static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
  static isOtpExpired(otpCreatedAt: Date): boolean {
    if (!otpCreatedAt) return true;
    const now = new Date();
    const expirationTime = new Date(otpCreatedAt.getTime() + 15 * 60 * 1000); 
    return now > expirationTime;
  }
  private static deriveKey(secret: string, salt: Buffer): SecureBuffer {
    const derivedKey = crypto.pbkdf2Sync(secret, salt, 100000, 32, 'sha256');
    return SecureBuffer.from(derivedKey);
  }
  private static clearSensitiveData(...items: (SecureBuffer | SecureString | Buffer)[]): void {
    items.forEach(item => {
      if (item instanceof SecureBuffer || item instanceof SecureString) {
        item.clear();
      } else if (Buffer.isBuffer(item)) {
        crypto.randomFillSync(item);
        item.fill(0);
      }
    });
  }
  static encryptPrivateKey(privateKey: string): string {
    const secretKey = process.env.WALLET_ENCRYPTION_KEY;
    if (!secretKey) {
      throw new Error('WALLET_ENCRYPTION_KEY environment variable is required');
    }
    const algorithm = 'aes-256-gcm';
    const version = 'v1'; 
    const salt = crypto.randomBytes(32);
    const iv = crypto.randomBytes(16);
    const securePrivateKey = new SecureString(privateKey);
    let key: SecureBuffer | null = null;
    let result: string;
    try {
      key = this.deriveKey(secretKey, salt);
      const cipher = crypto.createCipheriv(algorithm, key.getBuffer(), iv);
      let encrypted = cipher.update(securePrivateKey.toString(), 'utf8', 'hex');
      encrypted += cipher.final('hex');
      const authTag = cipher.getAuthTag();
      result = [
        version,
        salt.toString('hex'),
        iv.toString('hex'),
        authTag.toString('hex'),
        encrypted
      ].join(':');
    } finally {
      this.clearSensitiveData(securePrivateKey, key!, salt, iv);
    }
    return result;
  }
  static decryptPrivateKey(encryptedPrivateKey: string): string {
    const secretKey = process.env.WALLET_ENCRYPTION_KEY;
    if (!secretKey) {
      throw new Error('WALLET_ENCRYPTION_KEY environment variable is required');
    }
    const parts = encryptedPrivateKey.split(':');
    if (parts.length === 5 && parts[0] === 'v1') {
      return this.decryptV1(parts, secretKey);
    }
    if (parts.length === 3) {
      console.warn('Using legacy encryption format. Please re-encrypt private keys.');
      return this.decryptLegacy(parts, secretKey);
    }
    throw new Error('Invalid encrypted private key format');
  }
  private static decryptV1(parts: string[], secretKey: string): string {
    const algorithm = 'aes-256-gcm';
    const [version, saltHex, ivHex, authTagHex, encrypted] = parts;
    const salt = Buffer.from(saltHex, 'hex');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    let key: SecureBuffer | null = null;
    let decrypted: string;
    try {
      key = this.deriveKey(secretKey, salt);
      const decipher = crypto.createDecipheriv(algorithm, key.getBuffer(), iv);
      decipher.setAuthTag(authTag);
      decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
    } finally {
      this.clearSensitiveData(key!, salt, iv, authTag);
    }
    return decrypted;
  }
  private static decryptLegacy(parts: string[], secretKey: string): string {
    const algorithm = 'aes-256-gcm';
    const [ivHex, authTagHex, encrypted] = parts;
    const key = crypto.createHash('sha256').update(secretKey).digest();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    let decrypted: string;
    try {
      const decipher = crypto.createDecipheriv(algorithm, key, iv);
      decipher.setAuthTag(authTag);
      decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
    } finally {
      this.clearSensitiveData(key, iv, authTag);
    }
    return decrypted;
  }
  static sanitizeUser(user: User): Partial<User> {
    const { password, otp, otpCreatedAt, walletPrivateKey, ...userData } = user;
    const result: any = {};
    
    Object.keys(userData).forEach(key => {
      const value = userData[key as keyof typeof userData];
      if (value !== null && value !== undefined) {
        result[key] = value;
      }
    });
    
    return result;
  }

  static removeNullFields(obj: any): any {
    if (obj === null || obj === undefined) return obj;
    if (Array.isArray(obj)) return obj.map(item => this.removeNullFields(item));
    if (obj instanceof Date) return obj;
    if (typeof obj !== 'object') return obj;
    
    const result: any = {};
    Object.keys(obj).forEach(key => {
      const value = obj[key];
      if (value !== null && value !== undefined) {
        result[key] = (typeof value === 'object' && !(value instanceof Date)) 
          ? this.removeNullFields(value) 
          : value;
      }
    });
    
    return result;
  }
  static logData(label: string, data: any): void {
    if (process.env.NODE_ENV === 'development') {
      console.log(`\n--- ${label} ---`);
      console.log(data);
      console.log('-------------------\n');
    }
  }
}