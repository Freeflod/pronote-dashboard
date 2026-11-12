// Politique de cache des fichiers : péremption et éviction. Données fictives.
/// <reference types="node" />
import { test } from "node:test";
import assert from "node:assert/strict";
import { isExpired, planEviction } from "../src/cache-policy.ts";

const DAY = 24 * 3600 * 1000;

void test("isExpired : au-delà de la durée de vie, pas avant, pas à la limite", () => {
	const now = Date.UTC(2026, 10, 8);
	assert.equal(isExpired(now - 31 * DAY, 30, now), true);
	assert.equal(isExpired(now - 30 * DAY, 30, now), false);
	assert.equal(isExpired(now - DAY, 30, now), false);
});

void test("planEviction : plafond 0 ou fichier plus gros que le plafond = pas de cache, rien évincé", () => {
	const files = [{ key: "a", size: 10, storedAt: 1 }];
	assert.deepEqual(planEviction(files, { size: 1 }, 0), { store: false, evict: [] });
	assert.deepEqual(planEviction(files, { size: 101 }, 100), { store: false, evict: [] });
});

void test("planEviction : exact au plafond = stocké sans éviction ; au-delà = plus anciens évincés d'abord", () => {
	const files = [
		{ key: "recent", size: 40, storedAt: 30 },
		{ key: "vieux", size: 30, storedAt: 10 },
		{ key: "milieu", size: 30, storedAt: 20 },
	];
	assert.deepEqual(planEviction(files, { size: 0 }, 100), { store: true, evict: [] });
	assert.deepEqual(planEviction(files, { size: 20 }, 100), { store: true, evict: ["vieux"] });
	assert.deepEqual(planEviction(files, { size: 50 }, 100), { store: true, evict: ["vieux", "milieu"] });
});

void test("planEviction : n'évince pas plus que nécessaire, ne modifie pas l'entrée", () => {
	const files = [{ key: "a", size: 60, storedAt: 2 }, { key: "b", size: 40, storedAt: 1 }];
	const copy = JSON.stringify(files);
	assert.deepEqual(planEviction(files, { size: 100 }, 100), { store: true, evict: ["b", "a"] });
	assert.equal(JSON.stringify(files), copy);
});
