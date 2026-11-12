import { Notice, Platform, Plugin, parseYaml, type App } from "obsidian";
import { use, type SessionHandle } from "@blockshub/pawnote-lts";
import { PronoteClient, type CollectOptions } from "./src/client";
import { Repository } from "./src/data/repository";
import { Store } from "./src/data/store";
import { accountKeyPrefix } from "./src/keys";
import { parseUserProps } from "./src/props";
import {
	MAX_FAILURES,
	isFresh,
	nextFailureState,
	normalizeIntervalMin,
	type FailureState,
	type NewnessSnapshot,
} from "./src/refresh";
import { PronoteScreen, VIEW_TYPE } from "./src/screen";
import { PronoteSettingTab } from "./src/settings";
import { migrate } from "./src/migrate";
import { syncAccount } from "./src/sync";
import {
	DEFAULT_NOTE_PROPS,
	type Account,
	type Mode,
	type PluginData,
	type Sections,
} from "./src/types";

/** Cadence du coup d'œil du minuteur ; la tentative a lieu seulement quand l'intervalle réglé est écoulé. */
const AUTO_CHECK_MS = 60_000;

/** Identifiant du coffre pour nommer la base du cache : l'`appId` d'Obsidian (non typé), sinon le nom du coffre. */
function vaultId(app: App): string {
	return "appId" in app && typeof app.appId === "string" ? app.appId : app.vault.getName();
}

export default class PronotePlugin extends Plugin {
	data!: PluginData;
	client!: PronoteClient;
	/** Cache et lecture de l'écran ; null tant que le coffre n'est pas prêt ou si IndexedDB est inaccessible. */
	repository: Repository | null = null;
	private store: Store | null = null;
	/** Actualisation automatique (PD-011) : échecs de suite, pause, dernière tentative, dernier appui manuel. */
	autoState: FailureState = { failures: 0, paused: false };
	lastManualMs = 0;
	private lastAttemptMs = Date.now();
	private autoBusy = false;
	/** Référence de la détection du nouveau, par onglet, posée après une récupération réussie de la session. */
	readonly snapshots = new Map<string, NewnessSnapshot>();

	get sections(): Sections {
		return this.data.display[this.data.mode];
	}

	/** Comptes de l'enfant ou des enfants, selon le mode. */
	get accounts(): Account[] {
		return this.data.mode === "child" ? [this.data.child] : this.data.parents;
	}

	async onload() {
		this.data = migrate(await this.loadData());
		this.client = new PronoteClient(() => this.saveSettings());

		this.registerView(VIEW_TYPE, (leaf) => new PronoteScreen(leaf, this));
		const tab = new PronoteSettingTab(this.app, this);
		tab.onClearCache = async () => {
			await this.store?.clear();
			this.eachScreen((s) => s.rebuild());
		};
		tab.onForgetAccount = async (accountId) => {
			await this.store?.deleteByPrefix(accountKeyPrefix(accountId));
			this.eachScreen((s) => s.rebuild());
		};
		this.addSettingTab(tab);
		this.addRibbonIcon("graduation-cap", "Ouvrir Pronote", () => void this.activateView(false));

		// Suivi des déplacements : un fichier rangé ailleurs n'est jamais retéléchargé.
		this.registerEvent(
			this.app.vault.on("rename", async (file, oldPath) => {
				let changed = false;
				const index = this.data.fileIndex;
				for (const [key, path] of Object.entries(index)) {
					if (path === oldPath) {
						index[key] = file.path;
						changed = true;
					} else if (path.startsWith(`${oldPath}/`)) {
						index[key] = file.path + path.slice(oldPath.length);
						changed = true;
					}
				}
				if (changed) await this.saveData(this.data);
			}),
		);

		this.addCommand({
			id: "open-screen",
			name: "Ouvrir l'écran dans la fenêtre principale",
			callback: () => void this.activateView(false),
		});

		this.addCommand({
			id: "open-sidebar",
			name: "Ouvrir dans la barre latérale",
			callback: () => void this.activateView(true),
		});

		this.addCommand({
			id: "sync-notes",
			name: "Synchroniser les séances, devoirs et notes dans le coffre",
			callback: () => this.syncNotes(),
		});

		this.addCommand({
			id: "switch-mode",
			name: "Basculer entre le mode Enfant et le mode Parent",
			callback: async () => {
				await this.setMode(this.data.mode === "child" ? "parent" : "child");
				new Notice(`Pronote : mode ${this.data.mode === "child" ? "Enfant" : "Parent"}`);
			},
		});

		this.app.workspace.onLayoutReady(() => void this.openStore());

		// Actualisation automatique : un coup d'œil par minute ; l'intervalle réel est le réglage (PD-011).
		// Rien sur mobile : l'automatique ne tourne que sur ordinateur, Obsidian ouvert.
		if (!Platform.isMobile) this.registerInterval(window.setInterval(() => void this.autoTick(), AUTO_CHECK_MS));
	}

	/** Une tentative automatique : l'onglet visible d'un écran visible, jamais hors ligne, jamais en pause. */
	private async autoTick(): Promise<void> {
		if (this.autoBusy || this.autoState.paused) return;
		const interval = normalizeIntervalMin(this.data.staleMinutes);
		const repo = this.repository;
		if (interval === 0 || !repo || !repo.isOnline()) return;
		if (isFresh(this.lastAttemptMs, Date.now(), interval)) return;
		const screen = this.shownScreens()[0];
		if (!screen?.autoDue(interval)) return;
		this.autoBusy = true;
		this.markAttempt();
		try {
			const report = await screen.refreshSelected("auto");
			if (report.outcome !== "ok" && report.outcome !== "partial" && report.outcome !== "failed") return;
			const wasPaused = this.autoState.paused;
			this.autoState = nextFailureState(this.autoState, report.outcome !== "failed");
			if (report.outcome === "ok" && report.news && this.data.notifyNew) {
				new Notice(`Pronote${report.label ? ` (${report.label})` : ""} : ${report.news}.`, 8000);
			}
			if (this.autoState.paused && !wasPaused) {
				new Notice(
					`Actualisation automatique suspendue après ${MAX_FAILURES} échecs. Appuie sur Actualiser pour reprendre.`,
					10000,
				);
				this.eachScreen((s) => s.onRefreshStateChanged());
			}
		} finally {
			this.autoBusy = false;
		}
	}

	/** Une connexion vient d'être tentée : le minuteur attend l'intervalle complet avant la suivante. */
	markAttempt(): void {
		this.lastAttemptMs = Date.now();
	}

	/** Appui sur « Actualiser » : démarre l'attente du bouton, sur tous les écrans. */
	markManual(): void {
		this.lastManualMs = Date.now();
		this.eachScreen((s) => s.onRefreshStateChanged());
	}

	/** Une actualisation manuelle a réussi : l'automatique repart, compteur remis à zéro. */
	onManualSuccess(): void {
		const wasPaused = this.autoState.paused;
		this.autoState = nextFailureState(this.autoState, true);
		this.markAttempt();
		if (wasPaused) {
			new Notice("Actualisation automatique reprise.");
			this.eachScreen((s) => s.onRefreshStateChanged());
		}
	}

	/** Écrans réellement visibles (onglet actif de la fenêtre, panneau latéral ouvert). */
	private shownScreens(): PronoteScreen[] {
		const out: PronoteScreen[] = [];
		this.eachScreen((s) => {
			if (s.isShown()) out.push(s);
		});
		return out;
	}

	onunload() {
		this.store?.close();
	}

	/** Ouvre le cache (base propre au coffre), puis prévient les écrans déjà ouverts. */
	private async openStore() {
		try {
			this.store = await Store.open(vaultId(this.app));
			this.repository = new Repository({
				store: this.store,
				runFor: (key, fn) => this.runFor(key, fn),
				settings: () => ({
					cacheTextDays: this.data.cacheTextDays,
					cacheMaxMb: this.data.cacheMaxMb,
					staleMinutes: normalizeIntervalMin(this.data.staleMinutes),
				}),
			});
		} catch (e) {
			new Notice(`Pronote : cache local inaccessible (${e instanceof Error ? e.message : String(e)}).`, 8000);
		}
		this.eachScreen((s) => s.rebuild());
	}

	/** Session Pronote sur l'élève de la clé `account.id:élève` (sessions en file, voir client.run). */
	runFor<R>(key: string, fn: (session: SessionHandle) => Promise<R>): Promise<R> {
		const sep = key.indexOf(":");
		const id = key.slice(0, sep);
		const student = key.slice(sep + 1);
		const account = [this.data.child, ...this.data.parents].find((a) => a.id === id);
		if (!account) return Promise.reject(new Error("Compte introuvable."));
		return this.client.run(account, (session, a) => {
			const index = a.resources.indexOf(student);
			if (index >= 0 && index < session.user.resources.length) use(session, index);
			return fn(session);
		});
	}

	async saveSettings() {
		await this.saveData(this.data);
		this.eachScreen((s) => s.onSettingsChanged());
	}

	async setMode(mode: Mode) {
		this.data.mode = mode;
		await this.saveSettings();
	}

	private eachScreen(fn: (screen: PronoteScreen) => void) {
		for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE)) {
			if (leaf.view instanceof PronoteScreen) fn(leaf.view);
		}
	}

	private collectOptions(): CollectOptions {
		return {
			weeksAhead: this.data.weeksAhead,
			weeksBack: this.data.weeksBack,
			sections: this.sections,
		};
	}

	async syncNotes() {
		const targets = this.accounts.filter((a) => this.client.isConnected(a));
		if (!targets.length) {
			new Notice("Pronote : aucun compte connecté dans ce mode.");
			return;
		}
		const parsed = parseUserProps(this.data.noteProps, parseYaml);
		if (parsed.error) {
			new Notice(`Pronote : propriétés de notes invalides (${parsed.error}). Les valeurs par défaut sont utilisées.`, 8000);
		}
		const userProps = parsed.error ? parseUserProps(DEFAULT_NOTE_PROPS, parseYaml).props : parsed.props;

		new Notice("Pronote : synchronisation en cours…");
		const opts = this.collectOptions();
		const mode = this.data.mode;
		let notes = 0;
		let files = 0;
		for (const target of targets) {
			try {
				await this.client.run(target, async (session, a) => {
					const snap = await this.client.collect(session, a, opts);
					const r = await syncAccount(this.app, this.data, a, mode, snap, opts.sections, userProps);
					notes += r.notes;
					files += r.files;
				});
			} catch (e) {
				new Notice(`Pronote (${target.name || "compte"}) : ${(e as Error).message}`, 10000);
			}
		}
		await this.saveSettings();
		new Notice(`Pronote : ${notes} nouvelle(s) note(s) de séance, ${files} fichier(s) téléchargé(s).`);
	}

	/** Écran dans la fenêtre principale (onglet) ou dans la barre latérale droite ; un seul par emplacement. */
	async activateView(sidebar: boolean) {
		const { workspace } = this.app;
		const inSidebar = (leaf: { getRoot(): unknown }) => leaf.getRoot() === workspace.rightSplit;
		let leaf = workspace.getLeavesOfType(VIEW_TYPE).find((l) => inSidebar(l) === sidebar) ?? null;
		if (!leaf) {
			leaf = sidebar ? workspace.getRightLeaf(false) : workspace.getLeaf("tab");
			await leaf?.setViewState({ type: VIEW_TYPE, active: true });
		}
		if (leaf) await workspace.revealLeaf(leaf);
	}
}
