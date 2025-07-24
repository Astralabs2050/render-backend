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
var CloudinaryService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CloudinaryService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const cloudinary_1 = require("cloudinary");
let CloudinaryService = CloudinaryService_1 = class CloudinaryService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(CloudinaryService_1.name);
        cloudinary_1.v2.config({
            cloud_name: this.configService.get('CLOUDINARY_CLOUD_NAME'),
            api_key: this.configService.get('CLOUDINARY_API_KEY'),
            api_secret: this.configService.get('CLOUDINARY_API_SECRET'),
        });
        this.logger.log('Cloudinary service initialized');
    }
    async uploadImage(file, options = {}) {
        try {
            const uploadOptions = {
                folder: options.folder || 'astra-fashion',
                resource_type: 'image',
                quality: 'auto',
                format: 'auto',
                ...options,
            };
            if (options.transformation) {
                uploadOptions.transformation = this.buildTransformation(options.transformation);
            }
            const result = await new Promise((resolve, reject) => {
                if (Buffer.isBuffer(file)) {
                    cloudinary_1.v2.uploader.upload_stream(uploadOptions, (error, result) => {
                        if (error)
                            reject(error);
                        else
                            resolve(result);
                    }).end(file);
                }
                else {
                    cloudinary_1.v2.uploader.upload(file, uploadOptions, (error, result) => {
                        if (error)
                            reject(error);
                        else
                            resolve(result);
                    });
                }
            });
            this.logger.log(`Image uploaded to Cloudinary: ${result.public_id}`);
            return {
                public_id: result.public_id,
                secure_url: result.secure_url,
                url: result.url,
                width: result.width,
                height: result.height,
                format: result.format,
                resource_type: result.resource_type,
                bytes: result.bytes,
                created_at: result.created_at,
            };
        }
        catch (error) {
            this.logger.error(`Cloudinary upload failed: ${error.message}`);
            throw error;
        }
    }
    async uploadDesignImage(file, designId, userId) {
        return this.uploadImage(file, {
            folder: 'astra-fashion/designs',
            public_id: `design_${designId}_${Date.now()}`,
            tags: ['design', 'fashion', userId],
            context: {
                design_id: designId,
                user_id: userId,
                type: 'design',
            },
            transformation: {
                width: 1024,
                height: 1024,
                crop: 'fit',
                quality: 'auto',
                format: 'auto',
            },
        });
    }
    async uploadProfileImage(file, userId) {
        return this.uploadImage(file, {
            folder: 'astra-fashion/profiles',
            public_id: `profile_${userId}`,
            tags: ['profile', userId],
            context: {
                user_id: userId,
                type: 'profile',
            },
            transformation: {
                width: 400,
                height: 400,
                crop: 'fill',
                gravity: 'face',
                quality: 'auto',
                format: 'auto',
            },
        });
    }
    async uploadNFTImage(file, nftId, userId) {
        return this.uploadImage(file, {
            folder: 'astra-fashion/nfts',
            public_id: `nft_${nftId}`,
            tags: ['nft', 'fashion', userId],
            context: {
                nft_id: nftId,
                user_id: userId,
                type: 'nft',
            },
            transformation: {
                width: 1000,
                height: 1000,
                crop: 'fit',
                quality: 90,
                format: 'png',
            },
        });
    }
    generateImageUrl(publicId, transformation = {}) {
        try {
            const transformationString = this.buildTransformation(transformation);
            return cloudinary_1.v2.url(publicId, {
                transformation: transformationString,
                secure: true,
            });
        }
        catch (error) {
            this.logger.error(`Failed to generate image URL: ${error.message}`);
            throw error;
        }
    }
    getImageVariants(publicId) {
        return {
            thumbnail: this.generateImageUrl(publicId, {
                width: 150,
                height: 150,
                crop: 'fill',
                quality: 'auto',
            }),
            medium: this.generateImageUrl(publicId, {
                width: 500,
                height: 500,
                crop: 'fit',
                quality: 'auto',
            }),
            large: this.generateImageUrl(publicId, {
                width: 1000,
                height: 1000,
                crop: 'fit',
                quality: 'auto',
            }),
            original: this.generateImageUrl(publicId),
        };
    }
    async deleteImage(publicId) {
        try {
            await cloudinary_1.v2.uploader.destroy(publicId);
            this.logger.log(`Image deleted from Cloudinary: ${publicId}`);
        }
        catch (error) {
            this.logger.error(`Failed to delete image: ${error.message}`);
            throw error;
        }
    }
    async getImageDetails(publicId) {
        try {
            const result = await cloudinary_1.v2.api.resource(publicId);
            return result;
        }
        catch (error) {
            this.logger.error(`Failed to get image details: ${error.message}`);
            throw error;
        }
    }
    async searchImages(tags, maxResults = 50) {
        try {
            const result = await cloudinary_1.v2.search
                .expression(`tags:${tags.join(' AND tags:')}`)
                .max_results(maxResults)
                .execute();
            return result.resources;
        }
        catch (error) {
            this.logger.error(`Failed to search images: ${error.message}`);
            throw error;
        }
    }
    buildTransformation(options) {
        const transformation = {};
        if (options.width)
            transformation.width = options.width;
        if (options.height)
            transformation.height = options.height;
        if (options.crop)
            transformation.crop = options.crop;
        if (options.quality)
            transformation.quality = options.quality;
        if (options.format)
            transformation.format = options.format;
        if (options.background)
            transformation.background = options.background;
        if (options.gravity)
            transformation.gravity = options.gravity;
        return transformation;
    }
    async analyzeDesignImage(publicId) {
        try {
            const result = await cloudinary_1.v2.api.resource(publicId, {
                colors: true,
                image_metadata: true,
                phash: true,
            });
            const colors = result.colors?.map((color) => color[0]) || [];
            const autoTagResult = await cloudinary_1.v2.uploader.upload(cloudinary_1.v2.url(publicId), {
                public_id: `${publicId}_analysis`,
                categorization: 'google_tagging',
                auto_tagging: 0.7,
            });
            return {
                colors,
                tags: autoTagResult.tags || [],
                moderation: result.moderation || [],
            };
        }
        catch (error) {
            this.logger.error(`Failed to analyze image: ${error.message}`);
            throw error;
        }
    }
};
exports.CloudinaryService = CloudinaryService;
exports.CloudinaryService = CloudinaryService = CloudinaryService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], CloudinaryService);
//# sourceMappingURL=cloudinary.service.js.map