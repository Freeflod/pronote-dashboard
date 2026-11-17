// Bloc « Contenus de séance » : regroupements, résumé d'une séance, choix d'affichage. Données fictives.
/// <reference types="node" />
import { test } from "node:test";
import assert from "node:assert/strict";
import {
	LESSON_SUMMARY_FALLBACK,
	LESSON_SUMMARY_MAX,
	LESSON_VIEW_DEFAULT,
	filterLessons,
	groupLessonsByDay,
	groupLessonsBySubject,
	latestLessonGroup,
	lessonSubjects,
	lessonSummary,
	parseLessonView,
	type LessonEntry,
} from "../src/blocks.ts";
import type { LessonContentDTO } from "../src/types.ts";

function entry(subject: string, start: string, contents: Partial<LessonContentDTO>[] = [{ text: "Texte" }]): LessonEntry {
	return {
		id: `${subject}${start}`,
		subject,
		color: "#000",
		start,
		teachers: [],
		contents: contents.map((c) => ({ text: "", files: [], ...c })),
	};
}

/** Comme `lessonEntries` les rend : la plus récente d'abord. */
const ENTRIES = [
	entry("Maths", "2026-11-05T14:00:00"),
	entry("Histoire", "2026-11-05T08:00:00"),
	entry("Maths", "2026-11-03T10:00:00"),
	entry("Anglais", "2026-11-02T09:00:00"),
];

void test("groupLessonsByDay : le jour le plus récent d'abord, séances d'un jour dans l'ordre de la journée", () => {
	const groups = groupLessonsByDay(ENTRIES);
	assert.deepEqual(
		groups.map((g) => g.key),
		["2026-11-05", "2026-11-03", "2026-11-02"],
	);
	assert.deepEqual(
		groups[0]?.entries.map((e) => e.subject),
		["Histoire", "Maths"],
	);
	assert.equal(latestLessonGroup(groups), "2026-11-05");
});

void test("groupLessonsBySubject : matières par ordre alphabétique, séances de la plus récente à la plus ancienne", () => {
	const groups = groupLessonsBySubject([...ENTRIES, entry("Éducation musicale", "2026-11-01T09:00:00")]);
	assert.deepEqual(
		groups.map((g) => g.key),
		["Anglais", "Éducation musicale", "Histoire", "Maths"],
	);
	assert.deepEqual(
		groups[3]?.entries.map((e) => e.start),
		["2026-11-05T14:00:00", "2026-11-03T10:00:00"],
	);
});

void test("latestLessonGroup : le groupe qui porte la séance la plus récente ; aucun groupe, rien", () => {
	assert.equal(latestLessonGroup(groupLessonsBySubject(ENTRIES)), "Maths");
	assert.equal(latestLessonGroup([]), undefined);
	assert.deepEqual(groupLessonsByDay([]), []);
	assert.deepEqual(groupLessonsBySubject([]), []);
});

void test("lessonSubjects : matières distinctes, ordre alphabétique", () => {
	assert.deepEqual(lessonSubjects(ENTRIES), ["Anglais", "Histoire", "Maths"]);
	assert.deepEqual(lessonSubjects([]), []);
});

void test("filterLessons : une matière, ou toutes si le filtre est vide ou ne correspond à rien", () => {
	assert.deepEqual(
		filterLessons(ENTRIES, "Maths").map((e) => e.start),
		["2026-11-05T14:00:00", "2026-11-03T10:00:00"],
	);
	assert.equal(filterLessons(ENTRIES, "").length, ENTRIES.length);
	assert.equal(filterLessons(ENTRIES, "Latin").length, ENTRIES.length);
});

void test("lessonSummary : le titre du premier contenu qui en a un", () => {
	assert.equal(lessonSummary(entry("Maths", "2026-11-05T14:00:00", [{ title: "  Les fractions  ", text: "Cours" }])), "Les fractions");
	assert.equal(
		lessonSummary(
			entry("Maths", "2026-11-05T14:00:00", [
				{ title: " ", category: "Cours", text: "Rappel" },
				{ title: "Les fractions", text: "" },
			]),
		),
		"Les fractions +1",
	);
});

void test("lessonSummary : sans titre, la catégorie ; sans catégorie, le début du texte sans marques Markdown", () => {
	assert.equal(lessonSummary(entry("Maths", "2026-11-05T14:00:00", [{ category: " Correction ", text: "Exercices 3 et 4" }])), "Correction");
	assert.equal(
		lessonSummary(entry("Maths", "2026-11-05T14:00:00", [{ text: "**Exercices** 3 et 4\n- voir [le site](https://exemple.invalid/a)" }])),
		"Exercices 3 et 4 voir le site",
	);
	const long = "a".repeat(LESSON_SUMMARY_MAX + 20);
	assert.equal(lessonSummary(entry("Maths", "2026-11-05T14:00:00", [{ text: long }])), `${"a".repeat(LESSON_SUMMARY_MAX)}…`);
	assert.equal(lessonSummary(entry("Maths", "2026-11-05T14:00:00", [{ text: "a".repeat(LESSON_SUMMARY_MAX) }])), "a".repeat(LESSON_SUMMARY_MAX));
});

void test("lessonSummary : « +n » quand la séance a plusieurs contenus ; rien de lisible, libellé de repli", () => {
	assert.equal(
		lessonSummary(entry("Maths", "2026-11-05T14:00:00", [{ title: "Chapitre 2", text: "" }, { text: "Suite" }, { text: "Fin" }])),
		"Chapitre 2 +2",
	);
	assert.equal(lessonSummary(entry("Maths", "2026-11-05T14:00:00", [{ text: " ** " }])), LESSON_SUMMARY_FALLBACK);
	assert.equal(lessonSummary(entry("Maths", "2026-11-05T14:00:00", [])), LESSON_SUMMARY_FALLBACK);
});

void test("parseLessonView : choix gardé relu ; absent ou illisible, par jour et toutes les matières", () => {
	assert.deepEqual(LESSON_VIEW_DEFAULT, { mode: "day", subject: "" });
	assert.deepEqual(parseLessonView({ mode: "subject", subject: "Maths" }), { mode: "subject", subject: "Maths" });
	assert.deepEqual(parseLessonView({ mode: "day", subject: "" }), LESSON_VIEW_DEFAULT);
	for (const raw of [undefined, null, "subject", 3, [], {}, { mode: "semaine", subject: 4 }]) {
		assert.deepEqual(parseLessonView(raw), LESSON_VIEW_DEFAULT);
	}
	assert.deepEqual(parseLessonView({ mode: "subject" }), { mode: "subject", subject: "" });
	assert.deepEqual(parseLessonView({ mode: "autre", subject: "Maths" }), { mode: "day", subject: "Maths" });
});
