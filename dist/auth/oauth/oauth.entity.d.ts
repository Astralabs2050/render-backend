import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
export declare class OAuthProvider extends BaseEntity {
    provider: string;
    providerId: string;
    profile: Record<string, any>;
    accessToken: string;
    refreshToken: string;
    user: User;
    userId: string;
}
