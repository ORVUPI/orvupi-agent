import type { WorkErrorCode } from "../security/errors";
import { en, es, type MessageKey } from "./messages";

export type Locale = "en" | "es" | "pt-BR" | "ja" | "ko";
export type { MessageKey };

/** Idiomas de la interfaz con su nombre propio. El inglés es la versión internacional y el respaldo. */
export const LOCALES: ReadonlyArray<{ id: Locale; name: string }> = [
  { id: "en", name: "English" },
  { id: "es", name: "Español" },
  { id: "pt-BR", name: "Português (Brasil)" },
  { id: "ja", name: "日本語" },
  { id: "ko", name: "한국어" },
];
export const FALLBACK_LOCALE: Locale = "en";
/** Misma clave que usa orvupi.com: la elección del usuario sirve en la web y en Work. */
export const SHARED_LOCALE_KEY = "orvupi-lang";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && LOCALES.some((item) => item.id === value);
}

/** Convierte una etiqueta BCP 47 (es-MX, pt-br, ja-JP…) en uno de los cinco idiomas, o null. */
export function matchLocale(tag: string | null | undefined): Locale | null {
  if (!tag) return null;
  const low = tag.toLowerCase();
  if (low.startsWith("pt")) return "pt-BR";
  const base = low.split("-")[0];
  return isLocale(base) ? base : null;
}

/** Preferencia guardada en la web; si no hay, sugerencia del navegador; si no, inglés. */
export function readSharedLocale(): Locale | null {
  try {
    const value = typeof localStorage === "undefined" ? null : localStorage.getItem(SHARED_LOCALE_KEY);
    return isLocale(value) ? value : null;
  } catch {
    return null;
  }
}

export function writeSharedLocale(locale: Locale): void {
  try {
    localStorage.setItem(SHARED_LOCALE_KEY, locale);
  } catch {
    /* Sin almacenamiento el idioma sigue en la sesión. */
  }
}

export function browserLocale(): Locale {
  const list = typeof navigator === "undefined" ? [] : navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const tag of list) {
    const hit = matchLocale(tag);
    if (hit) return hit;
  }
  return FALLBACK_LOCALE;
}

type Catalog = Partial<Record<string, string>>;
const catalogs: Record<Locale, Catalog> = { es, en, "pt-BR": {}, ja: {}, ko: {} };
const loaded = new Set<Locale>(["es", "en"]);

/** Carga perezosa: cada idioma extra es un trozo aparte y solo se descarga el activo. */
const loaders: Partial<Record<Locale, () => Promise<{ default: Catalog }>>> = {
  "pt-BR": () => import("./locales/pt-BR.json"),
  ja: () => import("./locales/ja.json"),
  ko: () => import("./locales/ko.json"),
};
const fontLoaders: Partial<Record<Locale, () => Promise<unknown>>> = {
  ja: () => Promise.all([import("@fontsource/noto-sans-jp/400.css"), import("@fontsource/noto-sans-jp/700.css")]),
  ko: () => Promise.all([import("@fontsource/noto-sans-kr/400.css"), import("@fontsource/noto-sans-kr/700.css")]),
};

export async function loadLocale(locale: Locale): Promise<void> {
  const font = fontLoaders[locale]?.().catch(() => undefined);
  if (!loaded.has(locale)) {
    const load = loaders[locale];
    if (load) catalogs[locale] = (await load()).default;
    loaded.add(locale);
  }
  await font;
}

export function isLocaleLoaded(locale: Locale): boolean {
  return loaded.has(locale);
}

/** Texto de plantilla: las plantillas en pt-BR/ja/ko se traducen desde el inglés. */
export function templateText(locale: Locale, english: string): string {
  return catalogs[locale]["tpl:" + english] ?? english;
}

export function translate(locale: Locale, key: MessageKey, vars?: Record<string, string | number>): string {
  const template = catalogs[locale]?.[key] ?? en[key];
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_match, name: string) => String(vars[name] ?? ""));
}

export function errorMessageKey(code: WorkErrorCode): MessageKey {
  switch (code) {
    case "too-large":
    case "image-too-large":
      return code === "image-too-large" ? "reasonImageSize" : "reasonTooLarge";
    case "quota":
      return "reasonQuota";
    case "invalid-format":
      return "reasonInvalid";
    case "unsupported-version":
      return "reasonVersion";
    case "storage":
      return "reasonStorage";
    case "not-found":
      return "reasonMissing";
    case "corrupt-file":
      return "reasonCorrupt";
    case "unsupported-type":
      return "reasonType";
    case "image-type":
      return "reasonImageType";
    case "invalid-link":
      return "reasonLink";
    case "invalid-move":
      return "reasonMove";
    case "invalid-name":
      return "reasonInvalid";
    case "ai-unavailable":
      return "aiUnavailable";
    default:
      return "reasonGeneric";
  }
}
