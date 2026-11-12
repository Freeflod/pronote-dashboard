// Écran Pronote : un ItemView qui compose les blocs (devoirs, cartable, rappels, emploi du temps,
// contrôles, séances, ressources, messages). Règles métier : blocks.ts ; états et repli : ui/block.ts ;
// lecture et cache : Repository. Ici, seulement la composition et le câblage.
import { ItemView, setIcon, type WorkspaceLeaf } from "obsidian";
import type PronotePlugin from "../main";
import {
	bagFor,
	coursesOn,
	groupHomework,
	mergeResults,
	nextSchoolDay,
	reminderFor,
	tabsOf,
	upcomingTests,
	type BagItem,
	type DayGroup,
	type LessonInput,
	type SubjectGroup,
	type Tab,
	type UpcomingTest,
} from "./blocks.ts";
import type { DiscussionDTO, MessageDTO, TimetableEntryDTO } from "./client.ts";
import type { BlockSpec, RefreshOutcome, TabTask } from "./data/repository.ts";
import {
	MAX_FAILURES,
	isFresh,
	manualWaitMs,
	newSince,
	notificationText,
	snapshotOf,
} from "./refresh.ts";
import type { BlockState } from "./data/block-state.ts";
import type { HomeworkDTO, LessonDTO, ResultsDTO } from "./types.ts";
import { frDate, isoDay, startOfToday } from "./util.ts";
import { homeworkKey } from "./keys.ts";
import { renderAttachment } from "./ui/attachment.ts";
import { renderRichParagraph } from "./ui/rich-text.ts";
import { expandBlock, renderBlock, type BlockOptions } from "./ui/block.ts";
import { renderDisclosure, type DisclosureOptions } from "./ui/disclosure.ts";
import { renderDoneBox } from "./ui/done-box.ts";
import {
	addDays,
	combineStates,
	dayTitle,
	inDaysLabel,
	lastSeen,
	mapState,
	nextDay,
	resourcesOf,
	subjectColors,
	unreadLabel,
	type ResourceItem,
} from "./ui/format.ts";
import { renderScheduleRows } from "./ui/schedule.ts";
import { ScheduleModal, type ScheduleSection } from "./ui/schedule-modal.ts";
import { isEmptyResults, renderResults } from "./ui/results.ts";
import { renderSubject } from "./ui/subject.ts";
import { renderTabs, tabId } from "./ui/tabs.ts";

export const VIEW_TYPE = "pronote-screen";

const PANEL_ID = "pronote-tabpanel";

type MessageView = { kind: "loading" } | { kind: "error"; message: string } | { kind: "ready"; messages: MessageDTO[] };

interface Panel {
	tab: Tab;
	root: HTMLElement;
	blocks: Map<string, HTMLElement>;
	homework: BlockState<HomeworkDTO[]>;
	timetable: BlockState<TimetableEntryDTO[]>;
	lessons: BlockState<LessonDTO[]>;
	discussions: BlockState<DiscussionDTO[]>;
	results: BlockState<ResultsDTO>;
	messages: Map<string, MessageView>;
	started: boolean;
	/** Un rafraîchissement de l'onglet est en cours : on n'en lance pas un second. */
	refreshing: boolean;
	/** Replis intérieurs (jours, contrôles, détails) : clé -> ouvert. */
	open: Map<string, boolean>;
	/** Panneau abandonné (reconstruction, fermeture) : plus aucun résultat n'y est écrit. */
	dead: boolean;
	/** Par source, change à chaque chargement : le résultat d'un chargement périmé est ignoré. */
	gens: Map<string, number>;
}

/** Ce que les rendus d'un panneau partagent : couleurs de matière, séances, jour courant. */
interface Ctx {
	colors: Map<string, string>;
	lessons: LessonDTO[];
	today: string;
}

function plural(n: number, one: string, many = `${one}s`): string {
	return `${n} ${n > 1 ? many : one}`;
}

function isEmptyList<T>(list: T[]): boolean {
	return list.length === 0;
}

function lessonInputs(entries: TimetableEntryDTO[] | undefined): LessonInput[] {
	return (entries ?? [])
		.filter((e) => e.kind === "lesson")
		.map((e) => ({ subject: e.title, start: e.start, canceled: e.canceled, test: e.test }));
}

const REFRESH_LABEL = "Actualiser";

/** Résultat d'un rafraîchissement d'onglet, pour le minuteur : issue, nouveauté en toutes lettres, enfant (mode parent). */
export interface RefreshReport {
	outcome: RefreshOutcome | "skipped";
	news: string;
	label: string;
}

/** Instant de la dernière donnée connue du bloc (fraîche ou en cache) ; absent si rien. */
function fetchedAtOf(state: BlockState<unknown>): number | undefined {
	return state.kind === "loading" ? undefined : state.fetchedAt;
}

function dataOf<T>(state: BlockState<T>): T | undefined {
	return state.kind === "ready" || state.kind === "error" || state.kind === "offline" ? state.data : undefined;
}

export class PronoteScreen extends ItemView {
	private panels = new Map<string, Panel>();
	private selected = "";
	private signature = "";
	private announceEl!: HTMLElement;
	private noteEl!: HTMLElement;
	private tabsEl!: HTMLElement;
	private panelEl!: HTMLElement;
	private emptyEl!: HTMLElement;
	private dateEl!: HTMLButtonElement;
	private scheduleModal: ScheduleModal | undefined;
	private mailEl!: HTMLElement;
	private titleEl!: HTMLElement;
	private refreshBtn!: HTMLButtonElement;
	private refreshWait!: HTMLElement;
	private waitTimer: number | undefined;
	/** Le bouton était en attente au dernier passage : sert à annoncer son retour, une seule fois. */
	private wasWaiting = false;

	constructor(
		leaf: WorkspaceLeaf,
		private plugin: PronotePlugin,
	) {
		super(leaf);
	}

	getViewType(): string {
		return VIEW_TYPE;
	}

	getDisplayText(): string {
		return "Pronote";
	}

	getIcon(): string {
		return "graduation-cap";
	}

	onOpen(): Promise<void> {
		const root = this.contentEl;
		root.empty();
		root.addClass("pronote-screen");
		const bar = root.createDiv({ cls: "pronote-bar" });
		this.dateEl = bar.createEl("button", {
			cls: "pronote-bar-date",
			attr: { type: "button", "aria-label": "Emploi du temps d'aujourd'hui" },
		});
		this.dateEl.addEventListener("click", () => this.openToday());
		const end = bar.createDiv({ cls: "pronote-bar-end" });
		this.mailEl = end.createDiv({ cls: "pronote-bar-mail" });
		this.refreshBtn = end.createEl("button", {
			cls: "clickable-icon pronote-refresh",
			attr: { type: "button", "aria-label": REFRESH_LABEL },
		});
		setIcon(this.refreshBtn.createSpan({ attr: { "aria-hidden": "true" } }), "refresh-cw");
		this.refreshWait = this.refreshBtn.createSpan({ cls: "pronote-refresh-wait" });
		this.refreshBtn.addEventListener("click", () => this.onRefreshClick());
		this.titleEl = root.createEl("h1", { cls: "pronote-title" });
		this.announceEl = root.createDiv({ cls: "pronote-announce", attr: { role: "status", "aria-live": "polite" } });
		this.noteEl = root.createDiv({ cls: "pronote-note" });
		this.tabsEl = root.createDiv();
		this.panelEl = root.createDiv({ attr: { id: PANEL_ID, role: "tabpanel" } });
		this.emptyEl = root.createDiv({ cls: "pronote-screen-empty" });
		this.registerDomEvent(activeWindow, "online", () => this.updateNote());
		this.registerDomEvent(activeWindow, "offline", () => this.updateNote());
		this.updateRefreshButton();
		this.rebuild();
		return Promise.resolve();
	}

	onClose(): Promise<void> {
		for (const p of this.panels.values()) p.dead = true;
		return Promise.resolve();
	}

	private announce(message: string): void {
		this.announceEl.setText(message);
	}

	/** Les réglages ont changé : on ne reconstruit que si le mode ou la liste des onglets a changé. */
	onSettingsChanged(): void {
		if (this.signature !== this.currentSignature()) this.rebuild();
		else this.updateNote();
	}

	private tabs(): Tab[] {
		const { data, client } = this.plugin;
		const accounts = (data.mode === "child" ? [data.child] : data.parents).filter((a) => client.isConnected(a));
		return tabsOf(accounts).map((t) => ({ ...t, label: t.label || "Enfant" }));
	}

	private currentSignature(): string {
		const { grades, resources, messages } = this.plugin.sections;
		return `${this.plugin.data.mode}|${this.tabs().map((t) => t.key).join(",")}|${this.plugin.repository ? "r" : "-"}|${[grades, resources, messages].map(Number).join("")}`;
	}

	/** Reconstruit les onglets et les panneaux (ouverture, changement de mode ou de comptes). */
	rebuild(): void {
		if (!this.panelEl) return;
		for (const p of this.panels.values()) p.dead = true;
		this.panels.clear();
		this.panelEl.empty();
		this.tabsEl.empty();
		this.signature = this.currentSignature();
		const tabs = this.tabs();
		this.dateEl.setText(`Aujourd'hui, ${frDate(new Date())}`);
		this.titleEl.setText(this.plugin.data.mode === "child" ? "Qu'est-ce que j'ai à faire ?" : "Qu'est-ce qu'il y a à faire ?");
		this.mailEl.empty();
		this.updateNote();
		this.emptyEl.empty();
		if (tabs.length === 0) {
			this.emptyEl.setText("Aucun compte connecté dans ce mode. Connecte un compte dans les réglages du plugin.");
			return;
		}
		if (!this.plugin.repository) {
			this.emptyEl.setText("Chargement du cache local…");
			return;
		}
		this.selected = tabs[0]?.key ?? "";
		for (const tab of tabs) {
			const root = this.panelEl.createDiv({ cls: "pronote-panel" });
			root.hidden = tab.key !== this.selected;
			this.panels.set(tab.key, {
				tab,
				root,
				blocks: new Map(),
				homework: { kind: "loading" },
				timetable: { kind: "loading" },
				lessons: { kind: "loading" },
				discussions: { kind: "loading" },
				results: { kind: "loading" },
				messages: new Map(),
				started: false,
				refreshing: false,
				open: new Map(),
				dead: false,
				gens: new Map(),
			});
		}
		if (this.plugin.data.mode === "parent") {
			renderTabs(this.tabsEl, {
				tabs,
				selected: this.selected,
				label: "Enfants",
				panelId: PANEL_ID,
				onSelect: (key) => this.select(key),
			});
			this.panelEl.setAttr("aria-labelledby", tabId(this.selected));
		} else {
			this.panelEl.removeAttribute("aria-labelledby");
			this.panelEl.setAttr("aria-label", "Pronote");
		}
		this.start(this.selected);
	}

	private select(key: string): void {
		this.selected = key;
		for (const [k, p] of this.panels) p.root.hidden = k !== key;
		this.panelEl.setAttr("aria-labelledby", tabId(key));
		this.start(key);
		const panel = this.panels.get(key);
		if (panel) this.updateMail(panel);
	}

	private start(key: string): void {
		const panel = this.panels.get(key);
		if (!panel || panel.started) return;
		this.loadPanel(panel);
	}

	/** Appui sur « Actualiser » : redemande l'onglet affiché, au plus une fois toutes les 2 minutes (PD-011). */
	private onRefreshClick(): void {
		if (manualWaitMs(this.plugin.lastManualMs, Date.now()) > 0) return;
		const panel = this.panels.get(this.selected);
		if (!panel || panel.refreshing) return;
		// L'attente protège Pronote : hors ligne, rien n'est envoyé, donc rien n'est décompté.
		if (this.plugin.repository?.isOnline()) this.plugin.markManual();
		void this.refreshPanel(panel, "manual").then((report) => {
			if (report.outcome === "ok" || report.outcome === "partial") this.plugin.onManualSuccess();
		});
	}

	/** Libellé écrit pendant l'attente, `aria-disabled` (le focus reste sur le bouton), annonce au retour. */
	updateRefreshButton(): void {
		if (!this.refreshBtn) return;
		const wait = manualWaitMs(this.plugin.lastManualMs, Date.now());
		const label = wait > 0 ? `${REFRESH_LABEL} (disponible dans ${Math.ceil(wait / 1000)} s)` : REFRESH_LABEL;
		this.refreshBtn.setAttr("aria-label", label);
		this.refreshBtn.toggleClass("is-waiting", wait > 0);
		if (wait > 0) {
			this.refreshBtn.setAttr("aria-disabled", "true");
			this.refreshWait.setText(label);
			if (!this.wasWaiting) this.announce("Actualisation lancée. Le bouton Actualiser revient dans 2 minutes.");
			this.wasWaiting = true;
			if (this.waitTimer === undefined) {
				this.waitTimer = window.setInterval(() => this.updateRefreshButton(), 1000);
				this.registerInterval(this.waitTimer);
			}
			return;
		}
		this.refreshBtn.removeAttribute("aria-disabled");
		this.refreshWait.empty();
		if (this.waitTimer !== undefined) {
			window.clearInterval(this.waitTimer);
			this.waitTimer = undefined;
		}
		if (this.wasWaiting) this.announce("Le bouton Actualiser est de nouveau disponible.");
		this.wasWaiting = false;
	}

	/** Pause, reprise ou attente du bouton modifiées ailleurs (minuteur, autre écran). */
	onRefreshStateChanged(): void {
		this.updateNote();
		this.updateRefreshButton();
	}

	/** Écran visible : onglet de la fenêtre au premier plan, ou panneau latéral déployé. */
	isShown(): boolean {
		return this.containerEl.isShown();
	}

	/** Le minuteur peut-il rafraîchir l'onglet affiché ? Données chargées, pas en cours, plus fraîches que l'intervalle. */
	autoDue(intervalMin: number): boolean {
		const panel = this.panels.get(this.selected);
		if (!panel || !panel.started || panel.refreshing) return false;
		const blocks: BlockState<unknown>[] = [panel.homework, panel.timetable, panel.lessons];
		if (this.plugin.sections.messages) blocks.push(panel.discussions);
		if (this.plugin.sections.grades) blocks.push(panel.results);
		const stamps = blocks.map(fetchedAtOf);
		if (stamps.some((s) => s === undefined)) return true;
		return !isFresh(Math.min(...stamps.map((s) => s ?? 0)), Date.now(), intervalMin);
	}

	/** Rafraîchit l'onglet affiché pour le minuteur (« auto ») : même chemin que le bouton. */
	refreshSelected(kind: "auto"): Promise<RefreshReport> {
		const panel = this.panels.get(this.selected);
		if (!panel) return Promise.resolve({ outcome: "skipped", news: "", label: "" });
		return this.refreshPanel(panel, kind);
	}

	private updateNote(): void {
		if (!this.noteEl) return;
		const repo = this.plugin.repository;
		const notes: string[] = [];
		if (this.plugin.data.mode === "parent") notes.push("Mode parent : les cases « fait » sont en lecture seule.");
		if (repo && !repo.isOnline()) notes.push("Hors ligne : les données affichées viennent de l'appareil.");
		if (this.plugin.autoState.paused) {
			notes.push(`Actualisation automatique suspendue après ${MAX_FAILURES} échecs. Appuie sur Actualiser pour reprendre.`);
		}
		this.noteEl.setText(notes.join(" "));
	}

	// ---- chargement

	/** `panel` : onglet dont l'état précédent complète une lecture partielle (résultats). */
	private specs(panel?: Panel) {
		const { client, data } = this.plugin;
		const homework: BlockSpec<HomeworkDTO[]> = {
			id: "homework",
			fetch: (s) => client.fetchHomework(s, Math.max(1, data.weeksAhead)),
			isEmpty: isEmptyList,
		};
		const timetable: BlockSpec<TimetableEntryDTO[]> = {
			id: "timetable",
			fetch: (s) => {
				const end = startOfToday();
				end.setDate(end.getDate() + 7 * Math.max(2, data.weeksAhead));
				return client.fetchTimetable(s, startOfToday(), end);
			},
			isEmpty: isEmptyList,
		};
		const lessons: BlockSpec<LessonDTO[]> = {
			id: "lessons",
			fetch: (s) => client.fetchLessonContents(s, Math.max(1, data.weeksBack)),
			isEmpty: isEmptyList,
		};
		const discussions: BlockSpec<DiscussionDTO[]> = {
			id: "discussions",
			fetch: (s) => client.fetchDiscussions(s),
			isEmpty: isEmptyList,
		};
		const results: BlockSpec<ResultsDTO> = {
			id: "results",
			fetch: async (s) => mergeResults(await client.fetchResults(s), panel ? dataOf(panel.results) : undefined),
			isEmpty: isEmptyResults,
		};
		return { homework, timetable, lessons, discussions, results };
	}

	/** Un bloc seul : cache frais = aucune connexion ; `force` après une écriture (case « fait », message ouvert). */
	private async pump<T>(
		panel: Panel,
		spec: BlockSpec<T>,
		set: (state: BlockState<T>) => void,
		skipFirst = false,
		force = false,
	): Promise<void> {
		const repo = this.plugin.repository;
		if (!repo) return;
		const generation = (panel.gens.get(spec.id) ?? 0) + 1;
		panel.gens.set(spec.id, generation);
		let first = true;
		for await (const state of repo.load(panel.tab.key, spec, { force })) {
			if (panel.dead || panel.gens.get(spec.id) !== generation) return;
			if (first && skipFirst) {
				first = false;
				continue;
			}
			first = false;
			set(state);
			this.renderPanel(panel);
		}
	}

	/** Ouverture d'un onglet : le cache d'abord, puis une seule connexion si une donnée n'est plus fraîche. */
	private loadPanel(panel: Panel): void {
		void this.refreshPanel(panel, "open");
	}

	private task<T>(panel: Panel, spec: BlockSpec<T>, set: (state: BlockState<T>) => void): TabTask<T> {
		const generation = (panel.gens.get(spec.id) ?? 0) + 1;
		panel.gens.set(spec.id, generation);
		return {
			spec,
			set: (state) => {
				if (panel.dead || panel.gens.get(spec.id) !== generation) return;
				set(state);
				this.renderPanel(panel);
			},
		};
	}

	/**
	 * Rafraîchit un onglet avec une seule connexion Pronote (devoirs, emploi du temps, séances, discussions).
	 * « open » respecte la fraîcheur du cache ; « manual » et « auto » redemandent. Seul « auto » peut annoncer du nouveau.
	 */
	private async refreshPanel(panel: Panel, kind: "open" | "auto" | "manual"): Promise<RefreshReport> {
		const repo = this.plugin.repository;
		if (!repo || panel.refreshing) return { outcome: "skipped", news: "", label: "" };
		panel.started = true;
		panel.refreshing = true;
		const specs = this.specs(panel);
		this.renderPanel(panel);
		const tasks: TabTask<unknown>[] = [
			this.task(panel, specs.homework, (s) => (panel.homework = s)),
			this.task(panel, specs.timetable, (s) => (panel.timetable = s)),
			this.task(panel, specs.lessons, (s) => (panel.lessons = s)),
		];
		if (this.plugin.sections.messages) tasks.push(this.task(panel, specs.discussions, (s) => (panel.discussions = s)));
		if (this.plugin.sections.grades) tasks.push(this.task(panel, specs.results, (s) => (panel.results = s)));
		let outcome: RefreshOutcome = "failed";
		try {
			outcome = await repo.refreshTab(panel.tab.key, tasks, { force: kind !== "open" });
		} finally {
			panel.refreshing = false;
		}
		if (outcome !== "fresh" && outcome !== "offline") this.plugin.markAttempt();
		return { outcome, news: outcome === "ok" ? this.newsAfter(panel, kind) : "", label: this.plugin.data.mode === "parent" ? panel.tab.label : "" };
	}

	/**
	 * Pose la référence de l'onglet après une récupération réussie, et dit ce qui est nouveau par rapport à la précédente.
	 * Pas de référence (première récupération de la session) ou pas d'automatique : texte vide.
	 */
	private newsAfter(panel: Panel, kind: "open" | "auto" | "manual"): string {
		const hw = panel.homework;
		const dis = panel.discussions;
		const done = (s: BlockState<unknown>) => s.kind === "ready" || s.kind === "empty";
		if (!done(hw) || (this.plugin.sections.messages && !done(dis))) return "";
		const snap = snapshotOf(dataOf(hw) ?? [], dataOf(dis) ?? []);
		const previous = this.plugin.snapshots.get(panel.tab.key);
		this.plugin.snapshots.set(panel.tab.key, snap);
		return kind === "auto" && previous ? notificationText(newSince(previous, snap)) : "";
	}

	/** Relit les devoirs sans réafficher le cache (qui a l'ancien état « fait » jusqu'à la réécriture). */
	private reloadHomework(panel: Panel): void {
		void this.pump(panel, this.specs().homework, (s) => (panel.homework = s), true, true);
	}

	// ---- rendu

	private block<T>(panel: Panel, id: string, opts: Omit<BlockOptions<T>, "id">): void {
		let el = panel.blocks.get(id);
		if (!el) {
			el = panel.root.createDiv();
			panel.blocks.set(id, el);
		}
		renderBlock(el, { id: `${panel.tab.key}-${id}`, ...opts });
	}

	/** État d'un repli intérieur (jour, contrôle, détail) : tenu ici, car le corps est redessiné à chaque état. */
	private disclosure(panel: Panel, parent: HTMLElement, key: string, opts: Omit<DisclosureOptions, "id" | "open" | "onToggle"> & { open?: boolean }): void {
		renderDisclosure(parent, {
			...opts,
			id: `${panel.tab.key}-${key}`,
			open: panel.open.get(key) ?? opts.open ?? false,
			onToggle: (open) => panel.open.set(key, open),
		});
	}

	private renderPanel(panel: Panel): void {
		const active = activeDocument.activeElement;
		const focusId = active?.instanceOf(HTMLElement) ? active.dataset.focus : undefined;
		const today = isoDay(new Date());
		const entries = dataOf(panel.timetable);
		const inputs = lessonInputs(entries);
		const target = (entries && nextSchoolDay(inputs, today)) || nextDay(today);
		const forTarget = dayTitle(target, today);
		const bag = bagFor(inputs, target);
		const homework = dataOf(panel.homework) ?? [];
		const lessons = dataOf(panel.lessons) ?? [];
		const ctx: Ctx = {
			colors: subjectColors([...homework, ...lessons, ...(entries ?? []).map((e) => ({ subject: e.title, color: e.color }))]),
			lessons,
			today,
		};

		const demain = forTarget === "Pour demain";
		this.block(panel, "tomorrow", {
			title: demain ? `${forTarget}, ${frDate(target)}` : forTarget,
			emptyLabel: "Aucun devoir à rendre pour ce jour.",
			emptyHint: "Aucun devoir",
			variant: "big",
			cls: "pronote-zone is-primary",
			state: mapState(panel.homework, (h) => groupHomework(h, today, this.plugin.data.overdueDays).filter((g) => g.overdue || g.day === target), isEmptyList),
			hint: (groups) => {
				const items = groups.flatMap((g) => g.subjects.flatMap((s) => s.items));
				if (items.every((h) => h.done)) return "Rien d'autre pour demain";
				const late = groups.filter((g) => g.overdue).reduce((n, g) => n + g.subjects.reduce((m, s) => m + s.items.length, 0), 0);
				return late > 0 ? `${plural(items.length, "devoir")}, dont ${late} en retard` : plural(items.length, "devoir");
			},
			startCollapsed: (groups) => groups.flatMap((g) => g.subjects.flatMap((s) => s.items)).every((h) => h.done),
			peek: (el, groups) => this.renderSubjectLine(el, groups.flatMap((g) => g.subjects.map((s) => s.subject)), ctx),
			renderData: (body, groups) => this.renderHomework(body, panel, groups, ctx),
		});
		this.block(panel, "bag", {
			title: `Cartable ${forTarget.toLowerCase()}`,
			emptyLabel: "Aucun cours ce jour-là.",
			cls: "pronote-zone",
			state: mapState(panel.timetable, () => bag, isEmptyList),
			renderData: (body, items) => this.renderBag(body, panel, items, entries ?? [], target, ctx),
		});
		this.block(panel, "later", {
			title: "Pour après",
			emptyLabel: "Aucun devoir plus tard.",
			cls: "pronote-zone",
			state: mapState(panel.homework, (h) => groupHomework(h, today, this.plugin.data.overdueDays).filter((g) => g.day > target), isEmptyList),
			renderData: (body, groups) => this.renderLater(body, panel, groups, ctx),
		});
		const tests = upcomingTests(inputs, today);
		const resources = this.plugin.sections.resources ? resourcesOf(homework, lessons) : [];
		this.block(panel, "tests", {
			title: tests.length > 1 ? "Prochains contrôles" : "Prochain contrôle",
			emptyLabel: "Aucun cours marqué contrôle dans l'emploi du temps.",
			cls: "pronote-zone",
			state: mapState(panel.timetable, () => tests, isEmptyList),
			renderData: (body, items) => this.renderTests(body, panel, items, resources, ctx),
		});
		if (this.plugin.sections.resources) {
			this.block(panel, "resources", {
				title: "Ressources",
				emptyLabel: "Aucune pièce jointe sur la période.",
				emptyHint: "aucun fichier",
				variant: "panel",
				startCollapsed: true,
				state: combineStates(panel.homework, panel.lessons, (h, l) => resourcesOf(h ?? [], l ?? []), isEmptyList),
				hint: (items) => plural(items.length, "fichier"),
				renderData: (body, items) => this.renderResources(body, panel, items, ctx),
			});
		} else {
			panel.blocks.get("resources")?.remove();
			panel.blocks.delete("resources");
		}
		if (this.plugin.sections.messages) {
			this.block(panel, "messages", {
				title: "Messages",
				emptyLabel: "Aucune discussion.",
				emptyHint: "aucun message",
				variant: "panel",
				startCollapsed: true,
				state: mapState(panel.discussions, (d) => d, isEmptyList),
				hint: (items) => {
					const unread = items.reduce((n, d) => n + d.numberOfMessagesUnread, 0);
					return unread > 0 ? `${unread} non lu${unread > 1 ? "s" : ""}` : plural(items.length, "discussion");
				},
				renderData: (body, items) => this.renderMessages(body, panel, items),
			});
		} else {
			panel.blocks.get("messages")?.remove();
			panel.blocks.delete("messages");
		}
		if (this.plugin.sections.grades) {
			this.block(panel, "results", {
				title: "Résultats scolaires",
				emptyLabel: "Aucun résultat pour cette période.",
				emptyHint: "aucun résultat",
				variant: "panel",
				startCollapsed: true,
				state: panel.results,
				hint: (r) => {
					const n = r.grades.length;
					const k = r.skillEvaluations.filter((e) => e.skills.length > 0).length;
					return [n > 0 ? plural(n, "note") : "", k > 0 ? plural(k, "évaluation") : ""].filter((x) => x !== "").join(", ");
				},
				renderData: (body, r) =>
					renderResults(body, r, ctx.colors, (parent, key, opts) => this.disclosure(panel, parent, `results-${key}`, opts)),
			});
		} else {
			panel.blocks.get("results")?.remove();
			panel.blocks.delete("results");
		}

		if (panel.tab.key === this.selected) this.updateMail(panel);
		if (this.scheduleModal?.containerEl.isConnected) this.scheduleModal.refresh();
		if (focusId) panel.root.querySelector<HTMLElement>(`[data-focus="${CSS.escape(focusId)}"]`)?.focus();
	}

	/** Matières distinctes, chacune avec son repère de couleur, sur une ligne. */
	private renderSubjectLine(el: HTMLElement, subjects: string[], ctx: Ctx): void {
		for (const s of [...new Set(subjects)]) renderSubject(el, s, ctx.colors, "pronote-peek-item");
	}

	private renderHomework(body: HTMLElement, panel: Panel, groups: DayGroup[], ctx: Ctx): void {
		for (const g of groups) {
			if (g.overdue) {
				const head = body.createEl("h3", { cls: "pronote-overdue" });
				setIcon(head.createSpan({ cls: "pronote-overdue-icon", attr: { "aria-hidden": "true" } }), "clock");
				head.createSpan({ text: `En retard, échéance ${frDate(g.day)}` });
			}
			for (const s of g.subjects) this.renderSubjectGroup(body, panel, s, `${g.day}`, ctx);
		}
	}

	private renderLater(body: HTMLElement, panel: Panel, groups: DayGroup[], ctx: Ctx): void {
		for (const g of groups) {
			const items = g.subjects.flatMap((s) => s.items);
			const done = items.filter((h) => h.done).length;
			const isToday = g.day === ctx.today;
			this.disclosure(panel, body, `day-${g.day}`, {
				cls: `is-day${isToday ? " is-today" : ""}`,
				level: 3,
				label: `${frDate(g.day)}${isToday ? " · aujourd'hui" : ""}`,
				hint: `${plural(items.length, "devoir")}${done > 0 ? `, ${plural(done, "fait")}` : ""}`,
				peek: (el) => this.renderSubjectLine(el, g.subjects.map((s) => s.subject), ctx),
				render: (inner) => {
					for (const s of g.subjects) this.renderSubjectGroup(inner, panel, s, g.day, ctx);
				},
			});
		}
	}

	/** Une matière : son nom, ses devoirs (case à gauche), puis « Vu en cours ». */
	private renderSubjectGroup(parent: HTMLElement, panel: Panel, s: SubjectGroup, day: string, ctx: Ctx): void {
		const group = parent.createDiv({ cls: "pronote-group" });
		renderSubject(group.createDiv({ cls: "pronote-group-title" }), s.subject, ctx.colors);
		const repo = this.plugin.repository;
		for (const h of s.items) {
			const row = group.createDiv({ cls: "pronote-task" });
			renderDoneBox(row, {
				label: `${s.subject}, ${frDate(h.deadline)}`,
				done: h.done,
				mode: this.plugin.data.mode,
				isOnline: () => repo?.isOnline() ?? false,
				save: async (value) => {
					await this.plugin.runFor(panel.tab.key, (session) => this.plugin.client.setHomeworkDone(session, h.id, value));
					h.done = value;
					this.reloadHomework(panel);
				},
				announce: (m) => this.announce(m),
				focusId: `done-${h.id}`,
			});
			const main = row.createDiv({ cls: "pronote-task-main" });
			if (h.description) renderRichParagraph(main, h.description, "pronote-text pronote-task-text");
			else main.createEl("p", { cls: "pronote-muted", text: "Sans description" });
			this.attachments(main, panel, homeworkKey(h), h.attachments);
		}
		this.renderSeen(group, panel, s.subject, `seen-${day}-${s.subject}`, ctx);
	}

	/** « Vu en cours : … » : ce que le professeur a écrit pour la dernière séance de la matière. */
	private renderSeen(parent: HTMLElement, panel: Panel, subject: string, key: string, ctx: Ctx): void {
		const seen = lastSeen(ctx.lessons, subject);
		if (!seen) return;
		this.disclosure(panel, parent, key, {
			cls: "is-seen",
			level: 4,
			label: `Vu en cours : ${seen.summary}`,
			render: (body) => {
				for (const p of seen.paragraphs) renderRichParagraph(body, p, "pronote-text");
			},
		});
	}

	private renderBag(body: HTMLElement, panel: Panel, items: BagItem[], entries: TimetableEntryDTO[], target: string, ctx: Ctx): void {
		const list = body.createEl("ul", { cls: "pronote-pills" });
		for (const b of items) {
			const li = list.createEl("li", { cls: `pronote-pill${b.canceled ? " is-canceled" : ""}` });
			renderSubject(li, b.subject, ctx.colors);
			if (b.canceled) li.createSpan({ cls: "pronote-flag", text: "annulé" });
		}
		const reminders = items.filter((b) => !b.canceled).flatMap((b) => {
			const r = reminderFor(b.subject, this.plugin.data.reminders);
			return r ? [{ subject: b.subject, text: r.text }] : [];
		});
		for (const r of reminders) body.createEl("p", { cls: "pronote-reminder", text: `${r.subject} : ${r.text}` });

		const day = coursesOn(entries, target);
		if (day.length === 0) return;
		this.disclosure(panel, body, "schedule", {
			cls: "is-link",
			level: 3,
			label: "Emploi du temps",
			render: (inner) => renderScheduleRows(inner, day, ctx.colors),
		});
	}

	private renderTests(body: HTMLElement, panel: Panel, items: UpcomingTest[], resources: ResourceItem[], ctx: Ctx): void {
		for (const t of items) {
			const seen = lastSeen(ctx.lessons, t.subject);
			const files = resources.filter((r) => r.subject === t.subject);
			this.disclosure(panel, body, `test-${t.subject}-${t.inDays}`, {
				cls: "is-test",
				level: 3,
				label: `${t.subject}, ${frDate(addDays(ctx.today, t.inDays))}`,
				renderLabel: (el) => {
					renderSubject(el, t.subject, ctx.colors);
					el.createSpan({ text: `, ${frDate(addDays(ctx.today, t.inDays))}` });
				},
				hint: inDaysLabel(t.inDays),
				render: (inner) => {
					if (seen) {
						inner.createEl("h4", { cls: "pronote-minor-heading", text: "Ce qu'on a vu en cours" });
						for (const p of seen.paragraphs) renderRichParagraph(inner, p, "pronote-text");
					}
					if (files.length > 0) {
						inner.createEl("h4", { cls: "pronote-minor-heading", text: "Ressources" });
						for (const r of files) this.attachments(inner, panel, r.ownerKey, [r.file]);
					}
					if (!seen && files.length === 0) inner.createEl("p", { cls: "pronote-muted", text: "Rien d'enregistré pour cette matière." });
				},
			});
		}
	}

	private attachments(el: HTMLElement, panel: Panel, ownerKey: string, files: HomeworkDTO["attachments"]): void {
		const repo = this.plugin.repository;
		if (!repo) return;
		for (const f of files) {
			renderAttachment(el, f, { app: this.app, repo, key: panel.tab.key, ownerKey, announce: (m) => this.announce(m) });
		}
	}

	private renderResources(body: HTMLElement, panel: Panel, items: ResourceItem[], ctx: Ctx): void {
		for (const subject of [...new Set(items.map((r) => r.subject))]) {
			renderSubject(body.createEl("h3", { cls: "pronote-group-title" }), subject, ctx.colors);
			for (const r of items.filter((x) => x.subject === subject)) this.attachments(body, panel, r.ownerKey, [r.file]);
		}
	}

	private renderMessages(body: HTMLElement, panel: Panel, items: DiscussionDTO[]): void {
		for (const d of items) {
			const unread = d.numberOfMessagesUnread > 0;
			const row = body.createDiv({ cls: `pronote-mail${unread ? " is-unread" : ""}` });
			const meta = [d.creator, frDate(d.date)].filter((x): x is string => !!x).join(" · ");
			const top = row.createDiv({ cls: "pronote-mail-meta pronote-muted" });
			top.createSpan({ text: meta });
			if (unread) top.createSpan({ cls: "pronote-mail-unread", text: unreadLabel(d.numberOfMessagesUnread) });
			row.createEl("p", { cls: "pronote-mail-subject", text: d.subject });
			const view = panel.messages.get(d.id);
			if (!view) {
				const open = row.createEl("button", {
					cls: "pronote-button-plain",
					text: "Ouvrir le message",
					attr: { type: "button", "aria-label": `Ouvrir le message : ${d.subject}`, "data-focus": `open-${d.id}` },
				});
				open.addEventListener("click", () => void this.openMessage(panel, d));
			} else if (view.kind === "loading") {
				row.createEl("p", { cls: "pronote-muted", text: "Ouverture…" });
			} else if (view.kind === "error") {
				row.createEl("p", { cls: "pronote-error", text: `Erreur : ${view.message}` });
			} else {
				for (const m of view.messages) {
					const msg = row.createDiv({ cls: "pronote-message" });
					msg.createEl("p", { cls: "pronote-muted", text: [m.author, frDate(m.date)].filter((x): x is string => !!x).join(" · ") });
					renderRichParagraph(msg, m.text, "pronote-text");
				}
			}
		}
		body.createEl("p", { cls: "pronote-muted", text: "Ouvrir un message le marque comme lu dans Pronote." });
	}

	/** Lien de la barre du haut : messages non lus du compte affiché, ou « Aucun nouveau message ». */
	private updateMail(panel: Panel): void {
		if (!this.mailEl) return;
		this.mailEl.empty();
		if (!this.plugin.sections.messages) return;
		const items = dataOf(panel.discussions);
		if (!items) return;
		const unread = items.reduce((n, d) => n + d.numberOfMessagesUnread, 0);
		if (unread > 0) {
			const link = this.mailEl.createEl("button", {
				cls: "pronote-mail-link",
				attr: { type: "button", "aria-label": `${unreadLabel(unread)} : aller aux messages` },
			});
			setIcon(link.createSpan({ cls: "pronote-bar-icon", attr: { "aria-hidden": "true" } }), "mail");
			link.createSpan({ text: unreadLabel(unread) });
			link.addEventListener("click", () => this.showMessages());
		} else {
			setIcon(this.mailEl.createSpan({ cls: "pronote-bar-icon", attr: { "aria-hidden": "true" } }), "mail");
			this.mailEl.createSpan({ text: "Aucun nouveau message" });
		}
	}

	/** Panneau « Aujourd'hui » : les cours du jour de l'enfant affiché, ou de chaque enfant en mode parent. */
	private openToday(): void {
		const parent = this.plugin.data.mode === "parent";
		const wanted = parent ? [...this.panels.values()] : [this.panels.get(this.selected)].filter((p): p is Panel => !!p);
		if (wanted.length === 0) return;
		for (const p of wanted) {
			// Un onglet jamais ouvert n'a pas encore chargé son emploi du temps : on ne charge que celui-là.
			if (!p.started && !p.gens.has("timetable")) {
				void this.pump(p, this.specs().timetable, (s) => (p.timetable = s));
			}
		}
		const sections = (): ScheduleSection[] => {
			const today = isoDay(new Date());
			return wanted.map((p) => {
				const known = dataOf(p.timetable);
				return {
					...(parent ? { label: p.tab.label } : {}),
					state: mapState(p.timetable, (e) => coursesOn(e, today), isEmptyList),
					knownEmpty: known !== undefined && coursesOn(known, today).length === 0,
				};
			});
		};
		this.scheduleModal = new ScheduleModal(this.app, `Aujourd'hui, ${frDate(new Date())}`, sections, this.dateEl);
		this.scheduleModal.open();
	}

	private showMessages(): void {
		const el = this.panels.get(this.selected)?.blocks.get("messages");
		if (!el) return;
		const toggle = expandBlock(el);
		el.scrollIntoView({ block: "start", behavior: activeWindow.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
		toggle?.focus({ preventScroll: true });
	}

	/** Seul endroit qui lit un message : ouverture explicite par un clic (ce qui le marque comme lu). */
	private async openMessage(panel: Panel, d: DiscussionDTO): Promise<void> {
		const repo = this.plugin.repository;
		if (!repo?.isOnline()) {
			this.announce("Hors ligne : impossible d'ouvrir le message.");
			return;
		}
		panel.messages.set(d.id, { kind: "loading" });
		this.renderPanel(panel);
		try {
			const messages = await this.plugin.runFor(panel.tab.key, (session) => this.plugin.client.readMessage(session, d.id));
			panel.messages.set(d.id, { kind: "ready", messages });
		} catch (e) {
			panel.messages.set(d.id, { kind: "error", message: e instanceof Error ? e.message : String(e) });
		}
		this.renderPanel(panel);
		void this.pump(panel, this.specs().discussions, (s) => (panel.discussions = s), true, true);
	}
}
