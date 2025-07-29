import { Controller, Get, UseGuards, Req, Res } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { OAuthService } from './oauth.service';
import { Response } from 'express';
@Controller('auth')
export class OAuthController {
  constructor(private readonly oauthService: OAuthService) {}
  @Get('signup/google')
  @UseGuards(AuthGuard('google'))
  signupWithGoogle() {}
  @Get('signin/google')
  @UseGuards(AuthGuard('google'))
  signinWithGoogle() {}
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  googleAuthCallback(@Req() req, @Res() res: Response) {
    return this.oauthService.handleOAuthCallback(req.user, 'google', res);
  }
  @Get('signup/discord')
  @UseGuards(AuthGuard('discord'))
  signupWithDiscord() {}
  @Get('signin/discord')
  @UseGuards(AuthGuard('discord'))
  signinWithDiscord() {}
  @Get('discord/callback')
  @UseGuards(AuthGuard('discord'))
  discordAuthCallback(@Req() req, @Res() res: Response) {
    return this.oauthService.handleOAuthCallback(req.user, 'discord', res);
  }
  @Get('signup/twitter')
  @UseGuards(AuthGuard('twitter'))
  signupWithTwitter() {}
  @Get('signin/twitter')
  @UseGuards(AuthGuard('twitter'))
  signinWithTwitter() {}
  @Get('twitter/callback')
  @UseGuards(AuthGuard('twitter'))
  twitterAuthCallback(@Req() req, @Res() res: Response) {
    return this.oauthService.handleOAuthCallback(req.user, 'twitter', res);
  }
}