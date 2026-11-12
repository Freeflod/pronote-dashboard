// États d'un bloc et décisions cache -> état : pures (instants en millisecondes).
import { isExpired } from "../cache-policy.ts";

export type BlockState<T> =
	| { kind: "loading" }
	| { kind: "empty"; fetchedAt: number }
	| { kind: "error"; message: string; data?: T; fetchedAt?: number }
	| { kind: "offline"; data?: T; fetchedAt?: number }
	| { kind: "ready"; data: T; fetchedAt: number; /** Cache non écrit (quota) : donnée affichée mais non conservée. */ cacheWarning?: string };

export interface CachedEntry<T> {
	data: T;
	storedAt: number;
}

/** Premier état émis : le cache s'il est valide, sinon chargement. */
export function cachedState<T>(
	entry: CachedEntry<T> | undefined,
	days: number,
	now: number,
	isEmpty: (data: T) => boolean,
): BlockState<T> {
	if (!entry || isExpired(entry.storedAt, days, now)) return { kind: "loading" };
	return resultState(entry.data, entry.storedAt, isEmpty);
}

/** État d'une donnée connue, fraîche ou en cache. */
export function resultState<T>(data: T, fetchedAt: number, isEmpty: (data: T) => boolean): BlockState<T> {
	return isEmpty(data) ? { kind: "empty", fetchedAt } : { kind: "ready", data, fetchedAt };
}

/** État après un rafraîchissement raté : hors ligne ou erreur, avec le cache valide s'il y en a un. */
export function failureState<T>(online: boolean, message: string, before: BlockState<T>): BlockState<T> {
	const kept = before.kind === "ready" ? { data: before.data, fetchedAt: before.fetchedAt } : {};
	return online ? { kind: "error", message, ...kept } : { kind: "offline", ...kept };
}
