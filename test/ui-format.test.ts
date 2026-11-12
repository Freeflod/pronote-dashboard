// Libellés et dérivations de l'écran : purs. Données fictives.
/// <reference types="node" />
import { test } from "node:test";
import assert from "node:assert/strict";
import { combineStates, dayTitle, inDaysLabel, isSafeExternalUrl, linkSegments, mapState, mimeOf, previewKind, resourcesOf, stateMessage, unreadLabel } from "../src/ui/format.ts";
import type { BlockState } from "../src/data/block-state.ts";
import type { HomeworkDTO, LessonDTO } from "../src/types.ts";

void test("dayTitle : demain", () => {
	assert.equal(dayTitle("2026-11-09", "2026-11-08"), "Pour demain");
});

void test("dayTitle : le vendredi, le prochain jour avec cours", () => {
	assert.equal(dayTitle("2026-11-16", "2026-11-13"), "Pour lundi 16");
});

void test("inDaysLabel : aujourd'hui, demain, pluriel", () => {
	assert.equal(inDaysLabel(0), "aujourd'hui");
	assert.equal(inDaysLabel(1), "demain");
	assert.equal(inDaysLabel(4), "dans 4 jours");
});

void test("unreadLabel : aucun, un, plusieurs", () => {
	assert.equal(unreadLabel(0), "aucun message non lu");
	assert.equal(unreadLabel(1), "1 message non lu");
	assert.equal(unreadLabel(3), "3 messages non lus");
});

void test("stateMessage : chaque état a un libellé écrit", () => {
	assert.equal(stateMessage({ kind: "loading" }, "Aucun devoir."), "Chargement…");
	assert.equal(stateMessage({ kind: "empty", fetchedAt: 0 }, "Aucun devoir."), "Aucun devoir.");
	assert.match(stateMessage({ kind: "error", message: "boum" }, "x"), /^Erreur : boum/);
	assert.match(stateMessage({ kind: "offline" }, "x"), /^Hors ligne/);
	assert.match(stateMessage({ kind: "ready", data: 1, fetchedAt: 0 }, "x"), /^Mis à jour/);
});

void test("stateMessage : hors ligne avec cache le dit", () => {
	assert.match(stateMessage({ kind: "offline", data: 1, fetchedAt: 0 }, "x"), /enregistrées/);
	assert.match(stateMessage({ kind: "offline" }, "x"), /aucune donnée/);
});

void test("stateMessage : avertissement de cache ajouté", () => {
	assert.match(
		stateMessage({ kind: "ready", data: 1, fetchedAt: 0, cacheWarning: "Cache non écrit : quota" }, "x"),
		/Cache non écrit : quota/,
	);
});

const hw = (attachments: HomeworkDTO["attachments"]): HomeworkDTO => ({
	id: "h",
	subject: "Maths",
	color: "",
	description: "",
	deadline: "2026-11-10T00:00:00Z",
	done: false,
	attachments,
});
const lesson = (files: LessonDTO["contents"][number]["files"]): LessonDTO => ({
	id: "l",
	subject: "Histoire",
	color: "",
	start: "2026-11-09T08:00:00Z",
	teachers: [],
	contents: [{ text: "", files }],
});

void test("resourcesOf : devoirs et séances, matière et origine, doublon exact retiré", () => {
	const a = { name: "fiche.pdf", url: "https://x/1", isFile: true };
	const b = { name: "carte.png", url: "https://x/2", isFile: true };
	const out = resourcesOf([hw([a])], [lesson([a, b])]);
	assert.deepEqual(
		out.map((r) => [r.file.name, r.subject, r.origin]),
		[
			["fiche.pdf", "Maths", "devoir"],
			["carte.png", "Histoire", "séance"],
		],
	);
});

void test("resourcesOf : un lien web (isFile faux) est gardé, marqué", () => {
	const out = resourcesOf([hw([{ name: "site", url: "https://x/w", isFile: false }])], []);
	assert.equal(out[0]?.file.isFile, false);
});

const isEmpty = (d: number[]) => d.length === 0;
const double = (d: number[]) => d.map((n) => n * 2);
const sum = (a?: number[], b?: number[]) => [...(a ?? []), ...(b ?? [])];

void test("mapState : transforme la donnée, garde le sens de l'état", () => {
	assert.deepEqual(mapState({ kind: "loading" }, double, isEmpty), { kind: "loading" });
	assert.deepEqual(mapState({ kind: "ready", data: [1], fetchedAt: 5 }, double, isEmpty), { kind: "ready", data: [2], fetchedAt: 5 });
	assert.deepEqual(mapState({ kind: "offline", data: [1], fetchedAt: 5 }, double, isEmpty), { kind: "offline", data: [2], fetchedAt: 5 });
	assert.deepEqual(mapState({ kind: "error", message: "m", data: [1], fetchedAt: 5 }, double, isEmpty), {
		kind: "error",
		message: "m",
		data: [2],
		fetchedAt: 5,
	});
});

void test("mapState : résultat vide = état vide, donnée vide retirée d'une erreur", () => {
	assert.deepEqual(mapState({ kind: "ready", data: [1], fetchedAt: 5 }, () => [], isEmpty), { kind: "empty", fetchedAt: 5 });
	assert.deepEqual(mapState({ kind: "error", message: "m", data: [1], fetchedAt: 5 }, () => [], isEmpty), { kind: "error", message: "m" });
});

void test("combineStates : erreur > hors ligne > chargement > prêt", () => {
	const ready: BlockState<number[]> = { kind: "ready", data: [1], fetchedAt: 9 };
	assert.equal(combineStates(ready, { kind: "loading" }, sum, isEmpty).kind, "loading");
	assert.equal(combineStates(ready, { kind: "offline" }, sum, isEmpty).kind, "offline");
	assert.equal(combineStates({ kind: "loading" }, { kind: "error", message: "m" }, sum, isEmpty).kind, "error");
	assert.deepEqual(combineStates(ready, { kind: "empty", fetchedAt: 3 }, sum, isEmpty), { kind: "ready", data: [1], fetchedAt: 3 });
});

void test("combineStates : une source en erreur garde la donnée de l'autre", () => {
	const ready: BlockState<number[]> = { kind: "ready", data: [1], fetchedAt: 9 };
	assert.deepEqual(combineStates(ready, { kind: "error", message: "m" }, sum, isEmpty), {
		kind: "error",
		message: "m",
		data: [1],
		fetchedAt: 9,
	});
});

void test("combineStates : deux sources vides, état vide", () => {
	assert.equal(combineStates({ kind: "empty", fetchedAt: 1 }, { kind: "empty", fetchedAt: 2 }, sum, isEmpty).kind, "empty");
});

void test("mimeOf : types d'aperçu connus, sinon générique", () => {
	assert.equal(mimeOf("Fiche.PDF"), "application/pdf");
	assert.equal(mimeOf("photo.jpeg"), "image/jpeg");
	assert.equal(mimeOf("archive.zip"), "application/octet-stream");
});

void test("isSafeExternalUrl : http et https seulement", () => {
	assert.equal(isSafeExternalUrl("https://exemple.fr/a"), true);
	assert.equal(isSafeExternalUrl("http://exemple.fr/a"), true);
	for (const bad of ["javascript:alert(1)", "data:text/html,x", "file:///etc/passwd", "", "pas une url"]) {
		assert.equal(isSafeExternalUrl(bad), false, bad);
	}
});

void test("previewKind : pdf, image, texte aperçus dans l'application ; le reste sans aperçu", () => {
	assert.equal(previewKind("Fiche.PDF"), "pdf");
	for (const n of ["a.png", "a.JPG", "a.jpeg", "a.gif", "a.webp"]) assert.equal(previewKind(n), "image", n);
	assert.equal(previewKind("note.txt"), "text");
	for (const n of ["cours.docx", "archive.zip", "sans-extension"]) assert.equal(previewKind(n), "none", n);
});

void test("linkSegments : un lien Markdown devient un lien, le reste reste du texte", () => {
	assert.deepEqual(linkSegments("Voir [le padlet](https://exemple.fr/p/1) avant jeudi."), [
		{ text: "Voir " },
		{ text: "le padlet", href: "https://exemple.fr/p/1" },
		{ text: " avant jeudi." },
	]);
});

void test("linkSegments : une URL brute devient un lien, sans la ponctuation finale", () => {
	assert.deepEqual(linkSegments("Lien : https://exemple.fr/p/1."), [{ text: "Lien : " }, { text: "https://exemple.fr/p/1", href: "https://exemple.fr/p/1" }, { text: "." }]);
});

void test("linkSegments : seul http et https donne un lien (javascript:, data: restent du texte)", () => {
	assert.deepEqual(linkSegments("[x](javascript:alert(1))"), [{ text: "[x](javascript:alert(1))" }]);
	assert.deepEqual(linkSegments("[x](data:text/html,y)"), [{ text: "[x](data:text/html,y)" }]);
});

void test("linkSegments : texte sans lien, vide, Markdown incomplet", () => {
	assert.deepEqual(linkSegments(""), []);
	assert.deepEqual(linkSegments("Rien à voir ici"), [{ text: "Rien à voir ici" }]);
	assert.deepEqual(linkSegments("[sans fin](https://exemple.fr"), [{ text: "[sans fin](" }, { text: "https://exemple.fr", href: "https://exemple.fr" }]);
});

void test("linkSegments : deux liens dans le même texte", () => {
	const seg = linkSegments("[a](https://a.fr) et [b](https://b.fr)");
	assert.equal(seg.filter((x) => "href" in x).length, 2);
});
