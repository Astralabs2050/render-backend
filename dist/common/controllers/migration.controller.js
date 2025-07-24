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
Object.defineProperty(exports, "__esModule", { value: true });
exports.MigrationController = void 0;
const common_1 = require("@nestjs/common");
const encryption_migration_1 = require("../utils/encryption-migration");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
let MigrationController = class MigrationController {
    constructor(migrationService) {
        this.migrationService = migrationService;
    }
    async getMigrationStats() {
        return this.migrationService.getMigrationStats();
    }
    async validateEncryption() {
        return this.migrationService.validateEncryption();
    }
    async migrateEncryption(batchSize, dryRun) {
        const batch = batchSize ? parseInt(batchSize) : 100;
        const isDryRun = dryRun === 'true';
        if (isDryRun) {
            const validation = await this.migrationService.validateEncryption();
            return {
                dryRun: true,
                message: 'Dry run completed - no changes made',
                validation,
            };
        }
        const statsBefore = await this.migrationService.getMigrationStats();
        if (!statsBefore.needsMigration) {
            return {
                message: 'No migration needed - all keys are already in v1 format',
                stats: statsBefore,
            };
        }
        await this.migrationService.migrateLegacyEncryption(batch);
        const statsAfter = await this.migrationService.getMigrationStats();
        return {
            message: 'Migration completed successfully',
            before: statsBefore,
            after: statsAfter,
            migrated: statsBefore.legacy,
        };
    }
};
exports.MigrationController = MigrationController;
__decorate([
    (0, common_1.Get)('stats'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MigrationController.prototype, "getMigrationStats", null);
__decorate([
    (0, common_1.Get)('validate'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MigrationController.prototype, "validateEncryption", null);
__decorate([
    (0, common_1.Post)('encrypt'),
    __param(0, (0, common_1.Query)('batchSize')),
    __param(1, (0, common_1.Query)('dryRun')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], MigrationController.prototype, "migrateEncryption", null);
exports.MigrationController = MigrationController = __decorate([
    (0, common_1.Controller)('admin/migration'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [encryption_migration_1.EncryptionMigrationService])
], MigrationController);
//# sourceMappingURL=migration.controller.js.map