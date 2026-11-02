/** Color de una serie de precio según el tramo visible: verde si no baja, rojo si baja. */

export const PRICE_UP = "#16c784";
export const PRICE_DOWN = "#ea3943";
export const PRICE_NEUTRAL = "#8b97a6";
export const PRICE_COMPARE = "#9ecbff";
export const PRICE_INDICATOR = "#9aa7b5";

export function finiteSeries(values) {
  if (!Array.isArray(values)) return [];
  const out = [];
  for (const value of values) {
    const number = typeof value === "number" ? value : Number(value);
    if (Number.isFinite(number)) out.push(number);
  }
  return out;
}

/** true si el último valor finito está en o por encima del primero. null si no hay recorrido. */
export function seriesUp(values) {
  const clean = finiteSeries(values);
  if (clean.length < 2) return null;
  return clean[clean.length - 1] >= clean[0];
}

export function priceColor(up) {
  if (up == null) return PRICE_NEUTRAL;
  return up ? PRICE_UP : PRICE_DOWN;
}
