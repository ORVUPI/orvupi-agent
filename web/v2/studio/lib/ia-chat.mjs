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

const RULES = [
  { cat: "curriculum", format: "cv", es: "currículum", en: "resume", re: /curricul|curriculum|\bcv\b|resume|hoja de vida/ },
  { cat: "presentacion", format: "deck", es: "presentación", en: "presentation", re: /presentaci|diapositiv|\bslides?\b/ },
  { cat: "flyer", format: "flyer", es: "flyer", en: "flyer", re: /\bflyers?\b|folleto|volante/ },
  { cat: "cartel", format: "poster", es: "cartel", en: "poster", re: /cartel|poster/ },
  { cat: "logo", format: "logo", es: "logo", en: "logo", re: /\blogos?\b/ },
  { cat: "post-instagram", format: "ig", es: "publicación", en: "post", re: /instagram/ },
  { cat: "story", format: "story", es: "historia", en: "story", re: /\bstories?\b|\bstory\b|historias?\b/ },
  { cat: "documento", format: "doc", es: "documento", en: "document", re: /documentos?\b|\bdocs?\b/ },
  { cat: "infografia", format: "info", es: "infografía", en: "infographic", re: /infograf/ },
  { cat: "invitacion", format: "invite", es: "invitación", en: "invitation", re: /invitaci/ },
  { cat: "video", format: "video", es: "vídeo", en: "video", re: /\bvideos?\b/ },
  { cat: "sitio-web", format: "web", es: "sitio web", en: "website", re: /sitio web|pagina web|website/ },
  { cat: "miniatura-youtube", format: "thumb", es: "miniatura", en: "thumbnail", re: /miniatura|youtube|thumbnail/ },
];

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
      ? "Tell me a format and I will show templates from the Studio catalog: resume, presentation, flyer, logo, or story."
      : "Dime un formato y te enseño plantillas del catálogo de Studio: currículum, presentación, flyer, logo o historia.",
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

export function localAnswer(text, lang, thumbs = THUMBS) {
  const folded = fold(text);
  const wantsTemplates = /plantilla|template/.test(folded);
  const rule = RULES.find((item) => item.re.test(folded)) || (wantsTemplates ? RULES[0] : null);
  if (!rule) {
    return { text: copy(lang).askFormat, templates: [], format: "", label: "" };
  }
  const templates = thumbs
    .filter((item) => item.category === rule.cat && item.file && item.category !== "meme")
    .slice(0, 24)
    .map((item) => ({ id: item.id, title: item.title, file: item.file, category: item.category }));
  const label = lang === "en" ? rule.en : rule.es;
  return {
    text: templates.length ? copy(lang).catalog(label) : copy(lang).askFormat,
    templates,
    format: templates.length ? rule.format : "",
    label,
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
