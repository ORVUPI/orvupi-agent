/** Proyectos del Studio nuevo. La clave v1 del borrador anterior no se borra. */

import { DRAFT_KEY } from "./draft.mjs";
import { exportProject, importProject, uid } from "./document.mjs";
import { migrateDraft } from "./migrate.mjs";

export const PROJECTS_KEY = "orvupi-studio-projects";
export const ADOPTED_KEY = "orvupi-studio-draft-copia";
const CAP = 40;

export function listProjects(storage) {
  try {
    const data = JSON.parse(storage.getItem(PROJECTS_KEY) || "[]");
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export function saveProject(storage, doc) {
  const stamped = exportProject({ ...doc, updatedAt: new Date().toISOString() });
  const next = [stamped, ...listProjects(storage).filter((item) => item.id !== stamped.id)].slice(0, CAP);
  try {
    storage.setItem(PROJECTS_KEY, JSON.stringify(next));
    return { ok: true };
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
  const saved = saveProject(storage, doc);
  return saved.ok ? doc : null;
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
