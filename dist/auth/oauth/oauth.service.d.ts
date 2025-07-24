import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { OAuthProvider } from './oauth.entity';
import { ThirdwebService } from '../../web3/services/thirdweb.service';
interface OAuthUser {
    provider: string;
    providerId: string;
    email: string;
    fullName?: string;
    firstName?: string;
    lastName?: string;
    picture?: string;
    accessToken: string;
    refreshToken?: string;
}
export declare class OAuthService {
    private userRepository;
    private oauthRepository;
    private jwtService;
    private thirdwebService;
    private readonly logger;
    constructor(userRepository: Repository<User>, oauthRepository: Repository<OAuthProvider>, jwtService: JwtService, thirdwebService: ThirdwebService);
    validateOAuthLogin(oauthUser: OAuthUser): Promise<{
        user: Partial<User>;
        token: string;
        walletAddress: string;
    }>;
}
export {};
