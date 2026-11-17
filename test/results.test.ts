// Logique pure de la section « Résultats scolaires ». Données fictives.
/// <reference types="node" />
import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluationsBySubject, mergeResults, resultsSections } from "../src/blocks.ts";
import type { GradeDTO, ResultsDTO, SkillEvaluationDTO } from "../src/types.ts";

const grade: GradeDTO = { id: "g1", subject: "Matière A", date: "2026-11-02T00:00:00.000Z", value: "14", outOf: "20", coefficient: 1, comment: "" };

function evaluation(id: string, subject: string, date: string, domains: string[]): SkillEvaluationDTO {
	return {
		id,
		name: `Évaluation ${id}`,
		subject,
		date,
		skills: domains.map((domain, i) => ({ id: `${id}-${i}`, level: "Très bonne maîtrise", abbreviation: "A+", domain })),
	};
}

function results(grades: GradeDTO[], skillEvaluations: SkillEvaluationDTO[]): ResultsDTO {
	return { periodName: "Période fictive", averages: [], grades, skillEvaluations, warnings: [] };
}

void test("resultsSections : notes seules", () => {
	assert.deepEqual(resultsSections(results([grade], [])), { notes: true, skills: false });
});

void test("resultsSections : compétences seules", () => {
	assert.deepEqual(resultsSections(results([], [evaluation("e1", "Matière A", "2026-11-03", ["D1"])])), { notes: false, skills: true });
});

void test("resultsSections : les deux", () => {
	assert.deepEqual(resultsSections(results([grade], [evaluation("e1", "Matière A", "2026-11-03", ["D1"])])), { notes: true, skills: true });
});

void test("resultsSections : aucun ; une évaluation sans compétence ne compte pas", () => {
	assert.deepEqual(resultsSections(results([], [])), { notes: false, skills: false });
	assert.deepEqual(resultsSections(results([], [evaluation("e1", "Matière A", "2026-11-03", [])])), { notes: false, skills: false });
});

void test("evaluationsBySubject : matières par évaluation la plus récente, évaluations récentes d'abord, sans compétence écartées", () => {
	const groups = evaluationsBySubject([
		evaluation("e3", "Matière B", "2026-11-03", ["Domaine 1"]),
		evaluation("e2", "Matière A", "2026-11-04", ["Domaine 1"]),
		evaluation("e1", "Matière B", "2026-11-05", ["Domaine 1", "Domaine 2"]),
		evaluation("e4", "Matière C", "2026-11-09", []),
	]);
	assert.deepEqual(
		groups.map((g) => g.subject),
		["Matière B", "Matière A"],
	);
	assert.deepEqual(
		groups[0]?.evaluations.map((e) => e.id),
		["e1", "e3"],
	);
	assert.equal(groups[0]?.evaluations[0]?.skills.length, 2);
});

void test("mergeResults : une lecture en échec garde la partie précédente", () => {
	const before = results([grade], []);
	before.overallAverage = "14";
	const next: ResultsDTO = { ...results([], [evaluation("e1", "Matière A", "2026-11-03", ["D1"])]), failed: { notes: true, skills: false }, warnings: ["Notes indisponibles"] };
	const merged = mergeResults(next, before);
	assert.deepEqual(merged.grades, [grade]);
	assert.equal(merged.overallAverage, "14");
	assert.equal(merged.skillEvaluations.length, 1);
	assert.deepEqual(merged.warnings, ["Notes indisponibles"]);
});

void test("mergeResults : une lecture en échec sans cache reste vide", () => {
	const next: ResultsDTO = { ...results([grade], []), failed: { notes: false, skills: true }, warnings: ["Compétences indisponibles"] };
	assert.deepEqual(mergeResults(next, undefined).skillEvaluations, []);
});

void test("mergeResults : sans échec, la donnée fraîche gagne", () => {
	const next = results([], []);
	assert.deepEqual(mergeResults(next, results([grade], [])).grades, []);
});
