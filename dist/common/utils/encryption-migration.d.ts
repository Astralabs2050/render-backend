import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
export declare class EncryptionMigrationService {
    private userRepository;
    private readonly logger;
    constructor(userRepository: Repository<User>);
    migrateLegacyEncryption(batchSize?: number): Promise<void>;
    validateEncryption(): Promise<{
        valid: number;
        invalid: number;
        legacy: number;
        v1: number;
    }>;
    getMigrationStats(): Promise<{
        total: number;
        legacy: number;
        v1: number;
        needsMigration: boolean;
    }>;
}
