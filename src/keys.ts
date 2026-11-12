/**
 * Clés stables des séances et des devoirs (#9).
 * PRONOTE renvoie un identifiant différent à chaque connexion : on ne s'en sert jamais pour retrouver
 * une note ou une pièce jointe. La clé vient du contenu (début, matière, professeurs), stable d'une session à l'autre.
 */

function instant(date: string): string {
	const d = new Date(date);
	return Number.isNaN(d.getTime()) ? date : d.toISOString();
}

export function lessonKey(l: { subject: string; start: string; teachers: string[] }): string {
	return `seance|${instant(l.start)}|${l.subject}|${[...l.teachers].sort().join(",")}`;
}

export function homeworkKey(h: { subject: string; deadline: string }): string {
	return `devoir|${instant(h.deadline)}|${h.subject}`;
}

/** Clé de cache d'une pièce jointe : propriétaire (devoir ou séance) et nom, la pièce n'ayant pas d'identifiant stable. */
export function attachmentCacheKey(key: string, ownerKey: string, name: string): string {
	return `${key}|${ownerKey}|${name}`;
}

/** Préfixe des clés de cache d'un compte (`compte:élève`), pour tout oublier à la déconnexion. */
export function accountKeyPrefix(accountId: string): string {
	return `${accountId}:`;
}

/** Une discussion : `participantsMessageID` change à chaque lecture (mesuré sur le banc), la clé vient du contenu. */
export function discussionKey(d: { subject: string; date: string; creator?: string }): string {
	return `discussion|${instant(d.date)}|${d.subject}|${d.creator ?? ""}`;
}
