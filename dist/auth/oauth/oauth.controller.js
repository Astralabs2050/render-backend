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
Object.defineProperty(exports, "__esModule", { value: true });
exports.OAuthController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const config_1 = require("@nestjs/config");
const oauth_service_1 = require("./oauth.service");
let OAuthController = class OAuthController {
    constructor(oauthService, configService) {
        this.oauthService = oauthService;
        this.configService = configService;
    }
    signupWithGoogle() {
    }
    signinWithGoogle() {
    }
    googleAuthCallback(req, res) {
        const { token } = req.user;
        return res.status(200).json({
            status: true,
            message: 'Google authentication successful',
            data: req.user
        });
    }
    signupWithDiscord() {
    }
    signinWithDiscord() {
    }
    discordAuthCallback(req, res) {
        const { token } = req.user;
        return res.status(200).json({
            status: true,
            message: 'Discord authentication successful',
            data: req.user
        });
    }
    signupWithTwitter() {
    }
    signinWithTwitter() {
    }
    twitterAuthCallback(req, res) {
        const { token } = req.user;
        return res.status(200).json({
            status: true,
            message: 'Twitter authentication successful',
            data: req.user
        });
    }
};
exports.OAuthController = OAuthController;
__decorate([
    (0, common_1.Get)('signup/google'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('google')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], OAuthController.prototype, "signupWithGoogle", null);
__decorate([
    (0, common_1.Get)('signin/google'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('google')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], OAuthController.prototype, "signinWithGoogle", null);
__decorate([
    (0, common_1.Get)('google/callback'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('google')),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], OAuthController.prototype, "googleAuthCallback", null);
__decorate([
    (0, common_1.Get)('signup/discord'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('discord')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], OAuthController.prototype, "signupWithDiscord", null);
__decorate([
    (0, common_1.Get)('signin/discord'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('discord')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], OAuthController.prototype, "signinWithDiscord", null);
__decorate([
    (0, common_1.Get)('discord/callback'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('discord')),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], OAuthController.prototype, "discordAuthCallback", null);
__decorate([
    (0, common_1.Get)('signup/twitter'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('twitter')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], OAuthController.prototype, "signupWithTwitter", null);
__decorate([
    (0, common_1.Get)('signin/twitter'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('twitter')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], OAuthController.prototype, "signinWithTwitter", null);
__decorate([
    (0, common_1.Get)('twitter/callback'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('twitter')),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], OAuthController.prototype, "twitterAuthCallback", null);
exports.OAuthController = OAuthController = __decorate([
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [oauth_service_1.OAuthService,
        config_1.ConfigService])
], OAuthController);
//# sourceMappingURL=oauth.controller.js.map