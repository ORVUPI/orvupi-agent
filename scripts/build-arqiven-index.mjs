/** Genera el índice léxico de ARQIVEN a partir de las páginas y la documentación MIT.
 * No descarga nada. Quita del texto cualquier dirección que no sea el contrato oficial.
 */

import { createHash } from "node:crypto";
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { OFFICIAL_ADDRESS, redactForeignAddresses } from "../web/v2/shared/ia/guard.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const webRoot = path.join(repoRoot, "web", "v2");
const outFile = path.join(webRoot, "arqiven", "knowledge-index.json");

const SKIP_DIR = new Set(["node_modules", "vendor"]);

export function langOf(url) {
  if (url.startsWith("/en/")) return "en";
  if (url.startsWith("/pt-br/")) return "pt-BR";
  if (url.startsWith("/ja/")) return "ja";
  if (url.startsWith("/ko/")) return "ko";
  if (url.startsWith("/docs/")) return "es";
  return "es";
}

export function htmlToText(html) {
  return decode(String(html || "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script[^>]*>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style[^>]*>/gi, " ")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript[^>]*>/gi, " ")
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg[^>]*>/gi, " ")
    .replace(/<header\b[^>]*>[\s\S]*?<\/header[^>]*>/gi, " ")
    .replace(/<footer\b[^>]*>[\s\S]*?<\/footer[^>]*>/gi, " ")
    .replace(/<nav\b[^>]*>[\s\S]*?<\/nav[^>]*>/gi, " ")
    .replace(/<[^>]+>/g, " "));
}

export function markdownToText(markdown) {
  return String(markdown || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_`>#|-]{1,3}/g, " ");
}

const BANNED_PHRASES = [
  "you can lose everything",
  "memecoin experimental",
  "criptoactivo de alto riesgo",
  "imagen generada con ia",
  "ai-generated image",
  "ilustración con elementos generados con ia",
  "illustration with ai-generated elements",
  "imágenes de agente talón generadas con ia",
  "agente talón images generated with ai",
  "cripto de alto riesgo · puedes perderlo todo",
  "high-risk crypto · you could lose everything",
  "no oficial · cripto de alto riesgo",
  "unofficial · high-risk crypto",
  "fondo de liquidez",
  "el fondo que se puede retirar",
  "el fondo retirable",
  "único fondo",
  "fondos retirables",
  "withdrawable funds",
  "cripto de alto riesgo",
  "puedes perderlo todo",
  "no es consejo de inversion",
  "no es consejo de inversión",
  "you could lose everything",
  "not investment advice",
];

function isPublishable(value) {
  const text = String(value || "");
  const lower = text.toLowerCase();
  if (BANNED_PHRASES.some((phrase) => lower.includes(phrase))) return false;
  if (mentionsPrivateName(text)) return false;
  if (/tal[oó]n/i.test(text)) return false;
  const stripped = lower
    .replaceAll("termino-holder", "")
    .replaceAll("holdersnote_en", "")
    .replaceAll("holdersstatus", "")
    .replaceAll("holdersnote", "")
    .replaceAll("otherholders", "")
    .replaceAll("reserva-real", "")
    .replaceAll("reserva-virtual", "")
    .replaceAll("real_token_reserves", "")
    .replaceAll("real_quote_reserves", "")
    .replaceAll("virtual_token_reserves", "")
    .replaceAll("virtual_quote_reserves", "");
  if (/\bholders?\b/i.test(stripped)) return false;
  if (/\breserves?\b/i.test(stripped)) return false;
  if (/\breserva\b/i.test(stripped) && !stripped.includes("reservados")) return false;
  return true;
}

function mentionsPrivateName(value) {
  const folded = String(value || "").toLowerCase();
  const first = ["cris", "tian"].join("");
  const last = ["cama", "cho"].join("");
  const robot = ["stu", "bx"].join("");
  return folded.includes(first) || folded.includes(last) || folded.includes(robot);
}

function decode(value) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function titleOf(raw, fallback) {
  const titled = raw.match(/<title>([^<]{1,180})<\/title>/i)?.[1] || raw.match(/^#\s+(.{1,180})$/m)?.[1] || fallback;
  return decode(titled).slice(0, 140);
}

export function chunkText(text, size = 700, max = 3) {
  const clean = redactForeignAddresses(text).replace(/\s+/g, " ").trim();
  if (clean.length < 160) return [];
  const parts = [];
  for (let start = 0; start < clean.length && parts.length < max; start += 560) {
    const slice = clean.slice(start, start + size).trim();
    if (slice.length >= 160) parts.push(slice);
    if (start + size >= clean.length) break;
  }
  return parts;
}

async function walk(dir, acc) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIR.has(entry.name)) continue;
      if (entry.name === "assets" && path.basename(dir) === "work") continue;
      await walk(full, acc);
      continue;
    }
    if (entry.name.endsWith(".html") || entry.name.endsWith(".md")) acc.push(full);
  }
}

export async function collectChunks(root = repoRoot) {
  const files = [];
  await walk(path.join(root, "web", "v2"), files);
  const docs = path.join(root, "docs");
  if (await exists(docs)) await walk(docs, files);
  const chunks = [];
  for (const file of files.sort()) {
    const info = await stat(file);
    if (info.size > 1_500_000) continue;
    const rel = path.relative(root, file).split(path.sep).join("/");
    if (rel.includes("/prototipo/") || rel.includes("propuesta-portada")) continue;
    const raw = await readFile(file, "utf8");
    const isHtml = file.endsWith(".html");
    const url = rel.startsWith("docs/")
      ? `/${rel}`
      : `/${rel.replace(/^web\/v2\//, "").replace(/index\.html$/, "")}`;
    const text = isHtml ? htmlToText(raw) : decode(markdownToText(raw));
    const title = titleOf(raw, path.basename(file));
    if (mentionsPrivateName(`${title} ${text}`)) continue;
    const parts = chunkText(text).filter((part) => isPublishable(`${title} ${part}`));
    parts.forEach((part, index) => {
      const id = createHash("sha256").update(`${url}#${index}\n${part}`).digest("hex").slice(0, 16);
      chunks.push({
        id,
        url,
        title,
        lang: langOf(url),
        text: part,
        license: "MIT",
        origin: "orvupi",
      });
    });
  }
  return chunks;
}

export function curatedFacts() {
  const address = OFFICIAL_ADDRESS;
  const rows = [
    ["es", "/", "Qué es ORVUPI", "ORVUPI es el proyecto de orvupi.com: comunidad, humor y herramientas para explorar la web. Esas herramientas son Work, Studio, Sonar, Verify, Academy y ARQIVEN. El único contrato oficial está en Solana."],
    ["en", "/en/", "What ORVUPI is", "ORVUPI is the project at orvupi.com: a community, humor and tools for exploring the web. Those tools are Work, Studio, Sonar, Verify, Academy and ARQIVEN. The only official contract is on Solana."],
    ["pt-BR", "/pt-br/", "O que é a ORVUPI", "ORVUPI é o projeto de orvupi.com: comunidade, humor e ferramentas para explorar a web. Essas ferramentas são Work, Studio, Sonar, Verify, Academy e ARQIVEN. O único contrato oficial está na Solana."],
    ["ja", "/ja/", "ORVUPI とは", "ORVUPI は orvupi.com のプロジェクトです。コミュニティとユーモアと、ウェブを探るツールです。ツールは Work、Studio、Sonar、Verify、Academy、ARQIVEN です。公式コントラクトは Solana 上に一つだけです。"],
    ["ko", "/ko/", "ORVUPI란", "ORVUPI는 orvupi.com의 프로젝트입니다. 커뮤니티와 유머, 웹을 살펴보는 도구입니다. 도구는 Work, Studio, Sonar, Verify, Academy, ARQIVEN입니다. 공식 컨트랙트는 Solana에 하나뿐입니다."],
    ["es", "/token/", "Contrato oficial de ORVUPI", `El único contrato oficial de ORVUPI está en Solana y es ${address}. Cualquier otra dirección no es ORVUPI. ORVUPI no pide la frase de recuperación ni escribe primero por mensaje privado.`],
    ["en", "/en/token/", "Official ORVUPI contract", `The only official ORVUPI contract is on Solana: ${address}. Any other address is not ORVUPI. ORVUPI never asks for a recovery phrase and never messages first.`],
    ["pt-BR", "/pt-br/token/", "Contrato oficial da ORVUPI", `O único contrato oficial da ORVUPI está na Solana e é ${address}. Qualquer outro endereço não é ORVUPI. A ORVUPI não pede a frase de recuperação nem escreve primeiro.`],
    ["ja", "/ja/token/", "ORVUPI の公式コントラクト", `ORVUPI の公式コントラクトは Solana 上の ${address} だけです。それ以外のアドレスは ORVUPI ではありません。リカバリーフレーズは求めません。`],
    ["ko", "/ko/token/", "ORVUPI 공식 컨트랙트", `ORVUPI의 공식 컨트랙트는 Solana의 ${address} 하나뿐입니다. 다른 주소는 ORVUPI가 아닙니다. 복구 구문을 요구하지 않습니다.`],
    ["es", "/work/", "ORVUPI Work", "ORVUPI Work es la herramienta para escribir documentos en este dispositivo. La ruta pública es /work/."],
    ["en", "/work/", "ORVUPI Work", "ORVUPI Work is the tool for writing documents on this device. The public route is /work/."],
    ["pt-BR", "/work/", "ORVUPI Work", "ORVUPI Work é a ferramenta para escrever documentos neste dispositivo. A rota pública é /work/."],
    ["ja", "/work/", "ORVUPI Work", "ORVUPI Work は、この端末で文書を書くツールです。公開ルートは /work/ です。"],
    ["ko", "/work/", "ORVUPI Work", "ORVUPI Work는 이 기기에서 문서를 쓰는 도구입니다. 공개 경로는 /work/ 입니다."],
    ["es", "/studio/", "ORVUPI Studio", "ORVUPI Studio es la herramienta de diseño. La ruta en español es /studio/."],
    ["en", "/en/studio/", "ORVUPI Studio", "ORVUPI Studio is the design tool. The English route is /en/studio/."],
    ["pt-BR", "/pt-br/studio/", "ORVUPI Studio", "ORVUPI Studio é a ferramenta de desenho. A rota é /pt-br/studio/."],
    ["ja", "/ja/studio/", "ORVUPI Studio", "ORVUPI Studio はデザインのツールです。ルートは /ja/studio/ です。"],
    ["ko", "/ko/studio/", "ORVUPI Studio", "ORVUPI Studio는 디자인 도구입니다. 경로는 /ko/studio/ 입니다."],
    ["es", "/sonar/", "ORVUPI Sonar", "ORVUPI Sonar muestra datos de mercado. La ruta en español es /sonar/."],
    ["en", "/en/sonar/", "ORVUPI Sonar", "ORVUPI Sonar shows market data. The English route is /en/sonar/."],
    ["pt-BR", "/pt-br/sonar/", "ORVUPI Sonar", "ORVUPI Sonar mostra dados de mercado. A rota é /pt-br/sonar/."],
    ["ja", "/ja/sonar/", "ORVUPI Sonar", "ORVUPI Sonar は市場データを表示します。ルートは /ja/sonar/ です。"],
    ["ko", "/ko/sonar/", "ORVUPI Sonar", "ORVUPI Sonar는 시장 데이터를 보여 줍니다. 경로는 /ko/sonar/ 입니다."],
    ["es", "/verify/", "ORVUPI Verify", "ORVUPI Verify contrasta un token con fuentes públicas. La ruta en español es /verify/."],
    ["en", "/en/verify/", "ORVUPI Verify", "ORVUPI Verify checks a token against public sources. The English route is /en/verify/."],
    ["pt-BR", "/pt-br/verify/", "ORVUPI Verify", "ORVUPI Verify confere um token com fontes públicas. A rota é /pt-br/verify/."],
    ["ja", "/ja/verify/", "ORVUPI Verify", "ORVUPI Verify は公開情報とトークンを照合します。ルートは /ja/verify/ です。"],
    ["ko", "/ko/verify/", "ORVUPI Verify", "ORVUPI Verify는 공개 자료와 토큰을 대조합니다. 경로는 /ko/verify/ 입니다."],
    ["es", "/academy/", "ORVUPI Academy", "ORVUPI Academy es la sección para aprender. La ruta es /academy/."],
    ["en", "/academy/", "ORVUPI Academy", "ORVUPI Academy is the learning section. The route is /academy/."],
    ["pt-BR", "/academy/", "ORVUPI Academy", "ORVUPI Academy é a seção para aprender. A rota é /academy/."],
    ["ja", "/academy/", "ORVUPI Academy", "ORVUPI Academy は学ぶための欄です。ルートは /academy/ です。"],
    ["ko", "/academy/", "ORVUPI Academy", "ORVUPI Academy는 배우는 칸입니다. 경로는 /academy/ 입니다."],
    ["es", "/arqiven/", "ARQIVEN", "ARQIVEN es la IA de ORVUPI. No tiene un modelo propio. Si responde un modelo, es de terceros (Qwen3.5-0.8B por defecto, SmolLM2 si no cabe, y también Qwen o LFM2), corre en el navegador y se nombra aparte. Guardar una nota la escribe en IndexedDB de este dispositivo y en Work; no sale a un servidor. Aquí se leen TXT y MD. El logotipo es el pulpo de ORVUPI. La web está en cinco idiomas. El sitio público es https://orvupi.com. La ruta es /arqiven/. Los textos propios del repositorio se publican con licencia MIT. Las novedades están en /novedades/."],
    ["en", "/en/arqiven/", "ARQIVEN", "ARQIVEN is ORVUPI's AI. It has no model of its own. If a model answers, it is a third-party model (Qwen3.5-0.8B by default, SmolLM2 when it does not fit, and also Qwen or LFM2), it runs in the browser and it is named as such. Saving a note writes it to IndexedDB on this device and to Work; it is not sent to a server. TXT and MD are read here. The logo is ORVUPI's octopus. The site is in five languages. The public site is https://orvupi.com. The route is /en/arqiven/. The repository's own texts are published under the MIT license. News is at /en/novedades/."],
    ["pt-BR", "/pt-br/arqiven/", "ARQIVEN", "ARQIVEN é a IA da ORVUPI. Não tem um modelo próprio. Se um modelo responde, é de terceiros (Qwen3.5-0.8B por padrão, SmolLM2 se não couber, e também Qwen ou LFM2), roda no navegador e aparece com o nome dele. Guardar uma nota grava no IndexedDB deste dispositivo e no Work; não vai a um servidor. Aqui se leem TXT e MD. O logotipo é o polvo da ORVUPI. O site está em cinco idiomas. O site público é https://orvupi.com. A rota é /pt-br/arqiven/. Os textos próprios do repositório usam a licença MIT. As novidades estão em /pt-br/novedades/."],
    ["ja", "/ja/arqiven/", "ARQIVEN", "ARQIVEN は ORVUPI の AI です。独自モデルはありません。モデルが答える場合は第三者（標準は Qwen3.5-0.8B、入らないときは SmolLM2、ほかに Qwen と LFM2）で、ブラウザの中で動き、その名前を出します。ノートの保存はこの端末の IndexedDB と Work に書き、サーバーには送りません。ここでは TXT と MD を読みます。ロゴは ORVUPI のタコです。サイトは五つの言語です。公開サイトは https://orvupi.com です。ルートは /ja/arqiven/ です。リポジトリ自身の文章は MIT です。新着は /ja/novedades/ です。"],
    ["ko", "/ko/arqiven/", "ARQIVEN", "ARQIVEN은 ORVUPI의 AI입니다. 자체 모델은 없습니다. 모델이 답하면 제3자(기본은 Qwen3.5-0.8B, 들어가지 않으면 SmolLM2, 그 밖에 Qwen과 LFM2)이고, 브라우저 안에서 돌며 그 이름을 밝힙니다. 노트를 저장하면 이 기기의 IndexedDB와 Work에 쓰며 서버로는 보내지 않습니다. 여기서는 TXT와 MD를 읽습니다. 로고는 ORVUPI의 문어입니다. 사이트는 다섯 언어입니다. 공개 사이트는 https://orvupi.com 입니다. 경로는 /ko/arqiven/ 입니다. 저장소의 자체 글은 MIT입니다. 새 소식은 /ko/novedades/ 입니다."],
  ];
  return rows.filter((row) => isPublishable(row[3])).map(([lang, url, title, text]) => ({
    id: createHash("sha256").update(`curated:${lang}:${url}`).digest("hex").slice(0, 16),
    url,
    title,
    lang,
    text,
    license: "MIT",
    origin: "orvupi",
    curated: true,
  }));
}

export async function buildKnowledgeIndex(root = repoRoot) {
  const chunks = curatedFacts().concat(await collectChunks(root));
  const body = JSON.stringify({ chunks });
  const hash = createHash("sha256").update(body).digest("hex");
  return {
    format: "orvupi-arqiven-index",
    version: 1,
    built: new Date().toISOString().slice(0, 10),
    hash,
    method: "bm25",
    whyNotEmbeddings: "Un modelo de embeddings multilingüe añade otra descarga grande antes de responder. BM25 con n-gramas es inmediato, local y comprobable.",
    license: "MIT",
    chunks,
  };
}

async function exists(file) {
  try {
    await stat(file);
    return true;
  } catch {
    return false;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const index = await buildKnowledgeIndex();
  await writeFile(outFile, JSON.stringify(index));
  console.log(`chunks ${index.chunks.length} hash ${index.hash.slice(0, 12)} bytes ${JSON.stringify(index).length}`);
}
