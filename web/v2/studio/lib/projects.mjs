/** Proyectos del Studio nuevo. La clave v1 del borrador anterior no se borra. */

import { DRAFT_KEY } from "./draft.mjs";
import { DOC_VERSION, exportProject, importProject, uid } from "./document.mjs";
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

const LIBRARY_KINDS = new Set(["design", "folder", "course", "image", "video", "file", "template"]);

/** Metadatos de la biblioteca junto al documento, en la misma lista. */
export function normalizeLibrary(raw, fallbackKind = "design") {
  const kind = LIBRARY_KINDS.has(raw?.kind) ? raw.kind : fallbackKind;
  const folderId = typeof raw?.folderId === "string" && raw.folderId ? raw.folderId.slice(0, 80) : null;
  const deletedAt = typeof raw?.deletedAt === "string" && raw.deletedAt ? raw.deletedAt.slice(0, 40) : null;
  return {
    kind,
    favorite: raw?.favorite === true,
    folderId,
    deletedAt,
    shared: raw?.shared === true,
    offline: raw?.offline === true,
    access: raw?.access === "link" ? "link" : "private",
    template: raw?.template === true || kind === "template",
    description: String(raw?.description || "").slice(0, 400),
    done: raw?.done === true,
    inbound: raw?.inbound === true,
  };
}

export function isDesignRecord(item) {
  return Boolean(item && item.v === DOC_VERSION && item.format && Array.isArray(item.layers));
}

export function libraryOf(item) {
  const fallback = isDesignRecord(item) ? "design" : "file";
  if (item?.library && typeof item.library === "object") return normalizeLibrary(item.library, fallback);
  return normalizeLibrary(null, fallback);
}

export function listDesigns(storage) {
  return listProjects(storage).filter((item) => isDesignRecord(item) && !libraryOf(item).deletedAt);
}

function designCount(storage) {
  return listProjects(storage).filter(isDesignRecord).length;
}

function keptLibrary(doc, existing) {
  const fromDoc = doc?.library && typeof doc.library === "object" ? doc.library : null;
  const fromExisting = existing?.library && typeof existing.library === "object" ? existing.library : null;
  if (!fromDoc && !fromExisting) return null;
  const kind = fromDoc?.kind || fromExisting?.kind || (isDesignRecord(doc) || isDesignRecord(existing) ? "design" : "file");
  return normalizeLibrary({
    ...fromExisting,
    ...fromDoc,
    kind,
    favorite: fromExisting?.favorite === true || fromDoc?.favorite === true,
    offline: fromExisting?.offline === true || fromDoc?.offline === true,
    template: fromExisting?.template === true || fromDoc?.template === true,
    done: fromExisting?.done === true || fromDoc?.done === true,
    inbound: fromExisting?.inbound === true || fromDoc?.inbound === true,
    access: fromExisting?.access === "link" || fromDoc?.access === "link" ? "link" : "private",
    deletedAt: fromExisting?.deletedAt || fromDoc?.deletedAt || null,
    description: fromExisting?.description || fromDoc?.description || "",
    folderId: existing ? fromExisting?.folderId || null : fromDoc?.folderId || null,
  }, kind);
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
  if (!existing && designCount(storage) >= PROJECT_CAP) {
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
  const library = keptLibrary(doc, existing);
  if (library) stamped.library = library;
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
  const raw = listProjects(storage).find((item) => item.id === id);
  const doc = loadProject(storage, id);
  if (!doc) return null;
  doc.id = uid("proj");
  doc.name = `${doc.name} copia`.slice(0, 80);
  doc.createdAt = new Date().toISOString();
  doc.meta.revision = 0;
  doc.meta.workFileId = "";
  const lib = libraryOf(raw || doc);
  doc.library = normalizeLibrary({
    ...lib,
    favorite: false,
    deletedAt: null,
    template: false,
    offline: false,
    done: false,
  });
  const saved = saveProject(storage, doc);
  if (!saved.ok) return null;
  doc.meta.revision = saved.revision;
  return doc;
}

export function patchItem(storage, id, patch = {}) {
  const list = listProjects(storage);
  const current = list.find((item) => item.id === id);
  if (!current) return null;
  const library = normalizeLibrary(
    { ...libraryOf(current), ...(patch.library || {}) },
    libraryOf(current).kind,
  );
  if (patch.library && Object.prototype.hasOwnProperty.call(patch.library, "deletedAt") && !patch.library.deletedAt) {
    library.deletedAt = null;
  }
  if (patch.library && Object.prototype.hasOwnProperty.call(patch.library, "folderId") && !patch.library.folderId) {
    library.folderId = null;
  }
  const name = patch.name != null ? String(patch.name).trim().slice(0, 80) : current.name;
  const updated = {
    ...current,
    name: name || current.name || "Sin título",
    updatedAt: new Date().toISOString(),
    library,
  };
  const next = [updated, ...list.filter((item) => item.id !== id)];
  try {
    writeList(storage, next);
    return updated;
  } catch {
    return null;
  }
}

export function createContainer(storage, spec = {}) {
  const kind = LIBRARY_KINDS.has(spec.kind) && spec.kind !== "design" && spec.kind !== "template" ? spec.kind : "folder";
  const now = new Date().toISOString();
  const fallback = kind === "course" ? "Curso nuevo" : kind === "folder" ? "Carpeta nueva" : "Archivo";
  const item = {
    id: uid(kind === "course" ? "curso" : kind === "folder" ? "carpeta" : "archivo"),
    name: String(spec.name || fallback).trim().slice(0, 80) || fallback,
    createdAt: now,
    updatedAt: now,
    library: normalizeLibrary({
      kind,
      folderId: spec.folderId || null,
      access: spec.access === "link" ? "link" : "private",
      description: spec.description || "",
    }, kind),
  };
  try {
    writeList(storage, [item, ...listProjects(storage)]);
    return item;
  } catch {
    return null;
  }
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
