/**
 * Estado y respuestas de ORVUPI IA en este navegador.
 * El arranque de modelo de Work (#106/#111) vive en /work/ y baja pesos
 * de un host externo. Studio no lo llama: su CSP es connect-src 'self'.
 * Si en el futuro hay un puente en globalThis.__ORVUPI_AI_ASK__, se usa
 * solo para el texto. Las plantillas salen siempre del catálogo local.
 */

import { queryFromHash } from "./route.mjs";
import { THUMBS } from "./thumbs.mjs";

export const IA_KEY = "orvupi-studio-ia-v1";
export const IA_THINK_MS = 1000;

const SCREENS = new Set(["landing", "chats", "memoria", "tareas", "biblioteca", "chat"]);

export const ABOUT_PRESETS = [
  {
    id: "dedica",
    es: "A qué te dedicas",
    en: "What you do",
    promptEs: "Me dedico a diseñar piezas claras para una marca.",
    promptEn: "I design clear pieces for a brand.",
  },
  {
    id: "marca",
    es: "Tu marca",
    en: "Your brand",
    promptEs: "Mi marca usa colores suaves y tipografía grande.",
    promptEn: "My brand uses soft colors and large type.",
  },
  {
    id: "publico",
    es: "Para quién diseñas",
    en: "Who you design for",
    promptEs: "Diseño para personas que necesitan un currículum.",
    promptEn: "I design for people who need a resume.",
  },
  {
    id: "estilo",
    es: "Tu estilo",
    en: "Your style",
    promptEs: "Prefiero composiciones con mucho aire.",
    promptEn: "I prefer layouts with lots of space.",
  },
];

/** Categorías del catálogo. La palabra «plantilla» no elige ninguna por sí sola. */
const CATALOG = [
  { id: "curriculum", format: "cv", es: "currículum", en: "resume", keys: ["curriculum", "curriculo", "cv", "resume", "hoja de vida"] },
  { id: "presentacion", format: "deck", es: "presentación", en: "presentation", keys: ["presentacion", "presentaciones", "presentation", "presentations", "diapositiva", "diapositivas", "slide", "slides", "powerpoint", "ppt", "deck", "decks"] },
  { id: "propuesta", format: "doc", es: "propuesta", en: "proposal", keys: ["propuesta", "propuestas", "proposal", "proposals"] },
  { id: "documento", format: "doc", es: "documento", en: "document", keys: ["documento", "documentos", "document", "documents", "doc", "docs", "brief", "acuerdo", "onboarding"] },
  { id: "informe", format: "doc", es: "informe", en: "report", keys: ["informe", "informes", "reporte", "report", "reports", "memoria", "dashboard"] },
  { id: "negocio", format: "doc", es: "negocio", en: "business", keys: ["one-pager", "one pager", "fact sheet"] },
  { id: "tarjeta-visita", format: "card", es: "tarjeta de visita", en: "business card", keys: ["tarjeta de visita", "tarjetas de visita", "business card", "business cards", "tarjeta", "tarjetas"] },
  { id: "logo", format: "logo", es: "logo", en: "logo", keys: ["logo", "logos", "logotipo", "logotipos"] },
  { id: "flyer", format: "flyer", es: "flyer", en: "flyer", keys: ["flyer", "flyers", "folleto", "folletos", "volante", "volantes"] },
  { id: "cartel", format: "poster", es: "cartel", en: "poster", keys: ["cartel", "carteles", "poster", "posters", "afiche", "afiches"] },
  { id: "infografia", format: "info", es: "infografía", en: "infographic", keys: ["infografia", "infografias", "infographic", "infographics"] },
  { id: "invitacion", format: "invite", es: "invitación", en: "invitation", keys: ["invitacion", "invitaciones", "invitation", "invitations"] },
  { id: "post-instagram", format: "ig", es: "publicación", en: "post", keys: ["instagram", "publicacion", "publicaciones", "post"] },
  { id: "story", format: "story", es: "historia", en: "story", keys: ["story", "stories", "historia", "historias"] },
  { id: "miniatura-youtube", format: "thumb", es: "miniatura", en: "thumbnail", keys: ["miniatura", "miniaturas", "youtube", "thumbnail", "thumbnails"] },
  { id: "portada", format: "video", es: "portada", en: "cover", keys: ["portada", "portadas", "cover", "covers", "ebook"] },
  { id: "video", format: "video", es: "vídeo", en: "video", keys: ["video", "videos"] },
  { id: "pizarra", format: "board", es: "pizarra", en: "whiteboard", keys: ["pizarra", "pizarras", "whiteboard", "kanban"] },
  { id: "sitio-web", format: "web", es: "sitio web", en: "website", keys: ["sitio web", "pagina web", "website", "landing"] },
];

const BUSINESS_IDS = ["presentacion", "propuesta", "negocio", "documento", "informe"];
const BUSINESS_RE = /(?:^|[^a-z0-9])(?:proyectos?(?:[^a-z0-9]+de[^a-z0-9]+(?:empresa|negocio))?|projects?|empresariales?|empresas?|negocios?|pitch|corporativ[a-z]*|startups?|comercial(?:es)?|compan(?:y|ies)|business(?:es)?)(?=$|[^a-z0-9])/;
const ASKING_RE = /(?:^|[^a-z0-9])(?:plantillas?|templates?)(?=$|[^a-z0-9])|^(?:quiero|necesito|busco|ensen\w*|muestr\w*|dame|hazme|disena|disenar|show|want|need|looking)\b/;

const META = new Set([
  "plantilla", "plantillas", "template", "templates", "quiero", "necesito", "busco", "busca", "buscar",
  "ensename", "ensenar", "ensenarme", "muestrame", "mostrame", "muestra", "mostrar", "ver", "dame", "hazme", "hacer", "haz", "disena", "disenar",
  "diseno", "disenos", "para", "por", "con", "sin", "una", "uno", "unos", "unas", "un", "el", "la", "los",
  "las", "de", "del", "al", "en", "y", "o", "u", "mi", "mis", "tu", "tus", "que", "como", "favor", "mas",
  "the", "and", "for", "of", "to", "my", "me", "show", "want", "need", "please", "some", "looking", "a", "an",
]);

export function fold(value) {
  return String(value || "").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

function clip(value, max) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function clipBlock(value, max) {
  return String(value || "").replace(/\r/g, "").trim().slice(0, max);
}

export function emptyStore() {
  return { name: "", about: "", shelves: [], tasks: [], chats: [], favs: [] };
}

function cleanTemplates(list) {
  if (!Array.isArray(list)) return [];
  const out = [];
  for (const item of list) {
    if (!item || typeof item.id !== "string") continue;
    if (!/^thumbs\/[a-z0-9.-]+\.png$/i.test(item.file || "")) continue;
    out.push({
      id: item.id.slice(0, 80),
      title: clip(item.title, 80),
      file: item.file,
      category: clip(item.category, 40),
    });
    if (out.length >= 40) break;
  }
  return out;
}

function cleanMessage(raw) {
  if (!raw || (raw.role !== "user" && raw.role !== "assistant")) return null;
  const templates = raw.role === "assistant" ? cleanTemplates(raw.templates) : [];
  const shown = Math.max(0, Math.min(templates.length, Number(raw.shown) || Math.min(4, templates.length)));
  return {
    id: clip(raw.id, 40) || "m",
    role: raw.role,
    text: clipBlock(raw.text, 2000),
    attachment: clip(raw.attachment, 120),
    templates,
    format: clip(raw.format, 20),
    shown,
    at: Number(raw.at) || 0,
  };
}

function cleanChat(raw) {
  if (!raw || typeof raw.id !== "string") return null;
  const messages = Array.isArray(raw.messages) ? raw.messages.map(cleanMessage).filter(Boolean).slice(-50) : [];
  return {
    id: raw.id.slice(0, 40),
    title: clip(raw.title, 48) || "Chat",
    updated: Number(raw.updated) || 0,
    messages,
  };
}

export function loadStore(storage) {
  try {
    const raw = JSON.parse(storage.getItem(IA_KEY) || "");
    if (!raw || typeof raw !== "object") return emptyStore();
    return {
      name: clip(raw.name, 40),
      about: clipBlock(raw.about, 500),
      shelves: Array.isArray(raw.shelves) ? raw.shelves.slice(0, 30).map((item) => ({
        id: clip(item?.id, 40),
        name: clip(item?.name, 60),
        description: clipBlock(item?.description, 240),
        type: "personal",
      })).filter((item) => item.id && item.name) : [],
      tasks: Array.isArray(raw.tasks) ? raw.tasks.slice(0, 40).map((item) => ({
        id: clip(item?.id, 40),
        title: clip(item?.title, 80),
        done: item?.done === true,
      })).filter((item) => item.id && item.title) : [],
      chats: Array.isArray(raw.chats) ? raw.chats.map(cleanChat).filter(Boolean).slice(0, 40) : [],
      favs: Array.isArray(raw.favs) ? raw.favs.filter((id) => typeof id === "string").map((id) => id.slice(0, 40)).slice(0, 40) : [],
    };
  } catch {
    return emptyStore();
  }
}

export function saveStore(storage, store) {
  try {
    storage.setItem(IA_KEY, JSON.stringify(store));
    return true;
  } catch {
    return false;
  }
}

export function greeting(name, lang) {
  const clean = clip(name, 40);
  if (lang === "en") return clean ? `What should we design today, ${clean}?` : "What should we design today?";
  return clean ? `¿Qué diseñamos hoy, ${clean}?` : "¿Qué diseñamos hoy?";
}

export function copy(lang) {
  const en = lang === "en";
  return {
    sub: en ? "What task should we complete next?" : "¿Qué tarea deberíamos completar a continuación?",
    placeholder: en ? "Ask me anything" : "Pregúntame lo que quieras",
    emptyChats: en ? "All your chats will appear here" : "Todos tus chats aparecerán aquí",
    emptyHint: en ? "Start designing with ORVUPI AI" : "Empieza a diseñar con ORVUPI IA",
    search: en ? "Search recent chats" : "Buscar chats recientes",
    noHits: en ? "No chats match that search" : "Ningún chat coincide con la búsqueda",
    memory: en ? "Memory" : "Memoria",
    tasks: en ? "Tasks" : "Tareas",
    library: en ? "Library" : "Biblioteca",
    memoryLibrary: en ? "Memory library" : "Biblioteca de memorias",
    aboutLead: en ? "Personalize ORVUPI AI with About me" : "Personaliza ORVUPI IA con Acerca de mí",
    about: en ? "About me" : "Acerca de mí",
    aboutPh: en ? "Tell ORVUPI AI how you design" : "Cuéntale a ORVUPI IA cómo diseñas",
    name: en ? "Name" : "Nombre",
    shelves: en ? "Shelves" : "Estanterías",
    noShelves: en ? "No shelves yet" : "Todavía no hay estanterías",
    createShelf: en ? "Create a shelf" : "Crear estantería",
    sheetShelf: en ? "Create a shelf" : "Crear una estantería",
    description: en ? "Description" : "Descripción",
    type: en ? "Type" : "Tipo",
    personal: en ? "Personal" : "Personal",
    create: en ? "Create" : "Crear",
    scheduled: en ? "Scheduled" : "Programadas",
    completed: en ? "Completed" : "Completadas",
    newTask: en ? "New task" : "Nueva tarea",
    noScheduled: en ? "No scheduled tasks" : "No hay tareas programadas",
    noCompleted: en ? "No completed tasks" : "No hay tareas completadas",
    taskPh: en ? "Task name" : "Nombre de la tarea",
    media: en ? "Media" : "Multimedia",
    chats: en ? "Chats" : "Chats",
    favChats: en ? "Favorite chats" : "Chats favoritos",
    noMedia: en ? "No media yet" : "Todavía no hay multimedia",
    noChats: en ? "No chats yet" : "Todavía no hay chats",
    noFavs: en ? "No favorite chats yet" : "Todavía no hay chats favoritos",
    thinking: en ? "Thinking…" : "Pensando…",
    more: en ? "Show more templates" : "Mostrar más plantillas",
    generate: en ? "Generate" : "Generar",
    recent: en ? "Recent chats" : "Chats recientes",
    close: en ? "Close" : "Cerrar",
    back: en ? "Back" : "Volver",
    newChat: en ? "New chat" : "Nuevo chat",
    attach: en ? "Attach" : "Adjuntar",
    mic: en ? "Microphone" : "Micrófono",
    send: en ? "Send" : "Enviar",
    stop: en ? "Stop" : "Parar",
    moreMenu: en ? "More" : "Más",
    fav: en ? "Add to favorites" : "Añadir a favoritos",
    unfav: en ? "Remove from favorites" : "Quitar de favoritos",
    removeChat: en ? "Delete chat" : "Borrar chat",
    confirmRemove: en ? "Delete this chat from this browser?" : "¿Borrar este chat de este navegador?",
    results: (n) => (en ? `${n} ${n === 1 ? "result" : "results"}` : `${n} ${n === 1 ? "resultado" : "resultados"}`),
    catalog: (label) => (en ? `These ${label} templates are in the Studio catalog.` : `Estas plantillas de ${label} están en el catálogo de Studio.`),
    askFormat: en
      ? "Tell me a format and I will show templates from the Studio catalog: presentation, proposal, logo, poster, or story."
      : "Dime un formato y te enseño plantillas del catálogo de Studio: presentación, propuesta, logo, cartel o historia.",
    miss: (topic, alts) => (en
      ? `Nothing in the Studio catalog matches “${topic}”. Closest options: ${alts}.`
      : `No hay plantillas de «${topic}» en el catálogo de Studio. Lo más cercano: ${alts}.`),
    attached: en ? "The file is in this chat." : "El archivo ya está en este chat.",
  };
}

export function presetById(id) {
  return ABOUT_PRESETS.find((item) => item.id === id) || null;
}

export function presetPrompt(preset, lang) {
  return lang === "en" ? preset.promptEn : preset.promptEs;
}

export function screenFromHash(hash) {
  const params = queryFromHash(hash);
  const chatId = typeof params.chat === "string" ? params.chat.slice(0, 40) : "";
  if (chatId) return { name: "chat", chatId };
  const panel = typeof params.panel === "string" ? params.panel : "";
  const name = SCREENS.has(panel) ? panel : "landing";
  return { name: name === "chat" ? "landing" : name, chatId: "" };
}

export function hrefFor(screen, chatId = "") {
  const params = new URLSearchParams();
  if (chatId) params.set("chat", chatId);
  else if (screen && screen !== "landing" && screen !== "chat") params.set("panel", screen);
  const query = params.toString();
  return query ? `#/ia?${query}` : "#/ia";
}

function categoryById(id) {
  return CATALOG.find((item) => item.id === id) || null;
}

function hasPhrase(text, phrase) {
  const needle = fold(phrase).replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "[^a-z0-9]+");
  if (!needle) return false;
  return new RegExp(`(?:^|[^a-z0-9])${needle}(?=$|[^a-z0-9])`).test(text);
}

function specificMatches(folded) {
  return CATALOG.filter((item) => item.keys.some((key) => hasPhrase(folded, key)));
}

function refineHits(hits, folded) {
  const story = ["story", "stories", "historia", "historias"].some((word) => hasPhrase(folded, word));
  const post = ["post", "publicacion", "publicaciones"].some((word) => hasPhrase(folded, word));
  const ig = hasPhrase(folded, "instagram");
  let next = hits.slice();
  if (ig && story) next = next.filter((item) => item.id !== "post-instagram");
  else if (ig && post) next = next.filter((item) => item.id !== "story");
  else if (ig && !story && !post && next.length && next.every((item) => item.id === "post-instagram")) {
    const storyCat = categoryById("story");
    if (storyCat) next = next.concat(storyCat);
  }
  return next;
}

function contentTokens(folded) {
  return folded.split(/[^a-z0-9]+/).filter((token) => token.length > 2 && !META.has(token));
}

function orList(labels, lang) {
  const clean = labels.filter(Boolean);
  if (clean.length <= 1) return clean[0] || "";
  const conj = lang === "en" ? " or " : " o ";
  if (clean.length === 2) return `${clean[0]}${conj}${clean[1]}`;
  return `${clean.slice(0, -1).join(", ")}${conj}${clean[clean.length - 1]}`;
}

function catLabel(item, lang) {
  return lang === "en" ? item.en : item.es;
}

function humanLabel(cats, lang) {
  const labels = cats.map((item) => catLabel(item, lang));
  if (labels.length <= 1) return labels[0] || "";
  const conj = lang === "en" ? " and " : " y ";
  if (labels.length === 2) return `${labels[0]}${conj}${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")}${conj}${labels[labels.length - 1]}`;
}

function defaultNear(lang) {
  const ids = ["presentacion", "propuesta", "logo", "cartel", "story"];
  return orList(ids.map((id) => catLabel(categoryById(id), lang)), lang);
}

function closestCategories(tokens, thumbs) {
  const blobs = new Map();
  for (const item of thumbs) {
    if (!item?.category || item.category === "meme" || item.category === "curriculum") continue;
    const list = blobs.get(item.category) || [];
    if (list.length >= 8) continue;
    list.push(fold(item.title));
    blobs.set(item.category, list);
  }
  const ranked = [];
  for (const cat of CATALOG) {
    if (cat.id === "curriculum") continue;
    const blob = (blobs.get(cat.id) || []).join(" ");
    let score = 0;
    for (const token of tokens) {
      if (token.length < 4 || !blob.includes(token)) continue;
      score += token.length;
    }
    if (score > 0) ranked.push({ cat, score });
  }
  ranked.sort((a, b) => b.score - a.score || a.cat.es.localeCompare(b.cat.es));
  return ranked.slice(0, 3).map((item) => item.cat);
}

function templatesFor(catIds, thumbs) {
  const buckets = catIds.map((id) => thumbs.filter((item) => item && item.category === id && item.file && item.category !== "meme"));
  const out = [];
  let index = 0;
  while (out.length < 24) {
    let added = false;
    for (const bucket of buckets) {
      const item = bucket[index];
      if (!item) continue;
      out.push({ id: item.id, title: item.title, file: item.file, category: item.category });
      added = true;
      if (out.length >= 24) break;
    }
    if (!added) break;
    index += 1;
  }
  return out;
}

function fromCategories(cats, lang, thumbs, label) {
  const templates = templatesFor(cats.map((item) => item.id), thumbs);
  const name = label || humanLabel(cats, lang);
  return {
    text: templates.length ? copy(lang).catalog(name) : copy(lang).askFormat,
    templates,
    format: templates.length ? cats[0].format : "",
    label: templates.length ? name : "",
  };
}

export function localAnswer(text, lang, thumbs = THUMBS) {
  const folded = fold(text);
  const specific = refineHits(specificMatches(folded), folded);
  if (specific.some((item) => item.id === "curriculum")) {
    return fromCategories(specific.filter((item) => item.id === "curriculum"), lang, thumbs);
  }
  if (specific.length) return fromCategories(specific, lang, thumbs);
  if (BUSINESS_RE.test(folded)) {
    const cats = BUSINESS_IDS.map(categoryById).filter(Boolean);
    const label = lang === "en" ? "business project" : "proyecto de empresa";
    return fromCategories(cats, lang, thumbs, label);
  }
  const asking = ASKING_RE.test(folded);
  const tokens = contentTokens(folded);
  if (!asking || !tokens.length) {
    return { text: copy(lang).askFormat, templates: [], format: "", label: "" };
  }
  const near = closestCategories(tokens, thumbs);
  const alts = near.length ? orList(near.map((item) => catLabel(item, lang)), lang) : defaultNear(lang);
  return {
    text: copy(lang).miss(tokens.join(" ").slice(0, 80), alts),
    templates: [],
    format: "",
    label: "",
  };
}

export async function answerPrompt(text, lang, profile = {}) {
  const local = localAnswer(text, lang);
  const ask = globalThis.__ORVUPI_AI_ASK__;
  if (typeof ask !== "function") return local;
  try {
    const remote = await ask({ text, lang, about: profile.about || "", name: profile.name || "" });
    const next = typeof remote?.text === "string" ? remote.text.trim().slice(0, 2000) : "";
    if (!next) return local;
    return { ...local, text: next };
  } catch {
    return local;
  }
}

export function workBootStatus() {
  const wired = typeof globalThis.__ORVUPI_AI_ASK__ === "function";
  return { wired, source: wired ? "hook" : "catalog" };
}

export function rememberAbout(store, line) {
  const text = clipBlock(line, 240);
  if (!text || store.about.includes(text)) return store;
  return { ...store, about: clipBlock(`${store.about}\n${text}`, 500) };
}

export function withUserMessage(store, chatId, message) {
  const chats = store.chats.slice();
  const index = chats.findIndex((item) => item.id === chatId);
  if (index < 0) {
    const chat = {
      id: chatId,
      title: clip(message.text || message.attachment, 48) || "Chat",
      updated: Date.now(),
      messages: [message],
    };
    return { ...store, chats: [chat, ...chats].slice(0, 40) };
  }
  const prev = chats[index];
  const next = {
    ...prev,
    updated: Date.now(),
    title: prev.title || clip(message.text || message.attachment, 48) || "Chat",
    messages: [...prev.messages, message].slice(-50),
  };
  return { ...store, chats: [next, ...chats.filter((item) => item.id !== chatId)].slice(0, 40) };
}

export function withAssistantMessage(store, chatId, message) {
  return {
    ...store,
    chats: store.chats.map((chat) => {
      if (chat.id !== chatId) return chat;
      return { ...chat, updated: Date.now(), messages: [...chat.messages, message].slice(-50) };
    }),
  };
}

export function expandMessage(store, messageId) {
  return {
    ...store,
    chats: store.chats.map((chat) => ({
      ...chat,
      messages: chat.messages.map((message) => {
        if (message.id !== messageId) return message;
        const total = message.templates.length;
        return { ...message, shown: Math.min(total, (message.shown || 4) + 4) };
      }),
    })),
  };
}

export function filterChats(chats, query) {
  const folded = fold(query);
  const list = chats.slice().sort((a, b) => b.updated - a.updated);
  if (!folded) return list;
  return list.filter((chat) => fold(`${chat.title} ${chat.messages.map((item) => item.text).join(" ")}`).includes(folded));
}

export function mediaOf(store) {
  const out = [];
  for (const chat of store.chats) {
    for (const message of chat.messages) {
      if (!message.attachment) continue;
      out.push({ chatId: chat.id, name: message.attachment, at: message.at });
    }
  }
  return out;
}

export function uid(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
