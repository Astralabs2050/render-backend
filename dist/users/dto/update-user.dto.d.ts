import { CreateUserDto } from './create-user.dto';
export declare class UpdateUserDto implements Partial<CreateUserDto> {
    email?: string;
    password?: string;
    fullName?: string;
    language?: string;
    otp?: string | null;
    otpCreatedAt?: Date;
    verified?: boolean;
}
