// Avatar de l'enfant : initiale, couleur, lecture de la photo dans la réponse Pronote, décision de cache.
// Données fictives (prénoms inventés, images factices).
/// <reference types="node" />
import { test } from "node:test";
import assert from "node:assert/strict";
import {
	AVATAR_COLORS,
	AVATAR_FALLBACK_INITIAL,
	AVATAR_KEEP_DAYS,
	USER_PARAMETERS_ID,
	avatarCacheKey,
	avatarCachePlan,
	avatarColor,
	avatarDataUri,
	avatarInitial,
	avatarUsable,
	imageMime,
	photosFromResponse,
	studentPhotos,
} from "../src/avatar.ts";

const DAY = 24 * 3600 * 1000;
/** Débuts de fichiers factices : signature JPEG et signature PNG en base64, sans image réelle derrière. */
const JPEG = "/9j/4AAQSkZJRgABAQAA";
const JPEG_2 = "/9j/4AAQSkZJRgABAQBB";
const PNG = "iVBORw0KGgoAAAANSUhEUgAA";

function response(dataSec: unknown, fichiers?: unknown): string {
	return JSON.stringify({ id: USER_PARAMETERS_ID, session: 1, no: "x", dataSec, ...(fichiers === undefined ? {} : { dataNonSec: { fichiers } }) });
}

void test("avatarInitial : première lettre du prénom, en capitale, accent gardé", () => {
	assert.equal(avatarInitial("DURAND Élodie"), "É");
	assert.equal(avatarInitial("MARTIN zoé"), "Z");
	assert.equal(avatarInitial("élodie"), "É");
	assert.equal(avatarInitial("  LEROY  Jean Pierre "), "J");
});

void test("avatarInitial : vide, un seul caractère, nom sans prénom", () => {
	assert.equal(avatarInitial(""), AVATAR_FALLBACK_INITIAL);
	assert.equal(avatarInitial("   "), AVATAR_FALLBACK_INITIAL);
	assert.equal(avatarInitial("z"), "Z");
	assert.equal(avatarInitial("MARTIN"), "M");
});

void test("avatarInitial : un caractère hors du plan de base n'est pas coupé en deux", () => {
	assert.equal(avatarInitial("𝒜lix"), "𝒜");
});

void test("avatarColor : parmi les couleurs prévues, stable, insensible aux espaces autour", () => {
	const color = avatarColor("DURAND Élodie");
	assert.ok(AVATAR_COLORS.includes(color));
	assert.equal(avatarColor("DURAND Élodie"), color);
	assert.equal(avatarColor("  DURAND Élodie "), color);
	assert.ok(AVATAR_COLORS.includes(avatarColor("")));
});

void test("avatarColor : des prénoms différents ne tombent pas tous sur la même couleur", () => {
	const names = ["MARTIN Zoé", "DURAND Élodie", "LEROY Jean", "PETIT Noa", "MOREAU Inès", "ROUX Tom"];
	assert.ok(new Set(names.map(avatarColor)).size > 1);
});

void test("avatarCacheKey : sous la clé de l'onglet, donc effacée avec le compte", () => {
	assert.ok(avatarCacheKey("compte:MARTIN Zoé").startsWith("compte:"));
	assert.notEqual(avatarCacheKey("compte:MARTIN Zoé"), avatarCacheKey("compte:DURAND Élodie"));
});

void test("imageMime : JPEG et PNG reconnus à leur signature, le reste refusé", () => {
	assert.equal(imageMime(JPEG), "image/jpeg");
	assert.equal(imageMime(PNG), "image/png");
	assert.equal(imageMime("PHN2ZyB4bWxucz0i"), undefined);
	assert.equal(imageMime(`${JPEG}"><script>`), undefined);
	assert.equal(imageMime(""), undefined);
});

void test("avatarDataUri : adresse data: pour une image reconnue, rien sinon", () => {
	assert.equal(avatarDataUri(JPEG), `data:image/jpeg;base64,${JPEG}`);
	assert.equal(avatarDataUri("PHN2ZyB4bWxucz0i"), undefined);
});

void test("photosFromResponse : compte élève, la photo est dans les fichiers de la réponse", () => {
	const text = response({ data: { ressource: { N: "id-zoe", L: "MARTIN Zoé", avecPhoto: true, photoBase64: { _T: 25, V: 0 } } } }, [JPEG]);
	const capture = photosFromResponse(text);
	assert.deepEqual(studentPhotos(capture, [{ id: "id-zoe", name: "MARTIN Zoé", hasPhoto: true }]), [{ name: "MARTIN Zoé", photo: JPEG }]);
});

void test("photosFromResponse : Pronote coupe le base64 en lignes, la photo est rendue sans les retours", () => {
	const wrapped = `${JPEG.slice(0, 8)}\r\n${JPEG.slice(8)}\r\n`;
	const text = response({ data: { ressource: { N: "id-zoe", photoBase64: { _T: 25, V: 0 } } } }, [wrapped]);
	assert.deepEqual(studentPhotos(photosFromResponse(text), [{ id: "id-zoe", name: "MARTIN Zoé", hasPhoto: true }]), [{ name: "MARTIN Zoé", photo: JPEG }]);
});

void test("photosFromResponse : compte parent, chaque enfant reçoit sa photo, pas celle du voisin", () => {
	const text = response(
		{
			data: {
				ressource: {
					N: "id-parent",
					listeRessources: [
						{ N: "id-zoe", avecPhoto: true, photoBase64: { _T: 25, V: 1 } },
						{ N: "id-tom", avecPhoto: false },
						{ N: "id-elodie", avecPhoto: true, photoBase64: { _T: 25, V: 0 } },
					],
				},
			},
		},
		[JPEG, JPEG_2],
	);
	const students = [
		{ id: "id-zoe", name: "MARTIN Zoé", hasPhoto: true },
		{ id: "id-tom", name: "MARTIN Tom", hasPhoto: false },
		{ id: "id-elodie", name: "MARTIN Élodie", hasPhoto: true },
	];
	assert.deepEqual(studentPhotos(photosFromResponse(text), students), [
		{ name: "MARTIN Zoé", photo: JPEG_2 },
		{ name: "MARTIN Tom", photo: null },
		{ name: "MARTIN Élodie", photo: JPEG },
	]);
});

void test("photosFromResponse : un fichier illisible ou absent est « inconnu » (le cache n'est pas effacé), pas « pas de photo »", () => {
	const zoe = [{ id: "id-zoe", name: "MARTIN Zoé", hasPhoto: true }];
	const sec = { data: { ressource: { N: "id-zoe", photoBase64: { _T: 25, V: 0 } } } };
	assert.deepEqual(studentPhotos(photosFromResponse(response(sec, ["PHN2ZyB4bWxucz0i"])), zoe), [{ name: "MARTIN Zoé", photo: undefined }]);
	assert.deepEqual(studentPhotos(photosFromResponse(response(sec, [])), zoe), [{ name: "MARTIN Zoé", photo: undefined }]);
});

void test("photosFromResponse : un élève sans photo désignée est « pas de photo »", () => {
	const text = response({ data: { ressource: { N: "id-zoe" } } }, [JPEG]);
	assert.deepEqual(studentPhotos(photosFromResponse(text), [{ id: "id-zoe", name: "MARTIN Zoé", hasPhoto: false }]), [{ name: "MARTIN Zoé", photo: null }]);
});

void test("photosFromResponse : autre réponse, texte illisible ou forme inattendue = rien de connu", () => {
	const students = [{ id: "id-zoe", name: "MARTIN Zoé", hasPhoto: true }];
	const unknown = [{ name: "MARTIN Zoé", photo: undefined }];
	assert.equal(photosFromResponse("pas du JSON"), undefined);
	assert.equal(photosFromResponse(JSON.stringify({ id: "PageAccueil", dataNonSec: { fichiers: [JPEG] } })), undefined);
	assert.equal(photosFromResponse("[1,2]"), undefined);
	assert.deepEqual(studentPhotos(undefined, students), unknown);
});

void test("photosFromResponse : partie sécurisée chiffrée, le n-ième élève avec photo reçoit le n-ième fichier", () => {
	const one = photosFromResponse(response("A1B2C3", [JPEG]));
	assert.deepEqual(studentPhotos(one, [{ id: "id-zoe", name: "MARTIN Zoé", hasPhoto: true }]), [{ name: "MARTIN Zoé", photo: JPEG }]);
	const two = photosFromResponse(response("A1B2C3", [JPEG, JPEG_2]));
	const students = [
		{ id: "id-zoe", name: "MARTIN Zoé", hasPhoto: true },
		{ id: "id-hugo", name: "MARTIN Hugo", hasPhoto: false },
		{ id: "id-elodie", name: "MARTIN Élodie", hasPhoto: true },
	];
	assert.deepEqual(studentPhotos(two, students), [
		{ name: "MARTIN Zoé", photo: JPEG },
		{ name: "MARTIN Hugo", photo: null },
		{ name: "MARTIN Élodie", photo: JPEG_2 },
	]);
	// moins de fichiers que d'élèves avec photo : le dernier est « inconnu »
	assert.deepEqual(studentPhotos(one, students).map((s) => s.photo), [JPEG, null, undefined]);
});

void test("avatarCachePlan : sans nouvelle de Pronote on garde ; absente du cache, la photo reçue est écrite", () => {
	const now = Date.UTC(2026, 10, 16);
	const cached = { size: 100, storedAt: now };
	assert.equal(avatarCachePlan(cached, undefined, now, true), "keep");
	assert.equal(avatarCachePlan(undefined, undefined, now, false), "keep");
	assert.equal(avatarCachePlan(undefined, null, now, true), "keep");
	assert.equal(avatarCachePlan(undefined, { size: 100 }, now, false), "store");
});

void test("avatarCachePlan : la photo gardée ne change qu'à la reconnexion par QR code (ou après un an)", () => {
	const now = Date.UTC(2026, 10, 16);
	const cached = { size: 100, storedAt: now - 30 * DAY };
	assert.equal(avatarCachePlan(cached, { size: 120 }, now, false), "keep");
	assert.equal(avatarCachePlan(cached, null, now, false), "keep");
	assert.equal(avatarCachePlan(cached, { size: 120 }, now, true), "store");
	assert.equal(avatarCachePlan(cached, null, now, true), "delete");
	const old = { size: 100, storedAt: now - AVATAR_KEEP_DAYS * DAY - 1 };
	assert.equal(avatarCachePlan(old, { size: 100 }, now, false), "store");
	assert.equal(avatarCachePlan(old, null, now, false), "delete");
});

void test("avatarUsable : affichée tant que la durée de conservation n'est pas dépassée", () => {
	const now = Date.UTC(2026, 10, 16);
	assert.equal(avatarUsable(undefined, 30, now), false);
	assert.equal(avatarUsable({ storedAt: now - 30 * DAY }, 30, now), true);
	assert.equal(avatarUsable({ storedAt: now - 31 * DAY }, 30, now), false);
});
