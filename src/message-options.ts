/** Module pur : options de `discussionMessages`. Seule l'ouverture explicite d'un message le marque comme lu (PD-010). */
export type MessageIntent = "open" | "peek";

export interface MessageOptions {
	markAsRead: boolean;
}

export function messageOptions(intent: MessageIntent): MessageOptions {
	return { markAsRead: intent === "open" };
}
