// Choix de la période d'un onglet Pronote. Pur : sans import d'obsidian.
export interface PeriodLike {
	startDate: Date;
	endDate: Date;
}

/**
 * La période par défaut de l'onglet (celle que Pronote affiche : semestre au lycée, trimestre au collège) l'emporte.
 * À défaut : la plus courte des périodes en cours (un trimestre ou un semestre plutôt que l'année), sinon la plus courte de toutes.
 */
export function pickPeriod<P extends PeriodLike>(tabDefault: P | undefined, periods: P[], now: number): P | undefined {
	if (tabDefault) return tabDefault;
	const current = periods.filter((p) => p.startDate.getTime() <= now && p.endDate.getTime() >= now);
	const pool = current.length ? current : periods;
	const length = (p: P): number => p.endDate.getTime() - p.startDate.getTime();
	return [...pool].sort((a, b) => length(a) - length(b))[0];
}
