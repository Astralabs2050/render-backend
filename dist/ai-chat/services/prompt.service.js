"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var PromptService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PromptService = void 0;
const common_1 = require("@nestjs/common");
const chat_entity_1 = require("../entities/chat.entity");
let PromptService = PromptService_1 = class PromptService {
    constructor() {
        this.logger = new common_1.Logger(PromptService_1.name);
        this.systemPrompt = `You are "Astra AI" – a polite, concise assistant guiding Creators and Makers
through on-platform fashion production.
✅ Keep all coordination inside the chat.
❌ Mask phone numbers, emails, WhatsApp links or external payment requests.
Use short paragraphs, title-case buttons, and emoji sparingly (max 1 per line).
When a milestone action is required, always present a CLEAR button.`;
        this.creatorPrompts = {
            [chat_entity_1.ChatState.WELCOME]: "Hey there 👋 Ready to design a custom outfit or launch a mini drop? • Upload a fabric pic **or** • Describe your look in one sentence.",
            [chat_entity_1.ChatState.INTENT]: "Is this A) just for you, or B) something you'll sell to others? Reply *A* or *B*.",
            [chat_entity_1.ChatState.INFO_GATHER]: "Great! • Event / vibe? • Deadline? • Budget idea?",
            [chat_entity_1.ChatState.DESIGN_PREVIEW]: "Here's your design 🌟\nName: **{name}**\nSuggested Cost To Make: **${price}**\nETA: **{days} days**.",
            [chat_entity_1.ChatState.LISTED]: "All set! Makers will now apply. I'll ping you when proposals arrive.",
            [chat_entity_1.ChatState.MAKER_PROPOSAL]: "🧵 **{makerName}** offered **${offer}** · **{turnaround} days** · Portfolio attached. Accept?",
            [chat_entity_1.ChatState.ESCROW_PAYMENT]: "Pay **${offer}** into escrow to start. Funds release in 3 steps (15% / 40% / 30%).",
            [chat_entity_1.ChatState.FABRIC_SHIPPING]: "Payment received ✅. Please ship your fabric to: **{maskedAddress}** and send your measurements here.",
            [chat_entity_1.ChatState.SAMPLE_REVIEW]: "Sample ready 👀 Approve to release 15%?",
            [chat_entity_1.ChatState.FINAL_REVIEW]: "Final outfit looks great! Approve for shipping & release 40%?",
            [chat_entity_1.ChatState.DELIVERY]: "📦 Delivered! Final 30% will release in 48h unless you report an issue.",
            [chat_entity_1.ChatState.COMPLETED]: "Want to resell or re-drop this look? Type *Resell* anytime."
        };
        this.makerPrompts = {
            [chat_entity_1.ChatState.MAKER_PROPOSAL]: "🎉 You've been chosen for **{designName}** – budget **${offer}**. Fabric & measurements incoming. Three milestone payouts ahead!",
            [chat_entity_1.ChatState.FABRIC_SHIPPING]: "Waiting on fabric for **{designName}**. Confirm once received to start clock.",
            [chat_entity_1.ChatState.SAMPLE_REVIEW]: "Fabric received ✅. Please upload a sample by **{sampleDue}**.",
            [chat_entity_1.ChatState.FINAL_REVIEW]: "15% released 🎉. Finish garment and upload final photos by **{finalDue}**.",
            [chat_entity_1.ChatState.DELIVERY]: "40% released ✅. Ship outfit via tracked courier and add tracking number here.",
            [chat_entity_1.ChatState.COMPLETED]: "Final 30% paid 💰. Great job! Your rating just improved."
        };
        this.quickButtons = {
            [chat_entity_1.ChatState.DESIGN_PREVIEW]: ["Mint & List", "Regenerate"],
            [chat_entity_1.ChatState.MAKER_PROPOSAL]: ["Accept", "Decline"],
            [chat_entity_1.ChatState.ESCROW_PAYMENT]: ["Pay Now"],
            [chat_entity_1.ChatState.SAMPLE_REVIEW]: ["Approve Sample", "Ask Changes"],
            [chat_entity_1.ChatState.FINAL_REVIEW]: ["Approve & Ship", "Ask Changes"],
            [chat_entity_1.ChatState.DELIVERY]: ["Raise Issue"]
        };
    }
    getSystemPrompt() {
        return this.systemPrompt;
    }
    getPromptForState(state, isCreator, variables = {}) {
        let prompt = '';
        if (isCreator) {
            prompt = this.creatorPrompts[state] || "How can I help you with your fashion design today?";
        }
        else {
            prompt = this.makerPrompts[state] || "How can I help you with this project today?";
        }
        return this.replaceVariables(prompt, variables);
    }
    getQuickButtons(state) {
        return this.quickButtons[state] || [];
    }
    replaceVariables(text, variables) {
        return text.replace(/\{([^}]+)\}/g, (match, key) => {
            return variables[key] !== undefined ? variables[key] : match;
        });
    }
    sanitizeUserMessage(message) {
        message = message.replace(/(\+\d{1,3}[\s-]?)?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4}/g, "<contact removed – please stay in Astra>");
        message = message.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, "<contact removed – please stay in Astra>");
        message = message.replace(/(https?:\/\/[^\s]+)/g, "<contact removed – please stay in Astra>");
        if (message.includes("<contact removed")) {
            message += "\n\nFor your safety and Buyer Protection, please keep all communication here.";
        }
        return message;
    }
};
exports.PromptService = PromptService;
exports.PromptService = PromptService = PromptService_1 = __decorate([
    (0, common_1.Injectable)()
], PromptService);
//# sourceMappingURL=prompt.service.js.map