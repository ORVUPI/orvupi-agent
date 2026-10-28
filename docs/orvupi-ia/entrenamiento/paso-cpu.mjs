/** Un paso diminuto en CPU con pesos aleatorios. No descarga un checkpoint y no entrena. */

import { CPU_CHECK, countParams } from "./config.mjs";

export function mulberry32(seed) {
  let state = seed >>> 0;
  return function next() {
    state = (state + 0x6D2B79F5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/** Media de cuadrados de tres filas de la tabla de embeddings. Sirve para fijar la semilla, no para conversar. */
export function cpuStep(config = CPU_CHECK) {
  if (config.initialize_from !== "random") throw new Error("solo random");
  if (config.device !== "cpu") throw new Error("solo cpu");
  if (config.modelId !== "arqiven-1-experimental") throw new Error("id");
  const random = mulberry32(config.seed);
  const width = config.n_embd;
  const table = new Float64Array(config.vocab * width);
  for (let index = 0; index < table.length; index += 1) table[index] = (random() - 0.5) * 0.1;
  const tokens = [1, 2, 3, 4];
  let sum = 0;
  for (const id of tokens) {
    const start = (id % config.vocab) * width;
    for (let column = 0; column < width; column += 1) {
      const value = table[start + column];
      sum += value * value;
    }
  }
  const loss = sum / (tokens.length * width);
  if (!Number.isFinite(loss)) throw new Error("loss");
  return {
    loss,
    params: countParams(config),
    initialize_from: "random",
    seed: config.seed,
    checkpoint: false,
    network: false,
    publicModel: false,
  };
}
