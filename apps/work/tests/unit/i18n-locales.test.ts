import { describe, expect, it } from "vitest";
import { en, es } from "../../src/i18n/messages";
import ptBR from "../../src/i18n/locales/pt-BR.json";
import ja from "../../src/i18n/locales/ja.json";
import ko from "../../src/i18n/locales/ko.json";
import { LOCALES, isLocale, matchLocale, translate, loadLocale } from "../../src/i18n";

const extra: Record<string, Record<string, string>> = { "pt-BR": ptBR, ja, ko };
const keys = Object.keys(en);
const placeholders = (text: string) => (text.match(/\{\w+\}/g) ?? []).sort().join(",");

describe("i18n de ORVUPI Work", () => {
  it("ofrece los cinco idiomas con su nombre propio", () => {
    expect(LOCALES.map((item) => item.id)).toEqual(["en", "es", "pt-BR", "ja", "ko"]);
    expect(LOCALES.map((item) => item.name)).toEqual(["English", "Español", "Português (Brasil)", "日本語", "한국어"]);
  });

  it("es y en tienen las mismas claves", () => {
    expect(Object.keys(es).sort()).toEqual([...keys].sort());
  });

  for (const [locale, catalog] of Object.entries(extra)) {
    it(`${locale}: no falta ninguna clave y no sobra ninguna`, () => {
      const missing = keys.filter((key) => typeof catalog[key] !== "string" || catalog[key].trim() === "");
      expect(missing).toEqual([]);
      const unknown = Object.keys(catalog).filter((key) => !key.startsWith("tpl:") && !(key in en));
      expect(unknown).toEqual([]);
    });
    it(`${locale}: conserva los marcadores {…} y los nombres de marca`, () => {
      for (const key of keys) {
        expect(placeholders(catalog[key] ?? ""), `${locale}.${key}`).toBe(placeholders((en as Record<string, string>)[key] ?? ""));
        for (const brand of ["ORVUPI Work", "ORVUPI"]) {
          if (((en as Record<string, string>)[key] ?? "").includes(brand)) expect(catalog[key], `${locale}.${key}`).toContain(brand);
        }
      }
    });
  }

  it("reconoce etiquetas del navegador sin imponer idioma", () => {
    expect(matchLocale("pt-PT")).toBe("pt-BR");
    expect(matchLocale("ja-JP")).toBe("ja");
    expect(matchLocale("ko")).toBe("ko");
    expect(matchLocale("fr-FR")).toBeNull();
    expect(isLocale("de")).toBe(false);
  });

  it("carga perezosa: el catálogo llega con loadLocale y antes se usa el inglés", async () => {
    expect(translate("ja", "navHome")).toBe(en.navHome);
    await loadLocale("ja");
    expect(translate("ja", "navHome")).toBe(ja.navHome);
  });
});
