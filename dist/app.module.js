"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const auth_module_1 = require("./auth/auth.module");
const users_module_1 = require("./users/users.module");
const common_module_1 = require("./common/common.module");
const config_module_1 = require("./config/config.module");
const database_module_1 = require("./config/database.module");
const waitlist_module_1 = require("./waitlist/waitlist.module");
const ai_module_1 = require("./ai/ai.module");
const ai_chat_module_1 = require("./ai-chat/ai-chat.module");
const web3_module_1 = require("./web3/web3.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_module_1.ConfigModule,
            database_module_1.DatabaseModule,
            common_module_1.CommonModule,
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            waitlist_module_1.WaitlistModule,
            ai_module_1.AiModule,
            ai_chat_module_1.AIChatModule,
            web3_module_1.Web3Module,
            web3_module_1.Web3Module,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map