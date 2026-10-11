/**
 * Si la pasada está incompleta, «Qué falta» nombra el motivo.
 * Vive fuera del resumen de Verify: esa página no lo usa.
 */

function pair(es, en) {
  return { es, en };
}

function point(title, lead) {
  return { topic: "suministro", title, lead, detail: null, note: null };
}

export function explainIncomplete(model, gaps) {
  const block = model && Array.isArray(model.blocks) ? model.blocks.find((item) => item && item.id === "falta") : null;
  if (!block) return model;
  const reasons = Array.isArray(gaps) ? gaps : [];
  if (!Array.isArray(block.items)) block.items = [];
  for (const reason of reasons) {
    const es = reason && typeof reason.es === "string" ? reason.es : "";
    const en = reason && typeof reason.en === "string" ? reason.en : "";
    if (!es || !en) continue;
    const present = block.items.some((item) => {
      const lead = item && item.lead ? `${item.lead.es || ""} ${item.lead.en || ""}` : "";
      const note = item && item.note ? `${item.note.es || ""} ${item.note.en || ""}` : "";
      return lead.includes(es) || note.includes(es);
    });
    if (present) continue;
    block.items.push(point(pair("Lectura incompleta", "Incomplete reading"), pair(es, en)));
  }
  if (!block.items.length) {
    block.items.push(point(
      pair("Lectura incompleta", "Incomplete reading"),
      pair("Esta lectura no está completa.", "This reading is not complete."),
    ));
  }
  model.retry = true;
  return model;
}
