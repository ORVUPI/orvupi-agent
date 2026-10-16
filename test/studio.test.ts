import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { deflateSync } from "node:zlib";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";
import { pathToFileURL } from "node:url";
import { repoRoot } from "../src/paths.js";


const REQUIRED_TERMS = [
  "fomo",
  "última oportunidad",
  "last chance",
  "hoy o nunca",
  "antes de que suba",
  "before it pumps",
  "hurry",
  "solo hoy",
  "limited",
  "cuenta atrás",
  "countdown",
  "precio",
  "price",
  "market cap",
  "mcap",
  "capitalización",
  "volumen",
  "volume",
  "gráfico",
  "x10",
  "10x",
  "x100",
  "100x",
  "1000x",
  "moon",
  "to the moon",
  "lambo",
  "rocket",
  "cohete",
  "holders",
  "holder",
  "hodl",
  "holdea",
  "listing",
  "listado",
  "listará",
  "binance",
  "coinbase",
  "garantizado",
  "guaranteed",
  "sin riesgo",
  "risk-free",
  "rentabilidad",
  "retorno",
  "ganancias",
  "gains",
  "profit",
  "beneficio",
  "pasivo",
  "passive income",
  "sorteo",
  "giveaway",
  "airdrop",
  "regalo",
  "free tokens",
  "recompensa",
  "reward",
  "tesorería",
  "treasury",
  "reserva",
  "reserve",
  "respaldo",
  "backing",
  "backed",
  "compra ya",
  "compra",
  "comprar",
  "buy now",
  "invierte",
  "investment",
  "investing",
  "inversión",
  "prix",
  "preis",
  "preço",
  "prezzo",
  "цена",
  "价格",
  "ganancia",
  "rentable",
  "lucro",
  "subirá",
  "ser rico",
  "get rich",
  "multiplica tu dinero",
  "se va a disparar",
  "vale el doble",
  "ahora o nunca",
  "date prisa",
  "no te lo pierdas",
  "quedan pocas horas",
  "equipo de ORVUPI",
  "admin de ORVUPI",
  "support team",
  "soporte de ORVUPI",
  "dm me",
  "escríbeme por privado",
  "a la luna",
  "pump",
  "pump.fun",
  "oficial",
  "official",
  "verificado",
  "verified",
  "partner",
  "anuncio oficial",
  "frase semilla",
  "recovery phrase",
  "frase de recuperación",
  "mnemonic",
  "12 palabras",
  "24 palabras",
  "billetera",
  "regalamos",
  "duplicamos",
  "preventa",
  "presale",
  "whitelist",
  "firma la transacción",
  "sign transaction",
  "sign the transaction",
  "double your sol",
  "privkey",
  "inbox me",
  "drainer",
  "approve",
  "equipo orvupi",
  "va a subir",
  "semilla",
  "seed phrase",
  "seed",
  "clave privada",
  "private key",
  "conecta tu wallet",
  "connect wallet",
  "connect your wallet",
  "wallet",
  "reclama",
  "gratis",
  "mándame un DM",
  "por privado",
  "al priv",
  "inbox",
  "soporte",
  "ORVUPI team",
  "team ORVUPI",
];

type Hit = { kind: string; term: string };
type Analyze = (text: string) => { blocked: boolean; hits: Hit[] };
type Glyph = {
  ch: string;
  x: number;
  y: number;
  size: number;
  w: number;
  h: number;
  role: string;
  missing?: boolean;
};
type Card = {
  rgba: Uint8ClampedArray;
  png: Uint8Array;
  width: number;
  height: number;
  glyphs: Glyph[];
  fits: boolean;
  brandFontSize: number;
  brandTop: number;
  footerTop: number;
  label: string;
  watermarkAlpha: number;
  watermarkColor: number[];
  watermarkPlate: number[];
  watermarkBox: { x: number; y: number; w: number; h: number };
  labelBox: { x: number; y: number; w: number; h: number } | null;
  topBand: number;
  noticeFontSize: number;
  noticeInk: number;
  noticeText: string;
  noticeLines: number;
  noticeTop: number;
  fill: number[];
  texts: string[];
};
type InkPoint = { col: number; row: number };

function studioRoot(): string {
  return path.join(repoRoot(), "web/v2/studio");
}

function readStudio(rel: string): string {
  return readFileSync(path.join(studioRoot(), rel), "utf8");
}

async function load<T>(rel: string): Promise<T> {
  return (await import(pathToFileURL(path.join(studioRoot(), rel)).href)) as T;
}

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => (map.has(key) ? (map.get(key) ?? null) : null),
    setItem: (key: string, value: string) => {
      map.set(key, String(value));
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
  };
}

function pixel(card: Card, x: number, y: number): number[] {
  const i = (y * card.width + x) * 4;
  return [card.rgba[i] ?? 0, card.rgba[i + 1] ?? 0, card.rgba[i + 2] ?? 0, card.rgba[i + 3] ?? 0];
}

function glyphPixel(card: Card, glyph: Glyph, point: InkPoint): number[] {
  const scale = glyph.size / 8;
  const x = Math.floor(glyph.x + point.col * scale);
  const y = Math.floor(glyph.y + point.row * scale);
  return pixel(card, x, y);
}

function sameColor(got: number[], want: readonly number[]): boolean {
  return got[0] === want[0] && got[1] === want[1] && got[2] === want[2] && got[3] === want[3];
}

function minNoticePx(height: number): number {
  return Math.max(14, Math.ceil(height * 0.025));
}

/** Alto en píxeles de la primera letra del aviso, no el tamaño em. */
function noticeLetterPx(card: Card): number {
  const glyph = card.glyphs.find((item) => item.role === "notice");
  if (!glyph) return 0;
  const x0 = Math.max(0, Math.floor(glyph.x));
  const x1 = Math.min(card.width - 1, Math.ceil(glyph.x + Math.max(2, glyph.w * 0.62)));
  const y0 = Math.max(0, Math.floor(glyph.y));
  const y1 = Math.min(card.height - 1, Math.ceil(glyph.y + glyph.h));
  let top = Number.POSITIVE_INFINITY;
  let bottom = -1;
  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      const sample = pixel(card, x, y);
      if ((sample[0] ?? 0) >= 90 && (sample[1] ?? 0) >= 90 && (sample[2] ?? 0) >= 90) {
        if (y < top) top = y;
        if (y > bottom) bottom = y;
      }
    }
  }
  return bottom < top ? 0 : bottom - top + 1;
}

function channelLin(channel: number): number {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function contrastRgb(a: number[], b: number[]): number {
  const luma = (rgb: number[]) =>
    0.2126 * channelLin(rgb[0] ?? 0) + 0.7152 * channelLin(rgb[1] ?? 0) + 0.0722 * channelLin(rgb[2] ?? 0);
  const hi = Math.max(luma(a), luma(b));
  const lo = Math.min(luma(a), luma(b));
  return (hi + 0.05) / (lo + 0.05);
}

function deniedTokens(raw: string): string[] {
  return raw
    .split(/[\s,;]+/)
    .map((item) => item.trim().toLowerCase())
    .filter((item) => /^[a-z]+$/.test(item));
}

function textHasToken(text: string, token: string): boolean {
  const needle = token.toLowerCase();
  if (!/^[a-z]+$/.test(needle)) return false;
  return new RegExp(`(?:^|[^a-z])${needle}(?![a-z])`).test(text.toLowerCase());
}

function hiddenNames(): string[] {
  return [
    ["Cri", "stian"],
    ["Par", "do"],
    ["Cama", "cho"],
  ].map((parts) => parts.join("").toLowerCase());
}

function mentionsHiddenName(text: string): boolean {
  const folded = text.toLowerCase();
  return hiddenNames().some((name) => folded.includes(name));
}

function addedDiff(diff: string): string {
  return diff
    .split("\n")
    .filter((line) => line.startsWith("+") && !line.startsWith("+++"))
    .join("\n");
}

function walkFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "__pycache__" || name === "node_modules") continue;
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walkFiles(full, out);
    else out.push(full);
  }
  return out;
}

const BINARY_EXT = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".ico", ".woff", ".woff2", ".ttf", ".otf", ".pyc", ".pyo"]);

function pngChunk(type: string, data: Uint8Array): Uint8Array {
  const typeBytes = new TextEncoder().encode(type);
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  out.set(typeBytes, 4);
  out.set(data, 8);
  view.setUint32(8 + data.length, 0);
  return out;
}

function pngWithIdat(width: number, height: number, idat: Uint8Array): Uint8Array {
  const ihdr = new Uint8Array(13);
  const view = new DataView(ihdr.buffer);
  view.setUint32(0, width);
  view.setUint32(4, height);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const parts = [
    Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", idat),
    pngChunk("IEND", new Uint8Array()),
  ];
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function pngDeclaring(width: number, height: number): Uint8Array {
  return pngWithIdat(width, height, Uint8Array.from([0, 1, 2, 3]));
}

function pngTyped(width: number, height: number, depth: number, color: number, idat: Uint8Array, extra: Uint8Array[] = [], interlace = 0): Uint8Array {
  const ihdr = new Uint8Array(13);
  const view = new DataView(ihdr.buffer);
  view.setUint32(0, width);
  view.setUint32(4, height);
  ihdr[8] = depth;
  ihdr[9] = color;
  ihdr[12] = interlace;
  const parts = [
    Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", ihdr),
    ...extra,
    pngChunk("IDAT", idat),
    pngChunk("IEND", new Uint8Array()),
  ];
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function jpegBytes(width: number, height: number, orientation = 1): Uint8Array {
  const app0 = [0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00];
  const sof = [0xff, 0xc0, 0x00, 0x0b, 0x08, (height >> 8) & 255, height & 255, (width >> 8) & 255, width & 255, 0x01, 0x01, 0x11, 0x00];
  const parts = [0xff, 0xd8, ...app0];
  if (orientation > 1) {
    const tiff = [0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x12, 0x01, 0x03, 0x00, 0x01, 0x00, 0x00, 0x00, orientation & 255, (orientation >> 8) & 255, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00];
    const payload = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00, ...tiff];
    const size = payload.length + 2;
    parts.push(0xff, 0xe1, (size >> 8) & 255, size & 255, ...payload);
  }
  parts.push(...sof, 0xff, 0xd9);
  return Uint8Array.from(parts);
}

function webpBytes(width: number, height: number): Uint8Array {
  const out = new Uint8Array(30);
  out.set([0x52, 0x49, 0x46, 0x46, 22, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x58, 10, 0, 0, 0]);
  const w = width - 1;
  const h = height - 1;
  out[24] = w & 255;
  out[25] = (w >> 8) & 255;
  out[26] = (w >> 16) & 255;
  out[27] = h & 255;
  out[28] = (h >> 8) & 255;
  out[29] = (h >> 16) & 255;
  return out;
}

/** IDAT zlib de ceros sin comprimir. El archivo pesa ~1,4 MB y al inflarse supera un 8×8. */
function zlibStoredZeros(payloadLength: number): Uint8Array {
  const blocks = Math.ceil(payloadLength / 65535);
  const out = new Uint8Array(2 + payloadLength + blocks * 5 + 4);
  out[0] = 0x78;
  out[1] = 0x01;
  let cursor = 2;
  let remaining = payloadLength;
  while (remaining > 0) {
    const len = Math.min(65535, remaining);
    out[cursor] = remaining === len ? 1 : 0;
    cursor += 1;
    out[cursor] = len & 0xff;
    out[cursor + 1] = (len >> 8) & 0xff;
    cursor += 2;
    const nlen = len ^ 0xffff;
    out[cursor] = nlen & 0xff;
    out[cursor + 1] = (nlen >> 8) & 0xff;
    cursor += 2 + len;
    remaining -= len;
  }
  const adler = (((payloadLength % 65521) << 16) | 1) >>> 0;
  out[cursor] = (adler >>> 24) & 0xff;
  out[cursor + 1] = (adler >>> 16) & 0xff;
  out[cursor + 2] = (adler >>> 8) & 0xff;
  out[cursor + 3] = adler & 0xff;
  return out.subarray(0, cursor + 4);
}

function brandLinesOf(card: Card, role: string): string[] {
  const ys = [...new Set(card.glyphs.filter((glyph) => glyph.role === role).map((glyph) => glyph.y))].sort((a, b) => a - b);
  return ys.map((y) => card.glyphs.filter((glyph) => glyph.role === role && glyph.y === y).map((glyph) => glyph.ch).join(""));
}

function assertLockedSuffix(card: Card, role: string, suffix: string) {
  const lines = brandLinesOf(card, role);
  assert.ok(lines.length > 0, role);
  const last = lines[lines.length - 1] ?? "";
  if (lines.length === 1) assert.ok(last.endsWith(suffix), `${role} ${last}`);
  else assert.equal(last, suffix, `${role} ${lines.join("|")}`);
}

function joined(card: Card, role: string): string {
  return card.glyphs
    .filter((glyph) => glyph.role === role)
    .map((glyph) => glyph.ch)
    .join("");
}

function assertStampGone(card: Card, label = ""): void {
  assert.equal(card.noticeText, "", label);
  assert.equal(card.label, "", label);
  assert.equal(card.noticeLines, 0, label);
  assert.equal(card.watermarkAlpha, 0, label);
  assert.equal(card.watermarkBox.w, 0, label);
  assert.equal(card.watermarkBox.h, 0, label);
  assert.equal(card.labelBox, null, label);
  for (const role of ["notice", "watermark", "ai", "brand", "brandTop", "riskTop"]) {
    assert.equal(joined(card, role), "", `${label} ${role}`);
  }
}

describe("studio", () => {
  test("la lista cubre el dictamen y las palabras cortas no se buscan como fragmento", async () => {
    const list = JSON.parse(readStudio("blocklist.json")) as {
      shortWords: string[];
      terms: string[];
      emojis: string[];
      emojiSequences: string[];
      handles: string[];
      domains: string[];
    };
    assert.deepEqual(list.shortWords, [
      "ya",
      "now",
      "buy",
      "fondo",
      "fondos",
      "fund",
      "funds",
      "return",
      "ape",
      "ath",
      "invest",
      "roi",
      "cex",
      "corre",
      "chart",
      "free",
      "dm",
      "md",
      "claim",
      "claims",
      "ganar",
      "sube",
      "support",
    ]);
    for (const term of REQUIRED_TERMS) assert.ok(list.terms.includes(term), term);
    for (const word of list.shortWords) assert.equal(list.terms.includes(word), false, word);
    assert.deepEqual(list.emojis, ["🚀", "🌕", "📈", "💎", "🙌", "🤑", "💰", "🔥", "🌙", "💸", "📊", "💲"]);
    assert.equal(Object.hasOwn(list, "nameHashes"), false);
    assert.deepEqual(list.emojiSequences, ["💎🙌"]);
    assert.deepEqual(list.handles, ["ORVUPI", "orvupi", "creadorORVUPI"]);
    assert.deepEqual(list.domains, ["stubxai.com", "t.me"]);

    const { analyze, exportAllowed } = await load<{ analyze: Analyze; exportAllowed: (title: string, body: string, list?: unknown, token?: string) => boolean }>(
      "lib/filter.mjs",
    );
    const blocked = [
      "MOON",
      "m o o n",
      "m.o.o.n",
      "mo\u200Bon",
      "mооn",
      "x 1 0 0",
      "x100",
      "c0mpra-ya",
      "g4r4ntiz4d0",
      "garantizadó",
      "últimá oportunidad",
      "l1sting",
      "h0dl",
      "y4",
      "en el fondo",
      "fondos",
      "corre",
      "c0rre",
      "c o r r e",
      "f u n d",
      "fund",
      "funds",
      "fúnd",
      "invest",
      "investment",
      "investing",
      "inversión",
      "roi",
      "r o i",
      "cex",
      "chart",
      "🚀",
      "🚀\uFE0F",
      "💎🙌",
      "😀 no, pero 💰 sí",
      "https://example.com/ruta",
      "www.example.org",
      "mira orvupi . com",
      "entra en t . me",
      "@ORVUPI",
      "@ orvupi",
      "@creadorORVUPI",
      "＠orvupi",
      "1".repeat(32),
      "1".repeat(44),
      "Zz9".repeat(11),
      [..."Zz9".repeat(11)].join(" "),
      "antes de que suba el gráfico",
      "abc".repeat(12),
      "p/r/e/c/i/o",
      "p·r·e·c·i·o",
      "\u1D18\u0280\u1D07\u1D04\u026A\u1D0F",
      "\u00D7100",
      "prix",
      "Preis",
      "preço",
      "prezzo",
      "цена",
      "价格",
      "ganancia",
      "rentable",
      "lucro",
      "subirá",
      "ser rico",
      "get rich",
      "multiplica tu dinero",
      "se va a disparar",
      "vale el doble",
      "ahora o nunca",
      "date prisa",
      "no te lo pierdas",
      "quedan pocas horas",
      "🔥",
      "🌙",
      "💸",
      "📊",
      "💲",
      "soy el equipo de ORVUPI",
      "admin de ORVUPI",
      "support team",
      "soporte de ORVUPI",
      "telegram orvupi",
      "@orvupi",
      "@creadorORVUPI",
      "stubxai[.]com",
      "dm me",
      "escríbeme por privado",
      "$ORVUPI a la luna",
      "oficial",
      "anuncio oficial",
      "envíame tu frase semilla",
      "seed phrase",
      "clave privada",
      "private key",
      "conecta tu wallet",
      "connect wallet",
      "claim",
      "reclama tus tokens",
      "gratis",
      "free",
      "airdrop",
      "mándame un DM",
      "DM",
      "por privado",
      "hablamos por privado",
      "mándame por privado",
      "no es broma, escríbeme por privado",
      "no dudes en escribirme por privado",
      "no tengas miedo, hablemos por privado",
      "nunca compartas tu frase, salvo por privado conmigo",
      "no hay problema por privado te paso el enlace",
      "MD",
      "al priv",
      "inbox",
      "háblame por MD",
      "te espero al priv",
      "Nadie escribe por privado",
      "Jamás escriben por privado",
      "Los admins nunca escriben primero por privado",
      "Los admins nunca escriben por privado. Escríbeme",
      "Los admins nunca escriben por privado😀escríbeme por privado",
      "no escribas por privado, escríbeme",
      "no!!! escríbeme por privado",
      "Los admins nunca escriben por privado. El cielo esta limpio. Escríbeme",
      "Los admins nunca escriben por privado. El cielo esta limpio. Salvo a mí",
      "Los admins nunca escriben por privado. El cielo esta limpio. Excepto yo",
      "Los admins nunca escriben por privado. El cielo esta limpio. Menos mal",
      "Los admins nunca escriben por privado. El cielo esta limpio. Solo entonces",
      "Los admins nunca escriben por privado. El cielo esta limpio. Pero no",
      "Los admins nunca escriben por privado. El cielo esta limpio. Yo sí",
      "Los admins nunca escriben por privado. El cielo esta limpio. A mí no",
      "Los admins nunca escriben por privado. El cielo esta limpio. Soy admin",
      "El equipo nunca te escribe por privado. Yo sí.",
      "Los admins nunca escriben por privado, salvo a mí",
      "Los admins nunca escriben por privado. Solo a mí.",
      "Los admins nunca escriben por privado. Yo soy admin, te ayudo.",
      "Los admins nunca escriben por privado. Aparte de mí.",
      "Los admins nunca escriben por privado. Yo es distinto.",
      "Los admins nunca escriben por privado. Yo no soy el equipo.",
      "Los admins nunca escriben por privado. Soy mod.",
      "Los admins nunca escriben por privado. Yo te ayudo.",
      "Admins never DM you. I do.",
      "Admins never DM you. Except me.",
      "Admins never DM you. Only me.",
      "Admins never DM you. I'm an admin.",
      "Los admins nunca escriben por privado. El cielo esta limpio.",
      "Los admins nunca escriben por privado excepto a mí",
      "Los admins nunca escriben por privado menos a mí",
      "Los admins nunca escriben por privado solo contigo",
      "Los admins nunca escriben por privado pero yo no",
      "Nunca te escribiremos por privado. A mí sí.",
      "Los admins nunca escriben por privado. Soy admin.",
      "admins will never DM you. pm me",
      "never reply to DMs. 3scr1b3m3",
      "pm me",
      "text me",
      "hit me up",
      "DMs abiertos",
      "mensájeame",
      "al pv",
      "por priv",
      "por interno",
      "llámame",
      "telegram @usuario",
      "telegram @x",
      "Mi Telegram: @x",
      "signal",
      "insta",
      "instagram",
      "1nst4",
      "s1gn4l",
      "tg",
      "wsp",
      "ping me",
      "msg me",
      "por pv",
      "p1ng m3",
      "+34 612 345 678",
      "+34 612.345.678",
      "+12",
      "tel 612345678",
      "tlf 612 345 678",
      "teléfono 612.345.678",
      "phone 612-345-678",
      "llama al 612345678",
      "call 612.345.678",
      "whatsapp 612-345-678",
      "mi número 612345678",
      "móvil 612 345 678",
      "telf 612.345.678",
      "contacto 612-345-678",
      "wa 6 1 2 3 4 5 6 7 8 9",
      "0034 612 345 678",
      "0034612345678",
      "0034.612.345.678",
      "ig",
      "IG",
      "snapchat",
      "kik",
      "mi line",
      "line me",
      "line @ana",
      "viber",
      "wechat",
      "we chat",
      "threema",
      "mi session",
      "session @ana",
      "reddit dm",
      "line: ana",
      "line id",
      "session: x",
      "session id",
      "reddit: alguien",
      "reddit id",
      "reddit u/alguien",
      "tiktok",
      "t1kt0k",
      "skype",
      "sk1pe",
      "wasap",
      "whatsapp",
      "Ok. Escríbeme",
      "3scr1b3m3",
      "p0r pr1v",
      "4l pv",
      "t3l3gr4m @us3r",
      "w4s4p",
      "wh4ts4pp",
      "ll4m4m3",
      "m3ns4j34m3",
      "h1t m3 up",
      "DM5 4b13rt0s",
      "soporte",
      "support",
      "ganar",
      "sube",
      "50x",
      "2x",
      "ORVUPI team",
      "team ORVUPI",
      "p\u0433ecio",
      "pre\u3164cio",
      "recovery phrase",
      "mnemonic",
      "12 palabras",
      "24 palabras",
      "conecta tu billetera",
      "regalamos",
      "envía 1 SOL y te devolvemos 2",
      "duplicamos",
      "preventa",
      "presale",
      "whitelist",
      "firma la transacción",
      "sign transaction",
      "sign the transaction",
      "enviamos 2 SOL y te devolvemos 4",
      "no esperes: envía tu semilla",
      "No es broma, manda tu frase semilla",
      "no olvides enviar tu clave privada",
      "send 1 sol get 2 back",
      "double your sol",
      "privkey",
      "inbox me",
      "drainer",
      "approve",
      "beware, 1000x guaranteed profit",
      "cuidado, rentabilidad garantizada del 300%",
      "alerta, precio x100 seguro",
      "desconfía de bancos, invierte en ORVUPI",
      "Desconfía de otros, compra ORVUPI antes que nadie",
      "beware of fakes, real presale here",
      "Si te piden la clave privada no es estafa, dámela",
      "ORVUPI sube",
      "sube ORVUPI",
      "ganar mucho",
      "ganar lana",
      "ganar 100 sol",
      "Send 0.5 SOL, get 1 SOL back",
      "enívia y te devolvemos el doble",
      "a mí envíamela",
      "hola; a mí envíamela",
      "no es estafa, pásamela",
      "ganar muchísimo dinero",
      "ganar dinero",
      "el precio sube",
      "x 50",
      "x50",
      "x2",
      "equipo orvupi",
      "va a subir",
      "pr\u20ACcio",
      "\u13E2recio",
      "\u2CA3recio",
      "\uFF50\uFF52\uFF45\uFF43\uFF49\uFF4F",
      "\uD83C\uDD7Frecio",
      "가격",
      "価格",
    ];
    for (const sample of blocked) {
      assert.equal(analyze(sample).blocked, true, sample);
    }
    const allowed = [
      "playa",
      "knowledge",
      "buyer",
      "papel",
      "athlete",
      "returning",
      "correo",
      "correo urgente",
      "correcto",
      "profundo",
      "investigar",
      "heroico",
      "fundamental",
      "elefante",
      "hace xbox",
      "charter",
      "comprobar la dirección",
      "La gracia no sustituye a mirar nada mas ahora.",
      "El nombre no basta",
      "no oficial",
      "unofficial",
      "no/oficial",
      "contenido no oficial",
      "@ORVUPIextra",
      "12345678",
      "1".repeat(31),
      `${"1".repeat(20)}0${"1".repeat(20)}`,
      "Supply: 1000000000",
      "Bloque 312345678",
      "612345678",
      "612.345.678",
      "612-345-678",
      "6 1 2 3 4 5 6 7 8 9",
      "line",
      "la session de hoy",
      "en linea",
      "reddit",
      "no respondas a nadie que te escriba por privado",
      "Protege tu cartera",
      "Be careful",
      "😀",
      "Una nota sin enlace.",
      "freedom",
      "freeze",
      "disclaimer",
      "engañar",
      "subestimado",
      "unsupported",
      "ganar confianza",
      "la marea sube",
      "support the community",
      "ya veremos",
      "ganar experiencia",
      "sube la escalera",
      "we support learning",
      "I support memes",
      "ya lo sabes",
      "Si alguien te pide la semilla, es una estafa",
      "Desconfía de los airdrops",
      "Nunca compartas tu frase semilla",
      "No envíes tu semilla a nadie",
      "Nunca des tu clave privada",
      "No conectes tu wallet a webs raras",
      "ORVUPI nunca te pedirá la semilla",
      "never share your seed phrase",
      "never share your recovery phrase",
      "Nunca envíes 1 SOL y te devolvemos 2",
      "Los admins nunca escriben por privado",
      "los admins nunca te escriben por privado",
      "nadie nunca escribe por privado",
      "el equipo nunca escriben por privado",
      "no escribas por privado",
      "no respondas por privado",
      "no contestes por privado",
      "no escribas por privado😀",
      "Si te escriben por privado, es una estafa",
      "Si te escriben por privado, es estafa",
      "nunca te escribiremos por privado",
      "el equipo nunca pide nada por privado",
      "El equipo nunca te escribe por privado",
      "admins will never DM you",
      "admins will never message you",
      "the team will never DM you",
      "the team will never message you",
      "we will never DM you",
      "we will never message you",
      "never reply to DMs",
      "never reply to DM",
      "admins will never DM you.",
      "We never DM first",
      "Admins never DM you",
      "If someone DMs you, it's a scam",
      "nadie del equipo te escribirá por privado",
      "cuidado con quien te escribe por privado",
      "Los admins nunca escriben por privado. Cuidado.",
      "Los admins nunca escriben por privado. Ojo.",
      "Los admins nunca escriben por privado. No es consejo de inversión.",
      "Cuidado. Los admins nunca escriben por privado. Ojo.",
      "Admins never DM you. We never DM first. If someone DMs you, it's a scam.",
      "Los admins nunca escriben por privado. Cripto de alto riesgo · Puedes perderlo todo · No es consejo de inversión.",
      "Admins never DM you. High-risk crypto · You could lose everything · Not investment advice.",
      "Los admins nunca escriben por privado. Protege tu cartera.",
      "Admins never DM you. Be careful.",
      "Cuidado.",
      "Ojo.",
      "Yo sí",
      "Solo a mí",
      "Yo soy admin, te ayudo",
      "El cielo es azul pero lejos.",
      "al menos la playa",
      "solo la playa",
      "para mí la playa",
    ];
    for (const sample of allowed) {
      assert.equal(analyze(sample).blocked, false, sample);
    }
    assert.equal(exportAllowed("playa", "comprobar"), true);
    assert.equal(exportAllowed("playa", "moon"), false);
    assert.equal(exportAllowed("correo", "profundo"), true);
    assert.equal(exportAllowed("playa", "comprobar", undefined, "ORVUPI"), true);
    assert.equal(exportAllowed("playa", "comprobar", undefined, "LUNA"), true);
    assert.equal(exportAllowed("playa", "comprobar", undefined, "moon"), false);
    assert.equal(exportAllowed("playa", "comprobar", undefined, "1000x"), false);
    assert.equal(exportAllowed("playa", "comprobar", undefined, "precio x100"), false);
    assert.equal(analyze("correo moon").blocked, true);
    assert.equal(analyze("c o r r e").hits.some((hit) => hit.kind === "short" && hit.term === "corre"), true);
    assert.equal(analyze("f u n d").hits.some((hit) => hit.kind === "short" && hit.term === "fund"), true);
    assert.equal(analyze("fondos").hits.some((hit) => hit.kind === "short" && hit.term === "fondos"), true);
    assert.equal(analyze("fondo").hits.some((hit) => hit.kind === "short" && hit.term === "fondo"), true);
    assert.equal(analyze("Los admins nunca escriben por privado en el fondo").hits.some((hit) => hit.term === "fondo"), true);
    assert.equal(analyze("Los admins nunca escriben por privado").hits.some((hit) => hit.term === "por privado"), false);
    assert.equal(analyze("escríbeme por privado").hits.some((hit) => hit.term === "escríbeme por privado" || hit.term === "por privado"), true);
    assert.equal(analyze("Los admins nunca escriben por privado. El cielo esta limpio. Escríbeme").hits.some((hit) => hit.term === "por privado"), true);
    assert.equal(analyze("Los admins nunca escriben por privado. El cielo esta limpio. Pero no").hits.some((hit) => hit.term === "por privado"), true);
    assert.equal(analyze("nunca te escribiremos por privado. El cielo esta limpio. Salvo eso").hits.some((hit) => hit.term === "por privado"), true);
    assert.equal(analyze("nunca te escribiremos por privado").hits.some((hit) => hit.term === "por privado"), false);
    assert.equal(analyze("el equipo nunca pide nada por privado").hits.some((hit) => hit.term === "por privado"), false);
    assert.equal(analyze("admins will never DM you").hits.some((hit) => hit.term === "dm"), false);
    assert.equal(analyze("the team will never message you").hits.some((hit) => hit.term === "dm" || hit.term === "message"), false);
    assert.equal(analyze("we will never DM you").blocked, false);
    assert.equal(analyze("never reply to DMs").hits.some((hit) => hit.term === "dm" || hit.term === "dms"), false);
    assert.equal(analyze("admins will never DM you. pm me").hits.some((hit) => hit.term === "dm"), true);
    assert.equal(analyze("por priv").hits.some((hit) => hit.term === "por priv"), true);
    assert.equal(analyze("3scr1b3m3").hits.some((hit) => hit.term === "escribeme"), true);
    assert.equal(analyze("Ok. Escríbeme").hits.some((hit) => hit.term === "escribeme"), true);
    assert.equal(analyze("telegram @usuario").hits.some((hit) => hit.term === "telegram"), true);
    assert.equal(analyze("Los admins nunca escriben por privado. Aparte de mí.").hits.some((hit) => hit.term === "por privado"), true);
    assert.equal(analyze("Admins never DM you. I do.").hits.some((hit) => hit.term === "dm"), true);
    assert.equal(analyze("Admins never DM you. I'm an admin.").hits.some((hit) => hit.term === "dm"), true);
    assert.equal(analyze("We never DM first").hits.some((hit) => hit.term === "dm"), false);
    assert.equal(analyze("Admins never DM you").hits.some((hit) => hit.term === "dm"), false);
    assert.equal(analyze("If someone DMs you, it's a scam").hits.some((hit) => hit.term === "dm" || hit.term === "dms"), false);
    assert.equal(analyze("nadie del equipo te escribirá por privado").hits.some((hit) => hit.term === "por privado"), false);
    assert.equal(analyze("cuidado con quien te escribe por privado").hits.some((hit) => hit.term === "por privado"), false);
    assert.equal(analyze("Los admins nunca escriben por privado. No es consejo de inversión.").hits.some((hit) => hit.term === "inversión" || hit.term === "por privado"), false);
    assert.equal(analyze("Mi Telegram: @x").hits.some((hit) => hit.term === "telegram"), true);
    assert.equal(analyze("signal").hits.some((hit) => hit.term === "signal"), true);
    assert.equal(analyze("por pv").hits.some((hit) => hit.term === "por pv"), true);
    assert.equal(analyze("Supply: 1000000000").blocked, false);
    assert.equal(analyze("Bloque 312345678").blocked, false);
    assert.equal(analyze("612345678").hits.some((hit) => hit.term === "telefono"), false);
    assert.equal(analyze("tel 612345678").hits.some((hit) => hit.term === "telefono"), true);
    assert.equal(analyze("teléfono 612.345.678").hits.some((hit) => hit.term === "telefono"), true);
    assert.equal(analyze("phone 612-345-678").hits.some((hit) => hit.term === "telefono"), true);
    assert.equal(analyze("mi número 612345678").hits.some((hit) => hit.term === "telefono"), true);
    assert.equal(analyze("móvil 612 345 678").hits.some((hit) => hit.term === "telefono"), true);
    assert.equal(analyze("telf 612.345.678").hits.some((hit) => hit.term === "telefono"), true);
    assert.equal(analyze("contacto 612-345-678").hits.some((hit) => hit.term === "telefono"), true);
    assert.equal(analyze("wa 6 1 2 3 4 5 6 7 8 9").hits.some((hit) => hit.term === "telefono"), true);
    assert.equal(analyze("6 1 2 3 4 5 6 7 8 9").hits.some((hit) => hit.term === "telefono"), false);
    assert.equal(analyze("0034 612 345 678").hits.some((hit) => hit.term === "telefono"), true);
    assert.equal(analyze("0034612345678").hits.some((hit) => hit.term === "telefono"), true);
    assert.equal(analyze("1".repeat(31)).hits.some((hit) => hit.kind === "base58"), false);
    assert.equal(analyze("1".repeat(31)).blocked, false);
    assert.equal(analyze("12345678").blocked, false);
    assert.equal(analyze("no respondas a nadie que te escriba por privado").hits.some((hit) => hit.term === "por privado"), false);
    assert.equal(analyze("Protege tu cartera").blocked, false);
    assert.equal(analyze("Be careful").blocked, false);
    assert.equal(analyze("Los admins nunca escriben por privado. Protege tu cartera.").hits.some((hit) => hit.term === "por privado"), false);
    assert.equal(analyze("Admins never DM you. Be careful.").hits.some((hit) => hit.term === "dm"), false);
    assert.equal(analyze("mi line").hits.some((hit) => hit.term === "line"), true);
    assert.equal(analyze("line").blocked, false);
    assert.equal(analyze("la session de hoy").blocked, false);
    assert.equal(analyze("mi session").hits.some((hit) => hit.term === "session"), true);
    assert.equal(analyze("reddit dm").blocked, true);
    assert.equal(analyze("reddit").blocked, false);
    assert.equal(analyze("line: ana").hits.some((hit) => hit.term === "line"), true);
    assert.equal(analyze("line id").hits.some((hit) => hit.term === "line"), true);
    assert.equal(analyze("session: x").hits.some((hit) => hit.term === "session"), true);
    assert.equal(analyze("session id").hits.some((hit) => hit.term === "session"), true);
    assert.equal(analyze("reddit: alguien").hits.some((hit) => hit.term === "reddit"), true);
    assert.equal(analyze("reddit id").hits.some((hit) => hit.term === "reddit"), true);
    assert.equal(analyze("reddit u/alguien").hits.some((hit) => hit.term === "reddit"), true);
    assert.equal(analyze("tiktok").hits.some((hit) => hit.term === "tiktok"), true);
    assert.equal(analyze("t1kt0k").hits.some((hit) => hit.term === "tiktok"), true);
    assert.equal(analyze("sk1pe").hits.some((hit) => hit.term === "skype"), true);
    assert.equal(analyze("para mí la playa").blocked, false);
    assert.equal(analyze("Yo sí").blocked, false);
    assert.equal(analyze("elefante").blocked, false);
    assert.equal(analyze("@creadorORVUPI").hits.some((hit) => hit.kind === "handle"), true);
    assert.equal(analyze("equipo de ORVUPI").hits.some((hit) => hit.kind === "term"), true);
    assert.equal(analyze("ganar").hits.some((hit) => hit.kind === "short" && hit.term === "ganar"), true);
    assert.equal(analyze("sube").hits.some((hit) => hit.kind === "short" && hit.term === "sube"), true);
    assert.equal(analyze("support").hits.some((hit) => hit.kind === "short" && hit.term === "support"), true);
    assert.equal(analyze("engañar").blocked, false);
    assert.equal(analyze("subestimado").blocked, false);
    assert.equal(analyze("unsupported").blocked, false);
  });

  test("el filtro bloquea el pie retirado si el usuario lo escribe", async () => {
    const { analyze, exportAllowed } = await load<{ analyze: Analyze; exportAllowed: (title: string, body: string, list?: unknown, token?: string) => boolean }>(
      "lib/filter.mjs",
    );
    const retiredEs = ["Cripto de alto riesgo", " · ", "Puedes perderlo todo", " · ", "No es consejo de inversión."].join("");
    const retiredEn = ["High-risk crypto", " · ", "You could lose everything", " · ", "Not investment advice."].join("");
    assert.equal(analyze("oficial").blocked, true);
    assert.equal(analyze("anuncio oficial").blocked, true);
    assert.equal(analyze("no oficial").blocked, false);
    assert.equal(analyze("unofficial").blocked, false);
    assert.equal(analyze("correcto").blocked, false);
    assert.equal(analyze("fundamental").blocked, false);
    assert.equal(analyze("heroico").blocked, false);
    assert.equal(analyze("no oficial · unofficial").blocked, false);
    assert.equal(analyze(retiredEs).blocked, true);
    assert.equal(analyze(retiredEn).blocked, true);
    const templates = JSON.parse(readStudio("templates.json")) as {
      templates: { title: { es: string; en: string }; body: { es: string; en: string } }[];
    };
    for (const template of templates.templates) {
      for (const lang of ["es", "en"] as const) {
        assert.equal(exportAllowed(template.title[lang], template.body[lang]), true, `${template.title[lang]} / ${template.body[lang]}`);
      }
    }
  });

  test("aiLabel no escribe etiqueta y el catálogo declara el origen", async () => {
    const { aiLabel, noticeFor, noticeChoices, PNG_COMMENT } = await load<{
      aiLabel: (origins: string[], lang: string) => string;
      noticeFor: (lang: string, token: string) => string;
      noticeChoices: (lang: string, token: string) => string[];
      PNG_COMMENT: string;
    }>("lib/copy.mjs");
    assert.equal(aiLabel([], "es"), "");
    assert.equal(aiLabel(["ninguno"], "es"), "");
    assert.equal(aiLabel(["mascota"], "es"), "");
    assert.equal(aiLabel(["mascota"], "en"), "");
    assert.equal(aiLabel(["ai"], "es"), "");
    assert.equal(aiLabel(["ai"], "en"), "");
    assert.equal(aiLabel(["ai", "mascota", "ninguno"], "en"), "");
    assert.equal(aiLabel(["ai", "mascota"], "es"), "");
    assert.equal(noticeFor("es", "LUNA"), "");
    assert.equal(noticeFor("en", "ORVUPI"), "");
    assert.deepEqual(noticeChoices("es", "LUNA"), []);
    assert.equal(PNG_COMMENT, "");

    const catalog = JSON.parse(readStudio("catalog.json")) as {
      items: { archivo: string; tipo?: string; licencia: string | { es: string; en: string }; permitido: boolean; aiOrigin: string; sha256: string }[];
    };
    const origins = new Set(catalog.items.map((item) => item.aiOrigin));
    assert.deepEqual([...origins].sort(), ["mascota", "ninguno"]);
    for (const item of catalog.items) {
      assert.equal(item.permitido, true, item.archivo);
      assert.ok(["ai", "mascota", "ninguno"].includes(item.aiOrigin), item.archivo);
      const bytes = readFileSync(path.join(studioRoot(), item.archivo));
      assert.equal(createHash("sha256").update(bytes).digest("hex"), item.sha256, item.archivo);
      if (item.tipo === "fondo") assert.ok(bytes.length < 120_000, item.archivo);
    }
    const reglas = readStudio("reglas/index.html");
    for (const item of catalog.items) {
      const lines = typeof item.licencia === "string" ? [item.licencia] : [item.licencia.es, item.licencia.en];
      for (const line of lines) assert.ok(reglas.includes(line), line);
    }
    assert.equal(new RegExp(`\\b${["STU", "BX"].join("")}\\b|Agente Tal[oó]n`, "i").test(reglas), false);
    assert.match(reglas, /MIT code\. Flat color taken from the ORVUPI meme kit palette\./);
    assert.equal(reglas.includes("generados con IA.»."), false);
    assert.equal(reglas.includes("AI-generated elements.”."), false);
  });

  test("la licencia va literal y el logo no sale del navegador", () => {
    const editor = readStudio("index.html");
    const reglas = readStudio("reglas/index.html");
    const script = readStudio("studio.js");
    assert.match(reglas, /Recurso visual generado para ORVUPI/);
    for (const html of [editor, reglas]) {
      assert.equal(/<form\b/.test(html), false);
      assert.match(html, /No se guarda con el borrador/);
      assert.match(html, /It is not saved with the draft/);
    }
    assert.match(editor, /no se envía a ningún servidor/);
    assert.match(editor, /is not sent to any server/);
    assert.equal((editor.match(/type="file"/g) ?? []).length, 1);
    assert.equal(/type="file"/.test(reglas), false);
    assert.match(editor, /id="token"/);
    assert.match(editor, /Nombre o ticker/);
    assert.match(editor, /Name or ticker/);
    assert.match(editor, /value="ORVUPI"/);
    assert.match(editor, /id="logo"/);
    assert.match(editor, /accept="image\/png,image\/jpeg,image\/webp"/);
    assert.match(editor, /JPG, PNG o WebP\. Si pasa de 2048 px, se reduce\./);
    assert.match(editor, /JPG, PNG or WebP\. If it is over 2048 px, it is reduced\./);
    assert.match(editor, /Este formato no se puede usar\. Prueba con JPG o PNG\./);
    assert.match(editor, /This format can’t be used\. Try JPG or PNG\./);
    assert.match(editor, /Los recursos de ORVUPI son la opción por defecto/);
    assert.match(editor, /ORVUPI assets are the default option/);
    assert.match(editor, /Ese archivo no sirve como logo/);
    assert.match(editor, /That file cannot be used as a logo/);
    assert.match(editor, /id="aviso-logo-peso"/);
    assert.match(editor, /El archivo pesa demasiado \(máx\. 8 MB\)\./);
    assert.match(editor, /The file is too large \(max\. 8 MB\)\./);
    assert.match(readStudio("lib/logo.mjs"), /export const LOGO_MAX_BYTES = 8_000_000/);
    assert.match(editor, /La imagen es demasiado grande \(máx\. 4096 px de lado, 16\.777\.216 píxeles\)\./);
    assert.match(editor, /The image is too large \(max\. 4096 px on a side, 16,777,216 pixels\)\./);
    assert.match(editor, /Este navegador no puede reducir la imagen\. Usa una de hasta 2048 px\./);
    assert.match(editor, /This browser cannot reduce the image\. Use one up to 2048 px\./);
    assert.equal(editor.includes("8192 px"), false);
    assert.equal(editor.includes("1,5 MB"), false);
    assert.equal(editor.includes("1.5 MB"), false);
    assert.equal(reglas.includes("No oficial de {nombre} ni de ORVUPI"), false);
    assert.equal(reglas.includes("Not official from {name} or ORVUPI"), false);
    assert.equal(reglas.toLowerCase().includes("imagen generada con ia"), false);
    assert.equal(reglas.toLowerCase().includes("ai-generated image"), false);
    assert.match(editor, /Usa solo un logo que tengas derecho a usar\./);
    assert.equal(editor.includes("Si se hizo con IA, indícalo al publicar."), false);
    assert.match(editor, /Only use a logo you have the right to use\./);
    assert.equal(editor.includes("If it was made with AI, say so when you post."), false);
    const invisible = String.raw`[\u00AD\u034F\u061C\u115F\u1160\u17B4\u17B5\u180E\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u206F\u2800\u3164\uFE00-\uFE0F\uFEFF\uFFA0\uFFF9-\uFFFB]`;
    const filterSrc = readStudio("lib/filter.mjs");
    const logoSrc = readStudio("lib/logo.mjs");
    assert.ok(filterSrc.includes(`export const INVISIBLE_CHARS = /${invisible}/g`));
    assert.ok(logoSrc.includes("INVISIBLE_CHARS"));
    assert.match(logoSrc, /\.normalize\("NFKC"\)/);
    assert.equal(logoSrc.includes(String.raw`[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]`), false);
    assert.match(editor, /id="aviso-logo-medida"/);
    assert.match(readStudio("studio.css"), /#aviso-logo \.lang, #aviso-logo-formato \.lang, #aviso-logo-peso \.lang, #aviso-logo-medida \.lang, #aviso-logo-reducir \.lang \{ display: block; \}/);
    assert.match(editor, /Con otro nombre no se usa la mascota de ORVUPI/);
    assert.match(editor, /With another name the ORVUPI mascot is not used/);
    assert.match(script, /message === "logo-bytes"/);
    assert.match(script, /message === "logo-size"/);
    assert.match(script, /message === "logo-format"/);
    assert.match(script, /message === "logo-scale"/);
    assert.match(script, /file\.size > LOGO_MAX_BYTES/);
    const change = script.slice(script.indexOf('logoInput.addEventListener("change"'), script.indexOf("logoClear.addEventListener"));
    assert.match(change, /if \(file\.size > LOGO_MAX_BYTES\) \{[\s\S]*?return;\s*\}/);
    assert.ok(change.indexOf("file.size > LOGO_MAX_BYTES") < change.indexOf("readBlob("));
    const pngSrc = readStudio("lib/png.mjs");
    const counter = pngSrc.slice(pngSrc.indexOf("async function countInflatedBytes"), pngSrc.indexOf("async function inflateBytes"));
    assert.equal(counter.includes("parts.push"), false);
    assert.match(pngSrc, /await countInflatedBytes\(idat, cap\)/);
    assert.match(logoSrc, /rejectsWithoutResize\(plan\.width, plan\.height, canResize\)\) throw new Error\("logo-scale"\)/);
    assert.match(script, /function hideLogoErrors\(\)/);
    assert.match(script, /createLogoGate/);
    assert.match(script, /stillCurrent\(\)/);
    assert.match(logoSrc, /new AbortController\(\)/);
    assert.match(logoSrc, /ticket \+= 1/);
    assert.match(logoSrc, /error\?\.message === "PNG demasiado grande"\) throw new Error\("logo-size"\)/);
    assert.match(logoSrc, /createImageBitmap/);
    assert.match(logoSrc, /imageOrientation: "from-image"/);
    assert.equal(logoSrc.includes("createObjectURL"), false);
    const quitar = script.slice(script.indexOf("logoClear.addEventListener"), script.indexOf("download.addEventListener"));
    assert.match(quitar, /logoGate\.cancel\(\)/);
    const show = script.slice(script.indexOf("function showLogoError"), script.indexOf("function readBlob"));
    assert.match(show, /message === "logo-size"\) logoSizeNotice\.hidden = false/);
    assert.match(show, /else logoNotice\.hidden = false/);
    assert.match(script, /const orvupiName = isOrvupiToken\(name\)/);
    assert.match(script, /const avatar = orvupiName \? avatarItem\(\) : null/);
    assert.equal(/type="file"|<form\b|gallery|galería|FormData/.test(script), false);
    assert.match(script, /readLogoPng/);
    assert.match(script, /arrayBuffer/);
    assert.match(script, /link\.download = "studio\.png"/);
    const persist = script.slice(script.indexOf("function persist"), script.indexOf("async function draw"));
    assert.match(persist, /token: tokenName\(\)/);
    assert.equal(/customLogo|rgba|arrayBuffer/.test(persist), false);
    assert.match(script, /canvas\.toBlob/);
    assert.match(script, /injectComment/);
    assert.match(script, /navigator\.share/);
    assert.match(script, /exportAllowed/);
    const release = script.slice(script.indexOf("function releaseBlob"), script.indexOf("function showSaveNotice"));
    assert.match(release, /exportAllowed/);
    assert.match(script.slice(script.indexOf("download.addEventListener"), script.indexOf("share.addEventListener")), /releaseBlob\(readyBlob\(\)\)/);
    assert.match(script.slice(script.indexOf("share.addEventListener"), script.indexOf("clearButton.addEventListener")), /releaseBlob\(readyBlob\(\)\)/);
    assert.equal(script.split("mayCacheCard(mascotMark())").length - 1, 2);
    assert.match(script, /mascotCacheMark/);
    assert.match(script, /stampImage\(/);
    assert.equal(script.includes("rgba[last >> 1]"), false);
    assert.match(script, /willReadFrequently: true/);
    assert.match(script, /setTimeout\(\(\) => URL\.revokeObjectURL\(url\), REVOKE_MS\)/);
    assert.equal(/link\.click\(\);\s*URL\.revokeObjectURL\(url\)/.test(script), false);
    assert.equal(reglas.toLowerCase().includes("contenido no oficial"), false);
    assert.equal(reglas.toLowerCase().includes("unofficial content"), false);
    assert.match(editor, /Vista previa de la imagen\. Muestra el título, el cuerpo y el nombre del token\./);
    assert.match(editor, /Image preview\. It shows the title, the body, and the token name\./);
    assert.match(editor, /id="descargar"[^>]*disabled/);
    assert.match(editor, /id="borrar"/);
    assert.match(readStudio("studio.css"), /min-height:\s*44px/);
    assert.match(editor, /id="aviso-navegador"/);
    assert.match(editor, /Este navegador no es compatible con Studio/);
    assert.match(editor, /This browser is not compatible with Studio/);
    assert.match(editor, /<script nomodule src="studio-nomodule\.js"><\/script>/);
    assert.match(editor, /<script type="module" src="studio-boot\.js"><\/script>/);
    assert.equal(/<script\b(?![^>]*\bsrc=)/.test(editor), false);
    assert.match(readStudio("studio-nomodule.js"), /aviso-navegador/);
    assert.match(readStudio("studio-nomodule.js"), /hidden = false/);
    assert.match(readStudio("studio-boot.js"), /import\("\.\/studio\.js"\)/);
    assert.equal(editor.includes("noindex"), false);
    assert.equal(reglas.includes("noindex"), false);
  });

  test("no hay hosts externos en el editor y la navegación y el CSP de Studio están puestos", () => {
    const allowed = new Set(["stubxai.com", "www.stubxai.com", "github.com"]);
    const oflHosts = new Set(["github.com", "scripts.sil.org"]);
    const walk = (dir: string, out: string[] = []): string[] => {
      for (const name of readdirSync(dir)) {
        const full = path.join(dir, name);
        if (statSync(full).isDirectory()) walk(full, out);
        else out.push(full);
      }
      return out;
    };
    for (const file of walk(studioRoot())) {
      const rel = path.relative(studioRoot(), file);
      if (!/\.(html|js|mjs|css|json|txt)$/.test(file)) continue;
      const text = readFileSync(file, "utf8");
      for (const match of text.matchAll(/https?:\/\/([^/\s"'<>)]+)/g)) {
        const host = (match[1] ?? "").toLowerCase();
        if (rel.endsWith(".txt")) assert.ok(oflHosts.has(host), `${host} en ${rel}`);
        else assert.ok(allowed.has(host), `${host} en ${rel}`);
      }
    }
    const home = readFileSync(path.join(repoRoot(), "web/v2/index.html"), "utf8");
    assert.match(home, /href="\/studio\/"/);
    const headers = readFileSync(path.join(repoRoot(), "web/v2/_headers"), "utf8");
    assert.equal((headers.match(/^\/studio\/\*$/gm) ?? []).length, 0);
    assert.match(readStudio("index.html"), /default-src 'none'/);
    assert.match(readStudio("index.html"), /worker-src 'self'/);
    assert.match(readStudio("index.html"), /connect-src 'self'/);
    assert.equal(readStudio("index.html").includes("frame-ancestors"), false);
    assert.equal(readStudio("reglas/index.html").includes("frame-ancestors"), false);
    const visible = ["index.html", "reglas/index.html", "studio.js", "studio.css", "catalog.json", "templates.json"];
    for (const rel of visible) {
      const text = readStudio(rel);
      assert.equal(/\bholders?\b/i.test(text), false, rel);
      assert.equal(/\breserves?\b/i.test(text), false, rel);
      assert.equal(/\breserva\b/i.test(text), false, rel);
    }
  });

  test("dos logos distintos con el mismo tamaño y los mismos tres bytes no comparten clave", async () => {
    const { avatarKey, stampImage } = await load<{
      avatarKey: (image: { width: number; height: number; rgba: Uint8ClampedArray; stamp?: number }) => string;
      stampImage: <T extends { rgba?: Uint8ClampedArray; stamp?: number }>(image: T) => T;
    }>("lib/logo.mjs");
    const width = 4;
    const height = 4;
    const leftPixels = new Uint8ClampedArray(width * height * 4);
    const rightPixels = new Uint8ClampedArray(width * height * 4);
    const last = leftPixels.length - 1;
    const mid = last >> 1;
    for (const pixels of [leftPixels, rightPixels]) {
      pixels[0] = 9;
      pixels[mid] = 40;
      pixels[last] = 200;
    }
    rightPixels[4] = 255;
    const weak = (pixels: Uint8ClampedArray) => `${width}x${height}:${pixels.length}:${pixels[0]}:${pixels[mid]}:${pixels[last]}`;
    assert.equal(weak(leftPixels), weak(rightPixels));
    const left = stampImage({ width, height, rgba: leftPixels });
    const right = stampImage({ width, height, rgba: rightPixels });
    assert.notEqual(avatarKey(left), avatarKey(right));
    assert.equal(avatarKey(stampImage(left)), avatarKey(left));
    const worker = new Map<string, typeof left>();
    worker.set(avatarKey(left), left);
    worker.set(avatarKey(right), right);
    assert.equal(worker.get(avatarKey(left)), left);
    assert.equal(worker.get(avatarKey(right)), right);
  });

  test("una carta dibujada antes de cargar la mascota no se guarda", async () => {
    const { mascotCacheMark, mayCacheCard } = await load<{
      mascotCacheMark: (state: { customLogo: boolean; project: boolean; avatarId: string; loaded: boolean }) => string;
      mayCacheCard: (mark: string) => boolean;
    }>("lib/logo.mjs");
    const pending = mascotCacheMark({ customLogo: false, project: true, avatarId: "talon-avatar-512", loaded: false });
    const ready = mascotCacheMark({ customLogo: false, project: true, avatarId: "talon-avatar-512", loaded: true });
    assert.equal(pending, "wait");
    assert.equal(ready, "ready");
    assert.notEqual(pending, ready);
    assert.equal(mayCacheCard(pending), false);
    assert.equal(mayCacheCard(ready), true);
    assert.equal(mayCacheCard(mascotCacheMark({ customLogo: false, project: false, avatarId: "", loaded: false })), true);
    const cache = new Map<string, string>();
    const base = "1080x1080\u001fel nombre";
    const store = (mark: string, value: string) => {
      if (!mayCacheCard(mark)) return;
      cache.set(`${base}\u001f${mark}`, value);
    };
    store(pending, "sin-mascota");
    store(ready, "con-mascota");
    assert.equal(cache.has(`${base}\u001f${pending}`), false);
    assert.equal(cache.get(`${base}\u001f${ready}`), "con-mascota");
  });

  test("el nombre del token se dibuja y el logo se queda en un PNG local", async () => {
    const { renderCard } = await load<{ renderCard: (options: Record<string, unknown>) => Promise<Card> }>("lib/render.mjs");
    const { encodePng } = await load<{ encodePng: (rgba: Uint8ClampedArray, width: number, height: number) => Promise<Uint8Array> }>("lib/png.mjs");
    const { clipToken, fitLogo, readLogoPng, inspectLogo, rejectsWithoutResize, isOrvupiToken, DEFAULT_TOKEN, TOKEN_MAX, LOGO_MAX_BYTES, LOGO_MAX_EDGE, LOGO_HARD_EDGE, LOGO_MAX_PIXELS, LOGO_DRAW_EDGE } = await load<{
      clipToken: (value: string) => string;
      isOrvupiToken: (value: string) => boolean;
      fitLogo: (image: { width: number; height: number; rgba: Uint8ClampedArray }, edge: number) => { width: number; height: number };
      readLogoPng: (bytes: Uint8Array) => Promise<{ width: number; height: number; rgba: Uint8ClampedArray }>;
      inspectLogo: (bytes: Uint8Array) => Promise<{ mime: string; width: number; height: number; resizeWidth: number; resizeHeight: number; simplePng: boolean }>;
      rejectsWithoutResize: (width: number, height: number, canResize: boolean) => boolean;
      DEFAULT_TOKEN: string;
      TOKEN_MAX: number;
      LOGO_MAX_BYTES: number;
      LOGO_MAX_EDGE: number;
      LOGO_HARD_EDGE: number;
      LOGO_MAX_PIXELS: number;
      LOGO_DRAW_EDGE: number;
    }>("lib/logo.mjs");
    const { decodePng, pngDimensions, pngRawSize, pngInflatedCap } = await load<{
      decodePng: (bytes: Uint8Array) => Promise<unknown>;
      pngInflatedCap: (width: number, height: number, depth: number, color: number, interlace: number) => number;
      pngDimensions: (bytes: Uint8Array) => { width: number; height: number };
      pngRawSize: (width: number, height: number, depth: number, color: number) => number;
    }>("lib/png.mjs");
    const { brandFor } = await load<{
      brandFor: (lang: string, token: string) => string;
    }>("lib/copy.mjs");
    assert.equal(DEFAULT_TOKEN, "ORVUPI");
    assert.equal(TOKEN_MAX, 20);
    assert.equal(clipToken("  LUNA  "), "LUNA");
    assert.equal(clipToken("ABCDEFGHIJKLMNOPQRSTUVWXYZ"), "ABCDEFGHIJKLMNOPQRST");
    assert.equal(clipToken("ORV\u200BUPI"), "ORVUPI");
    assert.equal(clipToken("LUNA\u202E"), "LUNA");
    assert.equal(clipToken("\u202E\u200BLUNA\u200F"), "LUNA");
    assert.equal(isOrvupiToken("ORV\u200BUPI"), true);
    assert.equal(isOrvupiToken("orvu"), false);
    assert.equal(isOrvupiToken("LUNA"), false);
    const otherToken = ["No oficial de ", "LUNA ni de ORVUPI"].join("");
    const otherTokenEn = ["Not official from ", "LUNA or ORVUPI"].join("");
    assert.equal(brandFor("es", "LUNA"), "");
    assert.equal(brandFor("en", "LUNA"), "");
    assert.equal(brandFor("es", "LUNA") === otherToken, false);
    assert.equal(brandFor("en", "LUNA") === otherTokenEn, false);
    assert.equal(brandFor("es", "ORVUPI"), "");
    assert.equal(brandFor("en", "orvu"), "");
    const orvupiLooks = ["ORV\u2060UPI", "ORV\u00ADUPI", "ORV\u034FUPI", "\u180EORVUPI", "ORVUPI\uFEFF", "\uFF2F\uFF32\uFF36\uFF35\uFF30\uFF29", "orv\u2060upi"];
    for (const sample of orvupiLooks) {
      assert.equal(clipToken(sample).toLowerCase(), "orvupi", sample);
      assert.equal(isOrvupiToken(sample), true, sample);
      assert.equal(brandFor("es", sample), "", sample);
      assert.equal(brandFor("en", sample), "", sample);
    }
    const { exportAllowed } = await load<{ exportAllowed: (title: string, body: string, list?: unknown, token?: string) => boolean }>("lib/filter.mjs");
    assert.equal(exportAllowed("Hola", "Texto limpio.", undefined, "mo\u2060on"), false);
    assert.equal(exportAllowed("Hola", "Texto limpio.", undefined, "\uFF33\uFF34\uFF35\uFF22\uFF38"), true);
    assert.equal(brandFor("es", "LUNA\u202E"), "");
    assert.equal(brandFor("en", ""), "");
    const named = await renderCard({
      width: 1080,
      height: 1080,
      lang: "es",
      title: "Hola",
      body: "Texto limpio.",
      token: "LUNA",
      watermark: false,
      origins: [],
    });
    assert.equal(named.fits, true);
    assert.equal(joined(named, "token"), "LUNA");
    assert.ok(named.texts.includes("LUNA"));
    assertStampGone(named, "LUNA");
    assert.equal(named.topBand, 0);
    const englishToken = await renderCard({
      width: 1080,
      height: 1080,
      lang: "en",
      title: "Hello",
      body: "Clean text.",
      token: "LUNA",
      watermark: false,
      origins: [],
    });
    assert.equal(englishToken.fits, true);
    assertStampGone(englishToken, "LUNA en");
    const wideName = "M".repeat(20);
    for (const lang of ["es", "en"] as const) {
      for (const height of [1080, 1920]) {
        const card = await renderCard({
          width: 1080,
          height,
          lang,
          title: "Hola",
          body: "Texto limpio.",
          token: wideName,
          watermark: false,
          origins: [],
        });
        assertStampGone(card, `${lang} ${height}`);
        assert.equal(card.topBand, 0);
        assert.equal(joined(card, "token"), wideName, `${lang} ${height}`);
      }
    }
    const plain = await renderCard({
      width: 1080,
      height: 1080,
      lang: "en",
      title: "Hello",
      body: "Clean text.",
      watermark: false,
      origins: [],
    });
    assert.equal(plain.glyphs.some((glyph) => glyph.role === "token"), false);
    const templates = JSON.parse(readStudio("templates.json")) as {
      formats: { id: string; width: number; height: number }[];
      zones: Record<string, unknown>;
      templates: { title: { es: string; en: string }; body: { es: string; en: string } }[];
    };
    for (const format of templates.formats) {
      for (const template of templates.templates) {
        for (const lang of ["es", "en"] as const) {
          const card = await renderCard({
            width: format.width,
            height: format.height,
            lang,
            title: template.title[lang],
            body: template.body[lang],
            token: "ORVUPI",
            watermark: false,
            origins: ["mascota"],
            zones: templates.zones,
          });
          assert.equal(card.fits, true, `${format.id} ${lang} ${template.title[lang]}`);
          assert.equal(joined(card, "token"), "ORVUPI");
        }
      }
    }
    const rgba = new Uint8ClampedArray(8 * 8 * 4);
    for (let i = 0; i < rgba.length; i += 4) {
      rgba[i] = 20;
      rgba[i + 3] = 255;
    }
    const png = await encodePng(rgba, 8, 8);
    const logo = await readLogoPng(png);
    assert.equal(logo.width, 8);
    assert.equal(logo.height, 8);
    assert.equal(logo.rgba[0], 20);
    const wide = { width: 4, height: 2, rgba: new Uint8ClampedArray(4 * 2 * 4) };
    const fitted = fitLogo(wide, 2);
    assert.equal(fitted.width, 2);
    assert.equal(fitted.height, 1);
    await assert.rejects(() => readLogoPng(new Uint8Array([1, 2, 3, 4])), (error: Error) => {
      assert.equal(error.message, "logo-format");
      return true;
    });
    await assert.rejects(() => readLogoPng(new Uint8Array(LOGO_MAX_BYTES + 1)), (error: Error) => {
      assert.equal(error.message, "logo-bytes");
      return true;
    });
    assert.equal(LOGO_DRAW_EDGE, 512);
    const bomb = pngDeclaring(12000, 12000);
    assert.equal(pngDimensions(bomb).width, 12000);
    assert.equal(pngDimensions(bomb).height, 12000);
    await assert.rejects(() => readLogoPng(bomb), (error: Error) => {
      assert.equal(error.message, "logo-size");
      return true;
    });
    await assert.rejects(() => decodePng(bomb), (error: Error) => {
      assert.equal(error.message, "PNG demasiado grande");
      return true;
    });
    await assert.rejects(() => readLogoPng(pngDeclaring(2048, 8)), (error: Error) => {
      assert.notEqual(error.message, "logo-size");
      return true;
    });
    await assert.rejects(() => readLogoPng(pngDeclaring(2049, 8)), (error: Error) => {
      assert.notEqual(error.message, "logo-size");
      return true;
    });
    await assert.rejects(() => readLogoPng(pngDeclaring(LOGO_HARD_EDGE + 1, 8)), (error: Error) => {
      assert.equal(error.message, "logo-size");
      return true;
    });
    assert.equal(pngRawSize(8, 8, 8, 6), 264);
    const packed = pngWithIdat(8, 8, zlibStoredZeros(1_399_884));
    assert.ok(packed.length >= 1_400_000);
    assert.ok(packed.length < LOGO_MAX_BYTES);
    assert.equal(pngDimensions(packed).width, 8);
    assert.equal(pngDimensions(packed).height, 8);
    await assert.rejects(() => decodePng(packed), (error: Error) => {
      assert.equal(error.message, "PNG demasiado grande");
      return true;
    });
    await assert.rejects(() => readLogoPng(packed), (error: Error) => {
      assert.equal(error.message, "logo-size");
      return true;
    });
    assert.equal(LOGO_HARD_EDGE, 4096);
    assert.equal(LOGO_MAX_PIXELS, 16_777_216);
    assert.equal(LOGO_HARD_EDGE * LOGO_HARD_EDGE, LOGO_MAX_PIXELS);
    assert.equal(rejectsWithoutResize(4032, 3024, false), true);
    assert.equal(rejectsWithoutResize(4032, 3024, true), false);
    assert.equal(rejectsWithoutResize(2048, 2048, false), false);
    const phone = await inspectLogo(jpegBytes(4032, 3024, 6));
    assert.equal(phone.mime, "image/jpeg");
    assert.equal(phone.width, 3024);
    assert.equal(phone.height, 4032);
    assert.ok(phone.width * phone.height <= LOGO_MAX_PIXELS);
    assert.equal(Math.max(phone.resizeWidth, phone.resizeHeight), LOGO_MAX_EDGE);
    assert.ok(phone.resizeWidth <= LOGO_MAX_EDGE && phone.resizeHeight <= LOGO_MAX_EDGE);
    assert.ok(Math.abs(phone.resizeWidth / phone.resizeHeight - 3024 / 4032) < 0.02);
    const square = await inspectLogo(jpegBytes(4096, 4096));
    assert.equal(square.width * square.height, LOGO_MAX_PIXELS);
    await assert.rejects(() => inspectLogo(jpegBytes(8192, 8192)), (error: Error) => {
      assert.equal(error.message, "logo-size");
      return true;
    });
    await assert.rejects(() => readLogoPng(pngDeclaring(8192, 8192)), (error: Error) => {
      assert.equal(error.message, "logo-size");
      return true;
    });
    const turned = await inspectLogo(jpegBytes(400, 100, 6));
    assert.equal(turned.width, 100);
    assert.equal(turned.height, 400);
    const webp = await inspectLogo(webpBytes(1000, 1000));
    assert.equal(webp.mime, "image/webp");
    assert.equal(webp.resizeWidth, 1000);
    await assert.rejects(() => inspectLogo(jpegBytes(LOGO_HARD_EDGE + 1, 1000)), (error: Error) => {
      assert.equal(error.message, "logo-size");
      return true;
    });
    const heic = Uint8Array.from([0, 0, 0, 20, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63, 0, 0, 0, 0, 0x68, 0x65, 0x69, 0x63]);
    await assert.rejects(() => readLogoPng(heic), (error: Error) => {
      assert.equal(error.message, "logo-format");
      return true;
    });
    await assert.rejects(() => readLogoPng(new TextEncoder().encode("GIF89aXXXX")), (error: Error) => {
      assert.equal(error.message, "logo-format");
      return true;
    });
    const palette = pngTyped(8, 8, 8, 3, deflateSync(new Uint8Array(8 * 9)), [pngChunk("PLTE", Uint8Array.from([12, 200, 40]))]);
    const indexed = await inspectLogo(palette);
    assert.equal(indexed.simplePng, false);
    assert.equal(indexed.mime, "image/png");
    const adam = pngTyped(8, 8, 8, 2, deflateSync(new Uint8Array(pngInflatedCap(8, 8, 8, 2, 1))), [], 1);
    assert.equal((await inspectLogo(adam)).simplePng, false);
    const deep = pngTyped(2, 2, 16, 2, deflateSync(new Uint8Array(pngInflatedCap(2, 2, 16, 2, 0))));
    assert.equal((await inspectLogo(deep)).width, 2);
    const wideRgba = new Uint8ClampedArray(3000 * 8 * 4);
    for (let i = 0; i < wideRgba.length; i += 4) {
      wideRgba[i] = 12;
      wideRgba[i + 1] = 200;
      wideRgba[i + 2] = 40;
      wideRgba[i + 3] = 255;
    }
    const widePng = await encodePng(wideRgba, 3000, 8);
    const widePlan = await inspectLogo(widePng);
    assert.equal(widePlan.resizeWidth, LOGO_MAX_EDGE);
    assert.ok(widePlan.resizeHeight < LOGO_MAX_EDGE);
    const reduced = await readLogoPng(widePng);
    assert.ok(reduced.width <= LOGO_DRAW_EDGE);
    assert.ok(reduced.height <= LOGO_DRAW_EDGE);
    assert.equal(reduced.rgba[0], 12);
    assert.equal(reduced.rgba[1], 200);
    const disguised = await renderCard({
      width: 1080,
      height: 1080,
      lang: "es",
      title: "Hola",
      body: "Texto limpio.",
      token: "ORV\u2060UPI",
      watermark: false,
      origins: [],
    });
    assertStampGone(disguised, "ORVUPI disfrazado");
    assert.equal(joined(disguised, "token"), "ORVUPI");
    const fullwidth = await renderCard({
      width: 1080,
      height: 1080,
      lang: "es",
      title: "Hola",
      body: "Texto limpio.",
      token: "\uFF2F\uFF32\uFF36\uFF35\uFF30\uFF29",
      watermark: false,
      origins: [],
    });
    assert.equal(joined(fullwidth, "token"), "ORVUPI");
    assertStampGone(fullwidth, "ORVUPI ancho");
  });

  test("el borrador se guarda y se borra en local", async () => {
    const { DRAFT_KEY, loadDraft, saveDraft, clearDraft } = await load<{
      DRAFT_KEY: string;
      loadDraft: (storage: ReturnType<typeof memoryStorage>) => { v: number; title: string } | null;
      saveDraft: (storage: ReturnType<typeof memoryStorage>, draft: { title: string }) => void;
      clearDraft: (storage: ReturnType<typeof memoryStorage>) => void;
    }>("lib/draft.mjs");
    const storage = memoryStorage();
    assert.equal(DRAFT_KEY, "orvupi-studio-draft");
    assert.equal(loadDraft(storage), null);
    saveDraft(storage, { title: "Hola" });
    assert.equal(loadDraft(storage)?.title, "Hola");
    assert.equal(loadDraft(storage)?.v, 1);
    clearDraft(storage);
    assert.equal(loadDraft(storage), null);
    storage.setItem(DRAFT_KEY, "{");
    assert.equal(loadDraft(storage), null);
    const { clipDraftText } = await load<{ clipDraftText: (value: string, max: number) => string }>("lib/draft.mjs");
    assert.equal(clipDraftText("abcdefghijklmnopqrstuvwxyz", 4), "abcd");
    assert.equal(clipDraftText("hola", 72), "hola");
  });

  test("el PNG no lleva pie, marca de agua, etiqueta ni comentario", { timeout: 120_000 }, async () => {
    const { renderCard, contrastHex } = await load<{
      renderCard: (options: Record<string, unknown>) => Promise<Card>;
      contrastHex: (a: string, b: string) => number;
    }>("lib/render.mjs");
    const { PNG_COMMENT } = await load<{ PNG_COMMENT: string }>("lib/copy.mjs");
    const { readComments } = await load<{
      readComments: (png: Uint8Array) => { keyword: string; text: string }[];
    }>("lib/png.mjs");
    const templates = JSON.parse(readStudio("templates.json")) as {
      formats: { id: string; width: number; height: number }[];
      zones: Record<string, unknown>;
      templates: { title: { es: string; en: string }; body: { es: string; en: string } }[];
    };
    assert.ok(contrastHex("#f4f7fb", "#10243f") >= 4.5);
    assert.equal(PNG_COMMENT, "");
    const base = {
      width: 1080,
      height: 1080,
      lang: "es",
      title: "Hola",
      body: "Texto limpio para la prueba.",
      fill: "#0a090d",
      ink: "#fff3f5",
      origins: ["mascota"],
      zones: templates.zones,
    };
    const marked = await renderCard({ ...base, watermark: false });
    assert.equal(marked.fits, true);
    assertStampGone(marked, "mascota");
    assert.equal(readComments(marked.png).some((item) => item.keyword === "Comment"), false);
    const ai = await renderCard({ ...base, origins: ["ai"], watermark: false });
    assertStampGone(ai, "ai");
    const english = await renderCard({ ...base, lang: "en", origins: ["ninguno"], watermark: false });
    assertStampGone(english, "en");
    const story = await renderCard({ ...base, height: 1920, watermark: false });
    assertStampGone(story, "story");
    assert.equal(story.height / story.width > 1.7, true);
    for (const format of templates.formats) {
      for (const template of templates.templates) {
        for (const lang of ["es", "en"] as const) {
          const card = await renderCard({
            width: format.width,
            height: format.height,
            lang,
            title: template.title[lang],
            body: template.body[lang],
            watermark: false,
            origins: ["mascota"],
            zones: templates.zones,
          });
          assert.equal(card.fits, true, `${format.id} ${lang} ${template.title[lang]}`);
          assertStampGone(card, `${format.id} ${lang}`);
          assert.equal(joined(card, "title").length > 0, true, `${format.id} ${lang}`);
        }
      }
    }
    const catalog = JSON.parse(readStudio("catalog.json")) as {
      items: { id: string; tipo: string; fill?: string; ink?: string }[];
    };
    const fondos = catalog.items.filter((item) => item.tipo === "fondo");
    assert.equal(fondos.length, 12);
    for (const fondo of fondos) {
      const card = await renderCard({
        width: 480,
        height: 480,
        lang: "es",
        title: "",
        body: "",
        fill: fondo.fill,
        ink: fondo.ink,
        backgroundId: fondo.id,
        watermark: false,
        origins: [],
      });
      assertStampGone(card, fondo.id);
    }
  });

  test("un titular largo se dibuja y no lleva etiqueta", { timeout: 120_000 }, async () => {
    const { renderCard } = await load<{ renderCard: (options: Record<string, unknown>) => Promise<Card> }>("lib/render.mjs");
    const { HEADLINES } = await load<{ HEADLINES: { id: string }[] }>("lib/headlines.mjs");
    const templates = JSON.parse(readStudio("templates.json")) as {
      formats: { id: string; width: number; height: number }[];
    };
    const longTitle = "prueba ".repeat(12).trim().slice(0, 72).trim();
    assert.ok(longTitle.length >= 60, longTitle);
    for (const format of templates.formats) {
      for (const headline of HEADLINES) {
        const card = await renderCard({
          width: format.width,
          height: format.height,
          lang: "es",
          title: longTitle,
          body: "Texto de apoyo.",
          headline: headline.id,
          origins: ["mascota"],
          watermark: false,
          fill: "#0a090d",
          ink: "#fff3f5",
        });
        const titles = card.glyphs.filter((glyph) => glyph.role === "title");
        assert.ok(titles.length > 8, `${format.id} ${headline.id}`);
        assertStampGone(card, `${format.id} ${headline.id}`);
      }
    }
    for (const [width, height] of [[1080, 1080], [1080, 1920]] as const) {
      const card = await renderCard({
        width,
        height,
        lang: "es",
        title: "Hola",
        body: "Texto corto.",
        origins: ["ai"],
        watermark: false,
        fill: "#fff3f5",
        ink: "#120a0e",
      });
      assertStampGone(card, `${width}x${height}`);
    }
  });

  test("el titular no parte palabras en ninguna fuente ni formato", { timeout: 120_000 }, async () => {
    const { renderCard } = await load<{ renderCard: (options: Record<string, unknown>) => Promise<Card> }>("lib/render.mjs");
    const { HEADLINES } = await load<{ HEADLINES: { id: string }[] }>("lib/headlines.mjs");
    const templates = JSON.parse(readStudio("templates.json")) as {
      formats: { id: string; width: number; height: number }[];
    };
    assert.ok(HEADLINES.length >= 5);
    assert.ok(templates.formats.some((format) => format.id === "square" && format.width === 1080 && format.height === 1080));
    assert.ok(templates.formats.some((format) => format.id === "story" && format.width === 1080 && format.height === 1920));
    const titles = ["Mira la dirección", "DESCENTRALIZACIÓN"];
    const shown = (word: string) => [...word].map((ch) => [...ch.toLocaleUpperCase("es-ES")][0] ?? ch).join("");
    for (const format of templates.formats) {
      for (const headline of HEADLINES) {
        for (const title of titles) {
          const card = await renderCard({
            width: format.width,
            height: format.height,
            lang: "es",
            title,
            body: "Texto de apoyo.",
            headline: headline.id,
            origins: ["mascota"],
            watermark: false,
            fill: "#0a090d",
            ink: "#fff3f5",
          });
          const label = `${format.id} ${headline.id} ${title}`;
          assert.equal(card.fits, true, label);
          const words = title.split(/\s+/).filter(Boolean).map(shown);
          const lines = brandLinesOf(card, "title");
          assert.ok(lines.length > 0, label);
          let index = 0;
          for (const line of lines) {
            let rest = line;
            while (rest.length > 0) {
              const word = words[index];
              assert.ok(word, `${label} sobra «${line}»`);
              assert.ok(rest.startsWith(word), `${label} «${line}» no empieza por «${word}»`);
              rest = rest.slice(word.length);
              index += 1;
            }
          }
          assert.equal(index, words.length, `${label} ${lines.join("|")}`);
        }
      }
    }
  });

  test("un texto largo con eñe no lleva pie ni marca", { timeout: 60_000 }, async () => {
    const { renderCard } = await load<{ renderCard: (options: Record<string, unknown>) => Promise<Card> }>("lib/render.mjs");
    const line = "¿Ñandú pingüino sigue en la viñeta? ¡Sí! ";
    const card = await renderCard({
      width: 1080,
      height: 1080,
      lang: "es",
      title: line.repeat(8),
      body: line.repeat(24),
      watermark: false,
      origins: [],
    });
    assert.equal(card.fits, false);
    assertStampGone(card, "eñe");
    assert.equal(card.topBand, 0);
    for (const ch of ["¿", "Ñ", "Ü", "¡"]) {
      const glyph = card.glyphs.find((item) => item.ch === ch && (item.role === "title" || item.role === "body"));
      assert.ok(glyph, ch);
      assert.equal(glyph.missing, false, ch);
    }
    const story = await renderCard({
      width: 1080,
      height: 1920,
      lang: "es",
      title: "Hola",
      body: "Texto corto.",
      watermark: false,
      origins: [],
    });
    assertStampGone(story, "story eñe");
    assert.equal(story.topBand, 0);
  });

  test("una palabra suelta no coincide dentro de otra", () => {
    assert.equal(textHasToken("alfa beta gamma", "beta"), true);
    assert.equal(textHasToken("alfabeto", "beta"), false);
    assert.equal(textHasToken("ALFA BETA GAMMA", "BeTa"), true);
    assert.equal(textHasToken("Alfabeto", "BETA"), false);
  });

  test("quitar logo anula la carga que todavía no ha terminado", async () => {
    const { createLogoGate } = await load<{
      createLogoGate: () => {
        begin: () => { signal: AbortSignal; stillCurrent: () => boolean };
        cancel: () => void;
      };
    }>("lib/logo.mjs");
    const gate = createLogoGate();
    const current = gate.begin();
    let logo: unknown = null;
    let notice = "";
    const pending = new Promise<{ width: number }>((resolve) => {
      setTimeout(() => resolve({ width: 4 }), 30);
    }).then((image) => {
      if (!current.stillCurrent()) return;
      logo = image;
    });
    const failed = Promise.reject(new DOMException("Aborted", "AbortError")).catch((error: Error) => {
      if (!current.stillCurrent() || error?.name === "AbortError") return;
      notice = error.message;
    });
    gate.cancel();
    await Promise.all([pending, failed]);
    assert.equal(logo, null);
    assert.equal(notice, "");
    assert.equal(current.signal.aborted, true);
    assert.equal(current.stillCurrent(), false);
    const next = gate.begin();
    assert.equal(current.stillCurrent(), false);
    assert.equal(next.signal.aborted, false);
    assert.equal(next.stillCurrent(), true);
  });

  test("web/v2 se recorre sin depender de una lista externa", () => {
    const root = path.join(repoRoot(), "web/v2");
    const files = walkFiles(root).filter((file) => !BINARY_EXT.has(path.extname(file).toLowerCase()));
    assert.ok(files.length > 10);
    const absent = "qqqqzzzz";
    for (const file of files) assert.equal(textHasToken(readFileSync(file).toString("latin1"), absent), false);
  });

  test("la lista de la CI revisa web/v2 y la rama", (t) => {
    const tokens = deniedTokens(process.env.ORVUPI_NAME_DENYLIST ?? "");
    if (tokens.length === 0) {
      t.skip(
        "ORVUPI_NAME_DENYLIST no está definida: se omite la revisión anti-nombre de web/v2 y de la rama. Seguridad la hace a mano antes de cada merge.",
      );
      return;
    }
    const root = repoRoot();
    const hits: string[] = [];
    for (const file of walkFiles(path.join(root, "web/v2"))) {
      if (BINARY_EXT.has(path.extname(file).toLowerCase())) continue;
      const text = readFileSync(file).toString("latin1");
      if (tokens.some((token) => textHasToken(text, token))) hits.push(path.relative(root, file));
    }
    const baseRef = ["origin/main", "main"].find((ref) => {
      try {
        execFileSync("git", ["rev-parse", "--verify", "--quiet", ref], { cwd: root, stdio: "ignore" });
        return true;
      } catch {
        return false;
      }
    });
    if (baseRef) {
      const base = execFileSync("git", ["merge-base", "HEAD", baseRef], { cwd: root, encoding: "utf8" }).trim();
      const diff = execFileSync("git", ["diff", "-U0", base, "HEAD"], { cwd: root, encoding: "utf8", maxBuffer: 1024 * 1024 * 1024 });
      const log = execFileSync("git", ["log", `${base}..HEAD`, "--format=%B"], { cwd: root, encoding: "utf8" });
      if (tokens.some((token) => textHasToken(diff, token) || textHasToken(log, token))) hits.push("rama");
    }
    assert.deepEqual(hits, []);
  });

  test("el nombre y los apellidos no distinguen mayúsculas", () => {
    const names = hiddenNames();
    assert.equal(names.length, 3);
    for (const name of names) {
      assert.equal(/^[a-z]+$/.test(name), true);
      assert.equal(mentionsHiddenName(name.toUpperCase()), true);
      assert.equal(mentionsHiddenName(name.slice(0, 1) + name.slice(1).toUpperCase()), true);
    }
    const root = repoRoot();
    const hits: string[] = [];
    const skipDir = new Set([".git", "node_modules", "dist", "__pycache__"]);
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        if (skipDir.has(name)) continue;
        const full = path.join(dir, name);
        if (statSync(full).isDirectory()) {
          walk(full);
          continue;
        }
        if (BINARY_EXT.has(path.extname(full).toLowerCase())) continue;
        if (mentionsHiddenName(readFileSync(full).toString("latin1"))) hits.push(path.relative(root, full));
      }
    };
    walk(root);
    const baseRef = ["origin/main", "main"].find((ref) => {
      try {
        execFileSync("git", ["rev-parse", "--verify", "--quiet", ref], { cwd: root, stdio: "ignore" });
        return true;
      } catch {
        return false;
      }
    });
    if (baseRef) {
      const base = execFileSync("git", ["merge-base", "HEAD", baseRef], { cwd: root, encoding: "utf8" }).trim();
      const diff = execFileSync("git", ["diff", "-U0", base, "HEAD"], { cwd: root, encoding: "utf8", maxBuffer: 1024 * 1024 * 1024 });
      const log = execFileSync("git", ["log", `${base}..HEAD`, "--format=%B"], { cwd: root, encoding: "utf8" });
      if (mentionsHiddenName(addedDiff(diff)) || mentionsHiddenName(log)) hits.push("rama");
    }
    assert.deepEqual(hits, []);
  });

  test("las direcciones reales se bloquean aunque vayan partidas", async () => {
    const { analyze } = await load<{ analyze: Analyze }>("lib/filter.mjs");
    const home = readFileSync(path.join(repoRoot(), "web/v2/index.html"), "utf8");
    const cards = JSON.parse(readFileSync(path.join(repoRoot(), "web/v2/modules/verify/cards.json"), "utf8")) as {
      cards: { symbol?: string; role?: string; mint?: string }[];
    };
    const ca = cards.cards.find((card) => card.role === "contraste")?.mint ?? "";
    assert.ok(ca.length >= 32 && ca.length <= 44);
    // Direcciones EVM públicas de USDC (Ethereum y Base) como muestra neutra.
    const evm = ["0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"];
    assert.equal(evm.length, 2);
    for (const value of [ca, ...evm]) {
      assert.equal(analyze(value).hits.some((hit) => hit.kind === "base58"), true, value.slice(0, 6));
      const mid = Math.floor(value.length / 2);
      for (const sep of [" ", "/", "-", "·", ".", "_", ",", "|", "+", "~", ":", " y ", " and ", " luego "]) {
        const split = value.slice(0, mid) + sep + value.slice(mid);
        const parted = `${value.slice(0, 8)}${sep}${value.slice(8, 16)}${sep}${value.slice(16)}`;
        assert.equal(analyze(split).hits.some((hit) => hit.kind === "base58"), true, `${sep} ${value.slice(0, 6)}`);
        assert.equal(analyze(parted).hits.some((hit) => hit.kind === "base58"), true, `partes ${sep}`);
      }
    }
    for (const address of evm) {
      const hex = address.slice(2);
      assert.equal(analyze(hex).hits.some((hit) => hit.kind === "base58"), true, "sin 0x");
      assert.equal(analyze(`0.${hex}`).blocked, false);
      const dotted = `0x${hex.replace(/(.{4})(?!$)/g, "$1.")}`;
      const underscored = `0_x_${hex}`;
      const comma = `0x${hex.slice(0, 8)},${hex.slice(8)}`;
      assert.equal(analyze(dotted).hits.some((hit) => hit.kind === "base58"), true, "0x con puntos");
      assert.equal(analyze(underscored).hits.some((hit) => hit.kind === "base58"), true, "0x partido");
      assert.equal(analyze(comma).hits.some((hit) => hit.kind === "base58"), true, "0x con coma");
      assert.equal(analyze(hex.slice(0, 39)).hits.some((hit) => hit.kind === "base58"), false, "39 hex");
      assert.equal(analyze(`${hex}a`).hits.some((hit) => hit.kind === "base58"), false, "41 hex");
    }
    const groups23 = (value: string) => {
      const parts: string[] = [];
      let i = 0;
      while (value.length - i > 3) {
        parts.push(value.slice(i, i + 2));
        i += 2;
      }
      if (i < value.length) parts.push(value.slice(i));
      return parts.join(" ");
    };
    assert.equal(analyze(groups23(ca)).hits.some((hit) => hit.kind === "base58"), true, "trozos 2-3");
    assert.equal(analyze(groups23(evm[0]?.slice(2) ?? "")).hits.some((hit) => hit.kind === "base58"), true, "hex 2-3");
    const bare = evm.map((item) => item.slice(2));
    assert.equal(analyze(`${bare[0]} y ${bare[1]}`).hits.some((hit) => hit.kind === "base58"), true, "dos evm con y");
    const irregular = `${ca.slice(0, 3)}.${ca.slice(3, 12)}_${ca.slice(12, 14)},${ca.slice(14)}`;
    assert.equal(analyze(irregular).hits.some((hit) => hit.kind === "base58"), true, "trozos irregulares");
    assert.equal(analyze("0".repeat(39)).blocked, false);
    assert.equal(analyze("0".repeat(40)).hits.some((hit) => hit.kind === "base58"), true);
    assert.equal(analyze("0".repeat(41)).blocked, false);
  });
});

describe("Studio: guardar en iPhone", () => {
  type Save = {
    FILE_NAME: string;
    REVOKE_MS: number;
    isIOS: (nav: unknown) => boolean;
    canShareFiles: (nav: unknown, file: unknown) => boolean;
    saveMode: (opts: { ios: boolean; share: boolean }) => string;
  };
  const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
  const PIXEL = "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36";

  test("detecta iPhone, iPad con escritorio y no Android", async () => {
    const { isIOS } = await load<Save>("lib/save.mjs");
    assert.equal(isIOS({ userAgent: IPHONE }), true);
    assert.equal(isIOS({ userAgent: "Mozilla/5.0 (Macintosh)", platform: "MacIntel", maxTouchPoints: 5 }), true);
    assert.equal(isIOS({ userAgent: "Mozilla/5.0 (Macintosh)", platform: "MacIntel", maxTouchPoints: 0 }), false);
    assert.equal(isIOS({ userAgent: PIXEL }), false);
    assert.equal(isIOS(undefined), false);
  });

  test("solo comparte si el navegador acepta archivos", async () => {
    const { canShareFiles } = await load<Save>("lib/save.mjs");
    const share = () => Promise.resolve();
    assert.equal(canShareFiles({ share, canShare: () => true }, {}), true);
    assert.equal(canShareFiles({ share, canShare: () => false }, {}), false);
    assert.equal(canShareFiles({ share }, {}), false);
    assert.equal(canShareFiles({ canShare: () => true }, {}), false);
    assert.equal(canShareFiles({ share, canShare: () => { throw new Error("x"); } }, {}), false);
  });

  test("elige compartir, abrir o descargar", async () => {
    const { saveMode, REVOKE_MS, FILE_NAME } = await load<Save>("lib/save.mjs");
    assert.equal(saveMode({ ios: true, share: true }), "share");
    assert.equal(saveMode({ ios: true, share: false }), "open");
    assert.equal(saveMode({ ios: false, share: true }), "download");
    assert.equal(saveMode({ ios: false, share: false }), "download");
    assert.ok(REVOKE_MS >= 60_000);
    assert.equal(FILE_NAME, "studio.png");
  });

  test("la página trae el aviso de guardar en ES y EN y Compartir empieza oculto", () => {
    const html = readStudio("index.html");
    assert.match(html, /id="aviso-guardar"[^>]*hidden/);
    assert.ok(html.includes("Mantén pulsada la imagen y elige Guardar en Fotos."));
    assert.ok(html.includes("Press and hold the image and choose Save to Photos."));
    assert.match(html, /id="compartir" hidden/);
    const js = readStudio("studio.js");
    assert.doesNotMatch(js, /revokeObjectURL\(url\), 1000\)/);
    assert.match(js, /window\.open\(url, "_blank", "noopener"\)/);
    assert.doesNotMatch(js, /= window\.open\(/);
  });
});
