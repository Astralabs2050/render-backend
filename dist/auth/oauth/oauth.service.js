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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var OAuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OAuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const user_entity_1 = require("../../users/entities/user.entity");
const oauth_entity_1 = require("./oauth.entity");
const helpers_1 = require("../../common/utils/helpers");
let OAuthService = OAuthService_1 = class OAuthService {
    constructor(userRepository, oauthRepository, jwtService) {
        this.userRepository = userRepository;
        this.oauthRepository = oauthRepository;
        this.jwtService = jwtService;
        this.logger = new common_1.Logger(OAuthService_1.name);
    }
    async validateOAuthLogin(oauthUser) {
        try {
            let oauthProvider = await this.oauthRepository.findOne({
                where: {
                    provider: oauthUser.provider,
                    providerId: oauthUser.providerId,
                },
                relations: ['user'],
            });
            let user;
            if (oauthProvider) {
                oauthProvider.accessToken = oauthUser.accessToken;
                if (oauthUser.refreshToken) {
                    oauthProvider.refreshToken = oauthUser.refreshToken;
                }
                await this.oauthRepository.save(oauthProvider);
                user = oauthProvider.user;
                this.logger.log(`User logged in via ${oauthUser.provider}: ${user.email}`);
            }
            else {
                if (oauthUser.email) {
                    user = await this.userRepository.findOne({
                        where: { email: oauthUser.email },
                    });
                }
                if (!user && oauthUser.email) {
                    user = this.userRepository.create({
                        email: oauthUser.email,
                        fullName: oauthUser.fullName,
                        verified: true,
                        userType: user_entity_1.UserType.CREATOR,
                    });
                    await this.userRepository.save(user);
                    this.logger.log(`Created new user via ${oauthUser.provider}: ${user.email}`);
                }
                else if (!user) {
                    throw new common_1.UnauthorizedException('Email not provided by OAuth provider');
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
                user: helpers_1.Helpers.sanitizeUser(user),
                token,
            };
        }
        catch (error) {
            this.logger.error(`OAuth login error: ${error.message}`, error.stack);
            throw new common_1.UnauthorizedException('Failed to authenticate with social provider');
        }
    }
};
exports.OAuthService = OAuthService;
exports.OAuthService = OAuthService = OAuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(1, (0, typeorm_1.InjectRepository)(oauth_entity_1.OAuthProvider)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        jwt_1.JwtService])
], OAuthService);
//# sourceMappingURL=oauth.service.js.map