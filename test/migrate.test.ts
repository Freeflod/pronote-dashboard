// Caractérisation de la reprise des réglages (versions 0.1, 0.2 et 3). Données fictives uniquement.
/// <reference types="node" />
import { test } from "node:test";
import assert from "node:assert/strict";
import { clampCacheMb, migrate } from "../src/migrate.ts";
import { AUTO_FLOOR_MIN, DEFAULT_INTERVAL_MIN } from "../src/refresh.ts";
import {
	CACHE_MAX_MB_DEFAULT,
	CACHE_MAX_MB_LIMIT,
	CACHE_MAX_MB_STEP,
	CACHE_TEXT_DAYS_DEFAULT,
	DEFAULT_REMINDERS,
	defaultData,
	OVERDUE_DAYS_DEFAULT,
	OVERDUE_DAYS_STEPS,
	type PluginData,
} from "../src/types.ts";

/** Valeur fictive pour un jeton de test : jamais un vrai jeton. */
const fauxJeton = (valeur: string): string => valeur;

/** Les identifiants de compte sont tirés au hasard : on les remplace pour comparer. */
function stable(d: PluginData): PluginData {
	return {
		...d,
		child: { ...d.child, id: "ID" },
		parents: d.parents.map((p, i) => ({ ...p, id: `P${i}` })),
		selectedParentId: d.selectedParentId ? "SELECTED" : "",
	};
}

void test("entrée absente ou invalide : valeurs par défaut", () => {
	for (const raw of [undefined, null, 42, "texte"]) {
		assert.deepEqual(stable(migrate(raw)), stable(defaultData()));
	}
});

void test("version 0.2 sans profil ni jeton : valeurs par défaut", () => {
	assert.deepEqual(stable(migrate({ profiles: [] })), stable(defaultData()));
	assert.deepEqual(stable(migrate({ syncFolder: "Ailleurs" })), stable(defaultData()));
});

void test("version 3 : reprise telle quelle, complétée par les valeurs par défaut", () => {
	const raw = {
		version: 3,
		mode: "parent",
		syncFolder: "École",
		display: { parent: { lessons: true } },
		child: { name: "Alice" },
		parents: [{ id: "p1", name: "Bob", token: fauxJeton("jeton-fictif") }],
		selectedParentId: "p1",
	};
	const d = migrate(raw);
	assert.equal(d.mode, "parent");
	assert.equal(d.syncFolder, "École");
	assert.deepEqual(d.display, {
		child: { homework: true, lessons: true, grades: true, resources: true, messages: true },
		parent: { homework: true, lessons: true, grades: true, resources: true, messages: true },
	});
	assert.equal(d.child.name, "Alice");
	assert.equal(d.child.kind, 6);
	assert.equal(d.child.cache, null);
	assert.equal(d.parents.length, 1);
	assert.equal(d.parents[0].id, "p1");
	assert.equal(d.parents[0].kind, 7);
	assert.equal(d.parents[0].token, "jeton-fictif");
	assert.deepEqual(d.parents[0].resources, []);
	assert.equal(d.selectedParentId, "p1");
	assert.deepEqual(d.fileIndex, {});
	assert.equal(d.weeksAhead, 3);
});

void test("version 3 : fileIndex conservé", () => {
	const d = migrate({ version: 3, fileIndex: { "a|b|c.pdf": "Pronote/c.pdf" } });
	assert.deepEqual(d.fileIndex, { "a|b|c.pdf": "Pronote/c.pdf" });
});

void test("version 0.1 (compte unique à plat) : devient un compte parent par défaut", () => {
	const d = migrate({
		url: "https://exemple.invalid/pronote",
		username: "utilisateur",
		token: fauxJeton("jeton-fictif"),
		syncFolder: "Cours",
		weeksAhead: 5,
	});
	assert.equal(d.mode, "parent");
	assert.equal(d.parents.length, 1);
	const p = d.parents[0];
	assert.equal(p.kind, 7);
	assert.equal(p.name, "");
	assert.equal(p.url, "https://exemple.invalid/pronote");
	assert.equal(p.token, "jeton-fictif");
	assert.equal(d.selectedParentId, p.id);
	assert.equal(d.syncFolder, "Cours");
	assert.equal(d.weeksAhead, 5);
	assert.equal(d.weeksBack, 2);
	assert.equal(d.child.token, "");
});

void test("version 0.2 (profils) : premier élève en mode Enfant, le reste en mode Parent", () => {
	const d = migrate({
		activeProfileId: "e1",
		profiles: [
			{ id: "e1", kind: 6, token: "t1", url: "u1", username: "n1", children: ["X"], childIndex: 0, downloadFiles: false },
			{ id: "e2", kind: 6, token: "t2", url: "u2", username: "n2" },
			{ id: "p1", kind: 7, token: "t3", url: "u3", username: "n3", children: ["Y", "Z"], childIndex: 1 },
		],
	});
	assert.equal(d.mode, "child");
	assert.equal(d.child.token, "t1");
	assert.deepEqual(d.child.resources, ["X"]);
	assert.equal(d.parents.length, 2);
	assert.equal(d.parents[0].token, "t2");
	assert.equal(d.parents[0].kind, 6);
	assert.equal(d.parents[1].token, "t3");
	assert.deepEqual(d.parents[1].resources, ["Y", "Z"]);
	assert.equal(d.parents[1].resourceIndex, 1);
	assert.equal(d.downloadFiles, false);
	assert.equal(d.syncFolder, "Pronote");
	assert.equal(d.selectedParentId, d.parents[0].id);
});

void test("version 0.2 : profil actif parent → mode Parent", () => {
	const d = migrate({
		activeProfileId: "p1",
		profiles: [
			{ id: "e1", kind: 6, token: "t1" },
			{ id: "p1", kind: 7, token: "t2" },
		],
	});
	assert.equal(d.mode, "parent");
});

void test("version 0.2 : profil actif introuvable → repli sur le premier profil", () => {
	const d = migrate({
		activeProfileId: "inconnu",
		profiles: [
			{ id: "p1", kind: 7, token: "t1" },
			{ id: "e1", kind: 6, token: "t2" },
		],
	});
	assert.equal(d.mode, "parent");
	assert.equal(d.child.token, "t2");
});

void test("version 0.2 : kind absent → parent ; kind 0 → corrigé en parent", () => {
	const d = migrate({ profiles: [{ id: "a", token: "t1" }, { id: "b", kind: 0, token: "t2" }] });
	assert.equal(d.mode, "parent");
	assert.deepEqual(d.parents.map((p) => p.kind), [7, 7]);
});

void test("version 0.2 : dossier vide → « Pronote »", () => {
	const d = migrate({ profiles: [{ kind: 6, token: "t", syncFolder: "" }] });
	assert.equal(d.syncFolder, "Pronote");
});

void test("profiles qui n'est pas une liste : lecture à plat si un jeton est présent", () => {
	const d = migrate({ profiles: "abîmé", token: "t", kind: 6 });
	assert.equal(d.mode, "child");
	assert.equal(d.child.token, "t");
	assert.equal(stable(migrate({ profiles: "abîmé" })).parents.length, 0);
});

void test("version 3 : compte enfant partiel complété par les valeurs par défaut", () => {
	const d = migrate({ version: 3, child: { token: "t" } });
	assert.equal(d.child.token, "t");
	assert.equal(d.child.kind, 6);
	assert.equal(d.child.name, "");
	assert.deepEqual(d.child.resources, []);
	assert.equal(typeof d.child.id, "string");
	assert.ok(d.child.id.length > 0);
});

void test("v3 devient v4 sans perdre les réglages", () => {
	const d = migrate({
		version: 3,
		mode: "parent",
		syncFolder: "École",
		weeksAhead: 5,
		noteProps: "a: b",
		child: { name: "Alice", token: fauxJeton("jeton-fictif") },
		parents: [{ id: "p1", name: "Bob" }],
		selectedParentId: "p1",
		fileIndex: { k: "v" },
	});
	assert.equal(d.version, 4);
	assert.equal(d.mode, "parent");
	assert.equal(d.syncFolder, "École");
	assert.equal(d.weeksAhead, 5);
	assert.equal(d.noteProps, "a: b");
	assert.equal(d.child.name, "Alice");
	assert.equal(d.child.token, "jeton-fictif");
	assert.equal(d.parents[0].id, "p1");
	assert.deepEqual(d.fileIndex, { k: "v" });
	assert.equal(d.cacheTextDays, CACHE_TEXT_DAYS_DEFAULT);
	assert.equal(d.cacheMaxMb, CACHE_MAX_MB_DEFAULT);
	assert.deepEqual(d.reminders, DEFAULT_REMINDERS);
});

void test("v4 : valeurs conservées, rappels propres conservés", () => {
	const reminders = [{ subject: "Musique", text: "Flûte" }];
	const d = migrate({ version: 4, cacheTextDays: 10, cacheMaxMb: 100, reminders });
	assert.equal(d.version, 4);
	assert.equal(d.cacheTextDays, 10);
	assert.equal(d.cacheMaxMb, 100);
	assert.deepEqual(d.reminders, reminders);
});

void test("valeurs hors bornes ramenées et arrondies au palier de 50", () => {
	assert.equal(migrate({ version: 3, cacheMaxMb: 9999 }).cacheMaxMb, CACHE_MAX_MB_LIMIT);
	assert.equal(migrate({ version: 3, cacheMaxMb: -5 }).cacheMaxMb, 0);
	assert.equal(migrate({ version: 3, cacheMaxMb: 74 }).cacheMaxMb, CACHE_MAX_MB_STEP);
	assert.equal(migrate({ version: 3, cacheMaxMb: 75 }).cacheMaxMb, 100);
	assert.equal(migrate({ version: 3, cacheMaxMb: 0 }).cacheMaxMb, 0);
	assert.equal(migrate({ version: 3, cacheTextDays: 0 }).cacheTextDays, 1);
	assert.equal(migrate({ version: 3, cacheTextDays: -3 }).cacheTextDays, 1);
	assert.equal(migrate({ version: 3, cacheTextDays: 2.6 }).cacheTextDays, 3);
	assert.equal(migrate({ version: 3, cacheTextDays: Number.NaN }).cacheTextDays, CACHE_TEXT_DAYS_DEFAULT);
});

void test("clampCacheMb : bornes, palier, NaN", () => {
	assert.equal(clampCacheMb(Number.NaN), CACHE_MAX_MB_DEFAULT);
	assert.equal(clampCacheMb(-1), 0);
	assert.equal(clampCacheMb(24), 0);
	assert.equal(clampCacheMb(26), 50);
	assert.equal(clampCacheMb(200), 200);
	assert.equal(clampCacheMb(201), 200);
	assert.equal(clampCacheMb(Infinity), 200);
});

void test("PD-011 : notifyNew absent = vrai ; faux conservé ; valeur illisible = vrai", () => {
	assert.equal(defaultData().notifyNew, true);
	assert.equal(migrate({ version: 4 }).notifyNew, true);
	assert.equal(migrate({ version: 4, notifyNew: false }).notifyNew, false);
	assert.equal(migrate({ version: 4, notifyNew: "non" }).notifyNew, true);
});

void test("PD-011 : staleMinutes repris par normalizeIntervalMin (0 = jamais, plancher, défaut)", () => {
	assert.equal(migrate({ version: 4 }).staleMinutes, DEFAULT_INTERVAL_MIN);
	assert.equal(migrate({ version: 4, staleMinutes: 0 }).staleMinutes, 0);
	assert.equal(migrate({ version: 4, staleMinutes: 5 }).staleMinutes, AUTO_FLOOR_MIN);
	assert.equal(migrate({ version: 4, staleMinutes: 120 }).staleMinutes, 120);
	assert.equal(migrate({ version: 4, staleMinutes: "x" }).staleMinutes, DEFAULT_INTERVAL_MIN);
	assert.equal(migrate({ profiles: [{ kind: 6, token: "t", staleMinutes: 3 }] }).staleMinutes, AUTO_FLOOR_MIN);
});

void test("PD-012 : overdueDays absent = 7 ; palier conservé ; hors palier ramené au plus proche (égalité : le plus grand)", () => {
	assert.equal(defaultData().overdueDays, OVERDUE_DAYS_DEFAULT);
	assert.equal(migrate({ version: 4 }).overdueDays, OVERDUE_DAYS_DEFAULT);
	for (const n of OVERDUE_DAYS_STEPS) assert.equal(migrate({ version: 4, overdueDays: n }).overdueDays, n);
	assert.equal(migrate({ version: 4, overdueDays: 4 }).overdueDays, 3);
	assert.equal(migrate({ version: 4, overdueDays: 5 }).overdueDays, 7);
	assert.equal(migrate({ version: 4, overdueDays: 30 }).overdueDays, 7);
	assert.equal(migrate({ version: 4, overdueDays: -2 }).overdueDays, 0);
	assert.equal(migrate({ version: 4, overdueDays: "x" }).overdueDays, OVERDUE_DAYS_DEFAULT);
	assert.equal(migrate({ profiles: [{ kind: 6, token: "t" }] }).overdueDays, OVERDUE_DAYS_DEFAULT);
});
