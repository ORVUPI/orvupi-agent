import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "./kit";

export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useEffect(() => {
    if (!open) return;
    const root = ref.current;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusable = () =>
      [...(root?.querySelectorAll<HTMLElement>("button, [href], input, select, textarea") ?? [])].filter(
        (element) => !element.hasAttribute("disabled"),
      );
    focusable()[0]?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab") return;
      const items = focusable();
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="ow-modal-back" onMouseDown={onClose}>
      <div
        ref={ref}
        className="ow-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h2 id={titleId}>{title}</h2>
        {children}
        {footer ? <div className="ow-row">{footer}</div> : null}
      </div>
    </div>
  );
}

export function Dialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onClose,
  danger = false,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onClose: () => void;
  danger?: boolean;
}) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>{cancelLabel}</Button>
          <Button variant={danger ? "danger" : "primary"} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p>{body}</p>
    </Modal>
  );
}

export function Dropdown({
  label,
  items,
}: {
  label: string;
  items: Array<{ id: string; label: string; onSelect: () => void }>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const node = ref.current;
    const onPointer = (event: PointerEvent) => {
      if (!node?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return (
    <div className="ow-dropdown" ref={ref}>
      <button type="button" aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen((value) => !value)}>
        {label}
      </button>
      {open ? (
        <div role="menu" aria-label={label}>
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              onClick={() => {
                item.onSelect();
                setOpen(false);
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function FilePicker({
  label,
  accept,
  onFile,
}: {
  label: string;
  accept: string;
  onFile: (file: File) => void;
}) {
  return (
    <label className="ow-file">
      <input
        aria-label={label}
        type="file"
        accept={accept}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) onFile(file);
        }}
      />
      <span className="ow-button ow-button-secondary">{label}</span>
    </label>
  );
}

export type MenuItem = { id: string; label: string; onSelect: () => void; danger?: boolean };

export function ContextMenu({
  x,
  y,
  items,
  onClose,
  title,
}: {
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
  title?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // En pantallas estrechas el menú es una hoja inferior por encima de la barra y del botón +.
  const sheet = typeof window !== "undefined" && window.matchMedia?.("(max-width: 720px)").matches;
  const [place, setPlace] = useState<{ left: number; top: number; maxHeight?: number }>({ left: x, top: y });
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node || sheet) return;
    const margin = 8;
    const vh = window.innerHeight;
    const box = node.getBoundingClientRect();
    const height = Math.min(box.height, vh - margin * 2);
    const left = Math.max(margin, Math.min(x, window.innerWidth - box.width - margin));
    // Si no cabe debajo se abre hacia arriba; si tampoco, se ajusta y se desplaza por dentro.
    let top = y;
    if (y + height > vh - margin) top = y - height >= margin ? y - height : Math.max(margin, vh - height - margin);
    setPlace({ left, top, maxHeight: vh - margin * 2 });
  }, [x, y, items.length, sheet]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        const buttons = Array.from(ref.current?.querySelectorAll<HTMLButtonElement>("[role=menuitem]") ?? []);
        if (buttons.length === 0) return;
        event.preventDefault();
        const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
        const next = event.key === "ArrowDown" ? (index + 1) % buttons.length : (index - 1 + buttons.length) % buttons.length;
        buttons[next]?.focus();
      }
    };
    const onPointer = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) onClose();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    ref.current?.querySelector<HTMLButtonElement>("[role=menuitem]")?.focus({ preventScroll: true });
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [onClose]);
  const list = items.map((item) => (
    <button
      key={item.id}
      type="button"
      role="menuitem"
      className={item.danger ? "is-danger" : undefined}
      onClick={() => {
        item.onSelect();
        onClose();
      }}
    >
      {item.label}
    </button>
  ));
  if (sheet) {
    return (
      <div className="ow-sheet-backdrop">
        <div ref={ref} className="ow-context is-sheet" role="menu" aria-label={title}>
          <span className="ow-sheet-grip" aria-hidden="true" />
          {title ? <p className="ow-sheet-title">{title}</p> : null}
          {list}
        </div>
      </div>
    );
  }
  return (
    <div ref={ref} className="ow-context" style={{ left: place.left, top: place.top, maxHeight: place.maxHeight }} role="menu" aria-label={title}>
      {list}
    </div>
  );
}

export function Toasts({ items, onDismiss }: { items: Array<{ id: string; message: string; action?: { label: string; run: () => void } }>; onDismiss: (id: string) => void }) {
  if (items.length === 0) return null;
  return (
    <div className="ow-toasts" aria-live="polite">
      {items.map((item) => (
        <p key={item.id} role="status">
          {item.message}
          {item.action ? (
            <button type="button" className="ow-toast-action" onClick={() => { item.action?.run(); onDismiss(item.id); }}>
              {item.action.label}
            </button>
          ) : null}
          <button type="button" aria-label="OK" onClick={() => onDismiss(item.id)}>
            OK
          </button>
        </p>
      ))}
    </div>
  );
}

/** Barra de progreso de importación (archivos grandes): lee, descomprime, guarda imágenes y guarda. */
export function ImportProgress({ t }: { t: (key: "importProgress", vars?: Record<string, string | number>) => string }) {
  const [state, setState] = useState<{ name: string; pct: number } | null>(null);
  useEffect(() => {
    let name = "";
    const weights: Record<string, [number, number]> = { start: [0, 2], read: [2, 10], parse: [10, 30], images: [30, 90], save: [90, 99] };
    const on = (event: Event) => {
      const detail = (event as CustomEvent<{ phase: string; done: number; total: number; name?: string }>).detail;
      if (detail.name) name = detail.name;
      if (detail.phase === "done") {
        setState(null);
        return;
      }
      const [from, to] = weights[detail.phase] ?? [0, 100];
      const pct = Math.round(from + (to - from) * (detail.total > 0 ? detail.done / detail.total : 0));
      setState({ name, pct });
    };
    window.addEventListener("ow-import-progress", on);
    return () => window.removeEventListener("ow-import-progress", on);
  }, []);
  if (!state) return null;
  return (
    <div className="ow-import-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={state.pct} aria-label={t("importProgress", { name: state.name, pct: state.pct })}>
      <p>{t("importProgress", { name: state.name, pct: state.pct })}</p>
      <span style={{ width: `${state.pct}%` }} />
    </div>
  );
}
