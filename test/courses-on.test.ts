// Cours d'un jour donné : pur, jour passé en paramètre. Données fictives.
/// <reference types="node" />
import { test } from "node:test";
import assert from "node:assert/strict";
import { coursesOn } from "../src/blocks.ts";

function at(day: string, hour: number, title: string) {
	const d = new Date(`${day}T00:00:00`);
	d.setHours(hour, 0, 0, 0);
	return { title, start: d.toISOString() };
}

void test("coursesOn : seulement le jour demandé, triés par heure", () => {
	const entries = [at("2026-11-09", 14, "Histoire"), at("2026-11-10", 8, "Maths"), at("2026-11-09", 8, "SVT"), at("2026-11-08", 9, "Anglais")];
	assert.deepEqual(coursesOn(entries, "2026-11-09").map((e) => e.title), ["SVT", "Histoire"]);
});

void test("coursesOn : journée sans cours, liste vide", () => {
	assert.deepEqual(coursesOn([at("2026-11-10", 8, "Maths")], "2026-11-09"), []);
	assert.deepEqual(coursesOn([], "2026-11-09"), []);
});
