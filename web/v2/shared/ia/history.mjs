/** Ventana reciente de la conversación. No llama a la red. */

export const HISTORY_TURNS = 4;
export const HISTORY_CHARS = 3200;

function textOf(item) {
  if (item?.role === "user" && typeof item.modelContent === "string" && item.modelContent.trim()) return item.modelContent;
  return typeof item?.content === "string" ? item.content : "";
}

function sameStart(a, b) {
  return String(a || "").slice(0, 80) === String(b || "").slice(0, 80);
}

/** Recorta el historial. Sin `profile: "v1"` se comporta como el perfil legacy. */
export function clipHistory(messages, options = {}) {
  const v1 = options.profile === "v1";
  const turns = Number.isFinite(options.turns) ? options.turns : (v1 ? 12 : HISTORY_TURNS);
  const maxChars = Number.isFinite(options.maxChars) ? options.maxChars : (v1 ? 12000 : HISTORY_CHARS);
  const perMessage = Number.isFinite(options.perMessage) ? options.perMessage : (v1 ? 0 : 1500);
  const dropNonModel = options.dropNonModel === true || (v1 && options.dropNonModel !== false);
  const pinFirst = options.pinFirst === true || (v1 && options.pinFirst !== false);
  const clean = [];
  for (const item of Array.isArray(messages) ? messages : []) {
    if (!item || (item.role !== "user" && item.role !== "assistant")) continue;
    if (dropNonModel && item.role === "assistant" && item.mode && item.mode !== "model") continue;
    const content = textOf(item).replace(/\s+/g, " ").trim();
    if (!content) continue;
    const cap = perMessage > 0 ? perMessage : content.length;
    clean.push({ role: item.role, content: content.slice(0, cap) });
  }
  const window = clean.slice(-Math.max(1, turns * 2));
  const kept = [];
  let total = 0;
  for (let i = window.length - 1; i >= 0; i -= 1) {
    const item = window[i];
    const last = i === window.length - 1;
    const room = maxChars - total;
    if (kept.length > 0 && room < 40 && !(v1 && last)) break;
    const limit = v1 && last ? Math.max(room, 0) : Math.max(40, room);
    const content = item.content.slice(0, limit);
    if (!content) continue;
    kept.push({ role: item.role, content });
    total += content.length;
  }
  const out = kept.reverse();
  const first = clean.find((item) => item.role === "user");
  if (pinFirst && first && !out.some((item) => item.role === "user" && sameStart(item.content, first.content))) {
    out.unshift({ role: "assistant", content: "Anotado." });
    out.unshift({ role: "user", content: first.content.slice(0, 600) });
  }
  return out;
}
