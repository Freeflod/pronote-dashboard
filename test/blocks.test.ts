// Logique pure des blocs de l'écran. Données fictives ; « aujourd'hui » toujours passé en paramètre.
/// <reference types="node" />
import { test } from "node:test";
import assert from "node:assert/strict";
import {
	bagFor,
	groupHomework,
	isOverdue,
	nextSchoolDay,
	reminderFor,
	tabsOf,
	toggleOutcome,
	upcomingTests,
} from "../src/blocks.ts";
import { OVERDUE_DAYS_DEFAULT, OVERDUE_DAYS_STEPS, type Account, type HomeworkDTO } from "../src/types.ts";

function hw(id: string, subject: string, deadline: string, done = false): HomeworkDTO {
	return { id, subject, color: "#000", description: "", deadline, done, attachments: [] };
}
function lesson(subject: string, start: string, extra: { canceled?: boolean; test?: boolean } = {}) {
	return { id: `${subject}${start}`, subject, color: "#000", start, teachers: [], contents: [], ...extra };
}

void test("isOverdue : échu non fait = en retard ; fait ou à venir = non", () => {
	assert.equal(isOverdue(hw("1", "Maths", "2026-11-05T00:00:00"), "2026-11-06"), true);
	assert.equal(isOverdue(hw("2", "Maths", "2026-11-05T00:00:00", true), "2026-11-06"), false);
	assert.equal(isOverdue(hw("3", "Maths", "2026-11-06T00:00:00"), "2026-11-06"), false);
});

void test("groupHomework : par jour puis matière, échu fait absent, échu non fait en retard", () => {
	const groups = groupHomework(
		[
			hw("a", "Maths", "2026-11-09T08:00:00"),
			hw("b", "Anglais", "2026-11-09T08:00:00"),
			hw("c", "Maths", "2026-11-09T08:00:00"),
			hw("d", "EPS", "2026-11-04T08:00:00"),
			hw("e", "EPS", "2026-11-03T08:00:00", true),
			hw("f", "Maths", "2026-11-12T08:00:00", true),
		],
		"2026-11-06",
		OVERDUE_DAYS_DEFAULT,
	);
	assert.deepEqual(groups.map((g) => [g.day, g.overdue]), [
		["2026-11-04", true],
		["2026-11-09", false],
		["2026-11-12", false],
	]);
	assert.deepEqual(groups[1]?.subjects.map((s) => [s.subject, s.items.length]), [["Anglais", 1], ["Maths", 2]]);
});

void test("groupHomework : minuit, la date passée en paramètre décide", () => {
	const items = [hw("a", "Maths", "2026-11-06T08:00:00")];
	assert.equal(groupHomework(items, "2026-11-06", OVERDUE_DAYS_DEFAULT)[0]?.overdue, false);
	assert.equal(groupHomework(items, "2026-11-07", OVERDUE_DAYS_DEFAULT)[0]?.overdue, true);
});

void test("nextSchoolDay : vendredi, demain sans cours, prochain jour avec cours (lundi)", () => {
	const lessons = [
		lesson("Maths", "2026-11-06T08:00:00"),
		lesson("Maths", "2026-11-09T08:00:00"),
		lesson("EPS", "2026-11-10T08:00:00"),
	];
	assert.equal(nextSchoolDay(lessons, "2026-11-06"), "2026-11-09");
	assert.equal(nextSchoolDay(lessons, "2026-11-09"), "2026-11-10");
	assert.equal(nextSchoolDay(lessons, "2026-11-10"), null);
});

void test("nextSchoolDay : un jour où tout est annulé n'est pas un jour de cours", () => {
	const lessons = [
		lesson("Maths", "2026-11-09T08:00:00", { canceled: true }),
		lesson("EPS", "2026-11-10T08:00:00"),
	];
	assert.equal(nextSchoolDay(lessons, "2026-11-06"), "2026-11-10");
});

void test("bagFor : une pastille par matière, annulé si tous les cours le sont", () => {
	const lessons = [
		lesson("Maths", "2026-11-09T08:00:00"),
		lesson("Maths", "2026-11-09T10:00:00"),
		lesson("EPS", "2026-11-09T14:00:00", { canceled: true }),
		lesson("Anglais", "2026-11-10T08:00:00"),
	];
	assert.deepEqual(bagFor(lessons, "2026-11-09"), [
		{ subject: "Maths", canceled: false },
		{ subject: "EPS", canceled: true },
	]);
});

void test("reminderFor : rappel EPS trouvé sans casse ni accents ; sans règle, aucun rappel", () => {
	const reminders = [{ subject: "EPS", text: "pense à ton sac de sport" }, { subject: "Éducation musicale", text: "flûte" }];
	assert.deepEqual(reminderFor("eps", reminders), reminders[0]);
	assert.deepEqual(reminderFor("  EDUCATION MUSICALE ", reminders), reminders[1]);
	assert.equal(reminderFor("Maths", reminders), undefined);
});

void test("upcomingTests : contrôles à venir, non annulés, inDays calculé", () => {
	const lessons = [
		lesson("Maths", "2026-11-13T08:00:00", { test: true }),
		lesson("Histoire", "2026-11-06T08:00:00", { test: true }),
		lesson("SVT", "2026-11-04T08:00:00", { test: true }),
		lesson("EPS", "2026-11-10T08:00:00", { test: true, canceled: true }),
		lesson("Anglais", "2026-11-10T08:00:00"),
	];
	assert.deepEqual(upcomingTests(lessons, "2026-11-06"), [
		{ subject: "Histoire", inDays: 0 },
		{ subject: "Maths", inDays: 7 },
	]);
});

void test("tabsOf : un parent à deux élèves = deux onglets, clés distinctes", () => {
	const base = { name: "", kind: 7, url: "", username: "", token: "", navigatorIdentifier: "", deviceUUID: "", resourceIndex: 0, cache: null };
	const accounts: Account[] = [
		{ ...base, id: "p1", resources: ["Léa", "Tom"] },
		{ ...base, id: "e1", kind: 6, name: "Zoé", resources: ["Zoé"] },
	];
	const tabs = tabsOf(accounts);
	assert.deepEqual(tabs, [
		{ key: "p1:Léa", label: "Léa" },
		{ key: "p1:Tom", label: "Tom" },
		{ key: "e1:Zoé", label: "Zoé" },
	]);
	assert.equal(new Set(tabs.map((t) => t.key)).size, 3);
});

void test("toggleOutcome : hors ligne et parent désactivés ; échec = retour arrière + message", () => {
	assert.equal(toggleOutcome(false, "child", "pending").enabled, false);
	assert.equal(toggleOutcome(true, "parent", "pending").enabled, false);
	assert.deepEqual(toggleOutcome(true, "child", "pending"), { enabled: true, rollback: false });
	assert.deepEqual(toggleOutcome(true, "child", "ok"), { enabled: true, rollback: false });
	const failed = toggleOutcome(true, "child", "error");
	assert.equal(failed.rollback, true);
	assert.ok(failed.message);
});

void test("PD-012 : un devoir non fait échu depuis exactement N jours est conservé, depuis N+1 jours non", () => {
	const today = "2026-11-12";
	for (const n of OVERDUE_DAYS_STEPS) {
		const deadline = (ago: number) => `2026-11-${String(12 - ago).padStart(2, "0")}T08:00:00`;
		const kept = groupHomework([hw("a", "Maths", deadline(n))], today, n);
		const dropped = groupHomework([hw("b", "Maths", deadline(n + 1))], today, n);
		if (n === 0) assert.equal(kept.length, 1, "échéance aujourd'hui : pas en retard, mais présent");
		else assert.deepEqual(kept.map((g) => g.overdue), [true], `échu depuis ${n} j avec ${n}`);
		assert.deepEqual(dropped, [], `échu depuis ${n + 1} j avec ${n}`);
	}
});

void test("PD-012 : 0 jour = aucun retard ; un devoir fait échu reste absent quelle que soit la durée", () => {
	const today = "2026-11-12";
	assert.deepEqual(groupHomework([hw("a", "Maths", "2026-11-11T08:00:00")], today, 0), []);
	assert.equal(groupHomework([hw("a", "Maths", "2026-11-11T08:00:00")], today, 1)[0]?.overdue, true);
	for (const n of OVERDUE_DAYS_STEPS) assert.deepEqual(groupHomework([hw("a", "Maths", "2026-11-11T08:00:00", true)], today, n), []);
});

void test("PD-012 : le calcul des jours traverse un changement de mois", () => {
	assert.equal(groupHomework([hw("a", "Maths", "2026-10-30T08:00:00")], "2026-11-02", 3)[0]?.overdue, true);
	assert.deepEqual(groupHomework([hw("a", "Maths", "2026-10-30T08:00:00")], "2026-11-02", 1), []);
});

void test("PD-012 : les devoirs d'aujourd'hui et à venir ne dépendent pas de la durée", () => {
	const items = [hw("a", "Maths", "2026-11-12T08:00:00"), hw("b", "Maths", "2026-11-20T08:00:00")];
	for (const n of OVERDUE_DAYS_STEPS) assert.equal(groupHomework(items, "2026-11-12", n).length, 2);
});
