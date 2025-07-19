import { Injectable, UnauthorizedException, NotFoundException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { RegisterDto, LoginDto, OtpVerificationDto, ForgotPasswordDto, ResetPasswordDto } from './dto/auth.dto';
import { User } from '../users/entities/user.entity';
import { Helpers } from '../common/utils/helpers';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto) {
    // Create user with OTP
    const user = await this.usersService.create({
      ...registerDto,
      otp: Helpers.generateOtp(),
      otpCreatedAt: new Date(),
    });

    // TODO: Send OTP email
    this.logger.log(`Registered new user: ${user.email} with OTP`);
    
    // In development, log the OTP for testing
    if (this.configService.get('NODE_ENV') === 'development') {
      this.logger.debug(`DEV MODE: OTP for ${user.email} is ${user.otp}`);
    }

    return {
      status: true,
      message: 'Registration successful, OTP sent to your email',
    };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // Find user
    const user = await this.usersService.findByEmail(email);

    // Validate password
    const isPasswordValid = await Helpers.comparePasswords(password, user.password);
    if (!isPasswordValid) {
      this.logger.warn(`Failed login attempt for user: ${email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate token
    const token = this.generateToken(user);
    this.logger.log(`User logged in: ${email}`);

    return {
      status: true,
      message: 'Login successful',
      data: {
        user: Helpers.sanitizeUser(user),
        token,
      },
    };
  }

  async verifyOtp(otpVerificationDto: OtpVerificationDto) {
    const { email, otp } = otpVerificationDto;

    // Find user
    const user = await this.usersService.findByEmail(email);

    // Validate OTP
    if (user.otp !== otp) {
      this.logger.warn(`Invalid OTP attempt for user: ${email}`);
      throw new UnauthorizedException('Invalid OTP');
    }

    // Check if OTP is expired
    if (Helpers.isOtpExpired(user.otpCreatedAt)) {
      this.logger.warn(`Expired OTP attempt for user: ${email}`);
      throw new UnauthorizedException('OTP expired');
    }

    // Update user
    await this.usersService.update(user.id, {
      verified: true,
      otp: null,
    });

    this.logger.log(`OTP verified for user: ${email}`);
    return {
      status: true,
      message: 'OTP verified successfully',
    };
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const { email } = forgotPasswordDto;

    // Find user
    const user = await this.usersService.findByEmail(email);

    // Generate OTP
    const otp = Helpers.generateOtp();

    // Update user
    await this.usersService.update(user.id, {
      otp,
      otpCreatedAt: new Date(),
    });

    // TODO: Send OTP email
    this.logger.log(`Password reset requested for user: ${email}`);
    
    // In development, log the OTP for testing
    if (this.configService.get('NODE_ENV') === 'development') {
      this.logger.debug(`DEV MODE: Password reset OTP for ${email} is ${otp}`);
    }

    return {
      status: true,
      message: 'Password reset code sent to your email',
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { email, otp, password } = resetPasswordDto;

    // Find user
    const user = await this.usersService.findByEmail(email);

    // Validate OTP
    if (user.otp !== otp) {
      this.logger.warn(`Invalid OTP for password reset: ${email}`);
      throw new UnauthorizedException('Invalid OTP');
    }

    // Check if OTP is expired
    if (Helpers.isOtpExpired(user.otpCreatedAt)) {
      this.logger.warn(`Expired OTP for password reset: ${email}`);
      throw new UnauthorizedException('OTP expired');
    }

    // Update user
    await this.usersService.update(user.id, {
      password,
      otp: null,
    });

    this.logger.log(`Password reset successful for user: ${email}`);
    return {
      status: true,
      message: 'Password reset successful',
    };
  }

  private generateToken(user: User): string {
    const payload = { sub: user.id, email: user.email };
    return this.jwtService.sign(payload);
  }
}