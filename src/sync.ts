import { TFile, normalizePath, requestUrl, type App } from "obsidian";
import {
	PROPERTY_TYPES,
	Raw,
	dateValue,
	renderFrontmatter,
	substitute,
	toList,
	type Props,
} from "./props";
import { homeworkKey, lessonKey } from "./keys";
import type { Account, AttachmentDTO, Mode, PluginData, Sections, Snapshot } from "./types";
import {
	escapeCell,
	frDate,
	friendlyName,
	isoDay,
	localDateTime,
	sanitizeFileName,
	sanitizeName,
	slugTag,
	unique,
} from "./util";

// ---------------------------------------------------------------- chemins

/** Dossier de l'enfant : la racine en mode enfant, un sous-dossier par enfant en mode parent. */
export function accountFolder(data: PluginData, mode: Mode, a: Account): string {
	const root = normalizePath(data.syncFolder || "Pronote");
	return mode === "parent" ? `${root}/${sanitizeName(a.name || "Enfant")}` : root;
}

function uniquePath(app: App, path: string): string {
	if (!app.vault.getAbstractFileByPath(path)) return path;
	const slash = path.lastIndexOf("/");
	const dot = path.lastIndexOf(".");
	const hasExt = dot > slash;
	const base = hasExt ? path.slice(0, dot) : path;
	const ext = hasExt ? path.slice(dot) : "";
	for (let i = 2; i < 100; i++) {
		const candidate = `${base} ${i}${ext}`;
		if (!app.vault.getAbstractFileByPath(candidate)) return candidate;
	}
	return `${base} ${Date.now()}${ext}`;
}

async function ensureFolder(app: App, path: string) {
	let current = "";
	for (const part of normalizePath(path).split("/")) {
		current = current ? `${current}/${part}` : part;
		if (!app.vault.getAbstractFileByPath(current)) await app.vault.createFolder(current);
	}
}

// ---------------------------------------------------------------- suivi des fichiers

export function fileKey(a: Account, ownerId: string, name: string): string {
	return `${a.id}|${ownerId}|${name}`;
}

/**
 * Retrouve une pièce jointe déjà téléchargée, même si elle a été déplacée ou renommée.
 * Le chemin suivi est mis à jour à chaque renommage dans Obsidian. Si le fichier a bougé
 * pendant qu'Obsidian était fermé, on le retrouve par son nom, à condition qu'il soit unique.
 */
export function lookupFile(app: App, data: PluginData, key: string, name: string): TFile | null {
	const path = data.fileIndex[key];
	if (!path) return null;
	const direct = app.vault.getAbstractFileByPath(path);
	if (direct instanceof TFile) return direct;
	const wanted = sanitizeFileName(name);
	const hits = app.vault.getFiles().filter((f) => f.name === wanted || f.name.endsWith(` ${wanted}`));
	if (hits.length === 1) {
		data.fileIndex[key] = hits[0].path;
		return hits[0];
	}
	return null;
}

async function downloadInto(
	app: App,
	data: PluginData,
	a: Account,
	ownerId: string,
	base: string,
	subject: string,
	day: string,
	file: AttachmentDTO,
	counter: { files: number },
): Promise<TFile | null> {
	const key = fileKey(a, ownerId, file.name);
	const known = lookupFile(app, data, key, file.name);
	if (known) return known;
	if (!data.downloadFiles) return null;
	try {
		const res = await requestUrl({ url: file.url, throw: false });
		if (res.status !== 200) return null;
		const dir = `${base}/Pièces jointes/${sanitizeName(subject)}`;
		await ensureFolder(app, dir);
		const path = uniquePath(app, `${dir}/${day} ${sanitizeFileName(file.name)}`);
		const created = await app.vault.createBinary(path, res.arrayBuffer);
		data.fileIndex[key] = created.path;
		counter.files++;
		return created;
	} catch {
		return null;
	}
}

// ---------------------------------------------------------------- suivi des notes

/** Retrouve les notes déjà créées, où qu'elles soient dans le coffre, grâce à la propriété pronote_id. */
function indexNotes(app: App): Map<string, TFile> {
	const map = new Map<string, TFile>();
	for (const f of app.vault.getMarkdownFiles()) {
		const id: unknown = app.metadataCache.getFileCache(f)?.frontmatter?.pronote_id;
		if (typeof id === "string") map.set(id, f);
	}
	return map;
}

/** API interne d'Obsidian (absente des types publics) : types des propriétés du coffre. */
interface MetadataTypeManager {
	getAssignedType(name: string): unknown;
	setType(name: string, type: string): unknown;
}

function metadataTypeManager(app: App): MetadataTypeManager | null {
	const mtm: unknown = Reflect.get(app, "metadataTypeManager");
	if (!mtm || typeof mtm !== "object") return null;
	const m = mtm as Partial<MetadataTypeManager>;
	return typeof m.getAssignedType === "function" && typeof m.setType === "function"
		? (m as MetadataTypeManager)
		: null;
}

/** Enregistre les types de propriétés (date, liste, nombre) sans toucher à ceux que vous avez déjà choisis. */
async function ensurePropertyTypes(app: App) {
	const mtm = metadataTypeManager(app);
	if (!mtm) return;
	for (const [name, type] of Object.entries(PROPERTY_TYPES)) {
		try {
			if (!mtm.getAssignedType(name)) await mtm.setType(name, type);
		} catch {
			/* type non enregistrable : les valeurs restent lisibles en texte */
		}
	}
}

// ---------------------------------------------------------------- synchro

export interface SyncResult {
	notes: number;
	files: number;
}

export async function syncAccount(
	app: App,
	data: PluginData,
	a: Account,
	mode: Mode,
	snap: Snapshot,
	sections: Sections,
	userProps: Props,
): Promise<SyncResult> {
	await ensurePropertyTypes(app);
	const base = accountFolder(data, mode, a);
	await ensureFolder(app, base);

	const prefix = a.id.slice(0, 8);
	const eleve = a.name || friendlyName(snap.studentName);
	const eleveTag = slugTag(eleve);
	const index = indexNotes(app);
	const counter = { files: 0 };
	let notes = 0;

	const writeGenerated = async (
		suffix: string,
		fileName: string,
		props: Props,
		body: string,
	) => {
		const id = `${prefix}:${suffix}`;
		const content = `${renderFrontmatter({ ...props, pronote_id: id })}\n${body}`;
		const existing = index.get(id);
		if (existing) await app.vault.modify(existing, content);
		else await app.vault.create(uniquePath(app, `${base}/${fileName}`), content);
	};

	const stamp = { date: dateValue(isoDay(new Date())), maj: new Raw(localDateTime()) };
	const baseTags = (kind: string) =>
		unique(["pronote", `pronote/${kind}`, ...(mode === "parent" && eleveTag ? [`eleve/${eleveTag}`] : [])]);

	if (sections.homework) {
		const todo = snap.homework.filter((h) => !h.done).length;
		const rows: string[] = [];
		for (const h of snap.homework) {
			const links: string[] = [];
			for (const f of h.attachments) {
				if (!f.isFile) {
					links.push(`[${f.name}](${f.url})`);
					continue;
				}
				const tf = await downloadInto(app, data, a, homeworkKey(h), base, h.subject, isoDay(h.deadline), f, counter);
				if (tf) links.push(app.fileManager.generateMarkdownLink(tf, `${base}/Devoirs.md`));
			}
			const work = [escapeCell(h.description) || "(sans détail)", ...links.map(escapeCell)].join(" ");
			rows.push(
				`| ${frDate(h.deadline, true)} | ${escapeCell(h.subject)} | ${work} | ${h.done ? "oui" : "non"} |`,
			);
		}
		await writeGenerated(
			"devoirs",
			"Devoirs.md",
			{ type: "dashboard", ...stamp, eleve, a_faire: todo, tags: baseTags("devoirs") },
			[
				"> [!info] Note générée par le plugin Pronote, remplacée à chaque synchronisation.",
				"",
				"| Pour le | Matière | Travail | Fait |",
				"| --- | --- | --- | --- |",
				...(rows.length ? rows : ["| | | Aucun devoir à venir | |"]),
				"",
			].join("\n"),
		);
	}

	if (sections.grades) {
		const gradeRows = snap.grades.map(
			(g) =>
				`| ${isoDay(g.date)} | ${escapeCell(g.subject)} | ${g.value}/${g.outOf} | ${g.average ?? ""} | ${g.coefficient} | ${escapeCell(g.comment)} |`,
		);
		const avgRows = snap.averages.map(
			(x) => `| ${escapeCell(x.subject)} | ${x.student ?? ""} | ${x.classAverage ?? ""} |`,
		);
		await writeGenerated(
			"notes",
			"Notes.md",
			{
				type: "dashboard",
				...stamp,
				eleve,
				periode: snap.periodName,
				moyenne: snap.overallAverageValue,
				tags: baseTags("notes"),
			},
			[
				"> [!info] Note générée par le plugin Pronote, remplacée à chaque synchronisation.",
				"",
				"## Dernières notes",
				"",
				"| Date | Matière | Note | Moyenne classe | Coef | Commentaire |",
				"| --- | --- | --- | --- | --- | --- |",
				...(gradeRows.length ? gradeRows : ["| | | Aucune note | | | |"]),
				"",
				"## Moyennes par matière",
				"",
				"| Matière | Élève | Classe |",
				"| --- | --- | --- |",
				...(avgRows.length ? avgRows : ["| Aucune moyenne | | |"]),
				"",
			].join("\n"),
		);
	}

	if (sections.lessons) {
		for (const lesson of snap.lessons) {
			const key = lessonKey(lesson);
			const id = `${prefix}:${key}`;
			if (index.has(id)) continue; // déjà synchronisée, éventuellement rangée ailleurs : on n'y touche pas

			const subject = sanitizeName(lesson.subject);
			const day = isoDay(lesson.start);
			const dir = `${base}/Séances/${subject}`;
			await ensureFolder(app, dir);
			const notePath = uniquePath(app, `${dir}/${day} ${subject}.md`);

			const vars = {
				matiere: lesson.subject,
				eleve,
				date: day,
				professeur: lesson.teachers.join(", "),
			};
			const custom: Props = {};
			for (const [k, v] of Object.entries(userProps)) {
				if (v !== null && v !== undefined) custom[k] = substitute(v, vars);
			}
			const customTags = toList(custom.tags);
			delete custom.tags;

			const props: Props = {
				...custom,
				date: dateValue(day),
				matiere: lesson.subject,
				professeur: lesson.teachers,
				eleve,
				devoir_pour: lesson.assignmentDeadline ? dateValue(isoDay(lesson.assignmentDeadline)) : undefined,
				tags: unique([
					"pronote/seance",
					`matiere/${slugTag(lesson.subject)}`,
					...(mode === "parent" && eleveTag ? [`eleve/${eleveTag}`] : []),
					...customTags,
				]),
				pronote_id: id,
			};

			// Pas de titre H1 : le nom du fichier fait office de titre.
			const parts: string[] = [renderFrontmatter(props), ""];
			for (const c of lesson.contents) {
				const heading = [c.title, c.category].filter(Boolean).join(" : ");
				if (heading) parts.push(`## ${heading}`, "");
				if (c.text) parts.push(c.text, "");
				if (c.files.length) {
					parts.push("### Ressources", "");
					for (const f of c.files) {
						if (!f.isFile) {
							parts.push(`- [${f.name}](${f.url})`);
							continue;
						}
						const tf = await downloadInto(app, data, a, key, base, lesson.subject, day, f, counter);
						parts.push(
							tf
								? `- ${app.fileManager.generateMarkdownLink(tf, notePath)}`
								: `- ${f.name} (non téléchargé)`,
						);
					}
					parts.push("");
				}
			}
			if (lesson.assignmentDeadline) {
				parts.push(`Travail à rendre pour le ${frDate(lesson.assignmentDeadline)}.`, "");
			}

			await app.vault.create(notePath, parts.join("\n"));
			notes++;
		}
	}

	return { notes, files: counter.files };
}
