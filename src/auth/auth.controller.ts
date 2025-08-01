import { Controller, Post, Body, UseGuards, Get, Req, UseInterceptors, UploadedFiles } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, OtpVerificationDto, ResendOtpDto, ForgotPasswordDto, ResetPasswordDto, RefreshTokenDto } from './dto/auth.dto';
import { CompleteProfileDto } from '../users/dto/complete-profile.dto';
import { UsersService } from '../users/users.service';
import { CloudinaryService } from '../common/services/cloudinary.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly cloudinaryService: CloudinaryService
  ) {}
  @Post('register')
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }
  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }
  @Post('verify-otp')
  verifyOtp(@Body() otpVerificationDto: OtpVerificationDto) {
    return this.authService.verifyOtp(otpVerificationDto);
  }
  @Post('resend-otp')
  resendOtp(@Body() resendOtpDto: ResendOtpDto) {
    return this.authService.resendOtp(resendOtpDto);
  }
  @Post('forgot-password')
  forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }
  @Post('reset-password')
  resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }
  @Post('refresh-token')
  refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshTokenDto.refreshToken);
  }
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  getProfile(@Req() req) {
    const { Helpers } = require('../common/utils/helpers');
    return Helpers.sanitizeUser(req.user);
  }
  @Get('wallet')
  @UseGuards(JwtAuthGuard)
  getWallet(@Req() req) {
    return this.authService.getUserWallet(req.user.id);
  }
  @Post('complete-profile')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'governmentIdImages', maxCount: 2 },
    { name: 'businessCertificateImage', maxCount: 1 },
    { name: 'projectImages', maxCount: 20 }
  ]))
  async completeProfile(
    @Req() req, 
    @Body() dto: CompleteProfileDto,
    @UploadedFiles() files: { 
      governmentIdImages?: Express.Multer.File[], 
      businessCertificateImage?: Express.Multer.File[],
      projectImages?: Express.Multer.File[]
    }
  ) {
    const userId = req.user.id;
    const profileData = { ...dto };
    if (files?.governmentIdImages) {
      const uploadPromises = files.governmentIdImages.map(file => 
        this.cloudinaryService.uploadImage(file.buffer, { folder: `identity/${userId}/gov-id` })
      );
      const uploadResults = await Promise.all(uploadPromises);
      profileData.governmentIdImages = uploadResults.map(result => result.secure_url);
    }
    if (files?.businessCertificateImage?.[0]) {
      const result = await this.cloudinaryService.uploadImage(
        files.businessCertificateImage[0].buffer, 
        { folder: `identity/${userId}/business-cert` }
      );
      profileData.businessCertificateImage = result.secure_url;
    }
    if (files?.projectImages && profileData.projects) {
      let imageIndex = 0;
      for (let i = 0; i < profileData.projects.length; i++) {
        const project = profileData.projects[i];
        const projectImageCount = Math.min(4, files.projectImages.length - imageIndex);
        if (projectImageCount > 0) {
          const projectFiles = files.projectImages.slice(imageIndex, imageIndex + projectImageCount);
          const uploadPromises = projectFiles.map(file => 
            this.cloudinaryService.uploadImage(file.buffer, { folder: `projects/${userId}/project-${i}` })
          );
          const uploadResults = await Promise.all(uploadPromises);
          project.images = uploadResults.map(result => result.secure_url);
          imageIndex += projectImageCount;
        }
      }
    }
    const user = await this.usersService.completeProfile(userId, profileData);
    return {
      status: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          location: user.location,
          category: user.category,
          skills: user.skills,
          profileCompleted: user.profileCompleted,
          identityVerified: user.identityVerified,
          businessName: user.businessName,
          walletAddress: user.walletAddress
        }
      }
    };
  }
}