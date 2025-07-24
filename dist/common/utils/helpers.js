"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Helpers = void 0;
const bcrypt = require("bcrypt");
const crypto = require("crypto");
class SecureBuffer {
    constructor(size) {
        this.isCleared = false;
        this.buffer = Buffer.allocUnsafe(size);
        this.buffer.fill(0);
    }
    static from(data, encoding) {
        const secureBuffer = new SecureBuffer(0);
        if (typeof data === 'string') {
            secureBuffer.buffer = Buffer.from(data, encoding);
        }
        else {
            secureBuffer.buffer = Buffer.from(data);
        }
        return secureBuffer;
    }
    toString(encoding) {
        if (this.isCleared) {
            throw new Error('SecureBuffer has been cleared');
        }
        return this.buffer.toString(encoding);
    }
    get length() {
        return this.buffer.length;
    }
    slice(start, end) {
        if (this.isCleared) {
            throw new Error('SecureBuffer has been cleared');
        }
        return this.buffer.subarray(start, end);
    }
    getBuffer() {
        if (this.isCleared) {
            throw new Error('SecureBuffer has been cleared');
        }
        return this.buffer;
    }
    clear() {
        if (!this.isCleared) {
            crypto.randomFillSync(this.buffer);
            this.buffer.fill(0);
            this.isCleared = true;
        }
    }
    [Symbol.dispose]() {
        this.clear();
    }
}
class SecureString {
    constructor(value) {
        this.isCleared = false;
        this.value = value;
    }
    toString() {
        if (this.isCleared) {
            throw new Error('SecureString has been cleared');
        }
        return this.value;
    }
    clear() {
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
    [Symbol.dispose]() {
        this.clear();
    }
}
class Helpers {
    static generateOtp() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }
    static async hashPassword(password) {
        const salt = await bcrypt.genSalt();
        return bcrypt.hash(password, salt);
    }
    static async comparePassword(password, hash) {
        return bcrypt.compare(password, hash);
    }
    static isOtpExpired(otpCreatedAt) {
        if (!otpCreatedAt)
            return true;
        const now = new Date();
        const expirationTime = new Date(otpCreatedAt.getTime() + 15 * 60 * 1000);
        return now > expirationTime;
    }
    static deriveKey(secret, salt) {
        const derivedKey = crypto.pbkdf2Sync(secret, salt, 100000, 32, 'sha256');
        return SecureBuffer.from(derivedKey);
    }
    static clearSensitiveData(...items) {
        items.forEach(item => {
            if (item instanceof SecureBuffer || item instanceof SecureString) {
                item.clear();
            }
            else if (Buffer.isBuffer(item)) {
                crypto.randomFillSync(item);
                item.fill(0);
            }
        });
    }
    static encryptPrivateKey(privateKey) {
        const secretKey = process.env.WALLET_ENCRYPTION_KEY;
        if (!secretKey) {
            throw new Error('WALLET_ENCRYPTION_KEY environment variable is required');
        }
        const algorithm = 'aes-256-gcm';
        const version = 'v1';
        const salt = crypto.randomBytes(32);
        const iv = crypto.randomBytes(16);
        const securePrivateKey = new SecureString(privateKey);
        let key = null;
        let result;
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
        }
        finally {
            this.clearSensitiveData(securePrivateKey, key, salt, iv);
        }
        return result;
    }
    static decryptPrivateKey(encryptedPrivateKey) {
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
    static decryptV1(parts, secretKey) {
        const algorithm = 'aes-256-gcm';
        const [version, saltHex, ivHex, authTagHex, encrypted] = parts;
        const salt = Buffer.from(saltHex, 'hex');
        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');
        let key = null;
        let decrypted;
        try {
            key = this.deriveKey(secretKey, salt);
            const decipher = crypto.createDecipheriv(algorithm, key.getBuffer(), iv);
            decipher.setAuthTag(authTag);
            decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
        }
        finally {
            this.clearSensitiveData(key, salt, iv, authTag);
        }
        return decrypted;
    }
    static decryptLegacy(parts, secretKey) {
        const algorithm = 'aes-256-gcm';
        const [ivHex, authTagHex, encrypted] = parts;
        const key = crypto.createHash('sha256').update(secretKey).digest();
        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');
        let decrypted;
        try {
            const decipher = crypto.createDecipheriv(algorithm, key, iv);
            decipher.setAuthTag(authTag);
            decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
        }
        finally {
            this.clearSensitiveData(key, iv, authTag);
        }
        return decrypted;
    }
    static sanitizeUser(user) {
        const { password, otp, otpCreatedAt, walletPrivateKey, ...result } = user;
        return result;
    }
    static logData(label, data) {
        if (process.env.NODE_ENV === 'development') {
            console.log(`\n--- ${label} ---`);
            console.log(data);
            console.log('-------------------\n');
        }
    }
}
exports.Helpers = Helpers;
//# sourceMappingURL=helpers.js.map