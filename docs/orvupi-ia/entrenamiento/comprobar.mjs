/** Esqueleto a coste 0. Cuenta parámetros de la config de partida. No carga pesos, no usa red y no usa GPU. */

import { pathToFileURL } from "node:url";

export const CONFIG = {
  initialize_from: "random",
  seed: 42,
  n_layer: 8,
  n_embd: 384,
  n_head: 6,
  n_ctx: 512,
  vocab: 8192,
};

/** GPT pequeño: embeddings atados, posición aprendida, sin sesgos, MLP 4x. n_head solo fija el tamaño de cabeza. */
export function countParams(config = CONFIG) {
  if (config.initialize_from !== "random") throw new Error("solo random");
  if (config.n_embd % config.n_head !== 0) throw new Error("cabezas");
  const hidden = config.n_embd;
  const embeddings = config.vocab * hidden + config.n_ctx * hidden;
  const perLayer = 4 * hidden * hidden + 8 * hidden * hidden + 2 * hidden;
  return embeddings + config.n_layer * perLayer + hidden;
}

export const EXPECTED_PARAMS = 17504640;

function isMain() {
  return Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href;
}

if (isMain()) {
  const banned = process.argv.slice(2).some((arg) => /checkpoint|huggingface|\.safetensors|\.gguf|\.bin$/i.test(arg));
  if (banned) {
    console.error("Este esqueleto no carga pesos.");
    process.exit(2);
  }
  const total = countParams(CONFIG);
  if (total !== EXPECTED_PARAMS) {
    console.error(String(total));
    process.exit(1);
  }
  console.log(JSON.stringify({ ...CONFIG, params: total, gpu: false, network: false, checkpoint: false }));
}
