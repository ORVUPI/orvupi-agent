/** Cliente del backend local. En la web pública esta ruta no existe y el modo navegador sigue igual. */

export async function readNdjson(response, onEvent) {
  const reader = response.body?.getReader();
  if (!reader) return;
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    buffer += decoder.decode(chunk.value, { stream: true });
    let nl = buffer.indexOf("\n");
    while (nl >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      nl = buffer.indexOf("\n");
      if (!line) continue;
      onEvent(JSON.parse(line));
    }
  }
}

export async function localStatus(fetchImpl = globalThis.fetch, timeoutMs = 600) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const response = await fetchImpl("/api/arqiven/status", { signal: ctrl.signal });
    if (!response.ok) return null;
    const body = await response.json();
    if (body?.mode !== "local" || body?.runtime !== "ollama") return null;
    return body;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function localChat({ fetchImpl = globalThis.fetch, body, signal, onEvent }) {
  const response = await fetchImpl("/api/arqiven/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!response.ok) {
    let payload = {};
    try { payload = await response.json(); } catch { /* el cuerpo no era JSON */ }
    onEvent?.({ type: "error", code: payload.code || "bad-request", message: payload.message || "" });
    return;
  }
  await readNdjson(response, (event) => onEvent?.(event));
}

export function cancelLocal(requestId, fetchImpl = globalThis.fetch) {
  return fetchImpl("/api/arqiven/cancel", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ requestId }),
  }).catch(() => undefined);
}

export async function localConversations(fetchImpl = globalThis.fetch) {
  try {
    const response = await fetchImpl("/api/arqiven/conversations");
    if (!response.ok) return null;
    const body = await response.json();
    return Array.isArray(body?.conversations) ? body.conversations : null;
  } catch {
    return null;
  }
}

export async function localConversation(id, fetchImpl = globalThis.fetch) {
  try {
    const response = await fetchImpl(`/api/arqiven/conversations/${encodeURIComponent(id)}`);
    if (!response.ok) return null;
    const body = await response.json();
    return body?.conversation || null;
  } catch {
    return null;
  }
}
