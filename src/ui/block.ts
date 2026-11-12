// Bloc de l'écran : titre, repli, état (chargement, vide, erreur, hors ligne). Source unique du repli
// et des états : l'écran ne les redessine jamais lui-même.
import type { BlockState } from "../data/block-state.ts";
import { applyOpen, createToggle } from "./disclosure.ts";
import { stateMessage } from "./format.ts";

/**
 * plain : titre simple, sans repli. big : grand titre-bouton repliable avec compte à droite.
 * panel : panneau du bas, filet au-dessus, replié au départ.
 */
export type BlockVariant = "plain" | "big" | "panel";

export interface BlockOptions<T> {
	/** Identifiant stable (sert aux `id` du DOM pour aria-controls). */
	id: string;
	title: string;
	state: BlockState<T>;
	/** Phrase affichée quand le bloc est vide. */
	emptyLabel: string;
	variant?: BlockVariant;
	/** Classe ajoutée au conteneur (zone, couleur de filet…). */
	cls?: string;
	/** Texte à droite du titre quand il y a des données (« 3 devoirs »). */
	hint?(data: T): string;
	/** Texte à droite du titre quand le bloc est vide : remplace alors la phrase vide sous le titre. */
	emptyHint?: string;
	/** Replié au départ : tout de suite (booléen) ou à la première donnée reçue. L'état ensuite est celui de l'utilisateur. */
	startCollapsed?: boolean | ((data: T) => boolean);
	/** Aperçu d'une ligne, visible seulement replié. */
	peek?(el: HTMLElement, data: T): void;
	/** Dessine la donnée (fraîche, en cache, ou conservée malgré une erreur ou l'absence de réseau). */
	renderData(body: HTMLElement, data: T): void;
}

interface Parts {
	toggle: HTMLButtonElement | null;
	title: HTMLElement;
	hint: HTMLElement | null;
	status: HTMLElement;
	peek: HTMLElement;
	body: HTMLElement;
}

const parts = new WeakMap<HTMLElement, Parts>();

function build(el: HTMLElement, id: string, variant: BlockVariant): Parts {
	el.empty();
	el.addClass("pronote-block", `is-${variant}`);
	const heading = el.createEl("h2", { cls: "pronote-block-heading" });
	const bodyId = `pronote-block-${id}-body`;
	let toggle: HTMLButtonElement | null = null;
	let title: HTMLElement;
	let hint: HTMLElement | null = null;
	if (variant === "plain") {
		title = heading.createSpan({ cls: "pronote-block-title" });
	} else {
		const made = createToggle(heading, { cls: `pronote-block-toggle is-${variant}`, controls: bodyId, focusId: `toggle-${id}` });
		toggle = made.button;
		title = made.label;
		hint = made.hint;
	}
	const status = el.createDiv({ cls: "pronote-block-status", attr: { role: "status", "aria-live": "polite" } });
	const peek = el.createDiv({ cls: "pronote-peek" });
	const body = el.createDiv({ cls: "pronote-block-body", attr: { id: bodyId } });
	const made: Parts = { toggle, title, hint, status, peek, body };
	toggle?.addEventListener("click", () => {
		el.dataset.collapsed = el.dataset.collapsed === "true" ? "false" : "true";
		applyCollapsed(el, made);
	});
	parts.set(el, made);
	return made;
}

function applyCollapsed(el: HTMLElement, p: Parts): void {
	const collapsed = el.dataset.collapsed === "true";
	if (p.toggle) applyOpen(p.toggle, !collapsed, p.body, p.peek);
	else p.body.hidden = false;
}

/** Déplie un bloc replié (lien « messages non lus » de l'en-tête) ; renvoie son bouton, pour le focus. */
export function expandBlock(el: HTMLElement): HTMLButtonElement | null {
	const p = parts.get(el);
	if (!p) return null;
	el.dataset.collapsed = "false";
	applyCollapsed(el, p);
	return p.toggle;
}

/**
 * Dessine (ou redessine) un bloc dans `el`, un conteneur qui persiste d'un rendu à l'autre : l'état replié
 * est lu et écrit dans `el.dataset.collapsed`, il survit donc aux changements d'état. Renvoie le corps.
 */
export function renderBlock<T>(el: HTMLElement, opts: BlockOptions<T>): HTMLElement {
	const variant = opts.variant ?? "plain";
	const p = parts.get(el) ?? build(el, opts.id, variant);
	if (opts.cls) el.addClass(...opts.cls.split(" "));
	p.title.setText(opts.title);
	const { state } = opts;
	const hasData = state.kind === "ready" || ((state.kind === "error" || state.kind === "offline") && state.data !== undefined);
	const data = hasData ? (state.data as T) : undefined;

	if (el.dataset.collapsed === undefined && opts.startCollapsed !== undefined) {
		if (typeof opts.startCollapsed === "boolean") el.dataset.collapsed = String(opts.startCollapsed);
		else if (hasData) el.dataset.collapsed = String(opts.startCollapsed(data as T));
	}

	const quiet = state.kind === "ready" && !state.cacheWarning;
	const hushed = state.kind === "empty" && opts.emptyHint !== undefined && variant !== "plain";
	p.status.setText(quiet || hushed ? "" : stateMessage(state, opts.emptyLabel));
	p.status.toggleClass("is-error", state.kind === "error");
	p.status.toggleClass("is-offline", state.kind === "offline");
	el.dataset.state = state.kind;

	if (p.hint) p.hint.setText(hasData ? (opts.hint?.(data as T) ?? "") : state.kind === "empty" ? (opts.emptyHint ?? "") : "");
	if (p.toggle) p.toggle.disabled = !hasData;

	p.body.empty();
	p.peek.empty();
	if (hasData) {
		opts.renderData(p.body, data as T);
		opts.peek?.(p.peek, data as T);
	}
	applyCollapsed(el, p);
	return p.body;
}
