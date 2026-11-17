// Avatar d'un enfant : sa photo si elle est connue, sinon l'initiale de son prénom sur une couleur stable.
// La couleur ne porte aucune information : l'initiale et le prénom écrit à côté (ou le libellé) la doublent.
import { avatarColor, avatarInitial } from "../avatar.ts";
import { friendlyName } from "../util.ts";

export interface AvatarOptions {
	/** Nom de l'élève tel que Pronote le donne (« NOM Prénom ») ou prénom saisi. */
	name: string;
	/** Adresse `data:` de la photo ; absente : initiale. */
	photo?: string;
	/** Vrai quand le prénom est écrit juste à côté (onglet) : l'avatar est alors masqué aux lecteurs d'écran. */
	decorative: boolean;
	cls?: string;
}

/** Vide `el` et y dessine l'avatar. Une photo qui ne se charge pas laisse l'initiale, sans message. */
export function renderAvatar(el: HTMLElement, opts: AvatarOptions): void {
	el.empty();
	el.className = `pronote-avatar pronote-avatar-${avatarColor(opts.name)} ${opts.cls ?? ""}`.trim();
	if (opts.decorative) {
		el.setAttr("aria-hidden", "true");
		el.removeAttribute("role");
		el.removeAttribute("aria-label");
	} else {
		el.removeAttribute("aria-hidden");
		el.setAttr("role", "img");
		el.setAttr("aria-label", friendlyName(opts.name) || "Enfant");
	}
	el.createSpan({ cls: "pronote-avatar-initial", text: avatarInitial(opts.name), attr: { "aria-hidden": "true" } });
	if (!opts.photo) return;
	const img = el.createEl("img", { cls: "pronote-avatar-img", attr: { alt: "", src: opts.photo, draggable: "false" } });
	img.addEventListener("error", () => img.remove());
}
