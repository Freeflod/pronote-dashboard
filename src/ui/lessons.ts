// Bloc « Contenus de séance » : le texte du cahier de texte, hors des devoirs. En tête, deux commandes toujours
// visibles : regroupement (par jour ou par matière) et filtre de matière. Les changer ne relit rien : seule la
// liste se redessine. Chaque séance est une ligne repliée (matière, titre, date) ; le groupe le plus récent est ouvert.
// Le texte passe par renderRichHtml (liste blanche, jamais de HTML injecté) ; les fichiers restent dans Ressources.
import {
	filterLessons,
	groupLessonsByDay,
	groupLessonsBySubject,
	latestLessonGroup,
	lessonSubjects,
	lessonSummary,
	type LessonEntry,
	type LessonGroup,
	type LessonMode,
	type LessonView,
} from "../blocks.ts";
import { lessonKey } from "../keys.ts";
import { frDate, frTime } from "../util.ts";
import type { DisclosureOptions } from "./disclosure.ts";
import { renderRichHtml } from "./rich-html.ts";
import { renderRichParagraph } from "./rich-text.ts";
import { renderSubject, renderSubjectDot } from "./subject.ts";

/** Repli tenu par l'écran (son état survit au redessin) ; `open` est l'état de départ, avant tout choix de l'utilisateur. */
export type LessonFold = (parent: HTMLElement, key: string, opts: Omit<DisclosureOptions, "id" | "open" | "onToggle"> & { open?: boolean }) => void;

export interface LessonContentsOptions {
	/** Identifiant stable du bloc dans l'écran, pour les `id` du DOM. */
	id: string;
	entries: LessonEntry[];
	colors: Map<string, string>;
	/** Choix courant (regroupement, matière). */
	view: LessonView;
	/** L'utilisateur a changé le regroupement ou la matière : à l'appelant de le garder. */
	onView(view: LessonView): void;
	fold: LessonFold;
}

const MODES: { mode: LessonMode; label: string }[] = [
	{ mode: "day", label: "Par jour" },
	{ mode: "subject", label: "Par matière" },
];
const ALL_SUBJECTS = "";

function sessions(n: number): string {
	return n === 1 ? "1 séance" : `${n} séances`;
}

export function renderLessonContents(body: HTMLElement, opts: LessonContentsOptions): void {
	const subjects = lessonSubjects(opts.entries);
	let view: LessonView = { ...opts.view };
	const controls = body.createDiv({ cls: "pronote-lesson-controls" });
	const list = body.createDiv({ cls: "pronote-lesson-list" });

	const draw = () => {
		list.empty();
		const shown = filterLessons(opts.entries, view.subject);
		const groups = view.mode === "day" ? groupLessonsByDay(shown) : groupLessonsBySubject(shown);
		const openKey = latestLessonGroup(groups);
		for (const group of groups) renderGroup(list, group, view.mode, group.key === openKey, opts);
	};
	const buttons = new Map<LessonMode, HTMLButtonElement>();
	const change = (next: LessonView) => {
		view = next;
		opts.onView(next);
		for (const [mode, button] of buttons) button.setAttr("aria-pressed", String(mode === view.mode));
		draw();
	};

	const modes = controls.createDiv({ cls: "pronote-segment", attr: { role: "group", "aria-label": "Regroupement des séances" } });
	for (const { mode, label } of MODES) {
		const button = modes.createEl("button", {
			cls: "pronote-segment-button",
			text: label,
			attr: { type: "button", "aria-pressed": String(mode === view.mode), "data-focus": `lessons-mode-${mode}` },
		});
		buttons.set(mode, button);
		button.addEventListener("click", () => {
			if (view.mode !== mode) change({ ...view, mode });
		});
	}

	const selectId = `pronote-lessons-subject-${opts.id.replace(/[^A-Za-z0-9_-]/g, "_")}`;
	const filter = controls.createDiv({ cls: "pronote-lesson-filter" });
	filter.createEl("label", { text: "Matière", attr: { for: selectId } });
	const select = filter.createEl("select", { cls: "dropdown", attr: { id: selectId, "data-focus": "lessons-subject" } });
	select.createEl("option", { text: "Toutes les matières", attr: { value: ALL_SUBJECTS } });
	for (const subject of subjects) select.createEl("option", { text: subject, attr: { value: subject } });
	// une matière gardée mais absente de la période : la liste montre « toutes », le choix gardé n'est pas réécrit
	select.value = subjects.includes(view.subject) ? view.subject : ALL_SUBJECTS;
	select.addEventListener("change", () => change({ ...view, subject: select.value }));

	draw();
}

function renderGroup(list: HTMLElement, group: LessonGroup, mode: LessonMode, open: boolean, opts: LessonContentsOptions): void {
	const byDay = mode === "day";
	opts.fold(list, `lessons-${mode}-${group.key}`, {
		cls: byDay ? "is-day" : "is-lesson-group",
		level: 3,
		label: byDay ? frDate(group.key) : group.key,
		renderLabel: byDay ? undefined : (el) => renderSubject(el, group.key, opts.colors),
		hint: sessions(group.entries.length),
		open,
		render: (inner) => {
			for (const entry of group.entries) renderLesson(inner, entry, mode, opts);
		},
	});
}

function renderLesson(parent: HTMLElement, entry: LessonEntry, mode: LessonMode, opts: LessonContentsOptions): void {
	const summary = lessonSummary(entry);
	// le jour (ou la matière) est déjà écrit dans le titre du groupe : la ligne donne l'autre repère
	const when = mode === "day" ? frTime(entry.start) : frDate(entry.start);
	opts.fold(parent, `lesson-${mode}-${lessonKey(entry)}`, {
		cls: "is-lesson",
		level: 4,
		label: summary,
		ariaLabel: `${entry.subject}, ${summary}, ${frDate(entry.start)}`,
		hint: when,
		renderLabel: (el) => {
			const head = el.createSpan({ cls: "pronote-lesson-head" });
			if (mode === "day") renderSubject(head, entry.subject, opts.colors, "pronote-strong");
			else renderSubjectDot(head, entry.subject, opts.colors);
			head.createSpan({ cls: "pronote-lesson-summary", text: summary });
		},
		render: (inner) => {
			if (entry.teachers.length > 0) inner.createEl("p", { cls: "pronote-muted", text: entry.teachers.join(", ") });
			for (const content of entry.contents) {
				const title = (content.title ?? "").trim();
				if (title !== "") inner.createEl("p", { cls: "pronote-lesson-title", text: title });
				const category = (content.category ?? "").trim();
				if (category !== "") inner.createEl("p", { cls: "pronote-muted", text: category });
				// entrée de cache d'avant le HTML gardé : repli sur le texte
				if (content.text.trim() === "") continue;
				if (content.html) renderRichHtml(inner, content.html, "pronote-lesson-text");
				else renderRichParagraph(inner, content.text, "pronote-text");
			}
		},
	});
}
