import { api, qs } from "./api.mjs";
import { compact, money, pct, show, when } from "./format.mjs";
import { t } from "./i18n.mjs";
import { snapshot } from "./store.mjs";
import { el } from "./ui.mjs";

const facts = { screen: null, coin: null };

export function rememberFact(kind, payload) {
  facts[kind] = payload;
}

export function iaButton(ctx) {
  return el("button", { type: "button", class: "sn-ia-btn", "data-sn": "ia", onclick: () => open(ctx), text: t("ia") });
}

function open(ctx) {
  let dialog = document.getElementById("sn-ia");
  if (!dialog) {
    dialog = el("dialog", { id: "sn-ia", class: "sn-dialog" });
    document.body.append(dialog);
  }
  const out = el("div", { class: "sn-ia-out", "data-sn": "ia-out" });
  const input = el("input", { type: "text", "data-sn": "ia-q", placeholder: t("ask") });
  dialog.replaceChildren(
    el("h2", { text: t("iaTitle") }),
    el("p", { text: t("iaBody") }),
    el("p", { class: "sn-note", text: t("noGuess") }),
    el("div", { class: "sn-tools" }, [
      el("button", { type: "button", class: "sn-btn", "data-sn": "ia-fdv", onclick: () => { out.textContent = t("glossaryFdv"); }, text: t("fdvQ") }),
      el("button", { type: "button", class: "sn-btn", "data-sn": "ia-mcap", onclick: () => { out.textContent = t("glossaryMcap"); }, text: t("mcap") }),
      el("button", { type: "button", class: "sn-btn", onclick: () => ask("compara bitcoin ethereum", out, ctx), text: t("presetCompare") }),
    ]),
    input,
    el("button", { type: "button", class: "sn-btn on", onclick: () => ask(input.value, out, ctx), text: t("send") }),
    out,
    el("button", { type: "button", class: "sn-btn", onclick: () => dialog.close(), text: t("close") }),
  );
  if (typeof dialog.showModal === "function") dialog.showModal();
  else dialog.setAttribute("open", "");
}

async function ask(text, out, ctx) {
  const query = String(text || "").toLowerCase();
  if (!query.trim()) {
    out.textContent = facts.coin ? summarize(facts.coin) : t("noGuess");
    return;
  }
  if (/fdv/.test(query)) { out.textContent = t("glossaryFdv"); return; }
  if (/capitaliz|market cap|時価|시가/.test(query)) { out.textContent = t("glossaryMcap"); return; }
  if (/volumen|volume|出来高|거래량/.test(query) && !/compara|compare/.test(query)) { out.textContent = t("glossaryVol"); return; }
  const ids = slugs(query);
  if (/compara|compare|比較|비교/.test(query) && ids.length >= 2) {
    out.textContent = t("willLoad");
    try {
      const [a, b] = await Promise.all(ids.slice(0, 2).map((id) => api(`/api/sonar/coin/${id}${qs({ vs: snapshot().prefs.vs })}`)));
      out.textContent = `${line(a)}\n${line(b)}`;
    } catch {
      out.textContent = t("notLoaded");
    }
    return;
  }
  const id = ids[0] || ctx.route?.id;
  if (id && /^(?!.*\.\.)[A-Za-z0-9_-][A-Za-z0-9_.-]{0,119}$/.test(id)) {
    out.textContent = t("willLoad");
    try {
      const coin = await api(`/api/sonar/coin/${id}${qs({ vs: snapshot().prefs.vs })}`);
      facts.coin = coin;
      out.textContent = summarize(coin);
    } catch {
      out.textContent = t("notLoaded");
    }
    return;
  }
  out.textContent = facts.coin ? summarize(facts.coin) : t("noGuess");
}

function slugs(text) {
  const known = ["bitcoin", "ethereum", "solana", "chainlink", "bittensor", "ondo"];
  const found = known.filter((id) => text.includes(id));
  const symbols = { btc: "bitcoin", eth: "ethereum", sol: "solana", link: "chainlink", tao: "bittensor" };
  for (const [symbol, id] of Object.entries(symbols)) {
    if (new RegExp(`\\b${symbol}\\b`).test(text) && !found.includes(id)) found.push(id);
  }
  return found;
}

function summarize(coin) {
  return [line(coin), coin.description ? coin.description.slice(0, 280) : t("noDesc")].join("\n");
}

function line(coin) {
  const vs = coin.vs || snapshot().prefs.vs;
  return `${coin.name} (${coin.symbol}): ${show(money(coin.price, vs))}, ${t("h24")} ${show(pct(coin.ch24h))}, ${t("mcap")} ${show(compact(coin.marketCap, vs))}, ${t("fdv")} ${show(compact(coin.fdv, vs))}. ${t("according", { source: coin.source || "CoinGecko", time: when(coin.fetchedAt) || coin.fetchedAt || "" })}`;
}
