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
exports.TwitterStrategy = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const passport_twitter_1 = require("passport-twitter");
const config_1 = require("@nestjs/config");
const oauth_service_1 = require("./oauth.service");
let TwitterStrategy = class TwitterStrategy extends (0, passport_1.PassportStrategy)(passport_twitter_1.Strategy, 'twitter') {
    constructor(configService, oauthService) {
        super({
            consumerKey: configService.get('TWITTER_CLIENT_ID'),
            consumerSecret: configService.get('TWITTER_CLIENT_SECRET'),
            callbackURL: configService.get('TWITTER_CALLBACK_URL'),
            includeEmail: true,
        });
        this.configService = configService;
        this.oauthService = oauthService;
    }
    async validate(token, tokenSecret, profile, done) {
        const { id, displayName, emails, photos } = profile;
        const user = {
            provider: 'twitter',
            providerId: id,
            email: emails && emails[0] ? emails[0].value : null,
            fullName: displayName,
            picture: photos && photos[0] ? photos[0].value : null,
            accessToken: token,
            refreshToken: tokenSecret,
        };
        const result = await this.oauthService.validateOAuthLogin(user);
        done(null, result);
    }
};
exports.TwitterStrategy = TwitterStrategy;
exports.TwitterStrategy = TwitterStrategy = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        oauth_service_1.OAuthService])
], TwitterStrategy);
//# sourceMappingURL=twitter.strategy.js.map