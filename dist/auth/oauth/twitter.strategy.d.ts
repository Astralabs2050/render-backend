import { Strategy } from 'passport-twitter';
import { ConfigService } from '@nestjs/config';
import { OAuthService } from './oauth.service';
declare const TwitterStrategy_base: new (...args: any[]) => Strategy;
export declare class TwitterStrategy extends TwitterStrategy_base {
    private configService;
    private oauthService;
    constructor(configService: ConfigService, oauthService: OAuthService);
    validate(token: string, tokenSecret: string, profile: any, done: Function): Promise<any>;
}
export {};
