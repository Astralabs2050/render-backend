import { Controller, Post, Get, Query, UseGuards } from '@nestjs/common';
import { EncryptionMigrationService } from '../utils/encryption-migration';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('admin/migration')
@UseGuards(JwtAuthGuard) // Protect with authentication
export class MigrationController {
  constructor(
    private readonly migrationService: EncryptionMigrationService,
  ) {}

  /**
   * Get migration statistics
   */
  @Get('stats')
  async getMigrationStats() {
    return this.migrationService.getMigrationStats();
  }

  /**
   * Validate encryption integrity
   */
  @Get('validate')
  async validateEncryption() {
    return this.migrationService.validateEncryption();
  }

  /**
   * Run encryption migration
   * Query params:
   * - batchSize: number of users to process in each batch (default: 100)
   * - dryRun: if true, only validate without migrating (default: false)
   */
  @Post('encrypt')
  async migrateEncryption(
    @Query('batchSize') batchSize?: string,
    @Query('dryRun') dryRun?: string,
  ) {
    const batch = batchSize ? parseInt(batchSize) : 100;
    const isDryRun = dryRun === 'true';

    if (isDryRun) {
      // Dry run - just validate
      const validation = await this.migrationService.validateEncryption();
      return {
        dryRun: true,
        message: 'Dry run completed - no changes made',
        validation,
      };
    }

    // Get stats before migration
    const statsBefore = await this.migrationService.getMigrationStats();
    
    if (!statsBefore.needsMigration) {
      return {
        message: 'No migration needed - all keys are already in v1 format',
        stats: statsBefore,
      };
    }

    // Run migration
    await this.migrationService.migrateLegacyEncryption(batch);
    
    // Get stats after migration
    const statsAfter = await this.migrationService.getMigrationStats();
    
    return {
      message: 'Migration completed successfully',
      before: statsBefore,
      after: statsAfter,
      migrated: statsBefore.legacy,
    };
  }
}