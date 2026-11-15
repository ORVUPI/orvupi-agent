/** Adaptador de /api/chat. No abre el puerto de Ollama: solo llama al que ya escucha en este equipo. */

import { codeError } from "./errors.mjs";
import { transcriptTokens } from "./budget.mjs";
import { cutRepeatedSentences } from "./salida.mjs";

export { cutRepeatedSentences };

export function buildChatBody({ model, messages, think, numCtx, numPredict, temperature }) {
  return {
    model,
    messages,
    stream: true,
    think: think === true,
    options: {
      num_ctx: numCtx,
      num_predict: numPredict,
      temperature,
    },
  };
}

export function stripThinking(text) {
  return String(text || "").replace(/<think>[\s\S]*?<\/think>/gi, "").replace(/<think>[\s\S]*$/i, "").trim();
}

function aborted(signal) {
  const reason = signal?.reason;
  if (reason && (reason.code === "timeout" || reason.code === "cancelled")) return reason;
  return codeError("cancelled");
}

export async function streamChat({ base, body, signal, timeoutMs, onToken }) {
  const room = Number(body?.options?.num_ctx) - Number(body?.options?.num_predict);
  if (!Number.isFinite(room) || room < 1 || transcriptTokens(body?.messages) > room) throw codeError("budget");
  const killer = new AbortController();
  const timer = setTimeout(() => killer.abort(codeError("timeout")), timeoutMs);
  const onParent = () => killer.abort(aborted(signal));
  if (signal?.aborted) onParent();
  else signal?.addEventListener("abort", onParent, { once: true });
  const started = Date.now();
  let ttftMs = 0;
  let text = "";
  let done = null;
  let hiding = false;
  const emitVisible = (piece) => {
    let rest = piece;
    while (rest) {
      if (hiding) {
        const end = rest.toLowerCase().indexOf("</think>");
        if (end < 0) return;
        hiding = false;
        rest = rest.slice(end + "</think>".length);
        continue;
      }
      const start = rest.toLowerCase().indexOf("<think>");
      if (start < 0) {
        if (!ttftMs) ttftMs = Math.max(1, Date.now() - started);
        text += rest;
        onToken?.(rest);
        return;
      }
      if (start > 0) {
        const visible = rest.slice(0, start);
        if (!ttftMs) ttftMs = Math.max(1, Date.now() - started);
        text += visible;
        onToken?.(visible);
      }
      hiding = true;
      rest = rest.slice(start + "<think>".length);
    }
  };
  try {
    let response;
    try {
      response = await fetch(new URL("/api/chat", base), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: killer.signal,
      });
    } catch (error) {
      if (killer.signal.aborted) throw aborted(killer.signal);
      throw codeError("ollama-down", error);
    }
    if (response.status === 404) throw codeError("model-missing");
    if (!response.ok || !response.body) {
      const detail = await response.text().catch(() => "");
      if (/not found|no such model|model '.+' not found/i.test(detail)) throw codeError("model-missing");
      const error = codeError("ollama-error");
      error.detail = detail.slice(0, 160);
      throw error;
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    try {
      while (true) {
        let chunk;
        try {
          chunk = await reader.read();
        } catch (error) {
          if (killer.signal.aborted) throw aborted(killer.signal);
          throw codeError("ollama-down", error);
        }
        if (chunk.done) break;
        buffer += decoder.decode(chunk.value, { stream: true });
        let nl = buffer.indexOf("\n");
        while (nl >= 0) {
          const line = buffer.slice(0, nl).trim();
          buffer = buffer.slice(nl + 1);
          nl = buffer.indexOf("\n");
          if (!line) continue;
          const event = JSON.parse(line);
          if (event.error) {
            if (/not found|no such model/i.test(String(event.error))) throw codeError("model-missing");
            const error = codeError("ollama-error");
            error.detail = String(event.error).slice(0, 160);
            throw error;
          }
          const piece = String(event.message?.content || "");
          if (piece) emitVisible(piece);
          if (event.done === true) done = event;
        }
      }
    } finally {
      try { reader.releaseLock?.(); } catch { /* el flujo ya se cerró */ }
    }
    if (killer.signal.aborted) throw aborted(killer.signal);
    const visible = cutRepeatedSentences(stripThinking(text));
    if (!visible) throw codeError("empty");
    return { text: visible, ttftMs, done, totalMs: Math.max(1, Date.now() - started) };
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onParent);
  }
}
