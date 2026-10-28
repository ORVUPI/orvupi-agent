/** Esqueleto a coste 0. Cuenta parámetros y comprueba que el manifiesto de ejemplo está vacío. No carga pesos. */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { CONFIG, CPU_CHECK, CPU_CHECK_PARAMS, EXPECTED_PARAMS, countParams } from "./config.mjs";
import { cpuStep } from "./paso-cpu.mjs";

export { CONFIG, CPU_CHECK, CPU_CHECK_PARAMS, EXPECTED_PARAMS, countParams };

export function readExampleManifest(dir = dirname(fileURLToPath(import.meta.url))) {
  const manifest = JSON.parse(readFileSync(join(dir, "manifiesto.ejemplo.json"), "utf8"));
  if (manifest.format !== "arqiven-data-manifest" || manifest.version !== 1) throw new Error("formato");
  if (manifest.modelId !== "arqiven-1-experimental" || manifest.initialize_from !== "random") throw new Error("ficha");
  if (!Array.isArray(manifest.documents) || manifest.documents.length !== 0) throw new Error("documentos");
  for (const split of ["train", "valid", "test"]) {
    if (!Array.isArray(manifest.splits?.[split]) || manifest.splits[split].length !== 0) throw new Error("particion");
  }
  return manifest;
}

function isMain() {
  return Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href;
}

if (isMain()) {
  const banned = process.argv.slice(2).some((arg) => /checkpoint|huggingface|\.safetensors|\.gguf|\.bin$/i.test(arg));
  if (banned) {
    console.error("Este esqueleto no carga pesos.");
    process.exit(2);
  }
  const full = countParams(CONFIG);
  const tiny = countParams(CPU_CHECK);
  if (full !== EXPECTED_PARAMS || tiny !== CPU_CHECK_PARAMS) {
    console.error(JSON.stringify({ full, tiny }));
    process.exit(1);
  }
  const manifest = readExampleManifest();
  const step = cpuStep(CPU_CHECK);
  if (step.checkpoint !== false || step.network !== false || step.publicModel !== false) process.exit(1);
  console.log(JSON.stringify({
    config: CONFIG,
    params: full,
    cpuCheck: CPU_CHECK,
    cpuCheckParams: tiny,
    cpuStepLoss: step.loss,
    documents: manifest.documents.length,
    gpu: false,
    network: false,
    checkpoint: false,
    publicModel: false,
  }));
}
