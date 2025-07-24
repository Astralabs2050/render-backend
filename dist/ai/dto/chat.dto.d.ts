export declare class CreateChatDto {
    title: string;
}
export declare class SendMessageDto {
    content: string;
    chatId: string;
    imageBase64?: string;
}
export declare class GenerateImageDto {
    prompt: string;
    chatId: string;
    messageId: string;
    referenceImageBase64?: string;
    provider?: 'stable-diffusion' | 'astria';
}
export declare class ExtractMetadataDto {
    imageId: string;
    chatId: string;
}
