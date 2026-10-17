export const COL_COUNT = 32;
export const ROW_COUNT = 1000;

export type CellAddr = { row: number; col: number; sheet?: string };

export type CellValue =
  | { kind: "num"; value: number }
  | { kind: "text"; value: string }
  | { kind: "bool"; value: boolean }
  | { kind: "err"; value: string }
  | { kind: "range"; cells: CellAddr[] };

export type FormulaBook = {
  sheets: Array<{ name: string; cells: string[][] }>;
  active: number;
};

const err = (value: string): CellValue => ({ kind: "err", value });

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return "#VALOR!";
  const rounded = Math.round(value * 1e10) / 1e10;
  return String(rounded);
}

export function columnLabel(index: number): string {
  let n = index + 1;
  let label = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    label = String.fromCharCode(65 + rem) + label;
    n = Math.floor((n - 1) / 26);
  }
  return label;
}

export function cellRef(row: number, col: number): string {
  return `${columnLabel(col)}${row + 1}`;
}

export function emptyGrid(): string[][] {
  return Array.from({ length: ROW_COUNT }, () => Array.from({ length: COL_COUNT }, () => ""));
}

export function parseCellRef(token: string): { row: number; col: number } | null {
  const match = /^\$?([A-Z]{1,3})\$?([1-9][0-9]*)$/i.exec(token.trim());
  if (!match?.[1] || !match[2]) return null;
  let col = 0;
  for (const char of match[1].toUpperCase()) col = col * 26 + char.charCodeAt(0) - 64;
  col -= 1;
  const row = Number(match[2]) - 1;
  if (col < 0 || col >= COL_COUNT || row < 0 || row >= ROW_COUNT) return null;
  return { row, col };
}

function columnIndex(label: string): number {
  let col = 0;
  for (const char of label.toUpperCase()) col = col * 26 + char.charCodeAt(0) - 64;
  return col - 1;
}

export function displayGrid(grid: string[][], book?: FormulaBook): string[][] {
  return grid.map((row, rowIndex) => row.map((_, colIndex) => displayCell(grid, rowIndex, colIndex, new Set(), book)));
}

export function displayCell(
  grid: string[][],
  row: number,
  col: number,
  stack = new Set<string>(),
  book?: FormulaBook,
  sheetName?: string,
): string {
  const raw = grid[row]?.[col] ?? "";
  if (!raw.startsWith("=")) return raw;
  const name = sheetName ?? book?.sheets[book.active]?.name ?? "";
  const key = `${name}:${row}:${col}`;
  if (stack.has(key)) return "#CICLO!";
  stack.add(key);
  const value = evaluateFormula(raw.slice(1), (ref) => {
    if (ref.sheet) {
      const found = book?.sheets.find((sheet) => sheet.name.toLowerCase() === ref.sheet?.toLowerCase());
      if (!found) return "#REF!";
      return displayCell(found.cells, ref.row, ref.col, stack, book, found.name);
    }
    return displayCell(grid, ref.row, ref.col, stack, book, name);
  });
  stack.delete(key);
  return formatValue(value);
}

function formatValue(value: CellValue): string {
  if (value.kind === "num") return formatNumber(value.value);
  if (value.kind === "bool") return value.value ? "TRUE" : "FALSE";
  if (value.kind === "err") return value.value;
  if (value.kind === "range") return "#VALOR!";
  return value.value;
}

function asNumber(value: CellValue): CellValue {
  if (value.kind === "num") return value;
  if (value.kind === "text" && value.value.trim() !== "" && Number.isFinite(Number(value.value))) {
    return { kind: "num", value: Number(value.value) };
  }
  if (value.kind === "bool") return { kind: "num", value: value.value ? 1 : 0 };
  if (value.kind === "err") return value;
  return err("#VALOR!");
}

function scalar(arg: CellValue | undefined, resolve: (addr: CellAddr) => CellValue): CellValue {
  if (!arg) return err("#VALOR!");
  if (arg.kind === "err") return arg;
  if (arg.kind !== "range") return arg;
  if (arg.cells.length !== 1) return err("#VALOR!");
  return resolve(arg.cells[0]!);
}

function listed(args: CellValue[], resolve: (addr: CellAddr) => CellValue): CellValue[] | CellValue {
  const values: CellValue[] = [];
  for (const arg of args) {
    if (arg.kind === "err") return arg;
    if (arg.kind === "range") {
      for (const addr of arg.cells) {
        const cell = resolve(addr);
        if (cell.kind === "err") return cell;
        values.push(cell);
      }
    } else values.push(arg);
  }
  return values;
}

function numbersOf(args: CellValue[], resolve: (addr: CellAddr) => CellValue): number[] | CellValue {
  const values = listed(args, resolve);
  if (!Array.isArray(values)) return values;
  const numbers: number[] = [];
  for (const cell of values) {
    if (cell.kind === "num") numbers.push(cell.value);
    else if (cell.kind === "bool") numbers.push(cell.value ? 1 : 0);
    else if (cell.kind === "text" && cell.value.trim() !== "" && Number.isFinite(Number(cell.value))) numbers.push(Number(cell.value));
  }
  return numbers;
}

function textOf(value: CellValue): string | CellValue {
  if (value.kind === "err" || value.kind === "range") return value.kind === "err" ? value : err("#VALOR!");
  if (value.kind === "num") return formatNumber(value.value);
  if (value.kind === "bool") return value.value ? "TRUE" : "FALSE";
  return value.value;
}

function numOf(value: CellValue): number | CellValue {
  const number = asNumber(value);
  return number.kind === "num" ? number.value : number;
}

function truthy(value: CellValue): boolean | CellValue {
  if (value.kind === "err") return value;
  if (value.kind === "bool") return value.value;
  if (value.kind === "num") return value.value !== 0;
  if (value.kind === "text") return value.value !== "";
  return false;
}

function sameText(left: string, right: string): boolean {
  if (!/[*?]/.test(right)) return left.toLowerCase() === right.toLowerCase();
  const body = right.toLowerCase().replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".");
  return new RegExp(`^${body}$`).test(left.toLowerCase());
}

function matches(cell: CellValue, criteria: CellValue): boolean {
  if (cell.kind === "err" || criteria.kind === "err" || cell.kind === "range" || criteria.kind === "range") return false;
  let op = "=";
  let expected = criteria;
  if (criteria.kind === "text") {
    const parts = /^(>=|<=|<>|>|<|=)(.*)$/.exec(criteria.value);
    if (parts?.[1]) {
      op = parts[1];
      const rest = parts[2] ?? "";
      expected = rest.trim() !== "" && Number.isFinite(Number(rest)) ? { kind: "num", value: Number(rest) } : { kind: "text", value: rest };
    }
  }
  if (op === "=" && expected.kind === "text" && cell.kind === "text") return sameText(cell.value, expected.value);
  const left = cell.kind === "num" ? cell.value : cell.kind === "bool" ? (cell.value ? 1 : 0) : cell.kind === "text" && cell.value.trim() !== "" && Number.isFinite(Number(cell.value)) ? Number(cell.value) : null;
  const right = expected.kind === "num" ? expected.value : expected.kind === "bool" ? (expected.value ? 1 : 0) : null;
  if (left === null || right === null) {
    if (op !== "=") return false;
    return textOf(cell) === textOf(expected);
  }
  if (op === "=") return left === right;
  if (op === "<>") return left !== right;
  if (op === ">") return left > right;
  if (op === "<") return left < right;
  if (op === ">=") return left >= right;
  return left <= right;
}

function rowsOf(range: CellValue): number[] {
  if (range.kind !== "range") return [];
  return [...new Set(range.cells.map((cell) => cell.row))].sort((a, b) => a - b);
}

function lookupColumn(range: CellValue, resolve: (addr: CellAddr) => CellValue, lookup: CellValue, index: number, across: boolean): CellValue {
  if (range.kind !== "range") return err("#VALOR!");
  if (!Number.isInteger(index) || index < 1) return err("#VALOR!");
  const lines = across ? [...new Set(range.cells.map((cell) => cell.col))].sort((a, b) => a - b) : rowsOf(range);
  const minCross = across ? Math.min(...range.cells.map((cell) => cell.row)) : Math.min(...range.cells.map((cell) => cell.col));
  for (const line of lines) {
    const first = range.cells.find((cell) => (across ? cell.col === line && cell.row === minCross : cell.row === line && cell.col === minCross));
    if (!first) continue;
    const probe = resolve(first);
    if (probe.kind === "err") return probe;
    if (!matches(probe, lookup.kind === "text" ? lookup : lookup)) continue;
    const target = range.cells.find((cell) => (across ? cell.col === line && cell.row === minCross + index - 1 : cell.row === line && cell.col === minCross + index - 1));
    if (!target) return err("#REF!");
    return resolve(target);
  }
  return err("#N/A");
}

function dateParts(value: CellValue): { y: number; m: number; d: number } | null {
  if (value.kind === "text") {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.value);
    if (!match?.[1] || !match[2] || !match[3]) return null;
    return { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) };
  }
  if (value.kind === "num" && value.value > 20000 && value.value < 80000) {
    const utc = new Date(Date.UTC(1899, 11, 30));
    utc.setUTCDate(utc.getUTCDate() + Math.floor(value.value));
    return { y: utc.getUTCFullYear(), m: utc.getUTCMonth() + 1, d: utc.getUTCDate() };
  }
  return null;
}

function clock(value: CellValue): { h: number; m: number; s: number } | null {
  if (value.kind !== "text") return null;
  const match = /(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(value.value);
  if (!match?.[1] || !match[2]) return null;
  return { h: Number(match[1]), m: Number(match[2]), s: Number(match[3] ?? 0) };
}

function isoDate(year: number, month: number, day: number): string {
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return "#VALOR!";
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function roundTo(value: number, digits: number, mode: "round" | "up" | "down"): number {
  const factor = 10 ** Math.max(-10, Math.min(10, digits));
  const scaled = value * factor;
  const next = mode === "up" ? Math.ceil(scaled - 1e-10) : mode === "down" ? Math.floor(scaled + 1e-10) : Math.round(scaled);
  return next / factor;
}

type Fn = (args: CellValue[], resolve: (addr: CellAddr) => CellValue) => CellValue;

function numeric(reduce: (values: number[]) => CellValue): Fn {
  return (args, resolve) => {
    const numbers = numbersOf(args, resolve);
    if (!Array.isArray(numbers)) return numbers;
    return reduce(numbers);
  };
}

function oneNumber(run: (value: number, digits: number) => CellValue, digits = false): Fn {
  return (args, resolve) => {
    const value = scalar(args[0], resolve);
    if (value.kind === "err") return value;
    const number = numOf(value);
    if (typeof number !== "number") return number;
    let places = 0;
    if (digits && args[1]) {
      const extra = scalar(args[1], resolve);
      if (extra.kind === "err") return extra;
      const parsed = numOf(extra);
      if (typeof parsed !== "number") return parsed;
      places = parsed;
    }
    return run(number, places);
  };
}

function textFn(run: (text: string, args: CellValue[], resolve: (addr: CellAddr) => CellValue) => unknown): Fn {
  return (args, resolve) => {
    const value = scalar(args[0], resolve);
    if (value.kind === "err") return value;
    const text = textOf(value);
    if (typeof text !== "string") return text;
    return run(text, args, resolve) as CellValue;
  };
}

const FUNCTIONS: Record<string, Fn> = {};

function alias(names: string[], fn: Fn) {
  for (const name of names) FUNCTIONS[name] = fn;
}

alias(["SUMA", "SUM"], numeric((values) => ({ kind: "num", value: values.reduce((sum, item) => sum + item, 0) })));
alias(["PRODUCTO", "PRODUCT"], numeric((values) => (values.length === 0 ? err("#VALOR!") : { kind: "num", value: values.reduce((prod, item) => prod * item, 1) })));
alias(["PROMEDIO", "AVERAGE"], numeric((values) => (values.length === 0 ? err("#DIV/0!") : { kind: "num", value: values.reduce((sum, item) => sum + item, 0) / values.length })));
alias(["MEDIANA", "MEDIAN"], numeric((values) => {
  if (values.length === 0) return err("#VALOR!");
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const left = sorted[mid - 1];
  const right = sorted[mid];
  if (right === undefined) return err("#VALOR!");
  return { kind: "num", value: sorted.length % 2 === 0 && left !== undefined ? (left + right) / 2 : right };
}));
alias(["MIN"], numeric((values) => (values.length === 0 ? err("#VALOR!") : { kind: "num", value: Math.min(...values) })));
alias(["MAX"], numeric((values) => (values.length === 0 ? err("#VALOR!") : { kind: "num", value: Math.max(...values) })));
alias(["CONTAR", "COUNT"], (args, resolve) => {
  const numbers = numbersOf(args, resolve);
  if (!Array.isArray(numbers)) return numbers;
  return { kind: "num", value: numbers.length };
});
alias(["CONTARA", "COUNTA"], (args, resolve) => {
  const values = listed(args, resolve);
  if (!Array.isArray(values)) return values;
  return { kind: "num", value: values.filter((cell) => !(cell.kind === "text" && cell.value === "")).length };
});
alias(["CONTAR.BLANCO", "COUNTBLANK"], (args, resolve) => {
  const values = listed(args, resolve);
  if (!Array.isArray(values)) return values;
  return { kind: "num", value: values.filter((cell) => cell.kind === "text" && cell.value === "").length };
});
alias(["SI", "IF"], (args, resolve) => {
  const condition = scalar(args[0], resolve);
  const yes = scalar(args[1], resolve);
  const no = scalar(args[2], resolve);
  if (condition.kind === "err") return condition;
  const truth = truthy(condition);
  if (typeof truth !== "boolean") return truth;
  return truth ? yes : no;
});
alias(["Y", "AND"], (args, resolve) => {
  const values = listed(args, resolve);
  if (!Array.isArray(values) || values.length === 0) return Array.isArray(values) ? err("#VALOR!") : values;
  for (const cell of values) {
    if (cell.kind === "text" && cell.value === "") continue;
    const truth = truthy(cell);
    if (typeof truth !== "boolean") return truth;
    if (!truth) return { kind: "bool", value: false };
  }
  return { kind: "bool", value: true };
});
alias(["O", "OR"], (args, resolve) => {
  const values = listed(args, resolve);
  if (!Array.isArray(values) || values.length === 0) return Array.isArray(values) ? err("#VALOR!") : values;
  let seen = false;
  for (const cell of values) {
    if (cell.kind === "text" && cell.value === "") continue;
    seen = true;
    const truth = truthy(cell);
    if (typeof truth !== "boolean") return truth;
    if (truth) return { kind: "bool", value: true };
  }
  return seen ? { kind: "bool", value: false } : err("#VALOR!");
});
alias(["NO", "NOT"], (args, resolve) => {
  const value = scalar(args[0], resolve);
  if (value.kind === "err") return value;
  const truth = truthy(value);
  if (typeof truth !== "boolean") return truth;
  return { kind: "bool", value: !truth };
});
alias(["SI.ERROR", "IFERROR"], (args, resolve) => {
  const value = scalar(args[0], resolve);
  const fallback = scalar(args[1], resolve);
  return value.kind === "err" ? fallback : value;
});
alias(["ESBLANCO", "ISBLANK"], (args, resolve) => {
  const value = scalar(args[0], resolve);
  if (value.kind === "err") return value;
  return { kind: "bool", value: value.kind === "text" && value.value === "" };
});
alias(["ESNUMERO", "ISNUMBER"], (args, resolve) => {
  const value = scalar(args[0], resolve);
  if (value.kind === "err") return value;
  return { kind: "bool", value: value.kind === "num" };
});
alias(["ESTEXTO", "ISTEXT"], (args, resolve) => {
  const value = scalar(args[0], resolve);
  if (value.kind === "err") return value;
  return { kind: "bool", value: value.kind === "text" };
});
alias(["ESERROR", "ISERROR"], (args, resolve) => {
  const value = scalar(args[0], resolve);
  return { kind: "bool", value: value.kind === "err" };
});
alias(["ABS"], oneNumber((value) => ({ kind: "num", value: Math.abs(value) })));
alias(["RAIZ", "SQRT"], oneNumber((value) => (value < 0 ? err("#NUM!") : { kind: "num", value: Math.sqrt(value) })));
alias(["POTENCIA", "POWER"], (args, resolve) => {
  const base = scalar(args[0], resolve);
  const exp = scalar(args[1], resolve);
  if (base.kind === "err") return base;
  if (exp.kind === "err") return exp;
  const a = numOf(base);
  const b = numOf(exp);
  if (typeof a !== "number") return a;
  if (typeof b !== "number") return b;
  return { kind: "num", value: a ** b };
});
alias(["ENTERO", "INT"], oneNumber((value) => ({ kind: "num", value: Math.floor(value) })));
alias(["TRUNCAR", "TRUNC"], oneNumber((value, digits) => ({ kind: "num", value: roundTo(value, digits, "down") }), true));
alias(["REDONDEAR", "ROUND"], oneNumber((value, digits) => ({ kind: "num", value: roundTo(value, digits, "round") }), true));
alias(["REDONDEAR.MAS", "ROUNDUP"], oneNumber((value, digits) => ({ kind: "num", value: roundTo(value, digits, value < 0 ? "down" : "up") }), true));
alias(["REDONDEAR.MENOS", "ROUNDDOWN"], oneNumber((value, digits) => ({ kind: "num", value: roundTo(value, digits, value < 0 ? "up" : "down") }), true));
alias(["RESIDUO", "MOD"], (args, resolve) => {
  const left = scalar(args[0], resolve);
  const right = scalar(args[1], resolve);
  if (left.kind === "err") return left;
  if (right.kind === "err") return right;
  const a = numOf(left);
  const b = numOf(right);
  if (typeof a !== "number") return a;
  if (typeof b !== "number") return b;
  if (b === 0) return err("#DIV/0!");
  return { kind: "num", value: a - b * Math.floor(a / b) };
});
alias(["SIGNO", "SIGN"], oneNumber((value) => ({ kind: "num", value: Math.sign(value) })));
alias(["EXP"], oneNumber((value) => ({ kind: "num", value: Math.exp(value) })));
alias(["LN"], oneNumber((value) => (value <= 0 ? err("#NUM!") : { kind: "num", value: Math.log(value) })));
alias(["LOG10"], oneNumber((value) => (value <= 0 ? err("#NUM!") : { kind: "num", value: Math.log10(value) })));
alias(["LOG"], (args, resolve) => {
  const number = scalar(args[0], resolve);
  if (number.kind === "err") return number;
  const value = numOf(number);
  if (typeof value !== "number") return value;
  if (value <= 0) return err("#NUM!");
  let base = 10;
  if (args[1]) {
    const extra = scalar(args[1], resolve);
    if (extra.kind === "err") return extra;
    const parsed = numOf(extra);
    if (typeof parsed !== "number") return parsed;
    base = parsed;
  }
  if (base <= 0 || base === 1) return err("#NUM!");
  return { kind: "num", value: Math.log(value) / Math.log(base) };
});
alias(["PI"], () => ({ kind: "num", value: Math.PI }));
alias(["SENO", "SIN"], oneNumber((value) => ({ kind: "num", value: Math.sin(value) })));
alias(["COSENO", "COS"], oneNumber((value) => ({ kind: "num", value: Math.cos(value) })));
alias(["TAN"], oneNumber((value) => ({ kind: "num", value: Math.tan(value) })));
alias(["ALEATORIO", "RAND"], () => ({ kind: "num", value: Math.random() }));
alias(["ALEATORIO.ENTRE", "RANDBETWEEN"], (args, resolve) => {
  const low = scalar(args[0], resolve);
  const high = scalar(args[1], resolve);
  if (low.kind === "err") return low;
  if (high.kind === "err") return high;
  const a = numOf(low);
  const b = numOf(high);
  if (typeof a !== "number") return a;
  if (typeof b !== "number") return b;
  const start = Math.ceil(Math.min(a, b));
  const end = Math.floor(Math.max(a, b));
  return { kind: "num", value: start + Math.floor(Math.random() * (end - start + 1)) };
});
alias(["BUSCARV", "VLOOKUP"], (args, resolve) => {
  const lookup = scalar(args[0], resolve);
  const index = scalar(args[2], resolve);
  if (lookup.kind === "err") return lookup;
  if (index.kind === "err") return index;
  const column = numOf(index);
  if (typeof column !== "number") return column;
  if (!args[1]) return err("#VALOR!");
  return lookupColumn(args[1], resolve, lookup, column, false);
});
alias(["BUSCARH", "HLOOKUP"], (args, resolve) => {
  const lookup = scalar(args[0], resolve);
  const index = scalar(args[2], resolve);
  if (lookup.kind === "err") return lookup;
  if (index.kind === "err") return index;
  const row = numOf(index);
  if (typeof row !== "number") return row;
  if (!args[1]) return err("#VALOR!");
  return lookupColumn(args[1], resolve, lookup, row, true);
});
alias(["INDICE", "INDEX"], (args, resolve) => {
  const range = args[0];
  const rowValue = scalar(args[1], resolve);
  if (!range || rowValue.kind === "err") return rowValue.kind === "err" ? rowValue : err("#VALOR!");
  const row = numOf(rowValue);
  if (typeof row !== "number") return row;
  let col = 1;
  if (args[2]) {
    const colValue = scalar(args[2], resolve);
    if (colValue.kind === "err") return colValue;
    const parsed = numOf(colValue);
    if (typeof parsed !== "number") return parsed;
    col = parsed;
  }
  if (range.kind !== "range") return row === 1 && col === 1 ? range : err("#REF!");
  const top = Math.min(...range.cells.map((cell) => cell.row));
  const left = Math.min(...range.cells.map((cell) => cell.col));
  const found = range.cells.find((cell) => cell.row === top + row - 1 && cell.col === left + col - 1);
  if (!found) return err("#REF!");
  return resolve(found);
});
alias(["COINCIDIR", "MATCH"], (args, resolve) => {
  const lookup = scalar(args[0], resolve);
  if (lookup.kind === "err") return lookup;
  const range = args[1];
  if (!range || range.kind !== "range") return err("#VALOR!");
  const ordered = [...range.cells].sort((a, b) => a.row - b.row || a.col - b.col);
  for (let index = 0; index < ordered.length; index += 1) {
    const cell = resolve(ordered[index]!);
    if (cell.kind === "err") return cell;
    if (matches(cell, lookup)) return { kind: "num", value: index + 1 };
  }
  return err("#N/A");
});

function aggregateIf(kind: "count" | "sum" | "avg"): Fn {
  return (args, resolve) => {
    const criteria = scalar(args[1], resolve);
    if (!args[0] || criteria.kind === "err") return criteria.kind === "err" ? criteria : err("#VALOR!");
    const keys = args[0].kind === "range" ? args[0].cells.map(resolve) : [args[0]];
    const sums = args[2] ? (args[2].kind === "range" ? args[2].cells.map(resolve) : [args[2]]) : keys;
    const picked: number[] = [];
    keys.forEach((cell, index) => {
      if (!matches(cell, criteria)) return;
      const source = sums[index] ?? cell;
      if (kind === "count") {
        if (source.kind === "num" || (source.kind === "text" && source.value !== "") || source.kind === "bool") picked.push(1);
        return;
      }
      const number = numOf(source);
      if (typeof number === "number") picked.push(number);
    });
    if (kind === "count") return { kind: "num", value: picked.length };
    if (picked.length === 0) return kind === "sum" ? { kind: "num", value: 0 } : err("#DIV/0!");
    const total = picked.reduce((sum, item) => sum + item, 0);
    return { kind: "num", value: kind === "avg" ? total / picked.length : total };
  };
}

alias(["CONTAR.SI", "COUNTIF"], aggregateIf("count"));
alias(["SUMAR.SI", "SUMIF"], aggregateIf("sum"));
alias(["PROMEDIO.SI", "AVERAGEIF"], aggregateIf("avg"));
alias(["CONCATENAR", "CONCAT"], (args, resolve) => {
  const values = listed(args, resolve);
  if (!Array.isArray(values)) return values;
  let text = "";
  for (const cell of values) {
    const piece = textOf(cell);
    if (typeof piece !== "string") return piece;
    text += piece;
  }
  return { kind: "text", value: text };
});
alias(["UNIRCADENAS", "TEXTJOIN"], (args, resolve) => {
  const sep = scalar(args[0], resolve);
  if (sep.kind === "err") return sep;
  const separator = textOf(sep);
  if (typeof separator !== "string") return separator;
  const values = listed(args.slice(2), resolve);
  if (!Array.isArray(values)) return values;
  const parts: string[] = [];
  for (const cell of values) {
    if (cell.kind === "text" && cell.value === "") continue;
    const piece = textOf(cell);
    if (typeof piece !== "string") return piece;
    parts.push(piece);
  }
  return { kind: "text", value: parts.join(separator) };
});
alias(["IZQUIERDA", "LEFT"], textFn((text, args, resolve) => {
  const count: CellValue = args[1] ? scalar(args[1], resolve) : { kind: "num", value: 1 };
  if (count.kind === "err") return count;
  const size = numOf(count);
  if (typeof size !== "number") return size;
  return { kind: "text", value: text.slice(0, Math.max(0, size)) };
}));
alias(["DERECHA", "RIGHT"], textFn((text, args, resolve) => {
  const count: CellValue = args[1] ? scalar(args[1], resolve) : { kind: "num", value: 1 };
  if (count.kind === "err") return count;
  const size = numOf(count);
  if (typeof size !== "number") return size;
  return { kind: "text", value: size <= 0 ? "" : text.slice(-size) };
}));
alias(["EXTRAE", "MID"], textFn((text, args, resolve) => {
  const start = scalar(args[1], resolve);
  const count = scalar(args[2], resolve);
  if (start.kind === "err") return start;
  if (count.kind === "err") return count;
  const from = numOf(start);
  const size = numOf(count);
  if (typeof from !== "number") return from;
  if (typeof size !== "number") return size;
  return { kind: "text", value: text.slice(Math.max(0, from - 1), Math.max(0, from - 1) + Math.max(0, size)) };
}));
alias(["LARGO", "LEN"], textFn((text) => ({ kind: "num", value: [...text].length })));
alias(["MAYUSC", "UPPER"], textFn((text) => ({ kind: "text", value: text.toUpperCase() })));
alias(["MINUSC", "LOWER"], textFn((text) => ({ kind: "text", value: text.toLowerCase() })));
alias(["NOMPROPIO", "PROPER"], textFn((text) => ({ kind: "text", value: text.toLowerCase().replace(/(^|[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ])([a-záéíóúüñ])/gi, (_all, lead: string, char: string) => `${lead}${char.toUpperCase()}`) })));
alias(["ESPACIOS", "TRIM"], textFn((text) => ({ kind: "text", value: text.trim().replace(/\s+/g, " ") })));
alias(["SUSTITUIR", "SUBSTITUTE"], textFn((text, args, resolve) => {
  const from = scalar(args[1], resolve);
  const to = scalar(args[2], resolve);
  if (from.kind === "err") return from;
  if (to.kind === "err") return to;
  const needle = textOf(from);
  const next = textOf(to);
  if (typeof needle !== "string") return needle;
  if (typeof next !== "string") return next;
  return { kind: "text", value: needle === "" ? text : text.split(needle).join(next) };
}));
alias(["HALLAR", "FIND"], textFn((text, args, resolve) => {
  const needleValue = scalar(args[1], resolve);
  if (needleValue.kind === "err") return needleValue;
  const needle = textOf(needleValue);
  if (typeof needle !== "string") return needle;
  const at = text.indexOf(needle);
  return at < 0 ? err("#VALOR!") : { kind: "num", value: at + 1 };
}));
alias(["REPETIR", "REPT"], textFn((text, args, resolve) => {
  const count = scalar(args[1], resolve);
  if (count.kind === "err") return count;
  const times = numOf(count);
  if (typeof times !== "number") return times;
  return { kind: "text", value: text.repeat(Math.max(0, Math.min(100, Math.floor(times)))) };
}));
alias(["VALOR", "VALUE"], textFn((text) => {
  const number = Number(text.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(number) ? { kind: "num", value: number } : err("#VALOR!");
}));
alias(["TEXTO", "TEXT"], (args, resolve): CellValue => {
  const value = scalar(args[0], resolve);
  if (value.kind === "err") return value;
  const pattern: CellValue = args[1] ? scalar(args[1], resolve) : { kind: "text", value: "@" };
  if (pattern.kind === "err") return pattern;
  const format = textOf(pattern);
  if (typeof format !== "string") return format;
  const number = numOf(value);
  if (format.includes("%") && typeof number === "number") return { kind: "text", value: `${formatNumber(number * 100)}%` };
  if (format.includes("0.00") && typeof number === "number") return { kind: "text", value: number.toFixed(2) };
  return { kind: "text", value: typeof textOf(value) === "string" ? (textOf(value) as string) : "" };
});
alias(["HOY", "TODAY"], () => {
  const now = new Date();
  return { kind: "text", value: isoDate(now.getFullYear(), now.getMonth() + 1, now.getDate()) };
});
alias(["AHORA", "NOW"], () => {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  return { kind: "text", value: `${isoDate(now.getFullYear(), now.getMonth() + 1, now.getDate())} ${hh}:${mm}:${ss}` };
});
alias(["FECHA", "DATE"], (args, resolve) => {
  const year = scalar(args[0], resolve);
  const month = scalar(args[1], resolve);
  const day = scalar(args[2], resolve);
  if (year.kind === "err") return year;
  if (month.kind === "err") return month;
  if (day.kind === "err") return day;
  const y = numOf(year);
  const m = numOf(month);
  const d = numOf(day);
  if (typeof y !== "number" || typeof m !== "number" || typeof d !== "number") return err("#VALOR!");
  const text = isoDate(y, m, d);
  return text.startsWith("#") ? err(text) : { kind: "text", value: text };
});
alias(["AÑO", "YEAR"], (args, resolve) => {
  const value = scalar(args[0], resolve);
  const parts = value.kind === "err" ? null : dateParts(value);
  return parts ? { kind: "num", value: parts.y } : err("#VALOR!");
});
alias(["MES", "MONTH"], (args, resolve) => {
  const value = scalar(args[0], resolve);
  const parts = value.kind === "err" ? null : dateParts(value);
  return parts ? { kind: "num", value: parts.m } : err("#VALOR!");
});
alias(["DIA", "DAY"], (args, resolve) => {
  const value = scalar(args[0], resolve);
  const parts = value.kind === "err" ? null : dateParts(value);
  return parts ? { kind: "num", value: parts.d } : err("#VALOR!");
});
alias(["HORA", "HOUR"], (args, resolve) => {
  const value = scalar(args[0], resolve);
  const parts = value.kind === "err" ? null : clock(value);
  return parts ? { kind: "num", value: parts.h } : err("#VALOR!");
});
alias(["MINUTO", "MINUTE"], (args, resolve) => {
  const value = scalar(args[0], resolve);
  const parts = value.kind === "err" ? null : clock(value);
  return parts ? { kind: "num", value: parts.m } : err("#VALOR!");
});
alias(["SEGUNDO", "SECOND"], (args, resolve) => {
  const value = scalar(args[0], resolve);
  const parts = value.kind === "err" ? null : clock(value);
  return parts ? { kind: "num", value: parts.s } : err("#VALOR!");
});
alias(["K.ESIMO.MAYOR", "LARGE"], (args, resolve) => {
  const numbers = numbersOf([args[0] ?? err("#VALOR!")], resolve);
  const k = scalar(args[1], resolve);
  if (!Array.isArray(numbers)) return numbers;
  if (k.kind === "err") return k;
  const index = numOf(k);
  if (typeof index !== "number") return index;
  const sorted = [...numbers].sort((a, b) => b - a);
  const picked = sorted[index - 1];
  return picked === undefined ? err("#VALOR!") : { kind: "num", value: picked };
});
alias(["K.ESIMO.MENOR", "SMALL"], (args, resolve) => {
  const numbers = numbersOf([args[0] ?? err("#VALOR!")], resolve);
  const k = scalar(args[1], resolve);
  if (!Array.isArray(numbers)) return numbers;
  if (k.kind === "err") return k;
  const index = numOf(k);
  if (typeof index !== "number") return index;
  const sorted = [...numbers].sort((a, b) => a - b);
  const picked = sorted[index - 1];
  return picked === undefined ? err("#VALOR!") : { kind: "num", value: picked };
});
alias(["REF"], () => err("#REF!"));

export const FUNCTION_NAMES = Object.keys(FUNCTIONS);

function cellsIn(start: { row: number; col: number }, end: { row: number; col: number }, sheet?: string): CellAddr[] {
  const cells: CellAddr[] = [];
  for (let row = Math.min(start.row, end.row); row <= Math.max(start.row, end.row); row += 1) {
    for (let col = Math.min(start.col, end.col); col <= Math.max(start.col, end.col); col += 1) cells.push({ row, col, sheet });
  }
  return cells;
}

class Parser {
  private index = 0;

  constructor(
    private readonly source: string,
    private readonly resolve: (addr: CellAddr) => CellValue,
  ) {}

  parse(): CellValue {
    const value = this.parseConcat();
    this.skip();
    if (this.index < this.source.length) return err("#VALOR!");
    return value;
  }

  private parseConcat(): CellValue {
    let left = this.parseAdd();
    while (true) {
      this.skip();
      if (this.source[this.index] !== "&") break;
      this.index += 1;
      const right = this.parseAdd();
      if (left.kind === "err") return left;
      if (right.kind === "err") return right;
      const a = textOf(left);
      const b = textOf(right);
      if (typeof a !== "string") return a;
      if (typeof b !== "string") return b;
      left = { kind: "text", value: a + b };
    }
    return left;
  }

  private parseAdd(): CellValue {
    let left = this.parseMul();
    while (true) {
      this.skip();
      const op = this.source[this.index];
      if (op !== "+" && op !== "-") break;
      this.index += 1;
      const right = this.parseMul();
      left = this.arithmetic(left, right, op);
    }
    return left;
  }

  private parseMul(): CellValue {
    let left = this.parseUnary();
    while (true) {
      this.skip();
      const op = this.source[this.index];
      if (op !== "*" && op !== "/") break;
      this.index += 1;
      const right = this.parseUnary();
      left = this.arithmetic(left, right, op);
    }
    return left;
  }

  private parseUnary(): CellValue {
    this.skip();
    if (this.source[this.index] === "-") {
      this.index += 1;
      const value = this.parseUnary();
      const number = asNumber(value);
      return number.kind === "num" ? { kind: "num", value: -number.value } : number;
    }
    return this.parseComparison();
  }

  private parseComparison(): CellValue {
    const left = this.parsePrimary();
    this.skip();
    const operators = [">=", "<=", "<>", ">", "<", "="];
    const op = operators.find((item) => this.source.startsWith(item, this.index));
    if (!op) return left;
    this.index += op.length;
    const right = this.parsePrimary();
    if (left.kind === "err") return left;
    if (right.kind === "err") return right;
    if (left.kind === "range" || right.kind === "range") return err("#VALOR!");
    const same = left.kind === "num" && right.kind === "num" ? left.value - right.value : left.kind === "text" && right.kind === "text" ? left.value.localeCompare(right.value) : null;
    if (same === null) return { kind: "bool", value: false };
    const result = op === "=" ? same === 0 : op === "<>" ? same !== 0 : op === ">" ? same > 0 : op === "<" ? same < 0 : op === ">=" ? same >= 0 : same <= 0;
    return { kind: "bool", value: result };
  }

  private parsePrimary(): CellValue {
    this.skip();
    const char = this.source[this.index] ?? "";
    if (char === "(") {
      this.index += 1;
      const value = this.parseConcat();
      this.skip();
      if (this.source[this.index] !== ")") return err("#VALOR!");
      this.index += 1;
      return value;
    }
    if (char === '"') return this.parseString();
    if (/[0-9.]/.test(char)) return this.parseNumber();
    if (char === "'" || /[A-Za-z$]/.test(char)) return this.parseName();
    return err("#VALOR!");
  }

  private parseString(): CellValue {
    this.index += 1;
    let text = "";
    while (this.index < this.source.length && this.source[this.index] !== '"') {
      text += this.source[this.index];
      this.index += 1;
    }
    if (this.source[this.index] !== '"') return err("#VALOR!");
    this.index += 1;
    return { kind: "text", value: text };
  }

  private parseNumber(): CellValue {
    const start = this.index;
    while (this.index < this.source.length && /[0-9.]/.test(this.source[this.index] ?? "")) this.index += 1;
    const token = this.source.slice(start, this.index);
    if (!/^\d+(\.\d+)?$/.test(token)) return err("#VALOR!");
    return { kind: "num", value: Number(token) };
  }

  private parseName(): CellValue {
    this.skip();
    if (this.source[this.index] === "'") {
      this.index += 1;
      let sheet = "";
      while (this.index < this.source.length && this.source[this.index] !== "'") {
        sheet += this.source[this.index];
        this.index += 1;
      }
      if (this.source[this.index] !== "'") return err("#VALOR!");
      this.index += 1;
      this.skip();
      if (this.source[this.index] !== "!") return err("#VALOR!");
      this.index += 1;
      return this.afterSheet(sheet);
    }
    const start = this.index;
    if (this.source[this.index] === "$") return this.localRef();
    while (this.index < this.source.length && /[A-Za-z0-9.ÁÉÍÓÚÜÑáéíóúüñ]/.test(this.source[this.index] ?? "")) this.index += 1;
    while (this.index > start && this.source[this.index - 1] === ".") this.index -= 1;
    const token = this.source.slice(start, this.index);
    this.skip();
    if (this.source[this.index] === "!") {
      this.index += 1;
      return this.afterSheet(token);
    }
    if (this.source[this.index] === "(") {
      this.index += 1;
      const args = this.parseArgs();
      if (args.length === 1 && args[0]?.kind === "err" && args[0].value === "#VALOR!" && this.source[this.index - 1] !== ")") return args[0];
      const name = token.toUpperCase();
      const fn = FUNCTIONS[name];
      if (!fn) return err("#NOMBRE?");
      return fn(args, this.resolve);
    }
    const upper = token.toUpperCase();
    if (upper === "TRUE" || upper === "VERDADERO" || upper === "FALSE" || upper === "FALSO") {
      return { kind: "bool", value: upper === "TRUE" || upper === "VERDADERO" };
    }
    this.index = start;
    return this.localRef();
  }

  private afterSheet(sheet: string): CellValue {
    const ref = this.readRef();
    if (!ref) return err("#REF!");
    this.skip();
    if (this.source[this.index] === ":") {
      this.index += 1;
      const end = this.readRef();
      if (!end) return err("#REF!");
      return { kind: "range", cells: cellsIn(ref, end, sheet) };
    }
    return this.resolve({ ...ref, sheet });
  }

  private localRef(): CellValue {
    const ref = this.readRef();
    if (!ref) return err("#NOMBRE?");
    this.skip();
    if (this.source[this.index] === ":") {
      this.index += 1;
      const end = this.readRef();
      if (!end) return err("#REF!");
      return { kind: "range", cells: cellsIn(ref, end) };
    }
    return this.resolve(ref);
  }

  private readRef(): { row: number; col: number } | null {
    this.skip();
    if (this.source[this.index] === "$") this.index += 1;
    const start = this.index;
    while (this.index < this.source.length && /[A-Za-z]/.test(this.source[this.index] ?? "")) this.index += 1;
    const letters = this.source.slice(start, this.index);
    if (this.source[this.index] === "$") this.index += 1;
    const digitStart = this.index;
    while (this.index < this.source.length && /[0-9]/.test(this.source[this.index] ?? "")) this.index += 1;
    return parseCellRef(`${letters}${this.source.slice(digitStart, this.index)}`);
  }

  private parseArgs(): CellValue[] {
    const args: CellValue[] = [];
    this.skip();
    if (this.source[this.index] === ")") {
      this.index += 1;
      return args;
    }
    while (this.index < this.source.length) {
      args.push(this.parseConcat());
      this.skip();
      const char = this.source[this.index];
      if (char === "," || char === ";") {
        this.index += 1;
        continue;
      }
      if (char === ")") {
        this.index += 1;
        return args;
      }
      return [err("#VALOR!")];
    }
    return [err("#VALOR!")];
  }

  private arithmetic(left: CellValue, right: CellValue, op: string): CellValue {
    if (left.kind === "range") left = err("#VALOR!");
    if (right.kind === "range") right = err("#VALOR!");
    const a = asNumber(left);
    const b = asNumber(right);
    if (a.kind === "err") return a;
    if (b.kind === "err") return b;
    if (a.kind !== "num" || b.kind !== "num") return err("#VALOR!");
    if (op === "+") return { kind: "num", value: a.value + b.value };
    if (op === "-") return { kind: "num", value: a.value - b.value };
    if (op === "*") return { kind: "num", value: a.value * b.value };
    if (b.value === 0) return err("#DIV/0!");
    return { kind: "num", value: a.value / b.value };
  }

  private skip(): void {
    while (this.source[this.index] === " ") this.index += 1;
  }
}

export function evaluateFormula(source: string, resolveText: (ref: CellAddr) => string): CellValue {
  const parser = new Parser(source, (addr) => {
    const shown = resolveText(addr);
    if (shown.startsWith("#")) return { kind: "err", value: shown };
    if (shown === "TRUE") return { kind: "bool", value: true };
    if (shown === "FALSE") return { kind: "bool", value: false };
    if (shown.trim() !== "" && Number.isFinite(Number(shown))) return { kind: "num", value: Number(shown) };
    return { kind: "text", value: shown };
  });
  return parser.parse();
}

function rewriteRefs(formula: string, map: (colAbs: string, letters: string, rowAbs: string, row: number) => string): string {
  let out = "";
  let index = 0;
  while (index < formula.length) {
    if (formula[index] === '"') {
      const end = formula.indexOf('"', index + 1);
      const stop = end < 0 ? formula.length : end + 1;
      out += formula.slice(index, stop);
      index = stop;
      continue;
    }
    const match = /^(?:'[^']+'!|[A-Za-z][A-Za-z0-9]*!)?(\$?)([A-Za-z]{1,3})(\$?)([1-9][0-9]*)/.exec(formula.slice(index));
    if (!match) {
      out += formula[index];
      index += 1;
      continue;
    }
    const prefix = match[0].slice(0, match[0].length - `${match[1] ?? ""}${match[2] ?? ""}${match[3] ?? ""}${match[4] ?? ""}`.length);
    out += prefix + map(match[1] ?? "", match[2] ?? "", match[3] ?? "", Number(match[4]));
    index += match[0].length;
  }
  return out;
}

export function shiftFormula(formula: string, dRow: number, dCol: number): string {
  if (!formula.startsWith("=") || (dRow === 0 && dCol === 0)) return formula;
  return rewriteRefs(formula, (colAbs, letters, rowAbs, rowNumber) => {
    let col = columnIndex(letters);
    let row = rowNumber - 1;
    if (!colAbs) col += dCol;
    if (!rowAbs) row += dRow;
    col = Math.max(0, Math.min(COL_COUNT - 1, col));
    row = Math.max(0, Math.min(ROW_COUNT - 1, row));
    return `${colAbs}${columnLabel(col)}${rowAbs}${row + 1}`;
  });
}

export function adjustFormula(formula: string, change: { axis: "row" | "col"; at: number; delta: number }): string {
  if (!formula.startsWith("=") || change.delta === 0) return formula;
  return rewriteRefs(formula, (colAbs, letters, rowAbs, rowNumber) => {
    let col = columnIndex(letters);
    let row = rowNumber - 1;
    const point = change.axis === "row" ? row : col;
    if (change.delta < 0 && point === change.at) return "REF()";
    if (change.delta > 0 && point >= change.at) {
      if (change.axis === "row") row += change.delta;
      else col += change.delta;
    }
    if (change.delta < 0 && point > change.at) {
      if (change.axis === "row") row += change.delta;
      else col += change.delta;
    }
    if (col < 0 || row < 0 || col >= COL_COUNT || row >= ROW_COUNT) return "REF()";
    return `${colAbs}${columnLabel(col)}${rowAbs}${row + 1}`;
  });
}

export function sortGrid(grid: string[][], column: number, direction: "asc" | "desc", skipHeader: boolean, book?: FormulaBook): string[][] {
  const shown = displayGrid(grid, book);
  const head = skipHeader ? grid.slice(0, 1) : [];
  const body = grid.slice(skipHeader ? 1 : 0).map((row, index) => ({ row, index }));
  body.sort((left, right) => {
    const a = shown[(skipHeader ? 1 : 0) + left.index]?.[column] ?? "";
    const b = shown[(skipHeader ? 1 : 0) + right.index]?.[column] ?? "";
    const aBlank = a.trim() === "";
    const bBlank = b.trim() === "";
    if (aBlank || bBlank) return aBlank === bBlank ? 0 : aBlank ? 1 : -1;
    const an = Number(a);
    const bn = Number(b);
    const delta = Number.isFinite(an) && Number.isFinite(bn) ? an - bn : a.localeCompare(b);
    return direction === "asc" ? delta : -delta;
  });
  return [...head, ...body.map((item) => item.row)];
}
