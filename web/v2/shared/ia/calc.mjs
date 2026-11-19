/** Cálculo local. No usa eval. Solo + − × ÷, paréntesis, decimales y porcentajes. */

const PREFIX = /^(?:cu[aá]nto(?:\s+es)?|how\s+much\s+is|what\s+is|quanto\s+[eé])\s+/i;

const FOLLOW = [
  { op: "+", re: /(?:sumo|suma|a[nñ]ado|agrego|add|plus|somar|adiciono|acrescento)\s+(?:el\s+|le\s+|lhe\s+)?(\d+(?:[.,]\d+)?)/i },
  { op: "-", re: /(?:resto|resta|quito|subtract|subtraio|tiro)\s+(?:el\s+|le\s+|lhe\s+)?(\d+(?:[.,]\d+)?)/i },
  { op: "*", re: /(?:multiplico|multiplica|multiply|multiplicar)\s+(?:por\s+|by\s+)?(\d+(?:[.,]\d+)?)/i },
  { op: "/", re: /(?:divido|divida|divide|dividir)\s+(?:por\s+|entre\s+|by\s+)?(\d+(?:[.,]\d+)?)/i },
];

export function formatNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "";
  const nearest = Math.round(number);
  if (Math.abs(number - nearest) < 1e-9) return String(nearest);
  return String(Number(number.toFixed(6)));
}

function numberValue(token) {
  return Number(String(token).replace(",", "."));
}

function apply(op, left, right) {
  if (op === "+") return left + right;
  if (op === "-") return left - right;
  if (op === "*") return left * right;
  if (op === "/" && right !== 0) return left / right;
  return null;
}

function tokenize(source) {
  const tokens = [];
  const text = source.replace(/\s+/g, "");
  let i = 0;
  while (i < text.length) {
    const char = text[i];
    if ("+-*/()%".includes(char)) {
      tokens.push(char);
      i += 1;
      continue;
    }
    const match = text.slice(i).match(/^\d+(?:\.\d+)?/);
    if (!match) return null;
    tokens.push(match[0]);
    i += match[0].length;
  }
  return tokens;
}

function parseTokens(tokens) {
  let index = 0;
  const peek = () => tokens[index];
  const take = () => tokens[index++];

  function parseExpr() {
    let left = parseTerm();
    if (left == null) return null;
    while (peek() === "+" || peek() === "-") {
      const op = take();
      if (/^\d/.test(peek() || "") && tokens[index + 1] === "%") {
        const percent = numberValue(take());
        take();
        left = op === "+" ? left * (1 + percent / 100) : left * (1 - percent / 100);
        continue;
      }
      const right = parseTerm();
      if (right == null) return null;
      left = apply(op, left, right);
      if (left == null) return null;
    }
    return left;
  }

  function parseTerm() {
    let left = parseFactor();
    if (left == null) return null;
    while (peek() === "*" || peek() === "/") {
      const op = take();
      const right = parseFactor();
      if (right == null) return null;
      left = apply(op, left, right);
      if (left == null) return null;
    }
    return left;
  }

  function parseFactor() {
    if (peek() === "-") {
      take();
      const value = parseFactor();
      return value == null ? null : -value;
    }
    if (peek() === "(") {
      take();
      const value = parseExpr();
      if (peek() !== ")") return null;
      take();
      return value;
    }
    if (!/^\d/.test(peek() || "")) return null;
    const value = numberValue(take());
    if (peek() === "%") {
      take();
      if (peek() === "(") return null;
      return value / 100;
    }
    return value;
  }

  const value = parseExpr();
  if (value == null || index !== tokens.length || !Number.isFinite(value)) return null;
  return value;
}

function toExpression(text) {
  let source = String(text || "").replace(/[¿?¡!。．]/g, " ").replace(/\s+/g, " ").trim();
  source = source.replace(PREFIX, "");
  source = source.replace(/(\d)\s*,\s*(\d)/g, "$1.$2");
  source = source.replace(/(\d+(?:\.\d+)?)\s*%\s*(?:de|of|do)\s*(\d+(?:\.\d+)?)/gi, "($1/100*$2)");
  source = source.replace(/\b(?:dividido(?:\s+por|\s+entre)?|divided\s+by)\b/gi, "/");
  source = source.replace(/\b(?:multiplicado(?:\s+por)?|times|vezes)\b/gi, "*");
  source = source.replace(/\bpor\b/gi, "*");
  source = source.replace(/\b(?:m[aá]s|plus|mais)\b/gi, "+");
  source = source.replace(/\b(?:menos|minus)\b/gi, "-");
  source = source.replace(/\b(?:entre|over)\b/gi, "/");
  source = source.replace(/[×]/g, "*").replace(/÷/g, "/");
  source = source.replace(/\bx\b/gi, "*");
  source = source.replace(/\s+/g, "");
  if (!source || source.length > 80 || !/^[\d.+\-*/()%]+$/.test(source)) return null;
  return source;
}

function pretty(expression, value) {
  const shown = expression
    .replace(/\*/g, " × ")
    .replace(/\//g, " ÷ ")
    .replace(/\+/g, " + ")
    .replace(/-/g, " − ");
  return `El resultado verificado de ${shown} es ${formatNumber(value)}.`;
}

function partsOf(expression, value) {
  const numbers = expression.match(/\d+(?:\.\d+)?/g) || [];
  return [...numbers.map((item) => formatNumber(item)), formatNumber(value)];
}

export function solveExpression(text) {
  const expression = toExpression(text);
  if (!expression) return null;
  const tokens = tokenize(expression);
  if (!tokens) return null;
  const value = parseTokens(tokens);
  if (value == null) return null;
  return { value, expression, display: pretty(expression, value), parts: partsOf(expression, value) };
}

function solveFollowUp(text, previous) {
  if (previous == null || !Number.isFinite(previous)) return null;
  const source = String(text || "");
  if (!/^(?:¿\s*)?(?:y\b|e\b|and\b|entonces\b|what\s+if\b|e\s+se\b)/i.test(source.trim())) return null;
  for (const item of FOLLOW) {
    const match = source.match(item.re);
    if (!match) continue;
    const amount = numberValue(match[1]);
    const value = apply(item.op, previous, amount);
    if (value == null) return null;
    const expression = `${formatNumber(previous)}${item.op}${formatNumber(amount)}`;
    return { value, expression, display: pretty(expression, value), parts: partsOf(expression, value), follow: true };
  }
  return null;
}

function solveSpend(text) {
  const match = String(text || "").match(/(\d+(?:[.,]\d+)?)\s*(?:€|euros?|reais|dollars?)?[^.]{0,40}?(?:gasto|gast[eé]|spend|spent|gasto)\s+(?:el\s+|a\s+)?(\d+(?:[.,]\d+)?)\s*%/i);
  if (!match) return null;
  const amount = numberValue(match[1]);
  const percent = numberValue(match[2]);
  const value = amount * (1 - percent / 100);
  if (!Number.isFinite(value)) return null;
  const expression = `${formatNumber(amount)}-(${formatNumber(percent)}/100*${formatNumber(amount)})`;
  return {
    value,
    expression,
    display: `El resultado verificado de ${formatNumber(amount)} − ${formatNumber(percent)} % es ${formatNumber(value)}.`,
    parts: [formatNumber(amount), formatNumber(percent), formatNumber(value)],
  };
}

function solveOne(text, previous) {
  return solveFollowUp(text, previous) || solveExpression(text) || solveSpend(text);
}

/** Resuelve la última pregunta. Un seguimiento usa el resultado anterior. */
export function resolveCalculation(messages) {
  const users = (Array.isArray(messages) ? messages : []).filter((item) => item?.role === "user");
  let previous = null;
  for (let i = 0; i < users.length - 1; i += 1) {
    const solved = solveOne(users[i].content || users[i].modelContent || "", previous);
    if (solved) previous = solved.value;
  }
  const current = users.at(-1);
  if (!current) return null;
  return solveOne(current.content || current.modelContent || "", previous);
}

/** Si el modelo añade otro número, deja solo el cálculo verificado. */
export function verifiedAnswer(text, calc) {
  if (!calc) return String(text || "");
  const allowed = new Set(calc.parts);
  const found = [...String(text || "").matchAll(/\d+(?:[.,]\d+)?/g)].map((item) => formatNumber(numberValue(item[0])));
  const hasResult = found.includes(formatNumber(calc.value));
  const foreign = found.some((item) => !allowed.has(item));
  if (!hasResult || foreign || String(text || "").trim().length < 24) return calc.display;
  return String(text || "");
}
