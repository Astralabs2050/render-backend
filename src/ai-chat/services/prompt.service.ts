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
- Never invent a price, quantity, or budget. Chat does not collect those; they are set later when publishing or hiring.
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
      `Which look do you want to keep? Pick Design 1, 2, or 3 — you can also keep more than one.`,

    // DESIGN_APPROVED — user has picked a design. Bridge into measurements.
    [ChatState.DESIGN_APPROVED]:
      `That look is saved in your Designs tab. Open Designs to publish it or hire a maker.`,

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
    [ChatState.DESIGN_PREVIEW]: ['Design 1', 'Design 2', 'Design 3', 'I like more than one', 'Show me variations'],

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

  buildCoutureImagePrompt(input: {
    culturalContext?: string;
    occasion?: string;
    aesthetic?: string;
    silhouette?: string;
    garmentType?: string;
    embellishmentLevel?: string;
    dramaLevel?: string;
    fabricDescription?: string;
    hasFabricPhoto?: boolean;
    rawBrief?: string;
  }): string {
    const culturalContext =
      input.culturalContext ||
      'Contemporary African luxury occasionwear. Let the fabric, occasion and any cultural cues in the brief inform the design language. Do not default to costume.';
    const occasion = input.occasion || 'a formal special occasion';
    const aesthetic =
      input.aesthetic ||
      'contemporary African luxury — confident, ceremonial, sophisticated';
    const silhouette =
      input.silhouette ||
      'a refined occasionwear silhouette with a clear waist, considered volume and couture proportion';
    const garmentType = input.garmentType || 'couture occasionwear garment';
    const embellishmentLevel =
      input.embellishmentLevel ||
      'considered, handcrafted couture embellishment that follows the garment architecture';
    const dramaLevel =
      input.dramaLevel ||
      'balanced contemporary occasionwear drama — present, not theatrical costume';
    const fabricDescription =
      input.fabricDescription ||
      input.rawBrief ||
      'the supplied fabric as the primary material';
    const fabricSource = input.hasFabricPhoto
      ? 'The attached image is the supplied fabric. Treat it as the primary material. Preserve its actual colours, pattern, texture and visual identity. Study the scale and placement of the pattern before designing the garment.'
      : `No fabric photo is attached. Design from this fabric description: ${fabricDescription}.`;

    return `You are the creative director and couture designer for a contemporary African luxury fashion atelier.

Your task is to transform the supplied fabric into an original, sophisticated, physically constructible occasionwear design.

The final result must feel like a garment designed by an exceptional contemporary African fashion designer and constructed by a highly skilled couture atelier.

DESIGN CONTEXT

Culture and fashion context: ${culturalContext}

Occasion: ${occasion}

Desired aesthetic: ${aesthetic}

Silhouette direction: ${silhouette}

Garment type: ${garmentType}

Embellishment level: ${embellishmentLevel}

Desired level of drama: ${dramaLevel}

FABRIC

${fabricSource}

The supplied fabric is the primary material for the garment.

Preserve its actual colours, pattern, texture and visual identity.

Study the scale and placement of the pattern before designing the garment.

Use intelligent pattern placement across the bodice, waist, sleeves and skirt so that the finished garment appears deliberately cut and constructed rather than simply covered with the fabric texture.

The material must behave like real fabric with believable weight, folds, tension, draping and structure.

AFRICAN DESIGN LANGUAGE

Create contemporary African luxury fashion rather than a generic Western gown decorated with African fabric.

Draw from the proportions, craftsmanship, ceremony, confidence and visual richness of contemporary African occasionwear while producing an original design.

Avoid stereotypical costume interpretations of African clothing.

The result should feel culturally informed, contemporary and sophisticated.

COUTURE CONSTRUCTION

Design a garment that could actually be produced by an experienced professional atelier.

Show believable:

seams and panel construction

corsetry and boning where appropriate

darts and shaping

fabric joins

structured draping

closures

lining

hems

pleating

embroidery

beading

appliqué

fabric tension

The garment should reward close inspection.

Small construction details matter.

EMBELLISHMENT

Where embellishment is required, it must feel handcrafted and intentional.

Use realistic combinations of embroidery, crystals, beads, pearls, sequins, lace appliqué or dimensional textile work where appropriate.

Follow the architecture of the garment rather than randomly distributing decoration across the surface.

Individual beads, embroidery threads, stitching and textile layers should remain visible at close inspection.

REFERENCE IMAGES

Use any attached images as design intelligence rather than copying them.

The fabric image defines textile identity: colour, pattern, scale and texture.

Silhouette direction: ${silhouette}

Construction language: couture atelier construction with visible seams, shaping and structure

Embellishment language: ${embellishmentLevel}

Overall sophistication and mood: ${aesthetic}; drama: ${dramaLevel}

Combine these influences into a new and original garment. Do not copy any reference garment.

PHYSICAL REALISM

This is a real garment intended for eventual physical production.

Do not create impossible floating structures or decorative elements that could not reasonably be constructed.

Every major design feature should have a believable relationship to fabric, gravity and the human body.

VISUAL OUTPUT

Create an ultra high fidelity luxury fashion photograph.

Full length view.

The entire garment must be clearly visible.

Neutral luxury studio environment with minimal visual distraction.

Professional fashion campaign photography.

Medium format photographic quality.

85mm lens aesthetic.

Large diffused studio lighting.

Natural dimensional shadows.

Extremely sharp garment detail.

Photorealistic skin and textile rendering.

Accurate fabric texture.

Visible stitching, embroidery and beadwork.

Sophisticated editorial composition.

The garment must be the unmistakable focus of the image.

The result should look like an expensive couture garment photographed for a leading international fashion publication.

It must not resemble a cartoon, fashion illustration, anime image, plastic 3D render, video game character, costume concept or generic AI generated fashion image.

Prioritise sophisticated design, African fashion intelligence, textile realism, physical constructibility and exceptional craftsmanship.

No celebrity likeness. Faceless or anonymous model/mannequin is acceptable if a figure is shown.`;
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