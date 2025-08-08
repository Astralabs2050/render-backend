import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Put } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { BrandDetailsDto } from './dto/brand-details.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserType } from './entities/user.entity';
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
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(UserType.MAKER)
  async createBrandDetails(@Req() req, @Body() brandDetailsDto: BrandDetailsDto) {
    const updatedUser = await this.usersService.addBrandDetails(req.user.id, brandDetailsDto);
    return {
      status: true,
      message: 'Brand details created successfully',
      data: Helpers.sanitizeUser(updatedUser),
    };
  }
}