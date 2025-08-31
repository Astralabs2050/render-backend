import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserType } from '../../users/entities/user.entity';
import { OAuthProvider } from './oauth.entity';
import { Helpers } from '../../common/utils/helpers';
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
@Injectable()
export class OAuthService {
  private readonly logger = new Logger(OAuthService.name);
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(OAuthProvider)
    private oauthRepository: Repository<OAuthProvider>,
    private jwtService: JwtService,
    private thirdwebService: ThirdwebService,
  ) {}
  async validateOAuthLogin(oauthUser: OAuthUser) {
    try {
      let oauthProvider = await this.oauthRepository.findOne({
        where: {
          provider: oauthUser.provider,
          providerId: oauthUser.providerId,
        },
        relations: ['user'],
      });
      let user: User;
      if (oauthProvider) {
        oauthProvider.accessToken = oauthUser.accessToken;
        if (oauthUser.refreshToken) {
          oauthProvider.refreshToken = oauthUser.refreshToken;
        }
        await this.oauthRepository.save(oauthProvider);
        user = oauthProvider.user;
        if (!user.walletAddress) {
          const wallet = await this.thirdwebService.generateWallet();
          const encryptedPrivateKey = Helpers.encryptPrivateKey(wallet.privateKey);
          user.walletAddress = wallet.address;
          user.walletPrivateKey = encryptedPrivateKey;
          await this.userRepository.save(user);
          this.logger.log(`Created wallet for existing user: ${user.email} - ${wallet.address}`);
        }
        this.logger.log(`User logged in via ${oauthUser.provider}: ${user.email}`);
      } else {
        if (oauthUser.email) {
          user = await this.userRepository.findOne({
            where: { email: oauthUser.email },
          });
        }
        if (!user && oauthUser.email) {
          const wallet = await this.thirdwebService.generateWallet();
          const encryptedPrivateKey = Helpers.encryptPrivateKey(wallet.privateKey);
          user = this.userRepository.create({
            email: oauthUser.email,
            fullName: oauthUser.fullName,
            verified: true, 
            userType: UserType.CREATOR, 
            walletAddress: wallet.address,
            walletPrivateKey: encryptedPrivateKey,
          });
          await this.userRepository.save(user);
          this.logger.log(`Created new user via ${oauthUser.provider}: ${user.email} with wallet: ${wallet.address}`);
        } else if (!user) {
          throw new UnauthorizedException('Email not provided by OAuth provider');
        } else if (user && !user.walletAddress) {
          const wallet = await this.thirdwebService.generateWallet();
          const encryptedPrivateKey = Helpers.encryptPrivateKey(wallet.privateKey);
          user.walletAddress = wallet.address;
          user.walletPrivateKey = encryptedPrivateKey;
          await this.userRepository.save(user);
          this.logger.log(`Created wallet for existing user: ${user.email} - ${wallet.address}`);
        }
        oauthProvider = this.oauthRepository.create({
          provider: oauthUser.provider,
          providerId: oauthUser.providerId,
          user,
          accessToken: oauthUser.accessToken,
          refreshToken: oauthUser.refreshToken,
          profile: {
            name: oauthUser.fullName,
            picture: oauthUser.picture,
          },
        });
        await this.oauthRepository.save(oauthProvider);
        this.logger.log(`Linked ${oauthUser.provider} account to user: ${user.email}`);
      }
      const payload = { sub: user.id, email: user.email };
      const token = this.jwtService.sign(payload);
      return {
        user: Helpers.sanitizeUser(user),
        token,
        walletAddress: user.walletAddress,
      };
    } catch (error) {
      this.logger.error(`OAuth login error: ${error.message}`, error.stack);
      throw new UnauthorizedException('Failed to authenticate with social provider');
    }
  }
  handleOAuthCallback(authResult: any, provider: string, res: any) {
    const { token, user } = authResult;
    const providerColors = {
      google: '#28a745',
      discord: '#7289da', 
      twitter: '#1da1f2'
    };
    const successHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${provider.charAt(0).toUpperCase() + provider.slice(1)} OAuth Success</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f8f9fa; }
          .success { background: #d4edda; color: #155724; padding: 20px; border-radius: 10px; margin: 20px auto; max-width: 500px; }
          .token { background: #f8f9fa; padding: 15px; border-radius: 5px; font-family: monospace; word-break: break-all; margin: 20px 0; }
          .btn { background: ${providerColors[provider]}; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; }
        </style>
      </head>
      <body>
        <div class="success">
          <h2>${provider.charAt(0).toUpperCase() + provider.slice(1)} Authentication Successful!</h2>
          <p>Welcome, ${user.fullName}!</p>
          <p>Email: ${user.email}</p>
          <p>Wallet: ${user.walletAddress}</p>
          <div class="token">JWT Token: ${token}</div>
          <button class="btn" onclick="window.close()">Close Window</button>
        </div>
        <script>
          setTimeout(() => window.close(), 5000);
          if (window.opener) {
            window.opener.postMessage({
              type: 'oauth-success',
              provider: '${provider}',
              token: '${token}',
              user: ${JSON.stringify(user)}
            }, '*');
          }
        </script>
      </body>
      </html>
    `;
    res.send(successHtml);
  }
}