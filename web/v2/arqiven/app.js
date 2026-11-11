import { arqivenEngine } from "/shared/ia/engine-client.mjs";
import { badgeOf, defaultModel, modelById, modelForDevice, stepDown, THIRD_PARTY_MODELS } from "/shared/ia/models.mjs";
import { createRequest, honestResult } from "/shared/ia/contract.mjs";
import { saveWorkBytes, loadWorkBytes } from "/studio/lib/work-store.mjs";
import { sanitizePlain } from "/shared/ia/plain.mjs";
import { buildIndex } from "/shared/ia/retrieve.mjs";
import { excerptAnswer, finishModelAnswer, planTurn } from "/shared/ia/turn.mjs";
import { citedExcerpt, extractiveFromSources } from "/shared/ia/quality.mjs";
import { exportPayload, listVotes, openFeedbackDb, saveVote } from "/shared/ia/feedback.mjs";
import { clipHistory } from "/shared/ia/history.mjs";
import { listConversations, openChatDb, readConversation, saveConversation } from "/shared/ia/chats.mjs";

const root = document.querySelector(".arq-app");
if (!root) throw new Error("ARQIVEN");

const declared = (document.documentElement.lang || root.getAttribute("data-lang") || "es").trim();
const lang = declared === "pt" ? "pt-BR" : declared;
const honest = (document.documentElement.lang || "es") === "es"
  ? (root.getAttribute("data-honest") || honestResult(createRequest({ source: "central" }), "es").text)
  : honestResult(createRequest({ source: "central" }), lang).text;
const uiLang = lang === "en" ? "en" : lang === "pt" || lang === "pt-BR" ? "pt" : lang === "ja" ? "ja" : lang === "ko" ? "ko" : "es";
const UI = {
  es: {
    prepare: "Reintentar",
    ready: "Modelo de terceros listo",
    again: "Usar este modelo",
    cancel: "Cancelar",
    preparing: "Descargando un modelo de terceros. Puedes seguir escribiendo.",
    checking: "Comprobando que el modelo de terceros responde en este navegador.",
    idle: "IA de ORVUPI",
    who: "ARQIVEN es la IA de ORVUPI. Si descargas un modelo para que responda, es de terceros y se nombra aparte.",
    queued: "Preparando modelo de terceros… Puedes seguir escribiendo. Este aviso se sustituye cuando haya texto.",
    cancelled: "Cancelado. No hay respuesta generada.",
    error: "El modelo de terceros no se ha preparado.",
    emptyModel: "El modelo de terceros no escribió un texto usable.",
    busy: "Ya hay una respuesta en curso.",
    editor: "Editor",
    editorTitle: "Texto de esta pestaña",
    editorNote: "Texto local de esta pestaña. El modelo, si responde, corre en este navegador. No es un documento de Work hasta que pulses Guardar.",
    closeEditor: "Volver al chat",
    edit: "Editar",
    where: "Guardar crea una nota nueva en IndexedDB orvupi-work de este dispositivo. No sale a un servidor. No hay OCR. Aquí solo se leen TXT y MD. El texto no se ejecuta.",
    third: "tercero",
    task: "Tarea",
    shortcut: "Atajo de tarea. No ejecuta un modelo ni promete esa capacidad.",
    notBuilt: "Programar no está implementado. El chip no crea un programa.",
    retries: "Se ha reintentado tres veces. No hay otra descarga automática.",
    excerptBadge: "extracto de la fuente · no es el modelo",
    usesSources: "usa fuentes y las cita",
    sourcesLabel: "Fuentes",
    useful: "Útil",
    notUseful: "No útil",
    exportVotes: "Exportar votos de este dispositivo",
    wikiDisclosure: "ARQIVEN es la IA de ORVUPI y no tiene un modelo propio. El modelo de terceros que elijas responde en este navegador. Las páginas de ORVUPI (MIT) se consultan aquí. Si la pregunta no está cubierta, se consulta Wikipedia en tu idioma (CC BY-SA): esa consulta envía solo la pregunta, nunca un documento de Work.",
  },
  en: {
    prepare: "Retry",
    ready: "Third-party model ready",
    again: "Use this model",
    cancel: "Cancel",
    preparing: "Downloading a third-party model. You can keep typing.",
    checking: "Checking that the third-party model answers in this browser.",
    idle: "ORVUPI AI",
    who: "ARQIVEN is ORVUPI's AI. If you download a model so it can answer, that model belongs to someone else and is named separately.",
    queued: "Preparing a third-party model… You can keep typing. This notice is replaced when there is text.",
    cancelled: "Cancelled. There is no generated answer.",
    error: "The third-party model was not prepared.",
    emptyModel: "The third-party model did not write usable text.",
    busy: "A reply is already in progress.",
    editor: "Editor",
    editorTitle: "Text in this tab",
    editorNote: "Local text in this tab. If a model answers, it runs in this browser. It is not a Work document until you press Save.",
    closeEditor: "Back to chat",
    edit: "Edit",
    where: "Save creates a new note in this device's orvupi-work IndexedDB. It is not sent to a server. There is no OCR. Only TXT and MD are read here. The text is not executed.",
    third: "third party",
    task: "Task",
    shortcut: "Task shortcut. It does not run a model or promise that ability.",
    notBuilt: "Coding is not implemented. This chip does not create a program.",
    retries: "Retried three times. There is no further automatic download.",
    excerptBadge: "source excerpt · not the model",
    usesSources: "uses sources and cites them",
    sourcesLabel: "Sources",
    useful: "Useful",
    notUseful: "Not useful",
    exportVotes: "Export votes from this device",
    wikiDisclosure: "ARQIVEN is ORVUPI's AI and has no model of its own. The third-party model you choose answers in this browser. ORVUPI pages (MIT) are searched here. If the question is not covered, Wikipedia is queried in your language (CC BY-SA): that query sends only the question, never a Work document.",
  },
  pt: {
    prepare: "Tentar de novo",
    ready: "Modelo de terceiros pronto",
    again: "Usar este modelo",
    cancel: "Cancelar",
    who: "ARQIVEN é a IA da ORVUPI. Se você baixar um modelo para ele responder, esse modelo é de terceiros e aparece com o nome dele.",
    preparing: "Baixando um modelo de terceiros. Você pode continuar escrevendo.",
    checking: "Conferindo se o modelo de terceiros responde neste navegador.",
    idle: "IA da ORVUPI",
    queued: "Preparando modelo de terceiros… Você pode continuar escrevendo. Este aviso é trocado quando houver texto.",
    cancelled: "Cancelado. Não há resposta gerada.",
    error: "O modelo de terceiros não foi preparado.",
    emptyModel: "O modelo de terceiros não escreveu um texto usável.",
    busy: "Já há uma resposta em curso.",
    editor: "Editor",
    editorTitle: "Texto desta aba",
    editorNote: "Texto local desta aba. Se um modelo responder, ele roda neste navegador. Não é um documento do Work até você tocar em Guardar.",
    closeEditor: "Voltar ao chat",
    edit: "Editar",
    where: "Guardar cria uma nota nova no IndexedDB orvupi-work deste dispositivo. Não vai a um servidor. Não há OCR. Aqui só se leem TXT e MD. O texto não é executado.",
    third: "terceiro",
    task: "Tarefa",
    shortcut: "Atalho de tarefa. Não executa um modelo nem promete essa capacidade.",
    notBuilt: "Programar não está implementado. O atalho não cria um programa.",
    retries: "Houve três tentativas. Não há outra descarga automática.",
    excerptBadge: "trecho da fonte · não é o modelo",
    usesSources: "usa fontes e cita",
    sourcesLabel: "Fontes",
    useful: "Útil",
    notUseful: "Não útil",
    exportVotes: "Exportar votos deste dispositivo",
    wikiDisclosure: "ARQIVEN é a IA da ORVUPI e não tem um modelo próprio. O modelo de terceiros que você escolher responde neste navegador. As páginas da ORVUPI (MIT) são consultadas aqui. Se a pergunta não estiver coberta, consulta-se a Wikipedia no seu idioma (CC BY-SA): essa consulta envia só a pergunta, nunca um documento do Work.",
  },
  ja: {
    prepare: "再試行",
    ready: "第三者モデルの準備ができました",
    again: "このモデルを使う",
    cancel: "キャンセル",
    who: "ARQIVEN は ORVUPI の AI です。応答させるためにモデルをダウンロードする場合、それは第三者のもので、名前は別に示します。",
    preparing: "第三者モデルをダウンロードしています。入力は続けられます。",
    checking: "このブラウザで第三者モデルが応答するか確認しています。",
    idle: "ORVUPIのAI",
    queued: "第三者モデルを準備しています… 入力は続けられます。テキストができたらこの表示を置き換えます。",
    cancelled: "キャンセルしました。生成された回答はありません。",
    error: "第三者モデルを準備できませんでした。",
    emptyModel: "第三者モデルは使えるテキストを書きませんでした。",
    busy: "応答の処理中です。",
    editor: "エディタ",
    editorTitle: "このタブのテキスト",
    editorNote: "このタブのローカルなテキストです。モデルが答える場合もこのブラウザの中です。保存するまで Work の文書ではありません。",
    closeEditor: "チャットに戻る",
    edit: "編集",
    where: "保存すると、この端末の IndexedDB orvupi-work に新しいノートができます。サーバーには送られません。OCR はありません。ここでは TXT と MD だけを読みます。テキストは実行されません。",
    third: "第三者",
    task: "タスク",
    shortcut: "タスクの近道です。モデルは実行せず、その能力も約束しません。",
    notBuilt: "プログラミングは未実装です。このチップはプログラムを作りません。",
    retries: "3回試しました。これ以上は自動では受けません。",
    excerptBadge: "出典の抜粋 · モデルの文章ではない",
    usesSources: "出典を使い、出典を示します",
    sourcesLabel: "出典",
    useful: "役に立った",
    notUseful: "役に立たなかった",
    exportVotes: "この端末の投票を書き出す",
    wikiDisclosure: "ARQIVEN は ORVUPI の AI で、独自モデルはありません。選んだ第三者モデルがこのブラウザで答えます。ORVUPI のページ（MIT）はここで検索します。質問がページにないときだけ、あなたの言語の Wikipedia（CC BY-SA）に問い合わせます。送るのは質問だけで、Work の文書は送りません。",
  },
  ko: {
    prepare: "다시 시도",
    ready: "제3자 모델이 준비되었습니다",
    again: "이 모델 사용",
    cancel: "취소",
    who: "ARQIVEN은 ORVUPI의 AI입니다. 답을 받으려고 모델을 받으면 그 모델은 제3자이고, 이름은 따로 표시합니다.",
    preparing: "제3자 모델을 받는 중입니다. 계속 입력할 수 있습니다.",
    checking: "이 브라우저에서 제3자 모델이 응답하는지 확인하는 중입니다.",
    idle: "ORVUPI AI",
    queued: "제3자 모델을 준비하는 중… 계속 입력할 수 있습니다. 텍스트가 생기면 이 안내를 바꿉니다.",
    cancelled: "취소했습니다. 생성된 답은 없습니다.",
    error: "제3자 모델을 준비하지 못했습니다.",
    emptyModel: "제3자 모델이 쓸 수 있는 글을 쓰지 않았습니다.",
    busy: "응답이 이미 진행 중입니다.",
    editor: "편집기",
    editorTitle: "이 탭의 텍스트",
    editorNote: "이 탭의 로컬 텍스트입니다. 모델이 답해도 이 브라우저 안에서입니다. 저장하기 전에는 Work 문서가 아닙니다.",
    closeEditor: "채팅으로 돌아가기",
    edit: "편집",
    where: "저장하면 이 기기의 IndexedDB orvupi-work에 새 노트가 생깁니다. 서버로 보내지 않습니다. OCR은 없습니다. 여기서는 TXT와 MD만 읽습니다. 텍스트는 실행되지 않습니다.",
    third: "제3자",
    task: "작업",
    shortcut: "작업 바로가기입니다. 모델을 실행하지 않고, 그 능력을 약속하지도 않습니다.",
    notBuilt: "프로그래밍은 구현되지 않았습니다. 이 칩은 프로그램을 만들지 않습니다.",
    retries: "세 번 시도했습니다. 더 이상 자동으로 받지 않습니다.",
    excerptBadge: "출처 발췌 · 모델의 글이 아님",
    usesSources: "출처를 쓰고 출처를 밝힙니다",
    sourcesLabel: "출처",
    useful: "도움 됨",
    notUseful: "도움 안 됨",
    exportVotes: "이 기기의 투표 내보내기",
    wikiDisclosure: "ARQIVEN은 ORVUPI의 AI이고 자체 모델은 없습니다. 고른 제3자 모델이 이 브라우저에서 답합니다. ORVUPI 페이지(MIT)는 여기서 찾습니다. 질문이 페이지에 없을 때만 당신 언어의 Wikipedia(CC BY-SA)에 묻습니다. 질문만 보내고 Work 문서는 보내지 않습니다.",
  },
};
const ui = UI[uiLang];
const CHROME = {
  es: { newChat: "Nueva conversación", settings: "Ajustes", conversations: "Conversaciones", recent: "Recientes", search: "Buscar", welcome: "¿En qué puedo ayudarte?", note: "ARQIVEN es la IA de ORVUPI y funciona con modelos de terceros. Puede cometer errores; revisa la información importante. Lo que escribes se guarda en este navegador.", generating: "Generando", waiting: "En espera", done: "Listo", failed: "Error", copy: "Copiar", copied: "Copiado en este navegador.", copyFail: "No se pudo copiar.", againReply: "Volver a preguntar", attach: "Adjuntar", more: "Más" },
  en: { newChat: "New conversation", settings: "Settings", conversations: "Conversations", recent: "Recent", search: "Search", welcome: "How can I help?", note: "ARQIVEN is ORVUPI's AI and runs on third-party models. It can make mistakes; check anything that matters. What you write stays in this browser.", generating: "Generating", waiting: "Waiting", done: "Done", failed: "Error", copy: "Copy", copied: "Copied on this device.", copyFail: "Could not copy.", againReply: "Ask again", attach: "Attach", more: "More" },
  pt: { newChat: "Nova conversa", settings: "Ajustes", conversations: "Conversas", recent: "Recentes", search: "Buscar", welcome: "Como posso ajudar?", note: "ARQIVEN é a IA da ORVUPI e funciona com modelos de terceiros. Pode errar; confira a informação importante. O que você escreve fica neste navegador.", generating: "Gerando", waiting: "Em espera", done: "Pronto", failed: "Erro", copy: "Copiar", copied: "Copiado neste navegador.", copyFail: "Não foi possível copiar.", againReply: "Perguntar de novo", attach: "Anexar", more: "Mais" },
  ja: { newChat: "新しい会話", settings: "設定", conversations: "会話", recent: "最近", search: "検索", welcome: "何をお手伝いしましょうか。", note: "ARQIVEN は ORVUPI の AI で、第三者モデルで動きます。間違えることがあります。重要な情報は確認してください。書いた内容はこのブラウザに保存されます。", generating: "生成中", waiting: "待機", done: "完了", failed: "エラー", copy: "コピー", copied: "このブラウザにコピーしました。", copyFail: "コピーできませんでした。", againReply: "もう一度聞く", attach: "添付", more: "その他" },
  ko: { newChat: "새 대화", settings: "설정", conversations: "대화", recent: "최근", search: "검색", welcome: "무엇을 도와드릴까요?", note: "ARQIVEN은 ORVUPI의 AI이고 제3자 모델로 동작합니다. 틀릴 수 있으니 중요한 정보는 확인하세요. 쓴 내용은 이 브라우저에 저장됩니다.", generating: "생성 중", waiting: "대기", done: "완료", failed: "오류", copy: "복사", copied: "이 브라우저에 복사했습니다.", copyFail: "복사하지 못했습니다.", againReply: "다시 묻기", attach: "첨부", more: "더보기" },
};
const chrome = CHROME[uiLang];
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
  localText: "",
  conversationId: "",
  conversations: [],
  chatDb: null,
  contextRefs: [],
  prepareFailures: 0,
  snap: { phase: "idle", ready: false, modelId: "", modelVersion: "", progress: { loaded: 0, total: 0, file: "" }, error: "" },
  queue: [],
  painting: 0,
  knowledge: null,
  webgpu: false,
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
const save = document.getElementById("save-work");
const pill = document.querySelector(".workspace .pill");
const engine = arqivenEngine();

const engineBar = document.createElement("div");
engineBar.className = "engine-bar";
const modelPick = document.createElement("select");
modelPick.id = "model-pick";
modelPick.setAttribute("aria-label", ui.third);
for (const item of THIRD_PARTY_MODELS) {
  const option = document.createElement("option");
  option.value = item.id;
  option.textContent = `${item.version} · ${ui.third} · ${item.device} · ${item.sizeMb} MB`;
  if (item.id === defaultModel().id) option.selected = true;
  modelPick.append(option);
}
const prepare = document.createElement("button");
prepare.type = "button";
prepare.id = "prepare";
prepare.className = "prepare";
prepare.textContent = ui.prepare;
const cancel = document.createElement("button");
cancel.type = "button";
cancel.id = "cancel-engine";
cancel.className = "cancel";
cancel.textContent = ui.cancel;
cancel.hidden = true;
const progress = document.createElement("p");
progress.id = "engine-progress";
progress.className = "engine-progress";
progress.setAttribute("role", "status");
const meter = document.createElement("span");
meter.className = "engine-meter";
meter.hidden = true;
meter.append(document.createElement("i"));
engineBar.append(modelPick, prepare, cancel, meter, progress);
const indicator = document.createElement("p");
indicator.id = "model-indicator";
indicator.className = "model-indicator";
const sourceNote = document.createElement("p");
sourceNote.id = "source-note";
sourceNote.className = "source-note";
sourceNote.textContent = ui.wikiDisclosure;
const exportVotes = document.createElement("button");
exportVotes.type = "button";
exportVotes.id = "export-feedback";
exportVotes.className = "prepare";
exportVotes.textContent = ui.exportVotes;
engineBar.append(indicator, sourceNote, exportVotes);
const who = document.createElement("p");
who.className = "arq-who";
who.textContent = ui.who || "";
if (!ui.who) who.hidden = true;
document.getElementById("welcome")?.append(who);
document.getElementById("engine-slot")?.append(engineBar);
applyChrome();

const editorToggle = document.createElement("button");
editorToggle.type = "button";
editorToggle.id = "editor-toggle";
editorToggle.className = "editor-toggle";
editorToggle.textContent = ui.editor;
editorToggle.setAttribute("aria-pressed", "false");
document.getElementById("more-pop")?.append(editorToggle);

const editor = document.createElement("aside");
editor.id = "local-editor";
editor.className = "local-editor";
editor.hidden = true;
editor.setAttribute("aria-labelledby", "editor-title");
const editorHead = document.createElement("div");
editorHead.className = "editor-head";
const editorTitle = document.createElement("h2");
editorTitle.id = "editor-title";
editorTitle.textContent = ui.editorTitle;
const editorClose = document.createElement("button");
editorClose.type = "button";
editorClose.id = "editor-close";
editorClose.className = "ghost";
editorClose.textContent = ui.closeEditor;
editorHead.append(editorTitle, editorClose);
const editorNote = document.createElement("p");
editorNote.className = "editor-note";
editorNote.textContent = ui.editorNote;
const paper = document.createElement("div");
paper.className = "editor-paper";
const editorText = document.createElement("textarea");
editorText.id = "editor-text";
editorText.maxLength = 8000;
paper.append(editorText);
const editorFoot = document.createElement("p");
editorFoot.className = "editor-foot";
editorFoot.textContent = ui.where;
editor.append(editorHead, editorNote, paper, editorFoot);
app?.append(editor);

const CHIP_TASK = ["generate", "analyze", "explain", null];

function applyChrome() {
  const welcomeTitle = document.querySelector("#welcome h2");
  if (welcomeTitle) welcomeTitle.textContent = chrome.welcome;
  const note = document.querySelector(".composer-area .note");
  if (note) note.textContent = chrome.note;
  const fresh = document.querySelector("#new-chat-side .hide-collapsed");
  if (fresh) fresh.textContent = chrome.newChat;
  document.getElementById("new-chat")?.setAttribute("aria-label", chrome.newChat);
  document.getElementById("more-toggle")?.setAttribute("aria-label", chrome.more);
  const settingsButton = document.getElementById("open-settings");
  const settingsLabel = settingsButton?.querySelector("span");
  if (settingsLabel) settingsLabel.textContent = chrome.settings;
  settingsButton?.setAttribute("aria-label", chrome.settings);
  const navChat = document.querySelector("[data-nav='chat'] .hide-collapsed");
  if (navChat) navChat.textContent = chrome.conversations;
  const hist = document.getElementById("hist-label");
  if (hist) hist.textContent = chrome.recent;
  const crumb = document.getElementById("crumb");
  if (crumb) crumb.textContent = chrome.conversations;
  if (search instanceof HTMLInputElement) search.placeholder = chrome.search;
  const attachLabel = document.querySelector("#attach span");
  if (attachLabel) attachLabel.textContent = chrome.attach;
  const settingsTitle = document.getElementById("settings-title");
  if (settingsTitle) settingsTitle.textContent = chrome.settings;
}

function newId() {
  return globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `c-${Date.now()}`;
}

function hashId() {
  const match = location.hash.match(/^#c\/([A-Za-z0-9-]{8,80})$/);
  return match ? match[1] : "";
}

function setHash(id) {
  const next = `#c/${id}`;
  if (location.hash !== next) history.replaceState(null, "", `${location.pathname}${location.search}${next}`);
}

function slimMessage(item) {
  return {
    id: item.id,
    role: item.role,
    content: item.content,
    mode: item.mode,
    provider: item.provider,
    modelId: item.modelId,
    modelVersion: item.modelVersion,
    sources: item.sources,
  };
}

let saveTimer = 0;
function remember() {
  if (!state.messages.length || !state.chatDb) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { void persist(); }, 180);
}

async function persist() {
  if (!state.chatDb || !state.messages.some((item) => item.content)) return;
  const title = state.messages.find((item) => item.role === "user")?.content.replace(/\s+/g, " ").trim().slice(0, 80) || chrome.newChat;
  await saveConversation(state.chatDb, { id: state.conversationId, title, messages: state.messages.map(slimMessage) });
  state.conversations = await listConversations(state.chatDb);
  paintList();
  const heading = document.getElementById("thread-title");
  if (heading) heading.textContent = title;
  document.title = `${title} · ARQIVEN`;
}

async function openConversation(id) {
  if (!state.chatDb || !id) return;
  const row = await readConversation(state.chatDb, id);
  state.conversationId = id;
  state.messages = row?.messages ? row.messages.map((item) => ({ ...item })) : [];
  state.view = "chat";
  state.queue = [];
  setHash(id);
  paint();
  openMenu(false);
}

function fitViewport() {
  const viewport = window.visualViewport;
  const height = viewport?.height || window.innerHeight;
  const offset = viewport?.offsetTop || 0;
  document.documentElement.style.setProperty("--vv-height", `${Math.round(height)}px`);
  document.documentElement.style.setProperty("--vv-offset", `${Math.round(offset)}px`);
}

function addText(parent, value) {
  const paragraph = document.createElement("p");
  paragraph.textContent = value;
  parent.append(paragraph);
}

function addCode(parent, value) {
  const pre = document.createElement("pre");
  const code = document.createElement("code");
  code.textContent = value.replace(/\n$/, "");
  pre.append(code);
  parent.append(pre);
}

function addTable(parent, rows) {
  const wrap = document.createElement("div");
  wrap.className = "table-wrap";
  const table = document.createElement("table");
  rows.forEach((row, index) => {
    const cells = row.split("|").slice(1, -1).map((cell) => cell.trim());
    if (!cells.length || cells.every((cell) => /^:?-+:?$/.test(cell))) return;
    const line = document.createElement("tr");
    for (const cell of cells) {
      const node = document.createElement(index === 0 ? "th" : "td");
      node.textContent = cell;
      line.append(node);
    }
    table.append(line);
  });
  wrap.append(table);
  parent.append(wrap);
}

function renderRich(parent, text) {
  const chunks = String(text || "").split(/```/);
  chunks.forEach((chunk, index) => {
    if (index % 2 === 1) {
      addCode(parent, chunk.replace(/^[^\n]*\n/, ""));
      return;
    }
    const lines = chunk.split("\n");
    let buffer = [];
    let table = [];
    const flushText = () => {
      const value = buffer.join("\n").trim();
      buffer = [];
      if (value) addText(parent, value);
    };
    const flushTable = () => {
      if (table.length) addTable(parent, table);
      table = [];
    };
    for (const line of lines) {
      if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
        flushText();
        table.push(line.trim());
      } else {
        flushTable();
        buffer.push(line);
      }
    }
    flushTable();
    flushText();
  });
}

function sourceList(sources) {
  const list = document.createElement("ul");
  list.className = "sources";
  const caption = document.createElement("li");
  caption.className = "sources-label";
  caption.textContent = ui.sourcesLabel;
  list.append(caption);
  for (const source of sources) {
    if (!source?.url) continue;
    const item = document.createElement("li");
    const link = document.createElement("a");
    link.href = source.url;
    const origin = source.origin === "wikipedia" ? "Wikipedia" : "ORVUPI";
    link.textContent = `${source.title || source.url} · ${origin} · ${source.license || ""}`.trim();
    if (/^https?:/i.test(source.url)) {
      link.target = "_blank";
      link.rel = "noopener noreferrer";
    }
    item.append(link);
    list.append(item);
  }
  return list;
}

function voteButton(item, vote) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "vote";
  button.dataset.vote = vote;
  button.setAttribute("aria-pressed", item.vote === vote ? "true" : "false");
  button.setAttribute("aria-label", vote === "up" ? ui.useful : ui.notUseful);
  button.textContent = vote === "up" ? "👍" : "👎";
  button.addEventListener("click", () => { void rememberVote(item, vote, button); });
  return button;
}

async function rememberVote(item, vote, button) {
  item.vote = vote;
  const db = await openFeedbackDb();
  await saveVote(db, {
    id: `${item.id}:${vote}`,
    vote,
    lang,
    modelId: item.modelId,
    modelVersion: item.modelVersion,
    task: state.tool,
    sourceCount: item.sources?.length || 0,
  });
  button.setAttribute("aria-pressed", "true");
  const sibling = button.parentElement?.querySelector(`[data-vote="${vote === "up" ? "down" : "up"}"]`);
  sibling?.setAttribute("aria-pressed", "false");
}

async function downloadVotes() {
  const db = await openFeedbackDb();
  const votes = await listVotes(db);
  const blob = new Blob([exportPayload(votes)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "arqiven-votos.json";
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function knowledgeIndex() {
  if (state.knowledge) return state.knowledge;
  const response = await fetch("/arqiven/knowledge-index.json");
  if (!response.ok) return null;
  const payload = await response.json();
  state.knowledge = buildIndex(payload.chunks || []);
  return state.knowledge;
}

function startPrepare(modelId) {
  if (state.prepareFailures >= 3) {
    setStatus(ui.retries);
    return;
  }
  if (state.snap.phase === "preparing") return;
  engine.prepare(modelId || defaultModel().id);
}

function selectTool(button) {
  state.tool = button.getAttribute("data-tool") || "chat";
  document.querySelectorAll("[data-tool]").forEach((item) => item.setAttribute("aria-pressed", item === button ? "true" : "false"));
  if (selected) selected.textContent = `${ui.task}: ${button.textContent || ""}`;
  const tools = document.getElementById("tools");
  if (tools instanceof HTMLDetailsElement) tools.open = false;
}

function setStatus(text) {
  if (status) status.textContent = text;
}

function openMenu(open) {
  sidebar?.classList.toggle("open", open);
  backdrop?.classList.toggle("open", open);
  if (menu) menu.setAttribute("aria-expanded", open ? "true" : "false");
}

function openEditorWith(text, explicit) {
  const clean = sanitizePlain(text);
  const wide = window.matchMedia("(min-width: 1101px)").matches;
  if (!explicit && state.localText.trim() && state.localText !== clean) return;
  if (!explicit && !wide) return;
  state.localText = clean;
  editorText.value = clean;
  setEditor(true);
}

function setEditor(open) {
  editor.hidden = !open;
  root.classList.toggle("has-editor", open);
  editorToggle.setAttribute("aria-pressed", open ? "true" : "false");
  if (open) editorText.value = state.localText;
}

function updateEngineUi() {
  const snap = state.snap;
  const pct = snap.progress.total > 0 ? Math.min(100, Math.round((snap.progress.loaded / snap.progress.total) * 100)) : 0;
  if (pill) pill.textContent = ui.idle;
  prepare.textContent = snap.phase === "ready" ? ui.again : ui.prepare;
  prepare.disabled = snap.phase === "preparing" || snap.phase === "ready" && modelPick.value === snap.modelId;
  cancel.hidden = snap.phase !== "preparing" && !state.queue.some((item) => item.running);
  meter.hidden = snap.phase !== "preparing";
  meter.classList.toggle("is-known", snap.progress.total > 0);
  meter.querySelector("i").style.width = snap.progress.total > 0 ? `${Math.max(pct, 4)}%` : "";
  if (snap.phase === "preparing") {
    const file = snap.progress.file ? ` ${snap.progress.file}` : "";
    const ratio = snap.progress.total > 0 ? ` ${pct}%` : "";
    progress.textContent = `${snap.probe ? ui.checking : ui.preparing}${ratio || " …"}${file}`;
  } else if (snap.phase === "error") progress.textContent = ui.error;
  else   if (snap.phase === "ready") progress.textContent = `${ui.ready} · ${snap.modelId} · ${snap.modelVersion}`;
  else progress.textContent = "";
  const chosen = modelById(modelPick.value) || defaultModel();
  indicator.textContent = `${chosen.version} · ${ui.third} · ${ui.usesSources}`;
}

function paintSoon() {
  if (state.painting) return;
  state.painting = requestAnimationFrame(() => {
    state.painting = 0;
    paint();
  });
}

function currentTitle() {
  return state.messages.find((item) => item.role === "user")?.content.replace(/\s+/g, " ").trim().slice(0, 80) || "";
}

function paintList() {
  const query = (search instanceof HTMLInputElement ? search.value : "").trim().toLowerCase();
  const title = currentTitle();
  const saved = state.conversations.filter((item) => item.id !== state.conversationId);
  const list = (title ? [{ id: state.conversationId, title }] : []).concat(saved).filter((item) => !query || item.title.toLowerCase().includes(query));
  if (!recent) return;
  recent.replaceChildren();
  if (!list.length) {
    const note = document.createElement("p");
    note.textContent = copy.empty;
    recent.append(note);
    return;
  }
  for (const item of list) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = item.title || chrome.newChat;
    if (item.id === state.conversationId) button.setAttribute("aria-current", "true");
    button.addEventListener("click", () => { void openConversation(item.id); });
    recent.append(button);
  }
}

function paint() {
  paintList();
  const running = state.queue.some((item) => item.running) || state.messages.some((item) => item.pending);
  const failed = state.messages.some((item) => item.failed);
  root.dataset.state = running ? "generating" : failed ? "error" : state.messages.length ? "done" : "ready";
  if (messages) {
    messages.replaceChildren();
    for (const item of state.messages) {
      const node = document.createElement("article");
      node.id = item.id;
      node.className = item.role === "user" ? "user" : "assistant";
      if (item.role === "assistant") {
        const avatar = document.createElement("span");
        avatar.className = "avatar crop crop-icon";
        avatar.setAttribute("aria-hidden", "true");
        const mark = document.createElement("img");
        mark.src = "/assets/arqiven/logo-oficial.png";
        mark.alt = "";
        avatar.append(mark);
        const column = document.createElement("div");
        column.className = "body";
        const meta = document.createElement("p");
        meta.className = "meta";
        const who = document.createElement("span");
        who.className = "who";
        who.textContent = "ARQIVEN";
        const badge = document.createElement("span");
        badge.className = "badge";
        if (item.failed) badge.classList.add("is-error");
        if (item.running) badge.classList.add("is-run");
        meta.append(avatar, who);
        if (!item.running) {
          badge.textContent = item.failed ? chrome.failed : item.mode === "extractive" ? ui.excerptBadge : badgeOf(item);
          meta.append(badge);
        }
        column.append(meta);
        renderRich(column, item.content);
        if (item.sources?.length) column.append(sourceList(item.sources));
        if (item.content && !item.running) {
          const actions = document.createElement("div");
          actions.className = "answer-actions";
          const edit = document.createElement("button");
          edit.type = "button";
          edit.textContent = ui.edit;
          edit.addEventListener("click", () => openEditorWith(item.content, true));
          const copyButton = document.createElement("button");
          copyButton.type = "button";
          copyButton.textContent = chrome.copy;
          copyButton.addEventListener("click", () => {
            const done = navigator.clipboard?.writeText(item.content);
            if (!done) { setStatus(chrome.copyFail); return; }
            void done.then(() => setStatus(chrome.copied)).catch(() => setStatus(chrome.copyFail));
          });
          const up = voteButton(item, "up");
          const down = voteButton(item, "down");
          actions.append(copyButton, edit, up, down);
          if (!item.running) {
            const again = document.createElement("button");
            again.type = "button";
            again.textContent = chrome.againReply;
            again.addEventListener("click", () => {
              const index = state.messages.indexOf(item);
              const prior = [...state.messages.slice(0, index)].reverse().find((entry) => entry.role === "user");
              if (prior && prompt instanceof HTMLTextAreaElement) {
                prompt.value = prior.content;
                void send();
              }
            });
            actions.append(again);
          }
          column.append(actions);
        }
        node.append(column);
      } else {
        node.textContent = item.content;
      }
      messages.append(node);
    }
    messages.scrollTop = messages.scrollHeight;
  }
  const threaded = state.messages.length > 0 && state.view === "chat";
  welcome?.toggleAttribute("hidden", state.view !== "chat" || state.messages.length > 0);
  view?.classList.toggle("is-thread", threaded);
  if (view) view.hidden = state.view === "settings";
  const settings = document.getElementById("settings");
  if (settings) settings.hidden = state.view !== "settings";
  if (save) save.hidden = state.messages.length === 0 && !state.localText.trim();
  if (status && (running || status.textContent === ui.queued || status.textContent === chrome.generating)) {
    status.textContent = running ? (state.messages.some((item) => item.running) ? chrome.generating : ui.queued) : "";
  }
  const heading = document.getElementById("thread-title");
  const title = currentTitle();
  if (heading && state.view === "chat") heading.textContent = title || "ARQIVEN";
  if (title) document.title = `${title} · ARQIVEN`;
  remember();
  document.querySelectorAll("[data-nav]").forEach((button) => {
    const on = button.getAttribute("data-nav") === state.view;
    if (on) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
  updateEngineUi();
}

function showView(name) {
  state.view = name === "settings" ? "settings" : "chat";
  paint();
  openMenu(false);
}

function assistant(partial) {
  const item = {
    id: `m-${state.messages.length}-a`,
    role: "assistant",
    content: "",
    mode: "rules",
    provider: "none",
    modelId: "none",
    modelVersion: "",
    ...partial,
  };
  state.messages.push(item);
  return item;
}

function markCancelled() {
  for (const item of state.messages) {
    if (!item.pending) continue;
    item.pending = false;
    item.content = ui.cancelled;
    item.mode = "rules";
    item.provider = "none";
    item.modelId = "none";
    item.modelVersion = "";
  }
  state.queue = [];
}

async function streamInto(item, request) {
  item.pending = false;
  item.mode = "model";
  item.provider = "third-party";
  item.modelId = state.snap.modelId;
  item.modelVersion = state.snap.modelVersion;
  item.content = "";
  item.running = true;
  state.queue.push(item);
  paint();
  try {
    const result = await engine.run(request, (token) => {
      item.content += token;
      paintSoon();
    }, lang, item.promptSources || []);
    const guarded = finishModelAnswer(result.text, lang, item.sources, item.question);
    if (guarded.blocked) {
      item.running = false;
      state.queue = state.queue.filter((entry) => entry !== item);
      item.content = guarded.text;
      item.mode = "rules";
      item.provider = "none";
      item.modelId = "none";
      item.modelVersion = "";
      item.blocked = guarded.blocked;
      paint();
      return;
    }
    item.running = false;
    state.queue = state.queue.filter((entry) => entry !== item);
    const usable = String(result.text || "").trim();
    if (guarded.extractive || usable.length < 24 || result.provider !== "third-party") {
      const excerpt = guarded.extractive && guarded.text.trim().length >= 24
        ? guarded.text
        : (extractiveFromSources(lang, item.sources, item.question) || citedExcerpt(lang, item.sources, item.question));
      item.content = result.provider === "third-party" ? (excerpt || ui.emptyModel) : (result.text || honest);
      if (excerpt && result.provider === "third-party") {
        item.mode = "extractive";
        item.provider = "none";
        item.modelId = "none";
        item.modelVersion = "";
      } else {
      item.mode = result.mode;
      item.provider = result.provider;
      item.modelId = result.modelId;
      item.modelVersion = result.modelVersion || "";
      }
    } else {
      item.content = sanitizePlain(result.text);
      item.mode = result.mode;
      item.provider = result.provider;
      item.modelId = result.modelId;
      item.modelVersion = result.modelVersion || "";
      openEditorWith(item.content, false);
    }
  } catch (error) {
    item.running = false;
    state.queue = state.queue.filter((entry) => entry !== item);
    const message = error instanceof Error ? error.message : "";
    if (message === "cancelled") {
      item.content = item.content || ui.cancelled;
      if (!item.content || item.content === ui.cancelled) {
        item.mode = "rules";
        item.provider = "none";
        item.modelId = "none";
        item.modelVersion = "";
      }
    } else {
      item.content = `${ui.error} ${message}`.trim();
      item.failed = true;
      item.mode = "rules";
      item.provider = "none";
      item.modelId = "none";
      item.modelVersion = "";
    }
  }
  paint();
}

function failQueue(message) {
  for (const item of state.messages) {
    if (!item.pending) continue;
    item.pending = false;
    item.request = null;
    const excerpt = citedExcerpt(lang, item.sources, item.question) || (item.sources?.[0] ? excerptAnswer(lang, item.sources[0], item.question) : "");
    if (excerpt) {
      item.content = excerpt;
      item.mode = "extractive";
      item.provider = "none";
      item.modelId = "none";
      item.modelVersion = "";
    } else {
      item.content = `${ui.error} ${message || ""}`.trim();
      item.mode = "rules";
      item.provider = "none";
      item.modelId = "none";
      item.modelVersion = "";
    }
  }
  state.queue = state.queue.filter((item) => item.running);
}

async function flushQueue() {
  const next = state.queue.find((item) => item.pending && item.request);
  if (!next || !state.snap.ready) return;
  const request = next.request;
  next.request = null;
  await streamInto(next, request);
  if (state.queue.some((item) => item.pending)) await flushQueue();
}

async function send() {
  const field = prompt instanceof HTMLTextAreaElement ? prompt : null;
  const text = (field?.value || "").trim();
  const local = state.localText.trim();
  if (!text && !state.attachment && !local) return;
  if (state.queue.some((item) => item.running)) {
    setStatus(ui.busy);
    return;
  }
  const visible = [text, state.attachment ? state.attachment.name : "", local && !state.attachment ? ui.editorTitle : ""].filter(Boolean).join("\n");
  const modelText = [text, state.attachment?.text || "", local].filter(Boolean).join("\n\n").slice(0, 8000);
  const index = await knowledgeIndex().catch(() => null);
  const plan = await planTurn({
    question: text,
    lang,
    index,
    model: modelById(modelPick.value) || defaultModel(),
    fetchImpl: text && !state.attachment ? globalThis.fetch.bind(globalThis) : null,
  });
  const user = { id: `m-${state.messages.length}-u`, role: "user", content: visible, modelContent: modelText };
  state.messages.push(user);
  const request = createRequest({
    source: "central",
    task: state.tool,
    conversationId: state.conversationId,
    contextRefs: state.contextRefs,
    messages: clipHistory(state.messages.filter((item) => item.role === "user" || item.role === "assistant").map((item) => ({
      role: item.role,
      content: item.modelContent || item.content,
    }))),
  });
  if (field) field.value = "";
  state.attachment = null;
  const chip = document.getElementById("file-chip");
  if (chip) chip.textContent = "";
  if (plan.skipModel) {
    assistant({ content: plan.text, mode: "rules", provider: "none", modelId: "none", sources: plan.sources });
    paint();
    field?.focus();
    return;
  }
  const excerpt = citedExcerpt(lang, plan.sources, text);
  if (!state.snap.ready) {
    if (state.snap.phase !== "preparing") startPrepare(modelPick.value || defaultModel().id);
    const item = assistant({
      content: excerpt,
      pending: true,
      mode: excerpt ? "extractive" : "rules",
      request,
      sources: plan.sources,
      promptSources: plan.promptSources,
      question: text,
    });
    setStatus(ui.queued);
    state.queue.push(item);
    paint();
    field?.focus();
    return;
  }
  const item = assistant({ sources: plan.sources, promptSources: plan.promptSources, question: text });
  await streamInto(item, request);
  field?.focus();
}

engine.subscribe((snap) => {
  const was = state.snap.phase;
  state.snap = snap;
  if (snap.phase === "idle" && was === "preparing") markCancelled();
  if (snap.phase === "error" && was !== "error") {
    const next = stepDown(modelPick.value, state.webgpu);
    if (next && state.prepareFailures < 2) {
      state.prepareFailures += 1;
      modelPick.value = next;
      startPrepare(next);
      paint();
      return;
    }
    state.prepareFailures += 1;
    failQueue(snap.error);
    if (state.prepareFailures >= 3) setStatus(ui.retries);
  }
  paint();
  if (snap.phase === "ready") void flushQueue();
});

document.querySelectorAll("#new-chat, #new-chat-side").forEach((button) => button.addEventListener("click", async () => {
  await persist();
  state.messages = [];
  state.attachment = null;
  state.localText = "";
  state.queue = [];
  state.view = "chat";
  state.conversationId = newId();
  setHash(state.conversationId);
  if (prompt instanceof HTMLTextAreaElement) prompt.value = "";
  editorText.value = "";
  setStatus("");
  document.title = "ARQIVEN";
  paint();
}));

document.getElementById("collapse")?.addEventListener("click", () => {
  const collapsed = app?.classList.toggle("is-collapsed");
  document.getElementById("collapse")?.setAttribute("aria-pressed", collapsed ? "true" : "false");
});

menu?.addEventListener("click", () => openMenu(!sidebar?.classList.contains("open")));
document.getElementById("more-toggle")?.addEventListener("click", () => {
  const pop = document.getElementById("more-pop");
  const open = pop?.classList.toggle("is-open");
  document.getElementById("more-toggle")?.setAttribute("aria-expanded", open ? "true" : "false");
});
backdrop?.addEventListener("click", () => openMenu(false));

document.querySelectorAll("[data-nav]").forEach((button) => {
  button.addEventListener("click", () => showView(button.getAttribute("data-nav") || "chat"));
});

document.querySelectorAll("[data-tool]").forEach((button) => {
  button.addEventListener("click", () => selectTool(button));
});

const toolsMenu = document.getElementById("tools");
toolsMenu?.addEventListener("keydown", (event) => {
  if (!(event instanceof KeyboardEvent)) return;
  const buttons = [...toolsMenu.querySelectorAll("[data-tool]")];
  const current = Math.max(0, buttons.findIndex((item) => item === document.activeElement || item.getAttribute("aria-pressed") === "true"));
  if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
  event.preventDefault();
  if (toolsMenu instanceof HTMLDetailsElement) toolsMenu.open = true;
  const step = event.key === "ArrowDown" ? 1 : -1;
  const next = buttons[(current + step + buttons.length) % buttons.length];
  next?.focus();
});

document.querySelectorAll("[data-chip]").forEach((button, index) => {
  button.addEventListener("click", () => {
    if (!(prompt instanceof HTMLTextAreaElement)) return;
    const task = CHIP_TASK[index] ?? null;
    if (!task) {
      state.tool = "chat";
      document.querySelectorAll("[data-tool]").forEach((item) => item.setAttribute("aria-pressed", item.getAttribute("data-tool") === "chat" ? "true" : "false"));
      if (selected) selected.textContent = `${ui.task}: ${button.textContent || ""}`;
      prompt.value = "";
      setStatus(ui.notBuilt);
      prompt.focus();
      return;
    }
    state.tool = task;
    document.querySelectorAll("[data-tool]").forEach((item) => item.setAttribute("aria-pressed", item.getAttribute("data-tool") === task ? "true" : "false"));
    if (selected) selected.textContent = `${ui.task}: ${button.textContent || ""}`;
    const current = prompt.value.trim();
    if (!current) prompt.value = button.getAttribute("data-chip") || button.textContent || "";
    setStatus(ui.shortcut);
    prompt.focus();
  });
});

document.getElementById("send")?.addEventListener("click", () => { void send(); });
prompt?.addEventListener("keydown", (event) => {
  if (!(event instanceof KeyboardEvent) || event.key !== "Enter" || event.shiftKey) return;
  event.preventDefault();
  void send();
});

document.addEventListener("keydown", (event) => {
  if (!(event instanceof KeyboardEvent) || event.key !== "Escape") return;
  if (toolsMenu instanceof HTMLDetailsElement && toolsMenu.open) {
    toolsMenu.open = false;
    return;
  }
  openMenu(false);
  setEditor(false);
});

document.getElementById("voice")?.addEventListener("click", () => setStatus(copy.voice));
prepare.addEventListener("click", () => { startPrepare(modelPick.value || defaultModel().id); });
modelPick.addEventListener("change", () => paint());
exportVotes.addEventListener("click", () => { void downloadVotes(); });
cancel.addEventListener("click", () => { engine.cancel(); });
editorToggle.addEventListener("click", () => setEditor(editor.hidden));
editorClose.addEventListener("click", () => setEditor(false));
editorText.addEventListener("input", () => { state.localText = editorText.value; });

document.getElementById("attach")?.addEventListener("click", () => fileInput?.click());
fileInput?.addEventListener("change", () => {
  const input = fileInput instanceof HTMLInputElement ? fileInput : null;
  const file = input?.files?.[0];
  if (!file) return;
  const allowed = /\.(txt|md)$/i.test(file.name) || file.type.startsWith("text/");
  if (!allowed) {
    setStatus(copy.fileBad);
    if (input) input.value = "";
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    const text = sanitizePlain(typeof reader.result === "string" ? reader.result : "");
    state.attachment = { name: file.name.slice(0, 120), text };
    state.localText = text;
    editorText.value = text;
    const chip = document.getElementById("file-chip");
    if (chip) chip.textContent = file.name;
    setStatus(`${copy.fileRead} ${file.name}`);
    if (window.matchMedia("(min-width: 1101px)").matches) setEditor(true);
  };
  reader.readAsText(file);
  if (input) input.value = "";
});

save?.addEventListener("click", () => {
  const transcript = state.messages.map((item) => `${item.role}: ${sanitizePlain(item.content, 4000)}`).join("\n\n");
  const body = sanitizePlain(state.localText.trim() || transcript, 4000);
  if (!body) return;
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
    body,
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
    snippet: body.slice(0, 240),
  }).then(async (saved) => {
    if (!saved?.ok || saved.id !== id) {
      setStatus(copy.saveFail);
      return;
    }
    const loaded = await loadWorkBytes(saved.id);
    const back = loaded ? JSON.parse(new TextDecoder().decode(loaded.bytes)) : null;
    if (!back || back.id !== id || back.format !== "orvupi-note" || back.body !== body) {
      setStatus(copy.saveFail);
      return;
    }
    state.contextRefs = [saved.id];
    setStatus(`${copy.saved} ${saved.id}`);
  }).catch(() => setStatus(copy.saveFail));
});

search?.addEventListener("input", () => paint());
if (selected) selected.textContent = `${ui.task}: ${selected.textContent || ""}`;
fitViewport();
window.visualViewport?.addEventListener("resize", fitViewport);
window.visualViewport?.addEventListener("scroll", fitViewport);
window.addEventListener("resize", fitViewport);
window.addEventListener("hashchange", () => {
  const id = hashId();
  if (id && id !== state.conversationId) void openConversation(id);
});

async function bootChats() {
  state.conversationId = hashId() || newId();
  setHash(state.conversationId);
  try {
    state.chatDb = await openChatDb();
    state.conversations = await listConversations(state.chatDb);
    const saved = await readConversation(state.chatDb, state.conversationId);
    if (saved?.messages?.length) state.messages = saved.messages.map((item) => ({ ...item }));
  } catch {
    state.chatDb = null;
  }
  paint();
}

async function bootModel() {
  try {
    const adapter = navigator.gpu?.requestAdapter
      ? await Promise.race([
        navigator.gpu.requestAdapter(),
        new Promise((resolve) => setTimeout(() => resolve(null), 800)),
      ])
      : null;
    state.webgpu = Boolean(adapter);
  } catch {
    state.webgpu = false;
  }
  const chosen = modelForDevice({
    webgpu: state.webgpu,
    memory: Number(navigator.deviceMemory) || 0,
    wide: window.matchMedia("(min-width: 1100px)").matches,
  });
  if (!state.webgpu) {
    modelPick.value = defaultModel().id;
    startPrepare(defaultModel().id);
    return;
  }
  modelPick.value = chosen.id;
  startPrepare(chosen.id);
}
void bootChats().then(() => bootModel());
