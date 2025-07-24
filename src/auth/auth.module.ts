import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { JwtStrategy } from './strategies/jwt.strategy';
import { OAuthModule } from './oauth/oauth.module';
import { RoleGuard } from './guards/role.guard';
import { Web3Module } from '../web3/web3.module';

@Module({
  imports: [
    UsersModule,
    Web3Module,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: configService.get<string>('JWT_EXPIRATION', '7d') },
      }),
      inject: [ConfigService],
    }),
    OAuthModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, RoleGuard],
  exports: [AuthService, RoleGuard],
})
export class AuthModule {}