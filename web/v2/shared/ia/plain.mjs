/** Texto plano para el editor y las notas. No interpreta HTML ni ejecuta nada. */

export function sanitizePlain(value, max = 8000) {
  const limit = Number.isFinite(max) && max > 0 ? Math.min(max, 8000) : 8000;
  return String(value ?? "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\u202E|\u202D|\u202A|\u202B|\u202C/g, "")
    .slice(0, limit);
}
