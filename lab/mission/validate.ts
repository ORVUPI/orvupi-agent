import type { CardSummary, GlossaryFile, Lesson, Mission } from "./types.js";
import { checkCount } from "./engine.js";
import { ENTENDER_LINKS } from "./entender-links.js";

export type MissionIssue = string;

export function validateMission(mission: Mission, glossary: GlossaryFile, cards: readonly CardSummary[]): MissionIssue[] {
  const issues: MissionIssue[] = [];
  const ids = new Set<string>();
  const glossaryIds = new Set(glossary.entries.map((entry) => entry.id));
  const cardIds = new Set(cards.map((card) => card.mint));
  if (mission.steps.length !== 5 || checkCount(mission) !== 4) {
    issues.push("La misión tiene que tener 5 pasos, cuatro de ellos comprobaciones.");
  }
  const comprehension = mission.steps.filter((step) => step.kind === "comprehension");
  if (comprehension.length !== 1 || mission.steps.at(-1)?.kind !== "comprehension") {
    issues.push("La comprensión tiene que ser el último paso, y solo uno.");
  }
  for (const step of mission.steps) {
    if (ids.has(step.id)) {
      issues.push(`Paso repetido: ${step.id}`);
    }
    ids.add(step.id);
    if (step.prompt.es.length > 120 || step.prompt.en.length > 140) {
      issues.push(`La pregunta de ${step.id} es demasiado larga.`);
    }
    if (step.guide.es.length > 160 || step.guide.en.length > 180) {
      issues.push(`La guía de ${step.id} es demasiado larga.`);
    }
    if (!step.options.some((option) => option.id === step.correct)) {
      issues.push(`La respuesta correcta de ${step.id} no está entre las opciones.`);
    }
    for (const option of step.options) {
      if (!option.mint && (option.label.es.length > 110 || option.label.en.length > 130)) {
        issues.push(`La opción ${option.id} es demasiado larga.`);
      }
      if (option.id === step.correct) {
        continue;
      }
      if (!step.whyWrong[option.id]) {
        issues.push(`Falta la explicación de la opción ${option.id} en ${step.id}.`);
      }
    }
    for (const term of step.glossary) {
      if (!glossaryIds.has(term)) {
        issues.push(`El paso ${step.id} enlaza un término que no existe: ${term}`);
      }
    }
    for (const mint of step.cards) {
      if (!cardIds.has(mint)) {
        issues.push(`El paso ${step.id} usa un mint que no está en las fichas: ${mint}`);
      }
    }
    if (step.kind === "comprehension" && step.cards.length !== 0) {
      issues.push("El caso nuevo no debe usar una ficha real.");
    }
  }
  const registry = cards.filter((card) => card.role === "registro");
  if (registry.length !== 1) {
    issues.push("Tiene que haber un solo mint de registro.");
  }
  const first = mission.steps[0];
  const official = registry[0];
  if (first && official) {
    const correct = first.options.find((option) => option.id === first.correct);
    if (correct?.mint !== official.mint) {
      issues.push("La primera comprobación tiene que señalar el mint del registro.");
    }
  }
  return issues;
}

const LESSON_IDS = ["leccion-permisos", "leccion-reparto", "leccion-huecos"] as const;

export function validateLessons(lessons: readonly Lesson[], glossary: GlossaryFile, cards: readonly CardSummary[]): MissionIssue[] {
  const issues: MissionIssue[] = [];
  const glossaryIds = new Set(glossary.entries.map((entry) => entry.id));
  const cardIds = new Set(cards.map((card) => card.mint));
  const entenderIds = new Set(ENTENDER_LINKS.map((item) => item.id));
  if (lessons.length !== LESSON_IDS.length) {
    issues.push("Tienen que ser tres lecciones cortas.");
  }
  lessons.forEach((lesson, index) => {
    if (lesson.id !== LESSON_IDS[index]) {
      issues.push(`La lección ${index + 1} debería ser ${LESSON_IDS[index] ?? ""}.`);
    }
    if (lesson.steps.length < 2 || lesson.steps.length > 3) {
      issues.push(`La lección ${lesson.id} tiene que tener dos o tres preguntas.`);
    }
    if (lesson.entender.length < 1) {
      issues.push(`La lección ${lesson.id} no enlaza con Entender este resultado.`);
    }
    const stepIds = new Set<string>();
    for (const topic of lesson.entender) {
      if (!entenderIds.has(topic)) {
        issues.push(`La lección ${lesson.id} enlaza un tema que Verify no usa: ${topic}`);
      }
    }
    for (const step of lesson.steps) {
      if (step.kind !== "check") {
        issues.push(`La lección ${lesson.id} solo usa fichas reales.`);
      }
      if (stepIds.has(step.id)) {
        issues.push(`Paso repetido en ${lesson.id}: ${step.id}`);
      }
      stepIds.add(step.id);
      if (step.cards.length < 1) {
        issues.push(`La pregunta ${step.id} no usa una ficha.`);
      }
      if (step.prompt.es.length > 120 || step.prompt.en.length > 140) {
        issues.push(`La pregunta de ${step.id} es demasiado larga.`);
      }
      if (step.guide.es.length > 160 || step.guide.en.length > 180) {
        issues.push(`La guía de ${step.id} es demasiado larga.`);
      }
      if (!step.options.some((option) => option.id === step.correct)) {
        issues.push(`La respuesta correcta de ${step.id} no está entre las opciones.`);
      }
      for (const option of step.options) {
        if (!option.mint && (option.label.es.length > 110 || option.label.en.length > 130)) {
          issues.push(`La opción ${option.id} es demasiado larga.`);
        }
        if (option.id !== step.correct && !step.whyWrong[option.id]) {
          issues.push(`Falta la explicación de la opción ${option.id} en ${step.id}.`);
        }
      }
      for (const term of step.glossary) {
        if (!glossaryIds.has(term)) {
          issues.push(`El paso ${step.id} enlaza un término que no existe: ${term}`);
        }
      }
      for (const mint of step.cards) {
        if (!cardIds.has(mint)) {
          issues.push(`El paso ${step.id} usa un mint que no está en las fichas: ${mint}`);
        }
      }
    }
  });
  return issues;
}
