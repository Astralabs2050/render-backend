import { UserType } from '../entities/user.entity';
export declare class CreateUserDto {
    email: string;
    password: string;
    fullName?: string;
    userType?: UserType;
    otp?: string;
    otpCreatedAt?: Date;
}
