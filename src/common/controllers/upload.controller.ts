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
  @Get('variants/:publicId')
  async getImageVariants(@Param('publicId') publicId: string) {
    const decodedPublicId = publicId.replace(/-/g, '/');
    const variants = this.cloudinaryService.getImageVariants(decodedPublicId);
    return {
      status: true,
      message: 'Image variants generated successfully',
      data: variants,
    };
  }
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