import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-twitter-oauth2';
import { ConfigService } from '@nestjs/config';
import { OAuthService } from './oauth.service';

@Injectable()
export class TwitterStrategy extends PassportStrategy(Strategy, 'twitter') {
  constructor(
    private configService: ConfigService,
    private oauthService: OAuthService,
  ) {
    super({
      clientID: configService.get('TWITTER_CLIENT_ID'),
      clientSecret: configService.get('TWITTER_CLIENT_SECRET'),
      callbackURL: configService.get('TWITTER_CALLBACK_URL'),
      includeEmail: true,
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: Function,
  ): Promise<any> {
    const { id, displayName, emails, photos } = profile;
    
    const user = {
      provider: 'twitter',
      providerId: id,
      email: emails && emails[0] ? emails[0].value : null,
      fullName: displayName,
      picture: photos && photos[0] ? photos[0].value : null,
      accessToken,
      refreshToken,
    };
    
    const result = await this.oauthService.validateOAuthLogin(user);
    done(null, result);
  }
}