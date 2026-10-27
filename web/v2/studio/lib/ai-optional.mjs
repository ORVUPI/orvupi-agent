/** IA opcional y desacoplada. No descarga modelos. El editor no depende de esto. */

export const AI_STATUS = {
  enabled: false,
  modelRequired: false,
  note: {
    es: "La escritura, el arrastre, el guardado y la exportación no necesitan descargar un modelo. Esta ayuda local solo ofrece frases cortas ya escritas. No hay generación remota ni API de pago.",
    en: "Writing, dragging, saving and export do not need to download a model. This local helper only offers short ready-made phrases. There is no remote generation and no paid API.",
  },
};

const PHRASES = {
  es: [
    "Tu empresa",
    "Nombre y apellidos",
    "Una idea clara",
    "Próximos pasos",
    "Resumen del trimestre",
    "Gracias por tu tiempo",
  ],
  en: [
    "Your company",
    "Full name",
    "A clear idea",
    "Next steps",
    "Quarter summary",
    "Thanks for your time",
  ],
};

/** Frases locales. No llama a red ni carga pesos. */
export function localPhrases(lang = "es") {
  return (PHRASES[lang] || PHRASES.es).slice();
}

export function aiPanelCopy(lang = "es") {
  return {
    title: lang === "en" ? "Quick text" : "Textos rápidos",
    body: AI_STATUS.note[lang] || AI_STATUS.note.es,
    off: lang === "en" ? "No model is loaded." : "No hay ningún modelo cargado.",
    phrases: lang === "en" ? "Ready-made phrases" : "Frases ya escritas",
  };
}
