import { Controller, Get, UseGuards, Req, Res, Post, Body } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { OAuthService } from './oauth.service';

@Controller('auth')
export class OAuthController {
  constructor(private readonly oauthService: OAuthService) {}

  // Google OAuth
  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth() {
    // Initiates the Google OAuth2 login flow
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  googleAuthCallback(@Req() req) {
    // Google OAuth2 callback route
    return req.user;
  }

  // Discord OAuth
  @Get('discord')
  @UseGuards(AuthGuard('discord'))
  discordAuth() {
    // Initiates the Discord OAuth2 login flow
  }

  @Get('discord/callback')
  @UseGuards(AuthGuard('discord'))
  discordAuthCallback(@Req() req) {
    // Discord OAuth2 callback route
    return req.user;
  }

  // Twitter OAuth
  @Get('twitter')
  @UseGuards(AuthGuard('twitter'))
  twitterAuth() {
    // Initiates the Twitter OAuth login flow
  }

  @Get('twitter/callback')
  @UseGuards(AuthGuard('twitter'))
  twitterAuthCallback(@Req() req) {
    // Twitter OAuth callback route
    return req.user;
  }
}