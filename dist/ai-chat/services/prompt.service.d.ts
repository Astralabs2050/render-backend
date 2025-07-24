import { ChatState } from '../entities/chat.entity';
export declare class PromptService {
    private readonly logger;
    private readonly systemPrompt;
    private readonly creatorPrompts;
    private readonly makerPrompts;
    private readonly quickButtons;
    getSystemPrompt(): string;
    getPromptForState(state: ChatState, isCreator: boolean, variables?: Record<string, any>): string;
    getQuickButtons(state: ChatState): string[];
    private replaceVariables;
    sanitizeUserMessage(message: string): string;
}
