import { useEffect, useMemo, useState } from "react";
import { useWorkspace } from "../app/workspace";
import { loadFileWhenReady } from "../routing/load";
import { downloadBytes } from "../security/bytes";
import { fileNameWithExtension } from "../security/names";
import { Button, Input, Select } from "../ui/kit";
import { MenuBar } from "../ui/menus";
import { csvToGrid, gridToCsv } from "./csv";
import { COL_COUNT, ROW_COUNT, cellRef, columnLabel, displayCell, emptyGrid, sortGrid } from "./formulas";
import { parseSheet, serializeSheet, type SheetFile, type SheetTab } from "./model";
import { sheetsToXlsx, xlsxToSheets } from "./xlsx";

const GUTTER = 46;
const HEAD = 28;
const ROW_H = 30;
const COL_W = 92;

export function SheetsScreen() {
  const workspace = useWorkspace();
  const sheets = workspace.files.filter((file) => file.deletedAt === null && file.kind === "sheet");
  const [file, setFile] = useState<SheetFile | null>(null);
  const [status, setStatus] = useState<"saved" | "pending">("saved");
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState({ row: 0, col: 0 });
  const [error, setError] = useState("");
  const [win, setWin] = useState({ top: 0, left: 0, height: 520, width: 960 });

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
        })
        .then(() => workspace.refreshFiles())
        .then(() => setStatus("saved"))
        .catch(workspace.reportError);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [file, status, workspace.storage, workspace.refreshFiles, workspace.reportError]);

  const active = file?.sheets[file.active];
  const raw = active?.cells[selected.row]?.[selected.col] ?? "";
  const rowIndexes = useMemo(() => {
    if (!active) return [];
    const query = filter.trim().toLowerCase();
    const indexes: number[] = [];
    for (let row = 0; row < active.cells.length; row += 1) {
      if (!query || (active.freezeHeader && row === 0)) {
        indexes.push(row);
        continue;
      }
      const line = active.cells[row] ?? [];
      const hit = line.some((value, col) => {
        if (value.toLowerCase().includes(query)) return true;
        return value.startsWith("=") && displayCell(active.cells, row, col).toLowerCase().includes(query);
      });
      if (hit) indexes.push(row);
    }
    return indexes;
  }, [active, filter]);

  function update(mutator: (current: SheetFile) => SheetFile) {
    setFile((current) => (current ? mutator(current) : current));
    setStatus("pending");
  }

  function setCell(value: string) {
    update((current) => {
      const sheetsNext = current.sheets.map((sheet, index) => {
        if (index !== current.active) return sheet;
        const cells = sheet.cells.map((row) => [...row]);
        cells[selected.row]![selected.col] = value.slice(0, 500);
        return { ...sheet, cells };
      });
      return { ...current, sheets: sheetsNext };
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

  if (!file || !active) return <p>{error || workspace.t("preparing")}</p>;

  const frozen = active.freezeHeader && rowIndexes[0] === 0;
  const bodyRows = frozen ? rowIndexes.slice(1) : rowIndexes;
  const headBlock = HEAD + (frozen ? ROW_H : 0);
  const bodyScroll = Math.max(0, win.top - headBlock);
  const rowStart = Math.max(0, Math.floor(bodyScroll / ROW_H) - 2);
  const rowEnd = Math.min(bodyRows.length, rowStart + Math.ceil(win.height / ROW_H) + 6);
  const colStart = Math.max(0, Math.floor(win.left / COL_W) - 1);
  const colEnd = Math.min(COL_COUNT, Math.ceil((win.left + win.width) / COL_W) + 2);
  const gridWidth = GUTTER + COL_COUNT * COL_W;

  function cellButton(rowIndex: number, colIndex: number, top: number | null) {
    const label = cellRef(rowIndex, colIndex);
    const shown = displayCell(active!.cells, rowIndex, colIndex);
    return (
      <button
        key={label}
        type="button"
        className="ow-cell"
        aria-label={shown ? `${label} ${shown}` : label}
        aria-pressed={selected.row === rowIndex && selected.col === colIndex}
        style={{ top: top ?? 0, left: (top === null ? 0 : GUTTER) + colIndex * COL_W, width: COL_W, height: ROW_H }}
        onClick={() => setSelected({ row: rowIndex, col: colIndex })}
      >
        {shown}
      </button>
    );
  }

  return (
    <div className="ow-page ow-sheet-page" data-tool="sheets">
      <h1 className="ow-sr">{file.title}</h1>
      <div className="ow-row">
        <Input label={workspace.t("fileName")} value={file.title} onChange={(event) => update((current) => ({ ...current, title: event.target.value.slice(0, 180) }))} />
        <p role="status">{status === "saved" ? workspace.t("statusSaved") : workspace.t("statusPending")}</p>
      </div>
      <MenuBar
        label={workspace.t("menuBar")}
        menus={[
          { id: "file", label: workspace.t("menuFile"), items: [
            { id: "csv", label: workspace.t("sheetCsv"), onSelect: () => downloadBytes(new TextEncoder().encode(gridToCsv(active.cells)), fileNameWithExtension(file.title, "csv"), "text/csv") },
            { id: "xlsx", label: workspace.t("sheetXlsx"), onSelect: () => downloadBytes(sheetsToXlsx(file.sheets), fileNameWithExtension(file.title, "xlsx"), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") },
          ] },
          { id: "edit", label: workspace.t("menuEdit"), items: [
            { id: "clear", label: workspace.t("sheetClear"), onSelect: () => setCell("") },
          ] },
          { id: "view", label: workspace.t("menuView"), items: [
            { id: "freeze", label: workspace.t("sheetFreeze"), onSelect: () => update((current) => ({ ...current, sheets: current.sheets.map((sheet, index) => (index === current.active ? { ...sheet, freezeHeader: !sheet.freezeHeader } : sheet)) })) },
          ] },
          { id: "insert", label: workspace.t("menuInsert"), items: [
            { id: "add", label: workspace.t("sheetAdd"), onSelect: () => {
              if (file.sheets.length >= 12) return;
              update((current) => ({
                ...current,
                active: current.sheets.length,
                sheets: [...current.sheets, { name: `${workspace.t("navSheets")} ${current.sheets.length + 1}`, cells: emptyGrid(), freezeHeader: true }],
              }));
            } },
          ] },
          { id: "format", label: workspace.t("menuFormat"), items: [
            { id: "sort", label: workspace.t("sheetSort"), onSelect: () => update((current) => ({ ...current, sheets: current.sheets.map((sheet, index) => (index === current.active ? { ...sheet, cells: sortGrid(sheet.cells, selected.col, "asc", sheet.freezeHeader) } : sheet)) })) },
          ] },
          { id: "tools", label: workspace.t("menuTools"), items: [
            { id: "filter", label: workspace.t("sheetFilter"), onSelect: () => document.getElementById("ow-sheet-filter")?.focus() },
          ] },
          { id: "help", label: workspace.t("menuHelp"), items: [
            { id: "limit", label: workspace.t("sheetLimit"), onSelect: () => workspace.pushToast(workspace.t("sheetLimit")) },
          ] },
        ]}
      />
      <div className="ow-formula">
        <span className="ow-namebox" aria-label={workspace.t("nameBox")}>{cellRef(selected.row, selected.col)}</span>
        <span className="ow-fx" aria-hidden="true">fx</span>
        <Input label={workspace.t("sheetFormula")} value={raw} onChange={(event) => setCell(event.target.value)} />
      </div>
      <div className="ow-row">
        <Input id="ow-sheet-filter" label={workspace.t("sheetFilter")} value={filter} onChange={(event) => setFilter(event.target.value)} />
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
      <div
        className="ow-sheet-wrap"
        onScroll={(event) => {
          const node = event.currentTarget;
          setWin({ top: node.scrollTop, left: node.scrollLeft, height: node.clientHeight, width: node.clientWidth });
        }}
        onKeyDown={(event) => {
          if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
          if (event.key === "ArrowUp") moveSelection(-1, 0);
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
        {frozen ? (
          <div className="ow-frozen" style={{ width: gridWidth, height: ROW_H, paddingLeft: GUTTER }}>
            <div className="ow-vrow ow-vrow-pin" style={{ width: GUTTER, height: ROW_H, left: win.left }}>1</div>
            <div className="ow-frozen-cells" style={{ width: COL_COUNT * COL_W, height: ROW_H }}>
              {Array.from({ length: colEnd - colStart }, (_, offset) => cellButton(0, colStart + offset, null))}
            </div>
          </div>
        ) : null}
        <div className="ow-sheet-body" style={{ width: gridWidth, height: Math.max(bodyRows.length, 1) * ROW_H }}>
          {bodyRows.slice(rowStart, rowEnd).map((rowIndex, offset) => {
            const top = (rowStart + offset) * ROW_H;
            return (
              <div key={rowIndex}>
                <div className="ow-vrow ow-vrow-pin" style={{ top, left: win.left, width: GUTTER, height: ROW_H }}>{rowIndex + 1}</div>
                {Array.from({ length: colEnd - colStart }, (_, colOffset) => cellButton(rowIndex, colStart + colOffset, top))}
              </div>
            );
          })}
        </div>
      </div>
      <div className="ow-sheet-tabs">
        <div role="tablist" aria-label={workspace.t("navSheets")}>
          {file.sheets.map((sheet, index) => (
            <button key={`${sheet.name}-${index}`} type="button" role="tab" aria-selected={index === file.active} className="ow-button" onClick={() => update((current) => ({ ...current, active: index }))}>
              {sheet.name}
            </button>
          ))}
        </div>
        <Button
          onClick={() => {
            if (file.sheets.length >= 12) return;
            update((current) => ({
              ...current,
              active: current.sheets.length,
              sheets: [...current.sheets, { name: `${workspace.t("navSheets")} ${current.sheets.length + 1}`, cells: emptyGrid(), freezeHeader: true }],
            }));
          }}
        >
          {workspace.t("sheetAdd")}
        </Button>
      </div>
      <Select
        id="ow-sheet-preset"
        label={workspace.t("sheetPreset")}
        value=""
        onChange={(event) => {
          if (event.target.value) setCell(event.target.value);
        }}
      >
        <option value="">{workspace.t("sheetPreset")}</option>
        <option value="=SUMA(A1:A10)">=SUMA(A1:A10)</option>
        <option value="=PROMEDIO(A1:A10)">=PROMEDIO(A1:A10)</option>
        <option value="=MIN(A1:A10)">=MIN(A1:A10)</option>
        <option value="=MAX(A1:A10)">=MAX(A1:A10)</option>
        <option value="=CONTAR(A1:A10)">=CONTAR(A1:A10)</option>
        <option value='=SI(A1>10,"alto","bajo")'>=SI(A1&gt;10,"alto","bajo")</option>
      </Select>
      {error ? <p role="alert">{error}</p> : null}
    </div>
  );
}
