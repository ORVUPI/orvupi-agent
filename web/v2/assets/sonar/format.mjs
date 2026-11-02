import { locale, t } from "./i18n.mjs";

export function finite(value) {
  if (value == null || value === "" || typeof value === "boolean") return null; // Number(null) es 0: no inventar ceros
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
  const code = currency ? String(currency).toUpperCase() : "";
  const sign = number < 0 ? "−" : "";
  return code ? `${sign}${body}${unit[1]} ${code}` : `${sign}${body}${unit[1]}`;
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

/** Hora de una lectura guardada, en Europe/Madrid, para el sello «datos de hh:mm». */
export function clock(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "Europe/Madrid",
  }).formatToParts(date);
  const hh = parts.find((part) => part.type === "hour")?.value;
  const mm = parts.find((part) => part.type === "minute")?.value;
  return hh && mm ? `${hh}:${mm}` : "";
}

export function day(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return new Intl.DateTimeFormat(localeTag(), { dateStyle: "medium", timeZone: "Europe/Madrid" }).format(date);
}

export function localeTag() {
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
  if (number < 0) return "sn-down";
  if (number > 0) return "sn-up";
  return "sn-flat";
}

const COUNTRY_ISO = {
  "united states": "US", "united states of america": "US", usa: "US",
  "cayman islands": "KY", seychelles: "SC", singapore: "SG", "hong kong": "HK",
  malta: "MT", estonia: "EE", "united kingdom": "GB", uk: "GB", "great britain": "GB",
  japan: "JP", "south korea": "KR", korea: "KR", "republic of korea": "KR",
  australia: "AU", canada: "CA", switzerland: "CH", netherlands: "NL", "the netherlands": "NL",
  germany: "DE", france: "FR", lithuania: "LT", "british virgin islands": "VG",
  "virgin islands, british": "VG", "saint vincent and the grenadines": "VC",
  "st. vincent and the grenadines": "VC", "st vincent and the grenadines": "VC",
  china: "CN", "united arab emirates": "AE", uae: "AE", bermuda: "BM", gibraltar: "GI",
  ireland: "IE", luxembourg: "LU", taiwan: "TW", india: "IN", brazil: "BR",
  spain: "ES", portugal: "PT", italy: "IT", poland: "PL", sweden: "SE", norway: "NO",
  denmark: "DK", finland: "FI", austria: "AT", belgium: "BE", "czech republic": "CZ",
  czechia: "CZ", romania: "RO", hungary: "HU", greece: "GR", turkey: "TR", turkiye: "TR",
  israel: "IL", russia: "RU", "russian federation": "RU", ukraine: "UA", mexico: "MX",
  argentina: "AR", chile: "CL", colombia: "CO", "south africa": "ZA", nigeria: "NG",
  indonesia: "ID", malaysia: "MY", thailand: "TH", vietnam: "VN", "viet nam": "VN",
  philippines: "PH", "new zealand": "NZ", iceland: "IS", cyprus: "CY", slovenia: "SI",
  slovakia: "SK", croatia: "HR", bulgaria: "BG", latvia: "LV", liechtenstein: "LI",
  monaco: "MC", "isle of man": "IM", jersey: "JE", guernsey: "GG", "marshall islands": "MH",
  panama: "PA", "costa rica": "CR", bahamas: "BS", "the bahamas": "BS", belize: "BZ",
  barbados: "BB", "antigua and barbuda": "AG", "saint kitts and nevis": "KN",
  dominica: "DM", vanuatu: "VU", samoa: "WS", curacao: "CW", "curaçao": "CW",
  aruba: "AW", "puerto rico": "PR", macau: "MO", macao: "MO", kazakhstan: "KZ",
  georgia: "GE", armenia: "AM", azerbaijan: "AZ", bahrain: "BH", qatar: "QA",
  "saudi arabia": "SA", kuwait: "KW", egypt: "EG", morocco: "MA", kenya: "KE",
  peru: "PE", uruguay: "UY", venezuela: "VE", ecuador: "EC", pakistan: "PK",
  bangladesh: "BD", "sri lanka": "LK", mongolia: "MN", cambodia: "KH",
  serbia: "RS", albania: "AL", montenegro: "ME", moldova: "MD", belarus: "BY",
  "hong kong sar": "HK", "singapore city": "SG",
};

export function countryName(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const iso = COUNTRY_ISO[raw.toLowerCase()];
  if (!iso) return raw;
  try {
    const name = new Intl.DisplayNames([localeTag()], { type: "region" }).of(iso);
    return name || raw;
  } catch {
    return raw;
  }
}
