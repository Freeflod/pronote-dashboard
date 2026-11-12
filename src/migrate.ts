import { normalizeIntervalMin } from "./refresh.ts";
import {
	CACHE_MAX_MB_DEFAULT,
	CACHE_MAX_MB_LIMIT,
	CACHE_MAX_MB_STEP,
	CACHE_TEXT_DAYS_DEFAULT,
	DEFAULT_REMINDERS,
	defaultData,
	newAccount,
	OVERDUE_DAYS_DEFAULT,
	OVERDUE_DAYS_STEPS,
	type Account,
	type PluginData,
	type Reminder,
	type Sections,
	type Snapshot,
} from "./types.ts";

/** Ramène le plafond du cache dans [0, CACHE_MAX_MB_LIMIT], arrondi au palier le plus proche. */
export function clampCacheMb(n: number): number {
	if (Number.isNaN(n)) return CACHE_MAX_MB_DEFAULT;
	const stepped = Math.round(n / CACHE_MAX_MB_STEP) * CACHE_MAX_MB_STEP;
	return Math.min(CACHE_MAX_MB_LIMIT, Math.max(0, stepped));
}

/** Ramène la durée de conservation des retards au palier le plus proche (égalité : le plus grand) ; illisible = défaut (PD-012). */
export function normalizeOverdueDays(n: unknown): number {
	if (typeof n !== "number" || Number.isNaN(n)) return OVERDUE_DAYS_DEFAULT;
	let best: number = OVERDUE_DAYS_DEFAULT;
	for (const step of OVERDUE_DAYS_STEPS) {
		if (Math.abs(step - n) <= Math.abs(best - n)) best = step;
	}
	return best;
}

function cacheDays(n: unknown): number {
	if (typeof n !== "number" || Number.isNaN(n)) return CACHE_TEXT_DAYS_DEFAULT;
	return Math.max(1, Math.round(n));
}

function cleanReminders(raw: unknown): Reminder[] {
	if (!Array.isArray(raw)) return DEFAULT_REMINDERS.map((r) => ({ ...r }));
	const out: Reminder[] = [];
	for (const r of raw as unknown[]) {
		if (!r || typeof r !== "object") continue;
		const { subject, text } = r as Partial<Reminder>;
		if (typeof subject === "string" && typeof text === "string") out.push({ subject, text });
	}
	return out;
}

/** Réglages versions 3 et 4 tels que lus dans data.json : tout champ peut manquer. */
interface StoredV3 extends Partial<Omit<PluginData, "version" | "display" | "child" | "parents">> {
	version: 3 | 4;
	display?: { child?: Partial<Sections>; parent?: Partial<Sections> };
	child?: Partial<Account>;
	parents?: Partial<Account>[];
}

/** Profil des versions 0.1 (à plat, à la racine) et 0.2 (liste `profiles`). */
interface LegacyProfile {
	id?: string;
	kind?: number;
	url?: string;
	username?: string;
	token?: string;
	navigatorIdentifier?: string;
	deviceUUID?: string;
	children?: string[];
	childIndex?: number;
	cache?: Snapshot | null;
	syncFolder?: string;
	downloadFiles?: boolean;
	weeksAhead?: number;
	weeksBack?: number;
	staleMinutes?: number;
}

interface LegacyRoot extends LegacyProfile {
	profiles?: LegacyProfile[];
	activeProfileId?: string;
}

function fromV3(raw: StoredV3): PluginData {
	const data = defaultData();
	Object.assign(data, raw);
	data.version = 4;
	data.cacheTextDays = cacheDays(raw.cacheTextDays);
	data.cacheMaxMb = typeof raw.cacheMaxMb === "number" ? clampCacheMb(raw.cacheMaxMb) : CACHE_MAX_MB_DEFAULT;
	data.reminders = cleanReminders(raw.reminders);
	data.staleMinutes = normalizeIntervalMin(typeof raw.staleMinutes === "number" ? raw.staleMinutes : Number.NaN);
	data.overdueDays = normalizeOverdueDays(raw.overdueDays);
	data.notifyNew = typeof raw.notifyNew === "boolean" ? raw.notifyNew : true;
	data.display = {
		child: { ...defaultData().display.child, ...raw.display?.child },
		parent: { ...defaultData().display.parent, ...raw.display?.parent },
	};
	data.child = { ...newAccount(6), ...raw.child };
	data.parents = (raw.parents ?? []).map((p) => ({ ...newAccount(7), ...p }));
	data.fileIndex = raw.fileIndex ?? {};
	return data;
}

function fromLegacy(raw: LegacyRoot): PluginData {
	const data = defaultData();
	const olds: LegacyProfile[] = Array.isArray(raw.profiles)
		? raw.profiles
		: raw.token || raw.url || raw.username || raw.cache
			? [raw]
			: [];
	if (!olds.length) return data;

	let childDone = false;
	for (const o of olds) {
		const acc: Account = {
			...newAccount(o.kind ?? 7),
			name: "",
			kind: o.kind ?? 7,
			url: o.url ?? "",
			username: o.username ?? "",
			token: o.token ?? "",
			navigatorIdentifier: o.navigatorIdentifier ?? "",
			deviceUUID: o.deviceUUID ?? "",
			resources: o.children ?? [],
			resourceIndex: o.childIndex ?? 0,
			cache: o.cache ?? null,
		};
		if (acc.kind === 6 && !childDone) {
			data.child = acc;
			childDone = true;
		} else {
			data.parents.push(acc);
		}
	}
	const first = olds[0];
	data.syncFolder = first.syncFolder || "Pronote";
	data.downloadFiles = first.downloadFiles ?? true;
	data.weeksAhead = first.weeksAhead ?? 3;
	data.weeksBack = first.weeksBack ?? 2;
	data.staleMinutes = normalizeIntervalMin(first.staleMinutes ?? Number.NaN);
	const active = olds.find((p) => p.id === raw.activeProfileId) ?? first;
	data.mode = (active.kind ?? 7) === 6 ? "child" : "parent";
	data.parents.forEach((p) => (p.kind = p.kind || 7));
	data.selectedParentId = data.parents[0]?.id ?? "";
	return data;
}

/**
 * Reprend les réglages des versions 0.1 et 0.2 (profils) vers le modèle Enfant/Parent.
 * `raw` vient de data.json, écrit par une version du plugin : sa forme est supposée, pas vérifiée champ par champ.
 */
export function migrate(raw: unknown): PluginData {
	if (!raw || typeof raw !== "object") return defaultData();
	const version = (raw as { version?: unknown }).version;
	if (version === 3 || version === 4) return fromV3(raw as StoredV3);
	return fromLegacy(raw);
}
