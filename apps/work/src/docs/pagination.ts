import { Extension } from "@tiptap/core";
import type { Node as ProseNode } from "@tiptap/pm/model";
import { Plugin, PluginKey, type EditorState } from "@tiptap/pm/state";
import { Decoration, DecorationSet, type EditorView } from "@tiptap/pm/view";

/**
 * Vista paginada como en Google Docs: el documento se reparte en hojas separadas.
 * - Los bloques que no caben pasan a la hoja siguiente; un párrafo que cruza el final de la hoja
 *   se parte por la línea que ya no cabe (al menos dos líneas a cada lado, como el control de viudas).
 * - Las tablas se parten entre filas y, si la primera fila está marcada como encabezado, se repite arriba.
 * - Las notas al pie van al pie de la hoja donde está su llamada y restan sitio al texto.
 * - Las notas finales van tras el último bloque.
 * - Las secciones empiezan en hoja nueva si así lo piden; las de varias columnas se miden enteras.
 */

export const PAGE_GAP = 24;
const NOTE_SEPARATOR = 14;

type Note = { n: number; text: string };
type Break = { pos: number; height: number; page: number; notes: Note[]; inline: boolean };
type RowGap = { pos: number; end: number; height: number; page: number; notes: Note[]; header: number };
type Layout = { breaks: Break[]; rows: RowGap[]; filler: number; filler_pos: number; pages: number; margin: number; lastNotes: Note[]; endnotes: Note[] };

export const paginationKey = new PluginKey<DecorationSet>("ow-pagination");

function notesKey(notes: Note[]): string {
  return notes.map((note) => `${note.n}:${note.text.length}:${note.text.slice(0, 12)}`).join("|");
}

function same(a: Layout | null, b: Layout): boolean {
  if (!a) return false;
  if (a.filler !== b.filler || a.filler_pos !== b.filler_pos || a.margin !== b.margin || a.breaks.length !== b.breaks.length || a.rows.length !== b.rows.length) return false;
  if (notesKey(a.lastNotes) !== notesKey(b.lastNotes) || notesKey(a.endnotes) !== notesKey(b.endnotes)) return false;
  return a.breaks.every((item, index) => {
    const other = b.breaks[index]!;
    return item.pos === other.pos && item.inline === other.inline && Math.abs(item.height - other.height) < 1 && notesKey(item.notes) === notesKey(other.notes);
  }) && a.rows.every((item, index) => {
    const other = b.rows[index]!;
    return item.pos === other.pos && Math.abs(item.height - other.height) < 1 && item.header === other.header && notesKey(item.notes) === notesKey(other.notes);
  });
}

function notesList(notes: Note[], className: string): HTMLElement {
  const list = document.createElement("ol");
  list.className = className;
  for (const note of notes) {
    const item = document.createElement("li");
    item.value = note.n;
    item.textContent = note.text;
    list.append(item);
  }
  return list;
}

function gapParts(page: number, margin: number, notes: Note[], inline: boolean, tag = "div"): HTMLElement {
  const dom = document.createElement(tag);
  dom.className = inline ? "ow-pgap is-inline" : "ow-pgap";
  dom.setAttribute("contenteditable", "false");
  dom.setAttribute("aria-hidden", "true");
  dom.dataset.page = String(page);
  dom.style.setProperty("--pm", `${margin}px`);
  const end = document.createElement("div");
  end.className = "ow-pgap-end";
  if (notes.length > 0) {
    const box = document.createElement("div");
    box.className = "ow-pgap-notes";
    box.append(notesList(notes, "ow-page-notes"));
    end.append(box);
  }
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

function gapWidget(item: Break, margin: number): HTMLElement {
  const dom = gapParts(item.page, margin, item.notes, item.inline, item.inline ? "span" : "div");
  dom.style.height = `${item.height}px`;
  return dom;
}

function finalWidget(layout: Layout): HTMLElement {
  const dom = document.createElement("div");
  dom.className = "ow-pfinal";
  dom.setAttribute("contenteditable", "false");
  dom.setAttribute("aria-hidden", "true");
  dom.style.setProperty("--pm", `${layout.margin}px`);
  if (layout.endnotes.length > 0) {
    const box = document.createElement("div");
    box.className = "ow-endnotes";
    box.append(notesList(layout.endnotes, "ow-page-notes is-end"));
    dom.append(box);
  }
  const spacer = document.createElement("div");
  spacer.className = "ow-pfinal-space";
  spacer.style.height = `${Math.max(0, layout.filler)}px`;
  dom.append(spacer);
  if (layout.lastNotes.length > 0) {
    const box = document.createElement("div");
    box.className = "ow-pgap-notes is-last";
    box.append(notesList(layout.lastNotes, "ow-page-notes"));
    dom.append(box);
  }
  return dom;
}

function decorations(state: EditorState, layout: Layout): DecorationSet {
  const items: Decoration[] = layout.breaks.map((item) =>
    Decoration.widget(item.pos, () => gapWidget(item, layout.margin), { side: -1, key: `g${item.page}-${Math.round(item.height)}-${layout.margin}-${item.inline ? "i" : "b"}-${notesKey(item.notes)}`, ignoreSelection: true }),
  );
  for (const row of layout.rows) {
    items.push(Decoration.node(row.pos, row.end, { class: "ow-pgrow", style: `--pg: ${Math.round(row.height)}px`, "data-pg-page": String(row.page), "data-pg-head": String(row.header) }));
  }
  if (layout.lastNotes.length > 0 || layout.endnotes.length > 0) {
    items.push(Decoration.widget(layout.filler_pos, () => finalWidget(layout), { side: 1, key: `f${Math.round(layout.filler)}-${notesKey(layout.lastNotes)}-${notesKey(layout.endnotes)}`, ignoreSelection: true }));
  }
  return DecorationSet.create(state.doc, items);
}

function px(value: string): number {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

function footnotesIn(node: ProseNode, base: number, kind: "foot" | "end"): Array<{ pos: number; text: string }> {
  const out: Array<{ pos: number; text: string }> = [];
  node.descendants((child, offset) => {
    if (child.type.name === "footnote" && (child.attrs.kind === "end" ? "end" : "foot") === kind) out.push({ pos: base + 1 + offset, text: String(child.attrs.text ?? "") });
  });
  return out;
}

class NoteMeter {
  private box: HTMLElement;
  private cache = new Map<string, number>();
  constructor(article: HTMLElement, width: number) {
    let box = article.querySelector<HTMLElement>(":scope > .ow-fnmeasure");
    if (!box) {
      box = document.createElement("div");
      box.className = "ow-fnmeasure";
      box.setAttribute("aria-hidden", "true");
      article.append(box);
    }
    box.style.width = `${width}px`;
    this.box = box;
  }
  height(notes: Note[]): number {
    if (notes.length === 0) return 0;
    const key = `${this.box.style.width}|${notes.map((note) => `${note.n}\u0001${note.text}`).join("\u0002")}`;
    const hit = this.cache.get(key);
    if (hit !== undefined) return hit;
    this.box.replaceChildren(notesList(notes, "ow-page-notes"));
    const value = this.box.offsetHeight + NOTE_SEPARATOR;
    this.cache.set(key, value);
    return value;
  }
}

type Unit = { node: ProseNode; pos: number; forceBreak: boolean };

function units(doc: ProseNode): Unit[] {
  const out: Unit[] = [];
  doc.forEach((node, pos) => {
    if (node.type.name === "section") {
      const forceBreak = out.length > 0 && node.attrs.breakType !== "continuous";
      if (Number(node.attrs.columns) > 1) {
        out.push({ node, pos, forceBreak });
        return;
      }
      let firstChild = true;
      node.forEach((child, offset) => {
        out.push({ node: child, pos: pos + 1 + offset, forceBreak: firstChild && forceBreak });
        firstChild = false;
      });
      return;
    }
    out.push({ node, pos, forceBreak: false });
  });
  return out;
}

function measure(view: EditorView): Layout | null {
  const article = view.dom.closest<HTMLElement>(".ow-a4");
  if (!article || !article.classList.contains("is-paged")) return null;
  const styles = getComputedStyle(article);
  const pageH = px(styles.getPropertyValue("--page-h"));
  const margin = px(styles.getPropertyValue("--page-margin"));
  const content = pageH - margin * 2;
  if (!(content > 100)) return null;
  article.classList.add("is-measuring");
  try {
    return layoutOf(view, article, content, margin);
  } finally {
    article.classList.remove("is-measuring");
  }
}

function layoutOf(view: EditorView, article: HTMLElement, content: number, margin: number): Layout {
  // Se mide el documento sin huecos (flujo continuo) y se reparte en hojas con coordenadas exactas.
  const meter = new NoteMeter(article, view.dom.clientWidth || article.clientWidth - margin * 2);
  const breaks: Break[] = [];
  const rows: RowGap[] = [];
  const domRect = view.dom.getBoundingClientRect();
  const scale = view.dom.offsetHeight > 0 && domRect.height > 0 ? domRect.height / view.dom.offsetHeight : 1;
  const origin = domRect.top;
  const flow = (clientY: number) => (clientY - origin) / scale;
  let page = 1;
  let pageTop = px(getComputedStyle(view.dom).paddingTop);
  let pageNotes: Note[] = [];
  let footN = 0;
  let usedBottom = pageTop; // final del último bloque colocado (con su margen inferior), en el flujo
  let pending: { pos: number; inline: boolean; remaining: number } | null = null;
  const cap = (extra: Note[] = []) => content - meter.height([...pageNotes, ...extra]);
  const closePage = (pos: number, inline: boolean, until: number) => {
    // Las notas de la hoja se dibujan dentro del hueco, al pie del área de texto.
    const remaining = Math.max(0, pageTop + content - until);
    page += 1;
    breaks.push({ pos, height: remaining + margin * 2 + PAGE_GAP, page, notes: pageNotes, inline });
    pageNotes = [];
  };
  // Un salto de bloque se cierra al llegar al bloque siguiente, que fija dónde empieza la hoja nueva.
  const startAt = (flowTop: number, mt: number) => {
    if (!pending) return;
    pending = null;
    pageTop = flowTop - mt;
  };
  let offset = 0;
  const doc = view.state.doc;
  doc.forEach((node, pos) => {
    offset = pos + node.nodeSize;
  });
  const lineOf = (p: number) => {
    const c = view.coordsAtPos(p, 1);
    return { top: flow(c.top), bottom: flow(c.bottom) };
  };
  for (const unit of units(doc)) {
    const { node, pos } = unit;
    const dom = view.nodeDOM(pos);
    if (!(dom instanceof HTMLElement)) continue;
    const css = getComputedStyle(dom);
    // Lo que flota o se superpone no ocupa sitio propio en el flujo.
    if (css.position === "absolute" || css.float === "left" || css.float === "right") continue;
    const mt = px(css.marginTop);
    const mb = px(css.marginBottom);
    const rect = dom.getBoundingClientRect();
    const top = flow(rect.top);
    const bottom = flow(rect.bottom);
    if (pending) startAt(top, mt);
    const firstOnPage = usedBottom <= pageTop + 0.5;
    if (unit.forceBreak && !firstOnPage) {
      closePage(pos, false, usedBottom);
      pageTop = top - mt;
      usedBottom = pageTop;
    }
    if (node.type.name === "pageBreak") {
      closePage(pos + node.nodeSize, false, bottom + mb);
      pending = { pos, inline: false, remaining: 0 };
      usedBottom = bottom + mb;
      continue;
    }
    const notes = footnotesIn(node, pos, "foot");
    const take = (from: number, to = Infinity) => {
      for (const note of notes) if (note.pos >= from && note.pos < to) pageNotes.push({ n: ++footN, text: note.text });
    };
    const preview = (from: number) => notes.filter((note) => note.pos >= from).map((note, index) => ({ n: footN + index + 1, text: note.text }));
    if (bottom <= pageTop + cap(preview(pos))) {
      take(pos);
      usedBottom = bottom + mb;
      continue;
    }
    if (node.isTextblock && node.content.size > 0) {
      // Párrafo que cruza el final de la hoja: se parte por la primera línea que no cabe.
      let from = pos + 1;
      const end = pos + node.nodeSize - 1;
      let guard = 0;
      let lineH = 16;
      while (guard++ < 400) {
        const limit = pageTop + cap(preview(from));
        if (bottom <= limit) break;
        if (lineOf(end).bottom <= limit) break;
        let lo = from;
        let hi = end;
        while (lo < hi) {
          const mid = (lo + hi) >> 1;
          if (lineOf(mid).bottom > limit) hi = mid;
          else lo = mid + 1;
        }
        const line = lineOf(lo);
        lineH = Math.max(8, line.bottom - line.top);
        const startTop = from === pos + 1 ? top : lineOf(from).top;
        const fitsTwo = line.top - startTop >= lineH * 1.6;
        const leavesTwo = bottom - line.top >= lineH * 1.6;
        if (lo <= from || !fitsTwo || !leavesTwo) {
          if (from === pos + 1 && usedBottom > pageTop + 0.5) {
            // Sin dos líneas a cada lado, el párrafo entero pasa a la hoja siguiente.
            closePage(pos, false, usedBottom);
            pageTop = top - mt;
            usedBottom = pageTop;
            continue;
          }
          if (!leavesTwo || lo <= from) break;
        }
        take(from, lo);
        closePage(lo, true, line.top);
        pageTop = line.top;
        from = lo;
      }
      take(from);
      usedBottom = bottom + mb;
      continue;
    }
    if (node.type.name === "table") {
      const table = dom.querySelector("table");
      const trs = Array.from(dom.querySelectorAll<HTMLTableRowElement>("tr")).filter((tr) => tr.closest("table") === table);
      const rowPos: Array<{ pos: number; end: number }> = [];
      node.forEach((row, rowOffset) => {
        rowPos.push({ pos: pos + 1 + rowOffset, end: pos + 1 + rowOffset + row.nodeSize });
      });
      const head = node.firstChild;
      const header = Boolean(head && head.childCount > 0 && Array.from({ length: head.childCount }, (_, i) => head.child(i)).every((cell) => cell.type.name === "tableHeader"));
      const headerH = header && trs[0] ? trs[0].getBoundingClientRect().height / scale : 0;
      let index = 0;
      let rowsOnPage = 0;
      while (index < trs.length) {
        const rowRect = trs[index]!.getBoundingClientRect();
        const rowTop = flow(rowRect.top);
        const rowBottom = flow(rowRect.bottom);
        if (rowBottom <= pageTop + cap()) {
          index += 1;
          rowsOnPage += 1;
          continue;
        }
        const minRows = header && breaks.length + rows.length === 0 ? 2 : header ? 2 : 1;
        if (index < minRows && rowsOnPage === index && usedBottom > pageTop + 0.5) {
          // Ni la primera fila (con su encabezado) cabe: la tabla entera pasa a la hoja siguiente.
          closePage(pos, false, usedBottom);
          pageTop = top - mt;
          usedBottom = pageTop;
          rowsOnPage = 0;
          continue;
        }
        if (rowsOnPage === 0 || index === 0) {
          index += 1; // fila más alta que una hoja: no se parte por dentro
          rowsOnPage += 1;
          continue;
        }
        const rp = rowPos[index];
        if (!rp) break;
        const remaining = Math.max(0, pageTop + content - rowTop);
        page += 1;
        const repeat = header ? headerH : 0;
        rows.push({ pos: rp.pos, end: rp.end, height: remaining + margin * 2 + PAGE_GAP + repeat, page, notes: pageNotes, header: Math.round(repeat) });
        pageNotes = [];
        pageTop = rowTop - repeat;
        rowsOnPage = 0;
      }
      take(pos);
      usedBottom = bottom + mb;
      continue;
    }
    // Bloque que no se parte (imagen, forma, sección a columnas…): a la hoja siguiente.
    if (usedBottom > pageTop + 0.5) {
      closePage(pos, false, usedBottom);
      pageTop = top - mt;
    }
    take(pos);
    usedBottom = bottom + mb;
  }
  let endN = 0;
  const endnotes: Note[] = [];
  doc.descendants((child) => {
    if (child.type.name === "footnote" && child.attrs.kind === "end") endnotes.push({ n: ++endN, text: String(child.attrs.text ?? "") });
  });
  const lastNotes = pageNotes;
  const filler = Math.max(0, pageTop + cap() - usedBottom);
  return { breaks, rows, filler, filler_pos: offset, pages: page, margin, lastNotes, endnotes };
}

function toRoman(value: number): string {
  let n = Math.max(1, Math.min(3999, Math.round(value)));
  const table: Array<[number, string]> = [[1000, "m"], [900, "cm"], [500, "d"], [400, "cd"], [100, "c"], [90, "xc"], [50, "l"], [40, "xl"], [10, "x"], [9, "ix"], [5, "v"], [4, "iv"], [1, "i"]];
  let out = "";
  for (const [size, letter] of table) while (n >= size) { out += letter; n -= size; }
  return out;
}

/** Huecos entre hojas sobre las filas de tabla partidas, con la fila de encabezado repetida. */
function paintRows(view: EditorView, article: HTMLElement, margin: number, head: string, foot: string, numbered: boolean, info: RowGap[]) {
  const layer = (() => {
    let found = article.querySelector<HTMLElement>(":scope > .ow-pgov-layer");
    if (!found) {
      found = document.createElement("div");
      found.className = "ow-pgov-layer";
      found.setAttribute("aria-hidden", "true");
      article.append(found);
    }
    return found;
  })();
  const rows = Array.from(view.dom.querySelectorAll<HTMLTableRowElement>("tr.ow-pgrow"));
  const base = article.getBoundingClientRect();
  const scale = article.offsetWidth > 0 ? base.width / article.offsetWidth : 1;
  const parts: HTMLElement[] = [];
  rows.forEach((row, rowIndex) => {
    const height = px(row.style.getPropertyValue("--pg"));
    const page = Number(row.dataset.pgPage ?? 2);
    const headerH = Number(row.dataset.pgHead ?? 0);
    const rect = row.getBoundingClientRect();
    const overlay = gapParts(page, margin, info[rowIndex]?.notes ?? [], false);
    overlay.classList.add("ow-pgov");
    overlay.style.top = `${(rect.top - base.top) / scale}px`;
    overlay.style.height = `${height}px`;
    const end = overlay.querySelector<HTMLElement>(".ow-pgap-end");
    if (end) end.style.flex = "1";
    overlay.querySelector(".ow-pgap-head")!.textContent = head;
    overlay.querySelector(".ow-pgap-foot")!.textContent = foot;
    overlay.querySelector(".ow-pgap-num")!.textContent = numbered ? String(page - 1) : "";
    const table = row.closest("table");
    const first = table?.querySelector("tr");
    if (headerH > 0 && table && first) {
      const holder = document.createElement("div");
      holder.className = "ow-pgov-head";
      holder.style.height = `${headerH}px`;
      const tableRect = table.getBoundingClientRect();
      // La capa empieza en el borde de la hoja: la cabecera repetida va justo encima de su tabla.
      holder.style.marginLeft = `${(tableRect.left - layer.getBoundingClientRect().left) / scale}px`;
      holder.style.width = `${tableRect.width / scale}px`;
      const copy = document.createElement("table");
      const colgroup = table.querySelector("colgroup");
      if (colgroup) copy.append(colgroup.cloneNode(true));
      const body = document.createElement("tbody");
      const clone = first.cloneNode(true) as HTMLElement;
      clone.classList.remove("ow-pgrow");
      clone.querySelectorAll("[contenteditable]").forEach((element) => element.removeAttribute("contenteditable"));
      body.append(clone);
      copy.append(body);
      holder.append(copy);
      overlay.append(holder);
    }
    parts.push(overlay);
  });
  layer.replaceChildren(...parts);
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
          attributes: (): Record<string, string> => {
            const final = layout && (layout.lastNotes.length > 0 || layout.endnotes.length > 0);
            return filler > 0 && !final ? { style: `padding-bottom: ${Math.round(filler)}px` } : {};
          },
        },
        view(view) {
          let frame = 0;
          const paint = () => {
            const article = view.dom.closest<HTMLElement>(".ow-a4");
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
            view.dom.querySelectorAll<HTMLElement>(".ow-page-notes.is-end li").forEach((item) => {
              item.dataset.label = toRoman((item as HTMLLIElement).value || 1);
            });
            if (article) {
              if (layout && layout.rows.length > 0) paintRows(view, article, layout.margin, head, foot, numbered, layout.rows);
              else article.querySelector(":scope > .ow-pgov-layer")?.replaceChildren();
            }
            const last = article?.querySelector<HTMLElement>(".ow-page-num");
            if (last) last.textContent = String((layout?.pages ?? 1));
            if (article instanceof HTMLElement) article.dataset.pages = String(layout?.pages ?? 1);
          };
          const run = () => {
            frame = 0;
            if (view.isDestroyed) return;
            // Congelada mientras se arrastra una imagen: al soltar se vuelve a medir.
            if ((view.dom as HTMLElement).dataset.owFreeze === "1") return;
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
