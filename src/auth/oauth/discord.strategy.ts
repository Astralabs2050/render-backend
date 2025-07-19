import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-discord';
import { ConfigService } from '@nestjs/config';
import { OAuthService } from './oauth.service';

@Injectable()
export class DiscordStrategy extends PassportStrategy(Strategy, 'discord') {
  constructor(
    private configService: ConfigService,
    private oauthService: OAuthService,
  ) {
    super({
      clientID: configService.get('DISCORD_CLIENT_ID'),
      clientSecret: configService.get('DISCORD_CLIENT_SECRET'),
      callbackURL: configService.get('DISCORD_CALLBACK_URL'),
      scope: ['identify', 'email'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: Function,
  ): Promise<any> {
    const { id, username, email, avatar } = profile;
    
    const user = {
      provider: 'discord',
      providerId: id,
      email: email,
      fullName: username,
      picture: avatar ? `https://cdn.discordapp.com/avatars/${id}/${avatar}.png` : null,
      accessToken,
      refreshToken,
    };
    
    const result = await this.oauthService.validateOAuthLogin(user);
    done(null, result);
  }
}