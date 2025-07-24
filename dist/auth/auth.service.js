"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const users_service_1 = require("../users/users.service");
const helpers_1 = require("../common/utils/helpers");
const email_service_1 = require("../common/services/email.service");
const thirdweb_service_1 = require("../web3/services/thirdweb.service");
let AuthService = AuthService_1 = class AuthService {
    constructor(usersService, jwtService, configService, emailService, thirdwebService) {
        this.usersService = usersService;
        this.jwtService = jwtService;
        this.configService = configService;
        this.emailService = emailService;
        this.thirdwebService = thirdwebService;
        this.logger = new common_1.Logger(AuthService_1.name);
    }
    async register(registerDto) {
        const wallet = await this.thirdwebService.generateWallet();
        const otp = helpers_1.Helpers.generateOtp();
        const encryptedPrivateKey = helpers_1.Helpers.encryptPrivateKey(wallet.privateKey);
        const user = await this.usersService.create({
            ...registerDto,
            userType: registerDto.role,
            walletAddress: wallet.address,
            walletPrivateKey: encryptedPrivateKey,
            otp,
            otpCreatedAt: new Date(),
        });
        await this.emailService.sendOtpEmail(user.email, otp);
        this.logger.log(`Registered new user: ${user.email} with OTP`);
        if (this.configService.get('NODE_ENV') === 'development') {
            this.logger.debug(`DEV MODE: OTP for ${user.email} is ${otp}`);
        }
        return {
            status: true,
            message: 'Registration successful, OTP sent to your email',
            walletAddress: wallet.address,
        };
    }
    async login(loginDto) {
        const { email, password } = loginDto;
        const user = await this.usersService.findByEmail(email);
        if (!user.verified) {
            const otp = helpers_1.Helpers.generateOtp();
            await this.usersService.update(user.id, {
                otp,
                otpCreatedAt: new Date(),
            });
            await this.emailService.sendOtpEmail(user.email, otp);
            this.logger.log(`OTP sent to unverified user: ${email}`);
            if (this.configService.get('NODE_ENV') === 'development') {
                this.logger.debug(`DEV MODE: OTP for unverified login ${email} is ${otp}`);
            }
            throw new common_1.UnauthorizedException('Account not verified. We\'ve sent a new OTP to your email. Please verify your account first.');
        }
        const isPasswordValid = await helpers_1.Helpers.comparePassword(password, user.password);
        if (!isPasswordValid) {
            this.logger.warn(`Failed login attempt for user: ${email}`);
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const { accessToken, refreshToken } = this.generateTokens(user);
        this.logger.log(`User logged in: ${email}`);
        return {
            status: true,
            message: 'Login successful',
            data: {
                user: helpers_1.Helpers.sanitizeUser(user),
                accessToken,
                refreshToken,
            },
        };
    }
    async verifyOtp(otpVerificationDto) {
        const { email, otp } = otpVerificationDto;
        const user = await this.usersService.findByEmail(email);
        if (user.otp !== otp) {
            this.logger.warn(`Invalid OTP attempt for user: ${email}`);
            throw new common_1.UnauthorizedException('Invalid OTP');
        }
        if (helpers_1.Helpers.isOtpExpired(user.otpCreatedAt)) {
            this.logger.warn(`Expired OTP attempt for user: ${email}`);
            throw new common_1.UnauthorizedException('OTP expired');
        }
        await this.usersService.update(user.id, {
            verified: true,
            otp: null,
        });
        this.logger.log(`OTP verified for user: ${email}`);
        return {
            status: true,
            message: 'OTP verified successfully',
        };
    }
    async resendOtp(resendOtpDto) {
        const { email } = resendOtpDto;
        const user = await this.usersService.findByEmail(email);
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        if (user.otpCreatedAt && !helpers_1.Helpers.isOtpExpired(user.otpCreatedAt)) {
            const now = new Date();
            const timeDiff = now.getTime() - user.otpCreatedAt.getTime();
            const minutesLeft = Math.ceil((15 * 60 * 1000 - timeDiff) / (60 * 1000));
            throw new common_1.BadRequestException(`Please wait ${minutesLeft} minutes before requesting a new OTP`);
        }
        const otp = helpers_1.Helpers.generateOtp();
        await this.usersService.update(user.id, {
            otp,
            otpCreatedAt: new Date(),
        });
        await this.emailService.sendOtpEmail(user.email, otp);
        this.logger.log(`OTP resent for user: ${email}`);
        if (this.configService.get('NODE_ENV') === 'development') {
            this.logger.debug(`DEV MODE: Resent OTP for ${email} is ${otp}`);
        }
        return {
            status: true,
            message: 'OTP resent to your email',
        };
    }
    async forgotPassword(forgotPasswordDto) {
        const { email } = forgotPasswordDto;
        const user = await this.usersService.findByEmail(email);
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const otp = helpers_1.Helpers.generateOtp();
        await this.usersService.update(user.id, {
            otp,
            otpCreatedAt: new Date(),
        });
        await this.emailService.sendOtpEmail(user.email, otp);
        this.logger.log(`Password reset requested for user: ${email}`);
        if (this.configService.get('NODE_ENV') === 'development') {
            this.logger.debug(`DEV MODE: Password reset OTP for ${email} is ${otp}`);
        }
        return {
            status: true,
            message: 'Password reset code sent to your email',
        };
    }
    async resetPassword(resetPasswordDto) {
        const { email, otp, password } = resetPasswordDto;
        const user = await this.usersService.findByEmail(email);
        if (user.otp !== otp) {
            this.logger.warn(`Invalid OTP for password reset: ${email}`);
            throw new common_1.UnauthorizedException('Invalid OTP');
        }
        if (helpers_1.Helpers.isOtpExpired(user.otpCreatedAt)) {
            this.logger.warn(`Expired OTP for password reset: ${email}`);
            throw new common_1.UnauthorizedException('OTP expired');
        }
        await this.usersService.update(user.id, {
            password,
            otp: null,
        });
        this.logger.log(`Password reset successful for user: ${email}`);
        return {
            status: true,
            message: 'Password reset successful',
        };
    }
    async refreshToken(refreshToken) {
        try {
            const payload = this.jwtService.verify(refreshToken);
            const user = await this.usersService.findOne(payload.sub);
            const tokens = this.generateTokens(user);
            this.logger.log(`Tokens refreshed for user: ${user.email}`);
            return {
                status: true,
                message: 'Tokens refreshed successfully',
                data: tokens,
            };
        }
        catch (error) {
            this.logger.warn(`Invalid refresh token attempt`);
            throw new common_1.UnauthorizedException('Invalid refresh token');
        }
    }
    async getUserWallet(userId) {
        const user = await this.usersService.findOne(userId);
        if (!user.walletAddress) {
            throw new common_1.NotFoundException('User wallet not found');
        }
        const balance = await this.thirdwebService.getWalletBalance(user.walletAddress);
        return {
            address: user.walletAddress,
            balance,
        };
    }
    generateTokens(user) {
        const payload = { sub: user.id, email: user.email };
        const accessToken = this.jwtService.sign(payload, {
            expiresIn: '1h',
        });
        const refreshToken = this.jwtService.sign(payload, {
            expiresIn: '7d',
        });
        return { accessToken, refreshToken };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        jwt_1.JwtService,
        config_1.ConfigService,
        email_service_1.EmailService,
        thirdweb_service_1.ThirdwebService])
], AuthService);
//# sourceMappingURL=auth.service.js.map