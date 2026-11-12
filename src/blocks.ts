// Règles métier des blocs de l'écran : pures. « Aujourd'hui » est toujours un paramètre
// (jour local au format AAAA-MM-JJ, voir isoDay), jamais lu dans l'horloge ici.
import type { Account, GradeDTO, HomeworkDTO, LessonDTO, Mode, ResultsDTO, SkillEvaluationDTO, SubjectAverageDTO } from "./types.ts";
import { isoDay } from "./util.ts";

/** Un cours tel que le lisent les blocs : LessonDTO plus les drapeaux Pronote (non encore portés par le DTO). */
export type LessonInput = Pick<LessonDTO, "subject" | "start"> & { canceled?: boolean; test?: boolean };

export interface Reminder {
	subject: string;
	text: string;
}

export interface SubjectGroup {
	subject: string;
	items: HomeworkDTO[];
}

export interface DayGroup {
	/** AAAA-MM-JJ */
	day: string;
	overdue: boolean;
	subjects: SubjectGroup[];
}

export interface BagItem {
	subject: string;
	canceled: boolean;
}

export interface UpcomingTest {
	subject: string;
	inDays: number;
}

export interface Tab {
	key: string;
	label: string;
}

export interface ToggleOutcome {
	enabled: boolean;
	rollback: boolean;
	message?: string;
}

export function isOverdue(h: HomeworkDTO, today: string): boolean {
	return !h.done && isoDay(h.deadline) < today;
}

/**
 * Par jour d'échéance puis matière. Échu et fait : absent. Échu et non fait : groupe « en retard »,
 * tant que l'échéance date de `overdueDays` jours ou moins (PD-012) ; au-delà : absent. 0 : aucun retard.
 */
export function groupHomework(items: HomeworkDTO[], today: string, overdueDays: number): DayGroup[] {
	const days = new Map<string, DayGroup>();
	for (const h of items) {
		const day = isoDay(h.deadline);
		if (day < today && (h.done || daysBetween(day, today) > overdueDays)) continue;
		let group = days.get(day);
		if (!group) {
			group = { day, overdue: day < today, subjects: [] };
			days.set(day, group);
		}
		let subject = group.subjects.find((s) => s.subject === h.subject);
		if (!subject) {
			subject = { subject: h.subject, items: [] };
			group.subjects.push(subject);
		}
		subject.items.push(h);
	}
	const groups = [...days.values()].sort((a, b) => a.day.localeCompare(b.day));
	for (const g of groups) g.subjects.sort((a, b) => a.subject.localeCompare(b.subject, "fr"));
	return groups;
}

function activeDays(lessons: LessonInput[]): string[] {
	const byDay = new Map<string, boolean>();
	for (const l of lessons) {
		const day = isoDay(l.start);
		byDay.set(day, (byDay.get(day) ?? false) || !l.canceled);
	}
	return [...byDay].filter(([, active]) => active).map(([day]) => day).sort();
}

/** Prochain jour strictement après aujourd'hui qui compte un cours non annulé ; null s'il n'y en a pas. */
export function nextSchoolDay(lessons: LessonInput[], today: string): string | null {
	return activeDays(lessons).find((d) => d > today) ?? null;
}

/** Une pastille par matière du jour, dans l'ordre des cours ; annulée si tous ses cours le sont. */
export function bagFor(lessons: LessonInput[], day: string): BagItem[] {
	const out: BagItem[] = [];
	const ordered = lessons.filter((l) => isoDay(l.start) === day).sort((a, b) => a.start.localeCompare(b.start));
	for (const l of ordered) {
		const known = out.find((b) => b.subject === l.subject);
		if (known) known.canceled = known.canceled && !!l.canceled;
		else out.push({ subject: l.subject, canceled: !!l.canceled });
	}
	return out;
}

/** Entrées de l'emploi du temps d'un jour (AAAA-MM-JJ), triées par heure de début. */
export function coursesOn<T extends { start: string }>(entries: T[], day: string): T[] {
	return entries.filter((e) => isoDay(e.start) === day).sort((a, b) => a.start.localeCompare(b.start));
}

function normalize(text: string): string {
	return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
}

/** Rappel de la matière : clé sans casse ni accents ; aucune règle, aucun rappel. */
export function reminderFor(subject: string, reminders: Reminder[]): Reminder | undefined {
	const key = normalize(subject);
	return reminders.find((r) => normalize(r.subject) === key);
}

function daysBetween(from: string, to: string): number {
	const [fy, fm, fd] = from.split("-").map(Number);
	const [ty, tm, td] = to.split("-").map(Number);
	return Math.round((Date.UTC(ty ?? 0, (tm ?? 1) - 1, td ?? 1) - Date.UTC(fy ?? 0, (fm ?? 1) - 1, fd ?? 1)) / 86_400_000);
}

/** Cours marqués contrôle, non annulés, d'aujourd'hui ou à venir, du plus proche au plus lointain. */
export function upcomingTests(lessons: LessonInput[], today: string): UpcomingTest[] {
	return lessons
		.filter((l) => l.test && !l.canceled && isoDay(l.start) >= today)
		.map((l) => ({ subject: l.subject, start: l.start, inDays: daysBetween(today, isoDay(l.start)) }))
		.sort((a, b) => a.start.localeCompare(b.start))
		.map(({ subject, inDays }) => ({ subject, inDays }));
}

/** Un onglet par (compte, élève) ; la clé sert aussi de clé de cache. */
export function tabsOf(accounts: Account[]): Tab[] {
	const tabs: Tab[] = [];
	for (const a of accounts) {
		const students = a.resources.length > 0 ? a.resources : [a.name];
		for (const s of students) tabs.push({ key: `${a.id}:${s}`, label: s });
	}
	return tabs;
}

/** Case « fait » : désactivée hors ligne et en mode parent ; échec de l'écriture = retour arrière + message. */
export function toggleOutcome(online: boolean, mode: Mode, result: "pending" | "ok" | "error"): ToggleOutcome {
	if (mode === "parent") return { enabled: false, rollback: false, message: "Lecture seule en mode parent." };
	if (!online) return { enabled: false, rollback: false, message: "Hors ligne : la case est désactivée." };
	if (result === "error") {
		return { enabled: true, rollback: true, message: "Échec de l'enregistrement sur Pronote : la case est rétablie." };
	}
	return { enabled: true, rollback: false };
}

/** Sous-parties de la section « Résultats scolaires » à afficher : seulement celles qui ont des données. */
export function resultsSections(r: ResultsDTO): { notes: boolean; skills: boolean } {
	return { notes: r.grades.length > 0, skills: r.skillEvaluations.some((e) => e.skills.length > 0) };
}

/** Évaluations de compétences par matière : la matière à l'évaluation la plus récente d'abord, évaluations récentes d'abord ; celles sans compétence sont écartées. */
export function evaluationsBySubject(evals: SkillEvaluationDTO[]): { subject: string; evaluations: SkillEvaluationDTO[] }[] {
	const time = (e: SkillEvaluationDTO): number => {
		const t = new Date(e.date).getTime();
		return Number.isNaN(t) ? 0 : t;
	};
	const bySubject = new Map<string, SkillEvaluationDTO[]>();
	for (const e of evals) {
		if (e.skills.length === 0) continue;
		const list = bySubject.get(e.subject);
		if (list) list.push(e);
		else bySubject.set(e.subject, [e]);
	}
	return [...bySubject]
		.map(([subject, list]) => {
			const evaluations = [...list].sort((a, b) => time(b) - time(a));
			return { subject, evaluations, latest: Math.max(...evaluations.map(time)) };
		})
		.sort((a, b) => b.latest - a.latest)
		.map(({ subject, evaluations }) => ({ subject, evaluations }));
}

/** Une lecture partielle en échec ne remplace pas la partie correspondante du cache : on garde la précédente. */
export function mergeResults(next: ResultsDTO, previous: ResultsDTO | undefined): ResultsDTO {
	if (!previous || !next.failed) return next;
	const merged: ResultsDTO = { ...next };
	if (next.failed.notes) {
		merged.overallAverage = previous.overallAverage;
		merged.classAverage = previous.classAverage;
		merged.averages = previous.averages;
		merged.grades = previous.grades;
	}
	if (next.failed.skills) merged.skillEvaluations = previous.skillEvaluations;
	return merged;
}

/** Nombre d'une valeur formatée en français (« 14,5 ») ; une valeur spéciale (Abs, Disp, N.Not) ou vide : undefined. */
export function parseGrade(s: string | undefined): number | undefined {
	if (s === undefined) return undefined;
	const t = s.trim().replace(",", ".");
	if (!/^-?\d+(\.\d+)?$/.test(t)) return undefined;
	return Number(t);
}

/** Écart élève/classe en toutes lettres (arrondi à 0,1) ; undefined si l'une des deux valeurs n'est pas numérique. */
export function gapLabel(student: string | undefined, klass: string | undefined): { text: string; sign: -1 | 0 | 1 } | undefined {
	const a = parseGrade(student);
	const b = parseGrade(klass);
	if (a === undefined || b === undefined) return undefined;
	const diff = a - b;
	// Arrondi sur la valeur absolue (demi vers le haut) : le même écart donne le même texte dans les deux sens.
	const tenths = Math.round(Math.abs(diff) * 10 + 1e-9);
	if (tenths === 0) return { text: "comme la classe", sign: 0 };
	const amount = (tenths / 10).toString().replace(".", ",");
	return diff > 0 ? { text: `${amount} au-dessus de la classe`, sign: 1 } : { text: `${amount} en dessous de la classe`, sign: -1 };
}

export interface SubjectNotes {
	subject: string;
	student?: string;
	classAverage?: string;
	/** Plus récente d'abord. */
	grades: GradeDTO[];
}

/** Notes et moyennes regroupées par matière : la matière à la note la plus récente d'abord, celles sans note en dernier. */
export function notesBySubject(grades: GradeDTO[], averages: SubjectAverageDTO[]): SubjectNotes[] {
	const time = (g: GradeDTO): number => {
		const t = new Date(g.date).getTime();
		return Number.isNaN(t) ? 0 : t;
	};
	const bySubject = new Map<string, SubjectNotes>();
	for (const a of averages) {
		if (a.student === undefined && a.classAverage === undefined) continue;
		bySubject.set(a.subject, { subject: a.subject, student: a.student, classAverage: a.classAverage, grades: [] });
	}
	for (const g of grades) {
		let entry = bySubject.get(g.subject);
		if (!entry) bySubject.set(g.subject, (entry = { subject: g.subject, grades: [] }));
		entry.grades.push(g);
	}
	const list = [...bySubject.values()];
	for (const s of list) s.grades.sort((x, y) => time(y) - time(x));
	const latest = (s: SubjectNotes): number => (s.grades[0] ? time(s.grades[0]) : -Infinity);
	return list.sort((x, y) => {
		const lx = latest(x);
		const ly = latest(y);
		if (lx === ly) return 0;
		return lx < ly ? 1 : -1;
	});
}

/** Matières dont l'élève est en dessous de la classe (écart arrondi à 0,1), dans l'ordre reçu. */
export function subjectsBelowClass(notes: SubjectNotes[]): string[] {
	return notes.filter((n) => gapLabel(n.student, n.classAverage)?.sign === -1).map((n) => n.subject);
}

/** Texte d'une note : « 16 / 20 », ou la valeur seule si elle n'est pas numérique (Abs, Disp…) : pas de « sur 20 » pour une absence. */
export function gradeText(value: string, outOf: string): string {
	return parseGrade(value) === undefined ? value : `${value} / ${outOf}`;
}

/** Coefficient d'une note à la française (« coef. 0,5 ») ; rien quand il vaut 1. */
export function coefText(coefficient: number): string {
	return coefficient === 1 ? "" : `coef. ${String(coefficient).replace(".", ",")}`;
}

export type SkillTone = "top" | "good" | "fair" | "low" | "none";

const SKILL_TONES: Record<string, SkillTone> = { "A+": "top", A: "good", C: "fair", E: "low" };
const SKILL_STATES: Record<string, string> = { ABS: "Absent", NE: "Non évalué" };

/** Niveau d'une compétence : texte (toujours écrit) et teinte de la pastille (A+ vert foncé, A vert, C jaune, E rouge ; Abs, Ne et inconnus : aucune). */
export function skillStatus(abbreviation: string, level: string): { text: string; tone: SkillTone } {
	const key = abbreviation.trim().toUpperCase();
	const state = SKILL_STATES[key];
	if (state) return { text: state, tone: "none" };
	return { text: level.trim() === "" ? abbreviation : `${level} · ${abbreviation}`, tone: SKILL_TONES[key] ?? "none" };
}

const SKILL_SCORES: Record<string, number> = { "A+": 4, A: 3, C: 2, E: 1 };

/** Score d'une compétence (A+ 4, A 3, C 2, E 1) ; Abs, Ne et abréviation inconnue : undefined, jamais 0 (PD-013). */
export function skillScore(abbreviation: string): number | undefined {
	return SKILL_SCORES[abbreviation.trim().toUpperCase()];
}

function scoresOf(e: SkillEvaluationDTO): number[] {
	return e.skills.map((s) => skillScore(s.abbreviation)).filter((n): n is number => n !== undefined);
}

function mean(values: number[]): number {
	return values.reduce((a, b) => a + b, 0) / values.length;
}

/** Niveau estimé : moyenne des scores de toutes les compétences notées, ramenée à A+ (≥ 3,5), A (≥ 2,5), C (≥ 1,5) ou E. */
export function estimatedLevel(evals: SkillEvaluationDTO[]): { abbreviation: "A+" | "A" | "C" | "E"; mean: number } | undefined {
	const scores = evals.flatMap(scoresOf);
	if (scores.length === 0) return undefined;
	const m = mean(scores);
	return { abbreviation: m >= 3.5 ? "A+" : m >= 2.5 ? "A" : m >= 1.5 ? "C" : "E", mean: m };
}

/** Seuil de la tendance : écart de moyenne entre les 3 évaluations récentes et les précédentes (PD-013). */
const TREND_GAP = 0.25;
const TREND_RECENT = 3;

/**
 * Tendance : moyenne (par évaluation) des 3 évaluations les plus récentes moins celle des précédentes.
 * Moins de 4 évaluations ayant au moins un score : undefined.
 */
export function skillTrend(evals: SkillEvaluationDTO[]): "up" | "down" | "stable" | undefined {
	const time = (e: SkillEvaluationDTO): number => {
		const t = new Date(e.date).getTime();
		return Number.isNaN(t) ? 0 : t;
	};
	const means = evals
		.map((e) => ({ t: time(e), scores: scoresOf(e) }))
		.filter((e) => e.scores.length > 0)
		.sort((a, b) => a.t - b.t)
		.map((e) => mean(e.scores));
	if (means.length < TREND_RECENT + 1) return undefined;
	const diff = mean(means.slice(-TREND_RECENT)) - mean(means.slice(0, -TREND_RECENT));
	if (diff >= TREND_GAP - 1e-9) return "up";
	if (diff <= -TREND_GAP + 1e-9) return "down";
	return "stable";
}
