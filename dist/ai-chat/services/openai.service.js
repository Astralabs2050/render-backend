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
var OpenAIService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAIService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = require("axios");
const prompt_service_1 = require("./prompt.service");
let OpenAIService = OpenAIService_1 = class OpenAIService {
    constructor(configService, promptService) {
        this.configService = configService;
        this.promptService = promptService;
        this.logger = new common_1.Logger(OpenAIService_1.name);
        this.apiUrl = 'https://api.openai.com/v1/chat/completions';
        this.apiKey = this.configService.get('OPENAI_API_KEY');
        this.axiosInstance = axios_1.default.create({
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`,
            },
        });
    }
    async generateChatResponse(messages) {
        try {
            const response = await this.axiosInstance.post(this.apiUrl, {
                model: 'gpt-4o',
                messages,
                temperature: 0.7,
                max_tokens: 500,
            });
            return response.data.choices[0].message.content;
        }
        catch (error) {
            this.logger.error(`OpenAI API error: ${error.message}`);
            return "I'm having trouble connecting right now. Please try again in a moment.";
        }
    }
    async generateDesignMetadata(prompt, imageUrl) {
        try {
            const messages = [
                { role: 'system', content: 'You are a fashion design assistant that extracts structured metadata from design descriptions.' },
                { role: 'user', content: `Extract metadata for this fashion design: "${prompt}"` }
            ];
            if (imageUrl) {
                messages[1].content += ` (Reference image provided)`;
            }
            const response = await this.axiosInstance.post(this.apiUrl, {
                model: 'gpt-4o',
                messages,
                temperature: 0.3,
                max_tokens: 500,
                functions: [
                    {
                        name: 'extract_design_metadata',
                        description: 'Extract structured metadata from a fashion design description',
                        parameters: {
                            type: 'object',
                            properties: {
                                name: {
                                    type: 'string',
                                    description: 'Name of the design'
                                },
                                category: {
                                    type: 'string',
                                    description: 'Category of the design (e.g., Dress, Suit, Streetwear)'
                                },
                                price: {
                                    type: 'number',
                                    description: 'Suggested price in USD'
                                },
                                timeframe: {
                                    type: 'number',
                                    description: 'Estimated days to make'
                                },
                                colors: {
                                    type: 'array',
                                    items: {
                                        type: 'string'
                                    },
                                    description: 'Color tags'
                                },
                                description: {
                                    type: 'string',
                                    description: 'Brief description of the design'
                                }
                            },
                            required: ['name', 'category', 'price', 'timeframe', 'colors', 'description']
                        }
                    }
                ],
                function_call: { name: 'extract_design_metadata' }
            });
            const functionCall = response.data.choices[0].message.function_call;
            if (functionCall && functionCall.name === 'extract_design_metadata') {
                return JSON.parse(functionCall.arguments);
            }
            return {
                name: 'Custom Design',
                category: 'Dress',
                price: 100,
                timeframe: 7,
                colors: ['white'],
                description: prompt
            };
        }
        catch (error) {
            this.logger.error(`OpenAI metadata extraction error: ${error.message}`);
            return {
                name: 'Custom Design',
                category: 'Dress',
                price: 100,
                timeframe: 7,
                colors: ['white'],
                description: prompt
            };
        }
    }
    async generateDesignImage(prompt, referenceImageBase64) {
        try {
            const fashionPrompt = `Fashion design sketch: ${prompt}. Professional fashion illustration, clean lines, detailed garment construction, fashion croquis style, high quality, detailed fabric textures, elegant pose, fashion runway style.`;
            const response = await this.axiosInstance.post('https://api.openai.com/v1/images/generations', {
                model: 'dall-e-3',
                prompt: fashionPrompt,
                n: 1,
                size: '1024x1024',
                quality: 'standard',
                style: 'natural'
            });
            if (response.data.data && response.data.data.length > 0) {
                const imageUrl = response.data.data[0].url;
                this.logger.log(`Generated design image: ${imageUrl}`);
                return imageUrl;
            }
            throw new Error('No image generated');
        }
        catch (error) {
            this.logger.error(`DALL-E image generation error: ${error.message}`);
            return 'https://via.placeholder.com/1024x1024/f0f0f0/666666?text=Design+Generation+Failed';
        }
    }
};
exports.OpenAIService = OpenAIService;
exports.OpenAIService = OpenAIService = OpenAIService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prompt_service_1.PromptService])
], OpenAIService);
//# sourceMappingURL=openai.service.js.map