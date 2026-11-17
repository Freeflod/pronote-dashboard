// Aperçu d'une pièce jointe dans l'application : jamais de fenêtre ni d'appel externe.
import { Modal, type App } from "obsidian";
import type { PreviewKind } from "./format.ts";

export class PreviewModal extends Modal {
	private url: string | null = null;

	constructor(
		app: App,
		private readonly opts: { name: string; kind: Exclude<PreviewKind, "none">; mime: string; data: ArrayBuffer },
	) {
		super(app);
	}

	onOpen() {
		const { name, kind, mime, data } = this.opts;
		this.setTitle(name);
		this.modalEl.addClass("pronote-preview-modal");
		const body = this.contentEl.createDiv({ cls: "pronote-preview" });
		if (kind === "text") {
			body.createEl("pre", { cls: "pronote-preview-text", text: new TextDecoder().decode(data) });
			return;
		}
		this.url = URL.createObjectURL(new Blob([data], { type: mime }));
		if (kind === "image") body.createEl("img", { cls: "pronote-preview-image", attr: { src: this.url, alt: name } });
		else body.createEl("iframe", { cls: "pronote-preview-frame", attr: { src: this.url, title: name } });
	}

	onClose() {
		if (this.url) URL.revokeObjectURL(this.url);
		this.url = null;
		this.contentEl.empty();
	}
}
