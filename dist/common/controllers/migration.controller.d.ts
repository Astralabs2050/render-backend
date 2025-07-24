import { EncryptionMigrationService } from '../utils/encryption-migration';
export declare class MigrationController {
    private readonly migrationService;
    constructor(migrationService: EncryptionMigrationService);
    getMigrationStats(): Promise<{
        total: number;
        legacy: number;
        v1: number;
        needsMigration: boolean;
    }>;
    validateEncryption(): Promise<{
        valid: number;
        invalid: number;
        legacy: number;
        v1: number;
    }>;
    migrateEncryption(batchSize?: string, dryRun?: string): Promise<{
        dryRun: boolean;
        message: string;
        validation: {
            valid: number;
            invalid: number;
            legacy: number;
            v1: number;
        };
        stats?: undefined;
        before?: undefined;
        after?: undefined;
        migrated?: undefined;
    } | {
        message: string;
        stats: {
            total: number;
            legacy: number;
            v1: number;
            needsMigration: boolean;
        };
        dryRun?: undefined;
        validation?: undefined;
        before?: undefined;
        after?: undefined;
        migrated?: undefined;
    } | {
        message: string;
        before: {
            total: number;
            legacy: number;
            v1: number;
            needsMigration: boolean;
        };
        after: {
            total: number;
            legacy: number;
            v1: number;
            needsMigration: boolean;
        };
        migrated: number;
        dryRun?: undefined;
        validation?: undefined;
        stats?: undefined;
    }>;
}
