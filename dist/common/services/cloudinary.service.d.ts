import { ConfigService } from '@nestjs/config';
export interface CloudinaryUploadResult {
    public_id: string;
    secure_url: string;
    url: string;
    width: number;
    height: number;
    format: string;
    resource_type: string;
    bytes: number;
    created_at: string;
}
export interface ImageTransformOptions {
    width?: number;
    height?: number;
    crop?: 'fill' | 'fit' | 'scale' | 'crop' | 'thumb' | 'pad';
    quality?: 'auto' | number;
    format?: 'auto' | 'jpg' | 'png' | 'webp';
    background?: string;
    gravity?: 'auto' | 'face' | 'center' | 'north' | 'south' | 'east' | 'west';
}
export declare class CloudinaryService {
    private configService;
    private readonly logger;
    constructor(configService: ConfigService);
    uploadImage(file: Buffer | string, options?: {
        folder?: string;
        public_id?: string;
        tags?: string[];
        context?: Record<string, string>;
        transformation?: ImageTransformOptions;
    }): Promise<CloudinaryUploadResult>;
    uploadDesignImage(file: Buffer, designId: string, userId: string): Promise<CloudinaryUploadResult>;
    uploadProfileImage(file: Buffer, userId: string): Promise<CloudinaryUploadResult>;
    uploadNFTImage(file: Buffer, nftId: string, userId: string): Promise<CloudinaryUploadResult>;
    generateImageUrl(publicId: string, transformation?: ImageTransformOptions): string;
    getImageVariants(publicId: string): {
        thumbnail: string;
        medium: string;
        large: string;
        original: string;
    };
    deleteImage(publicId: string): Promise<void>;
    getImageDetails(publicId: string): Promise<any>;
    searchImages(tags: string[], maxResults?: number): Promise<any[]>;
    private buildTransformation;
    analyzeDesignImage(publicId: string): Promise<{
        colors: string[];
        tags: string[];
        moderation: any;
    }>;
}
