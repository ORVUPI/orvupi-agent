import { useEffect, useRef, useState } from "react";
import { usePhone } from "./phone";
import { TableGrid, openTableDialog } from "./TablePicker";

export type BarItem = {
  id: string;
  label: string;
  hint?: string;
  onSelect?: () => void;
  children?: BarItem[];
  table?: (rows: number, cols: number) => void;
  tableLabels?: { custom: string; size: (r: number, c: number) => string };
  static?: boolean;
};

function Items({
  items,
  label,
  onDone,
}: {
  items: BarItem[];
  label: string;
  onDone: () => void;
}) {
  const [sub, setSub] = useState<string | null>(null);
  return (
    <div role="menu" aria-label={label}>
      {items.map((item) =>
        item.static ? (
          <p key={item.id} className="ow-menu-note" role="note">{item.label}</p>
        ) : (
          <div key={item.id} className="ow-menu-row" onMouseEnter={() => { if (window.matchMedia("(hover: none)").matches) return; setSub(item.children || item.table ? item.id : null); }}>
            <button
              type="button"
              role="menuitem"
              aria-haspopup={item.children || item.table ? "menu" : undefined}
              aria-expanded={item.children || item.table ? sub === item.id : undefined}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                if (item.children || item.table) {
                  setSub(item.id);
                  return;
                }
                item.onSelect?.();
                onDone();
              }}
            >
              <span>{item.label}</span>
              {item.hint ? <kbd>{item.hint}</kbd> : null}
              {item.children || item.table ? <span aria-hidden="true">›</span> : null}
            </button>
            {item.table && sub === item.id ? (
              <div role="menu" aria-label={item.label}>
                <TableGrid
                  labels={item.tableLabels}
                  onCustom={() => {
                    onDone();
                    openTableDialog();
                  }}
                  onPick={(rows, cols) => {
                    item.table?.(rows, cols);
                    onDone();
                  }}
                />
              </div>
            ) : null}
            {item.children && sub === item.id ? <Items items={item.children} label={item.label} onDone={onDone} /> : null}
          </div>
        ),
      )}
    </div>
  );
}

export function MenuBar({
  label,
  menus,
  className = "",
}: {
  label: string;
  menus: Array<{ id: string; label: string; items: BarItem[] }>;
  className?: string;
}) {
  const phone = usePhone();
  const [open, setOpen] = useState<string | null>(null);
  const [hub, setHub] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open && !hub) return;
    const onPointer = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && ref.current?.contains(target)) return;
      setOpen(null);
      setHub(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(null);
        setHub(false);
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, hub]);

  if (phone) {
    const current = menus.find((menu) => menu.id === open) ?? null;
    return (
      <div className={`ow-menubar is-compact ${className}`.trim()} role="menubar" aria-label={label} ref={ref}>
        <button
          type="button"
          className="ow-menu-overflow"
          role="menuitem"
          aria-label={label}
          aria-haspopup="menu"
          aria-expanded={hub || Boolean(current)}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            setOpen(null);
            setHub((value) => !value);
          }}
        >
          ⋮
        </button>
        {hub || current ? (
          current ? (
            <Items items={current.items} label={current.label} onDone={() => { setOpen(null); setHub(false); }} />
          ) : (
            <div role="menu" aria-label={label}>
              {menus.map((menu) => (
                <button
                  key={menu.id}
                  type="button"
                  role="menuitem"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    setHub(false);
                    setOpen(menu.id);
                  }}
                >
                  {menu.label}
                </button>
              ))}
            </div>
          )
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={`ow-menubar ${className}`.trim()}
      role="menubar"
      aria-label={label}
      ref={ref}
      onMouseDown={(event) => {
        const target = event.target;
        if (target instanceof HTMLElement && target.closest("input, textarea, select")) return;
        event.preventDefault();
      }}
    >
      {menus.map((menu) => (
        <div key={menu.id}>
          <button
            type="button"
            role="menuitem"
            aria-haspopup="menu"
            aria-expanded={open === menu.id}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => setOpen((current) => (current === menu.id ? null : menu.id))}
            onMouseEnter={() => {
              if (!open || window.matchMedia("(hover: none)").matches) return;
              setOpen(menu.id);
            }}
          >
            {menu.label}
          </button>
          {open === menu.id ? <Items items={menu.items} label={menu.label} onDone={() => setOpen(null)} /> : null}
        </div>
      ))}
    </div>
  );
}
