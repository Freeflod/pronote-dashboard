// Fenêtre des nouveautés : titre, puces par version, bouton « Fermer ». Aucun HTML, tout par createEl.
import { Modal, type App } from "obsidian";
import type { NewsEntry } from "../whats-new.ts";
import { KOFI_URL } from "../types";

export const RELEASES_URL = "https://github.com/Freeflod/pronote-dashboard/releases";

export class WhatsNewModal extends Modal {
	private opener: Element | null = null;

	constructor(
		app: App,
		private readonly entries: NewsEntry[],
		/** Appelée à la fermeture (l'ouverture automatique y retient la version vue). */
		private readonly onDone?: () => void,
	) {
		super(app);
	}

	onOpen() {
		this.opener = activeDocument.activeElement;
		this.modalEl.addClass("pronote-news-modal");
		const newest = this.entries[0];
		this.setTitle(newest ? `Nouveautés de la version ${newest.version}` : "Nouveautés");
		const body = this.contentEl.createDiv({ cls: "pronote-news" });
		const several = this.entries.length > 1;
		for (const entry of this.entries) {
			const section = body.createDiv({ cls: "pronote-news-version" });
			if (several) section.createEl("h3", { text: `Version ${entry.version}` });
			const list = section.createEl("ul");
			for (const item of entry.items) list.createEl("li", { text: item });
		}
		const thanks = this.contentEl.createEl("p", { cls: "pronote-muted", text: "Cette application est gratuite. Si elle vous plaît, un coup de pouce est possible sur " });
		thanks.createEl("a", { text: "Ko-fi", href: KOFI_URL, attr: { target: "_blank", rel: "noopener noreferrer" } });
		thanks.appendText(" (facultatif).");
		const foot = this.contentEl.createDiv({ cls: "pronote-news-foot" });
		foot.createEl("a", {
			text: "Toutes les versions",
			href: RELEASES_URL,
			attr: { target: "_blank", rel: "noopener noreferrer" },
		});
		const close = foot.createEl("button", { text: "Fermer", cls: "mod-cta" });
		close.addEventListener("click", () => this.close());
		close.focus();
	}

	onClose() {
		this.contentEl.empty();
		if (this.opener?.instanceOf(HTMLElement) && this.opener.isConnected) this.opener.focus();
		this.opener = null;
		this.onDone?.();
	}
}
