export declare class CreateChatDto {
    title?: string;
}
export declare class SendMessageDto {
    content: string;
    chatId: string;
    imageBase64?: string;
    actionType?: string;
}
export declare class GenerateDesignDto {
    chatId: string;
    prompt: string;
    referenceImageBase64?: string;
}
export declare class ListDesignDto {
    chatId: string;
    name: string;
    category: string;
    price: number;
    timeframe: number;
}
export declare class MakerProposalDto {
    chatId: string;
    makerId: string;
    price: number;
    timeframe: number;
    portfolio?: string;
}
export declare class EscrowActionDto {
    chatId: string;
    action: 'init' | 'unlock' | 'dispute';
    milestoneId?: string;
}
