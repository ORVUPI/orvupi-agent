/** Regla de publicación de ARQIVEN. No publica nada: solo dice si un informe cumpliría el gate. */

export const PUBLICATION_RULE = {
  criticalFailures: 0,
  maxGeneralDropPoints: 1,
  maxLanguageDropPoints: 2,
  retestAfterConversion: true,
  approver: "propietario",
};

export function points(block) {
  if (!block || !block.total) return null;
  return (100 * block.pass) / block.total;
}

/** `before` y `after` son resúmenes con byBlock, byLang y critical. */
export function evaluateGate(before, after, options = {}) {
  const reasons = [];
  if ((after?.critical || 0) > PUBLICATION_RULE.criticalFailures) reasons.push("hay fallos críticos");
  const generalDrop = drop(points(before?.byBlock?.general), points(after?.byBlock?.general));
  if (generalDrop > PUBLICATION_RULE.maxGeneralDropPoints) reasons.push("el bloque general baja más de 1 punto");
  for (const lang of ["es", "en", "pt-BR", "ja", "ko"]) {
    const delta = drop(points(before?.byLang?.[lang]), points(after?.byLang?.[lang]));
    if (delta > PUBLICATION_RULE.maxLanguageDropPoints) reasons.push(`${lang} baja más de 2 puntos`);
  }
  for (const block of ["orvupi", "rag"]) {
    const prev = points(before?.byBlock?.[block]);
    const next = points(after?.byBlock?.[block]);
    if (prev != null && next != null && next + 1e-9 < prev) reasons.push(`${block} empeora`);
  }
  if (!options.improvedTarget) reasons.push("no hay mejora en un bloque objetivo");
  if (options.converted && options.retestedAfterConversion !== true) reasons.push("falta reevaluar tras la conversión");
  if (options.approvedBy !== PUBLICATION_RULE.approver) reasons.push("falta la aprobación del propietario");
  return { ok: reasons.length === 0, reasons };
}

function drop(previous, next) {
  if (previous == null || next == null) return 0;
  return previous - next;
}
