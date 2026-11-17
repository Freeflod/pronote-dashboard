// HTML venant de Pronote, rendu pour de vrai (gras, italique, souligné, listes, liens, couleurs) sans jamais
// être injecté : il est analysé hors de la page par DOMParser, puis reconstruit nœud par nœud avec createEl
// à partir d'une liste blanche (src/rich-color.ts). Aucun attribut n'est recopié : seuls passent le `href`
// d'un lien http ou https et deux classes de couleur de la palette d'Obsidian.
import { colorBucket, legacyColor, richTag, styleColors } from "../rich-color.ts";
import { isSafeExternalUrl } from "./format.ts";

/** Ajoute à `parent` un bloc qui rend `html`. Tout ce qui est hors liste blanche devient du texte ou disparaît. */
export function renderRichHtml(parent: HTMLElement, html: string, cls: string): HTMLElement {
	const root = parent.createDiv({ cls: `pronote-rich ${cls}`.trim() });
	const doc = new DOMParser().parseFromString(html, "text/html");
	for (const child of Array.from(doc.body.childNodes)) copy(child, root);
	return root;
}

function copy(node: Node, into: HTMLElement): void {
	if (node.nodeType === Node.TEXT_NODE) {
		into.appendText(node.textContent ?? "");
		return;
	}
	if (node.nodeType !== Node.ELEMENT_NODE) return;
	const el = node as Element;
	const tag = richTag(el.tagName);
	if (tag === "drop") return;
	if (tag === "br") {
		into.createEl("br");
		return;
	}
	const colors = styleColors(el.getAttribute("style"));
	// ancienne balise <font color="…"> : sa couleur compte comme celle d'un style
	if (el.tagName.toLowerCase() === "font") colors.color ??= colorBucket(legacyColor(el.getAttribute("color")));
	const colored = colors.color !== undefined || colors.background !== undefined;
	let target = into;
	if (tag === "a") {
		const href = el.getAttribute("href") ?? "";
		// lien refusé (javascript:, data:, relatif…) : son texte reste, sans lien
		if (isSafeExternalUrl(href)) {
			target = into.createEl("a", { cls: "pronote-link external-link", attr: { href, target: "_blank", rel: "noopener noreferrer" } });
		} else if (colored) {
			target = into.createSpan();
		}
	} else if (tag === "unwrap") {
		if (colored) target = into.createSpan();
	} else {
		target = into.createEl(tag);
	}
	if (target !== into) {
		if (colors.color) target.addClass(`pronote-c-${colors.color}`);
		if (colors.background) target.addClass(`pronote-bg-${colors.background}`);
	}
	for (const child of Array.from(el.childNodes)) copy(child, target);
}
