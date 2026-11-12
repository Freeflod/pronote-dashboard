// Onglets d'enfants : un onglet par (compte, élève). Flèches gauche/droite, Début et Fin déplacent
// la sélection ; un seul onglet est dans l'ordre de tabulation.
import type { Tab } from "../blocks.ts";

export interface TabsOptions {
	tabs: Tab[];
	selected: string;
	label: string;
	/** `id` du panneau que les onglets commandent. */
	panelId: string;
	onSelect(key: string): void;
}

export function tabId(key: string): string {
	return `pronote-tab-${key.replace(/[^A-Za-z0-9_-]/g, "_")}`;
}

export function renderTabs(el: HTMLElement, opts: TabsOptions): void {
	el.empty();
	el.addClass("pronote-tabs");
	el.setAttr("role", "tablist");
	el.setAttr("aria-label", opts.label);
	const buttons = new Map<string, HTMLButtonElement>();

	const select = (key: string, focus: boolean) => {
		for (const [k, b] of buttons) {
			const on = k === key;
			b.setAttr("aria-selected", String(on));
			b.tabIndex = on ? 0 : -1;
			b.toggleClass("is-active", on);
		}
		if (focus) buttons.get(key)?.focus();
		opts.onSelect(key);
	};

	for (const tab of opts.tabs) {
		const b = el.createEl("button", {
			cls: "pronote-tab",
			text: tab.label,
			attr: { type: "button", role: "tab", id: tabId(tab.key), "aria-controls": opts.panelId },
		});
		buttons.set(tab.key, b);
		b.addEventListener("click", () => select(tab.key, false));
		b.addEventListener("keydown", (e) => {
			const i = opts.tabs.findIndex((t) => t.key === tab.key);
			const last = opts.tabs.length - 1;
			const target =
				e.key === "ArrowRight" ? (i + 1) % opts.tabs.length
				: e.key === "ArrowLeft" ? (i - 1 + opts.tabs.length) % opts.tabs.length
				: e.key === "Home" ? 0
				: e.key === "End" ? last
				: -1;
			const next = opts.tabs[target];
			if (!next) return;
			e.preventDefault();
			select(next.key, true);
		});
	}
	const current = opts.tabs.some((t) => t.key === opts.selected) ? opts.selected : opts.tabs[0]?.key;
	for (const [k, b] of buttons) {
		b.setAttr("aria-selected", String(k === current));
		b.tabIndex = k === current ? 0 : -1;
		b.toggleClass("is-active", k === current);
	}
}
