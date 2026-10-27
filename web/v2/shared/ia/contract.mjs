/** Contrato común de ARQIVEN. No descarga pesos ni llama a una API de pago.
 * No se usa orvupi-text-experimental. La ficha reservada es arqiven-1-experimental
 * y no entra en capabilities() hasta que exista un checkpoint propio.
 */

export const TASKS = ["chat", "summarize", "explain", "rewrite", "translate", "outline", "questions", "analyze", "generate", "ask"];
export const MODES = ["model", "mixed", "extractive", "rules"];

const HONEST = {
  es: "No hay respuesta generada. ARQIVEN no tiene un checkpoint de Arqiven-1. Los modelos de Work (Qwen, LFM2 y SmolLM2) son de terceros y no se llaman Arqiven-N. Puedes seguir escribiendo.",
  en: "There is no generated answer. ARQIVEN has no Arqiven-1 checkpoint. The models in Work (Qwen, LFM2 and SmolLM2) belong to other authors and are not named Arqiven-N. You can keep typing.",
  pt: "Não há resposta gerada. ARQIVEN não tem um checkpoint de Arqiven-1. Os modelos do Work (Qwen, LFM2 e SmolLM2) são de terceiros e não se chamam Arqiven-N. Você pode continuar escrevendo.",
  ja: "生成された回答はありません。ARQIVEN には Arqiven-1 のチェックポイントがありません。Work のモデル（Qwen、LFM2、SmolLM2）は第三者のもので、Arqiven-N ではありません。入力は続けられます。",
  ko: "생성된 답은 없습니다. ARQIVEN에는 Arqiven-1 체크포인트가 없습니다. Work의 모델(Qwen, LFM2, SmolLM2)은 제3자 모델이며 Arqiven-N이 아닙니다. 계속 입력할 수 있습니다.",
};

export function newId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `req-${Date.now()}`;
}

export function honestText(lang) {
  if (lang === "en") return HONEST.en;
  if (lang === "pt" || lang === "pt-BR") return HONEST.pt;
  if (lang === "ja") return HONEST.ja;
  if (lang === "ko") return HONEST.ko;
  return HONEST.es;
}

export function createRequest(input = {}) {
  const task = TASKS.includes(input.task) ? input.task : "chat";
  const source = input.source === "work" || input.source === "studio" || input.source === "central" ? input.source : "central";
  const messages = Array.isArray(input.messages)
    ? input.messages.flatMap((item) => {
      if (!item || (item.role !== "user" && item.role !== "assistant") || typeof item.content !== "string") return [];
      return [{ role: item.role, content: item.content.slice(0, 8000) }];
    }).slice(0, 40)
    : [];
  const contextRefs = Array.isArray(input.contextRefs)
    ? input.contextRefs.filter((id) => typeof id === "string" && id).map((id) => id.slice(0, 80)).slice(0, 20)
    : [];
  const request = {
    requestId: typeof input.requestId === "string" && input.requestId ? input.requestId.slice(0, 80) : newId(),
    conversationId: typeof input.conversationId === "string" && input.conversationId ? input.conversationId.slice(0, 80) : "tab",
    source,
    task,
    messages,
    contextRefs,
  };
  if (typeof input.selection === "string" && input.selection) request.selection = input.selection.slice(0, 8000);
  if (typeof input.targetLanguage === "string" && input.targetLanguage) request.targetLanguage = input.targetLanguage.slice(0, 16);
  if (input.exportAs === "docx" || input.exportAs === "pdf" || input.exportAs === "txt") request.exportAs = input.exportAs;
  return request;
}

export function capabilities() {
  return {
    operations: ["capabilities", "prepare", "run", "cancel"],
    tasks: TASKS.slice(),
    modes: ["rules"],
    models: [],
    documentsLeaveDevice: false,
    checkpoint: false,
    reservedModelId: "arqiven-1-experimental",
    reservedModelVersion: "Arqiven-1 experimental",
  };
}

export function honestResult(request, lang = "es") {
  return {
    text: honestText(lang),
    modelId: "none",
    modelVersion: "",
    provider: "none",
    mode: "rules",
    contextUsed: request.contextRefs.slice(),
  };
}

export function settleResult(request, raw = {}) {
  const modelId = typeof raw.modelId === "string" && raw.modelId ? raw.modelId.slice(0, 80) : "none";
  const provider = raw.provider === "third-party" || raw.provider === "arqiven" || raw.provider === "none" ? raw.provider : "none";
  const mode = MODES.includes(raw.mode) ? raw.mode : "rules";
  const own = provider === "arqiven" || modelId.startsWith("arqiven-");
  if (own && raw.checkpoint !== true) return honestResult(request, raw.lang || "es");
  return {
    text: typeof raw.text === "string" ? raw.text : "",
    modelId,
    modelVersion: typeof raw.modelVersion === "string" ? raw.modelVersion.slice(0, 80) : "",
    provider,
    mode,
    contextUsed: request.contextRefs.slice(),
  };
}

/** El catálogo de Studio sigue siendo la respuesta. Un gancho vacío no la sustituye. */
export function catalogAsk() {
  return { text: "", mode: "rules", provider: "none", modelId: "none" };
}

export function listModels(ids, checkpoint = false) {
  const list = Array.isArray(ids) ? ids.filter((id) => typeof id === "string" && id) : [];
  if (checkpoint === true) return list.slice();
  return list.filter((id) => !id.startsWith("arqiven-"));
}
