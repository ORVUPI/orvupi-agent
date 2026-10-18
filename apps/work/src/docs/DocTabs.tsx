import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import { Dialog } from "../ui/overlay";
import type { MessageKey } from "../i18n/messages";
import {
  addSubtab, addTab, canMove, duplicateTab, hasChildren, moveInto, moveOut, moveTab, moveTargets, nextTitle,
  parentIndex, patchTab, placeTab, removeTab, subtreeEnd, tabLabel, visibleTabs, MAX_TAB_DEPTH, type DocTab,
} from "./tabs";

type Translate = (key: MessageKey, vars?: Record<string, string | number>) => string;

const EMOJIS = ["📄", "📝", "📌", "📎", "📊", "📈", "📅", "✅", "⭐", "🔥", "💡", "🎯", "🚀", "🧭", "🗂️", "📚", "🧪", "🛠️", "⚖️", "🏥", "💬", "❤️", "😀", "🎉", "🌍", "🔒", "💰", "🧩", "🎨", "🎵", "📷", "🧠"];
const INDENT = 16;

export function tabLink(id: string): string {
  const url = new URL(window.location.href);
  url.hash = `tab=${encodeURIComponent(id)}`;
  return url.toString();
}

export function tabFromHash(): string | null {
  const match = /(?:^#|&)tab=([^&]+)/.exec(window.location.hash);
  return match ? decodeURIComponent(match[1] ?? "") : null;
}

type Heading = { text: string; level: number };

type Drag = { index: number; pointer: number; startX: number; startY: number; active: boolean; to: number; depth: number; line: { top: number; left: number } | null };

export function DocTabs({
  t,
  tabs,
  activeId,
  headings,
  narrow,
  onSelect,
  onChange,
  onJump,
  onHide,
  snapshot,
}: {
  t: Translate;
  tabs: DocTab[];
  activeId: string;
  headings: Heading[];
  narrow: boolean;
  onSelect: (id: string) => void;
  onChange: (tabs: DocTab[], select?: string, keepOpen?: boolean) => void;
  onJump: (index: number) => void;
  onHide: () => void;
  snapshot?: () => DocTab[];
}) {
  const [menu, setMenu] = useState<{ index: number; x: number; y: number; sub: "move" | "emoji" | null } | null>(null);
  const [renaming, setRenaming] = useState<{ id: string; value: string } | null>(null);
  const [confirm, setConfirm] = useState<number | null>(null);
  const [undo, setUndo] = useState<{ tabs: DocTab[]; active: string; title: string } | null>(null);
  const [note, setNote] = useState("");
  const [drag, setDrag] = useState<Drag | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const pressRef = useRef<number | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const suppressClick = useRef(false);

  const shown = visibleTabs(tabs);
  const activeIndex = Math.max(0, tabs.findIndex((tab) => tab.id === activeId));

  useEffect(() => {
    if (!undo) return;
    const timer = window.setTimeout(() => setUndo(null), 10_000);
    return () => window.clearTimeout(timer);
  }, [undo]);
  useEffect(() => {
    if (!note) return;
    const timer = window.setTimeout(() => setNote(""), 3000);
    return () => window.clearTimeout(timer);
  }, [note]);

  // Menú: foco en la primera opción, flechas, Escape y clic fuera.
  useLayoutEffect(() => {
    if (!menu) return;
    const root = menuRef.current;
    if (root) {
      const rect = root.getBoundingClientRect();
      const x = Math.max(4, Math.min(menu.x, window.innerWidth - rect.width - 4));
      const y = Math.max(4, Math.min(menu.y, window.innerHeight - rect.height - 4));
      root.style.left = `${x}px`;
      root.style.top = `${y}px`;
      root.querySelector<HTMLElement>("[role=menuitem]:not([disabled])")?.focus({ preventScroll: true });
    }
    const onDown = (event: PointerEvent) => {
      if (menuRef.current?.contains(event.target as Node)) return;
      setMenu(null);
    };
    window.addEventListener("pointerdown", onDown, true);
    return () => window.removeEventListener("pointerdown", onDown, true);
  }, [menu]);

  function focusRow(id: string) {
    window.requestAnimationFrame(() => listRef.current?.querySelector<HTMLElement>(`[data-tab-id="${CSS.escape(id)}"] .ow-tab-main`)?.focus({ preventScroll: true }));
  }

  function closeMenu(focus = true) {
    const index = menu?.index;
    setMenu(null);
    if (focus && index !== undefined && tabs[index]) focusRow(tabs[index].id);
  }

  function openMenu(index: number, anchor: { x: number; y: number }) {
    setMenu({ index, x: anchor.x, y: anchor.y, sub: null });
  }

  function apply(next: DocTab[], select?: string, keepOpen = false) {
    onChange(next, select, keepOpen);
    if (select) focusRow(select);
  }

  const act = {
    add() {
      const { tabs: next, id } = addTab(tabs, nextTitle(tabs, t("tabDefault")));
      apply(next, id);
    },
    sub(index: number) {
      const { tabs: next, id } = addSubtab(tabs, index, nextTitle(tabs, t("tabDefault")));
      apply(next, id);
    },
    remove(index: number) {
      const tab = tabs[index];
      if (!tab) return;
      const end = subtreeEnd(tabs, index);
      const next = removeTab(tabs, index);
      if (next.length === tabs.length) return;
      const removedActive = activeIndex >= index && activeIndex < end;
      const select = removedActive ? (next[Math.min(index, next.length - 1)] ?? next[0])!.id : activeId;
      setUndo({ tabs: snapshot ? snapshot() : tabs, active: activeId, title: tab.title });
      apply(next, removedActive ? select : undefined, true);
    },
    duplicate(index: number) {
      const { tabs: next, id } = duplicateTab(tabs, index, (title) => t("tabCopyOf", { name: title }));
      apply(next, id);
    },
  };

  function toggleCollapse(index: number) {
    const tab = tabs[index];
    if (!tab) return;
    onChange(patchTab(tabs, index, { collapsed: !tab.collapsed }));
  }

  function commitRename() {
    if (!renaming) return;
    const index = tabs.findIndex((tab) => tab.id === renaming.id);
    const value = renaming.value.replace(/[\u0000-\u001f]/g, " ").trim().slice(0, 120);
    setRenaming(null);
    if (index >= 0 && value) onChange(patchTab(tabs, index, { title: value }));
    focusRow(renaming.id);
  }

  async function copyLink(index: number) {
    const tab = tabs[index];
    if (!tab) return;
    const link = tabLink(tab.id);
    try {
      await navigator.clipboard.writeText(link);
      setNote(t("tabLinkCopied"));
    } catch {
      window.prompt(t("tabCopyLink"), link);
    }
  }

  // ---- Arrastrar y soltar (ratón: al moverse; táctil: pulsación larga) ----
  function rowsGeometry() {
    const list = listRef.current;
    if (!list) return [];
    return Array.from(list.querySelectorAll<HTMLElement>("[data-tab-index]")).map((row) => ({ index: Number(row.dataset.tabIndex), rect: row.getBoundingClientRect() }));
  }

  function updateDrag(state: Drag, x: number, y: number): Drag {
    const rows = rowsGeometry().filter((row) => row.index < state.index || row.index >= subtreeEnd(tabs, state.index));
    const list = listRef.current?.getBoundingClientRect();
    if (!list) return state;
    // Posición en la lista sin el grupo arrastrado
    let slot = rows.length;
    for (let i = 0; i < rows.length; i += 1) {
      const rect = rows[i]!.rect;
      if (y < rect.top + rect.height / 2) { slot = i; break; }
    }
    const restIndex = (rowIdx: number) => {
      const original = rows[rowIdx]?.index;
      if (original === undefined) return tabs.length - (subtreeEnd(tabs, state.index) - state.index);
      return original > state.index ? original - (subtreeEnd(tabs, state.index) - state.index) : original;
    };
    const to = slot < rows.length ? restIndex(slot) : tabs.length - (subtreeEnd(tabs, state.index) - state.index);
    const above = slot > 0 ? tabs[rows[slot - 1]!.index] : undefined;
    const base = tabs[state.index]!.depth;
    const wanted = base + Math.round((x - state.startX) / (INDENT * 1.5));
    const maxDepth = above ? Math.min(MAX_TAB_DEPTH, above.depth + 1) : 0;
    const depth = Math.max(0, Math.min(maxDepth, wanted));
    const lineTop = slot < rows.length ? rows[slot]!.rect.top : (rows.at(-1)?.rect.bottom ?? list.top);
    return { ...state, to, depth, line: { top: lineTop - list.top + (listRef.current?.scrollTop ?? 0), left: 8 + depth * INDENT } };
  }

  function onRowPointerDown(event: ReactPointerEvent<HTMLElement>, index: number) {
    if (event.button !== 0 || renaming) return;
    const state: Drag = { index, pointer: event.pointerId, startX: event.clientX, startY: event.clientY, active: false, to: index, depth: tabs[index]!.depth, line: null };
    dragRef.current = state;
    if (event.pointerType !== "mouse") {
      pressRef.current = window.setTimeout(() => {
        const current = dragRef.current;
        if (!current || current.pointer !== state.pointer) return;
        current.active = true;
        suppressClick.current = true;
        navigator.vibrate?.(15);
        setDrag(updateDrag(current, current.startX, current.startY));
      }, 450);
    }
    const move = (ev: PointerEvent) => {
      const current = dragRef.current;
      if (!current || ev.pointerId !== current.pointer) return;
      const far = Math.hypot(ev.clientX - current.startX, ev.clientY - current.startY) > 6;
      if (!current.active) {
        if (!far) return;
        if (ev.pointerType !== "mouse") {
          // Desplazamiento normal antes de la pulsación larga
          cleanup();
          return;
        }
        current.active = true;
        suppressClick.current = true;
      }
      ev.preventDefault();
      const next = updateDrag(current, ev.clientX, ev.clientY);
      dragRef.current = next;
      setDrag(next);
    };
    const up = (ev: PointerEvent) => {
      const current = dragRef.current;
      if (!current || ev.pointerId !== current.pointer) return;
      cleanup();
      if (current.active) {
        const before = JSON.stringify(tabs.map((tab) => [tab.id, tab.depth]));
        const next = placeTab(tabs, current.index, current.to, current.depth);
        if (JSON.stringify(next.map((tab) => [tab.id, tab.depth])) !== before) {
          // Si cae dentro de un grupo contraído, se abre
          const parent = parentIndex(next, next.findIndex((tab) => tab.id === tabs[current.index]!.id));
          onChange(parent >= 0 ? patchTab(next, parent, { collapsed: false }) : next);
        }
        window.setTimeout(() => { suppressClick.current = false; }, 0);
      }
    };
    const touchBlock = (ev: TouchEvent) => { if (dragRef.current?.active) ev.preventDefault(); };
    function cleanup() {
      if (pressRef.current) window.clearTimeout(pressRef.current);
      pressRef.current = null;
      dragRef.current = null;
      setDrag(null);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      window.removeEventListener("touchmove", touchBlock);
    }
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    window.addEventListener("touchmove", touchBlock, { passive: false });
  }

  // ---- Teclado ----
  function onRowKey(event: ReactKeyboardEvent<HTMLElement>, index: number, pos: number) {
    const tab = tabs[index]!;
    const go = (p: number) => { const target = shown[p]; if (target) focusRow(target.tab.id); };
    if (event.altKey && event.shiftKey && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
      event.preventDefault();
      const dir = event.key === "ArrowUp" ? -1 : 1;
      if (canMove(tabs, index, dir)) { onChange(moveTab(tabs, index, dir)); focusRow(tab.id); }
      return;
    }
    switch (event.key) {
      case "ArrowDown": event.preventDefault(); go(pos + 1); break;
      case "ArrowUp": event.preventDefault(); go(pos - 1); break;
      case "Home": event.preventDefault(); go(0); break;
      case "End": event.preventDefault(); go(shown.length - 1); break;
      case "ArrowRight":
        event.preventDefault();
        if (hasChildren(tabs, index) && tab.collapsed) toggleCollapse(index); else go(pos + 1);
        break;
      case "ArrowLeft": {
        event.preventDefault();
        if (hasChildren(tabs, index) && !tab.collapsed) { toggleCollapse(index); break; }
        const parent = parentIndex(tabs, index);
        if (parent >= 0) focusRow(tabs[parent]!.id);
        break;
      }
      case "F2": event.preventDefault(); setRenaming({ id: tab.id, value: tab.title }); break;
      case "Delete": event.preventDefault(); if (tabs.length > 1) setConfirm(index); break;
      case "ContextMenu": {
        event.preventDefault();
        const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
        openMenu(index, { x: rect.left + 24, y: rect.bottom });
        break;
      }
      case "F10":
        if (event.shiftKey) {
          event.preventDefault();
          const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
          openMenu(index, { x: rect.left + 24, y: rect.bottom });
        }
        break;
      default:
    }
  }

  function onMenuKey(event: ReactKeyboardEvent<HTMLDivElement>) {
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLElement>("[role=menuitem]:not([disabled])") ?? []);
    const at = items.indexOf(document.activeElement as HTMLElement);
    if (event.key === "ArrowDown") { event.preventDefault(); items[(at + 1) % items.length]?.focus(); }
    else if (event.key === "ArrowUp") { event.preventDefault(); items[(at - 1 + items.length) % items.length]?.focus(); }
    else if (event.key === "Escape") { event.preventDefault(); if (menu?.sub) setMenu({ ...menu, sub: null }); else closeMenu(); }
    else if (event.key === "ArrowLeft" && menu?.sub) { event.preventDefault(); setMenu({ ...menu, sub: null }); }
    else if (event.key === "Tab") { event.preventDefault(); closeMenu(); }
  }

  const menuTab = menu ? tabs[menu.index] : undefined;
  const item = (label: string, run: () => void, opts: { disabled?: boolean; sub?: boolean; key?: string } = {}) => (
    <button key={opts.key ?? label} type="button" role="menuitem" aria-haspopup={opts.sub ? "menu" : undefined} disabled={opts.disabled} onClick={run}>
      <span>{label}</span>{opts.sub ? <span aria-hidden="true">›</span> : null}
    </button>
  );
  const menuNode = menu && menuTab ? createPortal(
    <div ref={menuRef} className={`ow-tabmenu${narrow ? " is-sheet" : ""}`} role="menu" aria-label={tabLabel(menuTab)} onKeyDown={onMenuKey} onContextMenu={(event) => event.preventDefault()}>
      {menu.sub === "move" ? (
        <>
          {item(`‹ ${t("tabMoveTo")}`, () => setMenu({ ...menu, sub: null }), { key: "back" })}
          <div role="separator" />
          {parentIndex(tabs, menu.index) >= 0 ? item(t("tabMoveOut"), () => { onChange(moveOut(tabs, menu.index)); closeMenu(); }) : null}
          {moveTargets(tabs, menu.index).map((target) => (
            <button key={tabs[target]!.id} type="button" role="menuitem" style={{ paddingLeft: 12 + tabs[target]!.depth * INDENT }} onClick={() => { onChange(moveInto(tabs, menu.index, target)); closeMenu(); }}>
              <span>{tabLabel(tabs[target]!)}</span>
            </button>
          ))}
        </>
      ) : menu.sub === "emoji" ? (
        <>
          {item(`‹ ${t("tabEmoji")}`, () => setMenu({ ...menu, sub: null }), { key: "back" })}
          <div className="ow-tabemoji" role="group" aria-label={t("tabEmoji")}>
            {EMOJIS.map((emoji) => (
              <button key={emoji} type="button" role="menuitem" aria-label={emoji} onClick={() => { onChange(patchTab(tabs, menu.index, { emoji })); closeMenu(); }}>{emoji}</button>
            ))}
          </div>
          {menuTab.emoji ? item(t("tabEmojiRemove"), () => { onChange(patchTab(tabs, menu.index, { emoji: undefined })); closeMenu(); }) : null}
        </>
      ) : (
        <>
          {item(t("tabAddSub"), () => { setMenu(null); act.sub(menu.index); }, { disabled: menuTab.depth >= MAX_TAB_DEPTH })}
          {item(t("tabDelete"), () => { setMenu(null); setConfirm(menu.index); }, { disabled: tabs.length <= 1 || subtreeEnd(tabs, menu.index) - menu.index >= tabs.length })}
          {item(t("tabDuplicate"), () => { setMenu(null); act.duplicate(menu.index); })}
          {item(t("tabRename"), () => { setMenu(null); setRenaming({ id: menuTab.id, value: menuTab.title }); })}
          {item(t("tabEmoji"), () => setMenu({ ...menu, sub: "emoji" }), { sub: true })}
          <div role="separator" />
          {item(t("tabCopyLink"), () => { closeMenu(); void copyLink(menu.index); })}
          {item(menuTab.hideOutline ? t("tabShowOutline") : t("tabHideOutline"), () => { onChange(patchTab(tabs, menu.index, { hideOutline: !menuTab.hideOutline })); closeMenu(); })}
          <div role="separator" />
          {canMove(tabs, menu.index, -1) ? item(t("tabMoveUp"), () => { onChange(moveTab(tabs, menu.index, -1)); closeMenu(); }) : null}
          {canMove(tabs, menu.index, 1) ? item(t("tabMoveDown"), () => { onChange(moveTab(tabs, menu.index, 1)); closeMenu(); }) : null}
          {item(t("tabMoveTo"), () => setMenu({ ...menu, sub: "move" }), { sub: true, disabled: moveTargets(tabs, menu.index).length === 0 && parentIndex(tabs, menu.index) < 0 })}
        </>
      )}
    </div>,
    document.body,
  ) : null;

  const draggedEnd = drag?.active ? subtreeEnd(tabs, drag.index) : -1;

  return (
    <aside className={`ow-docs-tabs${narrow ? " is-drawer" : ""}`} aria-label={t("outlineTitle")}>
      <div className="ow-docs-tabhead">
        <button type="button" className="ow-tabs-hide" aria-label={t("tabsHide")} title={t("tabsHide")} onClick={onHide}>‹</button>
        <strong id="ow-tabs-title">{t("outlineTitle")}</strong>
        <button type="button" className="ow-tabs-add" aria-label={t("tabAdd")} title={t("tabAdd")} onClick={act.add}>+</button>
      </div>
      <div className="ow-tablist" ref={listRef} aria-labelledby="ow-tabs-title">
        {shown.map(({ tab, index }, pos) => {
          const selected = tab.id === activeId;
          const kids = hasChildren(tabs, index);
          const dragging = drag?.active && index >= drag.index && index < draggedEnd;
          return (
            <div key={tab.id} className="ow-tabnode" data-tab-id={tab.id} data-tab-index={index}>
              <div
                className={`ow-docs-tab${selected ? " is-active" : ""}${dragging ? " is-dragging" : ""}`}
                style={{ marginLeft: tab.depth * INDENT }}
                onContextMenu={(event) => { event.preventDefault(); openMenu(index, { x: event.clientX, y: event.clientY }); }}
                onPointerDown={(event) => { if ((event.target as HTMLElement).closest(".ow-tab-more, .ow-tab-caret, input")) return; onRowPointerDown(event, index); }}
              >
                {kids ? (
                  <button type="button" className="ow-tab-caret" tabIndex={-1} aria-label={tab.collapsed ? t("tabExpand") : t("tabCollapse")} onClick={() => toggleCollapse(index)}>{tab.collapsed ? "›" : "˅"}</button>
                ) : <span className="ow-tab-caret is-empty" aria-hidden="true" />}
                {renaming?.id === tab.id ? (
                  <input
                    className="ow-tab-rename"
                    aria-label={t("tabRename")}
                    autoFocus
                    value={renaming.value}
                    maxLength={120}
                    onChange={(event) => setRenaming({ id: tab.id, value: event.target.value })}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") { event.preventDefault(); commitRename(); }
                      if (event.key === "Escape") { event.preventDefault(); setRenaming(null); focusRow(tab.id); }
                    }}
                    onBlur={commitRename}
                    onFocus={(event) => event.currentTarget.select()}
                  />
                ) : (
                  <button
                    type="button"
                    className="ow-tab-main"
                    aria-current={selected ? "page" : undefined}
                    aria-expanded={kids ? !tab.collapsed : undefined}
                    tabIndex={selected ? 0 : -1}
                    onClick={() => { if (suppressClick.current) return; onSelect(tab.id); }}
                    onDoubleClick={() => setRenaming({ id: tab.id, value: tab.title })}
                    onKeyDown={(event) => onRowKey(event, index, pos)}
                  >
                    <span className="ow-tab-icon" aria-hidden="true">{tab.emoji ?? (
                      <svg width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm8 1.5V8h4.5L14 3.5zM7 12h10v1.5H7V12zm0 3.5h10V17H7v-1.5z" /></svg>
                    )}</span>
                    <span className="ow-tab-title">{tab.title}</span>
                  </button>
                )}
                <button
                  type="button"
                  className="ow-tab-more"
                  aria-label={t("tabOptions", { name: tab.title })}
                  aria-haspopup="menu"
                  aria-expanded={menu?.index === index}
                  onClick={(event) => {
                    const rect = event.currentTarget.getBoundingClientRect();
                    if (menu?.index === index) setMenu(null); else openMenu(index, { x: rect.left, y: rect.bottom + 4 });
                  }}
                >⋮</button>
              </div>
              {selected && !tab.hideOutline ? (
                headings.length === 0 ? <p className="ow-docs-outline-empty" style={{ marginLeft: tab.depth * INDENT + 28 }}>{t("outlineEmpty")}</p> : (
                  <ol className="ow-docs-outline" style={{ marginLeft: tab.depth * INDENT + 20 }} aria-label={t("tabOutline")}>
                    {headings.map((heading, i) => (
                      <li key={`${i}-${heading.level}-${heading.text}`} data-level={heading.level}>
                        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => onJump(i)}>{heading.text}</button>
                      </li>
                    ))}
                  </ol>
                )
              ) : null}
            </div>
          );
        })}
        {drag?.active && drag.line ? <div className="ow-tabdrop" style={{ top: drag.line.top, left: drag.line.left }} aria-hidden="true" /> : null}
      </div>
      {undo ? (
        <div className="ow-tabundo" role="status">
          <span>{t("tabDeleted", { name: undo.title })}</span>
          <button type="button" onClick={() => { const back = undo; setUndo(null); onChange(back.tabs, back.active, true); }}>{t("undo")}</button>
        </div>
      ) : note ? <p className="ow-tabundo" role="status">{note}</p> : null}
      {menuNode}
      <Dialog
        open={confirm !== null}
        title={t("tabDeleteTitle")}
        body={confirm !== null && tabs[confirm] ? t(hasChildren(tabs, confirm) ? "tabDeleteBodyGroup" : "tabDeleteBody", { name: tabs[confirm]!.title }) : ""}
        confirmLabel={t("tabDelete")}
        cancelLabel={t("cancel")}
        danger
        onClose={() => setConfirm(null)}
        onConfirm={() => { const index = confirm; setConfirm(null); if (index !== null) act.remove(index); }}
      />
    </aside>
  );
}
