"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var EncryptionMigrationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EncryptionMigrationService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const user_entity_1 = require("../../users/entities/user.entity");
const helpers_1 = require("./helpers");
class SecureMigrationKey {
    constructor(privateKey) {
        this.isCleared = false;
        this.key = privateKey;
    }
    getKey() {
        if (this.isCleared) {
            throw new Error('Private key has been cleared from memory');
        }
        return this.key;
    }
    clear() {
        if (!this.isCleared) {
            const chars = this.key.split('');
            for (let i = 0; i < chars.length; i++) {
                chars[i] = String.fromCharCode(Math.floor(Math.random() * 256));
            }
            this.key = chars.join('');
            this.key = '';
            this.isCleared = true;
        }
    }
}
let EncryptionMigrationService = EncryptionMigrationService_1 = class EncryptionMigrationService {
    constructor(userRepository) {
        this.userRepository = userRepository;
        this.logger = new common_1.Logger(EncryptionMigrationService_1.name);
    }
    async migrateLegacyEncryption(batchSize = 100) {
        try {
            const legacyUsers = await this.userRepository
                .createQueryBuilder('user')
                .where('user.walletPrivateKey IS NOT NULL')
                .andWhere('user.walletPrivateKey NOT LIKE :v1Format', { v1Format: 'v1:%' })
                .select(['user.id', 'user.email', 'user.walletPrivateKey'])
                .getMany();
            if (legacyUsers.length === 0) {
                this.logger.log('No legacy encrypted keys found. Migration not needed.');
                return;
            }
            this.logger.log(`Found ${legacyUsers.length} users with legacy encryption. Starting migration...`);
            let migratedCount = 0;
            let errorCount = 0;
            const usersToUpdate = [];
            for (let i = 0; i < legacyUsers.length; i++) {
                const user = legacyUsers[i];
                let secureKey = null;
                try {
                    const privateKey = helpers_1.Helpers.decryptPrivateKey(user.walletPrivateKey);
                    secureKey = new SecureMigrationKey(privateKey);
                    const newEncryptedKey = helpers_1.Helpers.encryptPrivateKey(secureKey.getKey());
                    user.walletPrivateKey = newEncryptedKey;
                    usersToUpdate.push(user);
                    migratedCount++;
                    if (migratedCount % 50 === 0) {
                        this.logger.log(`Migration progress: ${migratedCount}/${legacyUsers.length} users processed`);
                    }
                }
                catch (error) {
                    errorCount++;
                    this.logger.error(`Failed to migrate encryption for user ${user.email}: ${error.message}`);
                }
                finally {
                    if (secureKey) {
                        secureKey.clear();
                    }
                }
                if (usersToUpdate.length >= batchSize || i === legacyUsers.length - 1) {
                    if (usersToUpdate.length > 0) {
                        await this.userRepository.save(usersToUpdate);
                        this.logger.log(`Batch saved ${usersToUpdate.length} users`);
                        usersToUpdate.length = 0;
                    }
                }
            }
            this.logger.log(`Migration completed. Successfully migrated: ${migratedCount}, Errors: ${errorCount}`);
            if (errorCount > 0) {
                this.logger.warn(`${errorCount} users failed migration. Check logs for details.`);
            }
        }
        catch (error) {
            this.logger.error(`Encryption migration failed: ${error.message}`);
            throw error;
        }
    }
    async validateEncryption() {
        const users = await this.userRepository
            .createQueryBuilder('user')
            .where('user.walletPrivateKey IS NOT NULL')
            .select(['user.id', 'user.email', 'user.walletPrivateKey'])
            .getMany();
        let valid = 0;
        let invalid = 0;
        let legacy = 0;
        let v1 = 0;
        const invalidUsers = [];
        this.logger.log(`Validating encryption for ${users.length} users...`);
        for (let i = 0; i < users.length; i++) {
            const user = users[i];
            if (user.walletPrivateKey) {
                let secureKey = null;
                try {
                    const privateKey = helpers_1.Helpers.decryptPrivateKey(user.walletPrivateKey);
                    secureKey = new SecureMigrationKey(privateKey);
                    valid++;
                    if (user.walletPrivateKey.startsWith('v1:')) {
                        v1++;
                    }
                    else {
                        legacy++;
                    }
                    if ((i + 1) % 100 === 0) {
                        this.logger.log(`Validation progress: ${i + 1}/${users.length} users processed`);
                    }
                }
                catch (error) {
                    invalid++;
                    invalidUsers.push(user.email);
                    if (invalid <= 10) {
                        this.logger.warn(`Invalid encryption for user ${user.email}: ${error.message}`);
                    }
                }
                finally {
                    if (secureKey) {
                        secureKey.clear();
                    }
                }
            }
        }
        this.logger.log(`Encryption validation completed:`);
        this.logger.log(`  Valid: ${valid} (v1: ${v1}, legacy: ${legacy})`);
        this.logger.log(`  Invalid: ${invalid}`);
        if (invalid > 10) {
            this.logger.warn(`${invalid - 10} additional users have invalid encryption (not logged to avoid spam)`);
        }
        if (legacy > 0) {
            this.logger.warn(`${legacy} users still using legacy encryption format. Consider running migration.`);
        }
        return { valid, invalid, legacy, v1 };
    }
    async getMigrationStats() {
        const result = await this.userRepository
            .createQueryBuilder('user')
            .select([
            'COUNT(*) as total',
            'SUM(CASE WHEN user.walletPrivateKey LIKE \'v1:%\' THEN 1 ELSE 0 END) as v1',
            'SUM(CASE WHEN user.walletPrivateKey NOT LIKE \'v1:%\' AND user.walletPrivateKey IS NOT NULL THEN 1 ELSE 0 END) as legacy'
        ])
            .where('user.walletPrivateKey IS NOT NULL')
            .getRawOne();
        const stats = {
            total: parseInt(result.total) || 0,
            v1: parseInt(result.v1) || 0,
            legacy: parseInt(result.legacy) || 0,
            needsMigration: (parseInt(result.legacy) || 0) > 0
        };
        this.logger.log(`Migration stats: Total: ${stats.total}, v1: ${stats.v1}, Legacy: ${stats.legacy}`);
        return stats;
    }
};
exports.EncryptionMigrationService = EncryptionMigrationService;
exports.EncryptionMigrationService = EncryptionMigrationService = EncryptionMigrationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], EncryptionMigrationService);
//# sourceMappingURL=encryption-migration.js.map