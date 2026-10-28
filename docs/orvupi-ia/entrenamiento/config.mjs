/** Configuración de partida. No carga pesos y no abre la red. El id reservado no entra en capabilities(). */

export const CONFIG = {
  modelId: "arqiven-1-experimental",
  architecture: "causal_transformer",
  initialize_from: "random",
  language_focus: "es",
  seed: 42,
  n_layer: 8,
  n_embd: 384,
  n_head: 6,
  ffn_hidden_size: 1536,
  n_ctx: 512,
  vocab: 8192,
  tie_embeddings: true,
  device: "cpu",
};

/** Red diminuta para una comprobación en CPU. No es el modelo de la ficha. */
export const CPU_CHECK = {
  modelId: "arqiven-1-experimental",
  architecture: "causal_transformer",
  initialize_from: "random",
  language_focus: "es",
  seed: 42,
  n_layer: 2,
  n_embd: 64,
  n_head: 4,
  ffn_hidden_size: 256,
  n_ctx: 32,
  vocab: 128,
  tie_embeddings: true,
  device: "cpu",
};

/** GPT pequeño: embeddings atados, posición aprendida, sin sesgos, MLP 4x. */
export function countParams(config = CONFIG) {
  if (config.initialize_from !== "random") throw new Error("solo random");
  if (config.modelId !== "arqiven-1-experimental") throw new Error("id");
  if (config.device !== "cpu") throw new Error("solo cpu");
  if (config.n_embd % config.n_head !== 0) throw new Error("cabezas");
  if (config.ffn_hidden_size !== config.n_embd * 4) throw new Error("ffn");
  const hidden = config.n_embd;
  const embeddings = config.vocab * hidden + config.n_ctx * hidden;
  const perLayer = 4 * hidden * hidden + 2 * config.ffn_hidden_size * hidden + 2 * hidden;
  return embeddings + config.n_layer * perLayer + (config.tie_embeddings ? hidden : config.vocab * hidden + hidden);
}

export const EXPECTED_PARAMS = 17504640;
export const CPU_CHECK_PARAMS = 108864;
