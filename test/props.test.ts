// Caractérisation du frontmatter des notes. Données fictives uniquement.
/// <reference types="node" />
import { test } from "node:test";
import assert from "node:assert/strict";
import { Raw, dateValue, parseUserProps, renderFrontmatter, substitute, toList } from "../src/props.ts";

/** Analyseur YAML minimal pour les tests : renvoie l'objet fourni, ou lève l'erreur fournie. */
const returns = (v: unknown) => () => v;

void test("renderFrontmatter : valeurs simples sans guillemets, valeurs ambiguës entre guillemets", () => {
	const out = renderFrontmatter({
		type: "cours",
		statut: "a trier",
		matiere: "Mathématiques",
		vrai: "true",
		nombre: "12",
		texteDate: "2026-11-05",
		espaceFin: "fin ",
		symbole: "#tag",
		date: dateValue("2026-11-05"),
		moyenne: 14.5,
		fait: false,
		professeur: ["M. Martin", "Mme Durand"],
	});
	assert.equal(
		out,
		[
			"---",
			"type: cours",
			"statut: a trier",
			"matiere: Mathématiques",
			'vrai: "true"',
			'nombre: "12"',
			'texteDate: "2026-11-05"',
			'espaceFin: "fin "',
			'symbole: "#tag"',
			"date: 2026-11-05",
			"moyenne: 14.5",
			"fait: false",
			"professeur: [M. Martin, Mme Durand]",
			"---",
		].join("\n"),
	);
});

void test("renderFrontmatter : ignore null, undefined et listes vides", () => {
	assert.equal(renderFrontmatter({ a: null, b: undefined, c: [], d: "x" }), "---\nd: x\n---");
});

void test("parseUserProps : texte vide", () => {
	assert.deepEqual(parseUserProps("  ", returns({})), { props: {} });
});

void test("parseUserProps : erreur de l'analyseur", () => {
	const r = parseUserProps("a: [", () => {
		throw new Error("YAML invalide");
	});
	assert.deepEqual(r, { props: {}, error: "YAML invalide" });
});

void test("parseUserProps : refuse ce qui n'est pas une suite propriété: valeur", () => {
	for (const v of [null, "texte", ["a"]]) {
		const r = parseUserProps("x", returns(v));
		assert.deepEqual(r.props, {});
		assert.ok(r.error);
	}
});

void test("parseUserProps : refuse un nom de propriété invalide", () => {
	const r = parseUserProps("x", returns({ "a b": 1 }));
	assert.equal(r.error, "Nom de propriété invalide : a b");
});

void test("parseUserProps : convertit dates, listes, nombres et vides", () => {
	const r = parseUserProps(
		"x",
		returns({
			type: "cours",
			niveau: 4,
			jour: new Date(Date.UTC(2026, 10, 5)),
			echeance: "2026-11-05",
			maj: "2026-11-05T08:30",
			cssclasses: ["justifie", null],
			vide: null,
			objet: { a: 1 },
		}),
	);
	assert.equal(r.error, undefined);
	assert.equal(r.props.type, "cours");
	assert.equal(r.props.niveau, 4);
	assert.ok(r.props.jour instanceof Raw);
	assert.equal(r.props.jour.text, "2026-11-05");
	assert.equal((r.props.echeance as Raw).text, "2026-11-05");
	assert.equal((r.props.maj as Raw).text, "2026-11-05T08:30");
	assert.deepEqual(r.props.cssclasses, ["justifie", ""]);
	assert.equal(r.props.vide, "");
	assert.equal("objet" in r.props, false);
});

void test("substitute : remplace les variables, y compris dans les listes", () => {
	const vars = { matiere: "Histoire", eleve: "Alice" };
	assert.equal(substitute("{{ matiere }} - {{eleve}} - {{inconnue}}", vars), "Histoire - Alice - ");
	assert.deepEqual(substitute(["{{eleve}}", 3], vars), ["Alice", 3]);
	assert.equal(substitute(7, vars), 7);
});

void test("toList", () => {
	assert.deepEqual(toList(undefined), []);
	assert.deepEqual(toList(null), []);
	assert.deepEqual(toList(""), []);
	assert.deepEqual(toList("a"), ["a"]);
	assert.deepEqual(toList(new Raw("2026-11-05")), ["2026-11-05"]);
	assert.deepEqual(toList(["a", "", new Raw("b"), 3]), ["a", "b", "3"]);
});
