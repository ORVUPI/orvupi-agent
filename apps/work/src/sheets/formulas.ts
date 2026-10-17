export const COL_COUNT = 12;
export const ROW_COUNT = 50;
const COLS = "ABCDEFGHIJKL";

export type CellValue =
  | { kind: "num"; value: number }
  | { kind: "text"; value: string }
  | { kind: "bool"; value: boolean }
  | { kind: "err"; value: string }
  | { kind: "range"; cells: Array<{ row: number; col: number }> };

const FUNCS = new Set(["SUMA", "SUM", "PROMEDIO", "AVERAGE", "MIN", "MAX", "CONTAR", "COUNT", "SI", "IF"]);

export function columnLabel(index: number): string {
  return COLS[index] ?? "";
}

export function cellRef(row: number, col: number): string {
  return `${columnLabel(col)}${row + 1}`;
}

export function emptyGrid(): string[][] {
  return Array.from({ length: ROW_COUNT }, () => Array.from({ length: COL_COUNT }, () => ""));
}

export function parseCellRef(token: string): { row: number; col: number } | null {
  const match = /^([A-L])([1-9][0-9]*)$/i.exec(token.trim());
  if (!match?.[1] || !match[2]) return null;
  const col = COLS.indexOf(match[1].toUpperCase());
  const row = Number(match[2]) - 1;
  if (col < 0 || row < 0 || row >= ROW_COUNT) return null;
  return { row, col };
}

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return "#VALOR!";
  const rounded = Math.round(value * 1e10) / 1e10;
  return String(rounded);
}

export function displayGrid(grid: string[][]): string[][] {
  return grid.map((row, rowIndex) => row.map((_, colIndex) => displayCell(grid, rowIndex, colIndex)));
}

export function displayCell(grid: string[][], row: number, col: number, stack = new Set<string>()): string {
  const raw = grid[row]?.[col] ?? "";
  if (!raw.startsWith("=")) return raw;
  const key = `${row}:${col}`;
  if (stack.has(key)) return "#CICLO!";
  stack.add(key);
  const value = evaluateFormula(raw.slice(1), (ref) => displayCell(grid, ref.row, ref.col, stack));
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
  return { kind: "err", value: "#VALOR!" };
}

function numbersOf(args: CellValue[], resolveText: (text: string) => CellValue): number[] | CellValue {
  const numbers: number[] = [];
  for (const arg of args) {
    if (arg.kind === "err") return arg;
    const cells = arg.kind === "range" ? arg.cells.map((cell) => resolveText(`${cell.row}:${cell.col}`)) : [arg];
    for (const cell of cells) {
      if (cell.kind === "err") return cell;
      if (cell.kind === "num") numbers.push(cell.value);
      else if (cell.kind === "text" && cell.value.trim() !== "" && Number.isFinite(Number(cell.value))) numbers.push(Number(cell.value));
      else if (cell.kind === "bool") numbers.push(cell.value ? 1 : 0);
    }
  }
  return numbers;
}

function applyFunction(name: string, args: CellValue[], resolveText: (text: string) => CellValue): CellValue {
  if (name === "SI" || name === "IF") {
    const [condition, yes, no] = args;
    if (!condition || !yes || !no) return { kind: "err", value: "#VALOR!" };
    if (condition.kind === "err") return condition;
    const truth = condition.kind === "bool" ? condition.value : condition.kind === "num" ? condition.value !== 0 : condition.kind === "text" ? condition.value !== "" : false;
    return truth ? yes : no;
  }
  const numbers = numbersOf(args, resolveText);
  if (!Array.isArray(numbers)) return numbers;
  if (name === "CONTAR" || name === "COUNT") return { kind: "num", value: numbers.length };
  if (numbers.length === 0) {
    if (name === "SUMA" || name === "SUM") return { kind: "num", value: 0 };
    if (name === "PROMEDIO" || name === "AVERAGE") return { kind: "err", value: "#DIV/0!" };
    return { kind: "err", value: "#VALOR!" };
  }
  if (name === "SUMA" || name === "SUM") return { kind: "num", value: numbers.reduce((sum, item) => sum + item, 0) };
  if (name === "PROMEDIO" || name === "AVERAGE") return { kind: "num", value: numbers.reduce((sum, item) => sum + item, 0) / numbers.length };
  if (name === "MIN") return { kind: "num", value: Math.min(...numbers) };
  if (name === "MAX") return { kind: "num", value: Math.max(...numbers) };
  return { kind: "err", value: "#NOMBRE?" };
}

class Parser {
  private index = 0;

  constructor(
    private readonly source: string,
    private readonly resolveText: (text: string) => CellValue,
  ) {}

  parse(): CellValue {
    const value = this.parseAdd();
    this.skip();
    if (this.index < this.source.length) return { kind: "err", value: "#VALOR!" };
    return value;
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
    if (left.kind === "range" || right.kind === "range") return { kind: "err", value: "#VALOR!" };
    const same = left.kind === "num" && right.kind === "num" ? left.value - right.value : left.kind === "text" && right.kind === "text" ? left.value.localeCompare(right.value) : null;
    if (same === null) return { kind: "bool", value: false };
    const result =
      op === "=" ? same === 0 : op === "<>" ? same !== 0 : op === ">" ? same > 0 : op === "<" ? same < 0 : op === ">=" ? same >= 0 : same <= 0;
    return { kind: "bool", value: result };
  }

  private parsePrimary(): CellValue {
    this.skip();
    const char = this.source[this.index] ?? "";
    if (char === "(") {
      this.index += 1;
      const value = this.parseAdd();
      this.skip();
      if (this.source[this.index] !== ")") return { kind: "err", value: "#VALOR!" };
      this.index += 1;
      return value;
    }
    if (char === '"') return this.parseString();
    if (/[0-9.]/.test(char)) return this.parseNumber();
    if (/[A-Za-z]/.test(char)) return this.parseName();
    return { kind: "err", value: "#VALOR!" };
  }

  private parseString(): CellValue {
    this.index += 1;
    let text = "";
    while (this.index < this.source.length && this.source[this.index] !== '"') {
      text += this.source[this.index];
      this.index += 1;
    }
    if (this.source[this.index] !== '"') return { kind: "err", value: "#VALOR!" };
    this.index += 1;
    return { kind: "text", value: text };
  }

  private parseNumber(): CellValue {
    const start = this.index;
    while (this.index < this.source.length && /[0-9.]/.test(this.source[this.index] ?? "")) this.index += 1;
    const token = this.source.slice(start, this.index);
    if (!/^\d+(\.\d+)?$/.test(token)) return { kind: "err", value: "#VALOR!" };
    return { kind: "num", value: Number(token) };
  }

  private parseName(): CellValue {
    const start = this.index;
    while (this.index < this.source.length && /[A-Za-z0-9]/.test(this.source[this.index] ?? "")) this.index += 1;
    const token = this.source.slice(start, this.index);
    this.skip();
    if (this.source[this.index] === "(") {
      this.index += 1;
      const args = this.parseArgs();
      const name = token.toUpperCase();
      if (!FUNCS.has(name)) return { kind: "err", value: "#NOMBRE?" };
      return applyFunction(name, args, this.resolveText);
    }
    const ref = parseCellRef(token);
    if (!ref) return { kind: "err", value: "#REF!" };
    this.skip();
    if (this.source[this.index] === ":") {
      this.index += 1;
      this.skip();
      const endStart = this.index;
      while (this.index < this.source.length && /[A-Za-z0-9]/.test(this.source[this.index] ?? "")) this.index += 1;
      const end = parseCellRef(this.source.slice(endStart, this.index));
      if (!end) return { kind: "err", value: "#REF!" };
      return { kind: "range", cells: cellsIn(ref, end) };
    }
    return this.resolveText(`${ref.row}:${ref.col}`);
  }

  private parseArgs(): CellValue[] {
    const args: CellValue[] = [];
    this.skip();
    if (this.source[this.index] === ")") {
      this.index += 1;
      return args;
    }
    while (this.index < this.source.length) {
      args.push(this.parseAdd());
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
      return [{ kind: "err", value: "#VALOR!" }];
    }
    return [{ kind: "err", value: "#VALOR!" }];
  }

  private arithmetic(left: CellValue, right: CellValue, op: string): CellValue {
    if (left.kind === "range") left = { kind: "err", value: "#VALOR!" };
    if (right.kind === "range") right = { kind: "err", value: "#VALOR!" };
    const a = asNumber(left);
    const b = asNumber(right);
    if (a.kind === "err") return a;
    if (b.kind === "err") return b;
    if (a.kind !== "num" || b.kind !== "num") return { kind: "err", value: "#VALOR!" };
    if (op === "+") return { kind: "num", value: a.value + b.value };
    if (op === "-") return { kind: "num", value: a.value - b.value };
    if (op === "*") return { kind: "num", value: a.value * b.value };
    if (b.value === 0) return { kind: "err", value: "#DIV/0!" };
    return { kind: "num", value: a.value / b.value };
  }

  private skip(): void {
    while (this.source[this.index] === " ") this.index += 1;
  }
}

function cellsIn(start: { row: number; col: number }, end: { row: number; col: number }): Array<{ row: number; col: number }> {
  const cells: Array<{ row: number; col: number }> = [];
  const rowFrom = Math.min(start.row, end.row);
  const rowTo = Math.max(start.row, end.row);
  const colFrom = Math.min(start.col, end.col);
  const colTo = Math.max(start.col, end.col);
  for (let row = rowFrom; row <= rowTo; row += 1) {
    for (let col = colFrom; col <= colTo; col += 1) cells.push({ row, col });
  }
  return cells;
}

export function evaluateFormula(source: string, resolveText: (ref: { row: number; col: number }) => string): CellValue {
  const parser = new Parser(source, (text) => {
    const [rowText, colText] = text.split(":");
    const row = Number(rowText);
    const col = Number(colText);
    const shown = resolveText({ row, col });
    if (shown.startsWith("#")) return { kind: "err", value: shown };
    if (shown === "TRUE") return { kind: "bool", value: true };
    if (shown === "FALSE") return { kind: "bool", value: false };
    if (shown.trim() !== "" && Number.isFinite(Number(shown))) return { kind: "num", value: Number(shown) };
    return { kind: "text", value: shown };
  });
  return parser.parse();
}

export function sortGrid(grid: string[][], column: number, direction: "asc" | "desc", skipHeader: boolean): string[][] {
  const shown = displayGrid(grid);
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
