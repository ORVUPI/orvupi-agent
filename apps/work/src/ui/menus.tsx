import { useEffect, useRef, useState } from "react";
import type { MenuItem } from "./overlay";

export function MenuBar({
  label,
  menus,
}: {
  label: string;
  menus: Array<{ id: string; label: string; items: MenuItem[] }>;
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
    <div className="ow-menubar" role="menubar" aria-label={label} ref={ref}>
      {menus.map((menu) => (
        <div key={menu.id}>
          <button
            type="button"
            role="menuitem"
            aria-haspopup="menu"
            aria-expanded={open === menu.id}
            onClick={() => setOpen((current) => (current === menu.id ? null : menu.id))}
          >
            {menu.label}
          </button>
          {open === menu.id ? (
            <div role="menu" aria-label={menu.label}>
              {menu.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    item.onSelect();
                    setOpen(null);
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
