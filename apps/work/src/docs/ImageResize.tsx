import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import type { Editor } from "@tiptap/react";
import { NodeSelection } from "@tiptap/pm/state";
import { clampNum } from "./layout-nodes";

/**
 * Imagen seleccionada en Docs, como en Google Docs:
 * - Marco con 8 tiradores. Esquinas y lados mantienen la proporción (Mayús la libera; la proporción libre
 *   se guarda y se ve igual al soltar). Nunca más ancha que el ancho útil de la página.
 * - Arrastrar desde el centro (con la imagen ya seleccionada) la mueve: «En línea» la recoloca entre
 *   párrafos con una línea de inserción si se suelta junto a otro hueco; si se lleva a un lado o a una
 *   zona sin hueco pasa a «Delante» y queda donde se suelta (el texto no se mueve). Los modos libres se mueven libremente por
 *   el documento (se ancla al párrafo de destino y guarda offsetX/offsetY), siempre dentro de la página.
 * - Sin parpadeo: mientras se arrastra solo se cambia el estilo de la <img> en requestAnimationFrame, la
 *   paginación queda congelada y no hay transacciones hasta soltar.
 * - El marco vive en una capa recortada por el contenedor con scroll: nunca sale sobre la barra.
 * - Botón ⋯ con menú compacto (ajuste de texto, tamaño original y eliminar), accesible y con visualViewport.
 */

type Handle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";
const HANDLES: Handle[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
type Labels = { inline: string; square: string; behind: string; front: string; original: string; remove: string; frame: string; size: string; more: string; move: string };
type Rect = { left: number; top: number; width: number; height: number };
type Box = Rect & { zoom: number; clip: Rect };

const MENU_W = 196;
const GAP = 8;
const MOVE_SLOP_MOUSE = 4;
const MOVE_SLOP_TOUCH = 8;
/** Más allá de esto (px en pantalla) una imagen «En línea» deja de reordenarse y se coloca libre. */
const FREE_DX = 40;
const FREE_DY = 40;
const EDGE = 48;

function selectedImage(editor: Editor | null): { pos: number; img: HTMLImageElement } | null {
  if (!editor) return null;
  const { selection } = editor.state;
  if (!(selection instanceof NodeSelection) || selection.node.type.name !== "image") return null;
  const dom = editor.view.nodeDOM(selection.from);
  const img = dom instanceof HTMLImageElement ? dom : dom instanceof HTMLElement ? dom.querySelector("img") : null;
  return img ? { pos: selection.from, img } : null;
}

function scroller(el: Element): HTMLElement | null {
  let node: HTMLElement | null = el.parentElement;
  while (node) {
    if (node.classList.contains("ow-docs-scroll")) return node;
    const css = getComputedStyle(node);
    if (/(auto|scroll)/.test(css.overflowY) && node.scrollHeight > node.clientHeight + 1) return node;
    node = node.parentElement;
  }
  return null;
}

/** Zona visible: contenedor con scroll ∩ visualViewport (teclado del móvil incluido). */
function visibleArea(el: Element): Rect {
  const vv = window.visualViewport;
  let left = vv ? vv.offsetLeft : 0;
  let top = vv ? vv.offsetTop : 0;
  let right = left + (vv ? vv.width : window.innerWidth);
  let bottom = top + (vv ? vv.height : window.innerHeight);
  const sc = scroller(el);
  if (sc) {
    const r = sc.getBoundingClientRect();
    left = Math.max(left, r.left);
    top = Math.max(top, r.top);
    right = Math.min(right, r.right);
    bottom = Math.min(bottom, r.bottom);
  }
  return { left, top, width: Math.max(0, right - left), height: Math.max(0, bottom - top) };
}

/** Caja del contenido de la página (ancho útil) en coordenadas de pantalla. */
function contentBox(img: HTMLElement): { left: number; right: number; top: number; bottom: number; width: number; zoom: number } {
  const page = img.closest(".ProseMirror") as HTMLElement | null;
  if (!page) return { left: 0, right: 2000, top: 0, bottom: 1e6, width: 2000, zoom: 1 };
  const r = page.getBoundingClientRect();
  const zoom = page.offsetWidth > 0 ? r.width / page.offsetWidth : 1;
  const css = getComputedStyle(page);
  const pl = parseFloat(css.paddingLeft) * zoom;
  const pr = parseFloat(css.paddingRight) * zoom;
  const pt = parseFloat(css.paddingTop) * zoom;
  const pb = parseFloat(css.paddingBottom) * zoom;
  // Abajo: hasta el final de la hoja (no solo del texto escrito), para poder bajarla en una página corta.
  const sheet = page.closest(".ow-a4") as HTMLElement | null;
  // (El relleno inferior del editor paginado incluye el hueco hasta el final de la hoja: se usa el margen superior.)
  const sheetBottom = sheet ? sheet.getBoundingClientRect().bottom - Math.min(pb, pt) : r.bottom - pb;
  // Móvil (documento continuo, sin hojas): la «página» es todo el lienzo blanco, hasta el final del contenido con scroll.
  let flowBottom = 0;
  if (sheet?.classList.contains("is-flow")) {
    const sc = scroller(page);
    if (sc) flowBottom = sc.getBoundingClientRect().top - sc.scrollTop + sc.scrollHeight - 16;
  }
  return { left: r.left + pl, right: r.right - pr, top: r.top + pt, bottom: Math.max(r.bottom - pb, sheetBottom, flowBottom), width: Math.max(32, (page.clientWidth - parseFloat(css.paddingLeft) - parseFloat(css.paddingRight))), zoom };
}

/** Congela la paginación mientras se arrastra para que la imagen no salte de página en cada frame. */
function freeze(editor: Editor, on: boolean) {
  const dom = editor.view.dom as HTMLElement;
  if (on) dom.dataset.owFreeze = "1";
  else if (dom.dataset.owFreeze) {
    delete dom.dataset.owFreeze;
    dom.dispatchEvent(new Event("load"));
  }
}

type Resize = { handle: Handle; id: number; x: number; y: number; w: number; h: number; ratio: number; max: number; zoom: number; px: number; py: number; shift: boolean; raf: number; size: { w: number; h: number } | null };
type Move = { id: number; x: number; y: number; px: number; py: number; slop: number; active: boolean; zoom: number; scrollTop0: number; sc: HTMLElement | null; raf: number; drop: number | null; start: Rect };

export function ImageResize({ editor, labels, editable }: { editor: Editor | null; labels: Labels; editable: boolean }) {
  const [target, setTarget] = useState<{ pos: number; img: HTMLImageElement } | null>(null);
  const [box, setBox] = useState<Box | null>(null);
  const [resizing, setResizing] = useState(false);
  const [moving, setMoving] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ left: number; top: number; maxHeight: number } | null>(null);
  const [caret, setCaret] = useState<{ left: number; top: number; width: number } | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const moreRef = useRef<HTMLButtonElement | null>(null);
  const drag = useRef<Resize | null>(null);
  const move = useRef<Move | null>(null);
  const placeRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    if (!editor) return;
    const update = () => {
      if (drag.current || move.current) return;
      const next = editable ? selectedImage(editor) : null;
      setTarget((prev) => (prev && next && prev.pos === next.pos && prev.img === next.img ? prev : next));
    };
    editor.on("selectionUpdate", update);
    editor.on("transaction", update);
    update();
    return () => {
      editor.off("selectionUpdate", update);
      editor.off("transaction", update);
    };
  }, [editor, editable]);

  const targetImg = target?.img ?? null;
  useEffect(() => {
    setMenuOpen(false);
  }, [targetImg]);

  // Seguir a la imagen en cada frame (scroll, zoom, teclado) sin tocar el editor.
  useEffect(() => {
    if (!target) {
      setBox(null);
      return;
    }
    let frame = 0;
    const place = () => {
      if (!target.img.isConnected) return;
      const r = target.img.getBoundingClientRect();
      const zoom = target.img.offsetWidth > 0 ? r.width / target.img.offsetWidth : 1;
      const c = visibleArea(target.img);
      setBox((prev) =>
        prev && prev.left === r.left && prev.top === r.top && prev.width === r.width && prev.height === r.height && prev.zoom === zoom && prev.clip.left === c.left && prev.clip.top === c.top && prev.clip.width === c.width && prev.clip.height === c.height
          ? prev
          : { left: r.left, top: r.top, width: r.width, height: r.height, zoom, clip: c },
      );
    };
    placeRef.current = place;
    const loop = () => {
      place();
      frame = requestAnimationFrame(loop);
    };
    loop();
    return () => {
      cancelAnimationFrame(frame);
      placeRef.current = () => undefined;
    };
  }, [target]);

  // Cerrar el menú al tocar fuera o con Esc.
  useEffect(() => {
    if (!menuOpen) return;
    const outside = (event: PointerEvent) => {
      const n = event.target as Node | null;
      if (n && (menuRef.current?.contains(n) || moreRef.current?.contains(n))) return;
      setMenuOpen(false);
    };
    const esc = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setMenuOpen(false);
      moreRef.current?.focus();
    };
    document.addEventListener("pointerdown", outside, true);
    document.addEventListener("keydown", esc, true);
    return () => {
      document.removeEventListener("pointerdown", outside, true);
      document.removeEventListener("keydown", esc, true);
    };
  }, [menuOpen]);

  // Parte visible de la imagen (recortada por el contenedor con scroll).
  const vis = box
    ? (() => {
        const l = Math.max(box.left, box.clip.left);
        const t = Math.max(box.top, box.clip.top);
        const r = Math.min(box.left + box.width, box.clip.left + box.clip.width);
        const b = Math.min(box.top + box.height, box.clip.top + box.clip.height);
        return r - l > 0 && b - t > 0 ? { left: l, top: t, width: r - l, height: b - t } : null;
      })()
    : null;

  // Si la imagen sale de la vista, se cierra el menú.
  useEffect(() => {
    if (menuOpen && (!vis || vis.height < 24)) setMenuOpen(false);
  }, [menuOpen, vis]);

  // Colocar el menú dentro de la zona visible: dentro de la imagen si cabe, si no debajo, encima o al lado.
  useLayoutEffect(() => {
    if (!menuOpen || !box || !vis) {
      setMenuPos(null);
      return;
    }
    const area = box.clip;
    const width = Math.min(MENU_W, area.width - 2 * GAP);
    const natural = menuRef.current?.scrollHeight ?? 240;
    const maxHeight = Math.max(80, area.height - 2 * GAP);
    const height = Math.min(natural, maxHeight);
    const minX = area.left + GAP;
    const maxX = area.left + area.width - GAP - width;
    const minY = area.top + GAP;
    const maxY = area.top + area.height - GAP - height;
    const fitsY = (y: number) => y >= minY && y <= maxY;
    const right = vis.left + vis.width;
    const bottom = box.top + box.height;
    const inside = vis.top + 44;
    let left = right - 8 - width;
    let top = inside;
    if (!(vis.width >= width + 16 && inside + height <= vis.top + vis.height - 8)) {
      if (fitsY(bottom + GAP)) {
        left = right - width;
        top = bottom + GAP;
      } else if (fitsY(box.top - GAP - height)) {
        left = right - width;
        top = box.top - GAP - height;
      } else if (right + GAP + width <= area.left + area.width - GAP) {
        left = right + GAP;
        top = vis.top;
      } else if (vis.left - GAP - width >= minX) {
        left = vis.left - GAP - width;
        top = vis.top;
      }
    }
    const next = { left: Math.max(minX, Math.min(maxX, left)), top: Math.max(minY, Math.min(maxY, top)), maxHeight };
    setMenuPos((prev) => (prev && prev.left === next.left && prev.top === next.top && prev.maxHeight === next.maxHeight ? prev : next));
  }, [menuOpen, box, vis]);

  useEffect(() => {
    if (menuOpen && menuPos) {
      const first = menuRef.current?.querySelector<HTMLElement>('[role^="menuitem"]');
      if (first && !menuRef.current?.contains(document.activeElement)) first.focus({ preventScroll: true });
    }
  }, [menuOpen, menuPos]);

  // Si el componente desaparece a mitad de un arrastre, no dejar la paginación congelada.
  useEffect(() => () => {
    if (editor && (drag.current || move.current)) freeze(editor, false);
  }, [editor]);

  if (!editor || !target || !box) return null;
  const node = editor.state.doc.nodeAt(target.pos);
  if (!node || node.type.name !== "image") return null;
  const img = target.img;

  const commit = (attrs: Record<string, unknown>) => {
    const current = editor.state.doc.nodeAt(target.pos);
    if (!current) return;
    editor.chain().command(({ tr }) => {
      tr.setNodeMarkup(target.pos, undefined, { ...current.attrs, ...attrs });
      tr.setSelection(NodeSelection.create(tr.doc, target.pos));
      return true;
    }).run();
  };

  const capture = (event: ReactPointerEvent<HTMLElement>) => {
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      /* puntero sintético */
    }
  };

  // ---- Redimensionar ----
  const applyResize = () => {
    const d = drag.current;
    if (!d) return;
    d.raf = 0;
    const dx = (d.px - d.x) / d.zoom;
    const dy = (d.py - d.y) / d.zoom;
    // Por defecto se conserva la proporción también en los lados; Mayús la libera.
    const keep = !d.shift;
    const sx = d.handle.includes("e") ? 1 : d.handle.includes("w") ? -1 : 0;
    const sy = d.handle.includes("s") ? 1 : d.handle.includes("n") ? -1 : 0;
    let w = d.w + sx * dx;
    let h = d.h + sy * dy;
    if (keep) {
      if (sy === 0) h = w / d.ratio;
      else if (sx === 0) w = h * d.ratio;
      else {
        // Proyección del puntero sobre la diagonal: cambia de forma continua, sin saltos entre ejes.
        const scale = Math.max((sx * dx * d.w + sy * dy * d.h) / (d.w * d.w + d.h * d.h), -1 + 16 / Math.min(d.w, d.h));
        w = d.w * (1 + scale);
        h = w / d.ratio;
      }
    }
    if (sx === 0 && !keep) w = d.w;
    if (sy === 0 && !keep) h = d.h;
    w = Math.max(16, Math.min(d.max, w));
    h = keep ? w / d.ratio : Math.max(16, Math.min(4000, h));
    const size = { w: Math.round(w), h: Math.round(h) };
    if (d.size && d.size.w === size.w && d.size.h === size.h) return;
    d.size = size;
    img.style.width = `${size.w}px`;
    img.style.height = `${size.h}px`;
    placeRef.current();
  };
  const onDown = (handle: Handle) => (event: ReactPointerEvent<HTMLSpanElement>) => {
    event.preventDefault();
    event.stopPropagation();
    capture(event);
    setMenuOpen(false);
    const w = img.offsetWidth || Number(node.attrs.width) || 100;
    const h = img.offsetHeight || Number(node.attrs.height) || 100;
    const natural = img.naturalWidth > 0 && img.naturalHeight > 0 ? img.naturalWidth / img.naturalHeight : w / Math.max(1, h);
    const shown = w / Math.max(1, h);
    // Si la imagen ya tiene la proporción natural (±2 %), se usa esa para que no haya deriva.
    const ratio = Math.abs(shown / natural - 1) < 0.02 ? natural : shown;
    freeze(editor, true);
    img.dataset.owResizing = "1";
    drag.current = { handle, id: event.pointerId, x: event.clientX, y: event.clientY, w, h: w / ratio, ratio, max: contentBox(img).width, zoom: box.zoom || 1, px: event.clientX, py: event.clientY, shift: event.shiftKey, raf: 0, size: null };
    if (handle.length !== 2) drag.current.h = h;
    setResizing(true);
  };
  const onMove = (event: ReactPointerEvent<HTMLSpanElement>) => {
    const d = drag.current;
    if (!d || d.id !== event.pointerId) return;
    // Algunos navegadores envían (0, 0) cuando el puntero sale de la ventana: se ignora.
    if (event.clientX === 0 && event.clientY === 0) return;
    d.px = event.clientX;
    d.py = event.clientY;
    d.shift = event.shiftKey;
    if (!d.raf) d.raf = requestAnimationFrame(applyResize);
  };
  const onUp = (event: ReactPointerEvent<HTMLSpanElement>) => {
    const d = drag.current;
    if (!d || d.id !== event.pointerId) return;
    if (d.raf) cancelAnimationFrame(d.raf);
    applyResize();
    drag.current = null;
    const size = d.size;
    img.style.width = "";
    img.style.height = "";
    delete img.dataset.owResizing;
    setResizing(false);
    if (size) commit({ width: size.w, height: size.h });
    freeze(editor, false);
  };

  // ---- Mover ----
  const wrapNow = String(node.attrs.wrap ?? "inline");
  const blocks = () => {
    const out: { start: number; size: number; rect: DOMRect }[] = [];
    editor.state.doc.forEach((child, offset) => {
      if (offset === target.pos) return;
      const dom = editor.view.nodeDOM(offset);
      if (dom instanceof HTMLElement) out.push({ start: offset, size: child.nodeSize, rect: dom.getBoundingClientRect() });
    });
    return out;
  };
  /** Desplazamiento permitido para que la imagen nunca salga de la página. */
  const limits = (m: Move) => {
    const c = contentBox(img);
    return {
      minX: c.left - m.start.left,
      maxX: c.right - (m.start.left + m.start.width),
      minY: c.top - m.start.top,
      maxY: c.bottom - (m.start.top + m.start.height),
    };
  };
  const delta = (m: Move) => {
    const scroll = m.sc ? m.sc.scrollTop - m.scrollTop0 : 0;
    const lim = limits({ ...m, start: { ...m.start, top: m.start.top - scroll } });
    const dx = Math.max(Math.min(0, lim.minX), Math.min(Math.max(0, lim.maxX), m.px - m.x));
    const dy = Math.max(Math.min(0, lim.minY), Math.min(Math.max(0, lim.maxY), m.py - m.y + scroll));
    return { dx, dy, scroll };
  };
  const stepMove = () => {
    const m = move.current;
    if (!m || !m.active) return;
    m.raf = 0;
    // Desplazamiento automático cerca de los bordes del área visible.
    if (m.sc) {
      const area = visibleArea(img);
      const speed = m.py < area.top + EDGE ? -Math.ceil((area.top + EDGE - m.py) / 4) : m.py > area.top + area.height - EDGE ? Math.ceil((m.py - (area.top + area.height - EDGE)) / 4) : 0;
      if (speed) {
        m.sc.scrollTop += Math.max(-16, Math.min(16, speed));
        m.raf = requestAnimationFrame(stepMove);
      }
    }
    const { dx, dy } = delta(m);
    img.style.transform = `translate(${Math.round(dx)}px, ${Math.round(dy)}px)`;
    // El marco se recoloca en el mismo frame que la imagen (sin desfase durante el auto-scroll).
    placeRef.current();
    if (wrapNow === "inline") {
      // Referencia: el borde superior de la imagen arrastrada (como la vista previa que se ve).
      const y = m.start.top - (m.sc ? m.sc.scrollTop - m.scrollTop0 : 0) + dy;
      const list = blocks();
      let best: { at: number; y: number; left: number; width: number } | null = null;
      for (const b of list) {
        for (const [at, edge] of [[b.start, b.rect.top], [b.start + b.size, b.rect.bottom]] as const) {
          if (!best || Math.abs(edge - y) < Math.abs(best.y - y)) best = { at, y: edge, left: b.rect.left, width: b.rect.width };
        }
      }
      const own = (at: number) => at >= target.pos && at <= target.pos + node.nodeSize;
      // Si se desplaza a un lado o no hay otro hueco entre bloques, se colocará libre donde se suelte (sin línea de inserción).
      if (!best || own(best.at) || Math.abs(dx) > FREE_DX || Math.abs(best.y - y) > FREE_DY) {
        m.drop = null;
        setCaret(null);
      } else {
        m.drop = best.at;
        setCaret((prev) => (prev && prev.left === best!.left && prev.top === best!.y - 1 && prev.width === best!.width ? prev : { left: best!.left, top: best!.y - 1, width: Math.max(24, best!.width) }));
      }
    }
  };
  const onMoveDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    capture(event);
    const sc = scroller(img);
    const r = img.getBoundingClientRect();
    move.current = { id: event.pointerId, x: event.clientX, y: event.clientY, px: event.clientX, py: event.clientY, slop: event.pointerType === "mouse" ? MOVE_SLOP_MOUSE : MOVE_SLOP_TOUCH, active: false, zoom: box.zoom || 1, scrollTop0: sc?.scrollTop ?? 0, sc, raf: 0, drop: null, start: { left: r.left, top: r.top, width: r.width, height: r.height } };
  };
  const onMoveMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const m = move.current;
    if (!m || m.id !== event.pointerId) return;
    m.px = event.clientX;
    m.py = event.clientY;
    if (!m.active) {
      if (Math.hypot(m.px - m.x, m.py - m.y) < m.slop) return;
      m.active = true;
      freeze(editor, true);
      img.dataset.owMoving = "1";
      setMoving(true);
      setMenuOpen(false);
    }
    if (!m.raf) m.raf = requestAnimationFrame(stepMove);
  };
  const finishMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const m = move.current;
    if (!m || m.id !== event.pointerId) return;
    if (m.raf) cancelAnimationFrame(m.raf);
    move.current = null;
    if (!m.active) return;
    const { dx, dy } = delta(m);
    img.style.transform = "";
    delete img.dataset.owMoving;
    setMoving(false);
    setCaret(null);
    if (event.type === "pointercancel") {
      freeze(editor, false);
      return;
    }
    let extra: Record<string, unknown> = {};
    if (wrapNow === "inline") {
      const drop = m.drop;
      if (drop !== null && !(drop >= target.pos && drop <= target.pos + node.nodeSize)) {
        relocate(drop, {});
        freeze(editor, false);
        return;
      }
      if (Math.abs(dx) < 3 && Math.abs(dy) < 3) {
        freeze(editor, false);
        return;
      }
      // «En línea» solo se reordena entre bloques: para dejarla donde se suelta pasa a «Delante» (el texto no se mueve).
      extra = { wrap: "front" };
    }
    // Libre: destino en pantalla (sin la imagen), anclado al bloque de debajo y desplazado dentro de la página.
    const scrollNow = m.sc ? m.sc.scrollTop - m.scrollTop0 : 0;
    const wantLeft = m.start.left + dx;
    const wantTop = m.start.top - scrollNow + dy;
    const list = blocks();
    let anchor = list[0];
    for (const b of list) if (b.rect.top <= wantTop + 1) anchor = b;
    const c = contentBox(img);
    const z = m.zoom;
    const w = m.start.width / z;
    const ox = clampNum((wantLeft - c.left) / z, 0, Math.max(0, Math.floor(c.width - w)), 0);
    const oy = anchor ? clampNum((wantTop - anchor.rect.top) / z, 0, 2000, 0) : 0;
    const attrs = { ...extra, offsetX: ox, offsetY: oy, align: "left" };
    const pos = anchor ? (anchor.start > target.pos ? anchor.start : anchor.start) : target.pos;
    const at = relocate(anchor && anchor.start !== target.pos + node.nodeSize ? pos : null, attrs);
    // Corrección fina: medir dónde quedó y ajustar el desplazamiento (sigue congelada la paginación).
    requestAnimationFrame(() => {
      const dom = at === null ? null : editor.view.nodeDOM(at);
      const el = dom instanceof HTMLImageElement ? dom : dom instanceof HTMLElement ? dom.querySelector("img") : null;
      if (el && at !== null) {
        const r = el.getBoundingClientRect();
        const fixX = (wantLeft - r.left) / z;
        const fixY = (wantTop - r.top) / z;
        const cur = editor.state.doc.nodeAt(at);
        if (cur && (Math.abs(fixX) > 1 || Math.abs(fixY) > 1)) {
          const nx = clampNum((Number(cur.attrs.offsetX) || 0) + fixX, 0, Math.max(0, Math.floor(c.width - w)), 0);
          const ny = clampNum((Number(cur.attrs.offsetY) || 0) + fixY, 0, 2000, 0);
          editor.chain().command(({ tr }) => {
            tr.setNodeMarkup(at, undefined, { ...cur.attrs, offsetX: nx, offsetY: ny });
            tr.setSelection(NodeSelection.create(tr.doc, at));
            tr.setMeta("addToHistory", false);
            return true;
          }).run();
        }
      }
      freeze(editor, false);
    });
  };
  /** Mueve el nodo a `drop` (o lo deja donde está si es null) con los atributos dados. Devuelve su posición. */
  const relocate = (drop: number | null, attrs: Record<string, unknown>): number | null => {
    let result: number | null = null;
    editor.chain().command(({ tr }) => {
      const current = tr.doc.nodeAt(target.pos);
      if (!current) return false;
      const next = current.type.create({ ...current.attrs, ...attrs }, current.content, current.marks);
      if (drop === null || (drop >= target.pos && drop <= target.pos + current.nodeSize)) {
        tr.setNodeMarkup(target.pos, undefined, next.attrs);
        result = target.pos;
      } else {
        tr.delete(target.pos, target.pos + current.nodeSize);
        result = tr.mapping.map(drop);
        tr.insert(result, next);
      }
      tr.setSelection(NodeSelection.create(tr.doc, result));
      return true;
    }).run();
    return result;
  };

  const original = () => {
    const natural = { w: img.naturalWidth || Number(node.attrs.width) || 300, h: img.naturalHeight || Number(node.attrs.height) || 200 };
    const max = contentBox(img).width;
    const scale = Math.min(1, max / natural.w);
    commit({ width: Math.round(natural.w * scale), height: Math.round(natural.h * scale), offsetX: Math.min(Number(node.attrs.offsetX) || 0, Math.max(0, Math.floor(max - natural.w * scale))) });
  };

  const wrap = wrapNow;
  const choose = (action: () => void) => {
    setMenuOpen(false);
    action();
    moreRef.current?.focus({ preventScroll: true });
  };
  const onMenuKey = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role^="menuitem"]') ?? []);
    const index = items.indexOf(document.activeElement as HTMLElement);
    const go = (i: number) => {
      event.preventDefault();
      items[(i + items.length) % items.length]?.focus();
    };
    if (event.key === "ArrowDown") go(index + 1);
    else if (event.key === "ArrowUp") go(index - 1);
    else if (event.key === "Home") go(0);
    else if (event.key === "End") go(items.length - 1);
    else if (event.key === "Tab") setMenuOpen(false);
  };

  const dragging = resizing || moving;
  const clip = box.clip;
  // ⋯ en la esquina superior derecha de la parte visible de la imagen.
  const small = box.width < 72 || box.height < 56;
  const showMore = !dragging && vis !== null && vis.height >= 40 && vis.width >= 40;
  const moreLeft = vis ? (small ? box.left + box.width + 12 : vis.left + vis.width - 14) - clip.left : 0;
  const moreTop = vis ? (small ? box.top : vis.top + 14) - clip.top : 0;
  return (
    <>
      <div className="ow-imglayer" style={{ left: clip.left, top: clip.top, width: clip.width, height: clip.height }}>
        <div className={`ow-imgframe${moving ? " is-moving" : ""}`} role="group" aria-label={labels.frame} data-visible={vis ? "true" : "false"} style={{ left: box.left - clip.left, top: box.top - clip.top, width: box.width, height: box.height }}>
          {resizing ? null : (
            <div className="ow-imgframe-move" title={labels.move} aria-hidden="true" onPointerDown={onMoveDown} onPointerMove={onMoveMove} onPointerUp={finishMove} onPointerCancel={finishMove} />
          )}
          {moving ? null : HANDLES.map((handle) => (
            <span key={handle} className={`ow-imgframe-h is-${handle}`} data-handle={handle} aria-hidden="true" onPointerDown={onDown(handle)} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onLostPointerCapture={onUp} />
          ))}
        </div>
        {showMore ? (
          <button
            ref={moreRef}
            type="button"
            className="ow-imgmore"
            style={{ left: moreLeft, top: moreTop, transform: small ? undefined : "translateX(-100%)" }}
            aria-label={labels.more}
            title={labels.more}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-controls={menuOpen ? "ow-imgmenu" : undefined}
            onMouseDown={(event) => event.preventDefault()}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => setMenuOpen((open) => !open)}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setMenuOpen(true);
              }
            }}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" /></svg>
          </button>
        ) : null}
        {caret ? <div className="ow-imgcaret" aria-hidden="true" style={{ left: caret.left - clip.left, top: caret.top - clip.top, width: caret.width }} /> : null}
      </div>
      {menuOpen && !dragging && vis ? (
        <div
          ref={menuRef}
          id="ow-imgmenu"
          className="ow-imgmenu"
          role="menu"
          aria-label={labels.more}
          style={{ left: menuPos?.left ?? -9999, top: menuPos?.top ?? -9999, maxHeight: menuPos?.maxHeight, width: Math.min(MENU_W, clip.width - 2 * GAP), visibility: menuPos ? "visible" : "hidden" }}
          onMouseDown={(event) => event.preventDefault()}
          onKeyDown={onMenuKey}
        >
          {([["inline", labels.inline], ["square", labels.square], ["behind", labels.behind], ["front", labels.front]] as const).map(([value, label]) => (
            <button key={value} type="button" role="menuitemradio" aria-checked={wrap === value} tabIndex={-1} onClick={() => choose(() => commit({ wrap: value }))}>
              <span className="ow-imgmenu-check" aria-hidden="true">{wrap === value ? "✓" : ""}</span>
              {label}
            </button>
          ))}
          <div className="ow-imgmenu-sep" role="separator" />
          <button type="button" role="menuitem" tabIndex={-1} onClick={() => choose(original)}>
            <span className="ow-imgmenu-check" aria-hidden="true" />
            {labels.original}
          </button>
          <button type="button" role="menuitem" tabIndex={-1} className="is-danger" onClick={() => { setMenuOpen(false); editor.chain().focus().deleteSelection().run(); }}>
            <span className="ow-imgmenu-check" aria-hidden="true" />
            {labels.remove}
          </button>
        </div>
      ) : null}
    </>
  );
}
