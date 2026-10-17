import { useEffect, useMemo, useState } from "react";
import { useWorkspace } from "../app/workspace";
import { downloadBytes } from "../security/bytes";
import { fileNameWithExtension } from "../security/names";
import { Button, Input, Select } from "../ui/kit";
import { csvToGrid, gridToCsv } from "./csv";
import { COL_COUNT, cellRef, columnLabel, displayGrid, sortGrid } from "./formulas";
import { parseSheet, serializeSheet, type SheetFile, type SheetTab } from "./model";
import { sheetsToXlsx, xlsxToSheets } from "./xlsx";

export function SheetsScreen() {
  const workspace = useWorkspace();
  const sheets = workspace.files.filter((file) => file.deletedAt === null && file.kind === "sheet");
  const [file, setFile] = useState<SheetFile | null>(null);
  const [status, setStatus] = useState<"saved" | "pending">("saved");
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState({ row: 0, col: 0 });
  const [error, setError] = useState("");

  useEffect(() => {
    if (!workspace.openSheetId || !workspace.storage) {
      setFile(null);
      return;
    }
    const id = workspace.openSheetId;
    let cancel = false;
    workspace.storage
      .loadFile(id)
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
  const shown = useMemo(() => (active ? displayGrid(active.cells) : []), [active]);
  const raw = active?.cells[selected.row]?.[selected.col] ?? "";

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

  return (
    <div className="ow-page" data-tool="sheets">
      <div className="ow-row">
        <h1>{file.title}</h1>
        <p role="status">{status === "saved" ? workspace.t("statusSaved") : workspace.t("statusPending")}</p>
      </div>
      <p className="ow-muted">{workspace.t("sheetLimit")}</p>
      <Input label={workspace.t("sheetFormula")} value={raw} onChange={(event) => setCell(event.target.value)} />
      <div className="ow-row">
        <Button
          aria-pressed={active.freezeHeader}
          onClick={() => update((current) => ({
            ...current,
            sheets: current.sheets.map((sheet, index) => (index === current.active ? { ...sheet, freezeHeader: !sheet.freezeHeader } : sheet)),
          }))}
        >
          {workspace.t("sheetFreeze")}
        </Button>
        <Button
          onClick={() => update((current) => ({
            ...current,
            sheets: current.sheets.map((sheet, index) => (index === current.active ? { ...sheet, cells: sortGrid(sheet.cells, selected.col, "asc", sheet.freezeHeader) } : sheet)),
          }))}
        >
          {workspace.t("sheetSort")}
        </Button>
        <Input label={workspace.t("sheetFilter")} value={filter} onChange={(event) => setFilter(event.target.value)} />
        <Button onClick={() => downloadBytes(new TextEncoder().encode(gridToCsv(active.cells)), fileNameWithExtension(file.title, "csv"), "text/csv")}>{workspace.t("sheetCsv")}</Button>
        <Button onClick={() => downloadBytes(sheetsToXlsx(file.sheets), fileNameWithExtension(file.title, "xlsx"), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}>{workspace.t("sheetXlsx")}</Button>
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
      <div className="ow-row" role="tablist" aria-label={workspace.t("navSheets")}>
        {file.sheets.map((sheet, index) => (
          <button key={`${sheet.name}-${index}`} type="button" className="ow-button" aria-pressed={index === file.active} onClick={() => update((current) => ({ ...current, active: index }))}>
            {sheet.name}
          </button>
        ))}
        <Button
          onClick={() => {
            if (file.sheets.length >= 12) return;
            update((current) => {
              const blank = current.sheets[current.active]?.cells.map((row) => row.map(() => "")) ?? [];
              return {
                ...current,
                active: current.sheets.length,
                sheets: [...current.sheets, { name: `${workspace.t("navSheets")} ${current.sheets.length + 1}`, cells: blank, freezeHeader: true }],
              };
            });
          }}
        >
          {workspace.t("sheetAdd")}
        </Button>
      </div>
      <div className="ow-sheet-wrap">
        <table className="ow-sheet">
          <thead>
            <tr>
              <th />
              {Array.from({ length: COL_COUNT }, (_, col) => <th key={columnLabel(col)}>{columnLabel(col)}</th>)}
            </tr>
          </thead>
          <tbody>
            {shown.map((row, rowIndex) => {
              const hidden = filter.trim() !== "" && !(active.freezeHeader && rowIndex === 0) && !row.some((cell) => cell.toLowerCase().includes(filter.trim().toLowerCase()));
              if (hidden) return null;
              return (
                <tr key={rowIndex}>
                  <th className={active.freezeHeader && rowIndex === 0 ? "is-frozen" : undefined}>{rowIndex + 1}</th>
                  {row.map((cell, colIndex) => (
                    <td key={cellRef(rowIndex, colIndex)} className={active.freezeHeader && rowIndex === 0 ? "is-frozen" : undefined}>
                      <button
                        type="button"
                        aria-label={cellRef(rowIndex, colIndex)}
                        aria-pressed={selected.row === rowIndex && selected.col === colIndex}
                        onClick={() => setSelected({ row: rowIndex, col: colIndex })}
                      >
                        {cell || " "}
                      </button>
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
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
