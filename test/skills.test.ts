// Niveaux de compétence et pastilles. Données fictives.
/// <reference types="node" />
import { test } from "node:test";
import assert from "node:assert/strict";
import { estimatedLevel, skillScore, skillTrend } from "../src/blocks.ts";
import { skillStatus } from "../src/blocks.ts";
import type { SkillEvaluationDTO } from "../src/types.ts";

void test("skillStatus : A+ vert foncé, A vert, C jaune, E rouge ; le texte garde le niveau et l'abréviation", () => {
	assert.deepEqual(skillStatus("A+", "Très bonne maîtrise"), { text: "Très bonne maîtrise · A+", tone: "top" });
	assert.deepEqual(skillStatus("A", "Maîtrise satisfaisante"), { text: "Maîtrise satisfaisante · A", tone: "good" });
	assert.deepEqual(skillStatus("C", "Maîtrise fragile"), { text: "Maîtrise fragile · C", tone: "fair" });
	assert.deepEqual(skillStatus("E", "Maîtrise insuffisante"), { text: "Maîtrise insuffisante · E", tone: "low" });
});

void test("skillStatus : Abs et Ne s'écrivent en clair, sans couleur ; une abréviation inconnue reste neutre", () => {
	assert.deepEqual(skillStatus("Abs", ""), { text: "Absent", tone: "none" });
	assert.deepEqual(skillStatus("Ne", ""), { text: "Non évalué", tone: "none" });
	assert.deepEqual(skillStatus("Z", "Niveau fictif"), { text: "Niveau fictif · Z", tone: "none" });
});

void test("skillStatus : un niveau vide n'écrit que l'abréviation (jamais « · A »)", () => {
	assert.deepEqual(skillStatus("A", ""), { text: "A", tone: "good" });
});

function ev(id: string, date: string, abbreviations: string[]): SkillEvaluationDTO {
	return {
		id,
		name: `Évaluation ${id}`,
		subject: "Matière A",
		date,
		skills: abbreviations.map((abbreviation, i) => ({ id: `${id}-${i}`, level: `Niveau ${abbreviation}`, abbreviation, domain: "Domaine 1" })),
	};
}

void test("PD-013 skillScore : A+ 4, A 3, C 2, E 1 ; Abs, Ne et inconnu ignorés (jamais 0)", () => {
	assert.equal(skillScore("A+"), 4);
	assert.equal(skillScore("A"), 3);
	assert.equal(skillScore("C"), 2);
	assert.equal(skillScore("E"), 1);
	assert.equal(skillScore("Abs"), undefined);
	assert.equal(skillScore("Ne"), undefined);
	assert.equal(skillScore("Z"), undefined);
});

void test("PD-013 estimatedLevel : seuils exacts 3,5 → A+, 2,5 → A, 1,5 → C, en dessous → E", () => {
	assert.deepEqual(estimatedLevel([ev("1", "2026-11-01", ["A+", "A"])]), { abbreviation: "A+", mean: 3.5 });
	assert.equal(estimatedLevel([ev("1", "2026-11-01", ["A", "A", "C", "A+"])])?.abbreviation, "A");
	assert.deepEqual(estimatedLevel([ev("1", "2026-11-01", ["A", "C"])]), { abbreviation: "A", mean: 2.5 });
	assert.deepEqual(estimatedLevel([ev("1", "2026-11-01", ["C", "E"])]), { abbreviation: "C", mean: 1.5 });
	assert.equal(estimatedLevel([ev("1", "2026-11-01", ["C", "C", "E", "E", "E"])])?.abbreviation, "E");
	assert.equal(estimatedLevel([ev("1", "2026-11-01", ["A+", "A", "A"])])?.abbreviation, "A");
});

void test("PD-013 estimatedLevel : moyenne de toutes les compétences, Abs et Ne ignorés, aucune donnée = undefined", () => {
	const mixed = [ev("1", "2026-11-01", ["A+", "Abs", "Ne"]), ev("2", "2026-11-02", ["A"])];
	assert.deepEqual(estimatedLevel(mixed), { abbreviation: "A+", mean: 3.5 });
	assert.equal(estimatedLevel([ev("1", "2026-11-01", ["Abs", "Ne"])]), undefined);
	assert.equal(estimatedLevel([]), undefined);
});

void test("PD-013 skillTrend : hausse et baisse aux seuils exacts ±0,25, stable en deçà", () => {
	const before = ev("0", "2026-10-01", ["A"]);
	const mk = (last: string[]): SkillEvaluationDTO[] => [before, ev("1", "2026-10-02", ["A"]), ev("2", "2026-10-03", ["A"]), ev("3", "2026-10-04", last)];
	assert.equal(skillTrend(mk(["A+", "A+", "A+", "A"])), "up");
	assert.equal(skillTrend(mk(["C", "C", "C", "A"])), "down");
	assert.equal(skillTrend(mk(["A+", "A"])), "stable");
	assert.equal(skillTrend(mk(["C", "A"])), "stable");
	assert.equal(skillTrend(mk(["A"])), "stable");
});

void test("PD-013 skillTrend : moins de 4 évaluations notées = undefined (une sans score ne compte pas)", () => {
	assert.equal(skillTrend([ev("1", "2026-10-01", ["A"]), ev("2", "2026-10-02", ["A"]), ev("3", "2026-10-03", ["A+"])]), undefined);
	assert.equal(skillTrend([ev("1", "2026-10-01", ["A"]), ev("2", "2026-10-02", ["A"]), ev("3", "2026-10-03", ["A+"]), ev("4", "2026-10-04", ["Abs"])]), undefined);
	assert.equal(skillTrend([]), undefined);
});

void test("PD-013 skillTrend : l'ordre d'entrée ne compte pas, les dates décident", () => {
	const ordered = [ev("0", "2026-10-01", ["E"]), ev("1", "2026-10-02", ["E"]), ev("2", "2026-10-03", ["A+"]), ev("3", "2026-10-04", ["A+"]), ev("4", "2026-10-05", ["A+"])];
	assert.equal(skillTrend(ordered), "up");
	const shuffled = [ordered[3], ordered[0], ordered[4], ordered[2], ordered[1]].filter((e): e is SkillEvaluationDTO => e !== undefined);
	assert.equal(skillTrend(shuffled), "up");
	assert.equal(skillTrend([...shuffled].reverse()), "up");
});
