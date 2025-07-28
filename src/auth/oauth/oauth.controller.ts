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
    const { token, user } = req.user;
    
    // Create success page with token and user data
    const successHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Google OAuth Success</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f8f9fa; }
          .success { background: #d4edda; color: #155724; padding: 20px; border-radius: 10px; margin: 20px auto; max-width: 500px; }
          .token { background: #f8f9fa; padding: 15px; border-radius: 5px; font-family: monospace; word-break: break-all; margin: 20px 0; }
          .btn { background: #28a745; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; }
        </style>
      </head>
      <body>
        <div class="success">
          <h2> Google Authentication Successful!</h2>
          <p>Welcome, ${user.fullName}!</p>
          <p>Email: ${user.email}</p>
          <p>Wallet: ${user.walletAddress}</p>
          <div class="token">JWT Token: ${token}</div>
          <button class="btn" onclick="window.close()">Close Window</button>
        </div>
        <script>
          // Auto-close after 5 seconds
          setTimeout(() => window.close(), 5000);
          
          // Try to communicate with parent window
          if (window.opener) {
            window.opener.postMessage({
              type: 'oauth-success',
              provider: 'google',
              token: '${token}',
              user: ${JSON.stringify(user)}
            }, '*');
          }
        </script>
      </body>
      </html>
    `;
    
    return res.send(successHtml);
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
    const { token, user } = req.user;
    
    // Create success page with token and user data
    const successHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Discord OAuth Success</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f8f9fa; }
          .success { background: #d4edda; color: #155724; padding: 20px; border-radius: 10px; margin: 20px auto; max-width: 500px; }
          .token { background: #f8f9fa; padding: 15px; border-radius: 5px; font-family: monospace; word-break: break-all; margin: 20px 0; }
          .btn { background: #7289da; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; }
        </style>
      </head>
      <body>
        <div class="success">
          <h2> Discord Authentication Successful!</h2>
          <p>Welcome, ${user.fullName}!</p>
          <p>Email: ${user.email}</p>
          <p>Wallet: ${user.walletAddress}</p>
          <div class="token">JWT Token: ${token}</div>
          <button class="btn" onclick="window.close()">Close Window</button>
        </div>
        <script>
          // Auto-close after 5 seconds
          setTimeout(() => window.close(), 5000);
          
          // Try to communicate with parent window
          if (window.opener) {
            window.opener.postMessage({
              type: 'oauth-success',
              provider: 'discord',
              token: '${token}',
              user: ${JSON.stringify(user)}
            }, '*');
          }
        </script>
      </body>
      </html>
    `;
    
    return res.send(successHtml);
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
    const { token, user } = req.user;
    
    // Create success page with token and user data
    const successHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Twitter OAuth Success</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f8f9fa; }
          .success { background: #d4edda; color: #155724; padding: 20px; border-radius: 10px; margin: 20px auto; max-width: 500px; }
          .token { background: #f8f9fa; padding: 15px; border-radius: 5px; font-family: monospace; word-break: break-all; margin: 20px 0; }
          .btn { background: #1da1f2; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; }
        </style>
      </head>
      <body>
        <div class="success">
          <h2> Twitter Authentication Successful!</h2>
          <p>Welcome, ${user.fullName}!</p>
          <p>Email: ${user.email}</p>
          <p>Wallet: ${user.walletAddress}</p>
          <div class="token">JWT Token: ${token}</div>
          <button class="btn" onclick="window.close()">Close Window</button>
        </div>
        <script>
          // Auto-close after 5 seconds
          setTimeout(() => window.close(), 5000);
          
          // Try to communicate with parent window
          if (window.opener) {
            window.opener.postMessage({
              type: 'oauth-success',
              provider: 'twitter',
              token: '${token}',
              user: ${JSON.stringify(user)}
            }, '*');
          }
        </script>
      </body>
      </html>
    `;
    
    return res.send(successHtml);
  }
}