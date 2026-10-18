import type { Editor } from "@tiptap/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { MessageKey } from "../i18n";
import { createId } from "../security/names";
import type { DocComment } from "./model";

/**
 * Comentarios en el margen derecho, a la altura del texto comentado, como en Google Docs.
 * Cada tarjeta muestra autor, fecha, texto y respuestas; se puede responder, resolver, reabrir y borrar.
 * En pantallas estrechas las tarjetas van en lista bajo el documento.
 */

type T = (key: MessageKey) => string;
const GAP = 8;

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]!.toUpperCase()).join("") || "?";
}

function when(value: string, locale: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function CommentsRail({ editor, comments, t, locale, narrow, onChange }: {
  editor: Editor | null;
  comments: DocComment[];
  t: T;
  locale: string;
  narrow: boolean;
  onChange: (next: DocComment[]) => void;
}) {
  const railRef = useRef<HTMLDivElement>(null);
  const [tops, setTops] = useState<Record<string, number>>({});
  const [active, setActive] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [tick, setTick] = useState(0);

  // Recalcula la altura de cada tarjeta cuando cambia el documento o el tamaño de la hoja.
  useEffect(() => {
    if (!editor) return;
    const bump = () => setTick((value) => value + 1);
    editor.on("update", bump);
    editor.on("transaction", bump);
    window.addEventListener("resize", bump);
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(bump) : null;
    observer?.observe(editor.view.dom);
    const onClick = (event: MouseEvent) => {
      const mark = event.target instanceof HTMLElement ? event.target.closest<HTMLElement>(".ow-cmt[data-cid]") : null;
      if (mark) setActive(mark.dataset.cid ?? null);
    };
    editor.view.dom.addEventListener("click", onClick);
    return () => {
      editor.off("update", bump);
      editor.off("transaction", bump);
      window.removeEventListener("resize", bump);
      observer?.disconnect();
      editor.view.dom.removeEventListener("click", onClick);
    };
  }, [editor]);

  useLayoutEffect(() => {
    if (!editor || narrow) return;
    const rail = railRef.current;
    if (!rail) return;
    const base = rail.getBoundingClientRect();
    const scale = rail.offsetHeight > 0 && base.height > 0 ? base.height / rail.offsetHeight : 1;
    const resolved = new Set(comments.filter((comment) => comment.resolved).map((comment) => comment.id));
    editor.view.dom.querySelectorAll<HTMLElement>(".ow-cmt[data-cid]").forEach((mark) => {
      const id = mark.dataset.cid ?? "";
      mark.classList.toggle("is-resolved", resolved.has(id));
      mark.classList.toggle("is-active", id === active);
    });
    const wanted = comments.map((comment) => {
      const mark = editor.view.dom.querySelector<HTMLElement>(`.ow-cmt[data-cid="${CSS.escape(comment.id)}"]`);
      const top = mark ? (mark.getBoundingClientRect().top - base.top) / scale : Number.POSITIVE_INFINITY;
      return { id: comment.id, top };
    });
    const ordered = [...wanted].sort((a, b) => a.top - b.top);
    const next: Record<string, number> = {};
    let floor = 0;
    let fallback = 0;
    for (const item of ordered) {
      const card = rail.querySelector<HTMLElement>(`[data-card="${CSS.escape(item.id)}"]`);
      const height = card?.offsetHeight ?? 80;
      const desired = Number.isFinite(item.top) ? item.top : fallback;
      const top = Math.max(desired, floor);
      next[item.id] = top;
      floor = top + height + GAP;
      fallback = floor;
    }
    // La tarjeta activa se coloca junto a su texto y las demás se apartan.
    if (active && next[active] !== undefined) {
      const target = wanted.find((item) => item.id === active)?.top;
      if (target !== undefined && Number.isFinite(target) && next[active]! > target) {
        const shift = next[active]! - target;
        for (const item of ordered) {
          next[item.id] = next[item.id]! - shift;
          if (item.id === active) break;
        }
      }
    }
    const changed = Object.keys(next).length !== Object.keys(tops).length || Object.entries(next).some(([id, top]) => Math.abs((tops[id] ?? -1) - top) > 0.5);
    if (changed) setTops(next);
  }, [editor, comments, active, tick, narrow, tops]);

  if (!editor || comments.length === 0) return null;

  const update = (id: string, patch: (comment: DocComment) => DocComment | null) => {
    const next = comments.flatMap((comment) => {
      if (comment.id !== id) return [comment];
      const changed = patch(comment);
      return changed ? [changed] : [];
    });
    onChange(next);
  };

  const removeMarks = (id: string) => {
    const type = editor.schema.marks.comment;
    if (!type) return;
    const tr = editor.state.tr;
    editor.state.doc.descendants((node, pos) => {
      if (!node.isText) return;
      for (const mark of node.marks) if (mark.type === type && mark.attrs.id === id) tr.removeMark(pos, pos + node.nodeSize, mark);
    });
    if (tr.steps.length > 0) editor.view.dispatch(tr);
  };

  const focusAnchor = (id: string) => {
    setActive(id);
    let target: number | null = null;
    editor.state.doc.descendants((node, pos) => {
      if (target !== null) return false;
      if (node.isText && node.marks.some((mark) => mark.type.name === "comment" && mark.attrs.id === id)) target = pos;
      return undefined;
    });
    if (target !== null) editor.chain().setTextSelection(target).scrollIntoView().run();
  };

  const cards = comments.map((comment) => {
    const author = comment.author || t("commentYou");
    const reply = drafts[comment.id] ?? "";
    return (
      <article
        key={comment.id}
        data-card={comment.id}
        className={`ow-cmt-card${active === comment.id ? " is-active" : ""}`}
        style={narrow ? undefined : { top: tops[comment.id] ?? 0 }}
        aria-label={`${t("comment")}: ${author}`}
        onClick={() => focusAnchor(comment.id)}
      >
        <header>
          <span className="ow-cmt-avatar" aria-hidden="true">{initials(author)}</span>
          <strong>{author}<time dateTime={comment.createdAt}>{when(comment.createdAt, locale)}</time></strong>
          {comment.resolved ? null : (
            <button type="button" aria-label={t("commentResolve")} title={t("commentResolve")} onClick={(event) => { event.stopPropagation(); update(comment.id, (c) => ({ ...c, resolved: true })); }}>✓</button>
          )}
          <button type="button" aria-label={t("commentDelete")} title={t("commentDelete")} onClick={(event) => { event.stopPropagation(); removeMarks(comment.id); update(comment.id, () => null); }}>×</button>
        </header>
        {comment.quote ? <p className="ow-cmt-quote">{comment.quote}</p> : null}
        <p>{comment.body}</p>
        {(comment.replies ?? []).map((item) => (
          <div key={item.id} className="ow-cmt-reply">
            <header>
              <span className="ow-cmt-avatar" aria-hidden="true">{initials(item.author || t("commentYou"))}</span>
              <strong>{item.author || t("commentYou")}<time dateTime={item.createdAt}>{when(item.createdAt, locale)}</time></strong>
            </header>
            <p>{item.body}</p>
          </div>
        ))}
        {comment.resolved ? (
          <p className="ow-cmt-resolved">
            {t("commentResolved")} · <button type="button" onClick={(event) => { event.stopPropagation(); update(comment.id, (c) => ({ ...c, resolved: false })); }}>{t("commentReopen")}</button>
          </p>
        ) : (
          <form onClick={(event) => event.stopPropagation()} onSubmit={(event) => {
            event.preventDefault();
            const body = reply.trim().slice(0, 2000);
            if (!body) return;
            update(comment.id, (c) => ({ ...c, replies: [...(c.replies ?? []), { id: createId(), body, createdAt: new Date().toISOString() }] }));
            setDrafts((value) => ({ ...value, [comment.id]: "" }));
          }}>
            <input aria-label={t("commentReply")} placeholder={t("commentReply")} value={reply} maxLength={2000} onChange={(event) => setDrafts((value) => ({ ...value, [comment.id]: event.target.value }))} />
            <button type="submit" className="is-primary">{t("commentSend")}</button>
          </form>
        )}
      </article>
    );
  });

  if (narrow) {
    return (
      <section aria-label={t("commentsTitle")}>
        <ul className="ow-cmt-list">{cards.map((card) => <li key={card.key}>{card}</li>)}</ul>
      </section>
    );
  }
  return (
    <aside ref={railRef} className="ow-cmt-rail" aria-label={t("commentsTitle")}>
      {cards}
    </aside>
  );
}
