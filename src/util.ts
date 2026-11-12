/** Convertit le HTML du cahier de texte en Markdown simple. */
export function htmlToMarkdown(html: string | undefined): string {
	if (!html) return "";
	const doc = new DOMParser().parseFromString(html, "text/html");

	const walk = (node: Node): string => {
		if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
		if (node.nodeType !== Node.ELEMENT_NODE) return "";
		const el = node as HTMLElement;
		const inner = Array.from(el.childNodes).map(walk).join("");
		switch (el.tagName.toLowerCase()) {
			case "br":
				return "\n";
			case "p":
			case "div":
				return inner.trim() ? inner + "\n" : "";
			case "li":
				return "- " + inner.trim() + "\n";
			case "ul":
			case "ol":
				return inner;
			case "b":
			case "strong":
				return inner.trim() ? `**${inner.trim()}**` : "";
			case "i":
			case "em":
				return inner.trim() ? `*${inner.trim()}*` : "";
			case "a": {
				const href = el.getAttribute("href");
				return href && inner.trim() ? `[${inner.trim()}](${href})` : inner;
			}
			default:
				return inner;
		}
	};

	return walk(doc.body)
		.replace(/\u00A0/g, " ")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}

export function sanitizeName(name: string): string {
	return (
		name
			.replace(/[\\/:*?"<>|#^[\]]/g, " ")
			.replace(/\s+/g, " ")
			.trim()
			.slice(0, 80) || "Sans titre"
	);
}

export function isoDay(date: string | Date): string {
	const d = typeof date === "string" ? new Date(date) : date;
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${y}-${m}-${day}`;
}

export function frDate(date: string | Date, withWeekday = true): string {
	const d = typeof date === "string" ? new Date(date) : date;
	return d.toLocaleDateString("fr-FR", {
		weekday: withWeekday ? "long" : undefined,
		day: "numeric",
		month: "long",
	});
}

export function frTime(date: string | Date): string {
	const d = typeof date === "string" ? new Date(date) : date;
	return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export function startOfToday(): Date {
	const d = new Date();
	d.setHours(0, 0, 0, 0);
	return d;
}

export function escapeCell(text: string): string {
	return text.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

/** "DUPONT Jean Pierre" devient "Jean Pierre" (format Pronote : NOM en capitales, puis prénoms). */
export function friendlyName(full: string): string {
	const parts = full.trim().split(/\s+/).filter(Boolean);
	const given = parts.filter((p) => p !== p.toUpperCase());
	return (given.length ? given.join(" ") : parts.join(" ")) || "";
}

/** Étiquette hiérarchique en minuscules et sans accents. */
export function slugTag(text: string): string {
	return text
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

/** Nom de fichier assaini qui conserve l'extension. */
export function sanitizeFileName(name: string): string {
	const m = name.match(/(\.[A-Za-z0-9]{1,6})$/);
	const ext = m ? m[1] : "";
	const base = ext ? name.slice(0, -ext.length) : name;
	return sanitizeName(base).slice(0, 70) + ext.toLowerCase();
}

export function localDateTime(d: Date = new Date()): string {
	const hh = String(d.getHours()).padStart(2, "0");
	const mm = String(d.getMinutes()).padStart(2, "0");
	return `${isoDay(d)}T${hh}:${mm}`;
}

export function unique<T>(items: T[]): T[] {
	return Array.from(new Set(items));
}

/** Nombre de points à la française (« 14 », « 14,5 », « 12,25 ») ; un nombre invalide (NaN, infini) n'est pas affiché. */
export function formatPoints(points: number): string | undefined {
	if (!Number.isFinite(points)) return undefined;
	return Number.isInteger(points) ? String(points) : points.toFixed(2).replace(".", ",").replace(/0$/, "");
}
