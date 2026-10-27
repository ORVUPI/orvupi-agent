import { describe, expect, test } from "vitest";
import { anchorOnPage, scrollToAnchor, viewportCenter, type PageBox } from "../../src/pdf/zoomAnchor";

const view = { width: 800, height: 600 };

function page(partial: Partial<PageBox> & { page: number }): PageBox & { page: number } {
  return { left: 64, top: 24, width: 600, height: 840, ...partial };
}

describe("ancla de zoom del PDF", () => {
  test("al ampliar, el mismo punto de la página sigue en el centro", () => {
    const before = page({ page: 1, left: 100, top: 24, width: 600, height: 840 });
    const scroller = { scrollLeft: 0, scrollTop: 80, clientWidth: view.width, clientHeight: view.height };
    const center = viewportCenter(scroller);
    const anchor = anchorOnPage([before], center.x, center.y, 1);
    expect(anchor?.page).toBe(1);
    const after = page({ page: 1, left: 64, top: 24, width: before.width * 2.8, height: before.height * 2.8 });
    const next = scrollToAnchor(after, anchor!, view, { left: 4000, top: 8000 });
    const nextCenter = viewportCenter({ ...scroller, scrollLeft: next.scrollLeft, scrollTop: next.scrollTop });
    expect(nextCenter.x).toBeCloseTo(after.left + anchor!.relX * after.width, 4);
    expect(nextCenter.y).toBeCloseTo(after.top + anchor!.relY * after.height, 4);
    expect(next.scrollLeft).toBeGreaterThan(0);
    expect(next.scrollTop).toBeGreaterThan(80);
  });

  test("al reducir desde un zoom alto no cae en el margen en blanco", () => {
    const wide = page({ page: 1, left: 64, top: 24, width: 1600, height: 2200 });
    const anchor = anchorOnPage([wide], 64 + 1600 * 0.62, 24 + 2200 * 0.4, 1)!;
    const narrow = page({ page: 1, left: 180, top: 24, width: 500, height: 700 });
    const next = scrollToAnchor(narrow, anchor, view, { left: 0, top: 200 });
    const center = viewportCenter({ scrollLeft: next.scrollLeft, scrollTop: next.scrollTop, clientWidth: view.width, clientHeight: view.height });
    expect(center.x).toBeGreaterThanOrEqual(narrow.left - 1);
    expect(center.x).toBeLessThanOrEqual(narrow.left + narrow.width + 1);
    expect(center.y).toBeGreaterThanOrEqual(narrow.top - 1);
    expect(center.y).toBeLessThanOrEqual(narrow.top + narrow.height + 1);
  });

  test("la página 4 sigue siendo la página 4 aunque crezcan las de arriba", () => {
    const pages = [1, 2, 3, 4].map((number) => page({ page: number, top: 24 + (number - 1) * 860, width: 500, height: 840 }));
    const current = pages[3]!;
    const centerY = current.top + 300;
    const anchor = anchorOnPage(pages, current.left + 250, centerY, 4);
    expect(anchor).toEqual({ page: 4, relX: 0.5, relY: 300 / 840 });
    const grown = pages.map((item) => ({ ...item, top: 24 + (item.page - 1) * 1800, width: 1100, height: 1760 }));
    const page4 = grown[3]!;
    const next = scrollToAnchor(page4, anchor!, view, { left: 2000, top: 20000 });
    const center = viewportCenter({ scrollLeft: next.scrollLeft, scrollTop: next.scrollTop, clientWidth: view.width, clientHeight: view.height });
    expect(center.y).toBeGreaterThan(page4.top);
    expect(center.y).toBeLessThan(page4.top + page4.height);
    expect(center.y).toBeGreaterThan(grown[1]!.top + grown[1]!.height);
  });

  test("no deja el visor entero en el hueco entre páginas", () => {
    const third = page({ page: 3, top: 1800, height: 840 });
    const fourth = page({ page: 4, top: third.top + third.height + 16, height: 840 });
    const gapY = third.top + third.height + 8;
    const anchor = anchorOnPage([third, fourth], third.left + 200, gapY, 4);
    expect(anchor?.page).toBe(4);
    expect(anchor?.relY).toBe(0);
    const next = scrollToAnchor(fourth, anchor!, view, { left: 0, top: 5000 });
    const top = next.scrollTop;
    const bottom = top + view.height;
    const overlap = Math.min(bottom, fourth.top + fourth.height) - Math.max(top, fourth.top);
    expect(overlap).toBeGreaterThan(40);
  });

  test("el tope superior no desplaza la página fuera de la vista", () => {
    const first = page({ page: 1, top: 24, height: 840 });
    const next = scrollToAnchor(first, { relX: 0.2, relY: 0 }, view, { left: 0, top: 4000 });
    expect(next.scrollTop).toBe(0);
    expect(overlapHeight(next.scrollTop, first)).toBeGreaterThan(40);
  });
});

function overlapHeight(scrollTop: number, box: PageBox): number {
  return Math.min(scrollTop + view.height, box.top + box.height) - Math.max(scrollTop, box.top);
}
