/**
 * Misma regla que functions/_lib/normalize.js (changeOver / applySeriesChanges).
 * El navegador no puede importar el módulo del worker.
 */

export function changeOver(points, hours, toleranceHours) {
  if (!Array.isArray(points) || points.length < 2) return null;
  const windowMs = hours * 3600 * 1000;
  const toleranceMs = toleranceHours * 3600 * 1000;
  let lastTime = null;
  let lastPrice = null;
  for (let index = points.length - 1; index >= 0; index -= 1) {
    const time = points[index]?.[0];
    const price = points[index]?.[1];
    if (typeof time !== "number" || !Number.isFinite(time)) continue;
    if (typeof price !== "number" || !Number.isFinite(price) || price <= 0) continue;
    lastTime = time;
    lastPrice = price;
    break;
  }
  if (lastTime == null) return null;
  const target = lastTime - windowMs;
  let bestPrice = null;
  let bestDistance = Infinity;
  for (const point of points) {
    const time = point?.[0];
    const price = point?.[1];
    if (typeof time !== "number" || !Number.isFinite(time) || time >= lastTime) continue;
    if (typeof price !== "number" || !Number.isFinite(price) || price <= 0) continue;
    const distance = Math.abs(time - target);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestPrice = price;
    }
  }
  if (bestPrice == null || bestDistance > toleranceMs) return null;
  const change = ((lastPrice - bestPrice) / bestPrice) * 100;
  return Number.isFinite(change) ? change : null;
}
