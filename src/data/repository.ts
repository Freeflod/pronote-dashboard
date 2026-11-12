// Dépôt de données : cache d'abord, puis rafraîchissement par le client Pronote.
// Toutes les décisions passent par block-state.ts et cache-policy.ts (testés) ; ici, les effets.
import { requestUrl } from "obsidian";
import type { SessionHandle } from "@blockshub/pawnote-lts";
import { planEviction } from "../cache-policy.ts";
import { attachmentCacheKey } from "../keys.ts";
import { normalizeIntervalMin, shouldFetch } from "../refresh.ts";
import type { AttachmentDTO } from "../types.ts";
import { cachedState, failureState, resultState, type BlockState, type CachedEntry } from "./block-state.ts";
import type { Store, TextRecord } from "./store.ts";

/** Un bloc : son identifiant de cache, sa récupération, sa définition du vide. */
export interface BlockSpec<T> {
	id: string;
	fetch(session: SessionHandle): Promise<T>;
	isEmpty(data: T): boolean;
}

export interface RepositoryDeps {
	store: Store;
	/** Ouvre une session Pronote sur l'élève de la clé `account.id:élève` (client.run, sessions en file). */
	runFor<R>(key: string, fn: (session: SessionHandle) => Promise<R>): Promise<R>;
	settings(): { cacheTextDays: number; cacheMaxMb: number; staleMinutes: number };
	now?(): number;
	isOnline?(): boolean;
}

/** Un bloc d'un onglet : sa définition et où poser ses états (`set` écarte les résultats périmés). */
export interface TabTask<T> {
	spec: BlockSpec<T>;
	set(state: BlockState<T>): void;
}

export interface LoadOptions {
	/** Redemande à Pronote même si le cache est frais (actualisation manuelle ou minuteur). */
	force?: boolean;
}

/** fresh : cache frais, aucune connexion ; ok : rafraîchi ; failed : au moins un échec ; offline : aucune tentative. */
/** `partial` : connexion réussie, mais au moins un bloc a échoué ; `failed` : connexion impossible. */
export type RefreshOutcome = "fresh" | "ok" | "partial" | "failed" | "offline";

export type AttachmentResult =
	| { kind: "ok"; data: ArrayBuffer; cached: boolean; tooBig?: boolean }
	| { kind: "error"; message: string };

const MB = 1024 * 1024;

function messageOf(e: unknown): string {
	return e instanceof Error ? e.message : String(e);
}

export class Repository {
	constructor(private deps: RepositoryDeps) {}

	private now(): number {
		return this.deps.now?.() ?? Date.now();
	}

	/** Sans API Node : l'état du navigateur d'Obsidian (bureau et mobile). */
	isOnline(): boolean {
		return this.deps.isOnline?.() ?? navigator.onLine;
	}

	/** Cache valide d'un bloc : premier état à émettre et instant d'écriture (absent si rien de valide). */
	private async readCache<T>(key: string, block: BlockSpec<T>): Promise<{ first: BlockState<T>; storedAt: number | undefined }> {
		const { cacheTextDays } = this.deps.settings();
		let cached: CachedEntry<T> | undefined;
		try {
			const rec: TextRecord | undefined = await this.deps.store.get("text", `${key}|${block.id}`);
			if (rec) cached = { data: rec.data as T, storedAt: rec.storedAt };
		} catch {
			// cache illisible : on repart sans lui (perte tolérée)
		}
		const first = cachedState(cached, cacheTextDays, this.now(), (d) => block.isEmpty(d));
		return { first, storedAt: first.kind === "ready" || first.kind === "empty" ? first.fetchedAt : undefined };
	}

	/** Écrit la donnée fraîche dans le cache ; un échec d'écriture n'empêche pas de l'afficher. */
	private async persist<T>(key: string, block: BlockSpec<T>, data: T): Promise<BlockState<T>> {
		const at = this.now();
		const state = resultState(data, at, (d) => block.isEmpty(d));
		try {
			await this.deps.store.put("text", `${key}|${block.id}`, data, at);
			return state;
		} catch (e) {
			return state.kind === "ready" ? { ...state, cacheWarning: `Cache non écrit : ${messageOf(e)}` } : state;
		}
	}

	private intervalMin(): number {
		return normalizeIntervalMin(this.deps.settings().staleMinutes);
	}

	/**
	 * Émet le cache (prêt, vide ou chargement), puis l'état issu du rafraîchissement.
	 * Une donnée en cache plus récente que l'intervalle d'actualisation n'est pas redemandée, sauf `force`.
	 * Un bloc seul : une connexion par appel (l'écran passe par `refreshTab` pour un onglet entier).
	 */
	async *load<T>(key: string, block: BlockSpec<T>, opts: LoadOptions = {}): AsyncGenerator<BlockState<T>> {
		const { first, storedAt } = await this.readCache(key, block);
		yield first;
		if (!shouldFetch(storedAt, this.now(), this.intervalMin(), opts.force === true)) return;

		if (!this.isOnline()) {
			yield failureState(false, "", first);
			return;
		}
		try {
			const data = await this.deps.runFor(key, (session) => block.fetch(session));
			yield await this.persist(key, block, data);
		} catch (e) {
			yield failureState(this.isOnline(), messageOf(e), first);
		}
	}

	/**
	 * Rafraîchit un onglet (devoirs, emploi du temps, séances, discussions) avec UNE SEULE connexion Pronote :
	 * les récupérations s'enchaînent dans la même session (la file du client interdit deux comptes en parallèle).
	 * Le cache s'affiche d'abord. Rien n'est redemandé si tout est frais, sauf `force`.
	 */
	async refreshTab(key: string, tasks: TabTask<unknown>[], opts: LoadOptions = {}): Promise<RefreshOutcome> {
		const caches = await Promise.all(tasks.map((t) => this.readCache(key, t.spec)));
		const before = (i: number): BlockState<unknown> => caches[i]?.first ?? { kind: "loading" };
		tasks.forEach((t, i) => t.set(before(i)));
		const now = this.now();
		const interval = this.intervalMin();
		if (!caches.some((c) => shouldFetch(c.storedAt, now, interval, opts.force === true))) return "fresh";

		if (!this.isOnline()) {
			tasks.forEach((t, i) => t.set(failureState(false, "", before(i))));
			return "offline";
		}
		const settled = new Set<number>();
		let failed = false;
		let blockFailed = false;
		try {
			await this.deps.runFor(key, async (session) => {
				for (const [i, t] of tasks.entries()) {
					try {
						const data = await t.spec.fetch(session);
						t.set(await this.persist(key, t.spec, data));
					} catch (e) {
						blockFailed = true;
						t.set(failureState(this.isOnline(), messageOf(e), before(i)));
					}
					settled.add(i);
				}
			});
		} catch (e) {
			// connexion impossible (jeton refusé, réseau) : aucun bloc n'a pu être récupéré
			failed = true;
			tasks.forEach((t, i) => {
				if (!settled.has(i)) t.set(failureState(this.isOnline(), messageOf(e), before(i)));
			});
		}
		if (failed) return "failed";
		return blockFailed ? "partial" : "ok";
	}

	/**
	 * Pièce jointe : cache puis téléchargement par requestUrl. 0 Mo de plafond = jamais stockée ;
	 * trop grosse pour le plafond = rendue sans être stockée (`tooBig`) ; les plus anciennes sont évincées.
	 */
	async attachment(key: string, ownerKey: string, file: AttachmentDTO): Promise<AttachmentResult> {
		const fileKey = attachmentCacheKey(key, ownerKey, file.name);
		const { store } = this.deps;
		try {
			const hit = await store.get("files", fileKey);
			if (hit) return { kind: "ok", data: hit.data, cached: true };
		} catch {
			// cache illisible : téléchargement
		}
		if (!this.isOnline()) return { kind: "error", message: "Hors ligne : fichier absent du cache." };
		let data: ArrayBuffer;
		try {
			const res = await requestUrl({ url: file.url, throw: false });
			if (res.status >= 400) return { kind: "error", message: `Téléchargement refusé (${res.status}) : le lien a peut-être expiré.` };
			data = res.arrayBuffer;
		} catch (e) {
			return { kind: "error", message: `Téléchargement impossible : ${messageOf(e)}` };
		}
		const maxBytes = this.deps.settings().cacheMaxMb * MB;
		try {
			const plan = planEviction(await store.list("files"), { size: data.byteLength }, maxBytes);
			if (!plan.store) return { kind: "ok", data, cached: false, tooBig: maxBytes > 0 };
			for (const k of plan.evict) await store.delete("files", k);
			await store.put("files", fileKey, data, this.now(), file.name);
			return { kind: "ok", data, cached: true };
		} catch (e) {
			return { kind: "error", message: `Cache de fichiers : ${messageOf(e)}` };
		}
	}
}
