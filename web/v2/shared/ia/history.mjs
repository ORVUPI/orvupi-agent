/** Ventana reciente de la conversación. No llama a la red. */

export const HISTORY_TURNS = 4;
export const HISTORY_CHARS = 3200;

export function clipHistory(messages, options = {}) {
  const turns = Number.isFinite(options.turns) ? options.turns : HISTORY_TURNS;
  const maxChars = Number.isFinite(options.maxChars) ? options.maxChars : HISTORY_CHARS;
  const clean = (Array.isArray(messages) ? messages : []).flatMap((item) => {
    if (!item || (item.role !== "user" && item.role !== "assistant") || typeof item.content !== "string") return [];
    const content = item.content.replace(/\s+/g, " ").trim();
    if (!content) return [];
    return [{ role: item.role, content: content.slice(0, 1500) }];
  });
  const window = clean.slice(-Math.max(1, turns * 2));
  const kept = [];
  let total = 0;
  for (let i = window.length - 1; i >= 0; i -= 1) {
    const item = window[i];
    const room = maxChars - total;
    if (kept.length > 0 && room < 40) break;
    const content = item.content.slice(0, Math.max(40, room));
    kept.push({ role: item.role, content });
    total += content.length;
  }
  return kept.reverse();
}
