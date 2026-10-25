/** Historial local de revisiones del diseño. Solo este navegador. Sin colaboración remota. */

export const HISTORY_KEY = "orvupi-studio-history";
export const HISTORY_CAP = 20;
export const HISTORY_COST = {
  es: "Hasta 20 instantáneas por diseño en localStorage. Cada una guarda el JSON del documento (sin bytes de imagen). Si la cuota se llena, se descartan las más antiguas. No hay colaboración entre dispositivos ni usuarios: eso exigiría identidad y almacenamiento remoto con coste.",
  en: "Up to 20 snapshots per design in localStorage. Each stores the document JSON (without image bytes). If quota is full, older ones are dropped. There is no collaboration across devices or users: that would need identity and paid remote storage.",
};

function bag(storage) {
  try {
    const raw = storage?.getItem?.(HISTORY_KEY);
    if (!raw) return {};
    const data = JSON.parse(raw);
    return data && typeof data === "object" && !Array.isArray(data) ? data : {};
  } catch {
    return {};
  }
}

function write(storage, data) {
  try {
    storage.setItem(HISTORY_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function listHistory(storage, projectId) {
  const all = bag(storage);
  const list = Array.isArray(all[projectId]) ? all[projectId] : [];
  return list.map((item) => ({
    id: item.id,
    at: item.at,
    name: item.name || "",
    revision: Number(item.revision) || 0,
  }));
}

export function pushHistory(storage, doc) {
  if (!storage || !doc?.id) return { ok: false, reason: "missing" };
  const all = bag(storage);
  const list = Array.isArray(all[doc.id]) ? all[doc.id].slice() : [];
  const entry = {
    id: `hist_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    at: new Date().toISOString(),
    name: String(doc.name || "").slice(0, 80),
    revision: Number(doc.meta?.revision) || 0,
    doc: JSON.parse(JSON.stringify(doc)),
  };
  list.unshift(entry);
  all[doc.id] = list.slice(0, HISTORY_CAP);
  if (!write(storage, all)) {
    // Cuota llena: dejar solo 5 y reintentar.
    all[doc.id] = list.slice(0, 5);
    if (!write(storage, all)) return { ok: false, reason: "quota" };
  }
  return { ok: true, id: entry.id, kept: all[doc.id].length };
}

export function loadHistory(storage, projectId, historyId) {
  const all = bag(storage);
  const list = Array.isArray(all[projectId]) ? all[projectId] : [];
  const entry = list.find((item) => item.id === historyId);
  return entry?.doc || null;
}

export function clearHistory(storage, projectId) {
  const all = bag(storage);
  delete all[projectId];
  return write(storage, all);
}
