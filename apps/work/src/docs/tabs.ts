import type { JsonNode } from "./model";

/** Pestañas del documento (como Google Docs). Lista plana en orden de lectura; `depth` indica el anidado. */
export type DocTab = {
  id: string;
  title: string;
  depth: number;
  emoji?: string;
  collapsed?: boolean;
  hideOutline?: boolean;
  content?: JsonNode;
};

export const MAX_TAB_DEPTH = 4;
const EMPTY: JsonNode = { type: "doc", content: [{ type: "paragraph" }] };

export function emptyDoc(): JsonNode {
  return structuredClone(EMPTY);
}

export function tabId(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return `t.${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`;
}

function isNode(value: unknown): value is JsonNode {
  return typeof value === "object" && value !== null && typeof (value as JsonNode).type === "string";
}

/** Valida y normaliza lo que venga del archivo (anidado coherente, ids únicos, textos acotados). */
export function tabsOf(value: unknown, first: JsonNode, fallbackTitle: string): DocTab[] {
  const out: DocTab[] = [];
  const seen = new Set<string>();
  if (Array.isArray(value)) {
    for (const raw of value.slice(0, 200)) {
      if (typeof raw !== "object" || raw === null) continue;
      const entry = raw as Record<string, unknown>;
      let id = typeof entry.id === "string" && /^[\w.-]{1,40}$/.test(entry.id) ? entry.id : tabId();
      if (seen.has(id)) id = tabId();
      seen.add(id);
      const previous = out.at(-1);
      const maxDepth = previous ? Math.min(MAX_TAB_DEPTH, previous.depth + 1) : 0;
      const depth = Math.max(0, Math.min(maxDepth, Math.floor(Number(entry.depth) || 0)));
      const emoji = typeof entry.emoji === "string" && entry.emoji.length > 0 && entry.emoji.length <= 16 ? entry.emoji : undefined;
      const content = isNode(entry.content) && entry.content.type === "doc" ? entry.content : undefined;
      out.push({
        id,
        title: (typeof entry.title === "string" ? entry.title : "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, 120) || fallbackTitle,
        depth,
        ...(emoji ? { emoji } : {}),
        ...(entry.collapsed === true ? { collapsed: true } : {}),
        ...(entry.hideOutline === true ? { hideOutline: true } : {}),
        ...(content ? { content } : {}),
      });
    }
  }
  if (out.length === 0) out.push({ id: "t.0", title: fallbackTitle, depth: 0 });
  out[0] = { ...out[0]!, content: first };
  return out;
}

/** Índice final (exclusivo) del grupo de la pestaña: ella y todas sus subpestañas. */
export function subtreeEnd(tabs: readonly DocTab[], index: number): number {
  const depth = tabs[index]!?.depth ?? 0;
  let end = index + 1;
  while (end < tabs.length && tabs[end]!.depth > depth) end += 1;
  return end;
}

export function hasChildren(tabs: readonly DocTab[], index: number): boolean {
  return subtreeEnd(tabs, index) > index + 1;
}

/** Pestañas visibles (las de un grupo contraído se ocultan). */
export function visibleTabs(tabs: readonly DocTab[]): Array<{ tab: DocTab; index: number }> {
  const out: Array<{ tab: DocTab; index: number }> = [];
  let hideBelow = Infinity;
  tabs.forEach((tab, index) => {
    if (tab.depth > hideBelow) return;
    hideBelow = Infinity;
    out.push({ tab, index });
    if (tab.collapsed && hasChildren(tabs, index)) hideBelow = tab.depth;
  });
  return out;
}

export function parentIndex(tabs: readonly DocTab[], index: number): number {
  const depth = tabs[index]!?.depth ?? 0;
  for (let i = index - 1; i >= 0; i -= 1) if (tabs[i]!.depth < depth) return i;
  return -1;
}

export function nextTitle(tabs: readonly DocTab[], base: string): string {
  let n = tabs.length + 1;
  const names = new Set(tabs.map((tab) => tab.title));
  while (names.has(`${base} ${n}`)) n += 1;
  return `${base} ${n}`;
}

export function addTab(tabs: readonly DocTab[], title: string): { tabs: DocTab[]; id: string } {
  const id = tabId();
  return { tabs: [...tabs, { id, title, depth: 0, content: emptyDoc() }], id };
}

export function addSubtab(tabs: readonly DocTab[], index: number, title: string): { tabs: DocTab[]; id: string } {
  const id = tabId();
  const parent = tabs[index]!;
  const end = subtreeEnd(tabs, index);
  const next = tabs.map((tab, i) => (i === index ? { ...tab, collapsed: false } : tab));
  next.splice(end, 0, { id, title, depth: Math.min(MAX_TAB_DEPTH, parent.depth + 1), content: emptyDoc() });
  return { tabs: next, id };
}

export function removeTab(tabs: readonly DocTab[], index: number): DocTab[] {
  if (tabs.length <= 1) return [...tabs];
  const end = subtreeEnd(tabs, index);
  const removedAll = end - index >= tabs.length;
  if (removedAll) return [...tabs];
  const next = [...tabs.slice(0, index), ...tabs.slice(end)];
  if (next[0]!.depth !== 0) next[0] = { ...next[0]!, depth: 0 };
  return fixDepths(next);
}

export function duplicateTab(tabs: readonly DocTab[], index: number, copyLabel: (title: string) => string): { tabs: DocTab[]; id: string } {
  const end = subtreeEnd(tabs, index);
  const copies = tabs.slice(index, end).map((tab, i) => ({
    ...structuredClone(tab),
    id: tabId(),
    title: i === 0 ? copyLabel(tab.title) : tab.title,
  }));
  const next = [...tabs.slice(0, end), ...copies, ...tabs.slice(end)];
  return { tabs: next, id: copies[0]!.id };
}

export function patchTab(tabs: readonly DocTab[], index: number, patch: Partial<DocTab>): DocTab[] {
  return tabs.map((tab, i) => (i === index ? { ...tab, ...patch } : tab));
}

function fixDepths(tabs: DocTab[]): DocTab[] {
  return tabs.map((tab, i) => {
    const max = i === 0 ? 0 : Math.min(MAX_TAB_DEPTH, tabs[i - 1]!.depth + 1);
    return tab.depth > max ? { ...tab, depth: max } : tab;
  });
}

/** Hermana anterior/siguiente al mismo nivel dentro del mismo grupo. */
function sibling(tabs: readonly DocTab[], index: number, dir: -1 | 1): number {
  const depth = tabs[index]!.depth;
  if (dir > 0) {
    const end = subtreeEnd(tabs, index);
    return end < tabs.length && tabs[end]!.depth === depth ? end : -1;
  }
  for (let i = index - 1; i >= 0; i -= 1) {
    if (tabs[i]!.depth < depth) return -1;
    if (tabs[i]!.depth === depth) return i;
  }
  return -1;
}

export function canMove(tabs: readonly DocTab[], index: number, dir: -1 | 1): boolean {
  return sibling(tabs, index, dir) >= 0;
}

export function moveTab(tabs: readonly DocTab[], index: number, dir: -1 | 1): DocTab[] {
  const other = sibling(tabs, index, dir);
  if (other < 0) return [...tabs];
  const [a, b] = dir < 0 ? [other, index] : [index, other];
  const first = tabs.slice(a, subtreeEnd(tabs, a));
  const second = tabs.slice(b, subtreeEnd(tabs, b));
  return [...tabs.slice(0, a), ...second, ...first, ...tabs.slice(b + second.length)];
}

/** Mueve el grupo de `index` para que quede en la posición `to` (índice en la lista sin el grupo) con profundidad `depth`. */
export function placeTab(tabs: readonly DocTab[], index: number, to: number, depth: number): DocTab[] {
  const end = subtreeEnd(tabs, index);
  const group = tabs.slice(index, end);
  const rest = [...tabs.slice(0, index), ...tabs.slice(end)];
  const at = Math.max(0, Math.min(rest.length, to));
  const above = rest[at - 1]!;
  const below = rest[at]!;
  const maxDepth = above ? Math.min(MAX_TAB_DEPTH, above.depth + 1) : 0;
  const minDepth = below ? below.depth - (below.depth > 0 ? 1 : 0) : 0;
  const wanted = Math.max(Math.min(minDepth, maxDepth), Math.min(maxDepth, Math.max(0, depth)));
  const shift = wanted - group[0]!.depth;
  const moved = group.map((tab) => ({ ...tab, depth: Math.min(MAX_TAB_DEPTH, Math.max(0, tab.depth + shift)) }));
  return fixDepths([...rest.slice(0, at), ...moved, ...rest.slice(at)]);
}

/** Destinos de «Mover a»: pestañas que no son la propia ni sus subpestañas, ni su grupo actual. */
export function moveTargets(tabs: readonly DocTab[], index: number): number[] {
  const end = subtreeEnd(tabs, index);
  const parent = parentIndex(tabs, index);
  return tabs.flatMap((tab, i) => (i >= index && i < end) || i === parent || tab.depth >= MAX_TAB_DEPTH ? [] : [i]);
}

/** Lo convierte en la última subpestaña de `target`. */
export function moveInto(tabs: readonly DocTab[], index: number, target: number): DocTab[] {
  const id = tabs[target]!.id;
  const end = subtreeEnd(tabs, index);
  const rest = [...tabs.slice(0, index), ...tabs.slice(end)];
  const t = rest.findIndex((tab) => tab.id === id);
  const at = subtreeEnd(rest, t);
  const opened = rest.map((tab, i) => (i === t ? { ...tab, collapsed: false } : tab));
  const groupLen = end - index;
  const placed = placeTab([...opened.slice(0, at), ...tabs.slice(index, end), ...opened.slice(at)], at, at, rest[t]!.depth + 1);
  void groupLen;
  return placed;
}

/** «Sacar del grupo»: pasa a ser hermana de su grupo, justo después de él. */
export function moveOut(tabs: readonly DocTab[], index: number): DocTab[] {
  const parent = parentIndex(tabs, index);
  if (parent < 0) return [...tabs];
  const parentEnd = subtreeEnd(tabs, parent);
  const end = subtreeEnd(tabs, index);
  const to = parentEnd - (end - index);
  return placeTab(tabs, index, to, tabs[parent]!.depth);
}

export function tabLabel(tab: DocTab): string {
  return tab.emoji ? `${tab.emoji} ${tab.title}` : tab.title;
}

/** Un solo documento para exportar: cada pestaña con su título y un salto de página entre ellas. */
export function combinedContent(tabs: readonly DocTab[]): JsonNode {
  if (tabs.length <= 1) return tabs[0]!?.content ?? emptyDoc();
  const content: JsonNode[] = [];
  tabs.forEach((tab, i) => {
    if (i > 0) content.push({ type: "pageBreak" });
    content.push({ type: "heading", attrs: { level: Math.min(3, tab.depth + 1) }, content: [{ type: "text", text: tabLabel(tab) }] });
    content.push(...(tab.content?.content ?? []));
  });
  return { type: "doc", content };
}
