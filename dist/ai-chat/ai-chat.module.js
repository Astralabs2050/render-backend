"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIChatModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const chat_controller_1 = require("./controllers/chat.controller");
const chat_service_1 = require("./services/chat.service");
const prompt_service_1 = require("./services/prompt.service");
const openai_service_1 = require("./services/openai.service");
const stream_chat_service_1 = require("./services/stream-chat.service");
const chat_entity_1 = require("./entities/chat.entity");
const milestone_entity_1 = require("./entities/milestone.entity");
const users_module_1 = require("../users/users.module");
const web3_module_1 = require("../web3/web3.module");
let AIChatModule = class AIChatModule {
};
exports.AIChatModule = AIChatModule;
exports.AIChatModule = AIChatModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([chat_entity_1.Chat, chat_entity_1.ChatMessage, milestone_entity_1.Milestone]),
            users_module_1.UsersModule,
            web3_module_1.Web3Module,
        ],
        controllers: [chat_controller_1.ChatController],
        providers: [
            chat_service_1.ChatService,
            prompt_service_1.PromptService,
            openai_service_1.OpenAIService,
            stream_chat_service_1.StreamChatService,
        ],
        exports: [chat_service_1.ChatService],
    })
], AIChatModule);
//# sourceMappingURL=ai-chat.module.js.map