import { ConfigService } from '@nestjs/config';
import { PromptService } from './prompt.service';
export declare class OpenAIService {
    private configService;
    private promptService;
    private readonly logger;
    private readonly apiKey;
    private readonly apiUrl;
    private readonly axiosInstance;
    constructor(configService: ConfigService, promptService: PromptService);
    generateChatResponse(messages: any[]): Promise<string>;
    generateDesignMetadata(prompt: string, imageUrl?: string): Promise<any>;
    generateDesignImage(prompt: string, referenceImageBase64?: string): Promise<string>;
    private enhanceDesignPrompt;
}
