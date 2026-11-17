// Case « fait » d'un devoir. La décision (activée, retour arrière, message) vient de toggleOutcome.
// L'écriture réelle vers Pronote est fournie par l'écran (save) ; ici, seulement l'interface.
import { toggleOutcome } from "../blocks.ts";
import type { Mode } from "../types.ts";

export interface DoneBoxOptions {
	/** Nom court du devoir, pour le lecteur d'écran. */
	label: string;
	done: boolean;
	mode: Mode;
	isOnline(): boolean;
	/** Écrit l'état voulu dans Pronote ; rejette en cas d'échec. */
	save(done: boolean): Promise<void>;
	/** Annonce un message (région aria-live de l'écran). */
	announce(message: string): void;
	/** Repère de focus : l'écran rend le focus à la case après un redessin. */
	focusId: string;
}

/** Ajoute la case à `row` (la ligne du devoir) ; la ligne reçoit `is-done` quand le devoir est fait. */
export function renderDoneBox(row: HTMLElement, opts: DoneBoxOptions): void {
	const wrap = row.createEl("label", { cls: "pronote-done" });
	const input = wrap.createEl("input", {
		attr: { type: "checkbox", "aria-label": `Fait : ${opts.label}`, "data-focus": opts.focusId },
	});
	input.checked = opts.done;

	const refresh = () => {
		const outcome = toggleOutcome(opts.isOnline(), opts.mode, "pending");
		input.disabled = !outcome.enabled;
		if (outcome.message) wrap.setAttr("title", outcome.message);
		else wrap.removeAttribute("title");
		row.toggleClass("is-done", input.checked);
	};
	refresh();

	input.addEventListener("change", () => {
		const wanted = input.checked;
		const before = toggleOutcome(opts.isOnline(), opts.mode, "pending");
		if (!before.enabled) {
			input.checked = !wanted;
			if (before.message) opts.announce(before.message);
			refresh();
			return;
		}
		input.disabled = true;
		row.addClass("is-saving");
		row.toggleClass("is-done", wanted);
		opts.save(wanted).then(
			() => {
				row.removeClass("is-saving");
				refresh();
			},
			() => {
				row.removeClass("is-saving");
				const failed = toggleOutcome(true, opts.mode, "error");
				if (failed.rollback) input.checked = !wanted;
				if (failed.message) opts.announce(failed.message);
				refresh();
			},
		);
	});
}
