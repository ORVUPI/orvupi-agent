import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { editorPath, parseEditorPath, tabTitle } from "../../src/routing/paths";
import { publishFilesChanged, subscribeFilesChanged } from "../../src/routing/sync";

describe("rutas de cada herramienta", () => {
  test("construye y lee la URL de edición", () => {
    expect(editorPath("doc", "abc")).toBe("/document/d/abc/edit");
    expect(editorPath("sheet", "abc")).toBe("/spreadsheets/d/abc/edit");
    expect(editorPath("slide", "abc")).toBe("/presentation/d/abc/edit");
    expect(editorPath("form", "abc")).toBe("/forms/d/abc/edit");
    expect(editorPath("drawing", "abc")).toBe("/drawings/d/abc/edit");
    expect(editorPath("note", "abc")).toBe("/notes/d/abc/edit");
    expect(parseEditorPath("/document/d/abc/edit")).toEqual({ kind: "doc", id: "abc" });
    expect(parseEditorPath("/presentation/d/abc/edit/")).toEqual({ kind: "slide", id: "abc" });
    expect(parseEditorPath("/")).toBeNull();
    expect(parseEditorPath("/document/d/../edit")).toBeNull();
  });

  test("el título de la pestaña lleva el nombre y la herramienta", () => {
    expect(tabTitle("Informe", "doc")).toBe("Informe - ORVUPI Docs");
    expect(tabTitle("Cuentas", "sheet")).toBe("Cuentas - ORVUPI Sheets");
    expect(tabTitle("  ", "form")).toBe("ORVUPI Forms");
  });

  test("otra pestaña se entera de un cambio", async () => {
    const heard = new Promise<string>((resolve) => {
      const stop = subscribeFilesChanged(() => {
        stop();
        resolve("files-changed");
      });
    });
    publishFilesChanged();
    expect(await heard).toBe("files-changed");
  });

  test("Cloudflare Pages devuelve la app en cualquier ruta", () => {
    const rules = readFileSync(new URL("../../public/_redirects", import.meta.url), "utf8");
    expect(rules).toMatch(/\/\*\s+\/index\.html\s+200/);
  });
});
