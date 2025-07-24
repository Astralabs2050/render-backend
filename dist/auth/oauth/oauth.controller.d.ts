import { ConfigService } from '@nestjs/config';
import { OAuthService } from './oauth.service';
import { Response } from 'express';
export declare class OAuthController {
    private readonly oauthService;
    private readonly configService;
    constructor(oauthService: OAuthService, configService: ConfigService);
    signupWithGoogle(): void;
    signinWithGoogle(): void;
    googleAuthCallback(req: any, res: Response): Response<any, Record<string, any>>;
    signupWithDiscord(): void;
    signinWithDiscord(): void;
    discordAuthCallback(req: any, res: Response): Response<any, Record<string, any>>;
    signupWithTwitter(): void;
    signinWithTwitter(): void;
    twitterAuthCallback(req: any, res: Response): Response<any, Record<string, any>>;
}
