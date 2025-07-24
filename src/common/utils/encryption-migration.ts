import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Helpers } from './helpers';

/**
 * Secure private key handler for migration operations
 */
class SecureMigrationKey {
  private key: string;
  private isCleared = false;

  constructor(privateKey: string) {
    this.key = privateKey;
  }

  getKey(): string {
    if (this.isCleared) {
      throw new Error('Private key has been cleared from memory');
    }
    return this.key;
  }

  clear(): void {
    if (!this.isCleared) {
      // Overwrite with random data (best effort in JavaScript)
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

@Injectable()
export class EncryptionMigrationService {
  private readonly logger = new Logger(EncryptionMigrationService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  /**
   * Migrate legacy encrypted private keys to new v1 format (optimized for large datasets)
   */
  async migrateLegacyEncryption(batchSize: number = 100): Promise<void> {
    try {
      // More targeted query - only get users with legacy format
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
      const usersToUpdate: User[] = [];

      // Process in batches
      for (let i = 0; i < legacyUsers.length; i++) {
        const user = legacyUsers[i];

        let secureKey: SecureMigrationKey | null = null;
        
        try {
          // Decrypt using legacy format
          const privateKey = Helpers.decryptPrivateKey(user.walletPrivateKey);
          secureKey = new SecureMigrationKey(privateKey);
          
          // Re-encrypt using new v1 format
          const newEncryptedKey = Helpers.encryptPrivateKey(secureKey.getKey());
          
          // Prepare for batch update
          user.walletPrivateKey = newEncryptedKey;
          usersToUpdate.push(user);
          migratedCount++;

          // Throttled logging (every 50 users)
          if (migratedCount % 50 === 0) {
            this.logger.log(`Migration progress: ${migratedCount}/${legacyUsers.length} users processed`);
          }

        } catch (error) {
          errorCount++;
          this.logger.error(`Failed to migrate encryption for user ${user.email}: ${error.message}`);
        } finally {
          // Always clear the private key from memory
          if (secureKey) {
            secureKey.clear();
          }
        }

        // Batch save every batchSize users or at the end
        if (usersToUpdate.length >= batchSize || i === legacyUsers.length - 1) {
          if (usersToUpdate.length > 0) {
            await this.userRepository.save(usersToUpdate);
            this.logger.log(`Batch saved ${usersToUpdate.length} users`);
            usersToUpdate.length = 0; // Clear array
          }
        }
      }

      this.logger.log(`Migration completed. Successfully migrated: ${migratedCount}, Errors: ${errorCount}`);
      
      if (errorCount > 0) {
        this.logger.warn(`${errorCount} users failed migration. Check logs for details.`);
      }

    } catch (error) {
      this.logger.error(`Encryption migration failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Validate all encrypted private keys can be decrypted (optimized for large datasets)
   */
  async validateEncryption(): Promise<{ valid: number; invalid: number; legacy: number; v1: number }> {
    // Only select necessary fields for validation
    const users = await this.userRepository
      .createQueryBuilder('user')
      .where('user.walletPrivateKey IS NOT NULL')
      .select(['user.id', 'user.email', 'user.walletPrivateKey'])
      .getMany();

    let valid = 0;
    let invalid = 0;
    let legacy = 0;
    let v1 = 0;
    const invalidUsers: string[] = [];

    this.logger.log(`Validating encryption for ${users.length} users...`);

    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      
      if (user.walletPrivateKey) {
        let secureKey: SecureMigrationKey | null = null;
        
        try {
          // Decrypt to validate - but secure the memory
          const privateKey = Helpers.decryptPrivateKey(user.walletPrivateKey);
          secureKey = new SecureMigrationKey(privateKey);
          
          // If we got here, decryption was successful
          valid++;
          
          // Track format versions
          if (user.walletPrivateKey.startsWith('v1:')) {
            v1++;
          } else {
            legacy++;
          }

          // Throttled progress logging
          if ((i + 1) % 100 === 0) {
            this.logger.log(`Validation progress: ${i + 1}/${users.length} users processed`);
          }

        } catch (error) {
          invalid++;
          invalidUsers.push(user.email);
          
          // Only log first 10 invalid users to avoid spam
          if (invalid <= 10) {
            this.logger.warn(`Invalid encryption for user ${user.email}: ${error.message}`);
          }
        } finally {
          // Always clear the private key from memory
          if (secureKey) {
            secureKey.clear();
          }
        }
      }
    }

    // Summary logging
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

  /**
   * Get migration statistics without performing migration
   */
  async getMigrationStats(): Promise<{ total: number; legacy: number; v1: number; needsMigration: boolean }> {
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
}