/** Perfil, tema y papelera de la pestaña Más. Todo queda en este navegador. */

import { IA_KEY, loadStore, saveStore } from "./ia-chat.mjs";
import { DRAFT_KEY } from "./draft.mjs";
import { HISTORY_KEY } from "./history.mjs";
import {
  ADOPTED_KEY,
  NEXT_KEY,
  PROJECTS_KEY,
  RECOVERY_KEY,
  deleteProject,
  libraryOf,
  listProjects,
  patchItem,
} from "./projects.mjs";

export const MAS_KEY = "orvupi-studio-mas";
export const TRASH_DAYS = 30;
export const TRASH_MS = TRASH_DAYS * 24 * 60 * 60 * 1000;

export const STUDIO_KEYS = [
  PROJECTS_KEY,
  NEXT_KEY,
  RECOVERY_KEY,
  ADOPTED_KEY,
  DRAFT_KEY,
  HISTORY_KEY,
  IA_KEY,
  MAS_KEY,
];

export const HUB_ROWS = [
  { id: "marca", es: "Marca", en: "Brand", go: "mas/marca", tone: "purple", group: true },
  { id: "imprime", es: "Imprime con ORVUPI", en: "Print with ORVUPI", go: "mas/imprime", tone: "purple", group: true },
  { id: "apps", es: "Apps", en: "Apps", go: "mas/apps", tone: "purple", group: true },
  { id: "dream", es: "Dream Lab", en: "Dream Lab", go: "mas/dream", tone: "purple", group: true },
  { id: "anuncios", es: "Anuncios", en: "Ads", go: "mas/anuncios", tone: "purple", group: true },
  { id: "escuela", es: "Design School", en: "Design School", go: "mas/escuela", tone: "purple", group: true },
  { id: "preferencias", es: "Preferencias", en: "Preferences", go: "mas/preferencias", tone: "ink" },
  { id: "config", es: "Configuración", en: "Settings", go: "mas/config", tone: "ink" },
  { id: "papelera", es: "Papelera", en: "Trash", go: "mas/papelera", tone: "ink" },
  { id: "tema", es: "Tema", en: "Theme", go: "mas/tema", tone: "ink" },
  { id: "comentarios", es: "Ayuda y comentarios", en: "Help and feedback", go: "mas/comentarios", tone: "ink" },
  { id: "avanzadas", es: "Herramientas avanzadas", en: "Advanced tools", go: "mas/avanzadas", tone: "purple" },
  { id: "borrar", es: "Borrar preferencias", en: "Clear preferences", go: "mas/preferencias/borrar", tone: "ink", chevron: false },
];

export const ORVUPI_APPS = [
  { id: "work", href: "/work/", es: "Work", en: "Work", esBlurb: "Documentos y presentaciones en este navegador.", enBlurb: "Docs and decks in this browser.", cat: "crear", featured: true },
  { id: "lab", href: "/lab/", es: "Lab", en: "Lab", esBlurb: "Lecciones y pruebas del laboratorio.", enBlurb: "Lab lessons and drills.", cat: "aprender", featured: true },
  { id: "verify", href: "/verify/", es: "Verify", en: "Verify", esBlurb: "Comprueba archivos y registros en local.", enBlurb: "Check files and records locally.", cat: "crear" },
  { id: "cuaderno", href: "/cuaderno/", es: "Cuaderno", en: "Notebook", esBlurb: "Notas que se quedan en el navegador.", enBlurb: "Notes that stay in the browser.", cat: "crear" },
  { id: "tablero", href: "/tablero/", es: "Tablero", en: "Board", esBlurb: "Un tablero para ordenar ideas.", enBlurb: "A board for sorting ideas.", cat: "crear" },
  { id: "curva", href: "/pares/", es: "Curva", en: "Curve", esBlurb: "La curva de pares de ORVUPI.", enBlurb: "The ORVUPI pairs curve.", cat: "comunidad" },
  { id: "memes", href: "/memes/", es: "Memes", en: "Memes", esBlurb: "Piezas de la comunidad.", enBlurb: "Community pieces.", cat: "comunidad" },
  { id: "comunidad", href: "/community/", es: "Comunidad", en: "Community", esBlurb: "El espacio de la comunidad.", enBlurb: "The community space.", cat: "comunidad" },
  { id: "aprender", href: "/aprender/", es: "Aprender", en: "Learn", esBlurb: "Guías para empezar.", enBlurb: "Guides to get started.", cat: "aprender" },
  { id: "metodologia", href: "/methodology/", es: "Metodología", en: "Methodology", esBlurb: "Cómo está armado ORVUPI.", enBlurb: "How ORVUPI is put together.", cat: "aprender" },
  { id: "marca", href: "/marca/", es: "Marca", en: "Brand", esBlurb: "Pulpo, colores y recursos.", enBlurb: "Octopus, colors, and assets.", cat: "crear" },
  { id: "novedades", href: "/novedades/", es: "Novedades", en: "What's new", esBlurb: "Lo último publicado en el sitio.", enBlurb: "The latest notes on the site.", cat: "para-ti" },
];

export const SCHOOL = [
  { id: "aprender", href: "/aprender/", es: "Quiero aprender", en: "I want to learn", esBody: "Guías cortas para usar ORVUPI.", enBody: "Short guides for using ORVUPI." },
  { id: "lab", href: "/lab/", es: "Lecciones de Lab", en: "Lab lessons", esBody: "Practica en el laboratorio.", enBody: "Practice in the lab." },
  { id: "metodologia", href: "/methodology/", es: "Metodología", en: "Methodology", esBody: "El método detrás de las herramientas.", enBody: "The method behind the tools." },
  { id: "marca", href: "/marca/", es: "Kit de marca", en: "Brand kit", esBody: "Colores, pulpo y recursos públicos.", enBody: "Colors, octopus, and public assets." },
  { id: "plantillas", go: "plantillas", es: "Plantillas de Studio", en: "Studio templates", esBody: "Abre una plantilla y edítala aquí.", enBody: "Open a template and edit it here." },
];

export const PRINT_PRODUCTS = [
  { id: "png", es: "PNG", en: "PNG", jump: "mas-disenos" },
  { id: "jpg", es: "JPG", en: "JPG", jump: "mas-disenos" },
  { id: "pdf", es: "PDF", en: "PDF", jump: "mas-disenos" },
  { id: "poster", es: "Cartel", en: "Poster", format: "poster" },
  { id: "flyer", es: "Flyer", en: "Flyer", format: "flyer" },
  { id: "invite", es: "Invitación", en: "Invitation", format: "invite" },
  { id: "card", es: "Tarjeta", en: "Card", format: "card" },
  { id: "story", es: "Historia", en: "Story", format: "story" },
  { id: "square", es: "Publicación", en: "Post", format: "square" },
];

const THEMES = new Set(["light", "dark", "system"]);
const SCALES = new Set(["md", "lg", "xl"]);
const TOGGLES = new Set([
  "a11y.reduceMotion",
  "a11y.contrast",
  "notices.saved",
  "notices.export",
  "notices.product",
  "privacy.searches",
  "privacy.home",
  "ai.history",
  "linked.work",
]);
const TEXT_FIELDS = {
  "profile.name": 80,
  "profile.email": 120,
  "profile.about": 400,
  "profile.social": 80,
  "profile.team": 80,
};

export function defaultMas() {
  return {
    v: 1,
    profile: { name: "", email: "", about: "", social: "", team: "" },
    theme: "system",
    a11y: { reduceMotion: false, contrast: false, textSize: "md" },
    notices: { saved: true, export: true, product: false },
    privacy: { searches: true, home: true },
    ai: { history: true },
    read: [],
    extra: [],
    linked: { work: true },
    signedOutAt: "",
  };
}

function clip(value, max) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

export function loadMas(storage) {
  const base = defaultMas();
  let raw = null;
  try {
    raw = JSON.parse(storage.getItem(MAS_KEY) || "");
  } catch {
    raw = null;
  }
  if (!raw || typeof raw !== "object") return base;
  const profile = raw.profile && typeof raw.profile === "object" ? raw.profile : {};
  const a11y = raw.a11y && typeof raw.a11y === "object" ? raw.a11y : {};
  const notices = raw.notices && typeof raw.notices === "object" ? raw.notices : {};
  const privacy = raw.privacy && typeof raw.privacy === "object" ? raw.privacy : {};
  const ai = raw.ai && typeof raw.ai === "object" ? raw.ai : {};
  const linked = raw.linked && typeof raw.linked === "object" ? raw.linked : {};
  return {
    v: 1,
    profile: {
      name: clip(profile.name, 80),
      email: clip(profile.email, 120),
      about: clip(profile.about, 400),
      social: clip(profile.social, 80),
      team: clip(profile.team, 80),
    },
    theme: THEMES.has(raw.theme) ? raw.theme : "system",
    a11y: {
      reduceMotion: a11y.reduceMotion === true,
      contrast: a11y.contrast === true,
      textSize: SCALES.has(a11y.textSize) ? a11y.textSize : "md",
    },
    notices: {
      saved: notices.saved !== false,
      export: notices.export !== false,
      product: notices.product === true,
    },
    privacy: {
      searches: privacy.searches !== false,
      home: privacy.home !== false,
    },
    ai: { history: ai.history !== false },
    read: Array.isArray(raw.read) ? raw.read.map((id) => clip(id, 120)).filter(Boolean).slice(-80) : [],
    extra: cleanExtra(raw.extra),
    linked: { work: linked.work !== false },
    signedOutAt: clip(raw.signedOutAt, 40),
  };
}

function cleanExtra(list) {
  if (!Array.isArray(list)) return [];
  return list.slice(0, 12).map((item) => ({
    id: clip(item?.id, 120),
    title: clip(item?.title, 80),
    body: clip(item?.body, 140),
    at: clip(item?.at, 40),
  })).filter((item) => item.id && item.title);
}

export function saveMas(storage, data) {
  try {
    storage.setItem(MAS_KEY, JSON.stringify(loadMas({ getItem: () => JSON.stringify(data) })));
    return true;
  } catch {
    return false;
  }
}

function writeGroup(data, key, value) {
  const [group, field] = String(key || "").split(".");
  if (!field || !data[group] || typeof data[group] !== "object") return false;
  data[group] = { ...data[group], [field]: value };
  return true;
}

export function setMasField(storage, key, value) {
  const max = TEXT_FIELDS[key];
  if (!max) return loadMas(storage);
  const data = loadMas(storage);
  writeGroup(data, key, clip(value, max));
  saveMas(storage, data);
  return data;
}

export function togglePref(storage, key) {
  if (!TOGGLES.has(key)) return loadMas(storage);
  const data = loadMas(storage);
  const [group, field] = key.split(".");
  const current = data[group][field] === true;
  writeGroup(data, key, !current);
  saveMas(storage, data);
  return data;
}

export function setTheme(storage, theme) {
  const data = loadMas(storage);
  data.theme = THEMES.has(theme) ? theme : "system";
  saveMas(storage, data);
  return data;
}

export function setTextScale(storage, scale) {
  const data = loadMas(storage);
  data.a11y = { ...data.a11y, textSize: SCALES.has(scale) ? scale : "md" };
  saveMas(storage, data);
  return data;
}

export function displayName(profile, lang) {
  const name = String(profile?.name || "").trim();
  if (name) return name;
  return lang === "en" ? "Guest" : "Visitante";
}

export function teamLabel(profile, lang) {
  const team = String(profile?.team || "").trim();
  if (team) return team;
  const name = displayName(profile, lang);
  return lang === "en" ? `${name}'s team` : `Equipo de ${name}`;
}

export function resetProfile(storage) {
  const current = loadMas(storage);
  const next = defaultMas();
  next.theme = current.theme;
  next.a11y = current.a11y;
  saveMas(storage, next);
  return next;
}

export function markRead(storage, ids) {
  const data = loadMas(storage);
  const seen = new Set(data.read);
  for (const id of ids || []) {
    const clean = clip(id, 120);
    if (clean) seen.add(clean);
  }
  data.read = [...seen].slice(-80);
  saveMas(storage, data);
  return data;
}

export function clearIaChats(storage) {
  const data = loadStore(storage);
  data.chats = [];
  return saveStore(storage, data);
}

export function pushNotice(storage, notice) {
  const data = loadMas(storage);
  const id = clip(notice?.id, 120);
  const title = clip(notice?.title, 80);
  if (!id || !title) return data;
  const next = {
    id,
    title,
    body: clip(notice?.body, 140),
    at: new Date().toISOString(),
  };
  data.extra = [next, ...data.extra.filter((item) => item.id !== id)].slice(0, 12);
  saveMas(storage, data);
  return data;
}

export function studioNotices(storage, lang) {
  const prefs = loadMas(storage);
  const en = lang === "en";
  const saved = prefs.notices.saved
    ? listProjects(storage)
      .filter((item) => item?.updatedAt && !libraryOf(item).deletedAt)
      .slice(0, 8)
      .map((item) => ({
        id: `save:${item.id}:${item.updatedAt}`,
        title: en ? "Design saved on this device" : "Diseño guardado en este dispositivo",
        body: String(item.name || (en ? "Untitled" : "Sin título")),
        at: item.updatedAt,
      }))
    : [];
  const extra = prefs.notices.export ? prefs.extra : [];
  return [...extra, ...saved].slice(0, 12);
}

function deletedTime(item) {
  const stamp = libraryOf(item).deletedAt;
  const time = Date.parse(stamp || "");
  return Number.isFinite(time) ? time : 0;
}

export function purgeExpiredTrash(storage, now = Date.now()) {
  const stale = listProjects(storage)
    .filter((item) => {
      const time = deletedTime(item);
      return time > 0 && now - time >= TRASH_MS;
    })
    .map((item) => item.id);
  for (const id of stale) deleteProject(storage, id);
  return stale;
}

export function listTrash(storage, now = Date.now()) {
  return listProjects(storage)
    .filter((item) => {
      const time = deletedTime(item);
      return time > 0 && now - time < TRASH_MS;
    })
    .sort((a, b) => deletedTime(b) - deletedTime(a));
}

export function restoreTrash(storage, id) {
  return patchItem(storage, id, { library: { deletedAt: null } });
}

export function emptyTrash(storage) {
  const ids = listProjects(storage).filter((item) => libraryOf(item).deletedAt).map((item) => item.id);
  for (const id of ids) deleteProject(storage, id);
  return ids.length;
}

export function clearOfflineFlags(storage) {
  let count = 0;
  for (const item of listProjects(storage)) {
    if (!libraryOf(item).offline) continue;
    if (patchItem(storage, item.id, { library: { offline: false } })) count += 1;
  }
  return count;
}

export function clearImageDb() {
  if (typeof indexedDB === "undefined" || typeof indexedDB.deleteDatabase !== "function") return;
  try {
    indexedDB.deleteDatabase("orvupi-studio");
  } catch {
    /* el navegador puede negar la base */
  }
}

function storageKeys(storage) {
  if (typeof storage.key !== "function" || typeof storage.length !== "number") return STUDIO_KEYS.slice();
  const found = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key) found.push(key);
  }
  return found.length ? found : STUDIO_KEYS.slice();
}

export function storageReport(storage) {
  const keys = [];
  for (const key of storageKeys(storage)) {
    if (!key.startsWith("orvupi-studio")) continue;
    let value = "";
    try {
      value = storage.getItem(key) || "";
    } catch {
      value = "";
    }
    if (!value) continue;
    keys.push({ key, bytes: key.length + value.length });
  }
  const projects = listProjects(storage);
  return {
    keys,
    bytes: keys.reduce((sum, item) => sum + item.bytes, 0),
    designs: projects.filter((item) => !libraryOf(item).deletedAt).length,
    trash: projects.filter((item) => libraryOf(item).deletedAt).length,
  };
}

export function formatBytes(bytes) {
  const n = Math.max(0, Number(bytes) || 0);
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function deleteProjectSafe(storage, id) {
  try {
    deleteProject(storage, id);
    return true;
  } catch {
    return false;
  }
}

export function clearStudioData(storage) {
  const keys = new Set(STUDIO_KEYS);
  for (const key of storageKeys(storage)) {
    if (key.startsWith("orvupi-studio")) keys.add(key);
  }
  for (const key of keys) {
    try {
      storage.removeItem(key);
    } catch {
      /* sigue con la siguiente clave */
    }
  }
  clearImageDb();
}

export function localePrefix() {
  if (typeof location === "undefined") return "";
  const path = location.pathname || "";
  return ["/en", "/pt-br", "/ja", "/ko"].find((prefix) => path === prefix || path.startsWith(`${prefix}/`)) || "";
}

export function localHref(path) {
  const clean = String(path || "/");
  if (clean === "/work" || clean.startsWith("/work/")) return "/work/";
  return `${localePrefix()}${clean}`;
}
