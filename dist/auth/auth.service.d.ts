import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { RegisterDto, LoginDto, OtpVerificationDto, ResendOtpDto, ForgotPasswordDto, ResetPasswordDto } from './dto/auth.dto';
import { User } from '../users/entities/user.entity';
import { EmailService } from '../common/services/email.service';
import { ThirdwebService } from '../web3/services/thirdweb.service';
export declare class AuthService {
    private usersService;
    private jwtService;
    private configService;
    private emailService;
    private thirdwebService;
    private readonly logger;
    constructor(usersService: UsersService, jwtService: JwtService, configService: ConfigService, emailService: EmailService, thirdwebService: ThirdwebService);
    register(registerDto: RegisterDto): Promise<{
        status: boolean;
        message: string;
        walletAddress: string;
    }>;
    login(loginDto: LoginDto): Promise<{
        status: boolean;
        message: string;
        data: {
            user: Partial<User>;
            accessToken: string;
            refreshToken: string;
        };
    }>;
    verifyOtp(otpVerificationDto: OtpVerificationDto): Promise<{
        status: boolean;
        message: string;
    }>;
    resendOtp(resendOtpDto: ResendOtpDto): Promise<{
        status: boolean;
        message: string;
    }>;
    forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<{
        status: boolean;
        message: string;
    }>;
    resetPassword(resetPasswordDto: ResetPasswordDto): Promise<{
        status: boolean;
        message: string;
    }>;
    refreshToken(refreshToken: string): Promise<{
        status: boolean;
        message: string;
        data: {
            accessToken: string;
            refreshToken: string;
        };
    }>;
    getUserWallet(userId: string): Promise<{
        address: string;
        balance: string;
    }>;
    private generateTokens;
}
