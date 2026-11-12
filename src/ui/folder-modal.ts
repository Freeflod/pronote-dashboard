// Choix d'un dossier du coffre pour « Enregistrer dans le coffre ».
import { FuzzySuggestModal, normalizePath, type App, type TFolder } from "obsidian";

const LAST_FOLDER_KEY = "pronote-dashboard:last-save-folder";

export function lastFolder(app: App): string | null {
	const v: unknown = app.loadLocalStorage(LAST_FOLDER_KEY);
	return typeof v === "string" ? v : null;
}

export function rememberFolder(app: App, folder: TFolder): void {
	app.saveLocalStorage(LAST_FOLDER_KEY, folder.path);
}

/** Chemin libre dans `folder` : jamais un fichier existant écrasé, suffixe « (n) » au besoin. */
export function freePath(app: App, folder: TFolder, name: string): string {
	const dot = name.lastIndexOf(".");
	const stem = dot > 0 ? name.slice(0, dot) : name;
	const ext = dot > 0 ? name.slice(dot) : "";
	const base = folder.path === "/" ? "" : `${folder.path}/`;
	let path = normalizePath(`${base}${name}`);
	for (let n = 2; app.vault.getAbstractFileByPath(path); n++) path = normalizePath(`${base}${stem} (${n})${ext}`);
	return path;
}

export interface FolderModalOptions {
	/** Dossier proposé en premier : le dernier choisi, sinon celui du réglage de pièces jointes. */
	preferred: string | null;
	/** Élément qui reprend le focus à la fermeture. */
	origin: HTMLElement;
	onChoose(folder: TFolder): void;
}

export class FolderModal extends FuzzySuggestModal<TFolder> {
	constructor(
		app: App,
		private opts: FolderModalOptions,
	) {
		super(app);
		this.setPlaceholder("Choisir un dossier du coffre");
	}

	getItems(): TFolder[] {
		const all = this.app.vault.getAllFolders(true);
		const first = all.find((f) => f.path === this.opts.preferred);
		return first ? [first, ...all.filter((f) => f !== first)] : all;
	}

	getItemText(folder: TFolder): string {
		return folder.path === "/" ? "/ (racine du coffre)" : folder.path;
	}

	onChooseItem(folder: TFolder): void {
		this.opts.onChoose(folder);
	}

	onClose(): void {
		super.onClose();
		window.setTimeout(() => this.opts.origin.focus(), 0);
	}
}
