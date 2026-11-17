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

async function localJson(path, options, fetchImpl = globalThis.fetch) {
  try {
    const response = await fetchImpl(path, options);
    const body = await response.json().catch(() => ({}));
    if (!response.ok) return { ok: false, status: response.status, ...body };
    return { ok: true, status: response.status, ...body };
  } catch {
    return { ok: false, status: 0 };
  }
}

export async function localProjects(fetchImpl = globalThis.fetch) {
  const body = await localJson("/api/arqiven/projects", undefined, fetchImpl);
  return body.ok && Array.isArray(body.projects) ? body.projects : null;
}

export async function localProject(id, fetchImpl = globalThis.fetch) {
  const body = await localJson(`/api/arqiven/projects/${encodeURIComponent(id)}`, undefined, fetchImpl);
  return body.ok ? body : null;
}

export async function localCreateProject(input, fetchImpl = globalThis.fetch) {
  const body = await localJson("/api/arqiven/projects", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  }, fetchImpl);
  return body.ok ? body.project : null;
}

export async function localRenameProject(id, name, fetchImpl = globalThis.fetch) {
  const body = await localJson(`/api/arqiven/projects/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name }),
  }, fetchImpl);
  return body.ok ? body.project : null;
}

export async function localDeleteProject(id, fetchImpl = globalThis.fetch) {
  const body = await localJson(`/api/arqiven/projects/${encodeURIComponent(id)}`, { method: "DELETE" }, fetchImpl);
  return body.ok;
}

export async function localRenameConversation(id, title, fetchImpl = globalThis.fetch) {
  const body = await localJson(`/api/arqiven/conversations/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title }),
  }, fetchImpl);
  return body.ok ? body.conversation : null;
}

export async function localMoveConversation(id, projectId, fetchImpl = globalThis.fetch) {
  const body = await localJson(`/api/arqiven/conversations/${encodeURIComponent(id)}/move`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ projectId }),
  }, fetchImpl);
  return body.ok ? body.conversation : null;
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
