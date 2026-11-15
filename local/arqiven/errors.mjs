/** Errores visibles del backend local. El código es estable; el texto es para la persona. */

export function codeError(code, cause) {
  const error = new Error(code);
  error.code = code;
  if (cause) error.cause = cause;
  return error;
}

export function publicError(code, config = {}, detail = "") {
  const model = config.model || "qwen3:8b";
  const base = config.ollamaBase || "http://127.0.0.1:11434";
  const table = {
    "ollama-down": `Ollama no responde en ${base}. Ábrelo en este equipo y vuelve a intentar.`,
    "model-missing": `El modelo ${model} no está descargado en Ollama. Es una referencia de terceros; ARQIVEN no lo creó.`,
    timeout: "La petición superó el tiempo de espera y se canceló.",
    cancelled: "Cancelado.",
    "too-large": "La petición supera el tamaño permitido.",
    "bad-request": "La petición no es válida.",
    "queue-full": "Hay demasiadas peticiones en espera. Espera a que termine la actual.",
    budget: "El presupuesto de contexto no deja sitio para la respuesta.",
    empty: "El modelo de terceros no escribió una respuesta.",
    "ollama-error": "Ollama rechazó la petición.",
    forbidden: "No tienes permiso para esta acción en el proyecto.",
  };
  const message = table[code] || "No se pudo completar la petición.";
  const extra = String(detail || "").replace(/\s+/g, " ").trim().slice(0, 160);
  return { code, message: extra && code === "ollama-error" ? `${message} ${extra}` : message };
}
