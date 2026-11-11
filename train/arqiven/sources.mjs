/** Fuentes permitidas para el primer LoRA. Nada de aquí se descarga en CI.
 * Licencias comprobadas en las fichas públicas el 2026-11-10. Se excluye lo no comercial.
 */

export const ALLOWED_LICENSES = ["apache-2.0", "mit", "odc-by"];

const SMOLTALK2 = {
  dataset: "HuggingFaceTB/smoltalk2",
  config: "SFT",
  license: "apache-2.0",
  url: "https://huggingface.co/datasets/HuggingFaceTB/smoltalk2",
};

export const SOURCES = [
  {
    ...SMOLTALK2,
    id: "smoltalk2-multiturn",
    splits: ["multi_turn_reasoning_if_think", "smoltalk_systemchats_Qwen3_32B_think"],
    block: "multiturn",
    note: "Diálogos de varios turnos. Solo subconjuntos nuevos con Apache-2.0 en la ficha.",
  },
  {
    ...SMOLTALK2,
    id: "smoltalk2-reasoning",
    splits: ["smoltalk_everyday_convs_reasoning_Qwen3_32B_think"],
    block: "reasoning",
    note: "Razonamiento con el hilo visible y un cierre. Apache-2.0.",
  },
  {
    ...SMOLTALK2,
    id: "smoltalk2-multilingual",
    splits: ["smoltalk_multilingual8_Qwen3_32B_think"],
    block: "multilingual",
    note: "Charla multilingüe del subconjunto nuevo. Apache-2.0.",
  },
  {
    ...SMOLTALK2,
    id: "smoltalk2-code",
    splits: ["smolagents_toolcalling_traces_think"],
    block: "code",
    note: "Trazas de herramientas. Apache-2.0.",
  },
  {
    ...SMOLTALK2,
    id: "smoltalk2-general",
    splits: ["aya_dataset_Qwen3_32B_think", "table_gpt_Qwen3_32B_think"],
    block: "general",
    note: "Tablas y reformulaciones Aya del subconjunto nuevo. Apache-2.0. Los heredados quedan fuera.",
  },
  {
    id: "aya",
    dataset: "CohereLabs/aya_dataset",
    config: "default",
    splits: ["train"],
    license: "apache-2.0",
    block: "multilingual",
    languages: ["es", "en", "pt", "ja", "ko"],
    note: "La ficha antigua CohereForAI/aya_dataset redirige aquí. Apache-2.0.",
    url: "https://huggingface.co/datasets/CohereLabs/aya_dataset",
  },
  {
    id: "numina-tir",
    dataset: "project-numina/NuminaMath-TIR",
    config: "default",
    splits: ["train"],
    license: "apache-2.0",
    block: "reasoning",
    note: "Matemáticas con solución y respuesta final. Apache-2.0.",
    url: "https://huggingface.co/datasets/project-numina/NuminaMath-TIR",
  },
  {
    id: "tulu-personas-math",
    dataset: "allenai/tulu-3-sft-personas-math",
    config: "default",
    splits: ["train"],
    license: "odc-by",
    block: "reasoning",
    note: "ODC-BY. Matemáticas de personas, con el paso a paso. No se usa la mezcla tulu-3-sft-mixture entera.",
    url: "https://huggingface.co/datasets/allenai/tulu-3-sft-personas-math",
  },
  {
    id: "tulu-personas-code",
    dataset: "allenai/tulu-3-sft-personas-code",
    config: "default",
    splits: ["train"],
    license: "odc-by",
    block: "code",
    note: "Python con personas. ODC-BY. Sustituye un id personas-python que no está público.",
    url: "https://huggingface.co/datasets/allenai/tulu-3-sft-personas-code",
  },
  {
    id: "orvupi-mit",
    dataset: "local",
    license: "mit",
    block: "orvupi",
    note: "Páginas y documentación del propio repositorio. No copia las preguntas del banco de evaluación.",
    url: "https://orvupi.com",
  },
  {
    id: "dialogue-mit",
    dataset: "local",
    license: "mit",
    block: "clarify",
    note: "Preguntas ambiguas que piden una aclaración, y abstenciones honestas. Escritas en el repositorio. No copian el banco.",
    url: "https://orvupi.com",
  },
];

export const EXCLUDED = [
  { id: "tulu-3-sft-mixture", reason: "La mezcla completa arrastra subconjuntos no comerciales (por ejemplo No Robots, CC-BY-NC)." },
  { id: "smoltalk2-inherited", reason: "OpenHermes, OpenThoughts, Llama-Nemotron y otros heredados no están en la lista Apache-2.0 de la ficha." },
  { id: "wildguardmix", reason: "La ficha dice ODC-BY, no Apache-2.0, y el acceso está gated. No se incluye hasta revisarlo con una cuenta gratuita." },
  { id: "coconot", reason: "La ficha pide respetar licencias de las partes (impact-lr). Queda fuera hasta esa revisión." },
];

/** Proporciones del primer LoRA. Suman 1.
 * Varios turnos y razonamiento con respuesta final pesan más que la charla suelta.
 * ORVUPI y seguridad juntos son el 15 %: el resto es conocimiento general.
 */
export const MIX = {
  target: 50000,
  seed: 42,
  parts: {
    multiturn: 0.22,
    reasoning: 0.18,
    multilingual: 0.15,
    code: 0.1,
    general: 0.15,
    clarify: 0.05,
    orvupi: 0.1,
    safety: 0.05,
  },
};
