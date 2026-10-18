import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useWorkspace } from "../app/workspace";
import { loadFileWhenReady } from "../routing/load";
import { downloadBytes } from "../security/bytes";
import { createId, fileNameWithExtension } from "../security/names";
import { Button, Input } from "../ui/kit";
import { absentOnDevice, MissingFile } from "../ui/MissingFile";
import { usePhone } from "../ui/phone";
import { APP_VERSION } from "../version";
import { MenuBar } from "../ui/menus";
import { Modal } from "../ui/overlay";
import { OrvupiChart } from "../ui/chart";
import { csvToGrid, gridToCsv } from "./csv";
import {
  autofill,
  cellSpan,
  chartSeries,
  columnSpan,
  formatShown,
  mergeRange,
  paintStyle,
  pivotGrid,
  remapStyles,
  remapValidation,
  replaceInGrid,
  scaleColor,
  scaleInk,
  ruleMatches,
  spliceGrid,
  styleKey,
  unmerge,
  type CellFormatKind,
  type CellStyle,
  type CondRule,
} from "./format";
import { COL_COUNT, ROW_COUNT, cellRef, columnLabel, displayCell, evaluateFormula, sortGrid, type FormulaBook } from "./formulas";
import { blankSheet, parseSheet, serializeSheet, type SheetFile, type SheetTab } from "./model";
import { sheetsToXlsx, xlsxToSheets } from "./xlsx";

const GUTTER = 46;

function paneSize(node: HTMLElement) {
  const rect = node.getBoundingClientRect();
  const onScreen = Math.max(0, Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0));
  return {
    height: Math.max(120, Math.min(node.clientHeight || onScreen || window.innerHeight, window.innerHeight, onScreen || window.innerHeight)),
    width: Math.max(120, Math.min(node.clientWidth || window.innerWidth, window.innerWidth)),
  };
}
const HEAD = 28;
const ROW_H = 30;
const COL_W = 92;
const FILLS = ["#ffffff", "#fff4b8", "#e5f6ee", "#d9e6f7", "#fff0f5", "#102032"];
const INKS = ["#102032", "#ff3070", "#0b5d36", "#1d4e89", "#7a4a00"];

type Clip = { raw: string; style?: CellStyle };

export function SheetsScreen() {
  const workspace = useWorkspace();
  const sheets = workspace.files.filter((file) => file.deletedAt === null && file.kind === "sheet");
  const [file, setFile] = useState<SheetFile | null>(null);
  const [status, setStatus] = useState<"saved" | "pending">("saved");
  const [selected, setSelected] = useState({ row: 0, col: 0 });
  const [anchor, setAnchor] = useState({ row: 0, col: 0 });
  const [error, setError] = useState("");
  const [win, setWin] = useState({ top: 0, left: 0, height: 520, width: 960 });
  const [dialog, setDialog] = useState<"" | "find" | "valid" | "cond" | "help" | "note">("");
  const [findQuery, setFindQuery] = useState("");
  const [replaceQuery, setReplaceQuery] = useState("");
  const [validKind, setValidKind] = useState<"list" | "check" | "date" | "range" | "formula">("list");
  const [validText, setValidText] = useState("Sí, No");
  const [rangeMin, setRangeMin] = useState("0");
  const [rangeMax, setRangeMax] = useState("10");
  const [noteText, setNoteText] = useState("");
  const [condValue, setCondValue] = useState("10");
  const imageRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const chooseRef = useRef<(row: number, col: number, extend: boolean) => void>(() => undefined);
  const draggedRef = useRef(false);
  const clip = useRef<Clip | null>(null);
  const phone = usePhone();
  const [formatOpen, setFormatOpen] = useState(false);

  useEffect(() => {
    const node = wrapRef.current;
    if (!node) return;
    node.scrollTop = 0;
    node.scrollLeft = 0;
    setWin((current) => ({ ...current, top: 0, left: 0, ...paneSize(node) }));
    const measure = () => setWin((current) => ({ ...current, ...paneSize(node) }));
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [file?.active]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    let drag: { id: number; row: number; col: number; x: number; y: number; on: boolean } | null = null;
    const hit = (x: number, y: number) => {
      const node = document.elementFromPoint(x, y);
      const cell = node instanceof Element ? node.closest<HTMLElement>("[data-row][data-col]") : null;
      if (!cell) return null;
      const row = Number(cell.dataset.row);
      const col = Number(cell.dataset.col);
      if (!Number.isInteger(row) || !Number.isInteger(col)) return null;
      return { row, col };
    };
    const down = (event: PointerEvent) => {
      if (!event.isPrimary) return;
      if (event.target instanceof Element && event.target.closest(".ow-fill-handle")) return;
      const handle = event.target instanceof Element && Boolean(event.target.closest(".ow-range-handle"));
      const cell = hit(event.clientX, event.clientY);
      if (!cell && !handle) return;
      drag = { id: event.pointerId, row: cell?.row ?? 0, col: cell?.col ?? 0, x: event.clientX, y: event.clientY, on: handle };
      if (handle) {
        event.preventDefault();
        wrap.setPointerCapture(event.pointerId);
      } else if (cell && !event.shiftKey) chooseRef.current(cell.row, cell.col, false);
    };
    const move = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.id) return;
      const dx = event.clientX - drag.x;
      const dy = event.clientY - drag.y;
      if (!drag.on && dx * dx + dy * dy < 36) return;
      const cell = hit(event.clientX, event.clientY);
      if (!cell || (!drag.on && cell.row === drag.row && cell.col === drag.col)) return;
      drag.on = true;
      if (event.cancelable) event.preventDefault();
      wrap.setPointerCapture(event.pointerId);
      chooseRef.current(cell.row, cell.col, true);
    };
    const up = (event: PointerEvent) => {
      if (!drag || drag.id !== event.pointerId) return;
      if (drag.on) draggedRef.current = true;
      drag = null;
    };
    const touchMove = (event: TouchEvent) => {
      if (drag?.on && event.cancelable) event.preventDefault();
    };
    wrap.addEventListener("pointerdown", down);
    wrap.addEventListener("pointermove", move);
    wrap.addEventListener("pointerup", up);
    wrap.addEventListener("pointercancel", up);
    wrap.addEventListener("touchmove", touchMove, { passive: false });
    return () => {
      wrap.removeEventListener("pointerdown", down);
      wrap.removeEventListener("pointermove", move);
      wrap.removeEventListener("pointerup", up);
      wrap.removeEventListener("pointercancel", up);
      wrap.removeEventListener("touchmove", touchMove);
    };
  }, [file?.active]);

  useEffect(() => {
    if (!workspace.openSheetId || !workspace.storage) {
      setFile(null);
      return;
    }
    const id = workspace.openSheetId;
    let cancel = false;
    loadFileWhenReady(workspace.storage, id)
      .then((loaded) => {
        if (cancel) return;
        if (loaded.integrity === "mismatch") {
          setError(workspace.t("reasonCorrupt"));
          setFile(null);
          return;
        }
        setFile(parseSheet(loaded.bytes));
        setError("");
        setStatus("saved");
      })
      .catch(() => {
        if (!cancel) setError(workspace.t("reasonInvalid"));
      });
    return () => {
      cancel = true;
    };
  }, [workspace.openSheetId, workspace.storage, workspace.t]);

  useEffect(() => {
    if (!file || !workspace.storage || status !== "pending") return;
    const timer = window.setTimeout(() => {
      void workspace.storage
        ?.saveFile({
          id: file.id,
          name: file.title,
          kind: "sheet",
          mime: "application/vnd.orvupi.sheet+json",
          bytes: serializeSheet(file),
          snippet: file.sheets.map((sheet) => sheet.cells.flat().filter((value) => value && !value.startsWith("=")).join(" ")).join("\n").slice(0, 4000),
        })
        .then(() => workspace.refreshFiles())
        .then(() => setStatus("saved"))
        .catch(workspace.reportError);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [file, status, workspace.storage, workspace.refreshFiles, workspace.reportError]);

  const active = file?.sheets[file.active];
  const book: FormulaBook | undefined = useMemo(() => (
    file ? { sheets: file.sheets.map((sheet) => ({ name: sheet.name, cells: sheet.cells })), active: file.active, names: file.sheets[file.active]?.names } : undefined
  ), [file]);
  const styles = active?.styles ?? {};
  const currentStyle = styles[styleKey(selected.row, selected.col)];
  const raw = active?.cells[selected.row]?.[selected.col] ?? "";
  const frozenRows = active?.frozenRows ?? (active?.freezeHeader ? 1 : 0);
  const frozenCols = active?.frozenCols ?? 0;
  const cellRule = active?.validation?.[styleKey(selected.row, selected.col)];
  const options = cellRule?.kind === "list" ? cellRule.options : [];

  const filter = active?.filter ?? "";
  const rowIndexes = useMemo(() => {
    if (!active) return [];
    const query = (active.filter ?? "").trim().toLowerCase();
    const indexes: number[] = [];
    for (let row = 0; row < active.cells.length; row += 1) {
      if (!query || row < frozenRows) {
        indexes.push(row);
        continue;
      }
      const line = active.cells[row] ?? [];
      const hit = line.some((value, col) => {
        if (value.toLowerCase().includes(query)) return true;
        return value.startsWith("=") && displayCell(active.cells, row, col, new Set(), book).toLowerCase().includes(query);
      });
      if (hit) indexes.push(row);
    }
    return indexes;
  }, [active, frozenRows, book]);

  function update(mutator: (current: SheetFile) => SheetFile) {
    setFile((current) => (current ? mutator(current) : current));
    setStatus("pending");
  }

  function mapActive(mutator: (sheet: SheetTab) => SheetTab) {
    update((current) => ({
      ...current,
      sheets: current.sheets.map((sheet, index) => (index === current.active ? mutator(sheet) : sheet)),
    }));
  }

  function formulaAllows(sheet: SheetTab, row: number, col: number, value: string): boolean {
    const rule = sheet.validation?.[styleKey(row, col)];
    if (!rule || rule.kind !== "formula") return true;
    const cells = sheet.cells.map((line) => [...line]);
    const line = cells[row] ? [...cells[row]] : [];
    line[col] = value.slice(0, 500);
    cells[row] = line;
    const result = evaluateFormula(rule.expr, (ref) => displayCell(cells, ref.row, ref.col, new Set(), book));
    if (result.kind === "bool") return result.value;
    if (result.kind === "num") return result.value !== 0;
    return false;
  }

  function setCell(value: string) {
    if (active && !formulaAllows(active, selected.row, selected.col, value)) {
      setError(workspace.t("sheetFormulaRule"));
      return;
    }
    setError("");
    mapActive((sheet) => {
      const cells = sheet.cells.map((row) => [...row]);
      cells[selected.row]![selected.col] = value.slice(0, 500);
      return { ...sheet, cells };
    });
  }

  function setSheetFilter(value: string) {
    mapActive((sheet) => ({ ...sheet, filter: value.slice(0, 80) }));
  }

  function patch(partial: CellStyle) {
    mapActive((sheet) => ({ ...sheet, styles: paintStyle(sheet.styles ?? {}, selected.row, selected.col, partial) }));
  }

  function shift(axis: "row" | "col", at: number, delta: number) {
    mapActive((sheet) => ({
      ...sheet,
      cells: spliceGrid(sheet.cells, axis, at, delta),
      styles: remapStyles(sheet.styles ?? {}, axis, at, delta),
      validation: remapValidation(sheet.validation ?? {}, axis, at, delta),
    }));
  }

  function choose(row: number, col: number, extend: boolean) {
    setSelected({ row, col });
    if (!extend) setAnchor({ row, col });
  }
  chooseRef.current = choose;

  function copyCell() {
    clip.current = { raw, style: currentStyle ? { ...currentStyle } : undefined };
    void navigator.clipboard?.writeText(raw).catch(() => undefined);
  }

  function pasteCell() {
    const stored = clip.current;
    if (!stored) return;
    mapActive((sheet) => {
      const cells = sheet.cells.map((row) => [...row]);
      cells[selected.row]![selected.col] = stored.raw;
      const stylesNext = { ...(sheet.styles ?? {}) };
      if (stored.style) stylesNext[styleKey(selected.row, selected.col)] = { ...stored.style };
      return { ...sheet, cells, styles: stylesNext };
    });
  }

  function moveSelection(dRow: number, dCol: number) {
    setSelected((current) => ({
      row: Math.max(0, Math.min(ROW_COUNT - 1, current.row + dRow)),
      col: Math.max(0, Math.min(COL_COUNT - 1, current.col + dCol)),
    }));
  }

  if (!workspace.openSheetId) {
    return (
      <div className="ow-page" data-tool="sheets">
        <h1>{workspace.t("navSheets")}</h1>
        <p>{workspace.t("sheetLimit")}</p>
        <Button variant="primary" onClick={() => void workspace.createSheet(null)}>{workspace.t("newSheet")}</Button>
        <div className="ow-list">
          {sheets.map((entry) => (
            <Button key={entry.id} onClick={() => workspace.openSheet(entry.id)}>{entry.name}</Button>
          ))}
        </div>
      </div>
    );
  }

  if (absentOnDevice(workspace.ready, workspace.openSheetId, workspace.files)) {
    return (
      <MissingFile
        message={workspace.t("fileMissing")}
        action={workspace.t("backToDrive")}
        onBack={() => void workspace.showBrowse("folder")}
      />
    );
  }

  if (!file || !active) return <p>{error || workspace.t("preparing")}</p>;

  const pinned = rowIndexes.filter((row) => row < frozenRows);
  const bodyRows = rowIndexes.filter((row) => row >= frozenRows);
  const headBlock = HEAD + pinned.length * ROW_H;
  const bodyScroll = Math.max(0, win.top - headBlock);
  const rowStart = Math.max(0, Math.floor(bodyScroll / ROW_H) - 2);
  const rowEnd = Math.min(bodyRows.length, rowStart + Math.ceil(win.height / ROW_H) + 6);
  const colStart = Math.max(frozenCols, Math.floor(win.left / COL_W) - 1);
  const colEnd = Math.min(COL_COUNT, Math.ceil((win.left + win.width) / COL_W) + 2);
  const gridWidth = GUTTER + COL_COUNT * COL_W;

  function shownAt(rowIndex: number, colIndex: number) {
    const computed = displayCell(active!.cells, rowIndex, colIndex, new Set(), book);
    const rule = (active!.conditional ?? []).find((item) => item.col === colIndex && (item.op === "scale" || ruleMatches(computed, item)));
    const style = styles[styleKey(rowIndex, colIndex)];
    let scale: string | undefined;
    if (rule?.op === "scale") {
      const span = columnSpan(active!.cells, colIndex);
      scale = scaleColor(computed, span.low, span.high);
    }
    return { text: formatShown(computed, style?.format), style, rule, scale };
  }

  function cellButton(rowIndex: number, colIndex: number, top: number | null) {
    const span = cellSpan(styles, rowIndex, colIndex);
    if (span === "covered") return null;
    const label = cellRef(rowIndex, colIndex);
    const view = shownAt(rowIndex, colIndex);
    const pressed = selected.row === rowIndex && selected.col === colIndex;
    const image = active?.images?.[styleKey(rowIndex, colIndex)];
    const note = active?.notes?.[styleKey(rowIndex, colIndex)];
    const cellTop = top ?? 0;
    const cellLeft = (top === null ? 0 : GUTTER) + colIndex * COL_W;
    return (
      <Fragment key={label}>
        <button
          type="button"
          className={`ow-cell${view.style?.border ? " has-border" : ""}${view.style?.wrap ? " is-wrap" : ""}${bounds.r1 !== bounds.r2 || bounds.c1 !== bounds.c2 ? (rowIndex >= bounds.r1 && rowIndex <= bounds.r2 && colIndex >= bounds.c1 && colIndex <= bounds.c2 ? " is-range" : "") : ""}`}
          aria-label={view.text ? `${label} ${view.text}` : label}
        title={note || undefined}
          aria-pressed={pressed}
          data-row={rowIndex}
          data-col={colIndex}
          data-range={bounds.r1 !== bounds.r2 || bounds.c1 !== bounds.c2 ? (rowIndex >= bounds.r1 && rowIndex <= bounds.r2 && colIndex >= bounds.c1 && colIndex <= bounds.c2 ? "true" : "false") : "false"}
          data-bold={view.style?.bold ? "true" : "false"}
          style={{
            top: cellTop,
            left: cellLeft,
            width: COL_W * span.colspan,
            height: ROW_H * span.rowspan,
            fontWeight: view.style?.bold ? 800 : 400,
            color: view.scale ? scaleInk(view.scale) : view.style?.color,
            background: image ? `center / contain no-repeat url("${image}") ${view.scale ?? view.rule?.fill ?? view.style?.fill ?? "#fff"}` : (view.scale ?? view.rule?.fill ?? view.style?.fill),
            textAlign: view.style?.align,
          }}
          onClick={(event) => {
            if (draggedRef.current) {
              draggedRef.current = false;
              event.preventDefault();
              return;
            }
            choose(rowIndex, colIndex, event.shiftKey);
          }}
        >
          {view.text}
        </button>
        {pressed ? (
          <button
            key={`${label}-fill`}
            type="button"
            className="ow-fill-handle"
            aria-label={workspace.t("sheetAutofill")}
            style={{ top: cellTop + ROW_H * span.rowspan - 8, left: cellLeft + COL_W * span.colspan - 32 }}
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              const node = event.currentTarget;
              node.setPointerCapture(event.pointerId);
              const originX = event.clientX;
              const originY = event.clientY;
              const finish = (up: PointerEvent) => {
                node.removeEventListener("pointerup", finish);
                const rows = Math.round((up.clientY - originY) / ROW_H);
                const cols = Math.round((up.clientX - originX) / COL_W);
                if (rows > 0) mapActive((sheet) => ({ ...sheet, cells: autofill(sheet.cells, rowIndex, colIndex, rows, true) }));
                else if (cols > 0) mapActive((sheet) => ({ ...sheet, cells: autofill(sheet.cells, rowIndex, colIndex, cols, false) }));
              };
              node.addEventListener("pointerup", finish);
            }}
          />
        ) : null}
      </Fragment>
    );
  }

  function columns(from: number, to: number, rowIndex: number, top: number | null) {
    return Array.from({ length: Math.max(0, to - from) }, (_, offset) => cellButton(rowIndex, from + offset, top));
  }

  const bounds = {
    r1: Math.min(anchor.row, selected.row),
    c1: Math.min(anchor.col, selected.col),
    r2: Math.max(anchor.row, selected.row),
    c2: Math.max(anchor.col, selected.col),
  };
  const rangeHandle = (
    <button
      type="button"
      className="ow-range-handle"
      aria-label={workspace.t("selectionHandle")}
      style={bounds.r2 < frozenRows
        ? { top: ROW_H - 9, left: bounds.c2 * COL_W + COL_W - 9 }
        : { top: (bounds.r2 - frozenRows) * ROW_H + ROW_H - 9, left: GUTTER + bounds.c2 * COL_W + COL_W - 9 }}
    />
  );

  function mergeSelection() {
    const single = bounds.r2 === bounds.r1 && bounds.c2 === bounds.c1;
    mapActive((sheet) => ({
      ...sheet,
      styles: mergeRange(sheet.styles ?? {}, bounds.r1, bounds.c1, single ? bounds.r1 : bounds.r2, single ? bounds.c1 + 1 : bounds.c2),
    }));
  }

  return (
    <div className="ow-page ow-sheet-page" data-tool="sheets">
      <h1 className="ow-sr">{file.title}</h1>
      <div className="ow-editor-line">
      <div className="ow-row">
        <Input label={workspace.t("fileName")} value={file.title} onChange={(event) => update((current) => ({ ...current, title: event.target.value.slice(0, 180) }))} />
        <p className="ow-sheet-status" role="status">{status === "saved" ? workspace.t("statusSaved") : workspace.t("statusPending")}</p>
        {phone ? <Button aria-expanded={formatOpen} onClick={() => setFormatOpen((value) => !value)}>{workspace.t("menuFormat")}</Button> : null}
        {phone ? <Button onClick={mergeSelection}>{workspace.t("mergeCells")}</Button> : null}
      </div>
      <MenuBar
        label={workspace.t("menuBar")}
        menus={[
          { id: "file", label: workspace.t("menuFile"), items: [
            { id: "csv", label: workspace.t("sheetCsv"), onSelect: () => downloadBytes(new TextEncoder().encode(gridToCsv(active.cells)), fileNameWithExtension(file.title, "csv"), "text/csv") },
            { id: "xlsx", label: workspace.t("sheetXlsx"), onSelect: () => downloadBytes(sheetsToXlsx(file.sheets), fileNameWithExtension(file.title, "xlsx"), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") },
            { id: "print", label: workspace.t("print"), onSelect: () => window.print() },
          ] },
          { id: "edit", label: workspace.t("menuEdit"), items: [
            { id: "clear", label: workspace.t("sheetClear"), onSelect: () => setCell("") },
            { id: "copy", label: workspace.t("copy"), onSelect: copyCell },
            { id: "paste", label: workspace.t("paste"), onSelect: pasteCell },
            { id: "find", label: workspace.t("find"), hint: "Ctrl+F", onSelect: () => setDialog("find") },
          ] },
          { id: "view", label: workspace.t("menuView"), items: [
            { id: "rows", label: workspace.t("sheetFreezeRows"), onSelect: () => mapActive((sheet) => ({ ...sheet, freezeHeader: true, frozenRows: Math.max(1, selected.row + 1) })) },
            { id: "cols", label: workspace.t("sheetFreezeCols"), onSelect: () => mapActive((sheet) => ({ ...sheet, frozenCols: Math.max(1, selected.col + 1) })) },
            { id: "off", label: workspace.t("sheetUnfreeze"), onSelect: () => mapActive((sheet) => ({ ...sheet, freezeHeader: false, frozenRows: 0, frozenCols: 0 })) },
          ] },
          { id: "insert", label: workspace.t("menuInsert"), items: [
            { id: "row", label: workspace.t("rowBelow"), onSelect: () => shift("row", selected.row + 1, 1) },
            { id: "col", label: workspace.t("colRight"), onSelect: () => shift("col", selected.col + 1, 1) },
            { id: "delrow", label: workspace.t("deleteRow"), onSelect: () => shift("row", selected.row, -1) },
            { id: "delcol", label: workspace.t("deleteCol"), onSelect: () => shift("col", selected.col, -1) },
            { id: "add", label: workspace.t("sheetAdd"), onSelect: () => {
              if (file.sheets.length >= 12) return;
              update((current) => ({ ...current, active: current.sheets.length, sheets: [...current.sheets, blankSheet(`${workspace.t("navSheets")} ${current.sheets.length + 1}`)] }));
            } },
            { id: "bar", label: workspace.t("sheetChartBar"), onSelect: () => mapActive((sheet) => ({ ...sheet, charts: [...(sheet.charts ?? []), { id: createId().slice(0, 8), kind: "bar", title: workspace.t("sheetChartBar"), labelCol: 0, valueCol: selected.col, rowFrom: 0, rowTo: 7 }] })) },
            { id: "line", label: workspace.t("sheetChartLine"), onSelect: () => mapActive((sheet) => ({ ...sheet, charts: [...(sheet.charts ?? []), { id: createId().slice(0, 8), kind: "line", title: workspace.t("sheetChartLine"), labelCol: 0, valueCol: selected.col, rowFrom: 0, rowTo: 7 }] })) },
            { id: "pie", label: workspace.t("sheetChartPie"), onSelect: () => mapActive((sheet) => ({ ...sheet, charts: [...(sheet.charts ?? []), { id: createId().slice(0, 8), kind: "pie", title: workspace.t("sheetChartPie"), labelCol: 0, valueCol: selected.col, rowFrom: 0, rowTo: 7 }] })) },
            { id: "scatter", label: workspace.t("sheetChartScatter"), onSelect: () => mapActive((sheet) => ({ ...sheet, charts: [...(sheet.charts ?? []), { id: createId().slice(0, 8), kind: "scatter", title: workspace.t("sheetChartScatter"), labelCol: 0, valueCol: selected.col, rowFrom: 0, rowTo: 7 }] })) },
            { id: "area", label: workspace.t("sheetChartArea"), onSelect: () => mapActive((sheet) => ({ ...sheet, charts: [...(sheet.charts ?? []), { id: createId().slice(0, 8), kind: "area", title: workspace.t("sheetChartArea"), labelCol: 0, valueCol: selected.col, rowFrom: 0, rowTo: 7 }] })) },
            { id: "gauge", label: workspace.t("sheetChartGauge"), onSelect: () => mapActive((sheet) => ({ ...sheet, charts: [...(sheet.charts ?? []), { id: createId().slice(0, 8), kind: "gauge", title: workspace.t("sheetChartGauge"), labelCol: 0, valueCol: selected.col, rowFrom: 0, rowTo: 7 }] })) },
            { id: "image", label: workspace.t("sheetImage"), onSelect: () => imageRef.current?.click() },
            { id: "note", label: workspace.t("sheetNote"), onSelect: () => { setNoteText(active.notes?.[styleKey(selected.row, selected.col)] ?? ""); setDialog("note"); } },
          ] },
          { id: "format", label: workspace.t("menuFormat"), items: [
            { id: "bold", label: workspace.t("bold"), hint: "Ctrl+B", onSelect: () => patch({ bold: !currentStyle?.bold }) },
            { id: "num", label: workspace.t("sheetNumber"), onSelect: () => patch({ format: "number" }) },
            { id: "cur", label: workspace.t("sheetCurrency"), onSelect: () => patch({ format: "currency" }) },
            { id: "pct", label: workspace.t("sheetPercent"), onSelect: () => patch({ format: "percent" }) },
            { id: "date", label: workspace.t("sheetDate"), onSelect: () => patch({ format: "date" }) },
            { id: "gen", label: workspace.t("sheetGeneral"), onSelect: () => patch({ format: "general" }) },
            { id: "left", label: workspace.t("alignLeft"), onSelect: () => patch({ align: "left" }) },
            { id: "center", label: workspace.t("alignCenter"), onSelect: () => patch({ align: "center" }) },
            { id: "right", label: workspace.t("alignRight"), onSelect: () => patch({ align: "right" }) },
            { id: "border", label: workspace.t("sheetBorder"), onSelect: () => patch({ border: !currentStyle?.border }) },
            { id: "wrap", label: workspace.t("sheetWrap"), onSelect: () => patch({ wrap: !currentStyle?.wrap }) },
            { id: "merge", label: workspace.t("mergeCells"), onSelect: mergeSelection },
            { id: "split", label: workspace.t("splitCell"), onSelect: () => mapActive((sheet) => ({ ...sheet, styles: unmerge(sheet.styles ?? {}, selected.row, selected.col) })) },
            { id: "sort", label: workspace.t("sheetSort"), onSelect: () => mapActive((sheet) => ({ ...sheet, cells: sortGrid(sheet.cells, selected.col, "asc", (sheet.frozenRows ?? (sheet.freezeHeader ? 1 : 0)) > 0, book) })) },
            { id: "sortd", label: workspace.t("sheetSortDesc"), onSelect: () => mapActive((sheet) => ({ ...sheet, cells: sortGrid(sheet.cells, selected.col, "desc", (sheet.frozenRows ?? 0) > 0, book) })) },
            { id: "scale", label: workspace.t("sheetScale"), onSelect: () => mapActive((sheet) => ({ ...sheet, conditional: [...(sheet.conditional ?? []).filter((item) => item.col !== selected.col), { id: createId().slice(0, 8), col: selected.col, op: "scale", value: "", fill: "#0b5d36" }] })) },
          ] },
          { id: "tools", label: workspace.t("menuTools"), items: [
            { id: "filter", label: workspace.t("sheetFilter"), onSelect: () => {
              setFormatOpen(true);
              window.setTimeout(() => document.getElementById("ow-sheet-filter")?.focus(), 0);
            } },
            { id: "name", label: workspace.t("sheetNamedRange"), onSelect: () => mapActive((sheet) => {
              const used = new Set((sheet.names ?? []).map((item) => item.name.toLowerCase()));
              let name = "Rango";
              let index = 1;
              while (used.has(name.toLowerCase())) {
                index += 1;
                name = `Rango${index}`;
              }
              return { ...sheet, names: [...(sheet.names ?? []), { name, ref: cellRef(selected.row, selected.col) }].slice(0, 20) };
            }) },
            { id: "view", label: workspace.t("sheetFilterView"), onSelect: () => mapActive((sheet) => ({
              ...sheet,
              filterViews: [...(sheet.filterViews ?? []), { name: `${workspace.t("sheetFilterView")} ${(sheet.filterViews ?? []).length + 1}`.slice(0, 40), query: sheet.filter ?? "" }].slice(0, 12),
            })) },
            ...(active?.filterViews ?? []).map((view) => ({
              id: `view-${view.name}`,
              label: view.name,
              onSelect: () => setSheetFilter(view.query),
            })),
            { id: "valid", label: workspace.t("sheetValidation"), onSelect: () => setDialog("valid") },
            { id: "cond", label: workspace.t("sheetConditional"), onSelect: () => setDialog("cond") },
            { id: "fill", label: workspace.t("sheetAutofill"), onSelect: () => mapActive((sheet) => ({ ...sheet, cells: autofill(sheet.cells, selected.row, selected.col, 3, true) })) },
            { id: "pivot", label: workspace.t("sheetPivot"), onSelect: () => {
              if (file.sheets.length >= 12) return;
              const grid = pivotGrid(active.cells, selected.col);
              update((current) => ({ ...current, active: current.sheets.length, sheets: [...current.sheets, { ...blankSheet(workspace.t("sheetPivot")), cells: grid, freezeHeader: true, frozenRows: 1 }] }));
            } },
            { id: "macro", label: workspace.t("sheetMacro"), onSelect: () => mapActive((sheet) => ({ ...sheet, macro: { ...(sheet.styles ?? {})[styleKey(selected.row, selected.col)] } })) },
            { id: "macroRun", label: workspace.t("sheetMacroRun"), onSelect: () => {
              if (!active.macro) return;
              mapActive((sheet) => ({ ...sheet, styles: paintStyle(sheet.styles ?? {}, selected.row, selected.col, sheet.macro ?? {}) }));
            } },
          ] },
          { id: "help", label: workspace.t("menuHelp"), items: [
            { id: "limit", label: workspace.t("shortcuts"), onSelect: () => setDialog("help") },
            { id: "version", label: workspace.t("appVersion", { version: APP_VERSION }), static: true },
          ] },
        ]}
      />
      </div>
      {!phone || formatOpen ? (
      <div className={`ow-sheet-tools${phone ? " is-sheet" : ""}`} role="toolbar" aria-label={workspace.t("menuFormat")}>
        <Button aria-pressed={currentStyle?.bold === true} onClick={() => patch({ bold: !currentStyle?.bold })}>{workspace.t("bold")}</Button>
        {(["number", "currency", "percent", "date"] as CellFormatKind[]).map((format) => (
          <Button key={format} aria-pressed={currentStyle?.format === format} onClick={() => patch({ format })}>
            {workspace.t(format === "number" ? "sheetNumber" : format === "currency" ? "sheetCurrency" : format === "percent" ? "sheetPercent" : "sheetDate")}
          </Button>
        ))}
        <div className="ow-swatches" role="group" aria-label={workspace.t("cellColor")}>
          {FILLS.map((fill) => (
            <button key={fill} type="button" className="ow-swatch" style={{ background: fill }} aria-label={fill} aria-pressed={currentStyle?.fill === fill} onClick={() => patch({ fill })} />
          ))}
        </div>
        <div className="ow-swatches" role="group" aria-label={workspace.t("sheetInk")}>
          {INKS.map((color) => (
            <button key={color} type="button" className="ow-swatch" style={{ background: color }} aria-label={color} aria-pressed={currentStyle?.color === color} onClick={() => patch({ color })} />
          ))}
        </div>
        <div className="ow-row ow-sheet-extra">
          <Input id="ow-sheet-filter" label={workspace.t("sheetFilter")} value={filter} onChange={(event) => setSheetFilter(event.target.value)} />
          <label className="ow-file">
            <input
              aria-label={workspace.t("import")}
              type="file"
              accept=".csv,.xlsx,text/csv"
              onChange={(event) => {
                const picked = event.target.files?.[0];
                event.target.value = "";
                if (!picked) return;
                void picked.arrayBuffer().then(async (buffer) => {
                  const bytes = new Uint8Array(buffer);
                  const imported: SheetTab[] = picked.name.toLowerCase().endsWith(".xlsx")
                    ? await xlsxToSheets(bytes)
                    : [{ name: active.name, cells: csvToGrid(new TextDecoder().decode(bytes)), freezeHeader: true }];
                  update((current) => ({ ...current, sheets: imported, active: 0 }));
                }).catch(workspace.reportError);
              }}
            />
            <span className="ow-button ow-button-secondary">{workspace.t("import")}</span>
          </label>
        </div>
      </div>
      ) : null}
      <div className="ow-formula">
        <span className="ow-namebox" aria-label={workspace.t("nameBox")}>{cellRef(selected.row, selected.col)}</span>
        <span className="ow-fx" aria-hidden="true">fx</span>
        <Input label={workspace.t("sheetFormula")} placeholder={workspace.t("sheetFormula")} value={raw} onChange={(event) => setCell(event.target.value)} />
        {options.length > 0 ? (
          <label className="ow-field">
            {workspace.t("sheetValidation")}
            <select aria-label={workspace.t("sheetValidation")} value={options.includes(raw) ? raw : ""} onChange={(event) => setCell(event.target.value)}>
              <option value="">{workspace.t("sheetValidation")}</option>
              {options.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
        ) : null}
        {cellRule?.kind === "check" ? (
          <label className="ow-check">
            <input type="checkbox" aria-label={workspace.t("sheetCheck")} checked={raw === "TRUE"} onChange={(event) => setCell(event.target.checked ? "TRUE" : "FALSE")} />
            {workspace.t("sheetCheck")}
          </label>
        ) : null}
        {cellRule?.kind === "date" ? <Input label={workspace.t("sheetDate")} type="date" value={/^\d{4}-\d{2}-\d{2}/.test(raw) ? raw.slice(0, 10) : ""} onChange={(event) => setCell(event.target.value)} /> : null}
        {cellRule?.kind === "range" ? <Input label={workspace.t("sheetRange")} type="number" min={cellRule.min} max={cellRule.max} value={raw} onChange={(event) => setCell(event.target.value)} /> : null}
      </div>
      <div
        ref={wrapRef}
        className="ow-sheet-wrap"
        tabIndex={0}
        onScroll={(event) => {
          const node = event.currentTarget;
          setWin({ top: node.scrollTop, left: node.scrollLeft, ...paneSize(node) });
        }}
        onKeyDown={(event) => {
          if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement) return;
          const key = event.key.toLowerCase();
          if ((event.ctrlKey || event.metaKey) && key === "b") {
            event.preventDefault();
            patch({ bold: !currentStyle?.bold });
          } else if ((event.ctrlKey || event.metaKey) && key === "c") copyCell();
          else if ((event.ctrlKey || event.metaKey) && key === "v") pasteCell();
          else if ((event.ctrlKey || event.metaKey) && key === "f") {
            event.preventDefault();
            setDialog("find");
          } else if (event.key === "ArrowUp") moveSelection(-1, 0);
          else if (event.key === "ArrowDown") moveSelection(1, 0);
          else if (event.key === "ArrowLeft") moveSelection(0, -1);
          else if (event.key === "ArrowRight") moveSelection(0, 1);
          else return;
          event.preventDefault();
        }}
      >
        <div className="ow-sheet-cols" style={{ width: gridWidth }}>
          <div className="ow-sheet-gutter" style={{ width: GUTTER, height: HEAD }} />
          {Array.from({ length: COL_COUNT }, (_, col) => (
            <div key={columnLabel(col)} className={`ow-vcol${selected.col === col ? " is-selected" : ""}`} style={{ width: COL_W, height: HEAD }}>{columnLabel(col)}</div>
          ))}
        </div>
        {pinned.map((rowIndex) => (
          <div key={`pin-${rowIndex}`} className="ow-frozen" style={{ width: gridWidth, height: ROW_H, paddingLeft: GUTTER, top: HEAD + rowIndex * ROW_H }}>
            <div className="ow-vrow ow-vrow-pin" style={{ width: GUTTER, height: ROW_H, left: win.left }}>{rowIndex + 1}</div>
            <div className="ow-frozen-cells" style={{ width: COL_COUNT * COL_W, height: ROW_H }}>
              {columns(0, colEnd, rowIndex, null)}
              {bounds.r2 === rowIndex ? rangeHandle : null}
            </div>
          </div>
        ))}
        <div className="ow-sheet-body" style={{ width: gridWidth, height: Math.max(bodyRows.length, 1) * ROW_H }}>
          {bodyRows.slice(rowStart, rowEnd).map((rowIndex, offset) => {
            const top = (rowStart + offset) * ROW_H;
            return (
              <div key={rowIndex}>
                <div className={`ow-vrow ow-vrow-pin${selected.row === rowIndex ? " is-selected" : ""}`} style={{ top, left: win.left, width: GUTTER, height: ROW_H }}>{rowIndex + 1}</div>
                {frozenCols > 0 ? (
                  <div className="ow-pin-cols" style={{ top, left: win.left + GUTTER, width: frozenCols * COL_W, height: ROW_H }}>
                    {Array.from({ length: frozenCols }, (_, col) => cellButton(rowIndex, col, null))}
                  </div>
                ) : null}
                {columns(colStart, colEnd, rowIndex, top)}
              </div>
            );
          })}
          {bounds.r2 >= frozenRows ? rangeHandle : null}
        </div>
      </div>
      <aside className="ow-sheet-charts">
      {(active.charts ?? []).map((chart) => {
        const series = chartSeries(active.cells, chart, book);
        return (
          <section key={chart.id} className="ow-chart-panel" aria-label={chart.title}>
            <OrvupiChart kind={chart.kind} title={chart.title} labels={series.labels} values={series.values} />
          </section>
        );
      })}
      </aside>
      <div className="ow-sheet-tabs">
        <div role="tablist" aria-label={workspace.t("navSheets")}>
          {file.sheets.map((sheet, index) => (
            <button key={`${sheet.name}-${index}`} type="button" role="tab" aria-selected={index === file.active} className="ow-button" onClick={() => update((current) => ({ ...current, active: index }))}>
              {sheet.name}
            </button>
          ))}
        </div>
        <Button onClick={() => {
          if (file.sheets.length >= 12) return;
          update((current) => ({ ...current, active: current.sheets.length, sheets: [...current.sheets, blankSheet(`${workspace.t("navSheets")} ${current.sheets.length + 1}`)] }));
        }}>{workspace.t("sheetAdd")}</Button>
      </div>
      <Modal open={dialog === "find"} title={workspace.t("find")} onClose={() => setDialog("")} footer={<Button onClick={() => setDialog("")}>{workspace.t("closeDialog")}</Button>}>
        <Input label={workspace.t("find")} value={findQuery} onChange={(event) => setFindQuery(event.target.value)} />
        <Input label={workspace.t("replace")} value={replaceQuery} onChange={(event) => setReplaceQuery(event.target.value)} />
        <Button variant="primary" onClick={() => {
          const found = replaceInGrid(active.cells, findQuery, replaceQuery, book);
          mapActive((sheet) => ({ ...sheet, cells: found.cells }));
        }}>{workspace.t("replace")}</Button>
      </Modal>
      <Modal open={dialog === "valid"} title={workspace.t("sheetValidation")} onClose={() => setDialog("")} footer={<Button onClick={() => setDialog("")}>{workspace.t("closeDialog")}</Button>}>
        <label className="ow-field">
          {workspace.t("chipType")}
          <select aria-label={workspace.t("chipType")} value={validKind} onChange={(event) => setValidKind(event.target.value as typeof validKind)}>
            <option value="list">{workspace.t("sheetValidation")}</option>
            <option value="check">{workspace.t("sheetCheck")}</option>
            <option value="date">{workspace.t("sheetDate")}</option>
            <option value="range">{workspace.t("sheetRange")}</option>
            <option value="formula">{workspace.t("sheetFormulaRule")}</option>
          </select>
        </label>
        {validKind === "list" ? <Input label={workspace.t("sheetOptions")} value={validText} onChange={(event) => setValidText(event.target.value)} /> : null}
        {validKind === "formula" ? <Input label={workspace.t("sheetFormulaRule")} value={validText} onChange={(event) => setValidText(event.target.value)} /> : null}
        {validKind === "range" ? (
          <>
            <Input id="ow-range-min" label={workspace.t("sheetRange")} value={rangeMin} onChange={(event) => setRangeMin(event.target.value)} />
            <Input id="ow-range-max" label={workspace.t("sheetRange")} value={rangeMax} onChange={(event) => setRangeMax(event.target.value)} />
          </>
        ) : null}
        <Button variant="primary" onClick={() => {
          const list = validText.split(",").map((item) => item.trim()).filter(Boolean).slice(0, 20);
          const rule = validKind === "list"
            ? { kind: "list" as const, options: list }
            : validKind === "range"
              ? { kind: "range" as const, min: Number(rangeMin) || 0, max: Number(rangeMax) || 0 }
              : validKind === "formula"
                ? { kind: "formula" as const, expr: validText.replace(/^=/, "").slice(0, 120) }
                : { kind: validKind };
          mapActive((sheet) => ({ ...sheet, validation: { ...(sheet.validation ?? {}), [styleKey(selected.row, selected.col)]: rule } }));
          setDialog("");
        }}>{workspace.t("sheetApply")}</Button>
      </Modal>
      <Modal open={dialog === "cond"} title={workspace.t("sheetConditional")} onClose={() => setDialog("")} footer={<Button onClick={() => setDialog("")}>{workspace.t("closeDialog")}</Button>}>
        <Input label={workspace.t("sheetConditional")} value={condValue} onChange={(event) => setCondValue(event.target.value)} />
        <Button variant="primary" onClick={() => {
          const rule: CondRule = { id: createId().slice(0, 8), col: selected.col, op: "gt", value: condValue, fill: "#fff4b8" };
          mapActive((sheet) => ({ ...sheet, conditional: [...(sheet.conditional ?? []).filter((item) => item.col !== selected.col), rule] }));
          setDialog("");
        }}>{workspace.t("sheetApply")}</Button>
      </Modal>
      <Modal open={dialog === "note"} title={workspace.t("sheetNote")} onClose={() => setDialog("")} footer={<Button onClick={() => setDialog("")}>{workspace.t("closeDialog")}</Button>}>
        <Input label={workspace.t("sheetNote")} value={noteText} onChange={(event) => setNoteText(event.target.value)} />
        <Button variant="primary" onClick={() => {
          mapActive((sheet) => ({ ...sheet, notes: { ...(sheet.notes ?? {}), [styleKey(selected.row, selected.col)]: noteText.slice(0, 240) } }));
          setDialog("");
        }}>{workspace.t("sheetApply")}</Button>
      </Modal>
      <input
        ref={imageRef}
        className="ow-sr"
        aria-label={workspace.t("sheetImage")}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp"
        onChange={(event) => {
          const picked = event.target.files?.[0];
          event.target.value = "";
          if (!picked || picked.size > 80_000) return;
          const reader = new FileReader();
          reader.onload = () => {
            const src = typeof reader.result === "string" ? reader.result : "";
            if (!src.startsWith("data:image/") || src.length > 120_000) return;
            mapActive((sheet) => ({ ...sheet, images: { ...(sheet.images ?? {}), [styleKey(selected.row, selected.col)]: src } }));
          };
          reader.readAsDataURL(picked);
        }}
      />
      <Modal open={dialog === "help"} title={workspace.t("shortcuts")} onClose={() => setDialog("")} footer={<Button onClick={() => setDialog("")}>{workspace.t("closeDialog")}</Button>}>
        <p>{workspace.t("sheetLimit")}</p>
        <p>{workspace.t("sheetHelp")}</p>
      </Modal>
      {error ? <p role="alert">{error}</p> : null}
    </div>
  );
}
