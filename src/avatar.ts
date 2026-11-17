// Avatar de l'enfant : initiale et couleur de repli, lecture de la photo dans la réponse Pronote,
// décision de cache. Pur : ni Obsidian, ni réseau, ni stockage. Les instants sont en millisecondes.
import { isExpired } from "./cache-policy.ts";
import { friendlyName } from "./util.ts";

/** Couleurs étendues d'Obsidian (`--color-<nom>`) ; `styles.css` porte une classe `pronote-avatar-<nom>` par entrée. */
export const AVATAR_COLORS = ["red", "orange", "yellow", "green", "cyan", "blue", "purple", "pink"] as const;
export type AvatarColor = (typeof AVATAR_COLORS)[number];

/** Affichée quand le nom est vide. */
export const AVATAR_FALLBACK_INITIAL = "?";

/** Durée de vie d'une photo en cache : une année scolaire. Elle ne change qu'à la reconnexion d'un compte par QR code. */
export const AVATAR_KEEP_DAYS = 365;

/** Identifiant de la réponse Pronote qui porte les photos (paramètres de l'utilisateur, lue à chaque connexion). */
export const USER_PARAMETERS_ID = "ParametresUtilisateur";

/** Type Pronote d'une valeur « fichier en base64 » : `V` est son rang dans les fichiers de la réponse. */
const BASE64_FILE_TYPE = 25;

/** Garde-fou : une photo d'identité pèse quelques dizaines de ko ; au-delà, ce n'en est pas une. */
const MAX_BASE64_LENGTH = 2_000_000;

const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

/** Signatures de fichier, vues en base64. */
const MIMES = [
	{ prefix: "/9j/", mime: "image/jpeg" },
	{ prefix: "iVBORw0KGgo", mime: "image/png" },
] as const;
export type AvatarMime = (typeof MIMES)[number]["mime"];

/** Photos d'une réponse : les fichiers (absent si non reconnu) et, si lisible, le rang du fichier de chaque élève. */
export interface PhotoCapture {
	files: (string | null)[];
	/** `null` : partie sécurisée chiffrée, l'attribution élève → fichier n'est pas lisible. */
	index: Map<string, number> | null;
}

export interface StudentRef {
	id: string;
	name: string;
	/** Pronote annonce une photo pour cet élève. */
	hasPhoto: boolean;
}

/** `photo` : base64 de l'image ; `null` = pas de photo côté Pronote ; `undefined` = inconnu, le cache reste. */
export interface StudentPhoto {
	name: string;
	photo: string | null | undefined;
}

export type AvatarCacheAction = "keep" | "store" | "delete";

/** Initiale du prénom (« DURAND Élodie » donne « É »), en capitale ; un nom vide donne le repli. */
export function avatarInitial(name: string): string {
	const first = Array.from(friendlyName(name))[0];
	if (!first) return AVATAR_FALLBACK_INITIAL;
	return Array.from(first.toUpperCase())[0] ?? AVATAR_FALLBACK_INITIAL;
}

/** Couleur de repli : toujours la même pour un même nom. */
export function avatarColor(name: string): AvatarColor {
	let hash = 0;
	for (const ch of name.trim()) hash = (hash * 31 + (ch.codePointAt(0) ?? 0)) % 1_000_003;
	return AVATAR_COLORS[hash % AVATAR_COLORS.length] ?? AVATAR_COLORS[0];
}

/** Clé de cache de la photo : sous la clé de l'onglet (`compte:élève`), donc oubliée avec le compte. */
export function avatarCacheKey(tabKey: string): string {
	return `${tabKey}|avatar`;
}

/** Type d'image d'après la signature ; tout ce qui n'est pas du base64 strict d'un JPEG ou d'un PNG est refusé. */
export function imageMime(base64: string): AvatarMime | undefined {
	if (base64.length > MAX_BASE64_LENGTH || !BASE64.test(base64)) return undefined;
	return MIMES.find((m) => base64.startsWith(m.prefix))?.mime;
}

/** Adresse `data:` affichable dans une balise image ; rien si l'image n'est pas reconnue. */
export function avatarDataUri(base64: string): string | undefined {
	const mime = imageMime(base64);
	return mime ? `data:${mime};base64,${base64}` : undefined;
}

function isRecord(v: unknown): v is Record<string, unknown> {
	return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Rang du fichier d'un élève, d'après son champ `photoBase64` (`{ _T: 25, V: rang }`). */
function fileRank(resource: Record<string, unknown>): number | undefined {
	const ref = resource.photoBase64;
	if (!isRecord(ref) || ref._T !== BASE64_FILE_TYPE) return undefined;
	return typeof ref.V === "number" && Number.isInteger(ref.V) && ref.V >= 0 ? ref.V : undefined;
}

/**
 * Photos portées par la réponse « paramètres de l'utilisateur » : Pronote les joint en base64 dans la partie
 * non sécurisée (`dataNonSec.fichiers`), et chaque élève désigne la sienne par son rang.
 * Rend `undefined` pour toute autre réponse ou un texte illisible.
 */
export function photosFromResponse(text: string): PhotoCapture | undefined {
	let json: unknown;
	try {
		json = JSON.parse(text);
	} catch {
		return undefined;
	}
	if (!isRecord(json) || json.id !== USER_PARAMETERS_ID) return undefined;
	const raw = isRecord(json.dataNonSec) && Array.isArray(json.dataNonSec.fichiers) ? json.dataNonSec.fichiers : [];
	// Pronote coupe le base64 en lignes (mesuré sur la démo) : les retours sont retirés avant tout contrôle.
	const files = raw.map((f: unknown) => {
		const base64 = typeof f === "string" ? f.replace(/[\r\n]/g, "") : "";
		return imageMime(base64) ? base64 : null;
	});

	const sec = json.dataSec;
	if (!isRecord(sec)) return { files, index: null };
	const index = new Map<string, number>();
	const root = isRecord(sec.data) ? sec.data.ressource : undefined;
	if (isRecord(root)) {
		// compte élève : la ressource elle-même ; compte parent : ses enfants
		const students: unknown[] = Array.isArray(root.listeRessources) ? root.listeRessources : [root];
		for (const s of students) {
			if (!isRecord(s) || typeof s.N !== "string") continue;
			const rank = fileRank(s);
			if (rank !== undefined) index.set(s.N, rank);
		}
	}
	return { files, index };
}

/**
 * Photo de chaque élève de la session. Attribution lisible : par rang. Réponse chiffrée : le n-ième élève avec
 * photo reçoit le n-ième fichier.
 */
export function studentPhotos(capture: PhotoCapture | undefined, students: StudentRef[]): StudentPhoto[] {
	if (!capture) return students.map((s) => ({ name: s.name, photo: undefined }));
	const { files, index } = capture;
	if (index) {
		return students.map((s) => {
			const rank = index.get(s.id);
			return { name: s.name, photo: rank === undefined ? null : (files[rank] ?? undefined) };
		});
	}
	let next = 0;
	return students.map((s) => {
		if (!s.hasPhoto) return { name: s.name, photo: null };
		return { name: s.name, photo: files[next++] ?? undefined };
	});
}

/**
 * Que faire du cache quand une connexion vient de dire ce qu'elle sait de la photo (`undefined` : rien de connu).
 * Une photo absente du cache est écrite. Une photo gardée ne change qu'à la reconnexion par QR code (`refresh`)
 * ou une fois sa durée de vie dépassée ; alors la nouvelle l'écrase, et l'absence côté Pronote l'efface.
 */
export function avatarCachePlan(
	cached: { size: number; storedAt: number } | undefined,
	incoming: { size: number } | null | undefined,
	now: number,
	refresh: boolean,
): AvatarCacheAction {
	if (incoming === undefined) return "keep";
	if (!cached) return incoming ? "store" : "keep";
	if (!refresh && !isExpired(cached.storedAt, AVATAR_KEEP_DAYS, now)) return "keep";
	return incoming ? "store" : "delete";
}

/** La photo en cache s'affiche tant que sa durée de conservation (celle du texte) n'est pas dépassée. */
export function avatarUsable(cached: { storedAt: number } | undefined, days: number, now: number): boolean {
	return cached !== undefined && !isExpired(cached.storedAt, days, now);
}
