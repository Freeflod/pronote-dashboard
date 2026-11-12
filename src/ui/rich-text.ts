// Texte venant de Pronote : liens cliquables, jamais de HTML injecté.
import { linkSegments } from "./format.ts";

/** Ajoute à `parent` un paragraphe dont les liens Markdown et les URL brutes sont des liens. */
export function renderRichParagraph(parent: HTMLElement, text: string, cls: string): HTMLElement {
	const p = parent.createEl("p", { cls });
	for (const seg of linkSegments(text)) {
		if ("href" in seg) {
			p.createEl("a", { cls: "pronote-link external-link", text: seg.text, attr: { href: seg.href, target: "_blank", rel: "noopener noreferrer" } });
		} else {
			p.appendText(seg.text);
		}
	}
	return p;
}
