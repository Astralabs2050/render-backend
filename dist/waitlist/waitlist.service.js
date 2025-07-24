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
var WaitlistService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WaitlistService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const waitlist_entity_1 = require("./entities/waitlist.entity");
let WaitlistService = WaitlistService_1 = class WaitlistService {
    constructor(waitlistRepository) {
        this.waitlistRepository = waitlistRepository;
        this.logger = new common_1.Logger(WaitlistService_1.name);
    }
    async join(joinWaitlistDto) {
        const { email } = joinWaitlistDto;
        const existingEntry = await this.waitlistRepository.findOne({
            where: { email },
        });
        if (existingEntry) {
            this.logger.warn(`Email ${email} already exists in waitlist`);
            throw new common_1.ConflictException('Email already exists in waitlist');
        }
        const waitlistEntry = this.waitlistRepository.create(joinWaitlistDto);
        const savedEntry = await this.waitlistRepository.save(waitlistEntry);
        this.logger.log(`Added to waitlist: ${email}`);
        return savedEntry;
    }
};
exports.WaitlistService = WaitlistService;
exports.WaitlistService = WaitlistService = WaitlistService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(waitlist_entity_1.Waitlist)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], WaitlistService);
//# sourceMappingURL=waitlist.service.js.map