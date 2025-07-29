import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { OAuthController } from './oauth.controller';
import { OAuthService } from './oauth.service';
import { GoogleStrategy } from './google.strategy';
import { OAuthProvider } from './oauth.entity';
import { User } from '../../users/entities/user.entity';
import { Web3Module } from '../../web3/web3.module';
@Module({
  imports: [
    TypeOrmModule.forFeature([OAuthProvider, User]),
    Web3Module,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: { expiresIn: configService.get('JWT_EXPIRATION', '7d') },
      }),
    }),
  ],
  controllers: [OAuthController],
  providers: [
    OAuthService,
    GoogleStrategy
  ],
  exports: [OAuthService],
})
export class OAuthModule {}