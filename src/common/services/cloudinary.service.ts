import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';
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
@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);
  constructor(private configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    });
    this.logger.log('Cloudinary service initialized');
  }
  async uploadImage(
    file: Buffer | string,
    options: {
      folder?: string;
      public_id?: string;
      tags?: string[];
      context?: Record<string, string>;
      transformation?: ImageTransformOptions;
    } = {}
  ): Promise<CloudinaryUploadResult> {
    try {
      const uploadOptions: any = {
        folder: options.folder || 'astra-fashion',
        resource_type: 'image',
        quality: 'auto',
        ...options,
      };
      if (options.transformation) {
        uploadOptions.transformation = this.buildTransformation(options.transformation);
      }
      const result: UploadApiResponse = await new Promise((resolve, reject) => {
        if (Buffer.isBuffer(file)) {
          cloudinary.uploader.upload_stream(
            uploadOptions,
            (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
              if (error) reject(error);
              else resolve(result!);
            }
          ).end(file);
        } else {
          cloudinary.uploader.upload(file, uploadOptions, (error, result) => {
            if (error) reject(error);
            else resolve(result!);
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
    } catch (error) {
      this.logger.error(`Cloudinary upload failed: ${error.message}`);
      throw error;
    }
  }
  async uploadDesignImage(
    file: Buffer,
    designId: string,
    userId: string
  ): Promise<CloudinaryUploadResult> {
    return this.uploadImage(file, {
      folder: 'astra-fashion/designs',
      public_id: `design_${designId}_${Date.now()}`,
      tags: ['design', 'fashion', userId],
      context: {
        design_id: designId.replace(/[^a-zA-Z0-9]/g, '_'),
        user_id: userId.replace(/[^a-zA-Z0-9]/g, '_'),
        type: 'design',
      },
      transformation: {
        width: 1024,
        height: 1024,
        crop: 'fit',
        quality: 'auto',
      },
    });
  }
  async uploadProfileImage(
    file: Buffer,
    userId: string
  ): Promise<CloudinaryUploadResult> {
    return this.uploadImage(file, {
      folder: 'astra-fashion/profiles',
      public_id: `profile_${userId}`,
      tags: ['profile', userId],
      context: {
        user_id: userId.replace(/[^a-zA-Z0-9]/g, '_'),
        type: 'profile',
      },
      transformation: {
        width: 400,
        height: 400,
        crop: 'fill',
        gravity: 'face',
        quality: 'auto',
      },
    });
  }
  async uploadNFTImage(
    file: Buffer,
    nftId: string,
    userId: string
  ): Promise<CloudinaryUploadResult> {
    return this.uploadImage(file, {
      folder: 'astra-fashion/nfts',
      public_id: `nft_${nftId}`,
      tags: ['nft', 'fashion', userId],
      context: {
        nft_id: nftId.replace(/[^a-zA-Z0-9]/g, '_'),
        user_id: userId.replace(/[^a-zA-Z0-9]/g, '_'),
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
  generateImageUrl(
    publicId: string,
    transformation: ImageTransformOptions = {}
  ): string {
    try {
      const transformationString = this.buildTransformation(transformation);
      return cloudinary.url(publicId, {
        transformation: transformationString,
        secure: true,
      });
    } catch (error) {
      this.logger.error(`Failed to generate image URL: ${error.message}`);
      throw error;
    }
  }
  getImageVariants(publicId: string): {
    thumbnail: string;
    medium: string;
    large: string;
    original: string;
  } {
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
  async deleteImage(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId);
      this.logger.log(`Image deleted from Cloudinary: ${publicId}`);
    } catch (error) {
      this.logger.error(`Failed to delete image: ${error.message}`);
      throw error;
    }
  }
  async getImageDetails(publicId: string): Promise<any> {
    try {
      const result = await cloudinary.api.resource(publicId);
      return result;
    } catch (error) {
      this.logger.error(`Failed to get image details: ${error.message}`);
      throw error;
    }
  }
  async searchImages(tags: string[], maxResults: number = 50): Promise<any[]> {
    try {
      const result = await cloudinary.search
        .expression(`tags:${tags.join(' AND tags:')}`)
        .max_results(maxResults)
        .execute();
      return result.resources;
    } catch (error) {
      this.logger.error(`Failed to search images: ${error.message}`);
      throw error;
    }
  }
  private buildTransformation(options: ImageTransformOptions): any {
    const transformation: any = {};
    if (options.width) transformation.width = options.width;
    if (options.height) transformation.height = options.height;
    if (options.crop) transformation.crop = options.crop;
    if (options.quality) transformation.quality = options.quality;
    if (options.format) transformation.format = options.format;
    if (options.background) transformation.background = options.background;
    if (options.gravity) transformation.gravity = options.gravity;
    return transformation;
  }


  async analyzeDesignImage(publicId: string): Promise<{
    colors: string[];
    tags: string[];
    moderation: any;
  }> {
    try {
      const result = await cloudinary.api.resource(publicId, {
        colors: true,
        image_metadata: true,
        phash: true,
      });
      const colors = result.colors?.map((color: any) => color[0]) || [];
      const autoTagResult = await cloudinary.uploader.upload(
        cloudinary.url(publicId),
        {
          public_id: `${publicId}_analysis`,
          categorization: 'google_tagging',
          auto_tagging: 0.7,
        }
      );
      return {
        colors,
        tags: autoTagResult.tags || [],
        moderation: result.moderation || [],
      };
    } catch (error) {
      this.logger.error(`Failed to analyze image: ${error.message}`);
      throw error;
    }
  }
}