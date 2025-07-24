"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const ai_controller_1 = require("./ai.controller");
const chat_service_1 = require("./chat/chat.service");
const image_generation_service_1 = require("./image-generation/image-generation.service");
const metadata_extraction_service_1 = require("./metadata-extraction/metadata-extraction.service");
const chat_entity_1 = require("./entities/chat.entity");
const image_generation_entity_1 = require("./entities/image-generation.entity");
let AiModule = class AiModule {
};
exports.AiModule = AiModule;
exports.AiModule = AiModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([chat_entity_1.AiChat, chat_entity_1.AiChatMessage, image_generation_entity_1.AiGeneratedImage]),
        ],
        controllers: [ai_controller_1.AiController],
        providers: [
            chat_service_1.ChatService,
            image_generation_service_1.ImageGenerationService,
            metadata_extraction_service_1.MetadataExtractionService,
        ],
    })
], AiModule);
//# sourceMappingURL=ai.module.js.map