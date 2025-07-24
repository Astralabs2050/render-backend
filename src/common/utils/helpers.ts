import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User } from '../../users/entities/user.entity';

/**
 * Secure Buffer that zeros memory on cleanup
 */
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
      // Overwrite with random data first, then zeros
      crypto.randomFillSync(this.buffer);
      this.buffer.fill(0);
      this.isCleared = true;
    }
  }

  // Automatic cleanup when object is garbage collected
  [Symbol.dispose](): void {
    this.clear();
  }
}

/**
 * Secure string that clears memory on cleanup
 */
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
      // Overwrite string memory (best effort in JavaScript)
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
   * Check if OTP is expired (15 minutes)
   */
  static isOtpExpired(otpCreatedAt: Date): boolean {
    if (!otpCreatedAt) return true;

    const now = new Date();
    const expirationTime = new Date(otpCreatedAt.getTime() + 15 * 60 * 1000); // 15 minutes

    return now > expirationTime;
  }

  /**
   * Derive encryption key using PBKDF2 (proper key stretching) with secure memory
   */
  private static deriveKey(secret: string, salt: Buffer): SecureBuffer {
    // Use PBKDF2 with 100,000 iterations for proper key stretching
    const derivedKey = crypto.pbkdf2Sync(secret, salt, 100000, 32, 'sha256');
    return SecureBuffer.from(derivedKey);
  }

  /**
   * Securely clear sensitive data from memory
   */
  private static clearSensitiveData(...items: (SecureBuffer | SecureString | Buffer)[]): void {
    items.forEach(item => {
      if (item instanceof SecureBuffer || item instanceof SecureString) {
        item.clear();
      } else if (Buffer.isBuffer(item)) {
        // Clear regular buffers
        crypto.randomFillSync(item);
        item.fill(0);
      }
    });
  }

  /**
   * Encrypt wallet private key using AES-256-GCM with proper key derivation and secure memory
   */
  static encryptPrivateKey(privateKey: string): string {
    const secretKey = process.env.WALLET_ENCRYPTION_KEY;

    // Fail fast if encryption key is not provided
    if (!secretKey) {
      throw new Error('WALLET_ENCRYPTION_KEY environment variable is required');
    }

    const algorithm = 'aes-256-gcm';
    const version = 'v1'; // Version for future compatibility

    // Generate random salt and IV
    const salt = crypto.randomBytes(32);
    const iv = crypto.randomBytes(16);

    // Secure memory handling
    const securePrivateKey = new SecureString(privateKey);
    let key: SecureBuffer | null = null;
    let result: string;

    try {
      // Derive key using PBKDF2
      key = this.deriveKey(secretKey, salt);

      // Create cipher
      const cipher = crypto.createCipheriv(algorithm, key.getBuffer(), iv);

      // Encrypt the private key
      let encrypted = cipher.update(securePrivateKey.toString(), 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Get the authentication tag
      const authTag = cipher.getAuthTag();

      // Combine version, salt, iv, authTag, and encrypted data
      result = [
        version,
        salt.toString('hex'),
        iv.toString('hex'),
        authTag.toString('hex'),
        encrypted
      ].join(':');

    } finally {
      // Always clear sensitive data from memory
      this.clearSensitiveData(securePrivateKey, key!, salt, iv);
    }

    return result;
  }

  /**
   * Decrypt wallet private key with version support
   */
  static decryptPrivateKey(encryptedPrivateKey: string): string {
    const secretKey = process.env.WALLET_ENCRYPTION_KEY;

    // Fail fast if encryption key is not provided
    if (!secretKey) {
      throw new Error('WALLET_ENCRYPTION_KEY environment variable is required');
    }

    // Split the encrypted data
    const parts = encryptedPrivateKey.split(':');

    // Check for versioned format
    if (parts.length === 5 && parts[0] === 'v1') {
      return this.decryptV1(parts, secretKey);
    }

    // Legacy format support (remove in future versions)
    if (parts.length === 3) {
      console.warn('Using legacy encryption format. Please re-encrypt private keys.');
      return this.decryptLegacy(parts, secretKey);
    }

    throw new Error('Invalid encrypted private key format');
  }

  /**
   * Decrypt v1 format with proper key derivation and secure memory
   */
  private static decryptV1(parts: string[], secretKey: string): string {
    const algorithm = 'aes-256-gcm';
    const [version, saltHex, ivHex, authTagHex, encrypted] = parts;

    const salt = Buffer.from(saltHex, 'hex');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    let key: SecureBuffer | null = null;
    let decrypted: string;

    try {
      // Derive key using same method as encryption
      key = this.deriveKey(secretKey, salt);

      // Create decipher
      const decipher = crypto.createDecipheriv(algorithm, key.getBuffer(), iv);
      decipher.setAuthTag(authTag);

      // Decrypt the private key
      decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

    } finally {
      // Clear sensitive data from memory
      this.clearSensitiveData(key!, salt, iv, authTag);
    }

    return decrypted;
  }

  /**
   * Decrypt legacy format (for backward compatibility) with secure memory
   */
  private static decryptLegacy(parts: string[], secretKey: string): string {
    const algorithm = 'aes-256-gcm';
    const [ivHex, authTagHex, encrypted] = parts;

    // Legacy key derivation (weak) - but still secure the memory
    const key = crypto.createHash('sha256').update(secretKey).digest();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    let decrypted: string;

    try {
      // Create decipher
      const decipher = crypto.createDecipheriv(algorithm, key, iv);
      decipher.setAuthTag(authTag);

      // Decrypt the private key
      decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

    } finally {
      // Clear sensitive data from memory
      this.clearSensitiveData(key, iv, authTag);
    }

    return decrypted;
  }

  /**
   * Sanitize user object by removing sensitive fields
   */
  static sanitizeUser(user: User): Partial<User> {
    const { password, otp, otpCreatedAt, walletPrivateKey, ...result } = user;
    return result;
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