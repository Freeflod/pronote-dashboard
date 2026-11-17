// Correctif local de Pawnote-LTS (PD-007) : un compte parent doit désigner l'élève (« membre ») dans chaque demande.
/// <reference types="node" />
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInThisContext } from "node:vm";
import { REPLACE, patchPawnote } from "../scripts/pawnote-patch.ts";

const DIST = new URL("../node_modules/@blockshub/pawnote-lts/dist/index.mjs", import.meta.url);

interface FakeSession {
	information: { accountKind: number };
	userResource?: { id: string };
}
type RequestData = Record<string, unknown> | undefined;
type RequestClass = new (session: FakeSession, name: string, data: RequestData) => { data: RequestData };
type ApiProperties = (session: FakeSession) => { signature: string };

/**
 * Exécute le constructeur de requête tel que le correctif l'écrit dans Pawnote-LTS. `ne` (propriétés
 * d'API selon la version du serveur) est simulé : la signature s'appelle « Signature ».
 */
function isFactory(v: unknown): v is (ne: ApiProperties) => RequestClass {
	return typeof v === "function";
}

function patchedRequestClass(): RequestClass {
	// Même contexte que le test : un autre contexte produirait des objets de prototype différent (deepEqual échouerait).
	const factory: unknown = runInThisContext(`(function (ne) { let ae; ${REPLACE}}; return ae; })`);
	if (!isFactory(factory)) throw new Error("Le correctif Pawnote-LTS ne produit pas un constructeur de requête.");
	return factory(() => ({ signature: "Signature" }));
}

const Request = patchedRequestClass();
const parent = (id?: string): FakeSession => ({ information: { accountKind: 7 }, userResource: id ? { id } : undefined });
const signature = (data: RequestData): unknown => (data ? data.Signature : undefined);

void test("compte parent : l'élève est désigné dans la signature", () => {
	const r = new Request(parent("ELEVE-FICTIF"), "PageCahierDeTexte", { Signature: { onglet: 88 }, data: {} });
	assert.deepEqual(signature(r.data), { onglet: 88, membre: { N: "ELEVE-FICTIF", G: 4 } });
});

void test("compte élève : signature inchangée", () => {
	const session: FakeSession = { information: { accountKind: 6 }, userResource: { id: "ELEVE-FICTIF" } };
	const r = new Request(session, "PageCahierDeTexte", { Signature: { onglet: 88 } });
	assert.deepEqual(signature(r.data), { onglet: 88 });
});

void test("compte parent sans élève choisi (pendant la connexion) : signature inchangée", () => {
	const r = new Request(parent(), "PageCahierDeTexte", { Signature: { onglet: 88 } });
	assert.deepEqual(signature(r.data), { onglet: 88 });
});

void test("membre déjà présent : jamais écrasé", () => {
	const r = new Request(parent("ELEVE-FICTIF"), "X", { Signature: { onglet: 88, membre: { N: "AUTRE", G: 4 } } });
	assert.deepEqual(signature(r.data), { onglet: 88, membre: { N: "AUTRE", G: 4 } });
});

void test("demande sans onglet ou sans données : rien n'est ajouté, aucune erreur", () => {
	assert.deepEqual(signature(new Request(parent("E"), "Identification", { Signature: {} }).data), {});
	assert.deepEqual(new Request(parent("E"), "Identification", { data: {} }).data, { data: {} });
	assert.equal(new Request(parent("E"), "FonctionParametres", undefined).data, undefined);
});

void test("le correctif s'applique une fois à la version installée de Pawnote-LTS", () => {
	const source = readFileSync(DIST, "utf8");
	const patched = patchPawnote(source);
	assert.equal(patched.split(REPLACE).length, 2);
});

void test("le correctif refuse une source où le motif attendu manque (version de Pawnote-LTS changée)", () => {
	assert.throws(() => patchPawnote("ae=class{constructor(a,b,c){}}"), /motif attendu introuvable/);
});

void test("le correctif refuse une source où le motif apparaît plusieurs fois", () => {
	const source = readFileSync(DIST, "utf8");
	assert.throws(() => patchPawnote(source + source), /motif attendu introuvable/);
});
