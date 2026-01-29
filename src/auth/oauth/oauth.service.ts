import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
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
    private configService: ConfigService,
  ) { }
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

    // Get frontend URL from environment (defaults to localhost for dev)
    const frontendUrl = this.configService.get('FRONTEND_URL', 'http://localhost:3001');

    // Encode user data for URL
    const userData = encodeURIComponent(JSON.stringify({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      walletAddress: user.walletAddress,
    }));

    // Redirect to frontend dashboard with token in hash fragment
    // Hash fragments (#) are NOT sent to server, making them more secure
    const redirectUrl = `${frontendUrl}/dashboard#token=${token}&user=${userData}&provider=${provider}`;

    this.logger.log(`Redirecting ${user.email} to ${frontendUrl}/dashboard after ${provider} OAuth`);

    res.redirect(redirectUrl);
  }
}