import type { Grade, Lang, Localized, Mission, MissionStep, Progress } from "./types.js";

export const STORAGE_KEY = "stubx-lab-mision-01";

export function lessonStorageKey(id: string): string {
  if (id === "mision-01") return STORAGE_KEY;
  return `stubx-lab-${id}`;
}
export const LANG_KEY = "stubx-lab-lang";

export const PROGRESS_ECONOMIC_VALUE = 0;
export const PROGRESS_IS_CERTIFICATE = false;

function record(value: unknown): Record<string, unknown> | null {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

export function initialProgress(mission: Mission, lang: Lang): Progress {
  return {
    version: 1,
    missionId: mission.id,
    missionVersion: mission.version,
    lang,
    solved: [],
    attempts: {},
    completed: false,
  };
}

export function resetProgress(mission: Mission, lang: Lang): Progress {
  return initialProgress(mission, lang);
}

export function withLang(progress: Progress, lang: Lang): Progress {
  return { ...progress, lang };
}

export function currentStep(mission: Mission, progress: Progress): MissionStep | null {
  for (const step of mission.steps) {
    if (!progress.solved.includes(step.id)) {
      return step;
    }
  }
  return null;
}

export function checkCount(mission: Mission): number {
  return mission.steps.filter((step) => step.kind === "check").length;
}

export function parseProgress(raw: unknown, mission: Mission): Progress | null {
  const row = record(raw);
  if (!row) {
    return null;
  }
  if (row.version !== 1 || row.missionId !== mission.id || row.missionVersion !== mission.version) {
    return null;
  }
  if (row.lang !== "es" && row.lang !== "en") {
    return null;
  }
  if (!Array.isArray(row.solved) || typeof row.completed !== "boolean") {
    return null;
  }
  const ids = mission.steps.map((step) => step.id);
  const solved: string[] = [];
  for (let i = 0; i < row.solved.length; i += 1) {
    if (row.solved[i] !== ids[i]) {
      return null;
    }
    const id = ids[i];
    if (!id) {
      return null;
    }
    solved.push(id);
  }
  if (row.completed !== (solved.length === mission.steps.length)) {
    return null;
  }
  const attemptsRaw = record(row.attempts);
  if (!attemptsRaw) {
    return null;
  }
  const attempts: Record<string, number> = {};
  for (const [key, value] of Object.entries(attemptsRaw)) {
    if (!ids.includes(key)) {
      return null;
    }
    if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
      return null;
    }
    attempts[key] = value;
  }
  return {
    version: 1,
    missionId: mission.id,
    missionVersion: mission.version,
    lang: row.lang,
    solved,
    attempts,
    completed: row.completed,
  };
}

export function answer(mission: Mission, progress: Progress, stepId: string, optionId: string): Grade {
  if (progress.completed) {
    return { applied: false, code: "ya_completa", correct: false, explanation: null, progress };
  }
  const step = currentStep(mission, progress);
  if (!step || step.id !== stepId) {
    return { applied: false, code: "paso_no_actual", correct: false, explanation: null, progress };
  }
  const option = step.options.find((item) => item.id === optionId);
  if (!option) {
    return { applied: false, code: "opcion_desconocida", correct: false, explanation: null, progress };
  }
  if (optionId === step.correct) {
    const solved = [...progress.solved, step.id];
    const completed = solved.length === mission.steps.length;
    const explanation: Localized = step.whyRight;
    return {
      applied: true,
      code: "correcto",
      correct: true,
      explanation,
      progress: { ...progress, solved, completed },
    };
  }
  const explanation = step.whyWrong[optionId];
  if (!explanation) {
    return { applied: false, code: "opcion_desconocida", correct: false, explanation: null, progress };
  }
  const prev = progress.attempts[step.id] ?? 0;
  return {
    applied: true,
    code: "incorrecto",
    correct: false,
    explanation,
    progress: {
      ...progress,
      attempts: { ...progress.attempts, [step.id]: prev + 1 },
    },
  };
}
