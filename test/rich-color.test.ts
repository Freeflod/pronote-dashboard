// Règles pures du rendu du HTML de Pronote : couleur la plus proche dans la palette d'Obsidian, liste blanche des balises.
/// <reference types="node" />
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { RICH_COLORS, colorBucket, richTag, styleColors } from "../src/rich-color.ts";

void test("colorBucket : hexadécimal long, par teinte", () => {
	assert.equal(colorBucket("#ff0000"), "red");
	assert.equal(colorBucket("#ff8800"), "orange");
	assert.equal(colorBucket("#ffff00"), "yellow");
	assert.equal(colorBucket("#008000"), "green");
	assert.equal(colorBucket("#00ffff"), "cyan");
	assert.equal(colorBucket("#0000ff"), "blue");
	assert.equal(colorBucket("#800080"), "purple");
	assert.equal(colorBucket("#ff00ff"), "pink");
	assert.equal(colorBucket("#ff69b4"), "pink");
});

void test("colorBucket : abréviations hexadécimales, majuscules, espaces, canal alpha", () => {
	assert.equal(colorBucket("#F00"), "red");
	assert.equal(colorBucket("#00f"), "blue");
	assert.equal(colorBucket("#f00f"), "red");
	assert.equal(colorBucket("  #FF0000  "), "red");
	assert.equal(colorBucket("#0000FF80"), "blue");
});

void test("colorBucket : rgb() et rgba(), virgules ou espaces, pourcentages", () => {
	assert.equal(colorBucket("rgb(255, 0, 0)"), "red");
	assert.equal(colorBucket("RGB(255,0,0)"), "red");
	assert.equal(colorBucket("rgba(0, 0, 255, 0.5)"), "blue");
	assert.equal(colorBucket("rgb(0 128 0 / 50%)"), "green");
	assert.equal(colorBucket("rgb(100%, 0%, 0%)"), "red");
	assert.equal(colorBucket("rgb(224, 172, 0)"), "yellow");
});

void test("colorBucket : noms usuels, chaque couleur de la palette atteinte", () => {
	const names: Record<string, string> = {
		red: "red",
		orange: "orange",
		yellow: "yellow",
		green: "green",
		cyan: "cyan",
		blue: "blue",
		purple: "purple",
		pink: "pink",
	};
	for (const color of RICH_COLORS) assert.equal(colorBucket(names[color]), color);
	assert.equal(colorBucket(" Red "), "red");
	assert.equal(colorBucket("NAVY"), "blue");
	assert.equal(colorBucket("indigo"), "purple");
	assert.equal(colorBucket("magenta"), "pink");
	assert.equal(colorBucket("lime"), "green");
	assert.equal(colorBucket("gold"), "yellow");
});

void test("colorBucket : gris, noir et blanc ne donnent aucune couleur (le texte garde celle du thème)", () => {
	for (const css of ["#000", "#000000", "#fff", "#FFFFFF", "#808080", "#222", "rgb(34, 34, 34)", "black", "white", "gray", "grey", "silver"]) {
		assert.equal(colorBucket(css), undefined, css);
	}
});

void test("colorBucket : transparent ne donne aucune couleur", () => {
	for (const css of ["transparent", "rgba(255, 0, 0, 0)", "#ff000000", "#f000", "rgb(255 0 0 / 0%)"]) {
		assert.equal(colorBucket(css), undefined, css);
	}
});

void test("colorBucket : valeur illisible, aucune couleur", () => {
	for (const css of ["", "   ", "#12", "#ggg", "#12345", "rgb(1, 2)", "rgb(a, b, c)", "var(--x)", "inherit", "url(x)", "rouge", "red blue", "constructor", "tostring"]) {
		assert.equal(colorBucket(css), undefined, css);
	}
	assert.equal(colorBucket(undefined), undefined);
	assert.equal(colorBucket(null), undefined);
});

void test("styleColors : couleur du texte et du fond lues dans l'attribut style", () => {
	assert.deepEqual(styleColors("color: #ff0000; background-color: rgb(255, 255, 0)"), { color: "red", background: "yellow" });
	assert.deepEqual(styleColors("COLOR:RED"), { color: "red" });
	assert.deepEqual(styleColors("background: yellow"), { background: "yellow" });
	assert.deepEqual(styleColors("color: blue !important;"), { color: "blue" });
	assert.deepEqual(styleColors("font-size: 12px; color: rgb(0, 128, 0) ; font-weight: bold"), { color: "green" });
});

void test("styleColors : rien d'utilisable, aucun champ", () => {
	assert.deepEqual(styleColors("font-weight: bold"), {});
	assert.deepEqual(styleColors("color: black; background-color: #fff"), {});
	assert.deepEqual(styleColors("border-color: red"), {});
	assert.deepEqual(styleColors("background: url(http://exemple.invalid/a.png)"), {});
	assert.deepEqual(styleColors(""), {});
	assert.deepEqual(styleColors(null), {});
	assert.deepEqual(styleColors(undefined), {});
});

void test("styles.css : une classe de texte et une classe de fond par couleur, sur la variable d'Obsidian du même nom", () => {
	const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
	for (const color of RICH_COLORS) {
		assert.ok(css.includes(`.pronote-c-${color} {\n\t--pronote-ink: var(--color-${color});`), `pronote-c-${color}`);
		assert.ok(css.includes(`.pronote-bg-${color} {\n\t--pronote-highlight: var(--color-${color});`), `pronote-bg-${color}`);
	}
});

void test("richTag : liste blanche, équivalences, balises à jeter, reste déballé en texte", () => {
	for (const tag of ["p", "div", "br", "ul", "ol", "li", "strong", "em", "u", "a", "span"]) assert.equal(richTag(tag), tag);
	assert.equal(richTag("B"), "strong");
	assert.equal(richTag("i"), "em");
	assert.equal(richTag("H2"), "div");
	assert.equal(richTag("tr"), "div");
	assert.equal(richTag("blockquote"), "div");
	for (const tag of ["script", "style", "iframe", "object", "embed", "template", "noscript", "svg", "head", "title"]) {
		assert.equal(richTag(tag), "drop", tag);
	}
	for (const tag of ["img", "font", "table", "td", "sup", "form", "input", "button", "marquee", "inconnu", "constructor", "toString"]) {
		assert.equal(richTag(tag), "unwrap", tag);
	}
});
