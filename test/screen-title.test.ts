// Titre de l'écran et prénoms des onglets d'enfants. Données fictives (prénoms inventés).
/// <reference types="node" />
import { test } from "node:test";
import assert from "node:assert/strict";
import { CHILD_FALLBACK_LABEL, TITLE_CHILD, TITLE_PARENT, TITLE_PARENT_FOR, screenTitle, tabNames } from "../src/blocks.ts";

void test("screenTitle : mode Enfant, titre à la première personne, sans prénom", () => {
	assert.equal(screenTitle("child", "DURAND Zélie"), TITLE_CHILD);
});

void test("screenTitle : mode Parent, le titre cite le prénom de l'enfant affiché", () => {
	assert.equal(screenTitle("parent", "DURAND Zélie"), `${TITLE_PARENT_FOR} Zélie ?`);
	assert.equal(screenTitle("parent", "  Zélie  "), `${TITLE_PARENT_FOR} Zélie ?`);
	assert.equal(screenTitle("parent", "DURAND Anne Lise"), `${TITLE_PARENT_FOR} Anne Lise ?`);
});

void test("screenTitle : mode Parent sans prénom connu, repli sur le titre sans nom", () => {
	assert.equal(screenTitle("parent", ""), TITLE_PARENT);
	assert.equal(screenTitle("parent", "   "), TITLE_PARENT);
	assert.equal(screenTitle("parent", undefined), TITLE_PARENT);
	assert.equal(screenTitle("parent", CHILD_FALLBACK_LABEL), TITLE_PARENT);
});

void test("tabNames : le prénom seul, sauf si deux onglets portent le même", () => {
	const tabs = [
		{ key: "a:1", label: "DURAND Zélie" },
		{ key: "a:2", label: "DURAND Oscar" },
	];
	assert.deepEqual([...tabNames(tabs)], [
		["a:1", "Zélie"],
		["a:2", "Oscar"],
	]);
	const same = [
		{ key: "a:1", label: "DURAND Zélie" },
		{ key: "b:1", label: "MARTIN Zélie" },
		{ key: "b:2", label: "MARTIN Oscar" },
	];
	assert.deepEqual([...tabNames(same)], [
		["a:1", "DURAND Zélie"],
		["b:1", "MARTIN Zélie"],
		["b:2", "Oscar"],
	]);
});

void test("tabNames : libellé vide, repli sur « Enfant »", () => {
	assert.deepEqual([...tabNames([{ key: "a:1", label: "" }])], [["a:1", CHILD_FALLBACK_LABEL]]);
});
