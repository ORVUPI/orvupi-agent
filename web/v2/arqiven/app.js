import { catalogAsk, createRequest, honestResult } from "/shared/ia/contract.mjs";
import { saveWorkBytes } from "/studio/lib/work-store.mjs";

const root = document.querySelector(".arq-app");
if (!root) throw new Error("ARQIVEN");

const lang = root.getAttribute("data-lang") || "es";
const honest = root.getAttribute("data-honest") || honestResult(createRequest({ source: "central" }), lang).text;
const copy = {
  voice: root.getAttribute("data-voice") || "",
  fileRead: root.getAttribute("data-file-read") || "",
  fileBad: root.getAttribute("data-file-bad") || "",
  saved: root.getAttribute("data-saved") || "",
  saveFail: root.getAttribute("data-save-fail") || "",
  empty: root.getAttribute("data-empty") || "",
  projects: root.getAttribute("data-projects") || "",
  docs: root.getAttribute("data-docs") || "",
};

const state = {
  tool: "chat",
  view: "chat",
  messages: [],
  attachment: null,
  conversationId: "tab",
  contextRefs: [],
};

const app = document.getElementById("app");
const sidebar = document.getElementById("sidebar");
const backdrop = document.getElementById("backdrop");
const menu = document.getElementById("menu");
const prompt = document.getElementById("prompt");
const messages = document.getElementById("messages");
const welcome = document.getElementById("welcome");
const view = document.getElementById("chat-view");
const recent = document.getElementById("recent");
const search = document.getElementById("search");
const status = document.getElementById("status");
const selected = document.getElementById("selected-tool");
const fileInput = document.getElementById("file-input");
const panel = document.getElementById("panel");
const save = document.getElementById("save-work");

function setStatus(text) {
  if (status) status.textContent = text;
}

function openMenu(open) {
  sidebar?.classList.toggle("open", open);
  backdrop?.classList.toggle("open", open);
  if (menu) menu.setAttribute("aria-expanded", open ? "true" : "false");
}

function paint() {
  const query = (search instanceof HTMLInputElement ? search.value : "").trim().toLowerCase();
  const list = state.messages.filter((item) => item.role === "user" && (!query || item.content.toLowerCase().includes(query)));
  if (recent) {
    recent.replaceChildren();
    if (!list.length) {
      const note = document.createElement("p");
      note.textContent = copy.empty;
      recent.append(note);
    } else {
      for (const item of list) {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = item.content.slice(0, 80);
        button.addEventListener("click", () => {
          const node = document.getElementById(item.id);
          node?.scrollIntoView({ block: "nearest" });
        });
        recent.append(button);
      }
    }
  }
  if (messages) {
    messages.replaceChildren();
    for (const item of state.messages) {
      const node = document.createElement("article");
      node.id = item.id;
      node.className = item.role === "user" ? "user" : "assistant";
      if (item.role === "assistant") {
        const meta = document.createElement("p");
        meta.className = "meta";
        const badge = document.createElement("span");
        badge.className = "badge";
        badge.textContent = `${item.mode} · ${item.provider} · ${item.modelId}`;
        meta.append(badge);
        node.append(meta);
      }
      const body = document.createElement("p");
      body.textContent = item.content;
      node.append(body);
      messages.append(node);
    }
  }
  const threaded = state.messages.length > 0 && state.view === "chat";
  welcome?.toggleAttribute("hidden", state.view !== "chat" || state.messages.length > 0);
  view?.classList.toggle("is-thread", threaded);
  if (panel) panel.hidden = state.view === "chat";
  if (save) save.hidden = state.messages.length === 0;
  document.querySelectorAll("[data-nav]").forEach((button) => {
    const on = button.getAttribute("data-nav") === state.view;
    if (on) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
}

function showView(name) {
  state.view = name;
  if (panel) {
    const title = panel.querySelector("h2");
    const body = panel.querySelector("p");
    if (title) title.textContent = name === "docs" ? (root.getAttribute("data-docs-title") || "") : (root.getAttribute("data-projects-title") || "");
    if (body) body.textContent = name === "docs" ? copy.docs : copy.projects;
  }
  paint();
  openMenu(false);
}

async function send() {
  const field = prompt instanceof HTMLTextAreaElement ? prompt : null;
  const text = (field?.value || "").trim();
  if (!text && !state.attachment) return;
  const content = [text, state.attachment ? `${copy.fileRead} ${state.attachment.name}` : ""].filter(Boolean).join("\n");
  const user = { id: `m-${state.messages.length}-u`, role: "user", content };
  state.messages.push(user);
  const request = createRequest({
    source: "central",
    task: state.tool,
    conversationId: state.conversationId,
    contextRefs: state.contextRefs,
    messages: state.messages.filter((item) => item.role === "user" || item.role === "assistant").map((item) => ({ role: item.role, content: item.content })),
  });
  const rules = catalogAsk();
  const result = rules.text ? null : honestResult(request, lang);
  const answer = result || honestResult(request, lang);
  if (answer.text !== honest && !answer.text) answer.text = honest;
  state.messages.push({
    id: `m-${state.messages.length}-a`,
    role: "assistant",
    content: honest,
    mode: answer.mode,
    provider: answer.provider,
    modelId: answer.modelId,
  });
  if (field) field.value = "";
  state.attachment = null;
  const chip = document.getElementById("file-chip");
  if (chip) chip.textContent = "";
  paint();
  field?.focus();
}

document.getElementById("new-chat")?.addEventListener("click", () => {
  state.messages = [];
  state.attachment = null;
  state.view = "chat";
  state.conversationId = "tab";
  if (prompt instanceof HTMLTextAreaElement) prompt.value = "";
  setStatus("");
  paint();
});

document.getElementById("collapse")?.addEventListener("click", () => {
  const collapsed = app?.classList.toggle("is-collapsed");
  document.getElementById("collapse")?.setAttribute("aria-pressed", collapsed ? "true" : "false");
});

menu?.addEventListener("click", () => openMenu(!sidebar?.classList.contains("open")));
backdrop?.addEventListener("click", () => openMenu(false));

document.querySelectorAll("[data-nav]").forEach((button) => {
  button.addEventListener("click", () => showView(button.getAttribute("data-nav") || "chat"));
});

document.querySelectorAll("[data-tool]").forEach((button) => {
  button.addEventListener("click", () => {
    state.tool = button.getAttribute("data-tool") || "chat";
    document.querySelectorAll("[data-tool]").forEach((item) => item.setAttribute("aria-pressed", item === button ? "true" : "false"));
    if (selected) selected.textContent = button.textContent || "";
    const tools = document.getElementById("tools");
    if (tools instanceof HTMLDetailsElement) tools.open = false;
  });
});

document.querySelectorAll("[data-chip]").forEach((button) => {
  button.addEventListener("click", () => {
    if (!(prompt instanceof HTMLTextAreaElement)) return;
    prompt.value = button.getAttribute("data-chip") || button.textContent || "";
    prompt.focus();
  });
});

document.getElementById("send")?.addEventListener("click", () => { void send(); });
prompt?.addEventListener("keydown", (event) => {
  if (!(event instanceof KeyboardEvent)) return;
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    void send();
  }
});

document.getElementById("voice")?.addEventListener("click", () => setStatus(copy.voice));

document.getElementById("attach")?.addEventListener("click", () => fileInput?.click());
fileInput?.addEventListener("change", () => {
  const input = fileInput instanceof HTMLInputElement ? fileInput : null;
  const file = input?.files?.[0];
  if (!file) return;
  const allowed = /\.(txt|md)$/i.test(file.name) || file.type.startsWith("text/");
  if (!allowed) {
    setStatus(copy.fileBad);
    input.value = "";
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    const text = typeof reader.result === "string" ? reader.result.slice(0, 8000) : "";
    state.attachment = { name: file.name.slice(0, 120), text };
    const chip = document.getElementById("file-chip");
    if (chip) chip.textContent = file.name;
    setStatus(`${copy.fileRead} ${file.name}`);
  };
  reader.readAsText(file);
  if (input) input.value = "";
});

save?.addEventListener("click", () => {
  const transcript = state.messages.map((item) => `${item.role}: ${item.content}`).join("\n\n").slice(0, 4000);
  if (!transcript) return;
  const id = globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : "";
  if (!id) {
    setStatus(copy.saveFail);
    return;
  }
  const note = {
    format: "orvupi-note",
    version: 1,
    id,
    title: "ARQIVEN",
    body: transcript,
    pinned: false,
    color: "#fff8ec",
    checks: [],
    label: "",
    archived: false,
  };
  const bytes = new TextEncoder().encode(JSON.stringify(note));
  void saveWorkBytes({
    id,
    name: "ARQIVEN",
    kind: "note",
    mime: "application/vnd.orvupi.note+json",
    bytes,
    snippet: transcript.slice(0, 240),
  }).then((saved) => {
    if (!saved?.ok || saved.id !== id) {
      setStatus(copy.saveFail);
      return;
    }
    state.contextRefs = [saved.id];
    setStatus(`${copy.saved} ${saved.id}`);
  }).catch(() => setStatus(copy.saveFail));
});

search?.addEventListener("input", () => paint());
paint();
