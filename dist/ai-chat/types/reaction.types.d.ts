import { Reaction } from 'stream-chat';
export interface ButtonReaction extends Reaction {
    options?: Array<{
        text: string;
        value: string;
    }>;
}
