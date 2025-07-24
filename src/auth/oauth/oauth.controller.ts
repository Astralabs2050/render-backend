import { Controller, Get, UseGuards, Req, Res, Post, Body } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { OAuthService } from './oauth.service';
import { Response } from 'express';

@Controller('auth')
export class OAuthController {
  constructor(
    private readonly oauthService: OAuthService,
    private readonly configService: ConfigService
  ) {}

  // Google OAuth
  @Get('signup/google')
  @UseGuards(AuthGuard('google'))
  signupWithGoogle() {
    // Initiates the Google OAuth2 login flow
  }

  @Get('signin/google')
  @UseGuards(AuthGuard('google'))
  signinWithGoogle() {
    // Initiates the Google OAuth2 login flow
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  googleAuthCallback(@Req() req, @Res() res: Response) {
    // Google OAuth2 callback route
    const { token } = req.user;
    
    // Return JSON response with token
    return res.status(200).json({
      status: true,
      message: 'Google authentication successful',
      data: req.user
    });
  }

  // Discord OAuth
  @Get('signup/discord')
  @UseGuards(AuthGuard('discord'))
  signupWithDiscord() {
    // Initiates the Discord OAuth2 login flow
  }

  @Get('signin/discord')
  @UseGuards(AuthGuard('discord'))
  signinWithDiscord() {
    // Initiates the Discord OAuth2 login flow
  }

  @Get('discord/callback')
  @UseGuards(AuthGuard('discord'))
  discordAuthCallback(@Req() req, @Res() res: Response) {
    // Discord OAuth2 callback route
    const { token } = req.user;
    
    // Return JSON response with token
    return res.status(200).json({
      status: true,
      message: 'Discord authentication successful',
      data: req.user
    });
  }

  // Twitter OAuth
  @Get('signup/twitter')
  @UseGuards(AuthGuard('twitter'))
  signupWithTwitter() {
    // Initiates the Twitter OAuth login flow
  }

  @Get('signin/twitter')
  @UseGuards(AuthGuard('twitter'))
  signinWithTwitter() {
    // Initiates the Twitter OAuth login flow
  }

  @Get('twitter/callback')
  @UseGuards(AuthGuard('twitter'))
  twitterAuthCallback(@Req() req, @Res() res: Response) {
    // Twitter OAuth callback route
    const { token } = req.user;
    
    // Return JSON response with token
    return res.status(200).json({
      status: true,
      message: 'Twitter authentication successful',
      data: req.user
    });
  }
}