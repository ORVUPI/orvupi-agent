import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { Editor } from "@tiptap/react";
import { NodeSelection } from "@tiptap/pm/state";

/**
 * Redimensionar imágenes como en Google Docs: marco con 8 tiradores (las esquinas mantienen la
 * proporción y los lados no; Mayús invierte), tamaño visible al arrastrar, límite al ancho de la
 * página y barra flotante con ajuste de texto, tamaño original y eliminar. Ratón y táctil.
 */

type Handle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";
const HANDLES: Handle[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
type Labels = { inline: string; square: string; behind: string; front: string; original: string; remove: string; frame: string; size: string };

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

  useEffect(() => {
    if (!target) {
      setBox(null);
      return;
    }
    let frame = 0;
    const place = () => {
      const rect = target.img.getBoundingClientRect();
      const zoom = target.img.offsetWidth > 0 ? rect.width / target.img.offsetWidth : 1;
      setBox({ left: rect.left, top: rect.top, width: rect.width, height: rect.height, zoom });
    };
    const loop = () => {
      place();
      frame = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(frame);
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

  const original = () => {
    const natural = { w: target.img.naturalWidth || Number(node.attrs.width) || 300, h: target.img.naturalHeight || Number(node.attrs.height) || 200 };
    const max = pageWidth();
    const scale = Math.min(1, max / natural.w);
    commit({ width: Math.round(natural.w * scale), height: Math.round(natural.h * scale) });
  };

  const wrap = String(node.attrs.wrap ?? "inline");
  const barTop = box.top + box.height + 8 + 44 > window.innerHeight ? Math.max(8, box.top - 52) : box.top + box.height + 8;
  return (
    <>
      <div className="ow-imgframe" role="group" aria-label={labels.frame} style={{ left: box.left, top: box.top, width: box.width, height: box.height }}>
        {HANDLES.map((handle) => (
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
      </div>
      <div className="ow-imgbar" role="toolbar" aria-label={labels.frame} style={{ left: Math.max(8, Math.min(window.innerWidth - 8 - 360, box.left)), top: barTop }} onMouseDown={(event) => event.preventDefault()}>
        {([["inline", labels.inline], ["square", labels.square], ["behind", labels.behind], ["front", labels.front]] as const).map(([value, label]) => (
          <button key={value} type="button" aria-pressed={wrap === value} onClick={() => commit({ wrap: value })}>{label}</button>
        ))}
        <button type="button" onClick={original}>{labels.original}</button>
        <button type="button" className="is-danger" onClick={() => editor.chain().focus().deleteSelection().run()}>{labels.remove}</button>
      </div>
    </>
  );
}
