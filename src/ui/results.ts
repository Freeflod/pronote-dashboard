// Section « Résultats scolaires » : notes puis compétences, chacune seulement s'il y a des données.
// Texte de Pronote toujours posé par textContent (createEl/setText), jamais par innerHTML.
import { coefText, gapLabel, gradeText, estimatedLevel, evaluationsBySubject, notesBySubject, resultsSections, skillStatus, skillTrend, subjectsBelowClass, type SubjectNotes } from "../blocks.ts";
import type { GradeDTO, ResultsDTO, SkillEvaluationDTO } from "../types.ts";
import { frDate } from "../util.ts";
import type { DisclosureOptions } from "./disclosure.ts";
import { renderSubject } from "./subject.ts";

/** Vide à l'écran : rien en notes ni en compétences, et rien à signaler. */
export function isEmptyResults(r: ResultsDTO): boolean {
	const s = resultsSections(r);
	return !s.notes && !s.skills && r.warnings.length === 0;
}

/** Repli tenu par l'écran (son état survit au redessin) : voir `Screen.disclosure`. */
export type Fold = (parent: HTMLElement, key: string, opts: Omit<DisclosureOptions, "id" | "open" | "onToggle">) => void;

/** Écart en texte ; le repère de forme (▲ ▼ =) l'accompagne, la couleur ne porte rien seule. */
function renderGap(parent: HTMLElement, gap: { text: string; sign: -1 | 0 | 1 }, short: boolean): void {
	const el = parent.createSpan({ cls: "pronote-result-gap" });
	el.createSpan({ cls: "pronote-result-mark", text: gap.sign > 0 ? "▲" : gap.sign < 0 ? "▼" : "=", attr: { "aria-hidden": "true" } });
	el.createSpan({ text: short ? gap.text.replace(" de la classe", "") : gap.text });
}

function renderOverall(parent: HTMLElement, r: ResultsDTO): void {
	if (r.overallAverage === undefined && r.classAverage === undefined) return;
	const row = parent.createDiv({ cls: "pronote-result-overall" });
	if (r.overallAverage !== undefined) {
		row.createSpan({ cls: "pronote-muted", text: "Moyenne générale " });
		row.createSpan({ cls: "pronote-strong", text: r.overallAverage });
	}
	if (r.classAverage !== undefined) row.createSpan({ cls: "pronote-muted", text: `classe ${r.classAverage}` });
	const gap = gapLabel(r.overallAverage, r.classAverage);
	if (gap) renderGap(row, gap, false);
}

function renderGrade(list: HTMLElement, g: GradeDTO, fold: Fold): void {
	const li = list.createEl("li", { cls: "pronote-result-note" });
	const line = li.createDiv({ cls: "pronote-result-line" });
	line.createSpan({ cls: "pronote-strong", text: gradeText(g.value, g.outOf) });
	const meta = [frDate(g.date, false), coefText(g.coefficient)].filter((x) => x !== "");
	line.createSpan({ cls: "pronote-muted", text: meta.join(" · ") });
	if (g.comment) {
		fold(li, `comment-${g.id}`, {
			cls: "is-comment",
			label: "Commentaire",
			level: 4,
			render: (body) => body.createDiv({ cls: "pronote-muted pronote-result-comment", text: g.comment }),
		});
	}
}

/** Matière = repli, refermé par défaut : l'en-tête garde matière, moyenne, écart et nombre de notes ; le corps, toutes les notes. */
function renderSubjectCard(list: HTMLElement, s: SubjectNotes, colors: Map<string, string>, fold: Fold): void {
	const li = list.createEl("li", { cls: "pronote-result-fold" });
	const gap = gapLabel(s.student, s.classAverage);
	fold(li, `notes-${s.subject}`, {
		cls: "is-result",
		label: s.subject,
		level: 4,
		hint: s.grades.length === 0 ? "aucune note" : s.grades.length === 1 ? "1 note" : `${s.grades.length} notes`,
		renderLabel: (el) => {
			const head = el.createSpan({ cls: "pronote-result-title" });
			renderSubject(head, s.subject, colors);
			if (s.student !== undefined) head.createSpan({ cls: "pronote-strong pronote-result-average", text: s.student });
			if (gap) renderGap(head, gap, true);
		},
		render: (body) => {
			if (s.classAverage !== undefined) body.createDiv({ cls: "pronote-muted", text: `Moyenne de la classe : ${s.classAverage}` });
			const notes = body.createEl("ul", { cls: "pronote-result-notes" });
			for (const g of s.grades) renderGrade(notes, g, fold);
		},
	});
}

function renderNotes(parent: HTMLElement, r: ResultsDTO, colors: Map<string, string>, fold: Fold): void {
	renderOverall(parent, r);
	const subjects = notesBySubject(r.grades, r.averages);
	const below = subjectsBelowClass(subjects);
	if (below.length > 0) {
		const noun = below.length === 1 ? "1 matière" : `${below.length} matières`;
		parent.createEl("p", { cls: "pronote-muted", text: `${noun} en dessous de la classe : ${below.join(", ")}.` });
	}
	const list = parent.createEl("ul", { cls: "pronote-result-list" });
	for (const s of subjects) renderSubjectCard(list, s, colors, fold);
}

function pastille(parent: HTMLElement, tone: string): void {
	parent.createSpan({ cls: `pronote-pastille pronote-pastille-${tone}`, attr: { "aria-hidden": "true" } });
}

const TRENDS = {
	up: { arrow: "↗", text: "en hausse" },
	down: { arrow: "↘", text: "en baisse" },
	stable: { arrow: "→", text: "stable" },
} as const;

interface Estimate {
	tone: string;
	text: string;
	trend?: "up" | "down" | "stable";
}

/** Niveau estimé (« estimé » dit que ce n'est pas le calcul de Pronote) et tendance ; undefined sans score. */
function estimateOf(evals: SkillEvaluationDTO[]): Estimate | undefined {
	const level = estimatedLevel(evals);
	if (!level) return undefined;
	const name = evals.flatMap((e) => e.skills).find((s) => s.abbreviation.trim().toUpperCase() === level.abbreviation)?.level ?? "";
	const status = skillStatus(level.abbreviation, name);
	return { tone: status.tone, text: `Niveau estimé : ${status.text}`, trend: skillTrend(evals) };
}

/** Texte du niveau estimé puis tendance écrite (flèche décorative), en petit et muted, à la suite. */
function renderEstimateText(parent: HTMLElement, est: Estimate): void {
	parent.createSpan({ text: est.text });
	if (est.trend) {
		const t = parent.createSpan({ cls: "pronote-trend" });
		t.createSpan({ text: TRENDS[est.trend].arrow, attr: { "aria-hidden": "true" } });
		t.createSpan({ text: TRENDS[est.trend].text });
	}
}

/** Nom d'un niveau pour lecteur d'écran : le libellé de Pronote (« Maîtrise fragile »), sans l'abréviation. */
function levelName(skill: SkillEvaluationDTO["skills"][number]): string {
	const status = skillStatus(skill.abbreviation, skill.level);
	return status.tone === "none" || skill.level.trim() === "" ? status.text : skill.level.trim();
}

function renderEvaluation(list: HTMLElement, e: SkillEvaluationDTO, fold: Fold): void {
	const li = list.createEl("li", { cls: "pronote-result-fold" });
	const date = frDate(e.date, false);
	const count = e.skills.length === 1 ? "1 compétence" : `${e.skills.length} compétences`;
	fold(li, `skills-eval-${e.id}`, {
		cls: "is-evaluation",
		label: e.name,
		level: 4,
		// Les pastilles sont décoratives (aria-hidden) : le nom du bouton énumère les niveaux en texte.
		ariaLabel: `${e.name}, ${date} : ${count} : ${e.skills.map(levelName).join(", ")}`,
		renderLabel: (el) => {
			const head = el.createSpan({ cls: "pronote-eval-head" });
			head.createSpan({ cls: "pronote-strong", text: e.name });
			head.createSpan({ cls: "pronote-muted", text: date });
			const dots = head.createSpan({ cls: "pronote-pastilles" });
			for (const skill of e.skills) pastille(dots, skillStatus(skill.abbreviation, skill.level).tone);
		},
		render: (body) => {
			const skills = body.createEl("ul", { cls: "pronote-result-notes" });
			for (const skill of e.skills) {
				const item = skills.createEl("li", { cls: "pronote-result-note" });
				// Le niveau s'écrit toujours en toutes lettres et en abrégé : la pastille colorée n'est qu'un repère.
				const status = skillStatus(skill.abbreviation, skill.level);
				const line = item.createDiv({ cls: "pronote-strong pronote-skill-level" });
				pastille(line, status.tone);
				line.createSpan({ text: status.text });
				const detail = [skill.domain, skill.item ?? ""].filter((x) => x !== "").join(" · ");
				if (detail) item.createDiv({ cls: "pronote-muted pronote-result-item", text: detail });
			}
		},
	});
}

function renderSkills(parent: HTMLElement, r: ResultsDTO, fold: Fold): void {
	const est = estimateOf(r.skillEvaluations);
	if (est) {
		const overall = parent.createDiv({ cls: "pronote-estimate" });
		pastille(overall, est.tone);
		renderEstimateText(overall, est);
	}
	const list = parent.createEl("ul", { cls: "pronote-result-list" });
	for (const group of evaluationsBySubject(r.skillEvaluations)) {
		const li = list.createEl("li", { cls: "pronote-result-fold" });
		fold(li, `skills-${group.subject}`, {
			cls: "is-result",
			label: group.subject,
			level: 4,
			hint: group.evaluations.length === 1 ? "1 évaluation" : `${group.evaluations.length} évaluations`,
			renderLabel: (el) => {
				const est = estimateOf(group.evaluations);
				const head = el.createSpan({ cls: "pronote-skill-head" });
				const line = head.createSpan({ cls: "pronote-skill-name" });
				if (est) pastille(line, est.tone);
				line.createSpan({ cls: "pronote-strong", text: group.subject });
				if (est) renderEstimateText(head.createSpan({ cls: "pronote-estimate" }), est);
			},
			render: (body) => {
				const evals = body.createEl("ul", { cls: "pronote-result-notes" });
				for (const e of group.evaluations) renderEvaluation(evals, e, fold);
			},
		});
	}
}

export function renderResults(body: HTMLElement, r: ResultsDTO, colors: Map<string, string>, fold: Fold): void {
	const sections = resultsSections(r);
	if (r.periodName) body.createEl("p", { cls: "pronote-muted", text: r.periodName });
	if (sections.notes) {
		body.createEl("h3", { cls: "pronote-group-title", text: "Notes" });
		renderNotes(body, r, colors, fold);
	}
	if (sections.skills) {
		body.createEl("h3", { cls: "pronote-group-title", text: "Compétences" });
		renderSkills(body, r, fold);
	}
	if (!sections.notes && !sections.skills) {
		body.createEl("p", { cls: "pronote-muted", text: "Aucun résultat pour cette période." });
	}
	for (const w of r.warnings) body.createEl("p", { cls: "pronote-error", text: w });
}
