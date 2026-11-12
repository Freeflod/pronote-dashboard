import { FuzzySuggestModal, Notice, PluginSettingTab, Setting, TFile, parseYaml, type App, type SettingDefinitionItem } from "obsidian";
import jsQR from "jsqr";
import type PronotePlugin from "../main";
import { parseUserProps } from "./props";
import { clampCacheMb, normalizeOverdueDays } from "./migrate.ts";
import { normalizeIntervalMin } from "./refresh.ts";
import { CACHE_MAX_MB_LIMIT, CACHE_MAX_MB_STEP, DEFAULT_NOTE_PROPS, newAccount, OVERDUE_DAYS_STEPS, type Account } from "./types";

/** « 0 jour », « 1 jour », « 3 jours » : valeur écrite du curseur des retards. */
function overdueText(days: number): string {
	return days > 1 ? `${days} jours` : `${days} jour`;
}

/** Lit un QR code dans une image, en réessayant à plus petite taille si besoin. */
async function decodeQrFromBlob(blob: Blob): Promise<string | null> {
	const bitmap = await createImageBitmap(blob);
	for (const maxSide of [Infinity, 1600, 1000]) {
		const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
		const w = Math.max(1, Math.round(bitmap.width * scale));
		const h = Math.max(1, Math.round(bitmap.height * scale));
		const canvas = createEl("canvas");
		canvas.width = w;
		canvas.height = h;
		const ctx = canvas.getContext("2d");
		if (!ctx) return null;
		ctx.drawImage(bitmap, 0, 0, w, h);
		const data = ctx.getImageData(0, 0, w, h);
		const found = jsQR(data.data, w, h);
		if (found) return found.data;
	}
	return null;
}

class VaultImageModal extends FuzzySuggestModal<TFile> {
	constructor(
		app: App,
		private onPick: (file: TFile) => void,
	) {
		super(app);
		this.setPlaceholder("Choisir l'image du QR code dans le coffre");
	}
	getItems(): TFile[] {
		return this.app.vault.getFiles().filter((f) => /^(png|jpe?g|webp|gif|bmp)$/i.test(f.extension));
	}
	getItemText(file: TFile): string {
		return file.path;
	}
	onChooseItem(file: TFile): void {
		this.onPick(file);
	}
}

interface Draft {
	qr: string;
	pin: string;
	password: string;
}

export class PronoteSettingTab extends PluginSettingTab {
	private drafts = new Map<string, Draft>();
	private target = "";
	private confirmRemove = "";
	/** Vide le cache local (raccordé à Store.clear par main.ts). */
	onClearCache?: () => Promise<void>;
	/** Oublie le cache d'un compte (raccordé à Store.deleteByPrefix par main.ts). */
	onForgetAccount?: (accountId: string) => Promise<void>;

	private async forgetAccount(accountId: string): Promise<void> {
		try {
			await this.onForgetAccount?.(accountId);
		} catch (e) {
			new Notice(`Cache de ce compte non effacé : ${(e as Error).message}`);
		}
	}

	constructor(
		app: App,
		private plugin: PronotePlugin,
	) {
		super(app, plugin);
		// Ctrl+V d'une capture d'écran n'importe où dans cette page
		this.containerEl.addEventListener("paste", (ev: ClipboardEvent) => {
			const item = Array.from(ev.clipboardData?.items ?? []).find((i) => i.type.startsWith("image/"));
			const file = item?.getAsFile();
			const target = this.target || this.plugin.accounts.find((a) => !this.plugin.client.isConnected(a))?.id || "";
			if (file && target) {
				ev.preventDefault();
				void this.handleImage(file, target);
			}
		});
	}

	private draft(id: string): Draft {
		let d = this.drafts.get(id);
		if (!d) {
			d = { qr: "", pin: "", password: "" };
			this.drafts.set(id, d);
		}
		return d;
	}

	private get allAccounts(): Account[] {
		return [this.plugin.data.child, ...this.plugin.data.parents];
	}

	getSettingDefinitions(): SettingDefinitionItem[] {
		const d = this.plugin.data;
		const modeName = d.mode === "child" ? "Enfant" : "Parent";

		const accounts: SettingDefinitionItem =
			d.mode === "child"
				? {
						type: "group",
						heading: "Connexion de l'enfant",
						items: [
							{
								name: "Compte Pronote",
								searchable: false,
								render: (setting) => this.renderAccountRow(setting, d.child, false),
							},
						],
					}
				: {
						type: "list",
						heading: "Enfants",
						emptyState: "Aucun enfant pour le moment.",
						addItem: {
							name: "Ajouter un enfant",
							action: () => {
								const acc = newAccount(7);
								d.parents.push(acc);
								if (!d.selectedParentId) d.selectedParentId = acc.id;
								this.target = acc.id;
								void this.plugin.saveSettings().then(() => this.update());
							},
						},
						items: d.parents.map((acc, i) => ({
							name: acc.name || `Enfant ${i + 1}`,
							searchable: false,
							render: (setting: Setting) => this.renderAccountRow(setting, acc, true),
						})),
					};

		return [
			{
				type: "group",
				heading: "Synchronisation",
				items: [
					{
						name: "Dossier de synchronisation",
						desc: "À la racine du coffre par défaut. Les notes déjà créées sont retrouvées même si vous les déplacez.",
						control: { type: "text", key: "syncFolder", placeholder: "Pronote" },
					},
					{
						name: "Télécharger les pièces jointes",
						desc: "Les fichiers des professeurs sont copiés dans le coffre à la synchronisation.",
						control: { type: "toggle", key: "downloadFiles" },
					},
				],
			},
			{
				type: "group",
				heading: "Profil",
				items: [
					{
						name: "Mode",
						desc:
							d.mode === "child"
								? "Enfant : un seul compte, les notes sont écrites à la racine du dossier."
								: "Parent : un ou plusieurs enfants, un sous-dossier par enfant.",
						control: { type: "dropdown", key: "mode", options: { child: "Enfant", parent: "Parent" } },
					},
				],
			},
			accounts,
			{
				type: "group",
				heading: `Affichage, mode ${modeName}`,
				items: [
					{ name: "Devoirs", desc: "Tableau de bord et note Devoirs.", control: { type: "toggle", key: "display.homework" } },
					{
						name: "Cahier de texte",
						desc: "Tableau de bord et une note par séance.",
						control: { type: "toggle", key: "display.lessons" },
					},
					{ name: "Résultats scolaires", desc: "Notes et compétences : tableau de bord et note Notes.", control: { type: "toggle", key: "display.grades" } },
					{ name: "Ressources", desc: "Fichiers et liens des devoirs et des séances.", control: { type: "toggle", key: "display.resources" } },
					{ name: "Messages", desc: "Discussions et messages non lus. Désactivé : Pronote n'est pas interrogé pour eux.", control: { type: "toggle", key: "display.messages" } },
					{
						name: "Semaines de devoirs à venir",
						control: { type: "slider", key: "weeksAhead", min: 1, max: 8, step: 1 },
					},
					{
						name: "Semaines de cahier de texte passées",
						control: { type: "slider", key: "weeksBack", min: 1, max: 8, step: 1 },
					},
					{
						name: "Devoirs en retard : conservés",
						desc: "Un devoir non fait reste affiché en retard pendant ce délai, puis disparaît.",
						control: {
							type: "slider",
							key: "overdueDays",
							min: 0,
							max: OVERDUE_DAYS_STEPS.length - 1,
							step: 1,
							displayFormat: (i: number) => overdueText(OVERDUE_DAYS_STEPS[i] ?? 0),
						},
					},
					{
						name: "Actualisation automatique",
						desc: "Minutes entre deux actualisations automatiques (0 = jamais, minimum 15).",
						control: { type: "number", key: "staleMinutes", min: 0, step: 1 },
					},
					{
						name: "Prévenir des nouveautés",
						desc: "Une notification dans Obsidian quand une actualisation automatique trouve un nouveau message non lu ou un nouveau devoir.",
						control: { type: "toggle", key: "notifyNew" },
					},
				],
			},
			{
				type: "group",
				heading: "Cache hors ligne",
				items: [
					{
						name: "Taille maximale du cache de fichiers",
						desc: "En Mo. 0 : aucun fichier gardé hors ligne. Les plus anciens sont supprimés quand le plafond est atteint.",
						control: { type: "slider", key: "cacheMaxMb", min: 0, max: CACHE_MAX_MB_LIMIT, step: CACHE_MAX_MB_STEP },
					},
					{
						name: "Durée de conservation du texte",
						desc: "En jours, 1 au minimum.",
						control: { type: "number", key: "cacheTextDays", min: 1, step: 1 },
					},
					{
						name: "Vider le cache",
						desc: "Supprime les textes et les fichiers gardés hors ligne. Ils sont rechargés à la prochaine actualisation.",
						searchable: false,
						render: (setting: Setting) => {
							setting.addButton((b) =>
								b
									.setButtonText("Vider le cache")
									.setDestructive()
									.onClick(async () => {
										if (!this.onClearCache) return;
										try {
											await this.onClearCache();
											new Notice("Cache vidé.");
										} catch (e) {
											new Notice(`Impossible de vider le cache : ${(e as Error).message}`);
										}
									}),
							);
						},
					},
				],
			},
			{
				type: "list",
				heading: "Rappels par matière",
				emptyState: "Aucun rappel.",
				addItem: {
					name: "Ajouter un rappel",
					action: () => {
						d.reminders.push({ subject: "", text: "" });
						void this.plugin.saveSettings().then(() => this.update());
					},
				},
				items: d.reminders.map((r, i) => ({
					name: r.subject || `Rappel ${i + 1}`,
					searchable: false,
					render: (setting: Setting) => this.renderReminder(setting, i),
				})),
			},
			{
				type: "group",
				heading: "Propriétés des notes de séance",
				items: [
					{
						name: "Propriétés ajoutées en tête de chaque note",
						desc: "Au format YAML. Variables possibles : {{matiere}}, {{eleve}}, {{date}}, {{professeur}}. Le plugin ajoute toujours date, matiere, professeur, eleve, devoir_pour, tags et pronote_id.",
						control: {
							type: "textarea",
							key: "noteProps",
							rows: 5,
							validate: (v: string) => {
								const r = parseUserProps(v, parseYaml);
								return r.error ? `YAML invalide : ${r.error}` : undefined;
							},
						},
					},
					{
						name: "Valeurs par défaut",
						desc: "Remplace les propriétés par celles du plugin.",
						action: () => {
							this.plugin.data.noteProps = DEFAULT_NOTE_PROPS;
							void this.plugin.saveSettings().then(() => this.update());
						},
					},
				],
			},
			{
				type: "group",
				heading: "Sécurité",
				items: [
					{
						name: "Jetons de connexion",
						desc: "Ils sont enregistrés dans le dossier du plugin (data.json). Ne synchronisez pas ce dossier vers un dépôt public.",
					},
				],
			},
		];
	}

	getControlValue(key: string): unknown {
		const d = this.plugin.data;
		switch (key) {
			case "syncFolder":
				return d.syncFolder;
			case "downloadFiles":
				return d.downloadFiles;
			case "mode":
				return d.mode;
			case "display.homework":
				return d.display[d.mode].homework;
			case "display.lessons":
				return d.display[d.mode].lessons;
			case "display.grades":
				return d.display[d.mode].grades;
			case "display.resources":
				return d.display[d.mode].resources;
			case "display.messages":
				return d.display[d.mode].messages;
			case "weeksAhead":
				return d.weeksAhead;
			case "weeksBack":
				return d.weeksBack;
			case "overdueDays":
				return Math.max(0, OVERDUE_DAYS_STEPS.findIndex((n) => n === normalizeOverdueDays(d.overdueDays)));
			case "staleMinutes":
				return normalizeIntervalMin(d.staleMinutes);
			case "notifyNew":
				return d.notifyNew;
			case "noteProps":
				return d.noteProps;
			case "cacheMaxMb":
				return d.cacheMaxMb;
			case "cacheTextDays":
				return d.cacheTextDays;
			default:
				return undefined;
		}
	}

	async setControlValue(key: string, value: unknown): Promise<void> {
		const d = this.plugin.data;
		switch (key) {
			case "syncFolder":
				if (typeof value === "string") d.syncFolder = value.trim() || "Pronote";
				break;
			case "downloadFiles":
				if (typeof value === "boolean") d.downloadFiles = value;
				break;
			case "mode":
				if (value === "child" || value === "parent") {
					await this.plugin.setMode(value);
					this.update();
				}
				return;
			case "display.homework":
				if (typeof value === "boolean") d.display[d.mode].homework = value;
				break;
			case "display.lessons":
				if (typeof value === "boolean") d.display[d.mode].lessons = value;
				break;
			case "display.grades":
				if (typeof value === "boolean") d.display[d.mode].grades = value;
				break;
			case "display.resources":
				if (typeof value === "boolean") d.display[d.mode].resources = value;
				break;
			case "display.messages":
				if (typeof value === "boolean") d.display[d.mode].messages = value;
				break;
			case "weeksAhead":
				if (typeof value === "number") d.weeksAhead = value;
				break;
			case "weeksBack":
				if (typeof value === "number") d.weeksBack = value;
				break;
			case "overdueDays":
				if (typeof value === "number" && Number.isInteger(value)) d.overdueDays = OVERDUE_DAYS_STEPS[value] ?? d.overdueDays;
				break;
			case "staleMinutes":
				if (typeof value === "number" && Number.isFinite(value)) d.staleMinutes = normalizeIntervalMin(value);
				break;
			case "notifyNew":
				if (typeof value === "boolean") d.notifyNew = value;
				break;
			case "noteProps":
				if (typeof value === "string") d.noteProps = value;
				break;
			case "cacheMaxMb":
				if (typeof value === "number") d.cacheMaxMb = clampCacheMb(value);
				break;
			case "cacheTextDays":
				if (typeof value === "number" && Number.isInteger(value) && value >= 1) d.cacheTextDays = value;
				break;
			default:
				return;
		}
		await this.plugin.saveSettings();
	}

	private renderReminder(setting: Setting, index: number) {
		const d = this.plugin.data;
		const reminder = d.reminders[index];
		if (!reminder) return;
		setting
			.addText((t) =>
				t
					.setPlaceholder("Matière")
					.setValue(reminder.subject)
					.onChange(async (v) => {
						reminder.subject = v.trim();
						await this.plugin.saveSettings();
					}),
			)
			.addText((t) => {
				t.setPlaceholder("Rappel")
					.setValue(reminder.text)
					.onChange(async (v) => {
						reminder.text = v.trim();
						await this.plugin.saveSettings();
					});
				t.inputEl.ariaLabel = "Texte du rappel";
			})
			.addButton((b) =>
				b
					.setIcon("trash")
					.setTooltip("Supprimer le rappel")
					.onClick(async () => {
						d.reminders.splice(index, 1);
						await this.plugin.saveSettings();
						this.update();
					}),
			);
	}

	private renderAccountRow(setting: Setting, acc: Account, removable: boolean) {
		setting.settingEl.empty();
		setting.settingEl.addClass("pronote-account");
		this.renderAccount(setting.settingEl, acc, removable);
	}

	// ------------------------------------------------------------------ un compte

	private renderAccount(card: HTMLElement, acc: Account, removable: boolean) {
		const client = this.plugin.client;
		const d = this.plugin.data;
		const connected = client.isConnected(acc);
		const state = this.draft(acc.id);
		card.addEventListener("pointerdown", () => (this.target = acc.id));

		if (removable) {
			new Setting(card)
				.setName("Retirer cet enfant")
				.setDesc("Le prénom vient de Pronote.")
				.addButton((b) =>
					b
						.setButtonText(this.confirmRemove === acc.id ? "Confirmer" : "Retirer")
						.setDestructive()
						.onClick(async () => {
							if (this.confirmRemove !== acc.id) {
								this.confirmRemove = acc.id;
								this.update();
								return;
							}
							d.parents = d.parents.filter((p) => p.id !== acc.id);
							if (d.selectedParentId === acc.id) d.selectedParentId = d.parents[0]?.id ?? "";
							this.confirmRemove = "";
							await this.plugin.saveSettings();
							await this.forgetAccount(acc.id);
							this.update();
						}),
				);
		}

		if (connected) {
			const who = acc.resources[acc.resourceIndex] ?? acc.username;
			new Setting(card)
				.setName("Connecté")
				.setDesc(who)
				.addButton((b) =>
					b.setButtonText("Se déconnecter").onClick(async () => {
						await client.logout(acc);
						await this.forgetAccount(acc.id);
						this.update();
					}),
				);

			if (acc.resources.length > 1) {
				new Setting(card)
					.setName("Enfant de ce compte")
					.setDesc("Ce compte Pronote donne accès à plusieurs élèves.")
					.addDropdown((dd) => {
						acc.resources.forEach((name, i) => dd.addOption(String(i), name));
						dd.setValue(String(acc.resourceIndex)).onChange(async (v) => {
							acc.resourceIndex = Number(v);
							acc.cache = null;
							await this.plugin.saveSettings();
						});
					});
			}
			return;
		}

		// ---- pas encore connecté : QR code
		card.createEl("p", {
			cls: "pronote-help",
			text: "Dans Pronote (web), Mon compte, Application mobile : générez le QR code et choisissez un code PIN à 4 chiffres.",
		});

		const zone = card.createDiv({ cls: "pronote-drop" });
		zone.tabIndex = 0;
		zone.createDiv({
			cls: state.qr ? "pronote-drop-ok" : "pronote-drop-text",
			text: state.qr
				? "QR code lu. Saisissez le code PIN puis connectez-vous."
				: "Collez la capture (Ctrl+V), déposez l'image ici ou choisissez un fichier.",
		});
		const row = zone.createDiv({ cls: "pronote-drop-buttons" });

		const input = row.createEl("input", { attr: { type: "file", accept: "image/*" } });
		input.addClass("pronote-hidden");
		input.onchange = () => {
			const file = input.files?.[0];
			if (file) void this.handleImage(file, acc.id);
		};

		row.createEl("button", { text: "Choisir un fichier" }).onclick = () => input.click();
		row.createEl("button", { text: "Coller l'image" }).onclick = async () => {
			try {
				for (const item of await navigator.clipboard.read()) {
					const type = item.types.find((t) => t.startsWith("image/"));
					if (type) {
						await this.handleImage(await item.getType(type), acc.id);
						return;
					}
				}
				new Notice("Aucune image dans le presse-papiers. Faites d'abord une capture d'écran.");
			} catch {
				new Notice("Collage bloqué : faites Ctrl+V directement sur cette page.");
			}
		};
		row.createEl("button", { text: "Image du coffre" }).onclick = () => {
			new VaultImageModal(this.app, (file) => {
				void this.importVaultImage(file, acc.id);
			}).open();
		};

		zone.addEventListener("dragover", (ev) => {
			ev.preventDefault();
			zone.addClass("is-over");
		});
		zone.addEventListener("dragleave", () => zone.removeClass("is-over"));
		zone.addEventListener("drop", (ev) => {
			ev.preventDefault();
			zone.removeClass("is-over");
			const file = ev.dataTransfer?.files?.[0];
			if (file) void this.handleImage(file, acc.id);
		});

		new Setting(card)
			.setName("Code PIN")
			.addText((t) => {
				t.inputEl.type = "password";
				t.inputEl.maxLength = 4;
				t.inputEl.inputMode = "numeric";
				t.setValue(state.pin).onChange((v) => (state.pin = v.trim()));
			})
			.addButton((b) =>
				b
					.setButtonText("Se connecter")
					.setCta()
					.onClick(async () => {
						if (!state.qr || state.pin.length < 4) {
							new Notice("Il faut importer le QR code et saisir le code PIN.");
							return;
						}
						b.setDisabled(true);
						try {
							await client.loginWithQr(acc, state.qr, state.pin);
							this.drafts.delete(acc.id);
							new Notice("Pronote connecté.");
							this.update();
						} catch (e) {
							new Notice(`Connexion échouée : ${(e as Error).message}`, 10000);
							b.setDisabled(false);
						}
					}),
			);

		// ---- méthodes de secours, repliées
		const more = card.createEl("details", { cls: "pronote-more" });
		more.createEl("summary", { text: "Autres méthodes de connexion" });

		new Setting(more)
			.setName("Texte du QR code")
			.setDesc("Si l'image ne se lit pas : collez le texte lu par une application de scan.")
			.addTextArea((t) => {
				t.setValue(state.qr).onChange((v) => (state.qr = v.trim()));
				t.inputEl.rows = 3;
				t.inputEl.addClass("pronote-wide-input");
			});

		more.createEl("p", {
			cls: "pronote-help",
			text: "Identifiant et mot de passe : possible seulement si l'établissement a des comptes Pronote propres. Avec e-lyco, utilisez le QR code. Le mot de passe n'est pas conservé.",
		});

		new Setting(more).setName("Adresse Pronote").addText((t) => {
			t.setPlaceholder("https://xxxxx.index-education.net/pronote").setValue(acc.url).onChange(async (v) => {
				acc.url = v.trim();
				await this.plugin.saveSettings();
			});
			t.inputEl.addClass("pronote-wide-input");
		});
		new Setting(more).setName("Type de compte").addDropdown((dd) =>
			dd
				.addOption("7", "Parent")
				.addOption("6", "Élève")
				.setValue(String(acc.kind))
				.onChange(async (v) => {
					acc.kind = Number(v);
					await this.plugin.saveSettings();
				}),
		);
		new Setting(more).setName("Identifiant").addText((t) =>
			t.setValue(acc.username).onChange(async (v) => {
				acc.username = v.trim();
				await this.plugin.saveSettings();
			}),
		);
		new Setting(more)
			.setName("Mot de passe")
			.addText((t) => {
				t.inputEl.type = "password";
				t.onChange((v) => (state.password = v));
			})
			.addButton((b) =>
				b.setButtonText("Se connecter").onClick(async () => {
					if (!acc.url || !acc.username || !state.password) {
						new Notice("Adresse, identifiant et mot de passe sont nécessaires.");
						return;
					}
					try {
						await client.loginWithPassword(acc, state.password);
						this.drafts.delete(acc.id);
						new Notice("Pronote connecté.");
						this.update();
					} catch (e) {
						new Notice(`Connexion échouée : ${(e as Error).message}`, 10000);
					}
				}),
			);
	}

	private async importVaultImage(file: TFile, accountId: string) {
		const buf = await this.app.vault.readBinary(file);
		const ext = file.extension.toLowerCase().replace("jpg", "jpeg");
		await this.handleImage(new Blob([buf], { type: `image/${ext}` }), accountId);
	}

	private async handleImage(blob: Blob, accountId: string) {
		if (!this.allAccounts.some((a) => a.id === accountId)) return;
		try {
			const text = await decodeQrFromBlob(blob);
			if (!text) {
				new Notice("QR code introuvable dans cette image. Essayez une capture plus nette, qui montre tout le QR code.");
				return;
			}
			this.draft(accountId).qr = text;
			this.target = accountId;
			new Notice("QR code lu. Saisissez le code PIN puis connectez-vous.");
			this.update();
		} catch (e) {
			new Notice(`Lecture impossible : ${(e as Error).message}`);
		}
	}
}
