/** Generación de imágenes de ARQIVEN. Apagada si no hay enlace AI.
 * Modelo: @cf/black-forest-labs/flux-1-schnell (Workers AI, plan gratis).
 * El plan gratis tiene un tope de neuronas al día. La imagen no sale del
 * navegador: esta función la devuelve y el cliente la guarda en IndexedDB.
 * Sin la variable AI el sitio responde 503 y la interfaz no muestra el botón.
 */

const MODEL = "@cf/black-forest-labs/flux-1-schnell";

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

export async function onRequest(context) {
  const ai = context.env && context.env.AI;
  const enabled = typeof ai?.run === "function";
  if (context.request.method === "GET") return json({ enabled, model: enabled ? MODEL : "" });
  if (context.request.method !== "POST") return json({ enabled }, enabled ? 405 : 503);
  if (!enabled) return json({ enabled: false }, 503);
  let prompt = "";
  try {
    const body = await context.request.json();
    prompt = String(body?.prompt || "").trim().slice(0, 400);
  } catch {
    prompt = "";
  }
  if (prompt.length < 3) return json({ enabled: true, error: "prompt" }, 400);
  const result = await ai.run(MODEL, { prompt });
  const bytes = result instanceof Uint8Array ? result : result?.image;
  if (!bytes) return json({ enabled: true, error: "empty" }, 502);
  return new Response(bytes, { headers: { "content-type": "image/jpeg", "cache-control": "no-store" } });
}
