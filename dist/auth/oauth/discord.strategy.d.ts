import { Strategy } from 'passport-discord';
import { ConfigService } from '@nestjs/config';
import { OAuthService } from './oauth.service';
declare const DiscordStrategy_base: new (...args: any[]) => Strategy;
export declare class DiscordStrategy extends DiscordStrategy_base {
    private configService;
    private oauthService;
    constructor(configService: ConfigService, oauthService: OAuthService);
    validate(accessToken: string, refreshToken: string, profile: any, done: Function): Promise<any>;
}
export {};
