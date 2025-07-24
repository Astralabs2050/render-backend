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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiscordStrategy = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const passport_discord_1 = require("passport-discord");
const config_1 = require("@nestjs/config");
const oauth_service_1 = require("./oauth.service");
let DiscordStrategy = class DiscordStrategy extends (0, passport_1.PassportStrategy)(passport_discord_1.Strategy, 'discord') {
    constructor(configService, oauthService) {
        super({
            clientID: configService.get('DISCORD_CLIENT_ID'),
            clientSecret: configService.get('DISCORD_CLIENT_SECRET'),
            callbackURL: configService.get('DISCORD_CALLBACK_URL'),
            scope: ['identify', 'email'],
        });
        this.configService = configService;
        this.oauthService = oauthService;
    }
    async validate(accessToken, refreshToken, profile, done) {
        const { id, username, email, avatar } = profile;
        const user = {
            provider: 'discord',
            providerId: id,
            email: email,
            fullName: username,
            picture: avatar ? `https://cdn.discordapp.com/avatars/${id}/${avatar}.png` : null,
            accessToken,
            refreshToken,
        };
        const result = await this.oauthService.validateOAuthLogin(user);
        done(null, result);
    }
};
exports.DiscordStrategy = DiscordStrategy;
exports.DiscordStrategy = DiscordStrategy = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        oauth_service_1.OAuthService])
], DiscordStrategy);
//# sourceMappingURL=discord.strategy.js.map