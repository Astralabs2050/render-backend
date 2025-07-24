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
var ImageGenerationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImageGenerationService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const image_generation_entity_1 = require("../entities/image-generation.entity");
const chat_entity_1 = require("../entities/chat.entity");
let ImageGenerationService = ImageGenerationService_1 = class ImageGenerationService {
    constructor(configService, imageRepository, messageRepository) {
        this.configService = configService;
        this.imageRepository = imageRepository;
        this.messageRepository = messageRepository;
        this.logger = new common_1.Logger(ImageGenerationService_1.name);
        this.uploadDir = path.join(process.cwd(), 'uploads');
        if (!fs.existsSync(this.uploadDir)) {
            fs.mkdirSync(this.uploadDir, { recursive: true });
        }
    }
    async generateImages(dto) {
        try {
            const { prompt, chatId, messageId, referenceImageBase64, provider } = dto;
            const message = await this.messageRepository.findOne({
                where: { id: messageId, chatId },
            });
            if (!message) {
                throw new common_1.BadRequestException('Message not found');
            }
            let imageUrls;
            if (provider === 'astria') {
                imageUrls = await this.generateWithAstria(prompt, referenceImageBase64);
            }
            else {
                imageUrls = await this.generateWithStableDiffusion(prompt, referenceImageBase64);
            }
            const generatedImages = await Promise.all(imageUrls.map(async (imageUrl) => {
                const image = this.imageRepository.create({
                    imageUrl,
                    messageId,
                    generationParams: {
                        prompt,
                        provider,
                        hasReferenceImage: !!referenceImageBase64,
                    },
                });
                return this.imageRepository.save(image);
            }));
            if (generatedImages.length > 0) {
                message.imageUrl = generatedImages[0].imageUrl;
                await this.messageRepository.save(message);
            }
            return generatedImages;
        }
        catch (error) {
            this.logger.error(`Error generating images: ${error.message}`, error.stack);
            throw new common_1.BadRequestException('Failed to generate images');
        }
    }
    async generateWithStableDiffusion(prompt, referenceImageBase64) {
        try {
            this.logger.log(`Generating images with Stable Diffusion: ${prompt}`);
            const images = await Promise.all([
                this.saveBase64AsImage('mock-data', 'image1'),
                this.saveBase64AsImage('mock-data', 'image2'),
                this.saveBase64AsImage('mock-data', 'image3'),
            ]);
            return images;
        }
        catch (error) {
            this.logger.error(`Stable Diffusion API error: ${error.message}`);
            throw error;
        }
    }
    async generateWithAstria(prompt, referenceImageBase64) {
        try {
            this.logger.log(`Generating images with Astria: ${prompt}`);
            const images = await Promise.all([
                this.saveBase64AsImage('mock-data', 'astria1'),
                this.saveBase64AsImage('mock-data', 'astria2'),
            ]);
            return images;
        }
        catch (error) {
            this.logger.error(`Astria API error: ${error.message}`);
            throw error;
        }
    }
    async saveBase64AsImage(base64Data, prefix) {
        const filename = `${prefix}-${crypto.randomUUID()}.png`;
        const filepath = path.join(this.uploadDir, filename);
        fs.writeFileSync(filepath, 'mock image data');
        return `/uploads/${filename}`;
    }
};
exports.ImageGenerationService = ImageGenerationService;
exports.ImageGenerationService = ImageGenerationService = ImageGenerationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, typeorm_1.InjectRepository)(image_generation_entity_1.AiGeneratedImage)),
    __param(2, (0, typeorm_1.InjectRepository)(chat_entity_1.AiChatMessage)),
    __metadata("design:paramtypes", [config_1.ConfigService,
        typeorm_2.Repository,
        typeorm_2.Repository])
], ImageGenerationService);
//# sourceMappingURL=image-generation.service.js.map