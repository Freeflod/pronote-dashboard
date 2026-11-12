// États des blocs : décision pure cache -> état. Données fictives.
/// <reference types="node" />
import { test } from "node:test";
import assert from "node:assert/strict";
import { cachedState, failureState, resultState } from "../src/data/block-state.ts";

const DAY = 24 * 3600 * 1000;
const NOW = 100 * DAY;
const empty = (d: string[]) => d.length === 0;

void test("cachedState : sans entrée, chargement", () => {
	assert.deepEqual(cachedState<string[]>(undefined, 30, NOW, empty), { kind: "loading" });
});

void test("cachedState : entrée périmée, chargement", () => {
	const entry = { data: ["a"], storedAt: NOW - 31 * DAY };
	assert.deepEqual(cachedState(entry, 30, NOW, empty), { kind: "loading" });
});

void test("cachedState : entrée valide, prête avec sa date", () => {
	const entry = { data: ["a"], storedAt: NOW - DAY };
	assert.deepEqual(cachedState(entry, 30, NOW, empty), { kind: "ready", data: ["a"], fetchedAt: NOW - DAY });
});

void test("cachedState : entrée valide mais vide, état vide", () => {
	const entry = { data: [] as string[], storedAt: NOW - DAY };
	assert.deepEqual(cachedState(entry, 30, NOW, empty), { kind: "empty", fetchedAt: NOW - DAY });
});

void test("resultState : données fraîches", () => {
	assert.deepEqual(resultState(["a"], NOW, empty), { kind: "ready", data: ["a"], fetchedAt: NOW });
	assert.deepEqual(resultState([], NOW, empty), { kind: "empty", fetchedAt: NOW });
});

void test("failureState : hors ligne garde le cache valide", () => {
	const stale = { kind: "ready", data: ["a"], fetchedAt: 5 } as const;
	assert.deepEqual(failureState(false, "x", stale), { kind: "offline", data: ["a"], fetchedAt: 5 });
	assert.deepEqual(failureState(false, "x", { kind: "loading" }), { kind: "offline" });
});

void test("failureState : en ligne, erreur avec message et cache éventuel", () => {
	const stale = { kind: "ready", data: ["a"], fetchedAt: 5 } as const;
	assert.deepEqual(failureState(true, "boom", stale), { kind: "error", message: "boom", data: ["a"], fetchedAt: 5 });
	assert.deepEqual(failureState(true, "boom", { kind: "loading" }), { kind: "error", message: "boom" });
});
