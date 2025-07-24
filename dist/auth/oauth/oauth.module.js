"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OAuthModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const oauth_controller_1 = require("./oauth.controller");
const oauth_service_1 = require("./oauth.service");
const google_strategy_1 = require("./google.strategy");
const discord_strategy_1 = require("./discord.strategy");
const twitter_strategy_1 = require("./twitter.strategy");
const oauth_entity_1 = require("./oauth.entity");
const user_entity_1 = require("../../users/entities/user.entity");
let OAuthModule = class OAuthModule {
};
exports.OAuthModule = OAuthModule;
exports.OAuthModule = OAuthModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([oauth_entity_1.OAuthProvider, user_entity_1.User]),
            jwt_1.JwtModule.registerAsync({
                inject: [config_1.ConfigService],
                useFactory: (configService) => ({
                    secret: configService.get('JWT_SECRET'),
                    signOptions: { expiresIn: configService.get('JWT_EXPIRATION', '7d') },
                }),
            }),
        ],
        controllers: [oauth_controller_1.OAuthController],
        providers: [
            oauth_service_1.OAuthService,
            google_strategy_1.GoogleStrategy,
            discord_strategy_1.DiscordStrategy,
            twitter_strategy_1.TwitterStrategy,
        ],
        exports: [oauth_service_1.OAuthService],
    })
], OAuthModule);
//# sourceMappingURL=oauth.module.js.map