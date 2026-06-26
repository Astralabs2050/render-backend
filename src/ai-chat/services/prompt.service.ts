import { Injectable, Logger } from '@nestjs/common';
import { ChatState } from '../entities/chat.entity';

@Injectable()
export class PromptService {
  private readonly logger = new Logger(PromptService.name);

  // ─── System prompt ────────────────────────────────────────────────────────
  // This is Astra's core personality. Used by ALL AI calls.
  // Previously ignored by openai.service.ts — that is a bug to fix separately.
  private readonly systemPrompt = `You are "Astra AI" — a warm, knowledgeable fashion assistant helping people
design bespoke outfits for special occasions and connecting them with skilled tailors to bring those designs to life.

Your role:
- Guide the user through designing their outfit step by step, one question at a time
- Make recommendations that are culturally aware, occasion-appropriate, and fashion-forward
- Keep all coordination on the platform — never share or accept external contact details or payment links
- Be encouraging and specific — this is an exciting moment for the user

Your tone:
- Warm and conversational, like a knowledgeable friend in fashion
- Concise — short paragraphs, never more than 3 sentences per response
- Confident — make specific suggestions, don't be vague
- Use one emoji per message maximum, only where it adds warmth

Rules:
- Never ask more than one question at a time
- Never mention crypto, wallets, USDC, or blockchain — the user pays by card and that is all they need to know
- Never generate designs before you know fabric status AND occasion
- If a user shares a phone number, email, or external link — remove it and remind them to stay on platform
- Any dispute or complaint — acknowledge it warmly and let them know the Astra team will step in`;

  // ─── Creator prompts ───────────────────────────────────────────────────────
  // One prompt per ChatState. Variables use {placeholder} syntax.
  // replaceVariables() fills them in at call time.
  // If a variable is missing, the raw {placeholder} shows — always check the
  // calling code passes the right keys.
  private readonly creatorPrompts = {

    // WELCOME — first message every user sees. Fabric question is the fork.
    [ChatState.WELCOME]:
      `Hi! I'm Astra 👋 I help you design a bespoke outfit and find a skilled tailor to make it — for whatever occasion you have coming up.

To get started: do you have a fabric you'd like to use?`,

    // INTENT — replaced by fabric question above. Kept for fallback safety.
    // TODO: remove once WELCOME → FABRIC_INTAKE flow is fully wired
    [ChatState.INTENT]:
      `Do you have a fabric you'd like to use for this outfit?`,

    // INFO_GATHER — now split into sub-steps handled by the conversation logic.
    // This is the fallback message if the state is reached without sub-step context.
    [ChatState.INFO_GATHER]:
      `Tell me about the occasion — what's the event, and when is it?`,

    // DESIGN_PREVIEW — user sees their 3 designs for the first time.
    // Variables: {occasion} — filled from metadata
    [ChatState.DESIGN_PREVIEW]:
      `Here are three designs for your {occasion} 🌟 Each one is different — take a look and tell me which feels most like you.`,

    // DESIGN_APPROVED — user has picked a design. Bridge into measurements.
    [ChatState.DESIGN_APPROVED]:
      `Love that choice! To make sure it fits you perfectly, I'll need a few measurements. I'll guide you through each one — it only takes a few minutes. Ready?`,

    // JOB_INFO_GATHER — collecting brief details before listing to tailors.
    // Variables: {eventDate} — pre-filled from intake
    [ChatState.JOB_INFO_GATHER]:
      `Almost there. Your event is on {eventDate} so I'll match you with tailors who can finish comfortably in time. What's your rough budget for having this made?`,

    // PAYMENT_REQUIRED — Creator is about to pay.
    // Variables: {amount} — the tailor's quoted price
    [ChatState.PAYMENT_REQUIRED]:
      `Ready to get started! Pay {amount} securely to lock in your tailor. Your money is held safely and only released as the work progresses.`,

    // LISTED — job is live, waiting for tailor bids.
    [ChatState.LISTED]:
      `Your brief is live! Tailors are reviewing it now. I'll let you know as soon as someone applies.`,

    // MAKER_PROPOSAL — a tailor has bid. Creator needs to accept or decline.
    // Variables: {makerName}, {offer}, {turnaround}
    [ChatState.MAKER_PROPOSAL]:
      `🧵 {makerName} has offered to make your outfit for {offer} — ready in {turnaround} days. Want to go with them?`,

    // ESCROW_PAYMENT — explaining the milestone payment structure.
    // Variables: {offer}
    [ChatState.ESCROW_PAYMENT]:
      `Your payment of {offer} will be held securely and released to the tailor in three stages as the work is completed — 30% when they start, 30% when you approve the progress, and 40% when it arrives and fits.`,

    // FABRIC_SHIPPING — Creator needs to send their fabric (Path A only).
    // Variables: {maskedAddress}
    [ChatState.FABRIC_SHIPPING]:
      `Payment received! Please post your fabric to {maskedAddress}. Once it's sent, share the tracking number and a photo here so we can get the tailor started.`,

    // SAMPLE_REVIEW — tailor has uploaded a progress sample.
    // Variables: {amount} — the actual dollar amount of 30% release
    [ChatState.SAMPLE_REVIEW]:
      `Your tailor has uploaded progress photos 👀 Take a look — does the fit and direction feel right? Approve to release the first payment ({amount}) and move to the final garment.`,

    // FINAL_REVIEW — tailor has uploaded the finished garment.
    // Variables: {amount} — the actual dollar amount of 30% release
    [ChatState.FINAL_REVIEW]:
      `Your tailor has uploaded the finished garment photos. Have a look — does everything look right? Approve to release payment ({amount}) and get it shipped to you.`,

    // DELIVERY — garment is on its way.
    // Variables: {deadline} — the 7-day window date
    [ChatState.DELIVERY]:
      `📦 Your outfit is on its way! Once it arrives, try it on and confirm it fits. If you haven't responded by {deadline}, the final payment will release automatically to your tailor.`,

    // COMPLETED — the journey is done. Celebrate first, then next steps.
    // Variables: {occasion}
    [ChatState.COMPLETED]:
      `Your outfit is with you — I hope you have the most amazing time at your {occasion} 🎉 Your measurements are saved so your next design will be even quicker. Whenever you're ready for something new, I'm here.`,
  };

  // ─── Maker prompts ─────────────────────────────────────────────────────────
  private readonly makerPrompts = {
    [ChatState.MAKER_PROPOSAL]:
      `🎉 You've been selected for {designName}. The Creator's measurements and design brief are attached. Three milestone payments ahead — first releases once fabric arrives and you begin.`,

    [ChatState.FABRIC_SHIPPING]:
      `Fabric for {designName} is on its way to you. Please confirm once it arrives so the Creator knows it's in safe hands.`,

    [ChatState.SAMPLE_REVIEW]:
      `Fabric received — first payment of {amount} has been released 🎉 Please upload your progress photos by {sampleDue} for the Creator to review.`,

    [ChatState.FINAL_REVIEW]:
      `Progress approved and second payment of {amount} released. Please finish the garment and upload final photos by {finalDue}.`,

    [ChatState.DELIVERY]:
      `Final garment approved — please ship via tracked courier and add the tracking number here. Third payment releases once the Creator confirms it fits.`,

    [ChatState.COMPLETED]:
      `Final payment of {amount} released 💰 Great work! Your rating has been updated.`,
  };

  // ─── Quick action buttons ──────────────────────────────────────────────────
  // Shown as tappable buttons in the UI at each state.
  // Keep labels short — they appear as buttons on mobile.
  private readonly quickButtons = {
    // Fabric question — the fork
    [ChatState.WELCOME]: ['Yes, I have fabric', 'No, just an idea'],

    // Design preview — pick or iterate
    [ChatState.DESIGN_PREVIEW]: ['I love this one', 'Show me variations'],

    // Payment gate
    [ChatState.PAYMENT_REQUIRED]: ['Pay Now'],

    // Tailor proposal — accept or see more
    [ChatState.MAKER_PROPOSAL]: ['Accept', 'See other tailors'],

    // Sample review — approve or request changes
    [ChatState.SAMPLE_REVIEW]: ['Approve', 'Request Changes'],

    // Final review — approve or request changes
    [ChatState.FINAL_REVIEW]: ['Approve & Ship', 'Request Changes'],

    // Delivery — confirm fit or raise issue
    [ChatState.DELIVERY]: ['It fits perfectly', 'Raise an Issue'],
  };

  // ─── Public methods ────────────────────────────────────────────────────────

  getSystemPrompt(): string {
    return this.systemPrompt;
  }

  getPromptForState(
    state: ChatState,
    isCreator: boolean,
    variables: Record<string, any> = {},
  ): string {
    let prompt = '';
    if (isCreator) {
      prompt =
        this.creatorPrompts[state] ||
        'How can I help you with your design today?';
    } else {
      prompt =
        this.makerPrompts[state] || 'How can I help you with this project?';
    }
    return this.replaceVariables(prompt, variables);
  }

  getQuickButtons(state: ChatState): string[] {
    return this.quickButtons[state] || [];
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  private replaceVariables(
    text: string,
    variables: Record<string, any>,
  ): string {
    return text.replace(/\{([^}]+)\}/g, (match, key) => {
      return variables[key] !== undefined ? String(variables[key]) : match;
    });
  }

  // Strips contact details from user messages before the AI sees them.
  // Runs on every incoming message in interactive-chat.service.ts.
  sanitizeUserMessage(message: string): string {
    // Phone numbers
    message = message.replace(
      /(\+\d{1,3}[\s-]?)?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4}/g,
      '<contact removed – please stay in Astra>',
    );
    // Email addresses
    message = message.replace(
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      '<contact removed – please stay in Astra>',
    );
    // URLs (WhatsApp links, external payment links, etc.)
    message = message.replace(
      /(https?:\/\/[^\s]+)/g,
      '<contact removed – please stay in Astra>',
    );
    if (message.includes('<contact removed')) {
      message +=
        '\n\nFor your safety and Buyer Protection, please keep all communication here.';
    }
    return message;
  }
}