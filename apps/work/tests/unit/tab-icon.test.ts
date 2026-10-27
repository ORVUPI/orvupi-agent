import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { WORK_TAB_ICON_VERSION, workTabIcon } from "../../src/routing/paths";

describe("icono de la pestaña de Work", () => {
  test("el HTML pide el avatar oficial y no el dibujo anterior", () => {
    const html = readFileSync(new URL("../../index.html", import.meta.url), "utf8");
    const query = `?v=${WORK_TAB_ICON_VERSION}`;
    expect(html).toContain(`/favicon-32.png${query}`);
    expect(html).toContain(`/icons/icon-192.png${query}`);
    expect(html).toContain(`apple-touch-icon" href="/icons/icon-192.png${query}"`);
    expect(html).not.toContain("brand-work.svg");
    expect(workTabIcon()).toBe(`/favicon-32.png${query}`);
  });
});
