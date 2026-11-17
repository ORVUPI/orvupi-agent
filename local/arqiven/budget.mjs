/** Presupuesto de contexto. num_ctx es la ventana entera: entrada + reserva + respuesta.
 * Nunca se manda una entrada de num_ctx tokens y además num_predict de salida.
 */

export const CHARS_PER_TOKEN = 2;
const MESSAGE_OVERHEAD = 8;

export function estimateTokens(text) {
  const value = String(text ?? "");
  if (!value) return 0;
  return Math.ceil(value.length / CHARS_PER_TOKEN);
}

export function messageTokens(message) {
  return estimateTokens(message?.content) + MESSAGE_OVERHEAD;
}

export function transcriptTokens(messages) {
  return (Array.isArray(messages) ? messages : []).reduce((sum, item) => sum + messageTokens(item), 0);
}

export function budgetPlan(config = {}) {
  const numCtx = integer(config.numCtx, "numCtx");
  const numPredict = integer(config.numPredict, "numPredict");
  const templateReserve = integer(config.templateReserve ?? 0, "templateReserve", true);
  const inputTokens = numCtx - numPredict - templateReserve;
  if (inputTokens < 32 || inputTokens + numPredict > numCtx) {
    throw Object.assign(new Error("budget"), { code: "budget" });
  }
  return { numCtx, numPredict, templateReserve, inputTokens };
}

function integer(value, name, allowZero = false) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0 || (!allowZero && number < 1)) {
    throw Object.assign(new Error(name), { code: "budget" });
  }
  return number;
}

export function fitMessages(messages, room) {
  const limit = integer(room, "room");
  const system = [];
  const dialogue = [];
  for (const item of Array.isArray(messages) ? messages : []) {
    const role = item?.role === "system" || item?.role === "user" || item?.role === "assistant" ? item.role : "";
    if (!role) continue;
    const content = String(item.content || "");
    if (!content.trim()) continue;
    const row = { role, content };
    if (role === "system" && system.length === 0) system.push(row);
    else if (role !== "system") dialogue.push(row);
  }
  const kept = dialogue.slice();
  while (kept.length > 1 && transcriptTokens([...system, ...kept]) > limit) kept.shift();
  let fitted = [...system, ...kept];
  if (transcriptTokens(fitted) > limit && fitted.length) {
    const last = fitted[fitted.length - 1];
    const others = fitted.slice(0, -1);
    let content = last.content;
    while (content.length > 0 && transcriptTokens([...others, { role: last.role, content }]) > limit) {
      const next = Math.floor(content.length * 0.75);
      content = content.slice(0, next > 0 && next < content.length ? next : content.length - 1);
    }
    fitted = content ? [...others, { role: last.role, content }] : others;
  }
  if (transcriptTokens(fitted) > limit) {
    throw Object.assign(new Error("budget"), { code: "budget" });
  }
  return fitted;
}
