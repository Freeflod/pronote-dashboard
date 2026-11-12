export interface AttachmentDTO {
	name: string;
	url: string;
	isFile: boolean;
}

export interface HomeworkDTO {
	id: string;
	subject: string;
	color: string;
	description: string;
	deadline: string;
	done: boolean;
	length?: number;
	attachments: AttachmentDTO[];
}

export interface LessonContentDTO {
	title?: string;
	text: string;
	category?: string;
	files: AttachmentDTO[];
}

export interface LessonDTO {
	id: string;
	subject: string;
	color: string;
	start: string;
	teachers: string[];
	contents: LessonContentDTO[];
	assignmentDeadline?: string;
}

export interface GradeDTO {
	id: string;
	subject: string;
	date: string;
	value: string;
	outOf: string;
	average?: string;
	coefficient: number;
	comment: string;
}

export interface SubjectAverageDTO {
	subject: string;
	student?: string;
	classAverage?: string;
}

/** Un niveau de compétence : libellé ET abréviation (la couleur n'est jamais seule porteuse). */
export interface SkillDTO {
	id: string;
	level: string;
	abbreviation: string;
	domain: string;
	/** Intitulé précis de la compétence, s'il existe. */
	item?: string;
}

export interface SkillEvaluationDTO {
	id: string;
	name: string;
	subject: string;
	date: string;
	skills: SkillDTO[];
}

/** Résultats de la période courante : notes et compétences. Un avertissement dit ce qui n'a pas pu être lu. */
export interface ResultsDTO {
	periodName: string;
	overallAverage?: string;
	classAverage?: string;
	averages: SubjectAverageDTO[];
	grades: GradeDTO[];
	skillEvaluations: SkillEvaluationDTO[];
	warnings: string[];
	/** Partie dont la lecture a échoué : l'écran garde alors la valeur précédente (voir `mergeResults`). Absent dans un ancien cache. */
	failed?: { notes: boolean; skills: boolean };
}

export interface Snapshot {
	fetchedAt: string;
	studentName: string;
	className?: string;
	periodName?: string;
	homework: HomeworkDTO[];
	lessons: LessonDTO[];
	grades: GradeDTO[];
	averages: SubjectAverageDTO[];
	overallAverage?: string;
	overallAverageValue?: number;
	warnings: string[];
}

export type Mode = "child" | "parent";

export interface Sections {
	homework: boolean;
	lessons: boolean;
	grades: boolean;
	resources: boolean;
	messages: boolean;
}

/** Une connexion Pronote (un QR code) : le compte de l'enfant, ou un enfant en mode parent. */
export interface Account {
	id: string;
	/** Prénom affiché et nom du sous-dossier. Rempli depuis Pronote si vide. */
	name: string;
	/** 6 = élève, 7 = parent */
	kind: number;
	url: string;
	username: string;
	token: string;
	navigatorIdentifier: string;
	deviceUUID: string;
	/** Élèves rattachés à ce compte (un compte parent peut en avoir plusieurs). */
	resources: string[];
	resourceIndex: number;
	cache: Snapshot | null;
}

export const DEFAULT_NOTE_PROPS = "type: seance\nstatut: a trier";

export const CACHE_TEXT_DAYS_DEFAULT = 30;
export const CACHE_MAX_MB_DEFAULT = 50;
/** Plafond du champ : quatre fois le défaut. */
export const CACHE_MAX_MB_LIMIT = 200;
export const CACHE_MAX_MB_STEP = 50;

/** Paliers de conservation d'un devoir en retard, en jours (PD-012) ; le curseur a un cran par palier. */
export const OVERDUE_DAYS_STEPS = [0, 1, 3, 7] as const;
export const OVERDUE_DAYS_DEFAULT = 7;

/** Rappel affiché quand une matière du jour correspond (clé : matière sans casse ni accents). */
export interface Reminder {
	subject: string;
	text: string;
}

export const DEFAULT_REMINDERS: Reminder[] = [{ subject: "EPS", text: "Pense à ton sac de sport" }];

export interface PluginData {
	version: 4;
	mode: Mode;
	/** Dossier du coffre où tout est écrit. */
	syncFolder: string;
	downloadFiles: boolean;
	weeksAhead: number;
	weeksBack: number;
	/** Minutes entre deux actualisations automatiques (0 = jamais, minimum AUTO_FLOOR_MIN : PD-011). */
	staleMinutes: number;
	/** Jours pendant lesquels un devoir non fait échu reste affiché en retard (palier de OVERDUE_DAYS_STEPS : PD-012). */
	overdueDays: number;
	/** Notice dans Obsidian quand une actualisation automatique trouve du nouveau (PD-011). */
	notifyNew: boolean;
	display: Record<Mode, Sections>;
	/** Propriétés YAML ajoutées aux notes de séance. */
	noteProps: string;
	/** Mode enfant : une seule connexion. */
	child: Account;
	/** Mode parent : un compte par enfant. */
	parents: Account[];
	selectedParentId: string;
	/** clé de pièce jointe : chemin dans le coffre, suivi à travers les déplacements. */
	fileIndex: Record<string, string>;
	/** Durée de conservation du texte en cache, en jours (au moins 1). */
	cacheTextDays: number;
	/** Plafond du cache de fichiers, en Mo (0 à CACHE_MAX_MB_LIMIT, par paliers). */
	cacheMaxMb: number;
	reminders: Reminder[];
}

export function newAccount(kind = 6): Account {
	return {
		id: crypto.randomUUID(),
		name: "",
		kind,
		url: "",
		username: "",
		token: "",
		navigatorIdentifier: "",
		deviceUUID: "",
		resources: [],
		resourceIndex: 0,
		cache: null,
	};
}

export function defaultData(): PluginData {
	return {
		version: 4,
		mode: "child",
		syncFolder: "Pronote",
		downloadFiles: true,
		weeksAhead: 3,
		weeksBack: 2,
		staleMinutes: 30,
		overdueDays: OVERDUE_DAYS_DEFAULT,
		notifyNew: true,
		display: {
			child: { homework: true, lessons: true, grades: true, resources: true, messages: true },
			parent: { homework: true, lessons: false, grades: true, resources: true, messages: true },
		},
		noteProps: DEFAULT_NOTE_PROPS,
		child: newAccount(6),
		parents: [],
		selectedParentId: "",
		fileIndex: {},
		cacheTextDays: CACHE_TEXT_DAYS_DEFAULT,
		cacheMaxMb: CACHE_MAX_MB_DEFAULT,
		reminders: DEFAULT_REMINDERS.map((r) => ({ ...r })),
	};
}
