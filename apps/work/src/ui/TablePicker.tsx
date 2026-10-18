import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

/** Tamaño máximo de la cuadrícula y del diálogo de tabla personalizada. */
export const TABLE_MAX = 15;
export const TABLE_DIALOG_EVENT = "ow-table-dialog";

const clamp = (n: number) => Math.min(TABLE_MAX, Math.max(1, n));

export function openTableDialog() {
  window.dispatchEvent(new CustomEvent(TABLE_DIALOG_EVENT));
}

/**
 * Cuadrícula de hasta 15 × 15: ratón (pasar por encima), táctil (arrastrar y soltar) y teclado
 * (flechas, Inicio/Fin, Intro). Muestra «filas × columnas» y ofrece la tabla personalizada.
 */
export function TableGrid({ onPick, onCustom, labels }: { onPick: (rows: number, cols: number) => void; onCustom?: () => void; labels?: { custom: string; size: (r: number, c: number) => string } }) {
  const [hover, setHover] = useState({ row: 1, col: 1 });
  const ref = useRef<HTMLDivElement>(null);
  const start = useRef<string | null>(null);
  // Como en un procesador de textos: empieza en 5 × 5 y crece una fila/columna más allá del cursor, hasta 15 × 15.
  const shownRows = Math.min(TABLE_MAX, Math.max(5, hover.row + 1));
  const shownCols = Math.min(TABLE_MAX, Math.max(5, hover.col + 1));
  const size = (r: number, c: number) => `${r} × ${c}`;
  const focusCell = (row: number, col: number) => {
    setHover({ row, col });
    requestAnimationFrame(() => ref.current?.querySelector<HTMLButtonElement>(`[data-r="${row}"][data-c="${col}"]`)?.focus());
  };
  useEffect(() => {
    ref.current?.querySelector<HTMLButtonElement>('[data-r="1"][data-c="1"]')?.focus({ preventScroll: true });
  }, []);
  const onKey = (event: KeyboardEvent) => {
    const { row, col } = hover;
    const moves: Record<string, [number, number]> = { ArrowDown: [row + 1, col], ArrowUp: [row - 1, col], ArrowRight: [row, col + 1], ArrowLeft: [row, col - 1], Home: [row, 1], End: [row, TABLE_MAX], PageUp: [1, col], PageDown: [TABLE_MAX, col] };
    const next = moves[event.key];
    if (next) {
      event.preventDefault();
      focusCell(clamp(next[0]), clamp(next[1]));
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onPick(row, col);
    }
  };
  const cellAt = (event: PointerEvent) => {
    const el = document.elementFromPoint(event.clientX, event.clientY) as HTMLElement | null;
    const r = Number(el?.dataset.r);
    const c = Number(el?.dataset.c);
    return r && c ? { row: r, col: c } : null;
  };
  return (
    <div className="ow-table-grid">
      <div
        ref={ref}
        role="grid"
        aria-label={labels?.size(hover.row, hover.col) ?? size(hover.row, hover.col)}
        style={{ touchAction: "none" }}
        onKeyDown={onKey}
        onPointerMove={(event) => {
          const cell = cellAt(event);
          if (cell) setHover(cell);
        }}
        onPointerDown={(event) => {
          const cell = cellAt(event);
          start.current = cell ? `${cell.row}x${cell.col}` : null;
        }}
        onPointerUp={(event) => {
          if (event.pointerType === "mouse") return;
          const cell = cellAt(event);
          // Un toque simple lo resuelve el clic; aquí solo se recoge el arrastre que acaba en otra celda.
          if (cell && start.current !== `${cell.row}x${cell.col}`) {
            event.preventDefault();
            onPick(cell.row, cell.col);
          }
        }}
      >
        {Array.from({ length: shownRows }, (_, row) => (
          <div role="row" key={row} className="ow-table-grid-row">
            {Array.from({ length: shownCols }, (_, col) => {
              const hot = row < hover.row && col < hover.col;
              const current = row + 1 === hover.row && col + 1 === hover.col;
              return (
                <button
                  key={col}
                  type="button"
                  role="gridcell"
                  data-r={row + 1}
                  data-c={col + 1}
                  tabIndex={current ? 0 : -1}
                  aria-selected={hot}
                  aria-label={size(row + 1, col + 1)}
                  className={hot ? "is-hot" : ""}
                  onMouseEnter={() => setHover({ row: row + 1, col: col + 1 })}
                  onFocus={() => setHover({ row: row + 1, col: col + 1 })}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={(event) => {
                    if (event.detail === 0) return; // el teclado lo gestiona onKey
                    onPick(row + 1, col + 1);
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>
      <p className="ow-table-size" aria-live="polite" data-testid="table-size">{hover.row} × {hover.col}</p>
      {onCustom ? (
        <button type="button" className="ow-table-custom" onMouseDown={(event) => event.preventDefault()} onClick={onCustom}>
          {labels?.custom ?? "Insertar tabla personalizada…"}
        </button>
      ) : null}
    </div>
  );
}

/** Diálogo con filas y columnas exactas (1–15), validado. */
export function TableDialog({ onInsert, t }: { onInsert: (rows: number, cols: number) => void; t: (key: "tableCustom" | "tableRows" | "tableCols" | "tableRange" | "insertAction" | "cancel") => string }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState("3");
  const [cols, setCols] = useState("3");
  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener(TABLE_DIALOG_EVENT, show);
    return () => window.removeEventListener(TABLE_DIALOG_EVENT, show);
  }, []);
  if (!open) return null;
  const valid = (value: string) => /^\d{1,2}$/.test(value) && Number(value) >= 1 && Number(value) <= TABLE_MAX;
  const ok = valid(rows) && valid(cols);
  return (
    <form
      className="ow-doc-dialog ow-obj-dialog ow-table-dialog"
      role="dialog"
      aria-label={t("tableCustom")}
      onKeyDown={(event) => { if (event.key === "Escape") setOpen(false); }}
      onSubmit={(event) => {
        event.preventDefault();
        if (!ok) return;
        onInsert(Number(rows), Number(cols));
        setOpen(false);
      }}
    >
      <h2>{t("tableCustom")}</h2>
      <label>
        {t("tableRows")}
        <input type="number" inputMode="numeric" min={1} max={TABLE_MAX} required autoFocus value={rows} aria-invalid={!valid(rows)} onChange={(event) => setRows(event.target.value)} />
      </label>
      <label>
        {t("tableCols")}
        <input type="number" inputMode="numeric" min={1} max={TABLE_MAX} required value={cols} aria-invalid={!valid(cols)} onChange={(event) => setCols(event.target.value)} />
      </label>
      {!ok ? <p className="ow-form-error" role="alert">{t("tableRange")}</p> : null}
      <button type="submit" disabled={!ok}>{t("insertAction")}</button>
      <button type="button" onClick={() => setOpen(false)}>{t("cancel")}</button>
    </form>
  );
}
