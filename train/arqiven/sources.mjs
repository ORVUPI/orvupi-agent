/** Fuentes permitidas para el primer LoRA. Nada de aquí se descarga en CI.
 * Licencias comprobadas en las fichas públicas el 2026-11-10. Se excluye lo no comercial.
 */

export const ALLOWED_LICENSES = ["apache-2.0", "mit", "odc-by"];

export const SOURCES = [
  {
    id: "smoltalk2-new",
    dataset: "HuggingFaceTB/smoltalk2",
    config: "SFT",
    splits: [
      "aya_dataset_Qwen3_32B_think",
      "multi_turn_reasoning_if_think",
      "smolagents_toolcalling_traces_think",
      "smoltalk_everyday_convs_reasoning_Qwen3_32B_think",
      "smoltalk_multilingual8_Qwen3_32B_think",
      "smoltalk_systemchats_Qwen3_32B_think",
      "table_gpt_Qwen3_32B_think",
    ],
    license: "apache-2.0",
    block: "general",
    note: "Solo los subconjuntos nuevos que la ficha declara Apache-2.0. Los heredados quedan fuera: hay que mirar cada licencia original.",
    url: "https://huggingface.co/datasets/HuggingFaceTB/smoltalk2",
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
    block: "math",
    note: "La ficha AI-MO/NuminaMath-TIR apunta a este id. Apache-2.0.",
    url: "https://huggingface.co/datasets/project-numina/NuminaMath-TIR",
  },
  {
    id: "tulu-personas-math",
    dataset: "allenai/tulu-3-sft-personas-math",
    config: "default",
    splits: ["train"],
    license: "odc-by",
    block: "math",
    note: "ODC-BY en la ficha. No se usa la mezcla tulu-3-sft-mixture entera: incluye subconjuntos no comerciales.",
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
];

export const EXCLUDED = [
  { id: "tulu-3-sft-mixture", reason: "La mezcla completa arrastra subconjuntos no comerciales (por ejemplo No Robots, CC-BY-NC)." },
  { id: "smoltalk2-inherited", reason: "OpenHermes, OpenThoughts, Llama-Nemotron y otros heredados no están en la lista Apache-2.0 de la ficha." },
  { id: "wildguardmix", reason: "La ficha dice ODC-BY, no Apache-2.0, y el acceso está gated. No se incluye hasta revisarlo con una cuenta gratuita." },
  { id: "coconot", reason: "La ficha pide respetar licencias de las partes (impact-lr). Queda fuera hasta esa revisión." },
];

export const MIX = {
  target: 50000,
  seed: 42,
  parts: { general: 0.4, multilingual: 0.2, math: 0.15, code: 0.1, orvupi: 0.1, safety: 0.05 },
};
