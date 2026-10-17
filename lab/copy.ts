import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const avisoSource = readFileSync(fileURLToPath(new URL("../../web/v2/shared/aviso-guardar.js", import.meta.url)), "utf8");

function avisoLine(name: "es" | "en"): string {
  const match = avisoSource.match(new RegExp(`${name}:\\s*"((?:\\\\.|[^"\\\\])*)"`));
  if (!match?.[1]) {
    throw new Error(`aviso-guardar.js no tiene la frase ${name}`);
  }
  return JSON.parse(`"${match[1]}"`) as string;
}

export const UNKNOWN_LINE = {
  es: "Lo desconocido no es lo mismo que lo comprobado.",
  en: "Unknown is not the same as verified.",
} as const;

export const OFFLINE_LINE = {
  es: "Copia estática. Sin conexión se puede leer; no actualiza la cadena.",
  en: "Static copy. It can be read offline; it does not update the chain.",
} as const;

export const DRAFT_LINE = {
  es: "Borrador del repositorio. No publicado en orvupi.com.",
  en: "Repository draft. Not published on orvupi.com.",
} as const;

export const READONLY_LINE = {
  es: "Solo lectura: no conecta carteras ni firma nada. Las fichas no son una auditoría ni una garantía.",
  en: "Read-only: it does not connect wallets or sign anything. The cards are not an audit or a guarantee.",
} as const;

export const PRIVACY_ES = avisoLine("es");

export const PRIVACY_EN = avisoLine("en");

export const AUDIT_ES =
  "Lectura en directo de datos públicos de la blockchain. No es una auditoría, ni una recomendación, ni un aval. ORVUPI no tiene relación con este token. Que no aparezcan señales no significa que esté todo comprobado.";

export const AUDIT_EN =
  "Live reading of public blockchain data. It is not an audit, a recommendation, or an endorsement. ORVUPI has no relationship with this token. No signals showing does not mean everything was checked.";

export const HOW_VERIFY = {
  es: [
    "Pega la dirección y pulsa Comprobar.",
    "La lectura es directa y solo en lectura.",
    "Verás señales con una explicación en lenguaje llano. No es una puntuación.",
  ],
  en: [
    "Paste the address and press Check.",
    "The read is live and read-only.",
    "You will see signals with a plain-language explanation. It is not a score.",
  ],
} as const;

export const HOW_LAB = {
  es: [
    "Lee la pregunta y elige una respuesta. Si encaja, pulsa Siguiente paso.",
    "Si no encaja, verás por qué y puedes probar otra.",
    "El progreso se queda en este navegador. No hay cuenta ni puntuación.",
  ],
  en: [
    "Read the question and choose an answer. If it fits, press Next step.",
    "If it does not fit, you will see why and you can try another.",
    "Progress stays in this browser. There is no account and no score.",
  ],
} as const;
