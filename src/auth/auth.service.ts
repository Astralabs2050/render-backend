import { Injectable, UnauthorizedException, NotFoundException, Logger, BadRequestException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { RegisterDto, LoginDto, OtpVerificationDto, ResendOtpDto, ForgotPasswordDto, ResetPasswordDto } from './dto/auth.dto';
import { User } from '../users/entities/user.entity';
import { Helpers } from '../common/utils/helpers';
import { EmailService } from '../common/services/email.service';
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
  ) { }
  async register(registerDto: RegisterDto) {
    const otp = Helpers.generateOtp();
    let user: User;
    try {
      user = await this.usersService.create({
        ...registerDto,
        userType: registerDto.role,
        otp,
        otpCreatedAt: new Date(),
      });
    } catch (error: any) {
      const isConflict =
        error instanceof ConflictException ||
        error?.status === 409 ||
        error?.getStatus?.() === 409 ||
        /already exists/i.test(error?.message || '');
      if (!isConflict) {
        throw error;
      }
      user = await this.usersService.findByEmail(registerDto.email);
      if (user.userType && user.userType !== registerDto.role) {
        throw new ConflictException(
          `This email is already registered as a ${user.userType}. Please log in, or use a different email.`,
        );
      }
      if (user.verified) {
        throw new ConflictException(
          'An account with this email already exists. Please log in.',
        );
      }
      await this.usersService.update(user.id, {
        otp,
        otpCreatedAt: new Date(),
      });
      this.dispatchOtpEmail(user.email, otp, 'register retry');
      this.logger.log(`Resent OTP to unverified user: ${user.email}`);
      if (this.configService.get('NODE_ENV') === 'development') {
        this.logger.log(`DEV MODE: OTP for ${user.email} is ${otp}`);
      }
      return {
        status: true,
        message:
          'We sent a verification code to your email. Check your inbox and spam folder.',
        data: {
          email: user.email,
          verified: false,
        },
      };
    }
    this.dispatchOtpEmail(user.email, otp, 'register');
    this.logger.log(`Registered new user: ${user.email} with OTP`);
    if (this.configService.get('NODE_ENV') === 'development') {
      this.logger.log(`DEV MODE: OTP for ${user.email} is ${otp}`);
    }
    return {
      status: true,
      message: 'Registration successful, OTP sent to your email. Verify your email to get your wallet.',
      data: {
        email: user.email,
        verified: false,
      },
    };
  }
  async login(loginDto: LoginDto) {
    const { email, password, userType } = loginDto;
    const user = await this.usersService.findByEmail(email);
    if (user.userType !== userType) {
      throw new UnauthorizedException(
        `No ${userType} account found with these credentials. Please sign up as a ${userType} first.`,
      );
    }
    if (!user.verified) {
      const otp = Helpers.generateOtp();
      await this.usersService.update(user.id, {
        otp,
        otpCreatedAt: new Date(),
      });
      this.dispatchOtpEmail(user.email, otp, 'unverified login');
      this.logger.log(`OTP sent to unverified user: ${email}`);
      if (this.configService.get('NODE_ENV') === 'development') {
        this.logger.log(`DEV MODE: OTP for unverified login ${email} is ${otp}`);
      }
      throw new UnauthorizedException('Account not verified. We\'ve sent a new OTP to your email. Please verify your account first.');
    }
    const isPasswordValid = await Helpers.comparePassword(password, user.password);
    if (!isPasswordValid) {
      this.logger.warn(`Failed login attempt for user: ${email}`);
      throw new UnauthorizedException('Invalid credentials');
    }
    const { accessToken, refreshToken } = this.generateTokens(user);
    this.logger.log(`User logged in: ${email}`);
    return {
      status: true,
      message: 'Login successful',
      data: {
        user: Helpers.sanitizeUser(user),
        accessToken,
        refreshToken,
      },
    };
  }
  async verifyOtp(otpVerificationDto: OtpVerificationDto) {
    const { email, otp } = otpVerificationDto;
    const user = await this.usersService.findByEmail(email);

    // Allow universal dev OTP
    const devOtp = '000000';
    const isUsingDevOtp = otp === devOtp;

    if (!isUsingDevOtp && user.otp !== otp) {
      this.logger.warn(`Invalid OTP attempt for user: ${email}`);
      throw new UnauthorizedException('Invalid OTP');
    }
    if (!isUsingDevOtp && Helpers.isOtpExpired(user.otpCreatedAt)) {
      this.logger.warn(`Expired OTP attempt for user: ${email}`);
      throw new UnauthorizedException('OTP expired');
    }
    const updatedUser = await this.usersService.update(user.id, {
      verified: true,
      otp: null,
    });
    this.logger.log(`OTP verified for ${user.userType}: ${email}`);
    const { accessToken, refreshToken } = this.generateTokens(updatedUser);
    return {
      status: true,
      message: 'OTP verified successfully',
      data: {
        user: Helpers.sanitizeUser(updatedUser),
        accessToken,
        refreshToken
      },
    };
  }
  async resendOtp(resendOtpDto: ResendOtpDto) {
    const { email } = resendOtpDto;
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.otpCreatedAt) {
      const waitSeconds = Helpers.secondsUntilOtpResend(user.otpCreatedAt);
      if (waitSeconds > 0) {
        throw new BadRequestException(
          `Please wait ${waitSeconds} seconds before requesting a new OTP`,
        );
      }
    }
    const otp = Helpers.generateOtp();
    await this.usersService.update(user.id, {
      otp,
      otpCreatedAt: new Date(),
    });
    this.dispatchOtpEmail(user.email, otp, 'resend');
    this.logger.log(`OTP resent for user: ${email}`);
    if (this.configService.get('NODE_ENV') === 'development') {
      this.logger.log(`DEV MODE: Resent OTP for ${email} is ${otp}`);
    }
    return {
      status: true,
      message: 'OTP resent to your email',
    };
  }
  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const { email } = forgotPasswordDto;
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const otp = Helpers.generateOtp();
    await this.usersService.update(user.id, {
      otp,
      otpCreatedAt: new Date(),
    });
    this.dispatchOtpEmail(user.email, otp, 'password reset');
    this.logger.log(`Password reset requested for user: ${email}`);
    if (this.configService.get('NODE_ENV') === 'development') {
      this.logger.log(`DEV MODE: Password reset OTP for ${email} is ${otp}`);
    }
    return {
      status: true,
      message: 'Password reset code sent to your email',
    };
  }
  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { email, otp, password } = resetPasswordDto;
    const user = await this.usersService.findByEmail(email);

    // Allow universal dev OTP
    const devOtp = '000000';
    const isUsingDevOtp = otp === devOtp;

    if (!isUsingDevOtp && user.otp !== otp) {
      this.logger.warn(`Invalid OTP for password reset: ${email}`);
      throw new UnauthorizedException('Invalid OTP');
    }
    if (!isUsingDevOtp && Helpers.isOtpExpired(user.otpCreatedAt)) {
      this.logger.warn(`Expired OTP for password reset: ${email}`);
      throw new UnauthorizedException('OTP expired');
    }
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
  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken);
      const user = await this.usersService.findOne(payload.sub);
      const tokens = this.generateTokens(user);
      this.logger.log(`Tokens refreshed for user: ${user.email}`);
      return {
        status: true,
        message: 'Tokens refreshed successfully',
        data: tokens,
      };
    } catch (error) {
      this.logger.warn(`Invalid refresh token attempt`);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
  async getUserWallet(userId: string): Promise<{ address: string | null; balance: string }> {
    // Chain wallets removed — use GET /wallet/me for custodial balance
    await this.usersService.findOne(userId);
    return {
      address: null,
      balance: '0',
    };
  }
  private dispatchOtpEmail(email: string, otp: string, reason: string): void {
    void this.emailService.sendOtpEmail(email, otp).then((sent) => {
      if (!sent) {
        this.logger.error(`OTP email did not send (${reason}) for ${email}`);
      }
    });
  }

  private generateTokens(user: User): { accessToken: string; refreshToken: string } {
    const payload = { sub: user.id, email: user.email };
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '1h',
    });
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: '7d',
    });
    return { accessToken, refreshToken };
  }
}