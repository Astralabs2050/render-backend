import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Put, UseInterceptors, UploadedFile, UploadedFiles } from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { BrandDetailsDto } from './dto/brand-details.dto';
import { CreateDesignDto } from './dto/create-collection.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Helpers } from '../common/utils/helpers';
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}
  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }
  @Get()
  @UseGuards(JwtAuthGuard)
  findAll() {
    return this.usersService.findAll();
  }
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  getProfile(@Req() req) {
    return {
      status: true,
      message: 'Profile retrieved successfully',
      data: Helpers.sanitizeUser(req.user),
    };
  }

  @Put('profile')
  @UseGuards(JwtAuthGuard)
  async updateProfile(@Req() req, @Body() updateUserDto: UpdateUserDto) {
    const updatedUser = await this.usersService.update(req.user.id, updateUserDto);
    return {
      status: true,
      message: 'Profile updated successfully',
      data: Helpers.sanitizeUser(updatedUser),
    };
  }

  @Post('brand-details')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('brandLogo', {
    fileFilter: (req, file, cb) => {
      if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/jpg') {
        cb(null, true);
      } else {
        cb(new Error('Only JPEG files are allowed'), false);
      }
    }
  }))
  async createBrandDetails(
    @Req() req, 
    @Body() brandDetailsDto: BrandDetailsDto,
    @UploadedFile() brandLogo?: Express.Multer.File
  ) {
    const updatedUser = await this.usersService.addBrandDetails(req.user.id, brandDetailsDto, brandLogo);
    return {
      status: true,
      message: 'Brand details created successfully',
      data: Helpers.sanitizeUser(updatedUser),
    };
  }

  @Post('designs')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FilesInterceptor('designImages', 4, {
    fileFilter: (req, file, cb) => {
      if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/jpg') {
        cb(null, true);
      } else {
        cb(new Error('Only JPEG files are allowed'), false);
      }
    }
  }))
  async createDesign(
    @Req() req,
    @Body() createDesignDto: CreateDesignDto,
    @UploadedFiles() designImages?: Express.Multer.File[]
  ) {
    const design = await this.usersService.createCollection(req.user.id, createDesignDto, designImages);
    return {
      status: true,
      message: 'Design created successfully',
      data: design,
    };
  }

  @Post('collections/:id/payment')
  @UseGuards(JwtAuthGuard)
  async processCollectionPayment(
    @Req() req,
    @Param('id') collectionId: string
  ) {
    const payment = await this.usersService.processCollectionPayment(req.user.id, collectionId);
    return {
      status: true,
      message: 'Payment processed successfully',
      data: payment,
    };
  }

  @Get('maker/earnings')
  @UseGuards(JwtAuthGuard)
  async getMakerEarnings(@Req() req) {
    const earnings = await this.usersService.getMakerEarnings(req.user.id);
    return {
      status: true,
      message: 'Earnings retrieved successfully',
      data: earnings,
    };
  }
}