/** ORVUPI AI: limpieza del texto que entra al modelo y control de lo que sale.
 *  Los modelos pequeños degeneran («![](![](!!!!!!…») si reciben imágenes en markdown, data URLs, URLs larguísimas o
 *  marcado: aquí se deja solo texto plano legible, y se detecta y limpia la salida degenerada. */

const ZERO_WIDTH = /[\u200B-\u200D\u2060\uFEFF]/g;

/** Texto plano limpio para el modelo: sin imágenes, data URLs, URLs largas, HTML ni bloques base64. */
export function cleanInput(text: string): string {
  let s = text.replace(/\r\n?/g, "\n").replace(ZERO_WIDTH, "");
  s = s.replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ");
  s = s.replace(/<img\b[^>]*>/gi, " ");
  // Imágenes markdown, también anidadas o sin cerrar: ![alt](url) → alt
  for (let i = 0; i < 3; i += 1) s = s.replace(/!\[([^\]\n]*)\]\([^)\n]*\)?/g, (_, alt: string) => (alt.trim() ? ` ${alt.trim()} ` : " "));
  s = s.replace(/!\[([^\]\n]*)\]/g, (_, alt: string) => (alt.trim() ? ` ${alt.trim()} ` : " "));
  s = s.replace(/\bdata:[a-z0-9.+-]+\/[a-z0-9.+-]+(;[a-z0-9=.+-]+)*,[^\s)"'<>]*/gi, " ");
  s = s.replace(/\bblob:[^\s)"'<>]+/gi, " ");
  // Enlaces markdown: [texto](url) → texto
  s = s.replace(/\[([^\]\n]+)\]\((?:[^()\n]|\([^)\n]*\))*\)/g, "$1");
  // URLs: las largas se quedan en el dominio
  s = s.replace(/\bhttps?:\/\/[^\s<>"')\]]+/gi, (url) => {
    if (url.length <= 60) return url;
    try { return new URL(url).host; } catch { return " "; }
  });
  s = s.replace(/<\/?[a-z][a-z0-9-]*(\s[^>]*)?>/gi, " ");
  s = s.replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&quot;/gi, '"');
  // Bloques base64 o hashes muy largos sin espacios
  s = s.replace(/[A-Za-z0-9+/=_-]{80,}/g, " ");
  // Rachas del mismo carácter (no letra/dígito): «!!!!!!» → «!!!»
  s = s.replace(/([^\p{L}\p{N}\s])\1{3,}/gu, "$1$1$1");
  s = s.replace(/[ \t]+/g, " ").replace(/ *\n */g, "\n").replace(/\n{3,}/g, "\n\n");
  return s.trim();
}

/** ¿La salida es basura? Imágenes markdown, rachas largas del mismo carácter, pocas letras o repetición en bucle. */
export function isDegenerate(output: string): boolean {
  const s = output.trim();
  if (!s) return true;
  if (/!\[[^\]]*\]\(/.test(s) || /\]\(\s*(!|\[|$)/.test(s)) return true;
  if (/([^\p{L}\p{N}\s])\1{7,}/u.test(s)) return true;
  if (/(\p{L})\1{9,}/u.test(s)) return true;
  const letters = (s.match(/\p{L}/gu) ?? []).length;
  if (s.length >= 20 && letters / s.length < 0.35) return true;
  const words = s.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  if (words.length >= 30) {
    const unique = new Set(words).size;
    if (unique / words.length < 0.25) return true;
    // misma secuencia de 4 palabras repetida muchas veces
    const grams = new Map<string, number>();
    for (let i = 0; i + 4 <= words.length; i += 1) {
      const g = words.slice(i, i + 4).join(" ");
      grams.set(g, (grams.get(g) ?? 0) + 1);
    }
    if (Math.max(...grams.values()) >= 5) return true;
  }
  return false;
}

/** Limpia restos en una salida válida (o en el texto que se va mostrando mientras se escribe). */
export function cleanOutput(output: string): string {
  let s = output.replace(ZERO_WIDTH, "");
  for (let i = 0; i < 3; i += 1) s = s.replace(/!\[[^\]\n]*\]\([^)\n]*\)?/g, "");
  s = s.replace(/!\[[^\]\n]*\]?/g, "");
  s = s.replace(/\bdata:[^\s)]+/gi, "");
  s = s.replace(/([^\p{L}\p{N}\s*#_-])\1{3,}/gu, "$1");
  // Restos del prompt: comillas triples, vallas de código y «TEXTO:» repetido
  s = s.replace(/"{3}|`{3}[a-z]*|'{3}/gi, "").replace(/^\s*TEXTO:\s*$/gim, "");
  s = s.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n");
  return s.trim();
}
