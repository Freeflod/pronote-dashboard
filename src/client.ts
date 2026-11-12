import { requestUrl } from "obsidian";
import {
	AttachmentKind,
	GradeKind,
	TabLocation,
	assignmentsFromWeek,
	assignmentStatus,
	createSessionHandle,
	discussionMessages,
	discussions,
	evaluations,
	gradesOverview,
	loginCredentials,
	loginQrCode,
	loginToken,
	resourcesFromWeek,
	timetableFromIntervals,
	translateToWeekNumber,
	use,
	type Attachment,
	type Evaluation,
	type Grade,
	type GradeValue,
	type Period,
	type RefreshInformation,
	type SessionHandle,
	type SubjectAverages,
} from "@blockshub/pawnote-lts";
import { pickPeriod } from "./periods";
import type {
	Account,
	AttachmentDTO,
	GradeDTO,
	HomeworkDTO,
	LessonDTO,
	ResultsDTO,
	Sections,
	SkillEvaluationDTO,
	Snapshot,
	SubjectAverageDTO,
} from "./types";
import { messageOptions } from "./message-options.ts";
import { discussionKey } from "./keys.ts";
import { formatPoints, friendlyName, htmlToMarkdown, startOfToday } from "./util";

export interface CollectOptions {
	weeksAhead: number;
	weeksBack: number;
	sections: Sections;
}

type Fetcher = NonNullable<Parameters<typeof createSessionHandle>[0]>;

/** Fetcher basé sur requestUrl d'Obsidian : pas de blocage CORS, fonctionne sur mobile. */
const obsidianFetcher: Fetcher = async (req) => {
	const headers: Record<string, string> = {};
	if (req.headers) {
		if (typeof Headers !== "undefined" && req.headers instanceof Headers) {
			req.headers.forEach((v, k) => (headers[k] = v));
		} else {
			Object.assign(headers, req.headers as Record<string, string>);
		}
	}
	const res = await requestUrl({
		url: req.url.toString(),
		method: req.method ?? "GET",
		body: req.content,
		headers,
		throw: false,
	});
	return { status: res.status, content: res.text, headers: res.headers };
};

const GRADE_LABELS: Record<number, string> = {
	[GradeKind.Absent]: "Abs",
	[GradeKind.Exempted]: "Disp",
	[GradeKind.NotGraded]: "N.Not",
	[GradeKind.Unfit]: "Inapte",
	[GradeKind.Unreturned]: "N.Rendu",
	[GradeKind.AbsentZero]: "Abs (0)",
	[GradeKind.UnreturnedZero]: "N.Rendu (0)",
	[GradeKind.Congratulations]: "Félicitations",
	[GradeKind.Error]: "Erreur",
};

export function formatGrade(value: GradeValue | undefined): string | undefined {
	if (!value) return undefined;
	if (value.kind === GradeKind.Grade) {
		return formatPoints(value.points);
	}
	return GRADE_LABELS[value.kind] ?? "?";
}

function toAttachment(a: Attachment): AttachmentDTO {
	return { name: a.name, url: a.url, isFile: a.kind === AttachmentKind.File };
}

function toGradeDTO(g: Grade): GradeDTO {
	return {
		id: g.id,
		subject: g.subject.name,
		date: g.date.toISOString(),
		value: formatGrade(g.value) ?? "",
		outOf: formatGrade(g.outOf) ?? "20",
		average: formatGrade(g.average),
		coefficient: g.coefficient,
		comment: g.comment,
	};
}

function toAverageDTO(a: SubjectAverages): SubjectAverageDTO {
	return { subject: a.subject.name, student: formatGrade(a.student), classAverage: formatGrade(a.class_average) };
}

function toSkillEvaluation(e: Evaluation): SkillEvaluationDTO {
	return {
		id: e.id,
		name: e.name,
		subject: e.subject.name,
		date: e.date.toISOString(),
		skills: [...e.skills]
			.sort((a, b) => a.order - b.order)
			.map((k) => ({ id: k.id, level: k.level, abbreviation: k.abbreviation, domain: k.domainName, item: k.itemName })),
	};
}

/** Nombre maximal de notes et d'évaluations gardées, les plus récentes d'abord. */
const RESULTS_LIMIT = 20;

/** Période de l'onglet Pronote de l'élève courant (`session.userResource`), avec le repli de `pickPeriod`. */
function periodOf(session: SessionHandle, location: typeof TabLocation.Grades | typeof TabLocation.Evaluations): Period | undefined {
	const tab = session.userResource.tabs.get(location);
	return pickPeriod(tab?.defaultPeriod, tab?.periods.length ? tab.periods : session.instance.periods, Date.now());
}

export interface DiscussionDTO {
	/** Identifiant interne Pronote (participantsMessageID) : sert à retrouver la discussion. */
	id: string;
	subject: string;
	date: string;
	creator?: string;
	recipientName?: string;
	numberOfMessages: number;
	numberOfMessagesUnread: number;
	closed: boolean;
}

export interface MessageDTO {
	id: string;
	/** Texte converti par htmlToMarkdown. */
	text: string;
	date: string;
	/** Absent quand l'auteur est l'utilisateur lui-même. */
	author?: string;
	files: AttachmentDTO[];
}

export interface TimetableEntryDTO {
	id: string;
	kind: "lesson" | "activity" | "detention";
	title: string;
	color?: string;
	start: string;
	end: string;
	teachers: string[];
	rooms: string[];
	canceled: boolean;
	/** Contrôle annoncé (leçons seulement). */
	test: boolean;
	status?: string;
}

function toHomework(a: Awaited<ReturnType<typeof assignmentsFromWeek>>[number]): HomeworkDTO {
	return {
		id: a.id,
		subject: a.subject.name,
		color: a.backgroundColor,
		description: htmlToMarkdown(a.description),
		deadline: a.deadline.toISOString(),
		done: a.done,
		length: a.length,
		attachments: a.attachments.map(toAttachment),
	};
}

function toLesson(r: Awaited<ReturnType<typeof resourcesFromWeek>>[number]): LessonDTO {
	return {
		id: r.id,
		subject: r.subject.name,
		color: r.backgroundColor,
		start: r.startDate.toISOString(),
		teachers: r.teachers,
		assignmentDeadline: r.assignmentDeadline?.toISOString(),
		contents: r.contents.map((c) => ({
			title: c.title,
			text: htmlToMarkdown(c.description),
			category: c.categoryText,
			files: c.files.map(toAttachment),
		})),
	};
}

function keyOfDiscussion(d: Awaited<ReturnType<typeof discussions>>["items"][number]): string {
	return discussionKey({ subject: d.subject, date: d.date.toISOString(), creator: d.creator });
}

function toDiscussion(d: Awaited<ReturnType<typeof discussions>>["items"][number]): DiscussionDTO {
	return {
		id: keyOfDiscussion(d),
		subject: d.subject,
		date: d.date.toISOString(),
		creator: d.creator,
		recipientName: d.recipientName,
		numberOfMessages: d.numberOfMessages,
		numberOfMessagesUnread: d.numberOfMessagesUnread,
		closed: d.closed,
	};
}

export class PronoteClient {
	private queue: Promise<unknown> = Promise.resolve();

	constructor(private save: () => Promise<void>) {}

	isConnected(a: Account): boolean {
		return !!(a.token && a.url && a.username);
	}

	private async remember(a: Account, info: RefreshInformation, session: SessionHandle) {
		a.url = info.url;
		a.token = info.token;
		a.username = info.username;
		a.kind = info.kind;
		a.navigatorIdentifier = info.navigatorIdentifier;
		a.resources = session.user.resources.map((r) => r.name);
		if (a.resourceIndex >= a.resources.length) a.resourceIndex = 0;
		if (!a.name.trim()) a.name = friendlyName(a.resources[a.resourceIndex] ?? "");
		await this.save();
	}

	private ensureDevice(a: Account) {
		if (!a.deviceUUID) a.deviceUUID = crypto.randomUUID();
		return a.deviceUUID;
	}

	/** Première connexion à partir du contenu du QR code et du code PIN. */
	async loginWithQr(a: Account, qrText: string, pin: string): Promise<void> {
		let qr: unknown;
		try {
			qr = JSON.parse(qrText);
		} catch {
			throw new Error("Le contenu du QR code n'est pas un JSON valide.");
		}
		const deviceUUID = this.ensureDevice(a);
		const session = createSessionHandle(obsidianFetcher);
		const info = await loginQrCode(session, { deviceUUID, pin, qr });
		await this.remember(a, info, session);
	}

	/** Connexion par identifiant et mot de passe (le mot de passe n'est pas conservé). */
	async loginWithPassword(a: Account, password: string): Promise<void> {
		const deviceUUID = this.ensureDevice(a);
		const session = createSessionHandle(obsidianFetcher);
		const info = await loginCredentials(session, {
			url: a.url,
			username: a.username,
			password,
			kind: a.kind as 6 | 7,
			deviceUUID,
		});
		await this.remember(a, info, session);
	}

	async logout(a: Account) {
		a.token = "";
		a.username = "";
		a.resources = [];
		a.resourceIndex = 0;
		a.cache = null;
		await this.save();
	}

	/**
	 * Ouvre une session avec le jeton enregistré. Le jeton est renouvelé à chaque
	 * connexion, donc les sessions sont exécutées une par une.
	 */
	run<T>(a: Account, fn: (session: SessionHandle, account: Account) => Promise<T>): Promise<T> {
		const job = this.queue.then(async () => {
			if (!this.isConnected(a)) {
				throw new Error("Pronote n'est pas connecté. Ouvrez les réglages du plugin.");
			}
			const session = createSessionHandle(obsidianFetcher);
			const info = await loginToken(session, {
				url: a.url,
				kind: a.kind as 6 | 7,
				username: a.username,
				token: a.token,
				deviceUUID: this.ensureDevice(a),
				navigatorIdentifier: a.navigatorIdentifier || undefined,
			});
			await this.remember(a, info, session);
			if (a.resourceIndex > 0 && a.resourceIndex < session.user.resources.length) {
				use(session, a.resourceIndex);
			}
			return fn(session, a);
		});
		this.queue = job.catch(() => undefined);
		return job;
	}

	/** Devoirs de la semaine courante à `weeksAhead` semaines plus tard, par échéance. */
	async fetchHomework(session: SessionHandle, weeksAhead: number): Promise<HomeworkDTO[]> {
		const week = translateToWeekNumber(new Date(), session.instance.firstMonday);
		const list = await assignmentsFromWeek(session, week, week + weeksAhead);
		return list
			.sort((a, b) => a.deadline.getTime() - b.deadline.getTime())
			.map(toHomework);
	}

	/** Emploi du temps entre deux dates (toutes classes : leçon, activité, retenue). */
	async fetchTimetable(
		session: SessionHandle,
		start: Date,
		end: Date,
	): Promise<TimetableEntryDTO[]> {
		const table = await timetableFromIntervals(session, start, end);
		return table.classes
			.map((c): TimetableEntryDTO => {
				if (c.is === "lesson") {
					return {
						id: c.id,
						kind: "lesson",
						title: c.subject?.name ?? "",
						color: c.backgroundColor,
						start: c.startDate.toISOString(),
						end: c.endDate.toISOString(),
						teachers: c.teacherNames,
						rooms: c.classrooms,
						canceled: c.canceled,
						test: c.test,
						status: c.status,
					};
				}
				return {
					id: c.id,
					kind: c.is,
					title: c.title ?? "",
					color: c.backgroundColor,
					start: c.startDate.toISOString(),
					end: c.endDate.toISOString(),
					teachers: c.is === "detention" ? c.teacherNames : [],
					rooms: c.is === "detention" ? c.classrooms : [],
					canceled: false,
					test: false,
				};
			})
			.sort((a, b) => a.start.localeCompare(b.start));
	}

	/** Contenus de séance (cahier de texte) des `weeksBack` dernières semaines. */
	async fetchLessonContents(session: SessionHandle, weeksBack: number): Promise<LessonDTO[]> {
		const week = translateToWeekNumber(new Date(), session.instance.firstMonday);
		const list = await resourcesFromWeek(session, Math.max(1, week - weeksBack), week);
		return list
			.filter((r) => r.contents.length > 0)
			.sort((a, b) => b.startDate.getTime() - a.startDate.getTime())
			.map(toLesson);
	}

	/** Liste des discussions. Ne lit aucun message : rien n'est marqué comme lu. */
	async fetchDiscussions(session: SessionHandle): Promise<DiscussionDTO[]> {
		const list = await discussions(session);
		return list.items.map(toDiscussion);
	}

	/**
	 * Résultats de la période courante : notes et compétences, dans la session déjà ouverte (lecture seule).
	 * Si l'une des deux lectures échoue, l'autre est gardée et un avertissement le dit ; si les deux échouent, erreur.
	 */
	async fetchResults(session: SessionHandle): Promise<ResultsDTO> {
		const period = periodOf(session, TabLocation.Grades);
		const results: ResultsDTO = { periodName: period?.name ?? "", averages: [], grades: [], skillEvaluations: [], warnings: [] };
		if (!period) return results;
		const failures: string[] = [];
		const failed = { notes: false, skills: false };
		try {
			const overview = await gradesOverview(session, period);
			results.overallAverage = formatGrade(overview.overallAverage);
			results.classAverage = formatGrade(overview.classAverage);
			results.averages = overview.subjectsAverages.map(toAverageDTO);
			results.grades = [...overview.grades].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, RESULTS_LIMIT).map(toGradeDTO);
		} catch (e) {
			failed.notes = true;
			failures.push(`Notes indisponibles : ${(e as Error).message}`);
		}
		try {
			const list = await evaluations(session, periodOf(session, TabLocation.Evaluations) ?? period);
			results.skillEvaluations = list
				.filter((e) => e.skills.length > 0)
				.sort((a, b) => b.date.getTime() - a.date.getTime())
				.slice(0, RESULTS_LIMIT)
				.map(toSkillEvaluation);
		} catch (e) {
			failed.skills = true;
			failures.push(`Compétences indisponibles : ${(e as Error).message}`);
		}
		if (failures.length === 2) {
			throw new Error(failures.join(" "));
		}
		results.warnings = failures;
		results.failed = failed;
		return results;
	}

	/**
	 * Ouvre une discussion : SEUL appel qui marque comme lu (ouverture explicite par l'enfant).
	 * `id` est le `DiscussionDTO.id`.
	 */
	async readMessage(session: SessionHandle, id: string): Promise<MessageDTO[]> {
		const list = await discussions(session);
		const discussion = list.items.find((d) => keyOfDiscussion(d) === id);
		if (!discussion) throw new Error("Discussion introuvable.");
		const { markAsRead } = messageOptions("open");
		const res = await discussionMessages(session, discussion, markAsRead);
		return res.sents
			.map(
				(m): MessageDTO => ({
					id: m.id,
					text: htmlToMarkdown(m.content),
					date: m.creationDate.toISOString(),
					author: m.author?.name,
					files: m.files.map(toAttachment),
				}),
			)
			.sort((a, b) => a.date.localeCompare(b.date));
	}

	/** Écrit l'état « fait » d'un devoir dans Pronote. */
	async setHomeworkDone(session: SessionHandle, id: string, done: boolean): Promise<void> {
		await assignmentStatus(session, id, done);
	}

	/** Récupère devoirs, cahier de texte et notes. Chaque bloc échoue séparément. */
	async collect(session: SessionHandle, _a: Account, s: CollectOptions): Promise<Snapshot> {
		const warnings: string[] = [];
		const week = translateToWeekNumber(new Date(), session.instance.firstMonday);

		const snapshot: Snapshot = {
			fetchedAt: new Date().toISOString(),
			studentName: session.userResource.name,
			className: session.userResource.className,
			homework: [],
			lessons: [],
			grades: [],
			averages: [],
			warnings,
		};

		if (s.sections.homework) try {
			const list = await assignmentsFromWeek(session, week, week + s.weeksAhead);
			const today = startOfToday().getTime();
			snapshot.homework = list
				.filter((a) => !a.done || a.deadline.getTime() >= today)
				.sort((a, b) => a.deadline.getTime() - b.deadline.getTime())
				.map(toHomework);
		} catch (e) {
			warnings.push(`Devoirs indisponibles : ${(e as Error).message}`);
		}

		if (s.sections.lessons) try {
			const list = await resourcesFromWeek(session, Math.max(1, week - s.weeksBack), week);
			snapshot.lessons = list
				.filter((r) => r.contents.length > 0)
				.sort((a, b) => b.startDate.getTime() - a.startDate.getTime())
				.map(toLesson);
		} catch (e) {
			warnings.push(`Cahier de texte indisponible : ${(e as Error).message}`);
		}

		if (s.sections.grades) try {
			const period = periodOf(session, TabLocation.Grades);
			if (period) {
				snapshot.periodName = period.name;
				const overview = await gradesOverview(session, period);
				snapshot.overallAverage = formatGrade(overview.overallAverage);
				if (overview.overallAverage?.kind === GradeKind.Grade) {
					snapshot.overallAverageValue = overview.overallAverage.points;
				}
				snapshot.grades = [...overview.grades]
					.sort((a, b) => b.date.getTime() - a.date.getTime())
					.slice(0, 30)
					.map(toGradeDTO);
				snapshot.averages = overview.subjectsAverages.map(toAverageDTO);
			}
		} catch (e) {
			warnings.push(`Notes indisponibles : ${(e as Error).message}`);
		}

		return snapshot;
	}
}
