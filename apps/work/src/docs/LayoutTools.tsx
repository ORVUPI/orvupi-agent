import { NodeSelection, TextSelection } from "@tiptap/pm/state";
import type { Editor } from "@tiptap/react";
import { useEffect, useState } from "react";
import type { MessageKey } from "../i18n";
import { SHAPES, WRAPS, clampNum, safeWrap, sectionRangeInfo, type ShapeKind, type Wrap } from "./layout-nodes";

/**
 * Herramientas de maquetación de Docs: insertar cuadros de texto y formas, ajuste de texto y
 * desplazamiento de imágenes y formas, columnas y orientación de sección, notas finales y
 * edición de notas al pulsar su número.
 */

type T = (key: MessageKey) => string;
type Dialog =
  | { kind: "shape"; shape: ShapeKind; text: string; fill: string; wrap: Wrap }
  | { kind: "object"; pos: number; type: string; wrap: Wrap; align: string; offsetX: number; offsetY: number; width: number; height: number; fill: string; stroke: string }
  | { kind: "section"; columns: number; orientation: string; margin: string; breakType: string; inside: boolean }
  | { kind: "endnote"; text: string }
  | { kind: "note"; pos: number; text: string; end: boolean };

const WRAP_KEY: Record<Wrap, MessageKey> = { inline: "wrapInline", square: "wrapSquare", topBottom: "wrapTopBottom", behind: "wrapBehind", front: "wrapFront" };
const SHAPE_KEY: Record<ShapeKind, MessageKey> = { textbox: "shapeTextbox", rect: "shapeRect", roundRect: "shapeRound", ellipse: "shapeEllipse" };

function selectedObject(editor: Editor): { pos: number; node: NodeSelection["node"] } | null {
  const selection = editor.state.selection;
  if (selection instanceof NodeSelection && (selection.node.type.name === "image" || selection.node.type.name === "docShape")) return { pos: selection.from, node: selection.node };
  return null;
}

export function LayoutTools({ editor, t }: { editor: Editor | null; t: T }) {
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!editor) return;
    const onAction = (event: Event) => {
      const action = (event as CustomEvent<{ action: string }>).detail?.action;
      setNote("");
      if (action === "textbox" || action === "shape") {
        setDialog({ kind: "shape", shape: action === "textbox" ? "textbox" : "rect", text: "", fill: action === "textbox" ? "none" : "#ffd7e5", wrap: "square" });
      } else if (action === "object") {
        const found = selectedObject(editor);
        if (!found) {
          setNote(t("selectObjectFirst"));
          setDialog(null);
          window.setTimeout(() => setNote(""), 3000);
          return;
        }
        const a = found.node.attrs;
        setDialog({ kind: "object", pos: found.pos, type: found.node.type.name, wrap: safeWrap(a.wrap), align: String(a.align ?? "left"), offsetX: Number(a.offsetX) || 0, offsetY: Number(a.offsetY) || 0, width: Number(a.width) || 0, height: Number(a.height) || 0, fill: String(a.fill ?? "none"), stroke: String(a.stroke ?? "#102032") });
      } else if (action === "section" || action === "sectionBreak") {
        const info = sectionRangeInfo(editor.state.doc, editor.state.selection.from);
        const a = info?.node.attrs;
        setDialog({ kind: "section", columns: Number(a?.columns ?? (action === "sectionBreak" ? 1 : 2)), orientation: String(a?.orientation ?? "portrait"), margin: String(a?.margin ?? "normal"), breakType: String(a?.breakType ?? (action === "sectionBreak" ? "nextPage" : "continuous")), inside: Boolean(info) });
      } else if (action === "endnote") {
        setDialog({ kind: "endnote", text: "" });
      }
    };
    const onNoteClick = (event: MouseEvent) => {
      const target = event.target instanceof HTMLElement ? event.target.closest<HTMLElement>("sup.ow-fn") : null;
      if (!target || !editor.view.dom.contains(target)) return;
      const pos = editor.view.posAtDOM(target, 0);
      const node = editor.state.doc.nodeAt(pos);
      if (!node || node.type.name !== "footnote") return;
      setDialog({ kind: "note", pos, text: String(node.attrs.text ?? ""), end: node.attrs.kind === "end" });
    };
    window.addEventListener("ow-layout", onAction);
    editor.view.dom.addEventListener("dblclick", onNoteClick);
    editor.view.dom.addEventListener("click", onNoteClick);
    return () => {
      window.removeEventListener("ow-layout", onAction);
      editor.view.dom.removeEventListener("dblclick", onNoteClick);
      editor.view.dom.removeEventListener("click", onNoteClick);
    };
  }, [editor, t]);

  useEffect(() => {
    if (!dialog) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDialog(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dialog]);

  if (!editor) return null;
  const close = () => setDialog(null);

  const insertBlock = (content: Record<string, unknown>) => {
    const { state } = editor;
    const selection = state.selection;
    let at = selection instanceof NodeSelection ? selection.to : selection.$from.depth > 0 ? selection.$from.before(1) : selection.from;
    // Un objeto anclado va antes del párrafo para que el texto lo rodee; uno en línea, después.
    if (!(selection instanceof NodeSelection) && content.attrs && (content.attrs as { wrap?: string }).wrap === "inline" && selection.$from.depth > 0) at = selection.$from.after(1);
    editor.chain().focus().insertContentAt(at, content).run();
  };

  const applySection = (attrs: Record<string, unknown>, remove = false) => {
    const { state } = editor;
    const info = sectionRangeInfo(state.doc, state.selection.from);
    const tr = state.tr;
    const type = state.schema.nodes.section;
    if (!type) return;
    if (info) {
      if (remove) {
        tr.replaceWith(info.pos, info.pos + info.node.nodeSize, info.node.content);
      } else tr.setNodeMarkup(info.pos, undefined, { ...info.node.attrs, ...attrs });
    } else if (!remove) {
      // Sin sección: la selección (o desde el párrafo actual hasta el final) pasa a ser una sección nueva.
      const $from = state.selection.$from;
      const $to = state.selection.empty ? state.doc.resolve(state.doc.content.size) : state.selection.$to;
      const start = $from.depth > 0 ? $from.before(1) : 0;
      const end = state.selection.empty ? state.doc.content.size : $to.depth > 0 ? $to.after(1) : state.doc.content.size;
      const slice = state.doc.slice(start, end).content;
      const blocks: Array<NonNullable<ReturnType<typeof state.doc.nodeAt>>> = [];
      slice.forEach((child) => {
        if (child.type.name === "section") child.forEach((inner) => { blocks.push(inner); });
        else blocks.push(child);
      });
      if (blocks.length === 0) return;
      const section = type.create(attrs, blocks);
      tr.replaceWith(start, end, section);
      tr.setSelection(TextSelection.near(tr.doc.resolve(Math.min(start + 2, tr.doc.content.size))));
    }
    editor.view.dispatch(tr.scrollIntoView());
    editor.commands.focus();
  };

  return (
    <>
      {note ? <p className="ow-toast" role="status">{note}</p> : null}
      {dialog?.kind === "shape" ? (
        <form className="ow-doc-dialog ow-obj-dialog" role="dialog" aria-label={dialog.shape === "textbox" ? t("textBox") : t("shapeInsert")} onSubmit={(event) => {
          event.preventDefault();
          const box = dialog.shape === "textbox";
          insertBlock({ type: "docShape", attrs: { shape: dialog.shape, text: dialog.text.slice(0, 4000), width: box ? 240 : 200, height: box ? 96 : 110, fill: dialog.fill, stroke: box ? "#102032" : "#1d4e89", wrap: dialog.wrap } });
          close();
        }}>
          <div className="ow-obj-grid">
            <label>{t("shapeKind")}<select value={dialog.shape} onChange={(event) => setDialog({ ...dialog, shape: event.target.value as ShapeKind })}>{SHAPES.map((shape) => <option key={shape} value={shape}>{t(SHAPE_KEY[shape])}</option>)}</select></label>
            <label>{t("wrapLabel")}<select value={dialog.wrap} onChange={(event) => setDialog({ ...dialog, wrap: safeWrap(event.target.value) })}>{WRAPS.map((wrap) => <option key={wrap} value={wrap}>{t(WRAP_KEY[wrap])}</option>)}</select></label>
            <label>{t("objFill")}<input type="color" value={dialog.fill === "none" ? "#ffffff" : dialog.fill} onChange={(event) => setDialog({ ...dialog, fill: event.target.value })} /></label>
            <label><span>{t("objNoFill")}</span><input type="checkbox" checked={dialog.fill === "none"} onChange={(event) => setDialog({ ...dialog, fill: event.target.checked ? "none" : "#ffd7e5" })} /></label>
          </div>
          <label>{t("shapeText")}<input aria-label={t("shapeText")} value={dialog.text} maxLength={4000} onChange={(event) => setDialog({ ...dialog, text: event.target.value })} /></label>
          <button type="submit">{t("insertAction")}</button>
          <button type="button" onClick={close}>{t("cancel")}</button>
        </form>
      ) : null}
      {dialog?.kind === "object" ? (
        <form className="ow-doc-dialog ow-obj-dialog" role="dialog" aria-label={t("objectWrap")} onSubmit={(event) => {
          event.preventDefault();
          const node = editor.state.doc.nodeAt(dialog.pos);
          if (!node) return close();
          const attrs: Record<string, unknown> = { ...node.attrs, wrap: dialog.wrap, align: dialog.align, offsetX: clampNum(dialog.offsetX, -2000, 2000, 0), offsetY: clampNum(dialog.offsetY, -2000, 2000, 0) };
          if (dialog.width > 0) attrs.width = clampNum(dialog.width, 16, 1600, 240);
          if (dialog.height > 0) attrs.height = clampNum(dialog.height, 16, 2400, 96);
          if (dialog.type === "docShape") {
            attrs.fill = dialog.fill;
            attrs.stroke = dialog.stroke;
          }
          const tr = editor.state.tr.setNodeMarkup(dialog.pos, undefined, attrs);
          tr.setSelection(NodeSelection.create(tr.doc, dialog.pos));
          editor.view.dispatch(tr);
          close();
        }}>
          <div className="ow-obj-grid">
            <label>{t("wrapLabel")}<select aria-label={t("wrapLabel")} value={dialog.wrap} onChange={(event) => setDialog({ ...dialog, wrap: safeWrap(event.target.value) })}>{WRAPS.map((wrap) => <option key={wrap} value={wrap}>{t(WRAP_KEY[wrap])}</option>)}</select></label>
            <label>{t("objAlign")}<select aria-label={t("objAlign")} value={dialog.align} onChange={(event) => setDialog({ ...dialog, align: event.target.value })}><option value="left">{t("alignLeft")}</option><option value="center">{t("alignCenter")}</option><option value="right">{t("alignRight")}</option></select></label>
            <label>{t("offsetX")}<input aria-label={t("offsetX")} type="number" value={dialog.offsetX} onChange={(event) => setDialog({ ...dialog, offsetX: Number(event.target.value) })} /></label>
            <label>{t("offsetY")}<input aria-label={t("offsetY")} type="number" value={dialog.offsetY} onChange={(event) => setDialog({ ...dialog, offsetY: Number(event.target.value) })} /></label>
            <label>{t("objWidth")}<input aria-label={t("objWidth")} type="number" min={16} value={dialog.width || ""} onChange={(event) => setDialog({ ...dialog, width: Number(event.target.value) })} /></label>
            <label>{t("objHeight")}<input aria-label={t("objHeight")} type="number" min={16} value={dialog.height || ""} onChange={(event) => setDialog({ ...dialog, height: Number(event.target.value) })} /></label>
            {dialog.type === "docShape" ? (
              <>
                <label>{t("objFill")}<input type="color" value={dialog.fill === "none" ? "#ffffff" : dialog.fill} onChange={(event) => setDialog({ ...dialog, fill: event.target.value })} /></label>
                <label>{t("objStroke")}<input type="color" value={dialog.stroke === "none" ? "#ffffff" : dialog.stroke} onChange={(event) => setDialog({ ...dialog, stroke: event.target.value })} /></label>
              </>
            ) : null}
          </div>
          <button type="submit">{t("apply")}</button>
          <button type="button" onClick={close}>{t("cancel")}</button>
        </form>
      ) : null}
      {dialog?.kind === "section" ? (
        <form className="ow-doc-dialog ow-obj-dialog" role="dialog" aria-label={t("sectionSetup")} onSubmit={(event) => {
          event.preventDefault();
          applySection({ columns: clampNum(dialog.columns, 1, 3, 1), orientation: dialog.orientation === "landscape" ? "landscape" : "portrait", margin: dialog.margin, breakType: dialog.breakType === "continuous" ? "continuous" : "nextPage" });
          close();
        }}>
          <div className="ow-obj-grid">
            <label>{t("sectionColumns")}<select aria-label={t("sectionColumns")} value={dialog.columns} onChange={(event) => setDialog({ ...dialog, columns: Number(event.target.value) })}>{[1, 2, 3].map((n) => <option key={n} value={n}>{n}</option>)}</select></label>
            <label>{t("sectionOrientation")}<select aria-label={t("sectionOrientation")} value={dialog.orientation} onChange={(event) => setDialog({ ...dialog, orientation: event.target.value })}><option value="portrait">{t("orientPortrait")}</option><option value="landscape">{t("orientLandscape")}</option></select></label>
            <label>{t("sectionMargin")}<select aria-label={t("sectionMargin")} value={dialog.margin} onChange={(event) => setDialog({ ...dialog, margin: event.target.value })}><option value="normal">{t("marginNormal")}</option><option value="narrow">{t("marginNarrow")}</option><option value="wide">{t("marginWide")}</option></select></label>
            <label>{t("sectionStart")}<select aria-label={t("sectionStart")} value={dialog.breakType} onChange={(event) => setDialog({ ...dialog, breakType: event.target.value })}><option value="nextPage">{t("sectionNextPage")}</option><option value="continuous">{t("sectionContinuous")}</option></select></label>
          </div>
          <button type="submit">{t("apply")}</button>
          {dialog.inside ? <button type="button" onClick={() => { applySection({}, true); close(); }}>{t("sectionRemove")}</button> : null}
          <button type="button" onClick={close}>{t("cancel")}</button>
        </form>
      ) : null}
      {dialog?.kind === "endnote" ? (
        <form className="ow-doc-dialog" role="dialog" aria-label={t("endnote")} onSubmit={(event) => {
          event.preventDefault();
          if (!dialog.text.trim()) return;
          editor.chain().focus().insertContent({ type: "footnote", attrs: { n: 1, kind: "end", text: dialog.text.trim().slice(0, 2000) } }).run();
          close();
        }}>
          <label>{t("endnoteLabel")}<input aria-label={t("endnoteLabel")} value={dialog.text} maxLength={2000} onChange={(event) => setDialog({ ...dialog, text: event.target.value })} /></label>
          <button type="submit">{t("footnoteAdd")}</button>
          <button type="button" onClick={close}>{t("cancel")}</button>
        </form>
      ) : null}
      {dialog?.kind === "note" ? (
        <form className="ow-doc-dialog" role="dialog" aria-label={t("noteEdit")} onSubmit={(event) => {
          event.preventDefault();
          const node = editor.state.doc.nodeAt(dialog.pos);
          if (node?.type.name === "footnote") editor.view.dispatch(editor.state.tr.setNodeMarkup(dialog.pos, undefined, { ...node.attrs, text: dialog.text.trim().slice(0, 2000) }));
          close();
        }}>
          <label>{dialog.end ? t("endnoteLabel") : t("footnoteLabel")}<input aria-label={t("noteEdit")} value={dialog.text} maxLength={2000} onChange={(event) => setDialog({ ...dialog, text: event.target.value })} /></label>
          <button type="submit">{t("apply")}</button>
          <button type="button" onClick={() => {
            const node = editor.state.doc.nodeAt(dialog.pos);
            if (node?.type.name === "footnote") editor.view.dispatch(editor.state.tr.delete(dialog.pos, dialog.pos + node.nodeSize));
            close();
          }}>{t("noteDelete")}</button>
          <button type="button" onClick={close}>{t("cancel")}</button>
        </form>
      ) : null}
    </>
  );
}
