// Caractérisation des utilitaires purs. htmlToMarkdown (DOMParser) se vérifie dans Obsidian. Données fictives.
/// <reference types="node" />
import { test } from "node:test";
import assert from "node:assert/strict";
import {
	escapeCell,
	formatPoints,
	friendlyName,
	isoDay,
	localDateTime,
	sanitizeFileName,
	sanitizeName,
	slugTag,
	unique,
} from "../src/util.ts";

void test("sanitizeName : caractères interdits, espaces, longueur, nom vide", () => {
	assert.equal(sanitizeName('a/b\\c:d*e?f"g<h>i|j#k^l[m]n'), "a b c d e f g h i j k l m n");
	assert.equal(sanitizeName("  trop   d'espaces  "), "trop d'espaces");
	assert.equal(sanitizeName("x".repeat(100)).length, 80);
	assert.equal(sanitizeName("///"), "Sans titre");
});

void test("sanitizeFileName : garde l'extension en minuscules", () => {
	assert.equal(sanitizeFileName("Fiche: fractions.PDF"), "Fiche fractions.pdf");
	assert.equal(sanitizeFileName("sans extension"), "sans extension");
	assert.equal(sanitizeFileName("y".repeat(100) + ".docx"), "y".repeat(70) + ".docx");
});

void test("slugTag : minuscules, sans accents, tirets", () => {
	assert.equal(slugTag("Éducation Physique & Sportive"), "education-physique-sportive");
	assert.equal(slugTag("  --SVT--  "), "svt");
});

void test("friendlyName : prénoms seulement (NOM en capitales retiré)", () => {
	assert.equal(friendlyName("DUPONT Jean Pierre"), "Jean Pierre");
	assert.equal(friendlyName("DE LA FONTAINE Marie"), "Marie");
	assert.equal(friendlyName("DUPONT"), "DUPONT");
	assert.equal(friendlyName("   "), "");
});

void test("isoDay et localDateTime : date locale", () => {
	const d = new Date(2026, 10, 5, 8, 7);
	assert.equal(isoDay(d), "2026-11-05");
	assert.equal(localDateTime(d), "2026-11-05T08:07");
});

void test("escapeCell : barres verticales et retours à la ligne", () => {
	assert.equal(escapeCell("a|b\nc"), "a\\|b c");
});

void test("unique : garde le premier de chaque valeur, dans l'ordre", () => {
	assert.deepEqual(unique(["a", "b", "a", "c", "b"]), ["a", "b", "c"]);
});

void test("formatPoints : un nombre invalide n'est pas affiché (jamais « NaN »)", () => {
	assert.equal(formatPoints(Number.NaN), undefined);
	assert.equal(formatPoints(Number.POSITIVE_INFINITY), undefined);
	assert.equal(formatPoints(14), "14");
	assert.equal(formatPoints(14.5), "14,5");
	assert.equal(formatPoints(12.25), "12,25");
	assert.equal(formatPoints(12.1), "12,1");
});
