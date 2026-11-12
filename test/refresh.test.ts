// Actualisation automatique espacée (PD-011) : intervalle, plancher, attente du bouton, échecs, nouveauté. Données fictives.
/// <reference types="node" />
import { test } from "node:test";
import assert from "node:assert/strict";
import {
	AUTO_FLOOR_MIN,
	DEFAULT_INTERVAL_MIN,
	MANUAL_COOLDOWN_MS,
	MAX_FAILURES,
	isFresh,
	manualWaitMs,
	newSince,
	nextFailureState,
	normalizeIntervalMin,
	notificationText,
	shouldFetch,
	snapshotOf,
} from "../src/refresh.ts";
import { homeworkKey } from "../src/keys.ts";

const MIN = 60_000;

void test("constantes de PD-011", () => {
	assert.equal(AUTO_FLOOR_MIN, 15);
	assert.equal(DEFAULT_INTERVAL_MIN, 30);
	assert.equal(MANUAL_COOLDOWN_MS, 120_000);
	assert.equal(MAX_FAILURES, 3);
});

void test("normalizeIntervalMin : 0 = jamais, plancher, entier, valeur illisible = défaut", () => {
	assert.equal(normalizeIntervalMin(0), 0);
	assert.equal(normalizeIntervalMin(-5), 0);
	assert.equal(normalizeIntervalMin(1), AUTO_FLOOR_MIN);
	assert.equal(normalizeIntervalMin(14), AUTO_FLOOR_MIN);
	assert.equal(normalizeIntervalMin(0.4), AUTO_FLOOR_MIN);
	assert.equal(normalizeIntervalMin(15), 15);
	assert.equal(normalizeIntervalMin(60), 60);
	assert.equal(normalizeIntervalMin(45.6), 46);
	assert.equal(normalizeIntervalMin(Number.NaN), DEFAULT_INTERVAL_MIN);
	assert.equal(normalizeIntervalMin(Number.POSITIVE_INFINITY), DEFAULT_INTERVAL_MIN);
});

void test("isFresh : plus récent que l'intervalle, la limite exacte est périmée ; 0 = jamais d'actualisation, donc toujours frais", () => {
	const now = 10_000_000;
	assert.equal(isFresh(now - 29 * MIN, now, 30), true);
	assert.equal(isFresh(now - 30 * MIN, now, 30), false);
	assert.equal(isFresh(now - 31 * MIN, now, 30), false);
	assert.equal(isFresh(now + MIN, now, 30), true);
	assert.equal(isFresh(now - 1000 * MIN, now, 0), true);
});

void test("shouldFetch : force ou donnée absente ou périmée = on redemande ; donnée fraîche = non", () => {
	const now = 10_000_000;
	assert.equal(shouldFetch(undefined, now, 30, false), true);
	assert.equal(shouldFetch(now - MIN, now, 30, false), false);
	assert.equal(shouldFetch(now - 40 * MIN, now, 30, false), true);
	assert.equal(shouldFetch(now - MIN, now, 30, true), true);
	assert.equal(shouldFetch(now - MIN, now, 0, false), false);
	assert.equal(shouldFetch(undefined, now, 0, false), true);
});

void test("manualWaitMs : reste d'attente, 0 si libre, jamais plus que le délai (horloge reculée)", () => {
	const now = 5_000_000;
	assert.equal(manualWaitMs(0, now), 0);
	assert.equal(manualWaitMs(now, now), MANUAL_COOLDOWN_MS);
	assert.equal(manualWaitMs(now - 30_000, now), MANUAL_COOLDOWN_MS - 30_000);
	assert.equal(manualWaitMs(now - MANUAL_COOLDOWN_MS, now), 0);
	assert.equal(manualWaitMs(now - MANUAL_COOLDOWN_MS - 1, now), 0);
	assert.equal(manualWaitMs(now + 10 * MIN, now), MANUAL_COOLDOWN_MS);
});

void test("nextFailureState : pause au 3e échec de suite, remise à zéro sur un succès", () => {
	let s = { failures: 0, paused: false };
	s = nextFailureState(s, false);
	assert.deepEqual(s, { failures: 1, paused: false });
	s = nextFailureState(s, false);
	assert.deepEqual(s, { failures: 2, paused: false });
	s = nextFailureState(s, true);
	assert.deepEqual(s, { failures: 0, paused: false });
	s = nextFailureState(nextFailureState(nextFailureState(s, false), false), false);
	assert.deepEqual(s, { failures: MAX_FAILURES, paused: true });
	assert.deepEqual(nextFailureState(s, false), { failures: MAX_FAILURES + 1, paused: true });
	assert.deepEqual(nextFailureState(s, true), { failures: 0, paused: false });
});

void test("snapshotOf : messages non lus additionnés ; devoirs identifiés par homeworkKey, jamais par l'identifiant Pronote", () => {
	const hw = { id: "ID-A", subject: "Maths", deadline: "2026-11-12T08:00:00.000Z" };
	const snap = snapshotOf([hw], [{ numberOfMessagesUnread: 2 }, { numberOfMessagesUnread: 0 }, { numberOfMessagesUnread: 1 }]);
	assert.equal(snap.unreadMessages, 3);
	assert.deepEqual(snap.homeworkIds, [homeworkKey(hw)]);
});

void test("newSince : nouveaux messages non lus et nouveaux devoirs, jamais de négatif", () => {
	const before = { unreadMessages: 1, homeworkIds: ["devoir|a", "devoir|b"] };
	assert.deepEqual(newSince(before, before), { newMessages: 0, newHomework: 0 });
	assert.deepEqual(newSince(before, { unreadMessages: 3, homeworkIds: ["devoir|a", "devoir|b", "devoir|c"] }), {
		newMessages: 2,
		newHomework: 1,
	});
	assert.deepEqual(newSince(before, { unreadMessages: 0, homeworkIds: ["devoir|a"] }), { newMessages: 0, newHomework: 0 });
});

void test("newSince : doublons comptés une fois", () => {
	const before = { unreadMessages: 0, homeworkIds: ["devoir|a"] };
	const after = { unreadMessages: 0, homeworkIds: ["devoir|a", "devoir|c", "devoir|c"] };
	assert.equal(newSince(before, after).newHomework, 1);
});

void test("notificationText : français, accord au pluriel, rien si rien de nouveau", () => {
	assert.equal(notificationText({ newMessages: 0, newHomework: 0 }), "");
	assert.equal(notificationText({ newMessages: 1, newHomework: 0 }), "1 nouveau message non lu");
	assert.equal(notificationText({ newMessages: 3, newHomework: 0 }), "3 nouveaux messages non lus");
	assert.equal(notificationText({ newMessages: 0, newHomework: 1 }), "1 nouveau devoir");
	assert.equal(notificationText({ newMessages: 0, newHomework: 2 }), "2 nouveaux devoirs");
	assert.equal(
		notificationText({ newMessages: 1, newHomework: 2 }),
		"1 nouveau message non lu et 2 nouveaux devoirs",
	);
});
