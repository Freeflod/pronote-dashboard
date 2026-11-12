// Dérivations de l'écran Enfant : couleur de matière, dernier « vu en cours », date d'un contrôle. Purs, données fictives.
/// <reference types="node" />
import { test } from "node:test";
import assert from "node:assert/strict";
import { addDays, lastSeen, safeColor, subjectColors } from "../src/ui/format.ts";
import type { LessonDTO } from "../src/types.ts";

void test("safeColor : accepte #hex, rgb(), refuse tout le reste", () => {
	assert.equal(safeColor("#4f8fdb"), "#4f8fdb");
	assert.equal(safeColor("#FFF"), "#FFF");
	assert.equal(safeColor("rgb(12, 34, 56)"), "rgb(12, 34, 56)");
	assert.equal(safeColor("red; background:url(x)"), undefined);
	assert.equal(safeColor("url(javascript:1)"), undefined);
	assert.equal(safeColor(undefined), undefined);
	assert.equal(safeColor(""), undefined);
});

void test("subjectColors : première couleur valide par matière", () => {
	const map = subjectColors([
		{ subject: "Maths", color: "pas une couleur" },
		{ subject: "Maths", color: "#111111" },
		{ subject: "Maths", color: "#222222" },
		{ subject: "SVT" },
	]);
	assert.equal(map.get("Maths"), "#111111");
	assert.equal(map.has("SVT"), false);
});

function lesson(subject: string, start: string, contents: LessonDTO["contents"]): LessonDTO {
	return { id: `${subject}${start}`, subject, color: "", start, teachers: [], contents };
}

void test("lastSeen : séance la plus récente de la matière qui a un contenu", () => {
	const lessons = [
		lesson("Maths", "2026-11-03T08:00:00.000Z", [{ title: "Anciennes équations", text: "x", files: [] }]),
		lesson("Maths", "2026-11-06T08:00:00.000Z", [{ title: "Équations du premier degré", text: "Isoler l'inconnue.\nPuis vérifier.", files: [] }]),
		lesson("Maths", "2026-11-08T08:00:00.000Z", []),
		lesson("SVT", "2026-11-07T08:00:00.000Z", [{ text: "Chromosomes et gènes", files: [] }]),
	];
	const m = lastSeen(lessons, "Maths");
	assert.equal(m?.summary, "Équations du premier degré");
	assert.deepEqual(m?.paragraphs, ["Équations du premier degré", "Isoler l'inconnue.\nPuis vérifier."]);
	assert.equal(lastSeen(lessons, "SVT")?.summary, "Chromosomes et gènes");
	assert.equal(lastSeen(lessons, "Anglais"), undefined);
});

void test("lastSeen : résumé tronqué", () => {
	const long = "mot ".repeat(60);
	const s = lastSeen([lesson("Maths", "2026-11-06T08:00:00.000Z", [{ text: long, files: [] }])], "Maths")?.summary ?? "";
	assert.ok(s.length <= 90);
	assert.ok(s.endsWith("…"));
});

void test("addDays : jour AAAA-MM-JJ plus N, passage de mois", () => {
	assert.equal(addDays("2026-11-28", 5), "2026-12-03");
	assert.equal(addDays("2026-11-09", 0), "2026-11-09");
});
