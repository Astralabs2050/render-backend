import { BaseEntity } from '../../common/entities/base.entity';
import { OAuthProvider } from '../../auth/oauth/oauth.entity';
export declare enum UserType {
    CREATOR = "creator",
    MAKER = "maker"
}
export declare class User extends BaseEntity {
    email: string;
    password: string;
    fullName: string;
    verified: boolean;
    otp: string;
    otpCreatedAt: Date;
    userType: UserType;
    oauthProviders: OAuthProvider[];
}
