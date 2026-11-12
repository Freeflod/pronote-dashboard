// Politique du cache de fichiers : pure, sans accès au stockage. Les instants sont en millisecondes.

const DAY_MS = 24 * 60 * 60 * 1000;

export interface CachedFile {
	key: string;
	size: number;
	storedAt: number;
}

export interface EvictionPlan {
	store: boolean;
	evict: string[];
}

/** Vrai si l'entrée a dépassé sa durée de vie (la limite exacte n'est pas périmée). */
export function isExpired(storedAt: number, days: number, now: number): boolean {
	return now - storedAt > days * DAY_MS;
}

/**
 * Décide si un fichier entrant se stocke et quels fichiers évincer, les plus anciens d'abord.
 * Plafond atteint ou dépassé par le seul fichier entrant (ou plafond 0) : rien n'est stocké ni évincé.
 */
export function planEviction(files: CachedFile[], incoming: { size: number }, maxBytes: number): EvictionPlan {
	if (maxBytes <= 0 || incoming.size > maxBytes) return { store: false, evict: [] };
	let total = files.reduce((sum, f) => sum + f.size, 0) + incoming.size;
	const evict: string[] = [];
	for (const f of [...files].sort((a, b) => a.storedAt - b.storedAt)) {
		if (total <= maxBytes) break;
		evict.push(f.key);
		total -= f.size;
	}
	return { store: true, evict };
}
