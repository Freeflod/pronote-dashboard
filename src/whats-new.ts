// Nouveautés montrées une fois après une mise à jour. Module pur : le CHANGELOG.md n'est pas livré avec le plugin,
// les nouveautés vivent donc ici. À chaque version publiée : une entrée en tête (un test l'exige).

export interface NewsEntry {
	version: string;
	/** Phrases courtes, en français, sans donnée d'enfant. */
	items: string[];
}

/** De la plus récente à la plus ancienne. */
export const WHATS_NEW: NewsEntry[] = [
	{
		version: "0.7.0",
		items: [
			"La photo de l'enfant s'affiche à côté de son nom. Sans photo, une lettre de couleur la remplace.",
			"S'il y a plusieurs enfants, on touche la photo ronde de celui qu'on veut voir, tout en haut.",
			"Les cours sont classés par jour ou par matière. On change d'un clic, et on peut n'afficher qu'une seule matière.",
			"Chaque cours est replié : on voit la matière et le titre. On touche pour lire tout le texte.",
			"Le texte du professeur ressemble à celui de Pronote : mots en gras, listes, liens et couleurs.",
			"Après une mise à jour, l'application remet les devoirs et l'emploi du temps à jour toute seule.",
		],
	},
];

function parse(v: string): number[] | null {
	const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(v);
	return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

/** 1 si a > b, -1 si a < b, 0 si égales, null si l'une n'est pas de la forme X.Y.Z. */
export function compareVersions(a: string, b: string): number | null {
	const pa = parse(a);
	const pb = parse(b);
	if (!pa || !pb) return null;
	for (let i = 0; i < 3; i++) {
		if (pa[i] !== pb[i]) return pa[i] > pb[i] ? 1 : -1;
	}
	return 0;
}

/**
 * Les versions à annoncer : plus récentes que la dernière vue, jamais plus récentes que la courante.
 * Version vue absente ou illisible : la plus récente seulement.
 */
export function newsSince(seen: string | undefined, current: string, list: NewsEntry[] = WHATS_NEW): NewsEntry[] {
	const upTo = list.filter((e) => (compareVersions(e.version, current) ?? 1) <= 0);
	if (seen === undefined || parse(seen) === null) return upTo.slice(0, 1);
	return upTo.filter((e) => compareVersions(e.version, seen) === 1);
}

/**
 * Ouvrir la fenêtre ? Jamais à la première installation (rien vu et aucun compte), jamais si la version vue est
 * la courante ou plus récente. Rien vu mais un compte configuré : mise à jour d'une version d'avant ce mécanisme.
 */
export function shouldShowNews(seen: string | undefined, current: string, hasAccounts: boolean): boolean {
	if (seen === undefined) return hasAccounts;
	return compareVersions(current, seen) === 1;
}
