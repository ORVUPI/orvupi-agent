import { getCategories, getCoin, getExchange, getExchangeList } from "./data.js";
import { securityHeaders, slugOk } from "./security.js";

const LOCALES = [
  ["es", ""],
  ["en", "/en"],
  ["pt-BR", "/pt-br"],
  ["ja", "/ja"],
  ["ko", "/ko"],
];

function esc(value) {
  return String(value || "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
}

export function applyMeta(html, meta) {
  let out = String(html);
  out = out.replace(/<title>[^<]*<\/title>/, `<title>${esc(meta.title)}</title>`);
  out = out.replace(/(<meta name="description" content=")[^"]*(")/, `$1${esc(meta.description)}$2`);
  out = out.replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${esc(meta.canonical)}$2`);
  out = out.replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${esc(meta.title)}$2`);
  out = out.replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${esc(meta.description)}$2`);
  out = out.replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${esc(meta.canonical)}$2`);
  out = out.replace(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${esc(meta.title)}$2`);
  out = out.replace(/(<meta name="twitter:description" content=")[^"]*(")/, `$1${esc(meta.description)}$2`);
  for (const [lang, prefix] of LOCALES) {
    const href = `https://orvupi.com${prefix}${meta.path}`;
    out = out.replace(new RegExp(`(<link rel="alternate" hreflang="${lang}" href=")[^"]*(")`), `$1${esc(href)}$2`);
  }
  out = out.replace(/(<link rel="alternate" hreflang="x-default" href=")[^"]*(")/, `$1${esc(`https://orvupi.com/en${meta.path}`)}$2`);
  if (meta.jsonld) {
    out = out.replace("</head>", `<script type="application/ld+json">${safeJson(meta.jsonld)}</script></head>`);
  }
  return out;
}

function documentResponse(html, status) {
  const headers = securityHeaders({
    "content-type": "text/html; charset=utf-8",
    "cache-control": status === 200 ? "public, max-age=120" : "no-store",
  });
  if (status === 404) headers.set("x-robots-tag", "noindex");
  return new Response(html, { status, headers });
}

function notFoundHtml() {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>ORVUPI Sonar</title><meta name="robots" content="noindex"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/assets/sonar.css"></head><body class="verify-app sonar-market"><main class="sn-404"><img src="/assets/orvupi/avatar.png" alt="" width="72" height="72"><h1>ORVUPI Sonar</h1><p>No hay una ficha con ese nombre.</p><p><a href="/sonar/">Volver a Sonar Mercados</a></p></main></body></html>`;
}

async function readAsset(request, env, assetPath) {
  if (env?.ASSETS?.fetch) {
    const response = await env.ASSETS.fetch(new Request(new URL(assetPath, request.url)));
    if (response.ok) return response.text();
  }
  if (typeof env?.SONAR_READ === "function") return env.SONAR_READ(assetPath);
  return null;
}

function localePrefix(pathname) {
  const match = pathname.match(/^\/(en|pt-br|ja|ko)(?=\/)/);
  return match ? `/${match[1]}` : "";
}

export async function renderSonarPage(request, env, ctx, spec) {
  const prefix = localePrefix(new URL(request.url).pathname);
  const assetPath = `${prefix}/verify/index.html`;
  if (spec.kind === "notfound" || (spec.id && !slugOk(spec.id))) return documentResponse(notFoundHtml(), 404);
  let meta;
  try {
    meta = await describe(env, ctx, spec, prefix, new URL(request.url).pathname);
  } catch (error) {
    if (error?.status === 404) return documentResponse(notFoundHtml(), 404);
    console.error("sonar-seo", error?.status || error?.code || "fail");
    meta = generic(spec, prefix);
  }
  if (meta.notFound) return documentResponse(notFoundHtml(), 404);
  const html = await readAsset(request, env, assetPath);
  if (!html) return documentResponse(notFoundHtml(), 404);
  return documentResponse(applyMeta(html, meta), 200);
}

export function sectionName(prefix) {
  if (prefix === "/en") return "Sonar Markets";
  if (prefix === "/ja") return "Sonar マーケット";
  if (prefix === "/ko") return "Sonar 시장";
  return "Sonar Mercados";
}

export function marketTitle(prefix, name) {
  const section = sectionName(prefix);
  return name ? `${name} · ${section}` : `${section} · ORVUPI`;
}

function generic(spec, prefix) {
  const path = spec.kind === "exchange" ? `/sonar/exchanges/${spec.id || ""}` : spec.kind === "category" ? `/sonar/categories/${spec.id || ""}` : `/sonar/crypto/${spec.id || ""}`;
  return {
    title: marketTitle(prefix),
    description: `${sectionName(prefix)} · ORVUPI. Sonar · verify on-chain.`,
    canonical: `https://orvupi.com${prefix}${path}`,
    path,
  };
}

const SHELL_ES = {
  movers: "Subidas y bajadas",
  trending: "Tendencia",
  new: "Pools nuevos",
  news: "Noticias",
  watchlist: "Favoritos",
  portfolio: "Cartera",
  calendar: "Calendario",
  unlocks: "Desbloqueos",
};
const SHELL_EN = {
  movers: "Gainers and losers",
  trending: "Trending",
  new: "New pools",
  news: "News",
  watchlist: "Watchlist",
  portfolio: "Portfolio",
  calendar: "Calendar",
  unlocks: "Unlocks",
};

function shellLeaf(pathname) {
  const leaf = String(pathname || "").replace(/\/+$/, "").split("/").pop();
  return SHELL_ES[leaf] || SHELL_EN[leaf] ? leaf : "";
}

async function describe(env, ctx, spec, prefix, pathname = "") {
  if (!spec.kind || spec.kind === "shell") {
    const path = "/sonar/";
    const leaf = shellLeaf(pathname);
    const extra = leaf ? (prefix === "/en" ? SHELL_EN[leaf] : SHELL_ES[leaf]) : "";
    return {
      title: marketTitle(prefix, extra),
      description: `${sectionName(prefix)} · ORVUPI. Sonar · verify on-chain.`,
      canonical: `https://orvupi.com${prefix}${leaf ? `/sonar/${leaf}/` : path}`,
      path: leaf ? `/sonar/${leaf}/` : path,
    };
  }
  if (spec.kind === "crypto") {
    const coin = await getCoin(env, ctx, spec.id);
    const price = coin.price == null ? "" : ` ${formatUsd(coin.price)} USD.`;
    const path = `/sonar/crypto/${coin.id}`;
    return {
      title: marketTitle(prefix, `${coin.name} (${coin.symbol})`),
      description: `${prefix === "/en" ? `Price and data for ${coin.name} (${coin.symbol}) on ${sectionName(prefix)}.` : `Precio y datos de ${coin.name} (${coin.symbol}) en ${sectionName(prefix)}.`} ${price} ${prefix ? "Data provided by CoinGecko" : "Datos de CoinGecko"}.`.replace(/\s+/g, " ").slice(0, 180),
      canonical: `https://orvupi.com${prefix}${path}`,
      path,
      jsonld: {
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: `${coin.name} (${coin.symbol})`,
        url: `https://orvupi.com${prefix}${path}`,
        dateModified: coin.fetchedAt,
        isBasedOn: "https://www.coingecko.com/",
        variableMeasured: coin.price == null ? undefined : {
          "@type": "PropertyValue",
          name: "price_usd",
          value: coin.price,
          unitText: "USD",
          measurementTechnique: "CoinGecko",
        },
      },
    };
  }
  if (spec.kind === "exchange") {
    if (!spec.id) {
      const path = "/sonar/exchanges/";
      return {
        title: marketTitle(prefix, "Exchanges"),
        description: `${prefix === "/en" ? "Exchange ranking on" : "Ranking de exchanges en"} ${sectionName(prefix)}. ${prefix ? "Data provided by CoinGecko" : "Datos de CoinGecko"}.`,
        canonical: `https://orvupi.com${prefix}${path}`,
        path,
      };
    }
    const row = await getExchange(env, ctx, spec.id);
    const path = `/sonar/exchanges/${row.id}`;
    return {
      title: marketTitle(prefix, row.name),
      description: `${prefix === "/en" ? `Volume and markets for ${row.name} on` : `Volumen y mercados de ${row.name} en`} ${sectionName(prefix)}. ${prefix ? "Data provided by CoinGecko" : "Datos de CoinGecko"}.`.slice(0, 180),
      canonical: `https://orvupi.com${prefix}${path}`,
      path,
    };
  }
  if (spec.kind === "category") {
    if (!spec.id) {
      const path = "/sonar/categories/";
      return {
        title: marketTitle(prefix, prefix === "/en" ? "Categories" : "Categorías"),
        description: `${prefix === "/en" ? "Crypto sectors on" : "Sectores del mercado cripto en"} ${sectionName(prefix)}. ${prefix ? "Data provided by CoinGecko" : "Datos de CoinGecko"}.`,
        canonical: `https://orvupi.com${prefix}${path}`,
        path,
      };
    }
    const directory = await getCategories(env, ctx);
    const row = (directory.rows || []).find((item) => item.id === spec.id);
    if (!row) return { notFound: true };
    const path = `/sonar/categories/${row.id}`;
    return {
      title: marketTitle(prefix, row.name),
      description: `${prefix === "/en" ? `Ranking of ${row.name} on` : `Ranking de ${row.name} en`} ${sectionName(prefix)}. ${prefix ? "Data provided by CoinGecko" : "Datos de CoinGecko"}.`.slice(0, 180),
      canonical: `https://orvupi.com${prefix}${path}`,
      path,
    };
  }
  return generic(spec, prefix);
}

export function safeJson(value) {
  const raw = typeof value === "string" ? value : JSON.stringify(value);
  return String(raw).replace(/[&<>\u2028\u2029]/g, (char) => ({ "&": "\\u0026", "<": "\\u003c", ">": "\\u003e", "\u2028": "\\u2028", "\u2029": "\\u2029" }[char]));
}

function formatUsd(value) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: value >= 1 ? 2 : 6 }).format(value);
}

export async function sitemapXml(env, ctx) {
  const [markets, categories, exchanges] = await Promise.all([
    import("./data.js").then((mod) => Promise.all([1, 2, 3, 4].map((page) => mod.getMarkets(env, ctx, { page, per: 250, category: "", order: "market_cap_desc", ids: "" })))),
    getCategories(env, ctx),
    getExchangeList(env, ctx, 1),
  ]);
  const urls = [];
  urls.push("https://orvupi.com/sonar/");
  for (const page of markets) {
    for (const row of page.rows || []) urls.push(`https://orvupi.com/sonar/crypto/${row.id}`);
  }
  for (const row of (categories.rows || []).slice(0, 200)) urls.push(`https://orvupi.com/sonar/categories/${row.id}`);
  for (const row of exchanges.rows || []) urls.push(`https://orvupi.com/sonar/exchanges/${row.id}`);
  const body = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((loc) => `<url><loc>${esc(loc)}</loc></url>`).join("")}</urlset>`;
  const headers = securityHeaders({ "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=21600" });
  return new Response(body, { headers });
}
