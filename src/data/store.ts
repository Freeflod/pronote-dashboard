// Enveloppe IndexedDB : un magasin de textes (JSON) et un magasin de fichiers (octets).
// Aucune décision ici, aucun jeton stocké. Non testé en Node (IndexedDB absent) : vérifié au banc.
import type { CachedFile } from "../cache-policy.ts";

export type StoreKind = "text" | "files";

const DB_VERSION = 1;
const KINDS: StoreKind[] = ["text", "files"];

export interface TextRecord {
	data: unknown;
	storedAt: number;
	size: number;
}

export interface FileRecord {
	data: ArrayBuffer;
	name: string;
	storedAt: number;
	size: number;
}

interface RecordMap {
	text: TextRecord;
	files: FileRecord;
}

function wrap<T>(req: IDBRequest<T>): Promise<T> {
	return new Promise((resolve, reject) => {
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error ?? new Error("Erreur IndexedDB."));
	});
}

function done(tx: IDBTransaction): Promise<void> {
	return new Promise((resolve, reject) => {
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error ?? new Error("Erreur IndexedDB."));
		tx.onabort = () => reject(tx.error ?? new Error("Écriture annulée (quota atteint ?)."));
	});
}

export class Store {
	private constructor(private db: IDBDatabase) {}

	/** Base propre au coffre : `pronote-dashboard-<id du coffre>`. */
	static open(vaultId: string): Promise<Store> {
		return new Promise((resolve, reject) => {
			const req = indexedDB.open(`pronote-dashboard-${vaultId}`, DB_VERSION);
			req.onupgradeneeded = () => {
				for (const kind of KINDS) {
					if (!req.result.objectStoreNames.contains(kind)) req.result.createObjectStore(kind);
				}
			};
			req.onsuccess = () => resolve(new Store(req.result));
			req.onerror = () => reject(req.error ?? new Error("Ouverture d'IndexedDB impossible."));
		});
	}

	close(): void {
		this.db.close();
	}

	async get<K extends StoreKind>(kind: K, key: string): Promise<RecordMap[K] | undefined> {
		const tx = this.db.transaction(kind, "readonly");
		const found: unknown = await wrap(tx.objectStore(kind).get(key));
		return found === undefined ? undefined : (found as RecordMap[K]);
	}

	async put(kind: "text", key: string, data: unknown, now: number): Promise<void>;
	async put(kind: "files", key: string, data: ArrayBuffer, now: number, name: string): Promise<void>;
	async put(kind: StoreKind, key: string, data: unknown, now: number, name = ""): Promise<void> {
		const record: TextRecord | FileRecord =
			data instanceof ArrayBuffer
				? { data, name, storedAt: now, size: data.byteLength }
				: { data, storedAt: now, size: JSON.stringify(data)?.length ?? 0 };
		const tx = this.db.transaction(kind, "readwrite");
		tx.objectStore(kind).put(record, key);
		await done(tx);
	}

	async delete(kind: StoreKind, key: string): Promise<void> {
		const tx = this.db.transaction(kind, "readwrite");
		tx.objectStore(kind).delete(key);
		await done(tx);
	}

	/** Supprime, dans les deux magasins, toutes les entrées dont la clé commence par `prefix`. */
	async deleteByPrefix(prefix: string): Promise<void> {
		const range = IDBKeyRange.bound(prefix, `${prefix}￿`);
		const tx = this.db.transaction(KINDS, "readwrite");
		for (const k of KINDS) tx.objectStore(k).delete(range);
		await done(tx);
	}

	/** Vide un magasin, ou les deux. */
	async clear(kind?: StoreKind): Promise<void> {
		const kinds = kind ? [kind] : KINDS;
		const tx = this.db.transaction(kinds, "readwrite");
		for (const k of kinds) tx.objectStore(k).clear();
		await done(tx);
	}

	/** Clé, taille et date de chaque entrée (sans charger les octets des fichiers). */
	async list(kind: StoreKind): Promise<CachedFile[]> {
		const tx = this.db.transaction(kind, "readonly");
		const out: CachedFile[] = [];
		await new Promise<void>((resolve, reject) => {
			const req = tx.objectStore(kind).openCursor();
			req.onerror = () => reject(req.error ?? new Error("Erreur IndexedDB."));
			req.onsuccess = () => {
				const cursor = req.result;
				if (!cursor) return resolve();
				const v = cursor.value as { size?: number; storedAt?: number };
				out.push({ key: typeof cursor.key === "string" ? cursor.key : "", size: v.size ?? 0, storedAt: v.storedAt ?? 0 });
				cursor.continue();
			};
		});
		return out;
	}

	/** Taille cumulée d'un magasin, en octets. */
	async sizeBytes(kind: StoreKind): Promise<number> {
		return (await this.list(kind)).reduce((sum, f) => sum + f.size, 0);
	}
}
