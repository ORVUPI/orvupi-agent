import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import type { Editor } from "@tiptap/react";
import { NodeSelection } from "@tiptap/pm/state";
import { clampNum } from "./layout-nodes";

/**
 * Redimensionar imágenes como en Google Docs: marco con 8 tiradores (las esquinas mantienen la
 * proporción y los lados no; Mayús invierte), tamaño visible al arrastrar, límite al ancho de la
 * página. Las opciones (ajuste de texto, tamaño original y eliminar) no tapan el texto: al
 * seleccionar solo hay tiradores y un botón pequeño ⋯ en la esquina de la imagen que abre un menú
 * compacto. El menú se cierra al elegir, al tocar fuera o con Esc, no aparece mientras se arrastra
 * y se coloca dentro de la parte visible (visualViewport, teclado del móvil). Ratón, táctil y teclado.
 * Mover: con la imagen ya seleccionada, arrastrar desde el centro. «En línea» la recoloca en otra
 * posición del texto (cursor de inserción visible); «Ajustar texto», «Detrás» y «Delante» la mueven
 * libremente y guardan offsetX/offsetY. Sin seleccionar, el dedo desplaza la página como siempre.
 */

type Handle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";
const HANDLES: Handle[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
type Labels = { inline: string; square: string; behind: string; front: string; original: string; remove: string; frame: string; size: string; more: string; move: string };

const MENU_W = 196;
const GAP = 8;

type Box = { left: number; top: number; width: number; height: number; zoom: number };

function selectedImage(editor: Editor | null): { pos: number; img: HTMLImageElement } | null {
  if (!editor) return null;
  const { selection } = editor.state;
  if (!(selection instanceof NodeSelection) || selection.node.type.name !== "image") return null;
  const dom = editor.view.nodeDOM(selection.from);
  const img = dom instanceof HTMLImageElement ? dom : dom instanceof HTMLElement ? dom.querySelector("img") : null;
  return img ? { pos: selection.from, img } : null;
}

export function ImageResize({ editor, labels, editable }: { editor: Editor | null; labels: Labels; editable: boolean }) {
  const [target, setTarget] = useState<{ pos: number; img: HTMLImageElement } | null>(null);
  const [box, setBox] = useState<Box | null>(null);
  const [live, setLive] = useState<{ w: number; h: number } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ left: number; top: number; maxHeight: number } | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const moreRef = useRef<HTMLButtonElement | null>(null);
  const move = useRef<{ id: number; x: number; y: number; active: boolean; zoom: number; drop: number | null } | null>(null);
  const [caret, setCaret] = useState<{ left: number; top: number; width: number } | null>(null);
  const [moving, setMoving] = useState(false);
  const drag = useRef<{ handle: Handle; x: number; y: number; w: number; h: number; ratio: number; max: number; zoom: number; id: number } | null>(null);

  useEffect(() => {
    if (!editor) return;
    const update = () => setTarget(editable ? selectedImage(editor) : null);
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

  // Cerrar al tocar fuera o con Esc (aunque el foco no esté en el menú).
  useEffect(() => {
    if (!menuOpen) return;
    const outside = (event: PointerEvent) => {
      const node = event.target as Node | null;
      if (node && (menuRef.current?.contains(node) || moreRef.current?.contains(node))) return;
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

  // Colocar el menú dentro de la zona visible: primero dentro de la imagen (no tapa texto), luego
  // debajo, encima o al lado; siempre recortado al visualViewport (teclado del móvil incluido).
  useLayoutEffect(() => {
    if (!menuOpen || !box) {
      setMenuPos(null);
      return;
    }
    const vv = window.visualViewport;
    const vx = vv ? vv.offsetLeft : 0;
    const vy = vv ? vv.offsetTop : 0;
    const vw = vv ? vv.width : window.innerWidth;
    const vh = vv ? vv.height : window.innerHeight;
    const width = Math.min(MENU_W, vw - 2 * GAP);
    const natural = menuRef.current?.scrollHeight ?? 240;
    const maxHeight = Math.max(80, vh - 2 * GAP);
    const height = Math.min(natural, maxHeight);
    const clampX = (x: number) => Math.max(vx + GAP, Math.min(vx + vw - GAP - width, x));
    const clampY = (y: number) => Math.max(vy + GAP, Math.min(vy + vh - GAP - height, y));
    const fitsY = (y: number) => y >= vy + GAP && y + height <= vy + vh - GAP;
    const imgRight = box.left + box.width;
    const imgBottom = box.top + box.height;
    let left: number;
    let top: number;
    const insideTop = box.top + 44;
    if (box.width >= width + 16 && insideTop + height <= imgBottom - 8 && fitsY(insideTop)) {
      left = imgRight - 8 - width;
      top = insideTop;
    } else if (fitsY(imgBottom + GAP)) {
      left = imgRight - width;
      top = imgBottom + GAP;
    } else if (fitsY(box.top - GAP - height)) {
      left = imgRight - width;
      top = box.top - GAP - height;
    } else if (imgRight + GAP + width <= vx + vw - GAP) {
      left = imgRight + GAP;
      top = box.top;
    } else if (box.left - GAP - width >= vx + GAP) {
      left = box.left - GAP - width;
      top = box.top;
    } else {
      left = imgRight - 8 - width;
      top = box.top + 44;
    }
    const next = { left: clampX(left), top: clampY(top), maxHeight };
    setMenuPos((prev) => (prev && prev.left === next.left && prev.top === next.top && prev.maxHeight === next.maxHeight ? prev : next));
  }, [menuOpen, box]);

  // Al abrir, el foco va al primer elemento del menú.
  useEffect(() => {
    if (menuOpen && menuPos) {
      const first = menuRef.current?.querySelector<HTMLElement>('[role^="menuitem"]');
      if (first && !menuRef.current?.contains(document.activeElement)) first.focus({ preventScroll: true });
    }
  }, [menuOpen, menuPos]);

  useEffect(() => {
    if (!target) {
      setBox(null);
      return;
    }
    let frame = 0;
    const place = () => {
      const rect = target.img.getBoundingClientRect();
      const zoom = target.img.offsetWidth > 0 ? rect.width / target.img.offsetWidth : 1;
      setBox((prev) => (prev && prev.left === rect.left && prev.top === rect.top && prev.width === rect.width && prev.height === rect.height && prev.zoom === zoom ? prev : { left: rect.left, top: rect.top, width: rect.width, height: rect.height, zoom }));
    };
    const loop = () => {
      place();
      frame = requestAnimationFrame(loop);
    };
    loop();
    const vv = window.visualViewport;
    const bump = () => setBox((prev) => (prev ? { ...prev } : prev));
    vv?.addEventListener("resize", bump);
    vv?.addEventListener("scroll", bump);
    return () => {
      cancelAnimationFrame(frame);
      vv?.removeEventListener("resize", bump);
      vv?.removeEventListener("scroll", bump);
    };
  }, [target]);

  if (!editor || !target || !box) return null;
  const node = editor.state.doc.nodeAt(target.pos);
  if (!node || node.type.name !== "image") return null;

  const pageWidth = () => {
    const page = target.img.closest(".ProseMirror") as HTMLElement | null;
    if (!page) return 2000;
    const css = getComputedStyle(page);
    return Math.max(32, page.clientWidth - parseFloat(css.paddingLeft) - parseFloat(css.paddingRight));
  };

  const commit = (attrs: Record<string, unknown>) => {
    const current = editor.state.doc.nodeAt(target.pos);
    if (!current) return;
    editor.chain().command(({ tr }) => {
      tr.setNodeMarkup(target.pos, undefined, { ...current.attrs, ...attrs });
      tr.setSelection(NodeSelection.create(tr.doc, target.pos));
      return true;
    }).run();
  };

  const onDown = (handle: Handle) => (event: ReactPointerEvent<HTMLSpanElement>) => {
    event.preventDefault();
    event.stopPropagation();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    setMenuOpen(false);
    const w = target.img.offsetWidth || Number(node.attrs.width) || 100;
    const h = target.img.offsetHeight || Number(node.attrs.height) || 100;
    drag.current = { handle, x: event.clientX, y: event.clientY, w, h, ratio: w / Math.max(1, h), max: pageWidth(), zoom: box.zoom || 1, id: event.pointerId };
    setLive({ w: Math.round(w), h: Math.round(h) });
  };
  const onMove = (event: ReactPointerEvent<HTMLSpanElement>) => {
    const d = drag.current;
    if (!d || d.id !== event.pointerId) return;
    const dx = (event.clientX - d.x) / d.zoom;
    const dy = (event.clientY - d.y) / d.zoom;
    const corner = d.handle.length === 2;
    const keep = corner !== event.shiftKey;
    let w = d.w;
    let h = d.h;
    if (d.handle.includes("e")) w = d.w + dx;
    if (d.handle.includes("w")) w = d.w - dx;
    if (d.handle.includes("s")) h = d.h + dy;
    if (d.handle.includes("n")) h = d.h - dy;
    if (keep) {
      if (d.handle === "n" || d.handle === "s") w = h * d.ratio;
      else if (d.handle === "e" || d.handle === "w") h = w / d.ratio;
      else if (Math.abs(dx) >= Math.abs(dy)) h = w / d.ratio;
      else w = h * d.ratio;
    }
    w = Math.max(16, Math.min(d.max, w));
    if (keep) h = w / d.ratio;
    h = Math.max(16, Math.min(4000, h));
    target.img.style.width = `${Math.round(w)}px`;
    target.img.style.height = `${Math.round(h)}px`;
    setLive({ w: Math.round(w), h: Math.round(h) });
  };
  const onUp = (event: ReactPointerEvent<HTMLSpanElement>) => {
    const d = drag.current;
    if (!d || d.id !== event.pointerId) return;
    drag.current = null;
    const size = live;
    target.img.style.width = "";
    target.img.style.height = "";
    setLive(null);
    if (size) commit({ width: size.w, height: size.h });
  };

  const wrapNow = String(node.attrs.wrap ?? "inline");
  const onMoveDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 && event.pointerType === "mouse") return;
    event.preventDefault();
    event.stopPropagation();
    try {
      (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    } catch {
      // Algunos navegadores no capturan punteros sintéticos; el arrastre sigue funcionando.
    }
    move.current = { id: event.pointerId, x: event.clientX, y: event.clientY, active: false, zoom: box.zoom || 1, drop: null };
  };
  const onMoveMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const m = move.current;
    if (!m || m.id !== event.pointerId) return;
    const dx = event.clientX - m.x;
    const dy = event.clientY - m.y;
    if (!m.active) {
      if (Math.hypot(dx, dy) < 5) return;
      m.active = true;
      setMoving(true);
      setMenuOpen(false);
    }
    if (wrapNow === "inline") {
      // La imagen es un bloque: se coloca entre párrafos (línea de inserción visible).
      const hit = editor.view.posAtCoords({ left: event.clientX, top: event.clientY });
      if (!hit) return;
      const doc = editor.state.doc;
      let start = 0;
      let found: { start: number; size: number } | null = null;
      doc.forEach((child, offset) => {
        if (!found && hit.pos >= offset && hit.pos <= offset + child.nodeSize) found = { start: offset, size: child.nodeSize };
        start = offset;
      });
      void start;
      if (!found) return;
      const block = found as { start: number; size: number };
      const dom = editor.view.nodeDOM(block.start);
      if (!(dom instanceof HTMLElement)) return;
      const r = dom.getBoundingClientRect();
      const before = event.clientY < r.top + r.height / 2;
      m.drop = before ? block.start : block.start + block.size;
      setCaret({ left: r.left, top: before ? r.top - 2 : r.bottom, width: Math.max(24, r.width) });
    } else {
      target.img.style.transform = `translate(${dx}px, ${dy}px)`;
    }
  };
  const onMoveUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const m = move.current;
    if (!m || m.id !== event.pointerId) return;
    move.current = null;
    setMoving(false);
    setCaret(null);
    target.img.style.transform = "";
    if (!m.active || event.type === "pointercancel") return;
    if (wrapNow === "inline") {
      const drop = m.drop;
      if (drop === null || (drop >= target.pos && drop <= target.pos + node.nodeSize)) return;
      editor.chain().command(({ tr }) => {
        const current = tr.doc.nodeAt(target.pos);
        if (!current) return false;
        tr.delete(target.pos, target.pos + current.nodeSize);
        const at = tr.mapping.map(drop);
        tr.insert(at, current);
        tr.setSelection(NodeSelection.create(tr.doc, at));
        return true;
      }).run();
      return;
    }
    const sign = String(node.attrs.align ?? "left") === "right" ? -1 : 1;
    const dx = ((event.clientX - m.x) / m.zoom) * sign;
    const dy = (event.clientY - m.y) / m.zoom;
    commit({
      offsetX: clampNum((Number(node.attrs.offsetX) || 0) + dx, -2000, 2000, 0),
      offsetY: clampNum((Number(node.attrs.offsetY) || 0) + dy, -2000, 2000, 0),
    });
  };

  const original = () => {
    const natural = { w: target.img.naturalWidth || Number(node.attrs.width) || 300, h: target.img.naturalHeight || Number(node.attrs.height) || 200 };
    const max = pageWidth();
    const scale = Math.min(1, max / natural.w);
    commit({ width: Math.round(natural.w * scale), height: Math.round(natural.h * scale) });
  };

  const wrap = String(node.attrs.wrap ?? "inline");
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
  const dragging = live !== null || moving;
  const small = box.width < 72 || box.height < 56;
  return (
    <>
      <div className={`ow-imgframe${moving ? " is-moving" : ""}`} role="group" aria-label={labels.frame} style={{ left: box.left, top: box.top, width: box.width, height: box.height }}>
        {live ? null : (
          <div
            className="ow-imgframe-move"
            title={labels.move}
            aria-hidden="true"
            onPointerDown={onMoveDown}
            onPointerMove={onMoveMove}
            onPointerUp={onMoveUp}
            onPointerCancel={onMoveUp}
          />
        )}
        {moving ? null : HANDLES.map((handle) => (
          <span
            key={handle}
            className={`ow-imgframe-h is-${handle}`}
            data-handle={handle}
            aria-hidden="true"
            onPointerDown={onDown(handle)}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
            onLostPointerCapture={onUp}
          />
        ))}
        {live ? <span className="ow-imgframe-size" role="status">{labels.size.replace("{w}", String(live.w)).replace("{h}", String(live.h))}</span> : null}
        {dragging ? null : (
          <button
            ref={moreRef}
            type="button"
            className={`ow-imgmore${small ? " is-outside" : ""}`}
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
        )}
      </div>
      {caret ? <div className="ow-imgcaret" aria-hidden="true" style={{ left: caret.left, top: caret.top, width: caret.width }} /> : null}
      {menuOpen && !dragging ? (
        <div
          ref={menuRef}
          id="ow-imgmenu"
          className="ow-imgmenu"
          role="menu"
          aria-label={labels.more}
          style={{ left: menuPos?.left ?? -9999, top: menuPos?.top ?? -9999, maxHeight: menuPos?.maxHeight, width: Math.min(MENU_W, window.innerWidth - 2 * GAP), visibility: menuPos ? "visible" : "hidden" }}
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
