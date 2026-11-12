// Logique pure de la lecture des notes par matière. Données fictives.
/// <reference types="node" />
import { test } from "node:test";
import assert from "node:assert/strict";
import { coefText, gapLabel, gradeText, notesBySubject, parseGrade, subjectsBelowClass } from "../src/blocks.ts";
import type { SubjectNotes } from "../src/blocks.ts";
import type { GradeDTO, SubjectAverageDTO } from "../src/types.ts";

function g(id: string, subject: string, date: string, value = "10"): GradeDTO {
	return { id, subject, date: `${date}T00:00:00.000Z`, value, outOf: "20", coefficient: 1, comment: "" };
}

void test("parseGrade : virgule française, entier, valeur spéciale", () => {
	assert.equal(parseGrade("14,5"), 14.5);
	assert.equal(parseGrade("12"), 12);
	assert.equal(parseGrade("Abs"), undefined);
	assert.equal(parseGrade("Disp"), undefined);
	assert.equal(parseGrade(""), undefined);
	assert.equal(parseGrade(undefined), undefined);
});

void test("gapLabel : au-dessus, en dessous, égal", () => {
	assert.deepEqual(gapLabel("14,2", "12,8"), { text: "1,4 au-dessus de la classe", sign: 1 });
	assert.deepEqual(gapLabel("12,2", "12,8"), { text: "0,6 en dessous de la classe", sign: -1 });
	assert.deepEqual(gapLabel("12,8", "12,8"), { text: "comme la classe", sign: 0 });
	assert.deepEqual(gapLabel("12,81", "12,8"), { text: "comme la classe", sign: 0 });
});

void test("gapLabel : valeur spéciale ou absente, pas d'écart", () => {
	assert.equal(gapLabel("Abs", "12,8"), undefined);
	assert.equal(gapLabel("14", "N.Not"), undefined);
	assert.equal(gapLabel(undefined, "12"), undefined);
	assert.equal(gapLabel("14", undefined), undefined);
});

void test("notesBySubject : matières par note la plus récente, notes récentes d'abord, sans-note en dernier", () => {
	const grades = [g("1", "B", "2026-10-01"), g("2", "A", "2026-11-02"), g("3", "B", "2026-11-05"), g("4", "A", "2026-09-01")];
	const averages: SubjectAverageDTO[] = [
		{ subject: "Z", student: "9", classAverage: "10" },
		{ subject: "A", student: "14", classAverage: "12" },
	];
	const out = notesBySubject(grades, averages);
	assert.deepEqual(out.map((s) => s.subject), ["B", "A", "Z"]);
	assert.deepEqual(out[0]?.grades.map((x) => x.id), ["3", "1"]);
	assert.deepEqual(out[1]?.grades.map((x) => x.id), ["2", "4"]);
	assert.equal(out[1]?.student, "14");
	assert.equal(out[1]?.classAverage, "12");
	assert.equal(out[2]?.grades.length, 0);
});

void test("notesBySubject : note sans moyenne forme sa carte ; matière sans note et sans donnée est omise", () => {
	const out = notesBySubject([g("1", "Sans moyenne", "2026-11-01")], [{ subject: "Vide" }]);
	assert.deepEqual(out.map((s) => s.subject), ["Sans moyenne"]);
	assert.equal(out[0]?.student, undefined);
});

function sn(subject: string, student?: string, classAverage?: string): SubjectNotes {
	return { subject, student, classAverage, grades: [] };
}

void test("subjectsBelowClass : aucune, une, deux, valeur non numérique ignorée", () => {
	assert.deepEqual(subjectsBelowClass([sn("A", "14", "12"), sn("B", "12", "12")]), []);
	assert.deepEqual(subjectsBelowClass([sn("A", "11", "12"), sn("B", "14", "12")]), ["A"]);
	assert.deepEqual(subjectsBelowClass([sn("A", "11", "12"), sn("B", "9,5", "12"), sn("C", "15", "12")]), ["A", "B"]);
	assert.deepEqual(subjectsBelowClass([sn("A", "Abs", "12"), sn("B", "11"), sn("C", "11,96", "12")]), []);
});

void test("gapLabel : un demi-dixième s'arrondit pareil dans les deux sens", () => {
	assert.deepEqual(gapLabel("12", "12,25"), { text: "0,3 en dessous de la classe", sign: -1 });
	assert.deepEqual(gapLabel("12,25", "12"), { text: "0,3 au-dessus de la classe", sign: 1 });
	assert.deepEqual(gapLabel("12,35", "12"), { text: "0,4 au-dessus de la classe", sign: 1 });
});

void test("gradeText : une valeur non numérique n'a pas de « sur 20 »", () => {
	assert.equal(gradeText("16", "20"), "16 / 20");
	assert.equal(gradeText("15,5", "20"), "15,5 / 20");
	assert.equal(gradeText("Abs", "20"), "Abs");
	assert.equal(gradeText("", "20"), "");
});

void test("coefText : coefficient à la française, absent quand il vaut 1", () => {
	assert.equal(coefText(1), "");
	assert.equal(coefText(2), "coef. 2");
	assert.equal(coefText(0.5), "coef. 0,5");
	assert.equal(coefText(0.3), "coef. 0,3");
});
