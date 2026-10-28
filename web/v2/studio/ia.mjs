/** ORVUPI IA: chat móvil sobre #/ia. El pulpo es el logo y el indicador de espera. */

import { desktopRail } from "./desktop.mjs";
import {
  ABOUT_PRESETS,
  IA_THINK_MS,
  answerPrompt,
  copy,
  expandMessage,
  filterChats,
  greeting,
  hrefFor,
  loadStore,
  mediaOf,
  presetById,
  presetPrompt,
  rememberAbout,
  saveStore,
  screenFromHash,
  uid,
  withAssistantMessage,
  withUserMessage,
} from "./lib/ia-chat.mjs";
import { studioAsk } from "../shared/ia/studio-hook.mjs";

if (typeof globalThis.__ORVUPI_AI_ASK__ !== "function") globalThis.__ORVUPI_AI_ASK__ = studioAsk;

const SVG_NS = "http:" + "//www.w3.org/2000/svg";

const ui = {
  draft: "",
  search: "",
  sheet: "",
  shelf: { name: "", description: "", type: "personal" },
  taskTitle: "",
  taskTab: "programadas",
  libTab: "multimedia",
  attachmentName: "",
  busy: false,
  focus: "",
  caret: null,
};

let runtime = { render() {}, storage: null, lang: "es" };
let generation = 0;
let timer = 0;

export function bindIaRuntime(next) {
  runtime = { ...runtime, ...next };
}

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value == null || value === false) continue;
    if (key === "class") node.className = String(value);
    else if (key === "text") node.textContent = String(value);
    else if (key === "hidden") node.hidden = Boolean(value);
    else node.setAttribute(key, value === true ? "" : String(value));
  }
  for (const child of children) if (child) node.append(child);
  return node;
}

function button(text, attrs = {}, children = []) {
  return el("button", { type: "button", ...attrs, text }, children);
}

function icon(paths) {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  for (const d of paths) {
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", d);
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "currentColor");
    path.setAttribute("stroke-width", "1.8");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");
    svg.append(path);
  }
  return svg;
}

function dots() {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  for (const cy of [6, 12, 18]) {
    const circle = document.createElementNS(SVG_NS, "circle");
    circle.setAttribute("cx", "12");
    circle.setAttribute("cy", String(cy));
    circle.setAttribute("r", "1.6");
    circle.setAttribute("fill", "currentColor");
    svg.append(circle);
  }
  return svg;
}

function go(screen, chatId = "") {
  const next = hrefFor(screen, chatId);
  if (location.hash === next) runtime.render();
  else location.hash = next;
}

function store() {
  return loadStore(runtime.storage || { getItem() { return null; }, setItem() {} });
}

function write(next) {
  if (runtime.storage) saveStore(runtime.storage, next);
}

function stopQuiet() {
  generation += 1;
  clearTimeout(timer);
  ui.busy = false;
}

export function handleIaFile(file) {
  if (!file || !/^image\/(png|jpeg|webp)$/.test(file.type) || file.size > 8 * 1024 * 1024) return;
  ui.attachmentName = String(file.name || "imagen").slice(0, 120);
  ui.focus = "ia-prompt";
}

export function handleIaInput(target) {
  if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement)) return false;
  // Cada tecla no puede rehacer la vista: el textarea nuevo mueve el cursor.
  if (target.id === "ia-prompt") {
    ui.draft = target.value.slice(0, 2000);
    syncPromptSide();
    return false;
  }
  const caret = "selectionStart" in target ? target.selectionStart : null;
  ui.focus = target.id;
  ui.caret = caret;
  if (target.id === "ia-buscar") ui.search = target.value.slice(0, 80);
  else if (target.id === "ia-nombre" || target.id === "ia-about") {
    const data = store();
    const next = target.id === "ia-nombre"
      ? { ...data, name: target.value.slice(0, 40) }
      : { ...data, about: target.value.slice(0, 500) };
    write(next);
  } else if (target.id === "ia-estante-nombre") ui.shelf = { ...ui.shelf, name: target.value.slice(0, 60) };
  else if (target.id === "ia-estante-desc") ui.shelf = { ...ui.shelf, description: target.value.slice(0, 240) };
  else if (target.id === "ia-estante-tipo") ui.shelf = { ...ui.shelf, type: "personal" };
  else if (target.id === "ia-tarea-nombre") ui.taskTitle = target.value.slice(0, 80);
  else return false;
  return true;
}

function promptText() {
  const field = document.getElementById("ia-prompt");
  if (field instanceof HTMLTextAreaElement) return field.value.slice(0, 2000);
  return ui.draft;
}

export function sendIaPrompt(text, attachmentName = ui.attachmentName) {
  const body = String(text ?? promptText()).trim().slice(0, 2000);
  const attachment = String(attachmentName || "").trim().slice(0, 120);
  if ((!body && !attachment) || ui.busy) return;
  const lang = runtime.lang || "es";
  const data = store();
  const screen = screenFromHash(location.hash);
  const chatId = screen.chatId || uid("chat");
  const message = { id: uid("m"), role: "user", text: body, attachment, templates: [], format: "", shown: 0, at: Date.now() };
  write(withUserMessage(data, chatId, message));
  ui.draft = "";
  ui.attachmentName = "";
  ui.busy = true;
  ui.focus = "ia-prompt";
  const token = ++generation;
  const profile = { name: data.name, about: data.about };
  const asked = [body, attachment].filter(Boolean).join(" ");
  clearTimeout(timer);
  go("chat", chatId);
  timer = setTimeout(() => { void finishTurn(token, chatId, asked, profile, lang); }, IA_THINK_MS);
}

async function finishTurn(token, chatId, asked, profile, lang) {
  if (token !== generation) return;
  const answer = await answerPrompt(asked, lang, profile);
  if (token !== generation) return;
  const message = {
    id: uid("m"),
    role: "assistant",
    text: answer.text,
    mode: answer.mode,
    provider: answer.provider,
    modelId: answer.modelId,
    attachment: "",
    templates: answer.templates,
    format: answer.format,
    shown: Math.min(4, answer.templates.length),
    at: Date.now(),
  };
  write(withAssistantMessage(store(), chatId, message));
  ui.busy = false;
  ui.focus = "ia-prompt";
  runtime.render();
}

export function stopIaPrompt() {
  stopQuiet();
  ui.focus = "ia-prompt";
  runtime.render();
}

export function handleIaClick(node) {
  const action = node?.dataset?.ia;
  if (!action) return false;
  const lang = runtime.lang || "es";
  const text = copy(lang);
  if (action === "attach") {
    document.getElementById("ia-adjunto")?.click();
    return true;
  }
  if (action === "clear-file") {
    ui.attachmentName = "";
    ui.focus = "ia-prompt";
    runtime.render();
    return true;
  }
  if (action === "send") {
    sendIaPrompt(promptText());
    return true;
  }
  if (action === "stop") {
    stopIaPrompt();
    return true;
  }
  if (action === "mic") {
    ui.focus = "ia-prompt";
    runtime.render();
    return true;
  }
  if (action === "new") {
    stopQuiet();
    ui.draft = "";
    ui.attachmentName = "";
    ui.sheet = "";
    ui.focus = "ia-prompt";
    go("landing");
    return true;
  }
  if (action === "landing" || action === "chats" || action === "memoria" || action === "tareas" || action === "biblioteca") {
    if (action !== "chats") ui.search = action === "landing" ? ui.search : ui.search;
    ui.sheet = "";
    go(action === "landing" ? "landing" : action);
    return true;
  }
  if (action === "open") {
    ui.sheet = "";
    go("chat", node.dataset.iaChat || "");
    return true;
  }
  if (action === "sheet-close") {
    ui.sheet = "";
    runtime.render();
    return true;
  }
  if (action === "shelf-open") {
    ui.sheet = "shelf";
    ui.shelf = { name: "", description: "", type: "personal" };
    ui.focus = "ia-estante-nombre";
    runtime.render();
    return true;
  }
  if (action === "shelf-create") {
    const name = ui.shelf.name.trim();
    if (!name) return true;
    const data = store();
    const shelf = { id: uid("sh"), name: name.slice(0, 60), description: ui.shelf.description.trim().slice(0, 240), type: "personal" };
    write({ ...data, shelves: [shelf, ...data.shelves].slice(0, 30) });
    ui.sheet = "";
    ui.shelf = { name: "", description: "", type: "personal" };
    runtime.render();
    return true;
  }
  if (action === "shelf") {
    const data = store();
    const shelf = data.shelves.find((item) => item.id === node.dataset.iaShelf);
    if (!shelf) return true;
    const line = [shelf.name, shelf.description].filter(Boolean).join(". ");
    sendIaPrompt(lang === "en" ? `Design with the shelf ${line}` : `Quiero diseñar con la estantería ${line}`);
    return true;
  }
  if (action === "preset") {
    const preset = presetById(node.dataset.iaPreset);
    if (!preset) return true;
    const line = presetPrompt(preset, lang);
    write(rememberAbout(store(), line));
    sendIaPrompt(line);
    return true;
  }
  if (action === "task-tab") {
    ui.taskTab = node.dataset.iaTab === "completadas" ? "completadas" : "programadas";
    runtime.render();
    return true;
  }
  if (action === "task-open") {
    ui.sheet = "task";
    ui.taskTitle = "";
    ui.focus = "ia-tarea-nombre";
    runtime.render();
    return true;
  }
  if (action === "task-create") {
    const title = ui.taskTitle.trim();
    if (!title) return true;
    const data = store();
    write({ ...data, tasks: [{ id: uid("tk"), title: title.slice(0, 80), done: false }, ...data.tasks].slice(0, 40) });
    ui.sheet = "";
    ui.taskTitle = "";
    ui.taskTab = "programadas";
    runtime.render();
    return true;
  }
  if (action === "task-done") {
    const data = store();
    write({
      ...data,
      tasks: data.tasks.map((item) => item.id === node.dataset.iaTask ? { ...item, done: !item.done } : item),
    });
    runtime.render();
    return true;
  }
  if (action === "lib") {
    const tab = node.dataset.iaTab;
    ui.libTab = tab === "chats" || tab === "favoritos" ? tab : "multimedia";
    runtime.render();
    return true;
  }
  if (action === "more") {
    write(expandMessage(store(), node.dataset.iaMsg));
    runtime.render();
    return true;
  }
  if (action === "fav") {
    const id = screenFromHash(location.hash).chatId;
    if (!id) return true;
    const data = store();
    const favs = data.favs.includes(id) ? data.favs.filter((item) => item !== id) : [id, ...data.favs].slice(0, 40);
    write({ ...data, favs });
    runtime.render();
    return true;
  }
  if (action === "delete") {
    const id = screenFromHash(location.hash).chatId;
    if (!id) return true;
    if (!window.confirm(text.confirmRemove)) return true;
    const data = store();
    write({ ...data, chats: data.chats.filter((item) => item.id !== id), favs: data.favs.filter((item) => item !== id) });
    go("chats");
    return true;
  }
  return false;
}

export function handleIaKeydown(event) {
  const target = event.target;
  if (!(target instanceof HTMLTextAreaElement) || target.id !== "ia-prompt") return false;
  if (event.key !== "Enter" || event.shiftKey || event.isComposing) return false;
  event.preventDefault();
  if (ui.busy) stopIaPrompt();
  else sendIaPrompt(target.value);
  return true;
}

function iconButton(label, action, paths, className = "ia-icon") {
  const node = button("", { class: className, "data-ia": action, "aria-label": label });
  node.append(icon(paths));
  return node;
}

function promptSideKind() {
  if (ui.busy) return "stop";
  if (ui.draft.trim() || ui.attachmentName) return "send";
  return "mic";
}

function sideButton(kind, text) {
  if (kind === "stop") {
    return button("", { class: "ia-stop", "data-ia": "stop", "data-ia-side": "stop", "aria-label": text.stop }, [el("i", { "aria-hidden": "true" })]);
  }
  if (kind === "send") {
    return button("", { class: "ia-send", "data-ia": "send", "data-ia-side": "send", "aria-label": text.send }, [icon(["M12 19V6", "M7 11l5-5 5 5"])]);
  }
  return button("", { class: "ia-tool", "data-ia": "mic", "data-ia-side": "mic", "aria-label": text.mic }, [
    icon(["M12 15a3 3 0 0 0 3-3V7a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3z", "M8 11a4 4 0 0 0 8 0", "M12 18v3", "M9 21h6"]),
  ]);
}

function syncPromptSide() {
  const current = document.querySelector(".orvupi-ia .ia-card [data-ia-side]");
  if (!current) return;
  const kind = promptSideKind();
  if (current.getAttribute("data-ia") === kind) return;
  current.replaceWith(sideButton(kind, copy(runtime.lang === "en" ? "en" : "es")));
}

function pageHead(text, label, back = "chats") {
  return el("header", { class: "ia-top" }, [
    iconButton(label, back, ["M15 6l-6 6 6 6"]),
    el("h1", { text }),
    el("span", { class: "ia-top-gap", "aria-hidden": "true" }),
  ]);
}

function searchField(text) {
  return el("label", { class: "ia-search" }, [
    el("span", { class: "sr", text: text.search }),
    icon(["M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14z", "M20 20l-3.5-3.5"]),
    el("input", {
      id: "ia-buscar",
      type: "search",
      value: ui.search,
      placeholder: text.search,
      autocomplete: "off",
      "aria-label": text.search,
    }),
  ]);
}

function chatButton(chat) {
  return button(chat.title || "Chat", { class: "ia-chat-hit", "data-ia": "open", "data-ia-chat": chat.id });
}

function chatsScreen(data, text) {
  const hits = filterChats(data.chats, ui.search);
  const list = el("div", { class: "ia-chat-list" });
  if (!data.chats.length) {
    list.append(el("div", { class: "ia-empty" }, [
      el("strong", { text: text.emptyChats }),
      el("p", { text: text.emptyHint }),
    ]));
  } else if (!hits.length) {
    list.append(el("div", { class: "ia-empty" }, [el("strong", { text: text.noHits })]));
  } else list.append(...hits.map(chatButton));
  const links = el("div", { class: "ia-links" }, [
    linkRow(text.memory, "memoria", ["M7 4h10v16l-5-3-5 3z"]),
    linkRow(text.tasks, "tareas", ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z", "M12 7v5l3 2"]),
    linkRow(text.library, "biblioteca", ["M4 8h6l2 2h8v9H4z"]),
  ]);
  return el("div", { class: "ia-page ia-chats" }, [
    el("div", { class: "ia-search-row" }, [
      iconButton(text.close, "landing", ["M7 7l10 10", "M17 7L7 17"]),
      searchField(text),
    ]),
    list,
    links,
  ]);
}

function linkRow(label, action, paths) {
  const node = button("", { class: "ia-link", "data-ia": action });
  node.append(icon(paths), el("span", { text: label }), icon(["M9 6l6 6-6 6"]));
  return node;
}

function field(label, control) {
  return el("label", { class: "ia-field" }, [el("span", { text: label }), control]);
}

function memoriaScreen(data, lang, text) {
  const presets = el("div", { class: "ia-presets" }, ABOUT_PRESETS.map((preset) => button(lang === "en" ? preset.en : preset.es, {
    class: "ia-row",
    "data-ia": "preset",
    "data-ia-preset": preset.id,
  })));
  const shelves = data.shelves.length
    ? el("div", { class: "ia-presets" }, data.shelves.map((shelf) => button(shelf.name, { class: "ia-row", "data-ia": "shelf", "data-ia-shelf": shelf.id })))
    : el("p", { class: "ia-note", text: text.noShelves });
  return el("div", { class: "ia-page" }, [
    pageHead(text.memory, text.back),
    el("div", { class: "ia-block" }, [
      el("p", { class: "ia-kicker", text: text.memoryLibrary }),
      el("p", { class: "ia-lead", text: text.aboutLead }),
      field(text.name, el("input", { id: "ia-nombre", value: data.name, maxlength: "40", autocomplete: "name", placeholder: text.name })),
      field(text.about, el("textarea", { id: "ia-about", maxlength: "500", placeholder: text.aboutPh, text: data.about })),
      presets,
      el("h2", { text: text.shelves }),
      shelves,
      button(text.createShelf, { class: "ia-primary", "data-ia": "shelf-open" }),
    ]),
  ]);
}

function tareasScreen(data, text) {
  const done = ui.taskTab === "completadas";
  const items = data.tasks.filter((item) => item.done === done);
  const tabs = el("div", { class: "ia-tabs", role: "tablist" }, [
    button(text.scheduled, { "data-ia": "task-tab", "data-ia-tab": "programadas", role: "tab", "aria-selected": done ? "false" : "true" }),
    button(text.completed, { "data-ia": "task-tab", "data-ia-tab": "completadas", role: "tab", "aria-selected": done ? "true" : "false" }),
  ]);
  const body = items.length
    ? el("div", { class: "ia-presets" }, items.map((item) => button(item.title, { class: "ia-row", "data-ia": "task-done", "data-ia-task": item.id })))
    : el("div", { class: "ia-empty" }, [el("strong", { text: done ? text.noCompleted : text.noScheduled })]);
  return el("div", { class: "ia-page ia-tasks" }, [
    el("header", { class: "ia-top" }, [
      iconButton(text.back, "chats", ["M15 6l-6 6 6 6"]),
      el("h1", { text: text.tasks }),
      button("", { class: "ia-icon", "data-ia": "task-open", "aria-label": text.newTask }, [icon(["M12 5v14", "M5 12h14"])]),
    ]),
    tabs,
    body,
  ]);
}

function bibliotecaScreen(data, text) {
  const tab = ui.libTab;
  const seg = el("div", { class: "ia-seg", role: "tablist" }, [
    button(text.media, { "data-ia": "lib", "data-ia-tab": "multimedia", role: "tab", "aria-selected": tab === "multimedia" ? "true" : "false" }),
    button(text.chats, { "data-ia": "lib", "data-ia-tab": "chats", role: "tab", "aria-selected": tab === "chats" ? "true" : "false" }),
    button(text.favChats, { "data-ia": "lib", "data-ia-tab": "favoritos", role: "tab", "aria-selected": tab === "favoritos" ? "true" : "false" }),
  ]);
  let body;
  if (tab === "multimedia") {
    const media = mediaOf(data);
    body = media.length
      ? el("div", { class: "ia-presets" }, media.map((item) => button(item.name, { class: "ia-row", "data-ia": "open", "data-ia-chat": item.chatId })))
      : el("div", { class: "ia-empty" }, [el("strong", { text: text.noMedia })]);
  } else if (tab === "favoritos") {
    const favs = data.chats.filter((chat) => data.favs.includes(chat.id));
    body = favs.length
      ? el("div", { class: "ia-presets" }, favs.map(chatButton))
      : el("div", { class: "ia-empty" }, [el("strong", { text: text.noFavs })]);
  } else {
    body = data.chats.length
      ? el("div", { class: "ia-presets" }, filterChats(data.chats, "").map(chatButton))
      : el("div", { class: "ia-empty" }, [el("strong", { text: text.noChats })]);
  }
  return el("div", { class: "ia-page" }, [
    pageHead(text.library, text.back),
    seg,
    body,
  ]);
}

function bubble(message) {
  const kids = [];
  if (message.provider === "third-party") {
    kids.push(el("p", { class: "ia-meta", text: `${message.mode || "model"} · third-party · ${message.modelId || ""}` }));
  }
  if (message.text) kids.push(el("p", { text: message.text }));
  if (message.attachment) kids.push(el("p", { class: "ia-file", text: message.attachment }));
  return el("div", { class: `ia-bubble ia-${message.role}` }, kids);
}

function resultBlock(message, asset, text, floating) {
  const shown = message.templates.slice(0, message.shown || 4);
  const grid = el("div", { class: "ia-grid" }, shown.map((item, index) => {
    const node = button("", { class: "ia-tile", "data-thumb": item.id, "aria-label": item.title });
    node.append(el("img", {
      src: asset(item.file),
      alt: "",
      width: "180",
      height: "168",
      loading: index < 4 ? "eager" : "lazy",
      decoding: "async",
    }));
    return node;
  }));
  const more = shown.length < message.templates.length
    ? button(text.more, { class: "ia-fab", "data-ia": "more", "data-ia-msg": message.id })
    : null;
  const generate = message.format
    ? button(text.generate, { class: "ia-fab is-generate", "data-format": message.format })
    : null;
  const fabs = more || generate ? el("div", { class: floating ? "ia-fabs is-float" : "ia-fabs" }, [more, generate]) : null;
  return el("div", { class: "ia-results" }, [
    el("p", { class: "ia-count", text: text.results(message.templates.length) }),
    grid,
    fabs,
  ]);
}

function chatScreen(data, text, asset, screen) {
  const chat = data.chats.find((item) => item.id === screen.chatId);
  const thread = el("div", { class: "ia-thread", "aria-live": "polite" });
  const lastTemplates = chat?.messages?.filter((item) => item.role === "assistant" && item.templates.length).at(-1);
  if (chat) {
    for (const message of chat.messages) {
      const turn = el("div", { class: "ia-turn" }, [bubble(message)]);
      if (message.role === "assistant" && message.templates.length) {
        turn.append(resultBlock(message, asset, text, message === lastTemplates));
      }
      thread.append(turn);
    }
  }
  if (ui.busy) {
    thread.append(el("div", { class: "ia-think" }, [
      el("img", { class: "ia-octo", src: asset("assets/orvupi-avatar.png"), alt: "", width: "26", height: "26" }),
      el("span", { text: text.thinking }),
    ]));
  }
  const fav = chat && data.favs.includes(chat.id);
  const menu = el("details", { class: "ia-menu" }, [
    el("summary", { class: "ia-icon", "aria-label": text.moreMenu }, [dots()]),
    el("div", {}, [
      button(fav ? text.unfav : text.fav, { "data-ia": "fav" }),
      button(text.removeChat, { "data-ia": "delete" }),
    ]),
  ]);
  return el("div", { class: "ia-page ia-chat" }, [
    el("header", { class: "ia-top" }, [
      iconButton(text.back, "landing", ["M15 6l-6 6 6 6"]),
      el("span", { class: "ia-top-gap", "aria-hidden": "true" }),
      el("div", { class: "ia-top-actions" }, [
        iconButton(text.newChat, "new", ["M14.1 4.5l5.4 5.4-9.2 9.2H4.9v-5.4z"], "ia-icon is-square"),
        menu,
      ]),
    ]),
    thread,
  ]);
}

function landingScreen(data, lang, text) {
  return el("div", { class: "ia-landing" }, [
    el("h1", { id: "ia-saludo", text: greeting(data.name, lang) }),
    el("p", { text: text.sub }),
    el("p", { class: "ia-arqiven" }, [
      el("span", { text: lang === "en" ? "These answers come from the Studio catalog. " : "Estas respuestas salen del catálogo de Studio. " }),
      el("a", { href: "/arqiven/", text: "ARQIVEN" }),
    ]),
  ]);
}

function dock(text, show) {
  if (!show) return null;
  const side = sideButton(promptSideKind(), text);
  const chip = ui.attachmentName
    ? el("div", { class: "ia-chip" }, [
      el("span", { text: ui.attachmentName }),
      button("×", { class: "ia-chip-x", "data-ia": "clear-file", "aria-label": text.close }),
    ])
    : null;
  return el("div", { class: "ia-dock" }, [
    chip,
    el("div", { class: "ia-card" }, [
      button("", { class: "ia-tool", "data-ia": "attach", "aria-label": text.attach }, [icon(["M12 5v14", "M5 12h14"])]),
      el("label", { class: "ia-prompt-label" }, [
        el("span", { class: "sr", text: text.placeholder }),
        el("textarea", {
          id: "ia-prompt",
          rows: "1",
          maxlength: "2000",
          placeholder: text.placeholder,
          "aria-label": text.placeholder,
          text: ui.draft,
        }),
      ]),
      side,
    ]),
    el("input", { id: "ia-adjunto", type: "file", accept: "image/png,image/jpeg,image/webp", hidden: true }),
  ]);
}

function sheet(text) {
  if (ui.sheet !== "shelf" && ui.sheet !== "task") return null;
  const shelf = ui.sheet === "shelf";
  const ready = shelf ? ui.shelf.name.trim() : ui.taskTitle.trim();
  const form = shelf
    ? [
      el("h2", { text: text.sheetShelf }),
      field(text.name, el("input", { id: "ia-estante-nombre", value: ui.shelf.name, maxlength: "60", placeholder: text.name })),
      field(text.description, el("textarea", { id: "ia-estante-desc", maxlength: "240", placeholder: text.description, text: ui.shelf.description })),
      field(text.type, el("select", { id: "ia-estante-tipo", "aria-label": text.type }, [
        el("option", { value: "personal", selected: "selected", text: text.personal }),
      ])),
      button(text.create, { class: ready ? "ia-primary" : "ia-primary is-off", "data-ia": "shelf-create" }),
    ]
    : [
      el("h2", { text: text.newTask }),
      field(text.name, el("input", { id: "ia-tarea-nombre", value: ui.taskTitle, maxlength: "80", placeholder: text.taskPh })),
      button(text.create, { class: ready ? "ia-primary" : "ia-primary is-off", "data-ia": "task-create" }),
    ];
  return el("div", { class: "ia-sheet-layer" }, [
    button("", { class: "ia-sheet-scrim", "data-ia": "sheet-close", "aria-label": text.close }),
    el("div", { class: "ia-sheet", role: "dialog", "aria-modal": "true", "aria-label": shelf ? text.sheetShelf : text.newTask }, [
      el("span", { class: "ia-grab", "aria-hidden": "true" }),
      ...form,
    ]),
  ]);
}

function restoreFocus() {
  if (!ui.focus) return;
  const id = ui.focus;
  const caret = ui.caret;
  ui.focus = "";
  ui.caret = null;
  queueMicrotask(() => {
    const node = document.getElementById(id);
    if (!(node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement)) return;
    node.focus();
    if (caret != null && node.setSelectionRange) {
      const at = Math.min(caret, node.value.length);
      node.setSelectionRange(at, at);
    }
  });
}

export function renderOrvupiIa(ctx, parts) {
  runtime = { ...runtime, storage: ctx.storage, lang: ctx.lang };
  const lang = ctx.lang === "en" ? "en" : "es";
  const text = copy(lang);
  const data = store();
  const screen = screenFromHash(location.hash);
  if (ui.sheet === "shelf" && screen.name !== "memoria") ui.sheet = "";
  if (ui.sheet === "task" && screen.name !== "tareas") ui.sheet = "";
  const asset = parts.asset;
  let body;
  if (screen.name === "chats") body = chatsScreen(data, text);
  else if (screen.name === "memoria") body = memoriaScreen(data, lang, text);
  else if (screen.name === "tareas") body = tareasScreen(data, text);
  else if (screen.name === "biblioteca") body = bibliotecaScreen(data, text);
  else if (screen.name === "chat") body = chatScreen(data, text, asset, screen);
  else body = landingScreen(data, lang, text);
  const landing = screen.name === "landing";
  const chat = screen.name === "chat";
  const kids = [desktopRail(ctx, "ia")];
  if (landing) {
    kids.push(el("header", { class: "ia-top" }, [
      iconButton(text.recent, "chats", ["M4 19.5A2.5 2.5 0 0 1 6.5 17H20", "M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"]),
      iconButton(text.newChat, "new", ["M14.1 4.5l5.4 5.4-9.2 9.2H4.9v-5.4z"], "ia-icon is-square"),
    ]));
  }
  kids.push(body);
  kids.push(dock(text, landing || chat));
  if (!chat) kids.push(parts.nav());
  const layer = sheet(text);
  if (layer) kids.push(layer);
  const root = el("div", {
    class: `canva-home orvupi-ia is-${screen.name}${chat ? " is-chat" : ""}${landing ? " is-landing" : " is-sub"}`,
    "data-tab": "ia",
    "data-ia-screen": screen.name,
  }, kids);
  ctx.root.replaceChildren(root);
  restoreFocus();
  if (chat) {
    queueMicrotask(() => {
      const prompt = document.getElementById("ia-prompt");
      if (prompt && document.activeElement === prompt && !ui.busy) return;
      document.querySelector(".ia-think, .ia-count")?.scrollIntoView({ block: "nearest" });
    });
  }
}
