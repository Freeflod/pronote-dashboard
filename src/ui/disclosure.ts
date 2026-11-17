// Repli d'une section : source unique du bouton (aria-expanded, aria-controls, chevron) pour les blocs
// de l'écran (ui/block.ts) et pour les lignes repliables à l'intérieur (jours, contrôles, détails).
import { setIcon } from "obsidian";

export interface ToggleParts {
	button: HTMLButtonElement;
	label: HTMLElement;
	/** Texte à droite (compte, état) ; le chevron le suit. */
	hint: HTMLElement;
}

export interface ToggleOptions {
	/** Classe de variante, en plus de `pronote-toggle`. */
	cls: string;
	/** `id` de la région que le bouton commande. */
	controls: string;
	/** Repère de focus : l'écran rend le focus au bouton après un redessin. */
	focusId: string;
}

export function createToggle(parent: HTMLElement, opts: ToggleOptions): ToggleParts {
	const button = parent.createEl("button", {
		cls: `pronote-toggle ${opts.cls}`,
		attr: { type: "button", "aria-expanded": "true", "aria-controls": opts.controls, "data-focus": opts.focusId },
	});
	const label = button.createSpan({ cls: "pronote-toggle-label" });
	const end = button.createSpan({ cls: "pronote-toggle-end" });
	const hint = end.createSpan({ cls: "pronote-toggle-hint" });
	setIcon(end.createSpan({ cls: "pronote-chevron", attr: { "aria-hidden": "true" } }), "chevron-right");
	return { button, label, hint };
}

/** Applique l'état : `region` se voit ouverte, `peek` (aperçu) se voit refermée. */
export function applyOpen(button: HTMLButtonElement, open: boolean, region: HTMLElement, peek?: HTMLElement): void {
	button.setAttribute("aria-expanded", String(open));
	region.hidden = !open;
	if (peek) peek.hidden = open;
}

export interface DisclosureOptions {
	/** Identifiant stable et unique dans l'écran. */
	id: string;
	cls: string;
	label: string;
	/** Dessine le libellé à la place du texte simple (point de couleur, gras…). */
	renderLabel?(el: HTMLElement): void;
	hint?: string;
	/** Nom accessible du bouton, quand le libellé dessiné (pastilles aria-hidden…) ne dit pas tout. */
	ariaLabel?: string;
	open: boolean;
	level?: 3 | 4;
	onToggle(open: boolean): void;
	/** Aperçu d'une ligne, visible seulement refermé. */
	peek?(el: HTMLElement): void;
	render(body: HTMLElement): void;
}

/** Ligne repliable : titre-bouton, aperçu refermé, corps. L'état est tenu par l'appelant (onToggle). */
export function renderDisclosure(parent: HTMLElement, opts: DisclosureOptions): void {
	const wrap = parent.createDiv({ cls: "pronote-disclosure" });
	const bodyId = `pronote-d-${opts.id.replace(/[^A-Za-z0-9_-]/g, "_")}`;
	const heading = wrap.createEl(opts.level === 4 ? "h4" : "h3", { cls: "pronote-disclosure-heading" });
	const { button, label, hint } = createToggle(heading, { cls: opts.cls, controls: bodyId, focusId: `d-${opts.id}` });
	if (opts.renderLabel) opts.renderLabel(label);
	else label.setText(opts.label);
	hint.setText(opts.hint ?? "");
	if (opts.ariaLabel) button.setAttribute("aria-label", opts.ariaLabel);
	let peek: HTMLElement | undefined;
	if (opts.peek) {
		peek = wrap.createDiv({ cls: "pronote-peek" });
		opts.peek(peek);
	}
	const body = wrap.createDiv({ cls: "pronote-disclosure-body", attr: { id: bodyId } });
	opts.render(body);
	applyOpen(button, opts.open, body, peek);
	button.addEventListener("click", () => {
		const next = button.getAttribute("aria-expanded") !== "true";
		applyOpen(button, next, body, peek);
		opts.onToggle(next);
	});
}
