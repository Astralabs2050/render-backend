import { Injectable, UnauthorizedException, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { RegisterDto, LoginDto, OtpVerificationDto, ResendOtpDto, ForgotPasswordDto, ResetPasswordDto } from './dto/auth.dto';
import { User, UserType } from '../users/entities/user.entity';
import { Helpers } from '../common/utils/helpers';
import { EmailService } from '../common/services/email.service';
import { ThirdwebService } from '../web3/services/thirdweb.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
    private thirdwebService: ThirdwebService,
  ) { }

  async register(registerDto: RegisterDto) {
    // Create user with OTP (no wallet yet - wallet created after verification)
    const otp = Helpers.generateOtp();
    const user = await this.usersService.create({
      ...registerDto,
      userType: registerDto.role,
      otp,
      otpCreatedAt: new Date(),
      // No wallet fields - these will be set after verification
    });

    // Send OTP email
    await this.emailService.sendOtpEmail(user.email, otp);
    this.logger.log(`Registered new user: ${user.email} with OTP`);

    // In development, log the OTP for testing
    if (this.configService.get('NODE_ENV') === 'development') {
      this.logger.debug(`DEV MODE: OTP for ${user.email} is ${otp}`);
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
    const { email, password } = loginDto;

    // Find user
    const user = await this.usersService.findByEmail(email);

    // Check if user is verified
    if (!user.verified) {
      // Generate new OTP and send it
      const otp = Helpers.generateOtp();

      // Update user with new OTP
      await this.usersService.update(user.id, {
        otp,
        otpCreatedAt: new Date(),
      });

      // Send OTP email
      await this.emailService.sendOtpEmail(user.email, otp);
      this.logger.log(`OTP sent to unverified user: ${email}`);

      // In development, log the OTP for testing
      if (this.configService.get('NODE_ENV') === 'development') {
        this.logger.debug(`DEV MODE: OTP for unverified login ${email} is ${otp}`);
      }

      throw new UnauthorizedException('Account not verified. We\'ve sent a new OTP to your email. Please verify your account first.');
    }

    // Validate password
    const isPasswordValid = await Helpers.comparePassword(password, user.password);
    if (!isPasswordValid) {
      this.logger.warn(`Failed login attempt for user: ${email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate tokens
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

    // Generate wallet for the user after successful verification
    const wallet = await this.thirdwebService.generateWallet();
    const encryptedPrivateKey = Helpers.encryptPrivateKey(wallet.privateKey);

    // Update user with verification and wallet
    await this.usersService.update(user.id, {
      verified: true,
      otp: null,
      walletAddress: wallet.address,
      walletPrivateKey: encryptedPrivateKey,
    });

    this.logger.log(`OTP verified and wallet created for user: ${email}`);
    return {
      status: true,
      message: 'OTP verified successfully, wallet created',
      data: {
        walletAddress: wallet.address,
      },
    };
  }

  async resendOtp(resendOtpDto: ResendOtpDto) {
    const { email } = resendOtpDto;

    // Find user
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if OTP was recently sent (within 15 minutes)
    if (user.otpCreatedAt && !Helpers.isOtpExpired(user.otpCreatedAt)) {
      const now = new Date();
      const timeDiff = now.getTime() - user.otpCreatedAt.getTime();
      const minutesLeft = Math.ceil((15 * 60 * 1000 - timeDiff) / (60 * 1000));

      throw new BadRequestException(`Please wait ${minutesLeft} minutes before requesting a new OTP`);
    }

    // Generate new OTP
    const otp = Helpers.generateOtp();

    // Update user
    await this.usersService.update(user.id, {
      otp,
      otpCreatedAt: new Date(),
    });

    // Send OTP email
    await this.emailService.sendOtpEmail(user.email, otp);
    this.logger.log(`OTP resent for user: ${email}`);

    // In development, log the OTP for testing
    if (this.configService.get('NODE_ENV') === 'development') {
      this.logger.debug(`DEV MODE: Resent OTP for ${email} is ${otp}`);
    }

    return {
      status: true,
      message: 'OTP resent to your email',
    };
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const { email } = forgotPasswordDto;

    // Find user
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Generate OTP
    const otp = Helpers.generateOtp();

    // Update user
    await this.usersService.update(user.id, {
      otp,
      otpCreatedAt: new Date(),
    });

    // Send OTP email
    await this.emailService.sendOtpEmail(user.email, otp);
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

  async refreshToken(refreshToken: string) {
    try {
      // Verify the refresh token
      const payload = this.jwtService.verify(refreshToken);

      // Find user
      const user = await this.usersService.findOne(payload.sub);

      // Generate new tokens
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

  async getUserWallet(userId: string): Promise<{ address: string; balance: string }> {
    const user = await this.usersService.findOne(userId);

    if (!user.walletAddress) {
      throw new NotFoundException('User wallet not found');
    }

    const balance = await this.thirdwebService.getWalletBalance(user.walletAddress);

    return {
      address: user.walletAddress,
      balance,
    };
  }

  private generateTokens(user: User): { accessToken: string; refreshToken: string } {
    const payload = { sub: user.id, email: user.email };

    // Access token
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '1h',
    });

    // Refresh token
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: '7d',
    });

    return { accessToken, refreshToken };
  }
}