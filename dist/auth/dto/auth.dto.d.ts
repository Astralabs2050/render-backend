import { UserType } from '../../users/entities/user.entity';
export declare class RegisterDto {
    email: string;
    password: string;
    fullName: string;
    role: UserType;
}
export declare class LoginDto {
    email: string;
    password: string;
}
export declare class OtpVerificationDto {
    email: string;
    otp: string;
}
export declare class ResendOtpDto {
    email: string;
}
export declare class ForgotPasswordDto {
    email: string;
}
export declare class ResetPasswordDto {
    email: string;
    otp: string;
    password: string;
}
export declare class RefreshTokenDto {
    refreshToken: string;
}
