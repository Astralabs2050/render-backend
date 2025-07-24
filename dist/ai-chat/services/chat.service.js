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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var ChatService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const chat_entity_1 = require("../entities/chat.entity");
const milestone_entity_1 = require("../entities/milestone.entity");
const prompt_service_1 = require("./prompt.service");
const openai_service_1 = require("./openai.service");
const stream_chat_service_1 = require("./stream-chat.service");
const users_service_1 = require("../../users/users.service");
const nft_service_1 = require("../../web3/services/nft.service");
const escrow_service_1 = require("../../web3/services/escrow.service");
let ChatService = ChatService_1 = class ChatService {
    constructor(chatRepository, messageRepository, milestoneRepository, promptService, openaiService, streamChatService, usersService, nftService, escrowService) {
        this.chatRepository = chatRepository;
        this.messageRepository = messageRepository;
        this.milestoneRepository = milestoneRepository;
        this.promptService = promptService;
        this.openaiService = openaiService;
        this.streamChatService = streamChatService;
        this.usersService = usersService;
        this.nftService = nftService;
        this.escrowService = escrowService;
        this.logger = new common_1.Logger(ChatService_1.name);
    }
    async createChat(userId, dto) {
        const user = await this.usersService.findOne(userId);
        const chat = this.chatRepository.create({
            title: dto.title || 'New Design Chat',
            userId: userId,
            creatorId: userId,
            state: chat_entity_1.ChatState.WELCOME,
        });
        const savedChat = await this.chatRepository.save(chat);
        await this.streamChatService.upsertUser(userId, user);
        await this.streamChatService.upsertUser('astra-ai', {
            fullName: 'Astra AI',
            userType: 'user',
            avatar: 'https://example.com/astra-ai-avatar.png'
        });
        await this.streamChatService.createChannel(savedChat.id, userId);
        await this.addSystemMessage(savedChat.id, this.promptService.getSystemPrompt());
        const welcomePrompt = this.promptService.getPromptForState(chat_entity_1.ChatState.WELCOME, true);
        await this.addAssistantMessage(savedChat.id, welcomePrompt);
        return savedChat;
    }
    async getChats(userId) {
        return this.chatRepository.find({
            where: [
                { userId: userId },
                { creatorId: userId },
                { makerId: userId }
            ],
            order: { updatedAt: 'DESC' },
        });
    }
    async getChat(userId, chatId) {
        const chat = await this.chatRepository.findOne({
            where: [
                { id: chatId, userId: userId },
                { id: chatId, creatorId: userId },
                { id: chatId, makerId: userId }
            ],
            relations: ['messages'],
            order: { messages: { createdAt: 'ASC' } },
        });
        if (!chat) {
            throw new common_1.NotFoundException('Chat not found');
        }
        return chat;
    }
    async sendMessage(userId, dto) {
        const { content, chatId, imageBase64, actionType } = dto;
        const chat = await this.chatRepository.findOne({
            where: [
                { id: chatId, userId: userId },
                { id: chatId, creatorId: userId },
                { id: chatId, makerId: userId }
            ],
        });
        if (!chat) {
            throw new common_1.NotFoundException('Chat not found');
        }
        const isCreator = chat.creatorId === userId;
        const sanitizedContent = this.promptService.sanitizeUserMessage(content);
        const userMessage = this.messageRepository.create({
            content: sanitizedContent,
            role: 'user',
            chatId,
            actionType,
        });
        if (imageBase64) {
            userMessage.imageUrl = 'mock-image-url';
        }
        const savedMessage = await this.messageRepository.save(userMessage);
        await this.processUserMessage(chat, savedMessage, isCreator);
        return savedMessage;
    }
    async generateDesign(dto) {
        const { chatId, prompt, referenceImageBase64 } = dto;
        const chat = await this.chatRepository.findOne({
            where: { id: chatId },
        });
        if (!chat) {
            throw new common_1.NotFoundException('Chat not found');
        }
        await this.addAssistantMessage(chatId, "Generating your design... This will take a moment.");
        const imageUrl = await this.openaiService.generateDesignImage(prompt, referenceImageBase64);
        const metadata = await this.openaiService.generateDesignMetadata(prompt);
        chat.metadata = { ...chat.metadata, design: metadata };
        chat.state = chat_entity_1.ChatState.DESIGN_PREVIEW;
        chat.designImageUrl = imageUrl;
        await this.chatRepository.save(chat);
        const previewPrompt = this.promptService.getPromptForState(chat_entity_1.ChatState.DESIGN_PREVIEW, true, {
            name: metadata.name,
            price: metadata.price,
            days: metadata.timeframe,
            imageUrl: imageUrl
        });
        await this.addAssistantMessage(chatId, `${previewPrompt}\n\n🎨 **Design Image Generated!**\nView your design: ${imageUrl}`);
        return metadata;
    }
    async listDesign(dto) {
        const { chatId, name, category, price, timeframe } = dto;
        const chat = await this.chatRepository.findOne({
            where: { id: chatId },
        });
        if (!chat) {
            throw new common_1.NotFoundException('Chat not found');
        }
        try {
            const nft = await this.nftService.createNFT({
                name,
                description: `Custom fashion design: ${name}`,
                category,
                price,
                quantity: 1,
                imageUrl: chat.designImageUrl || 'https://placeholder.com/512x512',
                creatorId: chat.creatorId,
                chatId: chat.id,
                attributes: [
                    { trait_type: 'Category', value: category },
                    { trait_type: 'Price', value: price },
                    { trait_type: 'Timeframe', value: timeframe },
                    { trait_type: 'Created Via', value: 'AI Chat' },
                ],
            });
            const mintedNFT = await this.nftService.mintNFT({
                nftId: nft.id,
            });
            await this.nftService.listNFT(mintedNFT.id);
            const jobData = {
                id: `job-${Date.now()}`,
                nftId: mintedNFT.id,
                tokenId: mintedNFT.tokenId,
                contractAddress: mintedNFT.contractAddress,
                name,
                category,
                price,
                timeframe,
                status: 'active',
                ipfsUrl: mintedNFT.ipfsUrl,
            };
            chat.metadata = { ...chat.metadata, job: jobData, nft: mintedNFT };
            chat.state = chat_entity_1.ChatState.LISTED;
            chat.jobId = jobData.id;
            await this.chatRepository.save(chat);
            const listedPrompt = this.promptService.getPromptForState(chat_entity_1.ChatState.LISTED, true);
            await this.addAssistantMessage(chatId, `${listedPrompt}\n\n🎨 **NFT Minted Successfully!**\nToken ID: ${mintedNFT.tokenId}\nContract: ${mintedNFT.contractAddress}\nIPFS: ${mintedNFT.ipfsUrl}`);
            return jobData;
        }
        catch (error) {
            this.logger.error(`Failed to list design as NFT: ${error.message}`);
            const jobData = {
                id: `job-${Date.now()}`,
                name,
                category,
                price,
                timeframe,
                status: 'active',
                error: 'NFT minting failed, listed as regular job',
            };
            chat.metadata = { ...chat.metadata, job: jobData };
            chat.state = chat_entity_1.ChatState.LISTED;
            chat.jobId = jobData.id;
            await this.chatRepository.save(chat);
            const listedPrompt = this.promptService.getPromptForState(chat_entity_1.ChatState.LISTED, true);
            await this.addAssistantMessage(chatId, `${listedPrompt}\n\n⚠️ Note: NFT minting failed, but your design is still listed as a job.`);
            return jobData;
        }
    }
    async addMakerProposal(dto) {
        const { chatId, makerId, price, timeframe, portfolio } = dto;
        const chat = await this.chatRepository.findOne({
            where: { id: chatId },
        });
        if (!chat) {
            throw new common_1.NotFoundException('Chat not found');
        }
        const maker = await this.usersService.findOne(makerId);
        const proposalData = {
            makerId,
            makerName: maker.fullName,
            offer: price,
            turnaround: timeframe,
            portfolio: portfolio || 'No portfolio provided',
        };
        chat.metadata = { ...chat.metadata, proposal: proposalData };
        chat.state = chat_entity_1.ChatState.MAKER_PROPOSAL;
        await this.chatRepository.save(chat);
        const proposalPrompt = this.promptService.getPromptForState(chat_entity_1.ChatState.MAKER_PROPOSAL, true, proposalData);
        await this.addAssistantMessage(chatId, proposalPrompt);
        return proposalData;
    }
    async handleEscrowAction(dto) {
        const { chatId, action, milestoneId } = dto;
        const chat = await this.chatRepository.findOne({
            where: { id: chatId },
        });
        if (!chat) {
            throw new common_1.NotFoundException('Chat not found');
        }
        if (action === 'init') {
            const escrowId = `escrow-${Date.now()}`;
            chat.escrowId = escrowId;
            chat.state = chat_entity_1.ChatState.FABRIC_SHIPPING;
            chat.makerId = chat.metadata?.proposal?.makerId;
            await this.chatRepository.save(chat);
            await this.createMilestones(chat);
            const shippingPrompt = this.promptService.getPromptForState(chat_entity_1.ChatState.FABRIC_SHIPPING, true, {
                maskedAddress: '123 Main St, City, Country',
            });
            await this.addAssistantMessage(chatId, shippingPrompt);
            return { escrowId };
        }
        else if (action === 'unlock') {
            if (!milestoneId) {
                throw new common_1.NotFoundException('Milestone ID is required');
            }
            const milestone = await this.milestoneRepository.findOne({
                where: { id: milestoneId, chatId },
            });
            if (!milestone) {
                throw new common_1.NotFoundException('Milestone not found');
            }
            milestone.status = milestone_entity_1.MilestoneStatus.COMPLETED;
            milestone.completedAt = new Date();
            await this.milestoneRepository.save(milestone);
            if (milestone.order === 0) {
                chat.state = chat_entity_1.ChatState.SAMPLE_REVIEW;
            }
            else if (milestone.order === 1) {
                chat.state = chat_entity_1.ChatState.FINAL_REVIEW;
            }
            else if (milestone.order === 2) {
                chat.state = chat_entity_1.ChatState.DELIVERY;
            }
            else if (milestone.order === 3) {
                chat.state = chat_entity_1.ChatState.COMPLETED;
            }
            await this.chatRepository.save(chat);
            const nextPrompt = this.promptService.getPromptForState(chat.state, true);
            await this.addAssistantMessage(chatId, nextPrompt);
            return { milestone };
        }
        return { success: true };
    }
    async processUserMessage(chat, message, isCreator) {
        const messages = await this.messageRepository.find({
            where: { chatId: chat.id },
            order: { createdAt: 'ASC' },
        });
        const formattedMessages = messages.map(msg => ({
            role: msg.role,
            content: msg.content
        }));
        const aiResponse = await this.openaiService.generateChatResponse(formattedMessages);
        await this.addAssistantMessage(chat.id, aiResponse);
        await this.processStateTransition(chat, message, isCreator);
    }
    async processStateTransition(chat, message, isCreator) {
        const content = message.content.toLowerCase();
        let newState = chat.state;
        switch (chat.state) {
            case chat_entity_1.ChatState.WELCOME:
                if (content.includes('dress') || content.includes('outfit') || content.includes('design') || message.imageUrl) {
                    newState = chat_entity_1.ChatState.INTENT;
                }
                break;
            case chat_entity_1.ChatState.INTENT:
                if (content.includes('a') || content.includes('myself') || content.includes('personal')) {
                    newState = chat_entity_1.ChatState.INFO_GATHER;
                }
                else if (content.includes('b') || content.includes('others') || content.includes('sell')) {
                    newState = chat_entity_1.ChatState.INFO_GATHER;
                }
                break;
            case chat_entity_1.ChatState.INFO_GATHER:
                if (content.length > 20 && (content.includes('dress') || content.includes('outfit') || content.includes('design') ||
                    content.includes('color') || content.includes('style') || content.includes('fabric'))) {
                    await this.autoGenerateDesign(chat.id, message.content);
                    return;
                }
                break;
            case chat_entity_1.ChatState.MAKER_PROPOSAL:
                if (content.includes('accept') || content.includes('yes')) {
                    newState = chat_entity_1.ChatState.ESCROW_PAYMENT;
                }
                break;
            case chat_entity_1.ChatState.SAMPLE_REVIEW:
                if (content.includes('approve')) {
                }
                break;
        }
        if (newState !== chat.state) {
            chat.state = newState;
            await this.chatRepository.save(chat);
            const statePrompt = this.promptService.getPromptForState(newState, isCreator, chat.metadata);
            await this.addAssistantMessage(chat.id, statePrompt);
        }
    }
    async autoGenerateDesign(chatId, prompt) {
        try {
            this.logger.log(`Auto-generating design for chat ${chatId} with prompt: ${prompt}`);
            await this.generateDesign({
                chatId,
                prompt,
            });
        }
        catch (error) {
            this.logger.error(`Auto design generation failed: ${error.message}`);
            await this.addAssistantMessage(chatId, "I had trouble generating your design. Let me try a different approach - could you describe your design idea again?");
        }
    }
    async addSystemMessage(chatId, content) {
        const message = this.messageRepository.create({
            content,
            role: 'system',
            chatId,
        });
        return this.messageRepository.save(message);
    }
    async addAssistantMessage(chatId, content, attachments = []) {
        const message = this.messageRepository.create({
            content,
            role: 'assistant',
            chatId,
        });
        const savedMessage = await this.messageRepository.save(message);
        const streamMessage = await this.streamChatService.sendAIMessage(chatId, content, attachments);
        const chat = await this.chatRepository.findOne({ where: { id: chatId } });
        if (chat) {
            const buttons = this.promptService.getQuickButtons(chat.state);
            if (buttons.length > 0) {
                await this.streamChatService.addReactionButtons(streamMessage.message.id, chatId, buttons);
            }
        }
        return savedMessage;
    }
    async createMilestones(chat) {
        const milestones = [
            {
                name: 'Fabric Received',
                description: 'Maker confirms receipt of fabric',
                amount: 0,
                percentage: 15,
                order: 0,
                chatId: chat.id,
            },
            {
                name: 'Sample Approved',
                description: 'Creator approves the sample',
                amount: 0,
                percentage: 15,
                order: 1,
                chatId: chat.id,
            },
            {
                name: 'Final Product Approved',
                description: 'Creator approves the final product',
                amount: 0,
                percentage: 40,
                order: 2,
                chatId: chat.id,
            },
            {
                name: 'Delivery Confirmed',
                description: 'Delivery is confirmed',
                amount: 0,
                percentage: 30,
                order: 3,
                chatId: chat.id,
            },
        ];
        const totalPrice = chat.metadata?.proposal?.offer || 100;
        milestones.forEach(milestone => {
            milestone.amount = (totalPrice * milestone.percentage) / 100;
        });
        await this.milestoneRepository.save(milestones);
    }
};
exports.ChatService = ChatService;
exports.ChatService = ChatService = ChatService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(chat_entity_1.Chat)),
    __param(1, (0, typeorm_1.InjectRepository)(chat_entity_1.ChatMessage)),
    __param(2, (0, typeorm_1.InjectRepository)(milestone_entity_1.Milestone)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        prompt_service_1.PromptService,
        openai_service_1.OpenAIService,
        stream_chat_service_1.StreamChatService,
        users_service_1.UsersService,
        nft_service_1.NFTService,
        escrow_service_1.EscrowService])
], ChatService);
//# sourceMappingURL=chat.service.js.map