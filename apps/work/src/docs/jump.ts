import type { Editor } from "@tiptap/core";

export type HeadingEntry = { text: string; level: number; pos: number };

export function headingEntries(editor: Editor): HeadingEntry[] {
  const entries: HeadingEntry[] = [];
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name !== "heading") return;
    const text = node.textContent.trim();
    if (!text) return;
    const level = Number(node.attrs.level);
    entries.push({ text, level: Number.isFinite(level) && level > 0 ? level : 1, pos });
  });
  return entries;
}

export function jumpToHeading(editor: Editor, index: number): void {
  const entry = headingEntries(editor)[index];
  if (!entry) return;
  const pos = Math.min(entry.pos + 1, entry.pos + entry.text.length);
  editor.chain().focus().setTextSelection(pos).run();
  const dom = editor.view.nodeDOM(entry.pos);
  if (dom instanceof HTMLElement) dom.scrollIntoView({ block: "center" });
}
