// Pièce jointe : « Ouvrir » (cache puis téléchargement) et « Enregistrer dans le coffre ».
import { Notice, setIcon, type App } from "obsidian";
import type { AttachmentResult, Repository } from "../data/repository.ts";
import type { AttachmentDTO } from "../types.ts";
import { sanitizeFileName } from "../util.ts";
import { FolderModal, freePath, lastFolder, rememberFolder } from "./folder-modal.ts";
import { isSafeExternalUrl, mimeOf, previewKind } from "./format.ts";
import { PreviewModal } from "./preview-modal.ts";

export interface AttachmentDeps {
	app: App;
	repo: Pick<Repository, "attachment">;
	/** Clé `account.id:élève`. */
	key: string;
	/** Clé stable (homeworkKey ou lessonKey) du devoir ou de la séance qui porte la pièce. */
	ownerKey: string;
	announce(message: string): void;
}

function parentPath(path: string): string {
	const i = path.lastIndexOf("/");
	return i < 0 ? "/" : path.slice(0, i);
}

export function renderAttachment(el: HTMLElement, file: AttachmentDTO, deps: AttachmentDeps): void {
	const row = el.createDiv({ cls: "pronote-attachment" });

	if (!file.isFile) {
		if (isSafeExternalUrl(file.url)) {
			const link = row.createEl("a", {
				cls: "pronote-link pronote-attachment-open",
				attr: { href: file.url, target: "_blank", rel: "noopener noreferrer", "aria-label": `Ouvrir le lien : ${file.name}` },
			});
			setIcon(link.createSpan({ cls: "pronote-attachment-icon", attr: { "aria-hidden": "true" } }), "external-link");
			link.createSpan({ cls: "pronote-attachment-name", text: file.name });
		} else {
			row.createSpan({ cls: "pronote-attachment-name", text: file.name });
		}
		return;
	}

	const fetchFile = async (button: HTMLButtonElement): Promise<Extract<AttachmentResult, { kind: "ok" }> | null> => {
		button.disabled = true;
		deps.announce(`Récupération de ${file.name}…`);
		const res = await deps.repo.attachment(deps.key, deps.ownerKey, file);
		button.disabled = false;
		if (res.kind === "error") {
			deps.announce(res.message);
			return null;
		}
		if (res.tooBig) deps.announce("Fichier trop gros pour le cache : ouvert sans être conservé.");
		return res;
	};

	const open = row.createEl("button", {
		cls: "pronote-button-plain pronote-attachment-open",
		attr: { type: "button", "aria-label": `Ouvrir ${file.name}`, "data-focus": `open:${file.name}` },
	});
	setIcon(open.createSpan({ cls: "pronote-attachment-icon", attr: { "aria-hidden": "true" } }), "file");
	open.createSpan({ cls: "pronote-attachment-name", text: file.name });
	open.addEventListener("click", () => {
		const kind = previewKind(file.name);
		if (kind === "none") {
			deps.announce("Pas d'aperçu pour ce type de fichier : utilise « Enregistrer dans le coffre ».");
			return;
		}
		void fetchFile(open).then((res) => {
			if (!res) return;
			new PreviewModal(deps.app, { name: file.name, kind, mime: mimeOf(file.name), data: res.data }).open();
		});
	});

	const save = row.createEl("button", {
		cls: "clickable-icon pronote-attachment-save",
		attr: { type: "button", "aria-label": `Enregistrer dans le coffre : ${file.name}`, title: "Enregistrer dans le coffre", "data-focus": `save:${file.name}` },
	});
	setIcon(save, "download");
	save.addEventListener("click", () => {
		void fetchFile(save)
			.then(async (res) => {
				if (!res) return;
				const { app } = deps;
				const name = sanitizeFileName(file.name);
				const defaultPath = await app.fileManager.getAvailablePathForAttachment(name, app.workspace.getActiveFile()?.path);
				new FolderModal(app, {
					preferred: lastFolder(app) ?? parentPath(defaultPath),
					origin: save,
					onChoose: (folder) => {
						const path = folder.path === parentPath(defaultPath) ? defaultPath : freePath(app, folder, name);
						app.vault.createBinary(path, res.data).then(
							() => {
								rememberFolder(app, folder);
								deps.announce(`Enregistré dans le coffre : ${path}`);
								new Notice(`Enregistré : ${path}`);
							},
							(e: unknown) => deps.announce(`Enregistrement impossible : ${e instanceof Error ? e.message : String(e)}`),
						);
					},
				}).open();
			})
			.catch((e: unknown) => deps.announce(`Enregistrement impossible : ${e instanceof Error ? e.message : String(e)}`));
	});
}
