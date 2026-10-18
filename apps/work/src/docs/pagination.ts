import { Extension } from "@tiptap/core";
import { Plugin, PluginKey, type EditorState } from "@tiptap/pm/state";
import { Decoration, DecorationSet, type EditorView } from "@tiptap/pm/view";

/**
 * Vista paginada como en Google Docs: el documento se reparte en hojas separadas.
 * Se miden los bloques de primer nivel y, donde no caben, se inserta un hueco que
 * completa la hoja, deja ver el fondo entre páginas y empieza la siguiente.
 * Los saltos de página del documento (pageBreak) fuerzan una hoja nueva.
 */

export const PAGE_GAP = 24;

type Break = { pos: number; height: number; page: number };
type Layout = { breaks: Break[]; filler: number; filler_pos: number; pages: number; margin: number };

export const paginationKey = new PluginKey<DecorationSet>("ow-pagination");

function same(a: Layout | null, b: Layout): boolean {
  if (!a) return false;
  if (a.filler !== b.filler || a.filler_pos !== b.filler_pos || a.margin !== b.margin || a.breaks.length !== b.breaks.length) return false;
  return a.breaks.every((item, index) => item.pos === b.breaks[index]!.pos && Math.abs(item.height - b.breaks[index]!.height) < 1);
}

function gapWidget(item: Break, margin: number): HTMLElement {
  const dom = document.createElement("div");
  dom.className = "ow-pgap";
  dom.setAttribute("contenteditable", "false");
  dom.setAttribute("aria-hidden", "true");
  dom.dataset.page = String(item.page);
  dom.style.height = `${item.height}px`;
  dom.style.setProperty("--pm", `${margin}px`);
  const end = document.createElement("div");
  end.className = "ow-pgap-end";
  const foot = document.createElement("span");
  foot.className = "ow-pgap-foot";
  const num = document.createElement("span");
  num.className = "ow-pgap-num";
  end.append(foot, num);
  const band = document.createElement("div");
  band.className = "ow-pgap-band";
  band.style.height = `${PAGE_GAP}px`;
  const start = document.createElement("div");
  start.className = "ow-pgap-start";
  const head = document.createElement("span");
  head.className = "ow-pgap-head";
  start.append(head);
  dom.append(end, band, start);
  // Pulsar en el hueco entre hojas no debe dejar el cursor dentro del adorno.
  dom.addEventListener("mousedown", (event) => event.preventDefault());
  return dom;
}

function decorations(state: EditorState, layout: Layout): DecorationSet {
  const items: Decoration[] = layout.breaks.map((item) =>
    Decoration.widget(item.pos, () => gapWidget(item, layout.margin), { side: -1, key: `g${item.page}-${Math.round(item.height)}-${layout.margin}`, ignoreSelection: true }),
  );
  return DecorationSet.create(state.doc, items);
}

function px(value: string): number {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

function measure(view: EditorView): Layout | null {
  const article = view.dom.closest<HTMLElement>(".ow-a4");
  if (!article || !article.classList.contains("is-paged")) return null;
  const styles = getComputedStyle(article);
  const pageH = px(styles.getPropertyValue("--page-h"));
  const margin = px(styles.getPropertyValue("--page-margin"));
  const content = pageH - margin * 2;
  if (!(content > 100)) return null;
  const breaks: Break[] = [];
  let y = 0;
  let prevMB = 0;
  let first = true;
  let page = 1;
  const pageEnd = (pos: number) => {
    const remaining = Math.max(0, content - y - prevMB);
    page += 1;
    breaks.push({ pos, height: remaining + margin * 2 + PAGE_GAP, page });
    y = 0;
    prevMB = 0;
    first = true;
  };
  let offset = 0;
  const doc = view.state.doc;
  doc.forEach((node, pos) => {
    offset = pos + node.nodeSize;
    if (node.type.name === "pageBreak") {
      // La marca del salto ocupa un poco de la hoja actual; después empieza otra.
      const mark = view.nodeDOM(pos);
      if (mark instanceof HTMLElement) {
        const css = getComputedStyle(mark);
        y += Math.max(prevMB, px(css.marginTop)) + mark.offsetHeight;
        prevMB = px(css.marginBottom);
      }
      pageEnd(pos + node.nodeSize);
      return;
    }
    const dom = view.nodeDOM(pos);
    if (!(dom instanceof HTMLElement)) return;
    const css = getComputedStyle(dom);
    const mt = px(css.marginTop);
    const mb = px(css.marginBottom);
    const h = dom.offsetHeight;
    let top = y + (first ? mt : Math.max(prevMB, mt));
    if (!first && top + h > content) {
      pageEnd(pos);
      top = mt;
    }
    y = top + h;
    prevMB = mb;
    first = false;
  });
  const filler = Math.max(0, content - y - prevMB);
  return { breaks, filler, filler_pos: offset, pages: page, margin };
}

export const Pagination = Extension.create({
  name: "pagination",
  addProseMirrorPlugins() {
    let layout: Layout | null = null;
    let filler = 0;
    return [
      new Plugin<DecorationSet>({
        key: paginationKey,
        state: {
          init: () => DecorationSet.empty,
          apply(tr, set, _old, state) {
            const next = tr.getMeta(paginationKey) as Layout | "off" | undefined;
            if (next === "off") return DecorationSet.empty;
            if (next) return decorations(state, next);
            return tr.docChanged ? set.map(tr.mapping, tr.doc) : set;
          },
        },
        props: {
          decorations(state) {
            return paginationKey.getState(state);
          },
          // El resto de la última hoja es relleno del propio editor: pulsar ahí lleva el cursor al final.
          attributes: (): Record<string, string> => (filler > 0 ? { style: `padding-bottom: ${Math.round(filler)}px` } : {}),
        },
        view(view) {
          let frame = 0;
          const paint = () => {
            const article = view.dom.closest(".ow-a4");
            const edges = article?.querySelectorAll<HTMLInputElement>(".ow-a4-edge") ?? [];
            const head = edges[0]?.value ?? "";
            const foot = edges[1]?.value ?? "";
            const numbered = article?.querySelector(".ow-page-num") != null;
            view.dom.querySelectorAll<HTMLElement>(".ow-pgap").forEach((gap) => {
              const page = Number(gap.dataset.page ?? 2);
              const h = gap.querySelector(".ow-pgap-head");
              const f = gap.querySelector(".ow-pgap-foot");
              const n = gap.querySelector(".ow-pgap-num");
              if (h) h.textContent = head;
              if (f) f.textContent = foot;
              if (n) n.textContent = numbered ? String(page - 1) : "";
            });
            const last = article?.querySelector<HTMLElement>(".ow-page-num");
            if (last) last.textContent = String((layout?.pages ?? 1));
            if (article instanceof HTMLElement) article.dataset.pages = String(layout?.pages ?? 1);
          };
          const run = () => {
            frame = 0;
            if (view.isDestroyed) return;
            const next = measure(view);
            if (!next) {
              if (layout) {
                layout = null;
                filler = 0;
                view.dispatch(view.state.tr.setMeta(paginationKey, "off").setMeta("addToHistory", false));
              }
              paint();
              return;
            }
            if (!same(layout, next)) {
              layout = next;
              filler = next.filler;
              view.dispatch(view.state.tr.setMeta(paginationKey, next).setMeta("addToHistory", false));
            }
            paint();
          };
          const schedule = () => {
            if (frame) return;
            frame = requestAnimationFrame(run);
          };
          const observer = typeof ResizeObserver === "function" ? new ResizeObserver(schedule) : null;
          observer?.observe(view.dom);
          const article = view.dom.closest(".ow-a4");
          if (article) observer?.observe(article);
          const onLoad = () => schedule();
          view.dom.addEventListener("load", onLoad, true);
          document.addEventListener("input", schedule, true);
          window.addEventListener("resize", schedule);
          void document.fonts?.ready.then(schedule);
          schedule();
          return {
            update(_view, previous) {
              if (previous.doc !== view.state.doc || !view.dom.closest(".ow-a4.is-paged") !== !layout) schedule();
              else paint();
            },
            destroy() {
              if (frame) cancelAnimationFrame(frame);
              observer?.disconnect();
              view.dom.removeEventListener("load", onLoad, true);
              document.removeEventListener("input", schedule, true);
              window.removeEventListener("resize", schedule);
            },
          };
        },
      }),
    ];
  },
});
