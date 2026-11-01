import { locale, t } from "./i18n.mjs";

export function finite(value) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

export function money(value, currency = "usd") {
  const number = finite(value);
  if (number == null) return null;
  const code = String(currency || "usd").toUpperCase();
  const abs = Math.abs(number);
  const digits = abs >= 1000 ? 2 : abs >= 1 ? 2 : abs >= 0.01 ? 4 : 6;
  try {
    return new Intl.NumberFormat(localeTag(), { style: "currency", currency: code, maximumFractionDigits: digits }).format(number);
  } catch {
    return `${plain(number, digits)} ${code}`;
  }
}

export function compact(value, currency = "usd") {
  const number = finite(value);
  if (number == null) return null;
  const abs = Math.abs(number);
  const unit = abs >= 1e12 ? [1e12, "T"] : abs >= 1e9 ? [1e9, "B"] : abs >= 1e6 ? [1e6, "M"] : abs >= 1e3 ? [1e3, "K"] : [1, ""];
  const body = plain(abs / unit[0], unit[1] ? 2 : abs >= 1 ? 2 : 4);
  const code = String(currency || "usd").toUpperCase();
  const sign = number < 0 ? "−" : "";
  return `${sign}${body}${unit[1]} ${code}`;
}

export function plain(value, digits = 2) {
  const number = finite(value);
  if (number == null) return null;
  return new Intl.NumberFormat(localeTag(), { maximumFractionDigits: digits, minimumFractionDigits: Math.min(2, digits) }).format(number);
}

export function pct(value) {
  const number = finite(value);
  if (number == null) return null;
  const body = new Intl.NumberFormat(localeTag(), { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(number));
  if (number > 0) return `+${body}%`;
  if (number < 0) return `−${body}%`;
  return `${body}%`;
}

export function show(text) {
  return text == null || text === "" ? t("unavailable") : String(text);
}

export function when(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(localeTag(), { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Madrid" }).format(date);
}

export function day(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return new Intl.DateTimeFormat(localeTag(), { dateStyle: "medium" }).format(date);
}

function localeTag() {
  const lang = locale();
  if (lang === "pt-BR") return "pt-BR";
  if (lang === "ja") return "ja-JP";
  if (lang === "ko") return "ko-KR";
  if (lang === "en") return "en-US";
  return "es-ES";
}

export function btcPrice(value, coinId) {
  if (coinId === "bitcoin") return "1";
  const number = finite(value);
  if (number == null) return null;
  const abs = Math.abs(number);
  if (abs === 0) return "0";
  if (abs >= 1) return plain(number, 4);
  const digits = Math.min(12, Math.max(2, 3 - Math.floor(Math.log10(abs))));
  return plain(number, digits);
}

export function clsPct(value) {
  const number = finite(value);
  if (number == null) return "";
  return number < 0 ? "sn-down" : "sn-up";
}
