import type { SlideTheme } from "./model";

export type ThemeSpec = {
  id: SlideTheme;
  bg: string;
  title: string;
  text: string;
  accent: string;
  titleFont: string;
  bodyFont: string;
  /** Decoración del tema (franja o círculo), dibujada detrás de los objetos. */
  deco?: "bar-left" | "bar-bottom" | "corner" | "dots" | "wave";
};

export const THEMES: Record<SlideTheme, ThemeSpec> = {
  sencillo: { id: "sencillo", bg: "#ffffff", title: "#102032", text: "#3a2b33", accent: "#ff3070", titleFont: "Arial", bodyFont: "Arial" },
  oscuro: { id: "oscuro", bg: "#1f1f24", title: "#ffffff", text: "#e8e2da", accent: "#ff3070", titleFont: "Arial", bodyFont: "Arial" },
  papel: { id: "papel", bg: "#fff8ec", title: "#102032", text: "#3a2b33", accent: "#ff3070", titleFont: "Montserrat", bodyFont: "Inter", deco: "bar-bottom" },
  tinta: { id: "tinta", bg: "#102032", title: "#fff8ec", text: "#ffe1ea", accent: "#ff3070", titleFont: "Montserrat", bodyFont: "Inter", deco: "bar-left" },
  bosque: { id: "bosque", bg: "#e5f6ee", title: "#0b5d36", text: "#163b2a", accent: "#0b5d36", titleFont: "Lora", bodyFont: "Inter", deco: "corner" },
  rosa: { id: "rosa", bg: "#fff0f5", title: "#9c1446", text: "#3a2b33", accent: "#ff3070", titleFont: "Montserrat", bodyFont: "Inter", deco: "dots" },
  coral: { id: "coral", bg: "#ffe9e1", title: "#7a2a12", text: "#4a2a20", accent: "#ff6b4a", titleFont: "Merriweather", bodyFont: "Roboto", deco: "bar-left" },
  menta: { id: "menta", bg: "#effaf6", title: "#007960", text: "#22413a", accent: "#00a37f", titleFont: "Roboto", bodyFont: "Roboto", deco: "wave" },
  medianoche: { id: "medianoche", bg: "#0e1a3a", title: "#ffd166", text: "#e6ecff", accent: "#ffd166", titleFont: "Merriweather", bodyFont: "Inter", deco: "corner" },
  pulpo: { id: "pulpo", bg: "#ff3070", title: "#ffffff", text: "#fff8ec", accent: "#102032", titleFont: "Montserrat", bodyFont: "Inter", deco: "wave" },
};

export const FONT_STACK: Record<string, string> = {
  Inter: "Inter, system-ui, sans-serif",
  Arial: "Arial, Helvetica, sans-serif",
  Roboto: "Roboto, Arial, sans-serif",
  Montserrat: "Montserrat, Arial, sans-serif",
  Lora: "Lora, Georgia, serif",
  Merriweather: "Merriweather, Georgia, serif",
  Georgia: "Georgia, serif",
  "Courier New": "'Courier New', monospace",
};

export function fontStack(font: string | undefined, fallback: string): string {
  return FONT_STACK[font ?? fallback] ?? FONT_STACK[fallback] ?? "Inter, sans-serif";
}

/** Paleta de colores (como la de Slides) con los colores ORVUPI en la primera fila. */
export const PALETTE = [
  "#102032", "#ff3070", "#fff8ec", "#ffe1ea", "#007960", "#1d4e89", "#9c1446", "#ffffff",
  "#000000", "#434343", "#666666", "#999999", "#b7b7b7", "#cccccc", "#d9d9d9", "#efefef",
  "#980000", "#ff0000", "#ff9900", "#ffff00", "#00ff00", "#00ffff", "#4a86e8", "#0000ff",
  "#9900ff", "#ff00ff", "#e6b8af", "#f4cccc", "#fce5cd", "#fff2cc", "#d9ead3", "#d0e0e3",
  "#c9daf8", "#cfe2f3", "#d9d2e9", "#ead1dc", "#cc4125", "#e06666", "#f6b26b", "#ffd966",
  "#93c47d", "#76a5af", "#6d9eeb", "#6fa8dc", "#8e7cc3", "#c27ba0", "#0b5d36", "#5b2a86",
];
