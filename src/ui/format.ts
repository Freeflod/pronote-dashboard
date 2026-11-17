// Libellés et dérivations de l'écran : purs (aucun import d'obsidian, aucune horloge lue ici).
import type { BlockState } from "../data/block-state.ts";
import type { AttachmentDTO, HomeworkDTO, LessonDTO } from "../types.ts";
import { homeworkKey, lessonKey } from "../keys.ts";
import { frTime, isoDay } from "../util.ts";

function parseDay(day: string): Date {
	const [y, m, d] = day.split("-").map(Number);
	return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

/** Jour suivant, au format AAAA-MM-JJ. */
export function nextDay(day: string): string {
	const d = parseDay(day);
	d.setDate(d.getDate() + 1);
	return isoDay(d);
}

/** « Pour demain », ou « Pour lundi 16 » quand le prochain jour avec cours n'est pas le lendemain. */
export function dayTitle(target: string, today: string): string {
	if (target === nextDay(today)) return "Pour demain";
	return `Pour ${parseDay(target).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric" })}`;
}

export function inDaysLabel(n: number): string {
	if (n <= 0) return "aujourd'hui";
	if (n === 1) return "demain";
	return `dans ${n} jours`;
}

export function unreadLabel(n: number): string {
	if (n <= 0) return "aucun message non lu";
	return n === 1 ? "1 message non lu" : `${n} messages non lus`;
}

/** Phrase écrite de l'état d'un bloc : la couleur ne porte jamais seule l'information. */
export function stateMessage(state: BlockState<unknown>, emptyLabel: string): string {
	switch (state.kind) {
		case "loading":
			return "Chargement…";
		case "empty":
			return emptyLabel;
		case "error":
			return `Erreur : ${state.message}${state.data === undefined ? "" : " Dernières données enregistrées affichées."}`;
		case "offline":
			return state.data === undefined
				? "Hors ligne : aucune donnée enregistrée sur cet appareil."
				: `Hors ligne : données enregistrées le ${frTime(new Date(state.fetchedAt ?? 0))}.`;
		case "ready":
			return `Mis à jour à ${frTime(new Date(state.fetchedAt))}.${state.cacheWarning ? ` ${state.cacheWarning}` : ""}`;
	}
}

/** Dérive l'état d'un bloc de l'état de sa source ; un résultat vide donne l'état vide. */
export function mapState<T, U>(state: BlockState<T>, f: (data: T) => U, isEmpty: (data: U) => boolean): BlockState<U> {
	switch (state.kind) {
		case "loading":
			return { kind: "loading" };
		case "empty":
			return state;
		case "ready": {
			const data = f(state.data);
			return isEmpty(data) ? { kind: "empty", fetchedAt: state.fetchedAt } : { ...state, data };
		}
		case "error":
		case "offline": {
			const data = state.data === undefined ? undefined : f(state.data);
			const kept = data === undefined || isEmpty(data) ? {} : { data, fetchedAt: state.fetchedAt };
			return state.kind === "error" ? { kind: "error", message: state.message, ...kept } : { kind: "offline", ...kept };
		}
	}
}

function dataOf<T>(s: BlockState<T>): { data: T; fetchedAt?: number } | undefined {
	return s.kind === "ready" || ((s.kind === "error" || s.kind === "offline") && s.data !== undefined)
		? { data: s.data as T, fetchedAt: s.fetchedAt }
		: undefined;
}

/** État d'un bloc nourri par deux sources : erreur, puis hors ligne, puis chargement l'emportent sur le prêt. */
export function combineStates<A, B, U>(
	a: BlockState<A>,
	b: BlockState<B>,
	f: (a: A | undefined, b: B | undefined) => U,
	isEmpty: (data: U) => boolean,
): BlockState<U> {
	const da = dataOf(a);
	const db = dataOf(b);
	const times = [da?.fetchedAt, db?.fetchedAt, a.kind === "empty" ? a.fetchedAt : undefined, b.kind === "empty" ? b.fetchedAt : undefined].filter(
		(t): t is number => t !== undefined,
	);
	const fetchedAt = times.length > 0 ? Math.min(...times) : 0;
	const data = f(da?.data, db?.data);
	const kept = isEmpty(data) ? {} : { data, fetchedAt };
	const failed = [a, b].find((s) => s.kind === "error");
	if (failed?.kind === "error") return { kind: "error", message: failed.message, ...kept };
	if (a.kind === "offline" || b.kind === "offline") return { kind: "offline", ...kept };
	if (a.kind === "loading" || b.kind === "loading") return { kind: "loading" };
	return isEmpty(data) ? { kind: "empty", fetchedAt } : { kind: "ready", data, fetchedAt };
}

const MIME: Record<string, string> = {
	pdf: "application/pdf",
	png: "image/png",
	jpg: "image/jpeg",
	jpeg: "image/jpeg",
	gif: "image/gif",
	webp: "image/webp",
	txt: "text/plain",
};

/** Type MIME d'après l'extension : sert à l'ouverture d'un fichier du cache. */
export function mimeOf(name: string): string {
	const ext = name.slice(name.lastIndexOf(".") + 1).toLowerCase();
	return MIME[ext] ?? "application/octet-stream";
}

export type PreviewKind = "pdf" | "image" | "text" | "none";

/** Aperçu possible dans l'application d'après le type du fichier ; « none » : à enregistrer dans le coffre. */
export function previewKind(name: string): PreviewKind {
	const mime = mimeOf(name);
	if (mime === "application/pdf") return "pdf";
	if (mime.startsWith("image/")) return "image";
	if (mime === "text/plain") return "text";
	return "none";
}

/** Un lien externe ne s'ouvre que pour http: et https: (jamais javascript:, data:, file:…). */
export function isSafeExternalUrl(url: string): boolean {
	try {
		const { protocol } = new URL(url);
		return protocol === "http:" || protocol === "https:";
	} catch {
		return false;
	}
}

export interface ResourceItem {
	file: AttachmentDTO;
	/** Clé stable du devoir ou de la séance qui porte la pièce. */
	ownerKey: string;
	subject: string;
	origin: "devoir" | "séance";
}

/** Pièces jointes des devoirs puis des séances ; un doublon exact (nom et lien) n'apparaît qu'une fois. */
export function resourcesOf(homework: HomeworkDTO[], lessons: LessonDTO[]): ResourceItem[] {
	const seen = new Set<string>();
	const out: ResourceItem[] = [];
	const add = (file: AttachmentDTO, subject: string, origin: ResourceItem["origin"], ownerKey: string) => {
		const id = `${file.name}|${file.url}`;
		if (seen.has(id)) return;
		seen.add(id);
		out.push({ file, ownerKey, subject, origin });
	};
	for (const h of homework) for (const f of h.attachments) add(f, h.subject, "devoir", homeworkKey(h));
	for (const l of lessons) for (const c of l.contents) for (const f of c.files) add(f, l.subject, "séance", lessonKey(l));
	return out;
}

/** Jour AAAA-MM-JJ décalé de `n` jours. */
export function addDays(day: string, n: number): string {
	const d = parseDay(day);
	d.setDate(d.getDate() + n);
	return isoDay(d);
}

/** Couleur de matière envoyée par Pronote : #hex ou rgb() seulement, jamais un texte libre posé dans une propriété CSS. */
export function safeColor(color: string | undefined): string | undefined {
	if (!color) return undefined;
	return /^(#[0-9a-f]{3,8}|rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\))$/i.test(color) ? color : undefined;
}

/** Première couleur valide rencontrée pour chaque matière. */
export function subjectColors(sources: { subject: string; color?: string }[]): Map<string, string> {
	const out = new Map<string, string>();
	for (const s of sources) {
		const c = safeColor(s.color);
		if (c && !out.has(s.subject)) out.set(s.subject, c);
	}
	return out;
}

export interface SeenInClass {
	/** Une ligne, tronquée. */
	summary: string;
	/** Titres et textes de la séance, un paragraphe chacun. */
	paragraphs: string[];
}

const SUMMARY_MAX = 90;

/** Contenu de la séance la plus récente de la matière qui en porte un (pour « Vu en cours »). */
export function lastSeen(lessons: LessonDTO[], subject: string): SeenInClass | undefined {
	const withContent = lessons
		.filter((l) => l.subject === subject)
		.map((l) => ({ l, paragraphs: l.contents.flatMap((c) => [c.title, c.text]).filter((t): t is string => !!t && t.trim() !== "") }))
		.filter((x) => x.paragraphs.length > 0)
		.sort((a, b) => b.l.start.localeCompare(a.l.start));
	const best = withContent[0];
	if (!best) return undefined;
	const first = (best.paragraphs[0] ?? "").split("\n")[0]?.trim() ?? "";
	const summary = first.length > SUMMARY_MAX ? `${first.slice(0, SUMMARY_MAX - 1).trimEnd()}…` : first;
	return { summary, paragraphs: best.paragraphs };
}

export type LinkSegment = { text: string } | { text: string; href: string };

const LINK_PATTERN = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s<>\])]+)/g;

/**
 * Découpe un texte venant de Pronote (Markdown simple de `htmlToMarkdown`) en morceaux de texte et en liens.
 * Seuls http et https donnent un lien ; la ponctuation qui suit une URL brute reste du texte.
 */
export function linkSegments(text: string): LinkSegment[] {
	const out: LinkSegment[] = [];
	let pending = "";
	const flush = () => {
		if (pending) out.push({ text: pending });
		pending = "";
	};
	let last = 0;
	for (const m of text.matchAll(LINK_PATTERN)) {
		const start = m.index;
		let label = m[1];
		let href = m[2] ?? m[3] ?? "";
		let trailing = "";
		if (m[3] !== undefined) {
			const stripped = href.replace(/[.,;:!?]+$/, "");
			trailing = href.slice(stripped.length);
			href = stripped;
			label = href;
		}
		pending += text.slice(last, start);
		if (isSafeExternalUrl(href)) {
			flush();
			out.push({ text: label ?? href, href });
		} else {
			pending += m[0];
		}
		pending += trailing;
		last = start + m[0].length;
	}
	pending += text.slice(last);
	flush();
	return out;
}
