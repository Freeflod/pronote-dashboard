// Actualisation automatique espacée (PD-011) : règles pures, instants en millisecondes.
import { homeworkKey } from "./keys.ts";

/** Plancher de l'actualisation automatique, en minutes. */
export const AUTO_FLOOR_MIN = 15;
/** Intervalle par défaut, en minutes. */
export const DEFAULT_INTERVAL_MIN = 30;
/** Délai minimum entre deux appuis sur « Actualiser ». */
export const MANUAL_COOLDOWN_MS = 120_000;
/** Échecs de suite avant la suspension de l'automatique. */
export const MAX_FAILURES = 3;

const MIN_MS = 60_000;

/** 0 = jamais ; 1 à 14 ramené au plancher ; entier ; valeur illisible = défaut. */
export function normalizeIntervalMin(n: number): number {
	if (!Number.isFinite(n)) return DEFAULT_INTERVAL_MIN;
	if (n <= 0) return 0;
	return Math.max(AUTO_FLOOR_MIN, Math.round(n));
}

/**
 * Donnée assez récente pour ne pas être redemandée. `intervalMin` est déjà normalisé.
 * 0 = jamais d'actualisation automatique : toute donnée en cache reste fraîche.
 */
export function isFresh(fetchedAtMs: number, nowMs: number, intervalMin: number): boolean {
	if (intervalMin <= 0) return true;
	return nowMs - fetchedAtMs < intervalMin * MIN_MS;
}

/** Faut-il redemander à Pronote ? Oui si la force est demandée, ou si la donnée manque ou est périmée. */
export function shouldFetch(fetchedAtMs: number | undefined, nowMs: number, intervalMin: number, force: boolean): boolean {
	if (force || fetchedAtMs === undefined) return true;
	return !isFresh(fetchedAtMs, nowMs, intervalMin);
}

/** Reste d'attente avant un nouvel appui manuel, en ms ; 0 si le bouton est libre. */
export function manualWaitMs(lastManualMs: number, nowMs: number): number {
	return Math.min(MANUAL_COOLDOWN_MS, Math.max(0, lastManualMs + MANUAL_COOLDOWN_MS - nowMs));
}

export interface FailureState {
	failures: number;
	paused: boolean;
}

/** Un succès remet à zéro ; MAX_FAILURES échecs de suite suspendent l'automatique. */
export function nextFailureState(state: FailureState, ok: boolean): FailureState {
	if (ok) return { failures: 0, paused: false };
	const failures = state.failures + 1;
	return { failures, paused: state.paused || failures >= MAX_FAILURES };
}

/** Ce que l'on compare d'une actualisation à l'autre : messages non lus et devoirs (clés de contenu). */
export interface NewnessSnapshot {
	unreadMessages: number;
	homeworkIds: string[];
}

export interface NewCounts {
	newMessages: number;
	newHomework: number;
}

/** Les devoirs sont identifiés par `homeworkKey` (contenu) : l'identifiant Pronote change à chaque connexion. */
export function snapshotOf(
	homework: { subject: string; deadline: string }[],
	discussions: { numberOfMessagesUnread: number }[],
): NewnessSnapshot {
	return {
		unreadMessages: discussions.reduce((n, d) => n + d.numberOfMessagesUnread, 0),
		homeworkIds: homework.map(homeworkKey),
	};
}

export function newSince(before: NewnessSnapshot, after: NewnessSnapshot): NewCounts {
	const known = new Set(before.homeworkIds);
	return {
		newMessages: Math.max(0, after.unreadMessages - before.unreadMessages),
		newHomework: new Set(after.homeworkIds.filter((id) => !known.has(id))).size,
	};
}

/** Phrase de la notification ; vide s'il n'y a rien de nouveau. */
export function notificationText(n: NewCounts): string {
	const parts: string[] = [];
	if (n.newMessages > 0) {
		parts.push(n.newMessages === 1 ? "1 nouveau message non lu" : `${n.newMessages} nouveaux messages non lus`);
	}
	if (n.newHomework > 0) {
		parts.push(n.newHomework === 1 ? "1 nouveau devoir" : `${n.newHomework} nouveaux devoirs`);
	}
	return parts.join(" et ");
}
