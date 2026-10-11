export type Lang = "es" | "en";

export type Localized = {
  es: string;
  en: string;
};

export type MissionOption = {
  id: string;
  label: Localized;
  mint?: string;
};

export type MissionStep = {
  id: string;
  kind: "check" | "comprehension";
  glossary: string[];
  cards: string[];
  fields: string[];
  prompt: Localized;
  guide: Localized;
  options: MissionOption[];
  correct: string;
  whyRight: Localized;
  whyWrong: Record<string, Localized>;
};

export type Mission = {
  id: string;
  version: string;
  updated: string;
  cardDate: string;
  title: Localized;
  intro: Localized;
  closing: Localized;
  steps: MissionStep[];
};

export type Lesson = Mission & {
  entender: string[];
};

export type Progress = {
  version: 1;
  missionId: string;
  missionVersion: string;
  lang: Lang;
  solved: string[];
  attempts: Record<string, number>;
  completed: boolean;
};

export type GradeCode =
  | "correcto"
  | "incorrecto"
  | "paso_no_actual"
  | "opcion_desconocida"
  | "ya_completa";

export type Grade = {
  applied: boolean;
  code: GradeCode;
  correct: boolean;
  explanation: Localized | null;
  progress: Progress;
};

export type FieldStatus =
  | "verificado"
  | "inferido"
  | "no_disponible"
  | "no_aplica"
  | "desconocido";

export type CardRole = "registro" | "clon" | "contraste";

export type AuthorityFact = {
  state: string;
  status: FieldStatus;
};

export type CardSummary = {
  mint: string;
  role: CardRole;
  roleNote: Localized;
  id: string | null;
  createdAt: string | null;
  partial: boolean | null;
  referenceSlot: number | null;
  name: string | null;
  nameStatus: FieldStatus;
  symbol: string | null;
  inRegistry: boolean | null;
  inRegistryStatus: FieldStatus;
  mintAuthority: AuthorityFact;
  freezeAuthority: AuthorityFact;
  metadataReading: "no_mutables_en_fuentes" | "mutables" | "desconocido";
  metadataLevel: string | null;
  holdersStatus: FieldStatus;
  holdersNote: string | null;
  impersonation: boolean | null;
  authenticityLevel: string | null;
  signals: string[];
  statement: string | null;
  statementStatus: FieldStatus;
  curvePresent: boolean | null;
  curvePresentStatus: FieldStatus;
  curveProgress: string | null;
  curveProgressStatus: FieldStatus;
  curveProgressNote: string | null;
  curveModuleNote: string | null;
  rulesVersion: string | null;
};

export type GlossaryEntry = {
  id: string;
  term: Localized;
  means: Localized;
  example: Localized;
  doesNotConclude: Localized;
};

export type GlossaryFile = {
  version: string;
  updated: string;
  sourceLanguage: "es";
  entries: GlossaryEntry[];
};
