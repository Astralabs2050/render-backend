import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  Req,
  Body,
  BadRequestException,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CloudinaryService } from '../services/cloudinary.service';

@Controller('upload')
@UseGuards(JwtAuthGuard)
export class UploadController {
  constructor(private readonly cloudinaryService: CloudinaryService) {}

  /**
   * Upload design image
   */
  @Post('design')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDesignImage(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
    @Body() body: { designId?: string }
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('Only image files are allowed');
    }

    const designId = body.designId || `design_${Date.now()}`;
    const userId = req.user.id;

    const result = await this.cloudinaryService.uploadDesignImage(
      file.buffer,
      designId,
      userId
    );

    // Get image variants
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

  /**
   * Upload profile image
   */
  @Post('profile')
  @UseInterceptors(FileInterceptor('file'))
  async uploadProfileImage(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('Only image files are allowed');
    }

    const userId = req.user.id;

    const result = await this.cloudinaryService.uploadProfileImage(
      file.buffer,
      userId
    );

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

  /**
   * Upload NFT image
   */
  @Post('nft')
  @UseInterceptors(FileInterceptor('file'))
  async uploadNFTImage(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
    @Body() body: { nftId: string }
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('Only image files are allowed');
    }

    if (!body.nftId) {
      throw new BadRequestException('NFT ID is required');
    }

    const userId = req.user.id;

    const result = await this.cloudinaryService.uploadNFTImage(
      file.buffer,
      body.nftId,
      userId
    );

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

  /**
   * Upload general image
   */
  @Post('image')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
    @Body() body: { folder?: string; tags?: string }
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('Only image files are allowed');
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

  /**
   * Get image variants
   */
  @Get('variants/:publicId')
  async getImageVariants(@Param('publicId') publicId: string) {
    // Decode the public_id (replace - with /)
    const decodedPublicId = publicId.replace(/-/g, '/');
    
    const variants = this.cloudinaryService.getImageVariants(decodedPublicId);

    return {
      status: true,
      message: 'Image variants generated successfully',
      data: variants,
    };
  }

  /**
   * Generate transformed image URL
   */
  @Get('transform/:publicId')
  async getTransformedImage(
    @Param('publicId') publicId: string,
    @Query('width') width?: string,
    @Query('height') height?: string,
    @Query('crop') crop?: string,
    @Query('quality') quality?: string,
    @Query('format') format?: string
  ) {
    const decodedPublicId = publicId.replace(/-/g, '/');
    
    const transformation: any = {};
    if (width) transformation.width = parseInt(width);
    if (height) transformation.height = parseInt(height);
    if (crop) transformation.crop = crop;
    if (quality) transformation.quality = quality === 'auto' ? 'auto' : parseInt(quality);
    if (format) transformation.format = format;

    const url = this.cloudinaryService.generateImageUrl(decodedPublicId, transformation);

    return {
      status: true,
      message: 'Transformed image URL generated successfully',
      data: { url },
    };
  }

  /**
   * Analyze design image
   */
  @Get('analyze/:publicId')
  async analyzeImage(@Param('publicId') publicId: string) {
    const decodedPublicId = publicId.replace(/-/g, '/');
    
    const analysis = await this.cloudinaryService.analyzeDesignImage(decodedPublicId);

    return {
      status: true,
      message: 'Image analysis completed successfully',
      data: analysis,
    };
  }

  /**
   * Search images by tags
   */
  @Get('search')
  async searchImages(
    @Query('tags') tags: string,
    @Query('limit') limit?: string
  ) {
    if (!tags) {
      throw new BadRequestException('Tags parameter is required');
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

  /**
   * Delete image
   */
  @Post('delete/:publicId')
  async deleteImage(@Param('publicId') publicId: string) {
    const decodedPublicId = publicId.replace(/-/g, '/');
    
    await this.cloudinaryService.deleteImage(decodedPublicId);

    return {
      status: true,
      message: 'Image deleted successfully',
    };
  }
}