import { ChatService } from '../services/chat.service';
import { StreamChatService } from '../services/stream-chat.service';
import { CreateChatDto, SendMessageDto, GenerateDesignDto, ListDesignDto, MakerProposalDto, EscrowActionDto } from '../dto/chat.dto';
export declare class ChatController {
    private readonly chatService;
    private readonly streamChatService;
    constructor(chatService: ChatService, streamChatService: StreamChatService);
    createChat(req: any, dto: CreateChatDto): Promise<{
        status: boolean;
        message: string;
        data: import("../entities/chat.entity").Chat;
    }>;
    getStreamToken(req: any): Promise<{
        status: boolean;
        message: string;
        data: {
            token: string;
            userId: any;
        };
    }>;
    getChats(req: any): Promise<{
        status: boolean;
        message: string;
        data: import("../entities/chat.entity").Chat[];
    }>;
    getChat(req: any, chatId: string): Promise<{
        status: boolean;
        message: string;
        data: import("../entities/chat.entity").Chat;
    }>;
    sendMessage(req: any, dto: SendMessageDto): Promise<{
        status: boolean;
        message: string;
        data: import("../entities/chat.entity").ChatMessage;
    }>;
    generateDesign(dto: GenerateDesignDto): Promise<{
        status: boolean;
        message: string;
        data: any;
    }>;
    listDesign(dto: ListDesignDto): Promise<{
        status: boolean;
        message: string;
        data: any;
    }>;
    addMakerProposal(dto: MakerProposalDto): Promise<{
        status: boolean;
        message: string;
        data: any;
    }>;
    handleEscrowAction(dto: EscrowActionDto): Promise<{
        status: boolean;
        message: string;
        data: any;
    }>;
}
