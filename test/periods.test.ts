// Choix de la période d'un onglet Pronote. Données fictives.
/// <reference types="node" />
import { test } from "node:test";
import assert from "node:assert/strict";
import { pickPeriod } from "../src/periods.ts";

const day = (iso: string): Date => new Date(`${iso}T12:00:00Z`);
const period = (name: string, from: string, to: string) => ({ name, startDate: day(from), endDate: day(to) });
const NOW = day("2026-11-10").getTime();

const trimestre1 = period("Trimestre 1", "2026-08-31", "2026-11-22");
const semestre1 = period("Semestre 1", "2026-08-31", "2027-01-17");
const annee = period("Année", "2026-08-31", "2027-07-02");

void test("la période par défaut de l'onglet l'emporte sur un trimestre plus court (lycée en semestres)", () => {
	assert.equal(pickPeriod(semestre1, [trimestre1, semestre1, annee], NOW)?.name, "Semestre 1");
});

void test("sans période par défaut : la plus courte des périodes en cours", () => {
	assert.equal(pickPeriod(undefined, [annee, semestre1, trimestre1], NOW)?.name, "Trimestre 1");
});

void test("aucune période en cours : la plus courte de toutes ; aucune période : rien", () => {
	const later = day("2028-01-01").getTime();
	assert.equal(pickPeriod(undefined, [annee, semestre1], later)?.name, "Semestre 1");
	assert.equal(pickPeriod(undefined, [], NOW), undefined);
});
