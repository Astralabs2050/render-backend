import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EncryptionMigrationService } from './utils/encryption-migration';
import { MigrationController } from './controllers/migration.controller';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
  ],
  controllers: [MigrationController],
  providers: [EncryptionMigrationService],
  exports: [EncryptionMigrationService],
})
export class MigrationModule {}