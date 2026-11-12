// Clés stables des séances et des devoirs (#9) : PRONOTE change les identifiants à chaque connexion. Données fictives.
/// <reference types="node" />
import { test } from "node:test";
import assert from "node:assert/strict";
import { accountKeyPrefix, attachmentCacheKey, discussionKey, homeworkKey, lessonKey } from "../src/keys.ts";

const seance = { id: "ID-SESSION-1", subject: "Mathématiques", start: "2026-11-05T08:00:00.000Z", teachers: ["M. DUPONT"] };

void test("lessonKey : ne dépend pas de l'identifiant PRONOTE, qui change à chaque connexion", () => {
	const autreSession = { ...seance, id: "ID-SESSION-2" };
	assert.equal(lessonKey(seance), lessonKey(autreSession));
});

void test("lessonKey : commence par « seance| », vocabulaire du lexique", () => {
	assert.ok(lessonKey(seance).startsWith("seance|"));
});

void test("lessonKey : distingue l'heure, la matière et les professeurs", () => {
	const k = lessonKey(seance);
	assert.notEqual(k, lessonKey({ ...seance, start: "2026-11-05T09:00:00.000Z" }));
	assert.notEqual(k, lessonKey({ ...seance, subject: "Physique" }));
	assert.notEqual(k, lessonKey({ ...seance, teachers: ["MME MARTIN"] }));
});

void test("lessonKey : l'ordre des professeurs n'a pas d'effet", () => {
	const a = lessonKey({ ...seance, teachers: ["M. DUPONT", "MME MARTIN"] });
	const b = lessonKey({ ...seance, teachers: ["MME MARTIN", "M. DUPONT"] });
	assert.equal(a, b);
});

void test("homeworkKey : ne dépend pas de l'identifiant PRONOTE", () => {
	const devoir = { id: "ID-1", subject: "Histoire", deadline: "2026-11-06T00:00:00.000Z" };
	const autreSession = { ...devoir, id: "ID-2" };
	assert.equal(homeworkKey(devoir), homeworkKey(autreSession));
	assert.notEqual(homeworkKey(devoir), homeworkKey({ ...devoir, subject: "Anglais" }));
	assert.notEqual(homeworkKey(devoir), homeworkKey({ ...devoir, deadline: "2026-11-07T00:00:00.000Z" }));
});

void test("attachmentCacheKey : deux propriétaires, même nom de fichier → clés différentes", () => {
	const a = attachmentCacheKey("c1:eleve", "devoir|2026-11-10T00:00:00.000Z|Maths", "fiche.pdf");
	const b = attachmentCacheKey("c1:eleve", "devoir|2026-11-12T00:00:00.000Z|Maths", "fiche.pdf");
	assert.notEqual(a, b);
});

void test("attachmentCacheKey : même propriétaire et même nom → clé stable, préfixée par le compte", () => {
	const k = attachmentCacheKey("c1:eleve", "devoir|x|Maths", "fiche.pdf");
	assert.equal(k, attachmentCacheKey("c1:eleve", "devoir|x|Maths", "fiche.pdf"));
	assert.ok(k.startsWith(accountKeyPrefix("c1")));
});

void test("accountKeyPrefix : « compte: », sans confondre c1 et c10", () => {
	assert.equal(accountKeyPrefix("c1"), "c1:");
	assert.ok(!"c10:eleve".startsWith(accountKeyPrefix("c1")));
});

const discussion = { subject: "Sortie au musée", date: "2026-11-05T08:00:00.000Z", creator: "Mme DUPONT" };

void test("discussionKey : ne dépend pas de l'identifiant interne de PRONOTE, qui change à chaque lecture", () => {
	const autreLecture = { ...discussion, participantsMessageID: "autre" };
	assert.equal(discussionKey(discussion), discussionKey(autreLecture));
});

void test("discussionKey : distingue le sujet, la date et l'auteur", () => {
	const k = discussionKey(discussion);
	assert.notEqual(k, discussionKey({ ...discussion, subject: "Autre sujet" }));
	assert.notEqual(k, discussionKey({ ...discussion, date: "2026-11-06T08:00:00.000Z" }));
	assert.notEqual(k, discussionKey({ ...discussion, creator: "M. MARTIN" }));
});

void test("discussionKey : auteur absent, clé stable", () => {
	assert.equal(discussionKey({ subject: "S", date: "2026-11-05T08:00:00.000Z" }), discussionKey({ subject: "S", date: "2026-11-05T08:00:00.000Z" }));
});
