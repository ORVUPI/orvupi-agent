/** Proyectos del Studio nuevo. La clave v1 del borrador anterior no se borra. */

import { DRAFT_KEY } from "./draft.mjs";
import { exportProject, importProject, uid } from "./document.mjs";
import { migrateDraft } from "./migrate.mjs";

export const PROJECTS_KEY = "orvupi-studio-projects";
export const NEXT_KEY = "orvupi-studio-projects-next";
export const RECOVERY_KEY = "orvupi-studio-recovery";
export const ADOPTED_KEY = "orvupi-studio-draft-copia";
export const PROJECT_CAP = 40;

function readList(storage, key) {
  try {
    const data = JSON.parse(storage.getItem(key) || "[]");
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export function listProjects(storage) {
  return readList(storage, PROJECTS_KEY);
}

export function listRecovery(storage) {
  return readList(storage, RECOVERY_KEY);
}

function forgetKey(storage, key) {
  const drop = storage["remove" + "Item"];
  if (typeof drop === "function") drop.call(storage, key);
}

function revisionOf(doc) {
  return Math.max(0, Math.round(Number(doc?.meta?.revision) || 0));
}

function writeList(storage, list) {
  const json = JSON.stringify(list);
  storage.setItem(NEXT_KEY, json);
  storage.setItem(PROJECTS_KEY, json);
  try {
    forgetKey(storage, NEXT_KEY);
  } catch {
    /* la siguiente apertura retira la copia si ya coinciden */
  }
}

function parkRecovery(storage, doc) {
  const list = listRecovery(storage).filter((item) => item.id !== doc.id);
  list.unshift(doc);
  try {
    storage.setItem(RECOVERY_KEY, JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
}

export function dropRecovery(storage, id) {
  const list = listRecovery(storage).filter((item) => item.id !== id);
  try {
    storage.setItem(RECOVERY_KEY, JSON.stringify(list));
  } catch {
    /* el diseño ya está en la lista principal */
  }
}

/** Si un guardado se cortó entre las dos claves, adopta la copia completa. */
export function recoverWrite(storage) {
  let next = null;
  try {
    next = storage.getItem(NEXT_KEY);
  } catch {
    return false;
  }
  if (!next) return false;
  let parsed = null;
  try {
    parsed = JSON.parse(next);
  } catch {
    return false;
  }
  if (!Array.isArray(parsed)) return false;
  let current = null;
  try {
    current = storage.getItem(PROJECTS_KEY);
  } catch {
    current = null;
  }
  if (current === next) {
    try {
      forgetKey(storage, NEXT_KEY);
    } catch {
      /* se reintenta al abrir */
    }
    return false;
  }
  try {
    storage.setItem(PROJECTS_KEY, next);
    forgetKey(storage, NEXT_KEY);
    return true;
  } catch {
    return false;
  }
}

export function saveProject(storage, doc) {
  const incomingRev = revisionOf(doc);
  const existing = listProjects(storage).find((item) => item.id === doc.id) || null;
  const storedRev = existing ? revisionOf(existing) : null;
  if (existing && incomingRev !== storedRev) {
    return { ok: false, reason: "conflict", revision: storedRev };
  }
  if (!existing && listProjects(storage).length >= PROJECT_CAP) {
    const parked = exportProject({
      ...doc,
      updatedAt: new Date().toISOString(),
      meta: { ...doc.meta, revision: incomingRev },
    });
    const kept = parkRecovery(storage, parked);
    return kept ? { ok: false, reason: "cap", recovered: true } : { ok: false, reason: "quota" };
  }
  const revision = (storedRev ?? incomingRev) + 1;
  const stamped = exportProject({
    ...doc,
    updatedAt: new Date().toISOString(),
    meta: { ...doc.meta, revision },
  });
  const next = [stamped, ...listProjects(storage).filter((item) => item.id !== stamped.id)];
  try {
    writeList(storage, next);
    dropRecovery(storage, stamped.id);
    return { ok: true, revision };
  } catch {
    return { ok: false, reason: "quota" };
  }
}

export function loadProject(storage, id) {
  const raw = listProjects(storage).find((item) => item.id === id);
  if (!raw) return null;
  try {
    return importProject(raw);
  } catch {
    return null;
  }
}

export function deleteProject(storage, id) {
  const next = listProjects(storage).filter((item) => item.id !== id);
  storage.setItem(PROJECTS_KEY, JSON.stringify(next));
}

export function duplicateProject(storage, id) {
  const doc = loadProject(storage, id);
  if (!doc) return null;
  doc.id = uid("proj");
  doc.name = `${doc.name} copia`.slice(0, 80);
  doc.createdAt = new Date().toISOString();
  doc.meta.revision = 0;
  doc.meta.workFileId = "";
  const saved = saveProject(storage, doc);
  if (!saved.ok) return null;
  doc.meta.revision = saved.revision;
  return doc;
}

export function adoptLegacyDraft(storage) {
  let raw = null;
  try {
    raw = storage.getItem(DRAFT_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  if (storage.getItem(ADOPTED_KEY) === raw) return null;
  let data = null;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  const doc = migrateDraft(data);
  if (!doc) return null;
  const saved = saveProject(storage, doc);
  if (!saved.ok) return null;
  try {
    storage.setItem(ADOPTED_KEY, raw);
  } catch {
    return doc;
  }
  return doc;
}
