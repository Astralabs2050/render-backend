import { Injectable, Logger } from '@nestjs/common';
import { ChatState } from '../entities/chat.entity';
@Injectable()
export class PromptService {
  private readonly logger = new Logger(PromptService.name);
  private readonly systemPrompt = `You are "Astra AI" – a polite, concise assistant guiding Creators and Makers
through on-platform fashion production.
Keep all coordination inside the chat.
Mask phone numbers, emails, WhatsApp links or external payment requests.
Use short paragraphs, title-case buttons, and emoji sparingly (max 1 per line).
When a milestone action is required, always present a CLEAR button.`;
  private readonly creatorPrompts = {
    [ChatState.WELCOME]: "Hey there 👋 Ready to design a custom outfit or launch a mini drop? • Upload a fabric pic **or** • Describe your look in one sentence.",
    [ChatState.INTENT]: "Is this A) just for you, or B) something you'll sell to others? Reply *A* or *B*.",
    [ChatState.INFO_GATHER]: "Great! • Event / vibe? • Deadline? • Budget idea?",
    [ChatState.DESIGN_PREVIEW]: "Here's your design 🌟\nName: **{name}**\nSuggested Cost To Make: **${price}**\nETA: **{days} days**.",
    [ChatState.DESIGN_APPROVED]: "Perfect! To list this on the marketplace, I need a few details:",
    [ChatState.JOB_INFO_GATHER]: "Please provide:\n• Design name\n• Price per piece ($)\n• Number of pieces\n• Delivery location\n• Deadline",
    [ChatState.PAYMENT_REQUIRED]: "Ready to list! Complete payment to publish your job.",
    [ChatState.LISTED]: "All set! Makers will now apply. I'll ping you when proposals arrive.",
    [ChatState.MAKER_PROPOSAL]: "🧵 **{makerName}** offered **${offer}** · **{turnaround} days** · Portfolio attached. Accept?",
    [ChatState.ESCROW_PAYMENT]: "Pay **${offer}** into escrow to start. Funds release in 3 steps (15% / 40% / 30%).",
    [ChatState.FABRIC_SHIPPING]: "Payment received . Please ship your fabric to: **{maskedAddress}** and send your measurements here.",
    [ChatState.SAMPLE_REVIEW]: "Sample ready 👀 Approve to release 15%?",
    [ChatState.FINAL_REVIEW]: "Final outfit looks great! Approve for shipping & release 40%?",
    [ChatState.DELIVERY]: "📦 Delivered! Final 30% will release in 48h unless you report an issue.",
    [ChatState.COMPLETED]: "Want to resell or re-drop this look? Type *Resell* anytime."
  };
  private readonly makerPrompts = {
    [ChatState.MAKER_PROPOSAL]: "🎉 You've been chosen for **{designName}** – budget **${offer}**. Fabric & measurements incoming. Three milestone payouts ahead!",
    [ChatState.FABRIC_SHIPPING]: "Waiting on fabric for **{designName}**. Confirm once received to start clock.",
    [ChatState.SAMPLE_REVIEW]: "Fabric received . Please upload a sample by **{sampleDue}**.",
    [ChatState.FINAL_REVIEW]: "15% released 🎉. Finish garment and upload final photos by **{finalDue}**.",
    [ChatState.DELIVERY]: "40% released . Ship outfit via tracked courier and add tracking number here.",
    [ChatState.COMPLETED]: "Final 30% paid 💰. Great job! Your rating just improved."
  };
  private readonly quickButtons = {
    [ChatState.DESIGN_PREVIEW]: ["Approve Design", "Make Changes"],
    [ChatState.PAYMENT_REQUIRED]: ["Complete Payment"],
    [ChatState.MAKER_PROPOSAL]: ["Accept", "Decline"],
    [ChatState.ESCROW_PAYMENT]: ["Pay Now"],
    [ChatState.SAMPLE_REVIEW]: ["Approve Sample", "Ask Changes"],
    [ChatState.FINAL_REVIEW]: ["Approve & Ship", "Ask Changes"],
    [ChatState.DELIVERY]: ["Raise Issue"]
  };
  getSystemPrompt(): string {
    return this.systemPrompt;
  }
  getPromptForState(state: ChatState, isCreator: boolean, variables: Record<string, any> = {}): string {
    let prompt = '';
    if (isCreator) {
      prompt = this.creatorPrompts[state] || "How can I help you with your fashion design today?";
    } else {
      prompt = this.makerPrompts[state] || "How can I help you with this project today?";
    }
    return this.replaceVariables(prompt, variables);
  }
  getQuickButtons(state: ChatState): string[] {
    return this.quickButtons[state] || [];
  }
  private replaceVariables(text: string, variables: Record<string, any>): string {
    return text.replace(/\{([^}]+)\}/g, (match, key) => {
      return variables[key] !== undefined ? variables[key] : match;
    });
  }
  sanitizeUserMessage(message: string): string {
    message = message.replace(/(\+\d{1,3}[\s-]?)?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4}/g, "<contact removed – please stay in Astra>");
    message = message.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, "<contact removed – please stay in Astra>");
    message = message.replace(/(https?:\/\/[^\s]+)/g, "<contact removed – please stay in Astra>");
    if (message.includes("<contact removed")) {
      message += "\n\nFor your safety and Buyer Protection, please keep all communication here.";
    }
    return message;
  }
}