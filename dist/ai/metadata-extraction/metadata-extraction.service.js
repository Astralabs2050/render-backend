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
var MetadataExtractionService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetadataExtractionService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const image_generation_entity_1 = require("../entities/image-generation.entity");
let MetadataExtractionService = MetadataExtractionService_1 = class MetadataExtractionService {
    constructor(configService, imageRepository) {
        this.configService = configService;
        this.imageRepository = imageRepository;
        this.logger = new common_1.Logger(MetadataExtractionService_1.name);
    }
    async extractMetadata(dto) {
        try {
            const { imageId } = dto;
            const image = await this.imageRepository.findOne({
                where: { id: imageId },
            });
            if (!image) {
                throw new common_1.NotFoundException('Image not found');
            }
            const metadata = await this.extractMetadataFromImage(image.imageUrl);
            image.metadata = metadata;
            await this.imageRepository.save(image);
            return metadata;
        }
        catch (error) {
            this.logger.error(`Error extracting metadata: ${error.message}`, error.stack);
            throw error;
        }
    }
    async extractMetadataFromImage(imageUrl) {
        try {
            this.logger.log(`Extracting metadata from image: ${imageUrl}`);
            return {
                name: 'White Satin Evening Gown',
                category: 'Dresses',
                deliveryTimeline: '3-4 weeks',
                suggestedPrice: 299.99,
                colors: ['white', 'ivory'],
                description: 'Elegant white satin dress with cutouts and a flowing train. Perfect for formal events and weddings.',
            };
        }
        catch (error) {
            this.logger.error(`Metadata extraction API error: ${error.message}`);
            throw error;
        }
    }
};
exports.MetadataExtractionService = MetadataExtractionService;
exports.MetadataExtractionService = MetadataExtractionService = MetadataExtractionService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, typeorm_1.InjectRepository)(image_generation_entity_1.AiGeneratedImage)),
    __metadata("design:paramtypes", [config_1.ConfigService,
        typeorm_2.Repository])
], MetadataExtractionService);
//# sourceMappingURL=metadata-extraction.service.js.map