// @vitest-environment jsdom
import { describe, expect, test } from "vitest";
import { htmlToDoc } from "../../src/docs/import-html";
import { docToText } from "../../src/docs/model";
import { sanitizeForeignHtml } from "../../src/security/sanitize";

describe("sanitización", () => {
  test("elimina scripts y eventos de html ajeno", () => {
    const clean = sanitizeForeignHtml(`<p onclick="alert(1)">Hola</p><script>alert(1)</script><img src="https://example.test/a.png" />`);
    expect(clean.toLowerCase()).not.toContain("script");
    expect(clean.toLowerCase()).not.toContain("onclick");
    expect(clean).not.toContain("https://example.test");
    expect(clean).toContain("Hola");
  });

  test("importar html se queda con el texto y no con el script", () => {
    const doc = htmlToDoc("<h1>Carta</h1><p>Texto <strong>firme</strong></p><script>mal()</script>");
    const text = docToText(doc);
    expect(text).toContain("Carta");
    expect(text).toContain("firme");
    expect(text).not.toContain("mal()");
  });
});
