import { CloudinaryService } from '../services/cloudinary.service';
export declare class UploadController {
    private readonly cloudinaryService;
    constructor(cloudinaryService: CloudinaryService);
    uploadDesignImage(file: Express.Multer.File, req: any, body: {
        designId?: string;
    }): Promise<{
        status: boolean;
        message: string;
        data: {
            variants: {
                thumbnail: string;
                medium: string;
                large: string;
                original: string;
            };
            public_id: string;
            secure_url: string;
            url: string;
            width: number;
            height: number;
            format: string;
            resource_type: string;
            bytes: number;
            created_at: string;
        };
    }>;
    uploadProfileImage(file: Express.Multer.File, req: any): Promise<{
        status: boolean;
        message: string;
        data: {
            variants: {
                thumbnail: string;
                medium: string;
                large: string;
                original: string;
            };
            public_id: string;
            secure_url: string;
            url: string;
            width: number;
            height: number;
            format: string;
            resource_type: string;
            bytes: number;
            created_at: string;
        };
    }>;
    uploadNFTImage(file: Express.Multer.File, req: any, body: {
        nftId: string;
    }): Promise<{
        status: boolean;
        message: string;
        data: {
            variants: {
                thumbnail: string;
                medium: string;
                large: string;
                original: string;
            };
            public_id: string;
            secure_url: string;
            url: string;
            width: number;
            height: number;
            format: string;
            resource_type: string;
            bytes: number;
            created_at: string;
        };
    }>;
    uploadImage(file: Express.Multer.File, req: any, body: {
        folder?: string;
        tags?: string;
    }): Promise<{
        status: boolean;
        message: string;
        data: {
            variants: {
                thumbnail: string;
                medium: string;
                large: string;
                original: string;
            };
            public_id: string;
            secure_url: string;
            url: string;
            width: number;
            height: number;
            format: string;
            resource_type: string;
            bytes: number;
            created_at: string;
        };
    }>;
    getImageVariants(publicId: string): Promise<{
        status: boolean;
        message: string;
        data: {
            thumbnail: string;
            medium: string;
            large: string;
            original: string;
        };
    }>;
    getTransformedImage(publicId: string, width?: string, height?: string, crop?: string, quality?: string, format?: string): Promise<{
        status: boolean;
        message: string;
        data: {
            url: string;
        };
    }>;
    analyzeImage(publicId: string): Promise<{
        status: boolean;
        message: string;
        data: {
            colors: string[];
            tags: string[];
            moderation: any;
        };
    }>;
    searchImages(tags: string, limit?: string): Promise<{
        status: boolean;
        message: string;
        data: any[];
    }>;
    deleteImage(publicId: string): Promise<{
        status: boolean;
        message: string;
    }>;
}
