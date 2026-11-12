// Contrat : seule l'ouverture explicite d'un message le marque comme lu. Données fictives.
/// <reference types="node" />
import { test } from "node:test";
import assert from "node:assert/strict";
import { messageOptions } from "../src/message-options.ts";

void test("ouverture explicite : marque comme lu", () => {
	assert.equal(messageOptions("open").markAsRead, true);
});

void test("tout autre appel : markAsRead false, explicite", () => {
	const o = messageOptions("peek");
	assert.equal(o.markAsRead, false);
	assert.ok("markAsRead" in o);
});
