export type PageBox = { left: number; top: number; width: number; height: number };

export type ZoomAnchor = { page: number; relX: number; relY: number };

export type ScrollerBox = { scrollLeft: number; scrollTop: number; clientWidth: number; clientHeight: number };

const EDGE = 48;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

/** Viewport center, in the same content coordinates as `scrollLeft` / `scrollTop`. */
export function viewportCenter(scroller: ScrollerBox): { x: number; y: number } {
  return {
    x: scroller.scrollLeft + scroller.clientWidth / 2,
    y: scroller.scrollTop + scroller.clientHeight / 2,
  };
}

function contains(page: PageBox, x: number, y: number): boolean {
  return x >= page.left && x <= page.left + page.width && y >= page.top && y <= page.top + page.height;
}

function outsideDistance(page: PageBox, x: number, y: number): number {
  const dx = x < page.left ? page.left - x : x > page.left + page.width ? x - (page.left + page.width) : 0;
  const dy = y < page.top ? page.top - y : y > page.top + page.height ? y - (page.top + page.height) : 0;
  return dx * dx + dy * dy;
}

/**
 * Point of the viewport center on a page. The ratio stays on the page (0–1),
 * so a center that sits in the gap or the margin snaps to the nearest edge
 * of the current page instead of a point in empty space.
 */
export function anchorOnPage(
  pages: Array<PageBox & { page: number }>,
  centerX: number,
  centerY: number,
  preferPage?: number,
): ZoomAnchor | null {
  if (pages.length === 0) return null;
  const hit = pages.find((page) => contains(page, centerX, centerY));
  let target = hit;
  if (!target) {
    let best = Infinity;
    for (const page of pages) {
      const bias = page.page === preferPage ? -0.01 : 0;
      const dist = outsideDistance(page, centerX, centerY) + bias;
      if (dist < best) {
        best = dist;
        target = page;
      }
    }
  }
  if (!target || target.width <= 0 || target.height <= 0) return null;
  return {
    page: target.page,
    relX: clamp01((centerX - target.left) / target.width),
    relY: clamp01((centerY - target.top) / target.height),
  };
}

function overlap(scroll: number, pageStart: number, pageSize: number, viewSize: number): number {
  const viewEnd = scroll + viewSize;
  const pageEnd = pageStart + pageSize;
  return Math.min(viewEnd, pageEnd) - Math.max(scroll, pageStart);
}

/** Keep `rel` under the viewport center, then pull back if the view would miss the page. */
export function scrollToAnchor(
  page: PageBox,
  anchor: Pick<ZoomAnchor, "relX" | "relY">,
  view: { width: number; height: number },
  maxScroll: { left: number; top: number },
): { scrollLeft: number; scrollTop: number } {
  return {
    scrollLeft: axisScroll(page.left + anchor.relX * page.width - view.width / 2, page.left, page.width, view.width, maxScroll.left),
    scrollTop: axisScroll(page.top + anchor.relY * page.height - view.height / 2, page.top, page.height, view.height, maxScroll.top),
  };
}

function axisScroll(desired: number, pageStart: number, pageSize: number, viewSize: number, maxScroll: number): number {
  const max = Math.max(0, maxScroll);
  const minOverlap = Math.min(EDGE, pageSize, viewSize);
  let scroll = clamp(desired, 0, max);
  if (overlap(scroll, pageStart, pageSize, viewSize) >= minOverlap - 0.5) return scroll;
  scroll = clamp(pageStart + pageSize / 2 - viewSize / 2, 0, max);
  if (overlap(scroll, pageStart, pageSize, viewSize) >= minOverlap - 0.5) return scroll;
  const pageEnd = pageStart + pageSize;
  if (pageStart > scroll + viewSize - minOverlap) scroll = clamp(pageStart - viewSize + minOverlap, 0, max);
  if (pageEnd < scroll + minOverlap) scroll = clamp(pageEnd - minOverlap, 0, max);
  return scroll;
}

/** Page box in scroller content coordinates (the space `scrollLeft` / `scrollTop` use). */
export function pageBoxInScroller(root: HTMLElement, page: HTMLElement): PageBox {
  const rootRect = root.getBoundingClientRect();
  const rect = page.getBoundingClientRect();
  return {
    left: rect.left - rootRect.left - root.clientLeft + root.scrollLeft,
    top: rect.top - rootRect.top - root.clientTop + root.scrollTop,
    width: rect.width,
    height: rect.height,
  };
}
