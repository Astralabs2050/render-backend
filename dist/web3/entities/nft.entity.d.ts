import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Chat } from '../../ai-chat/entities/chat.entity';
export declare enum NFTStatus {
    DRAFT = "draft",
    MINTING = "minting",
    MINTED = "minted",
    LISTED = "listed",
    SOLD = "sold"
}
export declare class NFT extends BaseEntity {
    name: string;
    description: string;
    category: string;
    price: number;
    quantity: number;
    status: NFTStatus;
    tokenId: string;
    contractAddress: string;
    ipfsHash: string;
    ipfsUrl: string;
    imageUrl: string;
    metadata: Record<string, any>;
    attributes: Record<string, any>;
    creator: User;
    creatorId: string;
    chat: Chat;
    chatId: string;
    transactionHash: string;
    mintedAt: Date;
}
