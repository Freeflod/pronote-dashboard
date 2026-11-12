// Panneau « Aujourd'hui » : emploi du temps du jour, un sous-titre par enfant en mode parent.
// Échap ferme (Modal d'Obsidian) ; le focus revient au bouton d'origine.
import { Modal, type App } from "obsidian";
import type { TimetableEntryDTO } from "../client.ts";
import type { BlockState } from "../data/block-state.ts";
import { stateMessage, subjectColors } from "./format.ts";
import { renderScheduleRows } from "./schedule.ts";

export interface ScheduleSection {
	/** Prénom de l'enfant ; absent en mode enfant. */
	label?: string;
	/** Cours d'aujourd'hui (déjà filtrés et triés). */
	state: BlockState<TimetableEntryDTO[]>;
	/** L'emploi du temps est connu (même hors ligne ou en erreur) et n'a aucun cours aujourd'hui. */
	knownEmpty?: boolean;
}

export const NO_COURSE_TODAY = "Aucun cours aujourd'hui";

export class ScheduleModal extends Modal {
	constructor(
		app: App,
		private title: string,
		private sections: () => ScheduleSection[],
		private origin: HTMLElement,
	) {
		super(app);
	}

	onOpen(): void {
		this.titleEl.setText(this.title);
		this.modalEl.addClass("pronote-schedule-modal");
		this.refresh();
		// Le focus entre dans la modale (Échap et lecteur d'écran) ; le contenu n'est pas dans l'ordre de tabulation.
		this.contentEl.tabIndex = -1;
		this.contentEl.focus();
	}

	/** Redessine : l'écran l'appelle quand un emploi du temps change d'état. */
	refresh(): void {
		const root = this.contentEl;
		root.empty();
		for (const s of this.sections()) {
			const section = root.createDiv({ cls: "pronote-schedule-section" });
			if (s.label) section.createEl("h3", { cls: "pronote-schedule-name", text: s.label });
			const { state } = s;
			const data = state.kind === "ready" || state.kind === "error" || state.kind === "offline" ? state.data : undefined;
			const quiet = state.kind === "ready";
			const message = section.createDiv({ cls: "pronote-block-status", attr: { role: "status", "aria-live": "polite" } });
			message.setText(quiet ? "" : stateMessage(state, NO_COURSE_TODAY));
			message.toggleClass("is-error", state.kind === "error");
			message.toggleClass("is-offline", state.kind === "offline");
			if (s.knownEmpty && state.kind !== "empty") section.createEl("p", { cls: "pronote-muted", text: NO_COURSE_TODAY });
			if (data) renderScheduleRows(section, data, subjectColors(data.map((e) => ({ subject: e.title, color: e.color }))));
		}
	}

	onClose(): void {
		super.onClose();
		window.setTimeout(() => this.origin.focus(), 0);
	}
}
