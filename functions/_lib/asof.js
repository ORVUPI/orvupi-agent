/** Marca de una lectura guardada: «datos de hh:mm» en Europe/Madrid. */

export function asOfLabel(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "Europe/Madrid",
  }).formatToParts(date);
  const hh = parts.find((part) => part.type === "hour")?.value;
  const mm = parts.find((part) => part.type === "minute")?.value;
  if (!hh || !mm) return null;
  return `datos de ${hh}:${mm}`;
}
