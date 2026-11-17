// Règles pures du rendu du HTML de Pronote (src/ui/rich-html.ts) : couleur la plus proche dans la palette
// d'Obsidian et liste blanche des balises. Aucun accès au DOM ici : tout se teste dans Node.

/** Couleurs étendues d'Obsidian (`--color-<nom>`) ; `styles.css` porte `pronote-c-<nom>` et `pronote-bg-<nom>` par entrée. */
export const RICH_COLORS = ["red", "orange", "yellow", "green", "cyan", "blue", "purple", "pink"] as const;
export type RichColor = (typeof RICH_COLORS)[number];

/** En dessous de cette saturation (0 à 1), la couleur est un gris : aucune couleur rendue. */
export const GRAY_SATURATION = 0.2;
/** Clarté (0 à 1) en dessous de laquelle la couleur est lue comme du noir, au-dessus comme du blanc. */
export const BLACK_LIGHTNESS = 0.1;
export const WHITE_LIGHTNESS = 0.93;

type Rgba = [number, number, number, number];

/** Lecture d'une table par une clé venue de l'extérieur, sans jamais rendre une propriété héritée (`constructor`…). */
function own<T>(table: Record<string, T>, key: string): T | undefined {
	return Object.prototype.hasOwnProperty.call(table, key) ? table[key] : undefined;
}

/** Noms CSS usuels. Les autres noms sont illisibles pour le plugin : le texte garde la couleur du thème. */
const NAMED: Record<string, Rgba> = {
	red: [255, 0, 0, 1],
	maroon: [128, 0, 0, 1],
	orange: [255, 165, 0, 1],
	gold: [255, 215, 0, 1],
	yellow: [255, 255, 0, 1],
	olive: [128, 128, 0, 1],
	green: [0, 128, 0, 1],
	lime: [0, 255, 0, 1],
	teal: [0, 128, 128, 1],
	cyan: [0, 255, 255, 1],
	aqua: [0, 255, 255, 1],
	blue: [0, 0, 255, 1],
	navy: [0, 0, 128, 1],
	indigo: [75, 0, 130, 1],
	purple: [128, 0, 128, 1],
	violet: [238, 130, 238, 1],
	magenta: [255, 0, 255, 1],
	fuchsia: [255, 0, 255, 1],
	pink: [255, 192, 203, 1],
	brown: [165, 42, 42, 1],
	black: [0, 0, 0, 1],
	white: [255, 255, 255, 1],
	gray: [128, 128, 128, 1],
	grey: [128, 128, 128, 1],
	silver: [192, 192, 192, 1],
};

function parseHex(value: string): Rgba | undefined {
	if (!/^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/.test(value)) return undefined;
	let hex = value.slice(1);
	if (hex.length <= 4) hex = [...hex].map((c) => c + c).join("");
	const at = (i: number) => parseInt(hex.slice(i, i + 2), 16);
	return [at(0), at(2), at(4), hex.length === 8 ? at(6) / 255 : 1];
}

function parseRgb(value: string): Rgba | undefined {
	const m = /^rgba?\(([^()]*)\)$/.exec(value);
	if (!m) return undefined;
	const parts = (m[1] ?? "").split(/[\s,/]+/).filter((p) => p !== "");
	if (parts.length !== 3 && parts.length !== 4) return undefined;
	const numbers = parts.map((p, i) => {
		if (!/^[+-]?(?:\d+\.?\d*|\.\d+)%?$/.test(p)) return Number.NaN;
		const n = parseFloat(p);
		const percent = p.endsWith("%");
		if (i === 3) return Math.min(1, Math.max(0, percent ? n / 100 : n));
		return Math.min(255, Math.max(0, percent ? n * 2.55 : n));
	});
	if (numbers.some((n) => Number.isNaN(n))) return undefined;
	return [numbers[0] ?? 0, numbers[1] ?? 0, numbers[2] ?? 0, numbers[3] ?? 1];
}

/**
 * Couleur de la palette d'Obsidian la plus proche d'une couleur CSS (hexadécimal, `rgb()`, `rgba()`, nom usuel),
 * par teinte. Gris, noir, blanc, transparent ou valeur illisible : `undefined`, le texte garde la couleur du thème.
 */
export function colorBucket(css: string | null | undefined): RichColor | undefined {
	const value = (css ?? "").trim().toLowerCase();
	if (value === "") return undefined;
	const rgba = value.startsWith("#") ? parseHex(value) : value.startsWith("rgb") ? parseRgb(value) : own(NAMED, value);
	if (!rgba) return undefined;
	const [r, g, b, alpha] = rgba;
	if (alpha === 0) return undefined;
	const max = Math.max(r, g, b) / 255;
	const min = Math.min(r, g, b) / 255;
	const lightness = (max + min) / 2;
	const delta = max - min;
	if (delta === 0 || lightness < BLACK_LIGHTNESS || lightness > WHITE_LIGHTNESS) return undefined;
	const saturation = delta / (1 - Math.abs(2 * lightness - 1));
	if (saturation < GRAY_SATURATION) return undefined;
	const [rn, gn, bn] = [r / 255, g / 255, b / 255];
	const sector = max === rn ? ((gn - bn) / delta + 6) % 6 : max === gn ? (bn - rn) / delta + 2 : (rn - gn) / delta + 4;
	const hue = sector * 60;
	// un rouge très clair se lit rose ; un magenta sombre se lit violet
	if (hue < 15 || hue >= 343) return lightness > 0.75 ? "pink" : "red";
	if (hue < 45) return "orange";
	if (hue < 75) return "yellow";
	if (hue < 160) return "green";
	if (hue < 195) return "cyan";
	if (hue < 255) return "blue";
	if (hue < 285) return "purple";
	if (hue < 320) return lightness < 0.4 ? "purple" : "pink";
	return "pink";
}

export interface StyleColors {
	color?: RichColor;
	background?: RichColor;
}

/** Couleurs du texte et du fond déclarées dans un attribut `style` ; le reste du style est ignoré. */
export function styleColors(style: string | null | undefined): StyleColors {
	const out: StyleColors = {};
	for (const declaration of (style ?? "").split(";")) {
		const colon = declaration.indexOf(":");
		if (colon < 0) continue;
		const name = declaration.slice(0, colon).trim().toLowerCase();
		const bucket = colorBucket(declaration.slice(colon + 1).replace(/!\s*important/i, ""));
		if (!bucket) continue;
		if (name === "color") out.color = bucket;
		else if (name === "background-color" || name === "background") out.background = bucket;
	}
	return out;
}

/** Balise rendue telle quelle, `drop` (jetée avec son contenu) ou `unwrap` (balise retirée, contenu gardé comme texte et balises permises). */
export type RichTag = "p" | "div" | "br" | "ul" | "ol" | "li" | "strong" | "em" | "u" | "a" | "span" | "drop" | "unwrap";

const TAGS: Record<string, RichTag> = {
	p: "p",
	div: "div",
	br: "br",
	ul: "ul",
	ol: "ol",
	li: "li",
	strong: "strong",
	b: "strong",
	em: "em",
	i: "em",
	u: "u",
	a: "a",
	span: "span",
	// blocs hors liste : gardés comme simples blocs, pour que leurs lignes ne se collent pas
	h1: "div",
	h2: "div",
	h3: "div",
	h4: "div",
	h5: "div",
	h6: "div",
	blockquote: "div",
	pre: "div",
	tr: "div",
	// jamais de texte utile, ou du code
	script: "drop",
	style: "drop",
	iframe: "drop",
	object: "drop",
	embed: "drop",
	template: "drop",
	noscript: "drop",
	svg: "drop",
	math: "drop",
	head: "drop",
	title: "drop",
	meta: "drop",
	link: "drop",
};

/** Liste blanche du rendu : ce que devient une balise du HTML de Pronote. */
export function richTag(tag: string): RichTag {
	return own(TAGS, tag.toLowerCase()) ?? "unwrap";
}

/** Valeur de l'attribut `color` de l'ancienne balise `<font>` : un hexadécimal sans dièse (`FF0000`) y est courant. */
export function legacyColor(value: string | null | undefined): string | undefined {
	const v = value?.trim();
	if (!v) return undefined;
	return /^([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v) ? `#${v}` : v;
}
