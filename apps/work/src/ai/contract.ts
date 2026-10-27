/** Misma forma que web/v2/shared/ia/contract.mjs. El motor de Work sigue siendo de terceros. */

export type AiSource = "central" | "work" | "studio";
export type AiTask = "chat" | "summarize" | "explain" | "rewrite" | "translate" | "outline" | "questions" | "analyze" | "generate" | "ask";
export type AiMode = "model" | "mixed" | "extractive" | "rules";
export type AiProviderKind = "third-party" | "arqiven" | "none";

export type AiRequest = {
  requestId: string;
  conversationId: string;
  source: AiSource;
  task: AiTask;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  contextRefs: string[];
  selection?: string;
  targetLanguage?: string;
  exportAs?: "docx" | "pdf" | "txt";
};

export type AiResult = {
  text: string;
  modelId: string;
  modelVersion: string;
  provider: AiProviderKind;
  mode: AiMode;
  contextUsed: string[];
};

const TASKS: readonly AiTask[] = ["chat", "summarize", "explain", "rewrite", "translate", "outline", "questions", "analyze", "generate", "ask"];
const MODES: readonly AiMode[] = ["model", "mixed", "extractive", "rules"];

const HONEST = "No hay respuesta generada. ARQIVEN no tiene un checkpoint de Arqiven-1. Los modelos de Work (Qwen, LFM2 y SmolLM2) son de terceros y no se llaman Arqiven-N. Puedes seguir escribiendo.";

function newId(): string {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `req-${Date.now()}`;
}

export function buildWorkRequest(input: {
  task: string;
  messages: Array<{ role: string; content: string }>;
  contextRefs: string[];
  exportAs?: "docx" | "pdf" | "txt";
}): AiRequest {
  const task = TASKS.includes(input.task as AiTask) ? (input.task as AiTask) : "chat";
  const messages = input.messages.flatMap((item) => {
    if ((item.role !== "user" && item.role !== "assistant") || typeof item.content !== "string") return [];
    return [{ role: item.role, content: item.content.slice(0, 8000) }];
  }).slice(0, 40);
  const request: AiRequest = {
    requestId: newId(),
    conversationId: "work",
    source: "work",
    task,
    messages,
    contextRefs: input.contextRefs.filter((id) => id).map((id) => id.slice(0, 80)).slice(0, 20),
  };
  if (input.exportAs) request.exportAs = input.exportAs;
  return request;
}

export function honestResult(request: AiRequest): AiResult {
  return {
    text: HONEST,
    modelId: "none",
    modelVersion: "",
    provider: "none",
    mode: "rules",
    contextUsed: request.contextRefs.slice(),
  };
}

export function settleResult(request: AiRequest, raw: {
  text?: string;
  modelId?: string;
  modelVersion?: string;
  provider?: string;
  mode?: string;
  checkpoint?: boolean;
}): AiResult {
  const modelId = raw.modelId ? raw.modelId.slice(0, 80) : "none";
  const provider: AiProviderKind = raw.provider === "third-party" || raw.provider === "arqiven" || raw.provider === "none" ? raw.provider : "none";
  const mode: AiMode = MODES.includes(raw.mode as AiMode) ? (raw.mode as AiMode) : "rules";
  const own = provider === "arqiven" || modelId.startsWith("arqiven-");
  if (own && raw.checkpoint !== true) return honestResult(request);
  return {
    text: typeof raw.text === "string" ? raw.text : "",
    modelId,
    modelVersion: raw.modelVersion ? raw.modelVersion.slice(0, 80) : "",
    provider,
    mode,
    contextUsed: request.contextRefs.slice(),
  };
}
