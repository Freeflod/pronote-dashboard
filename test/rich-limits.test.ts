// Garde-fous du HTML de Pronote gardé pour l'écran : taille, ancienne couleur sans dièse, clé de stockage sans nom d'élève.
import { test } from "node:test";
import assert from "node:assert/strict";
import { MAX_RICH_HTML, limitHtml, shortHash } from "../src/util.ts";
import { colorBucket, legacyColor } from "../src/rich-color.ts";

void test("limitHtml : vide ou trop gros = rien, le texte Markdown suffit", () => {
	assert.equal(limitHtml(undefined), undefined);
	assert.equal(limitHtml(""), undefined);
	assert.equal(limitHtml("<p>ok</p>"), "<p>ok</p>");
	assert.equal(limitHtml("x".repeat(MAX_RICH_HTML)), "x".repeat(MAX_RICH_HTML));
	assert.equal(limitHtml("x".repeat(MAX_RICH_HTML + 1)), undefined);
});

void test("legacyColor : l'ancienne balise font donne parfois un hexadécimal sans dièse", () => {
	assert.equal(colorBucket(legacyColor("FF0000")), "red");
	assert.equal(colorBucket(legacyColor("f80")), "orange");
	assert.equal(colorBucket(legacyColor("#00ff00")), "green");
	assert.equal(colorBucket(legacyColor("red")), "red");
	assert.equal(legacyColor("add"), "#add");
	assert.equal(legacyColor(null), undefined);
	assert.equal(legacyColor(""), undefined);
});

void test("shortHash : stable, hexadécimal, ne contient pas le texte", () => {
	const key = "compte-1:MARTIN Zoé";
	assert.equal(shortHash(key), shortHash(key));
	assert.match(shortHash(key), /^[0-9a-f]{8}$/);
	assert.notEqual(shortHash(key), shortHash("compte-1:MARTIN Hugo"));
	assert.ok(!shortHash(key).includes("Zo"));
});
