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
exports.UploadController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const cloudinary_service_1 = require("../services/cloudinary.service");
let UploadController = class UploadController {
    constructor(cloudinaryService) {
        this.cloudinaryService = cloudinaryService;
    }
    async uploadDesignImage(file, req, body) {
        if (!file) {
            throw new common_1.BadRequestException('No file uploaded');
        }
        if (!file.mimetype.startsWith('image/')) {
            throw new common_1.BadRequestException('Only image files are allowed');
        }
        const designId = body.designId || `design_${Date.now()}`;
        const userId = req.user.id;
        const result = await this.cloudinaryService.uploadDesignImage(file.buffer, designId, userId);
        const variants = this.cloudinaryService.getImageVariants(result.public_id);
        return {
            status: true,
            message: 'Design image uploaded successfully',
            data: {
                ...result,
                variants,
            },
        };
    }
    async uploadProfileImage(file, req) {
        if (!file) {
            throw new common_1.BadRequestException('No file uploaded');
        }
        if (!file.mimetype.startsWith('image/')) {
            throw new common_1.BadRequestException('Only image files are allowed');
        }
        const userId = req.user.id;
        const result = await this.cloudinaryService.uploadProfileImage(file.buffer, userId);
        const variants = this.cloudinaryService.getImageVariants(result.public_id);
        return {
            status: true,
            message: 'Profile image uploaded successfully',
            data: {
                ...result,
                variants,
            },
        };
    }
    async uploadNFTImage(file, req, body) {
        if (!file) {
            throw new common_1.BadRequestException('No file uploaded');
        }
        if (!file.mimetype.startsWith('image/')) {
            throw new common_1.BadRequestException('Only image files are allowed');
        }
        if (!body.nftId) {
            throw new common_1.BadRequestException('NFT ID is required');
        }
        const userId = req.user.id;
        const result = await this.cloudinaryService.uploadNFTImage(file.buffer, body.nftId, userId);
        const variants = this.cloudinaryService.getImageVariants(result.public_id);
        return {
            status: true,
            message: 'NFT image uploaded successfully',
            data: {
                ...result,
                variants,
            },
        };
    }
    async uploadImage(file, req, body) {
        if (!file) {
            throw new common_1.BadRequestException('No file uploaded');
        }
        if (!file.mimetype.startsWith('image/')) {
            throw new common_1.BadRequestException('Only image files are allowed');
        }
        const userId = req.user.id;
        const tags = body.tags ? body.tags.split(',') : [];
        const result = await this.cloudinaryService.uploadImage(file.buffer, {
            folder: body.folder || 'astra-fashion/general',
            tags: [...tags, userId],
            context: {
                user_id: userId,
                type: 'general',
            },
        });
        const variants = this.cloudinaryService.getImageVariants(result.public_id);
        return {
            status: true,
            message: 'Image uploaded successfully',
            data: {
                ...result,
                variants,
            },
        };
    }
    async getImageVariants(publicId) {
        const decodedPublicId = publicId.replace(/-/g, '/');
        const variants = this.cloudinaryService.getImageVariants(decodedPublicId);
        return {
            status: true,
            message: 'Image variants generated successfully',
            data: variants,
        };
    }
    async getTransformedImage(publicId, width, height, crop, quality, format) {
        const decodedPublicId = publicId.replace(/-/g, '/');
        const transformation = {};
        if (width)
            transformation.width = parseInt(width);
        if (height)
            transformation.height = parseInt(height);
        if (crop)
            transformation.crop = crop;
        if (quality)
            transformation.quality = quality === 'auto' ? 'auto' : parseInt(quality);
        if (format)
            transformation.format = format;
        const url = this.cloudinaryService.generateImageUrl(decodedPublicId, transformation);
        return {
            status: true,
            message: 'Transformed image URL generated successfully',
            data: { url },
        };
    }
    async analyzeImage(publicId) {
        const decodedPublicId = publicId.replace(/-/g, '/');
        const analysis = await this.cloudinaryService.analyzeDesignImage(decodedPublicId);
        return {
            status: true,
            message: 'Image analysis completed successfully',
            data: analysis,
        };
    }
    async searchImages(tags, limit) {
        if (!tags) {
            throw new common_1.BadRequestException('Tags parameter is required');
        }
        const tagArray = tags.split(',').map(tag => tag.trim());
        const maxResults = limit ? parseInt(limit) : 50;
        const results = await this.cloudinaryService.searchImages(tagArray, maxResults);
        return {
            status: true,
            message: 'Image search completed successfully',
            data: results,
        };
    }
    async deleteImage(publicId) {
        const decodedPublicId = publicId.replace(/-/g, '/');
        await this.cloudinaryService.deleteImage(decodedPublicId);
        return {
            status: true,
            message: 'Image deleted successfully',
        };
    }
};
exports.UploadController = UploadController;
__decorate([
    (0, common_1.Post)('design'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], UploadController.prototype, "uploadDesignImage", null);
__decorate([
    (0, common_1.Post)('profile'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], UploadController.prototype, "uploadProfileImage", null);
__decorate([
    (0, common_1.Post)('nft'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], UploadController.prototype, "uploadNFTImage", null);
__decorate([
    (0, common_1.Post)('image'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], UploadController.prototype, "uploadImage", null);
__decorate([
    (0, common_1.Get)('variants/:publicId'),
    __param(0, (0, common_1.Param)('publicId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UploadController.prototype, "getImageVariants", null);
__decorate([
    (0, common_1.Get)('transform/:publicId'),
    __param(0, (0, common_1.Param)('publicId')),
    __param(1, (0, common_1.Query)('width')),
    __param(2, (0, common_1.Query)('height')),
    __param(3, (0, common_1.Query)('crop')),
    __param(4, (0, common_1.Query)('quality')),
    __param(5, (0, common_1.Query)('format')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], UploadController.prototype, "getTransformedImage", null);
__decorate([
    (0, common_1.Get)('analyze/:publicId'),
    __param(0, (0, common_1.Param)('publicId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UploadController.prototype, "analyzeImage", null);
__decorate([
    (0, common_1.Get)('search'),
    __param(0, (0, common_1.Query)('tags')),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], UploadController.prototype, "searchImages", null);
__decorate([
    (0, common_1.Post)('delete/:publicId'),
    __param(0, (0, common_1.Param)('publicId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UploadController.prototype, "deleteImage", null);
exports.UploadController = UploadController = __decorate([
    (0, common_1.Controller)('upload'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [cloudinary_service_1.CloudinaryService])
], UploadController);
//# sourceMappingURL=upload.controller.js.map