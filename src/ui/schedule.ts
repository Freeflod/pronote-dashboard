// Lignes de l'emploi du temps : source unique du rendu d'un cours (cartable de demain, panneau « Aujourd'hui »).
import type { TimetableEntryDTO } from "../client.ts";
import { frTime } from "../util.ts";
import { renderSubject } from "./subject.ts";

export function renderScheduleRows(parent: HTMLElement, entries: TimetableEntryDTO[], colors: Map<string, string>): void {
	const rows = parent.createEl("ul", { cls: "pronote-lines" });
	for (const e of entries) {
		const li = rows.createEl("li", { cls: `pronote-schedule-row${e.canceled ? " is-canceled" : ""}` });
		li.createSpan({ cls: "pronote-time", text: `${frTime(e.start)} à ${frTime(e.end)}` });
		const text = li.createSpan({ cls: "pronote-schedule-text" });
		renderSubject(text, e.kind === "lesson" ? e.title : `${e.kind === "detention" ? "Retenue" : "Activité"} : ${e.title}`, colors);
		const more = [...e.teachers, ...(e.rooms.length ? [`salle ${e.rooms.join(", ")}`] : [])];
		if (more.length) text.createSpan({ cls: "pronote-muted", text: ` · ${more.join(" · ")}` });
		if (e.canceled) li.createSpan({ cls: "pronote-flag", text: "cours annulé" });
	}
}
