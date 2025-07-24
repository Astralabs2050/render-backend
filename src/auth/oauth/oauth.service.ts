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
      // Check if OAuth account exists
      let oauthProvider = await this.oauthRepository.findOne({
        where: {
          provider: oauthUser.provider,
          providerId: oauthUser.providerId,
        },
        relations: ['user'],
      });

      let user: User;

      if (oauthProvider) {
        // OAuth account exists, update tokens
        oauthProvider.accessToken = oauthUser.accessToken;
        if (oauthUser.refreshToken) {
          oauthProvider.refreshToken = oauthUser.refreshToken;
        }
        await this.oauthRepository.save(oauthProvider);
        
        user = oauthProvider.user;
        
        // Check if user has a wallet, create one if not
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
        // OAuth account doesn't exist
        // Check if user with this email exists
        if (oauthUser.email) {
          user = await this.userRepository.findOne({
            where: { email: oauthUser.email },
          });
        }

        if (!user && oauthUser.email) {
          // Generate wallet for the new user
          const wallet = await this.thirdwebService.generateWallet();
          const encryptedPrivateKey = Helpers.encryptPrivateKey(wallet.privateKey);
          
          // Create new user with encrypted wallet
          user = this.userRepository.create({
            email: oauthUser.email,
            fullName: oauthUser.fullName,
            verified: true, // OAuth users are pre-verified
            userType: UserType.CREATOR, // Default to creator
            walletAddress: wallet.address,
            walletPrivateKey: encryptedPrivateKey,
          });
          
          await this.userRepository.save(user);
          this.logger.log(`Created new user via ${oauthUser.provider}: ${user.email} with wallet: ${wallet.address}`);
        } else if (!user) {
          throw new UnauthorizedException('Email not provided by OAuth provider');
        } else if (user && !user.walletAddress) {
          // Existing user without wallet - create one
          const wallet = await this.thirdwebService.generateWallet();
          const encryptedPrivateKey = Helpers.encryptPrivateKey(wallet.privateKey);
          user.walletAddress = wallet.address;
          user.walletPrivateKey = encryptedPrivateKey;
          await this.userRepository.save(user);
          this.logger.log(`Created wallet for existing user: ${user.email} - ${wallet.address}`);
        }

        // Create OAuth provider link
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

      // Generate JWT token
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
}