import type { ChatMessage } from "./engine";

export type AiAction = "summarize" | "explain" | "ask" | "rewrite" | "translate" | "outline";

/** Límite de texto que se manda al modelo pequeño de una vez (caracteres). Lo más largo se resume por partes. */
export const CHUNK_CHARS = 6000;
export const MAX_PARTS = 6;

const SYSTEM = "Trabajas dentro del navegador, con un modelo de terceros. Responde siempre en español, de forma clara y fiel al texto. No inventes datos que no estén en el texto. No digas que eres Arqiven-N.";

export function splitText(text: string, size = CHUNK_CHARS): string[] {
  const clean = text.replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").trim();
  if (clean.length <= size) return clean ? [clean] : [];
  const parts: string[] = [];
  let rest = clean;
  while (rest.length > 0) {
    if (rest.length <= size) { parts.push(rest); break; }
    let cut = rest.lastIndexOf("\n\n", size);
    if (cut < size * 0.5) cut = rest.lastIndexOf(". ", size);
    if (cut < size * 0.5) cut = size;
    parts.push(rest.slice(0, cut + 1).trim());
    rest = rest.slice(cut + 1).trim();
  }
  return parts;
}

export function buildMessages(action: AiAction, text: string, extra: { question?: string; language?: string; history?: ChatMessage[] } = {}): ChatMessage[] {
  const doc = `TEXTO:\n"""\n${text}\n"""`;
  switch (action) {
    case "summarize":
      return [{ role: "system", content: SYSTEM }, { role: "user", content: `Resume en 3 a 5 viñetas cortas (cada una empieza por «- ») el texto siguiente. Usa solo lo que dice el texto, sin añadir nada. Responde SOLO con las viñetas.\n\n${doc}` }];
    case "explain":
      return [{ role: "system", content: SYSTEM }, { role: "user", content: `${doc}\n\nExplica este texto con palabras sencillas, como a alguien que no conoce el tema. Usa un párrafo corto y después 2 o 3 ejemplos o claves.` }];
    case "rewrite":
      return [{ role: "system", content: SYSTEM }, { role: "user", content: `${doc}\n\nReescribe el texto para que sea más claro, correcto y fluido, sin cambiar su significado ni añadir información. Devuelve solo el texto reescrito.` }];
    case "translate": {
      const language = extra.language || "inglés";
      return [{ role: "system", content: `Eres un traductor profesional. Traduce al ${language} con fidelidad y devuelve solo la traducción.` }, { role: "user", content: text }];
    }
    case "outline":
      return [{ role: "system", content: SYSTEM }, { role: "user", content: `${doc}\n\nGenera un esquema jerárquico del texto con títulos y subtítulos (usa «1.», «1.1.», etc.). Devuelve solo el esquema.` }];
    case "ask":
      return [
        { role: "system", content: `${SYSTEM} Contesta solo con lo que diga el texto; si no aparece, dilo.\n\n${doc}` },
        ...(extra.history ?? []).slice(-6),
        { role: "user", content: extra.question ?? "" },
      ];
    default:
      return [];
  }
}

export function combineMessages(partials: string[]): ChatMessage[] {
  return [{ role: "system", content: SYSTEM }, { role: "user", content: `Estos son resúmenes de partes consecutivas de un documento:\n\n${partials.map((p, i) => `Parte ${i + 1}:\n${p}`).join("\n\n")}\n\nEscribe un único resumen final del documento en 4 a 8 viñetas.` }];
}

export const MAX_TOKENS: Record<AiAction, number> = { summarize: 200, explain: 380, ask: 320, rewrite: 900, translate: 900, outline: 420 };
