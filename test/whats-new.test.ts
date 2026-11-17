// Nouveautés affichées une fois par version. Données fictives.
/// <reference types="node" />
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { compareVersions, newsSince, shouldShowNews, WHATS_NEW, type NewsEntry } from "../src/whats-new.ts";

const LIST: NewsEntry[] = [
	{ version: "0.7.0", items: ["g"] },
	{ version: "0.6.0", items: ["f"] },
	{ version: "0.5.0", items: ["e"] },
	{ version: "0.4.0", items: ["d"] },
];
const versions = (l: NewsEntry[]) => l.map((e) => e.version);

void test("compareVersions : numérique (0.10.0 > 0.9.0), null si illisible", () => {
	assert.equal(compareVersions("0.10.0", "0.9.0"), 1);
	assert.equal(compareVersions("0.6.0", "0.6.0"), 0);
	assert.equal(compareVersions("0.5.9", "0.6.0"), -1);
	assert.equal(compareVersions("abc", "0.6.0"), null);
});

void test("newsSince : saut de plusieurs versions, de la plus récente à la plus ancienne", () => {
	assert.deepEqual(versions(newsSince("0.4.0", "0.7.0", LIST)), ["0.7.0", "0.6.0", "0.5.0"]);
});

void test("newsSince : version vue inconnue de la liste, on garde ce qui la dépasse", () => {
	assert.deepEqual(versions(newsSince("0.5.5", "0.7.0", LIST)), ["0.7.0", "0.6.0"]);
});

void test("newsSince : jamais une version plus récente que la courante", () => {
	assert.deepEqual(versions(newsSince("0.5.0", "0.6.0", LIST)), ["0.6.0"]);
});

void test("newsSince : aucune version vue ou illisible = la plus récente seulement ; déjà à jour = rien", () => {
	assert.deepEqual(versions(newsSince(undefined, "0.7.0", LIST)), ["0.7.0"]);
	assert.deepEqual(versions(newsSince("n'importe quoi", "0.7.0", LIST)), ["0.7.0"]);
	assert.deepEqual(newsSince("0.7.0", "0.7.0", LIST), []);
});

void test("shouldShowNews : installation neuve (rien vu, aucun compte) = jamais", () => {
	assert.equal(shouldShowNews(undefined, "0.7.0", false), false);
});

void test("shouldShowNews : rien vu mais un compte configuré (mise à jour d'une ancienne version) = oui", () => {
	assert.equal(shouldShowNews(undefined, "0.7.0", true), true);
});

void test("shouldShowNews : même version = non ; montée = oui ; retour en arrière = non", () => {
	assert.equal(shouldShowNews("0.7.0", "0.7.0", true), false);
	assert.equal(shouldShowNews("0.6.0", "0.7.0", true), true);
	assert.equal(shouldShowNews("0.6.0", "0.7.0", false), true);
	assert.equal(shouldShowNews("0.8.0", "0.7.0", true), false);
});

void test("WHATS_NEW : de la plus récente à la plus ancienne, sans doublon, avec des puces", () => {
	for (let i = 1; i < WHATS_NEW.length; i++) {
		assert.equal(compareVersions(WHATS_NEW[i - 1].version, WHATS_NEW[i].version), 1);
	}
	for (const e of WHATS_NEW) assert.ok(e.items.length > 0 && e.items.every((s) => s.trim() !== ""));
});

void test("WHATS_NEW : la version du manifeste a son entrée, ou la liste est déjà à une version à publier plus récente", () => {
	const manifest = JSON.parse(readFileSync(new URL("../manifest.json", import.meta.url), "utf8")) as { version: string };
	const first = WHATS_NEW[0];
	assert.ok(first, "WHATS_NEW est vide");
	const hasEntry = WHATS_NEW.some((e) => e.version === manifest.version);
	// Avant la publication, la liste devance le manifeste (0.7.0 prête, manifeste encore 0.6.0).
	const aheadOfManifest = compareVersions(first.version, manifest.version) === 1;
	assert.ok(hasEntry || aheadOfManifest, `pas d'entrée WHATS_NEW pour la version ${manifest.version} du manifeste`);
});
