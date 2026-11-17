/** Valeur écrite telle quelle dans le YAML (dates, dates et heures). */
export class Raw {
	text: string;
	constructor(text: string) {
		this.text = text;
	}
}

export type PropValue = string | number | boolean | Raw | PropValue[];
export type Props = Record<string, PropValue | null | undefined>;

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/;

function scalar(v: string): string {
	const plain =
		/^[\p{L}\p{N}][\p{L}\p{N} .'()/+_-]*$/u.test(v) &&
		!/\s$/.test(v) &&
		!/^(true|false|null|yes|no|on|off|y|n)$/i.test(v) &&
		!/^[\d.+_-]+$/.test(v) &&
		!/^\d{4}-\d{2}-\d{2}/.test(v);
	return plain ? v : JSON.stringify(v);
}

function value(v: PropValue): string {
	if (v instanceof Raw) return v.text;
	if (Array.isArray(v)) return `[${v.map(value).join(", ")}]`;
	if (typeof v === "string") return scalar(v);
	return String(v);
}

/** Écrit le bloc de propriétés. Les dates restent sans guillemets pour que Obsidian les reconnaisse. */
export function renderFrontmatter(props: Props): string {
	const lines = ["---"];
	for (const [key, v] of Object.entries(props)) {
		if (v === null || v === undefined) continue;
		if (Array.isArray(v) && v.length === 0) continue;
		lines.push(`${key}: ${value(v)}`);
	}
	lines.push("---");
	return lines.join("\n");
}

export function dateValue(day: string): Raw {
	return new Raw(day);
}

/** Remplace {{variable}} dans les textes, y compris à l'intérieur des listes. */
export function substitute(v: PropValue, vars: Record<string, string>): PropValue {
	if (typeof v === "string") {
		return v.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, k: string) => vars[k] ?? "");
	}
	if (Array.isArray(v)) return v.map((x) => substitute(x, vars));
	return v;
}

function convert(v: unknown): PropValue | null {
	if (v === null || v === undefined) return "";
	if (v instanceof Date) {
		const y = v.getUTCFullYear();
		const m = String(v.getUTCMonth() + 1).padStart(2, "0");
		const d = String(v.getUTCDate()).padStart(2, "0");
		return new Raw(`${y}-${m}-${d}`);
	}
	if (typeof v === "string") {
		return DATE_ONLY.test(v) || DATE_TIME.test(v) ? new Raw(v) : v;
	}
	if (typeof v === "number" || typeof v === "boolean") return v;
	if (Array.isArray(v)) {
		return v.map((x) => convert(x)).filter((x): x is PropValue => x !== null);
	}
	return null;
}

/** Transforme le YAML saisi dans les réglages en propriétés. parse est parseYaml d'Obsidian. */
export function parseUserProps(
	text: string,
	parse: (yaml: string) => unknown,
): { props: Props; error?: string } {
	if (!text.trim()) return { props: {} };
	let obj: unknown;
	try {
		obj = parse(text);
	} catch (e) {
		return { props: {}, error: (e as Error).message };
	}
	if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
		return { props: {}, error: "Le YAML doit être une suite de lignes « propriété: valeur »." };
	}
	const props: Props = {};
	for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
		if (!/^[\p{L}\p{N}_-]+$/u.test(k)) {
			return { props: {}, error: `Nom de propriété invalide : ${k}` };
		}
		const c = convert(v);
		if (c !== null) props[k] = c;
	}
	return { props };
}

export function toList(v: PropValue | null | undefined): string[] {
	if (v === null || v === undefined) return [];
	if (Array.isArray(v)) return v.flatMap((x) => toList(x));
	if (v instanceof Raw) return [v.text];
	return String(v) ? [String(v)] : [];
}

/** Types de propriétés à enregistrer dans Obsidian pour que les dates et listes s'affichent correctement. */
export const PROPERTY_TYPES: Record<string, string> = {
	date: "date",
	devoir_pour: "date",
	maj: "datetime",
	professeur: "multitext",
	tags: "tags",
	moyenne: "number",
	a_faire: "number",
	type: "text",
	statut: "text",
	matiere: "text",
	eleve: "text",
	periode: "text",
	pronote_id: "text",
};
