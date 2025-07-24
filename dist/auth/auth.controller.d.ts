import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, OtpVerificationDto, ResendOtpDto, ForgotPasswordDto, ResetPasswordDto, RefreshTokenDto } from './dto/auth.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    signupWithEmail(registerDto: RegisterDto): Promise<{
        status: boolean;
        message: string;
    }>;
    signinWithEmail(loginDto: LoginDto): Promise<{
        status: boolean;
        message: string;
        data: {
            user: Partial<import("../users/entities/user.entity").User>;
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
    refreshToken(refreshTokenDto: RefreshTokenDto): Promise<{
        status: boolean;
        message: string;
        data: {
            accessToken: string;
            refreshToken: string;
        };
    }>;
    getProfile(req: any): any;
}
