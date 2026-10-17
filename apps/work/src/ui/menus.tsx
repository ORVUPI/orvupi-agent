import { useEffect, useRef, useState } from "react";

export type BarItem = {
  id: string;
  label: string;
  hint?: string;
  onSelect?: () => void;
  children?: BarItem[];
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
      {items.map((item) => (
        <div key={item.id} className="ow-menu-row" onMouseEnter={() => setSub(item.children ? item.id : null)}>
          <button
            type="button"
            role="menuitem"
            aria-haspopup={item.children ? "menu" : undefined}
            aria-expanded={item.children ? sub === item.id : undefined}
            onClick={() => {
              if (item.children) {
                setSub((current) => (current === item.id ? null : item.id));
                return;
              }
              item.onSelect?.();
              onDone();
            }}
          >
            <span>{item.label}</span>
            {item.hint ? <kbd>{item.hint}</kbd> : null}
            {item.children ? <span aria-hidden="true">›</span> : null}
          </button>
          {item.children && sub === item.id ? <Items items={item.children} label={item.label} onDone={onDone} /> : null}
        </div>
      ))}
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
  const [open, setOpen] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(null);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(null);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className={`ow-menubar ${className}`.trim()} role="menubar" aria-label={label} ref={ref}>
      {menus.map((menu) => (
        <div key={menu.id}>
          <button
            type="button"
            role="menuitem"
            aria-haspopup="menu"
            aria-expanded={open === menu.id}
            onClick={() => setOpen((current) => (current === menu.id ? null : menu.id))}
            onMouseEnter={() => {
              if (open) setOpen(menu.id);
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
