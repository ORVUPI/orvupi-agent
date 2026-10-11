import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test, expect } from "@playwright/test";
import { decodeBase58, METADATA_PROGRAM, TOKEN_PROGRAM } from "../../web/v2/shared/solana-read.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const CLONE = "ERYyyaE2Y2GuKB28YbC2w1nCuQ5ENQ89LR44kicvpump";
const FAIL = "So11111111111111111111111111111111111111112";
const SUPPLY = 7721704579000000n;
const CLONE_SUPPLY = 1_000_000_000_000_000n;
const named = JSON.parse(readFileSync(path.join(root, "test/fixtures/informe/verificado.json"), "utf8"));
const marked = JSON.parse(readFileSync(path.join(root, "test/fixtures/informe/nombre-html.json"), "utf8"));
const largo = JSON.parse(readFileSync(path.join(root, "test/fixtures/informe/largo.json"), "utf8"));

function borsh(value) {
  const body = Buffer.from(value);
  const len = Buffer.alloc(4);
  len.writeUInt32LE(body.length);
  return Buffer.concat([len, body]);
}

function mintAccount(supply, mintActive, freezeActive) {
  const data = Buffer.alloc(82);
  data.writeBigUInt64LE(supply, 36);
  data[44] = 6;
  data[45] = 1;
  if (mintActive) {
    data.writeUInt32LE(1, 0);
    data.fill(7, 4, 36);
  }
  if (freezeActive) {
    data.writeUInt32LE(1, 46);
    data.fill(8, 50, 82);
  }
  return data;
}

function metadataAccount(mint, name, symbol) {
  const mintBytes = decodeBase58(mint);
  if (!mintBytes || mintBytes.length !== 32) throw new Error(mint);
  return Buffer.concat([
    Buffer.from([4]),
    Buffer.alloc(32, 9),
    Buffer.from(mintBytes),
    borsh(name),
    borsh(symbol),
    borsh(""),
    Buffer.from([0, 0, 0, 0, 1]),
  ]);
}

function account(owner, data) {
  return { lamports: 1, owner, executable: false, rentEpoch: 0, data: [data.toString("base64"), "base64"] };
}

function rpcResult(value, status = 200) {
  return {
    status,
    contentType: "application/json",
    body: JSON.stringify(
      status === 200
        ? { jsonrpc: "2.0", id: 1, result: { context: { slot: 455334034 }, value } }
        : { jsonrpc: "2.0", id: 1, error: { code: status, message: "no" } },
    ),
  };
}

function profile(mint) {
  if (mint === CLONE) return { name: "STUBX", symbol: "STUBX", supply: CLONE_SUPPLY, active: false };
  if (mint === named.mint) return { name: named.name.text, symbol: named.symbol.text, supply: SUPPLY, active: false };
  if (mint === marked.mint) return { name: marked.name.text, symbol: marked.symbol.text, supply: SUPPLY, active: false };
  if (mint === FAIL) return { name: "OTRO", symbol: "OTRO", supply: SUPPLY, active: false };
  return { name: "USD Coin", symbol: "USDC", supply: SUPPLY, active: true };
}

function englishQuotes(text) {
  return String(text).replace(/«([^»]*)»/g, "\u201C$1\u201D");
}

async function mockRpc(page) {
  await page.route(/solana-rpc\.publicnode\.com|api\.mainnet-beta\.solana\.com/, async (route) => {
    const body = route.request().postDataJSON();
    const method = body?.method;
    if (method === "getMultipleAccounts") {
      const mint = body.params[0][0];
      const item = profile(mint);
      return route.fulfill(rpcResult([
        account(TOKEN_PROGRAM, mintAccount(item.supply, item.active, item.active)),
        account(METADATA_PROGRAM, metadataAccount(mint, item.name, item.symbol)),
        null,
      ]));
    }
    if (method === "getTokenSupply") {
      const mint = body?.params?.[0];
      const item = profile(mint);
      return route.fulfill(rpcResult({ amount: item.supply.toString(), decimals: 6, uiAmountString: "skip" }));
    }
    if (method === "getTokenLargestAccounts") {
      return route.fulfill(rpcResult([{ address: USDC, amount: "1000000", decimals: 6 }]));
    }
    return route.fulfill(rpcResult(1));
  });
}

async function readPair(page) {
  return page.evaluate(async () => {
    const root = document.querySelector("#resultado .resumen-informe");
    const box = root && root.querySelector(".informe-descarga");
    const mod = await import("/shared/informe.js");
    const lang = document.documentElement.lang === "en" ? "en" : "es";
    const model = mod.reportModel(box.informeSource, lang);
    const lines = mod.reportPaintLines(model);
    const blocks = {};
    for (const node of root.querySelectorAll("[data-bloque]")) {
      blocks[node.dataset.bloque] = {
        points: [...node.querySelectorAll(".punto-resumen")].map((row) => ({
          title: row.querySelector(".punto-titulo")?.textContent || "",
          lead: row.querySelector(".punto-frase")?.textContent || "",
        })),
        empty: node.querySelector(".punto-vacio")?.textContent || "",
        text: node.textContent || "",
      };
    }
    const reportBlocks = {};
    for (const block of model.blocks) {
      reportBlocks[block.id] = {
        lines: block.lines,
        empty: block.empty,
        text: [block.heading, block.empty, ...block.lines.flatMap((item) => [item.title, item.lead, item.note])].filter(Boolean).join("\n"),
      };
    }
    return {
      lang,
      lines,
      date: model.date,
      warning: model.warning,
      reportNote: model.note,
      reportBlocks,
      blocks,
      note: root.querySelector(".nota-curva span")?.textContent || "",
      clock: document.querySelector("#resultado .tecnico")?.textContent || "",
    };
  });
}

function expectSameReading(data) {
  const quote = (text) => (data.lang === "en" ? englishQuotes(text) : text);
  for (const [id, shown] of Object.entries(data.blocks)) {
    const painted = data.reportBlocks[id];
    expect(painted, id).toBeTruthy();
    if (!shown.points.length) {
      expect(painted.empty.length).toBeGreaterThan(0);
      if (shown.empty) expect(painted.empty).toBe(quote(shown.empty));
    } else {
      expect(painted.lines.length).toBeGreaterThan(0);
    }
    for (const point of shown.points) {
      expect(painted.text).toContain(quote(point.title));
      expect(painted.text).toContain(quote(point.lead));
    }
  }
  if (data.note) {
    expect(data.reportNote).toBe(quote(data.note));
    expect(data.blocks.falta.text.includes("Curva de Pump.fun") || data.blocks.falta.text.includes("Pump.fun curve")).toBe(false);
    expect(data.reportBlocks.falta.text.includes("Curva de Pump.fun") || data.reportBlocks.falta.text.includes("Pump.fun curve")).toBe(false);
  }
  const clock = data.clock.match(/(\d{2}):(\d{2}):(\d{2})/);
  expect(clock).toBeTruthy();
  if (data.localClock) {
    const reportClock = data.date.match(/(\d{2}):(\d{2}):(\d{2})/);
    expect(reportClock).toBeTruthy();
    expect(reportClock[2]).toBe(clock[2]);
    expect(reportClock[3]).toBe(clock[3]);
  } else {
    expect(data.date).toContain(clock[0]);
  }
  const painted = data.lines.join("\n");
  if (data.lang === "en") expect(painted.includes("«")).toBe(false);
  for (const phrase of [
    "Cripto de alto riesgo",
    "Puedes perderlo todo",
    "No es consejo de inversión",
    "High-risk crypto",
    "You could lose everything",
    "Not investment advice",
    "Imagen generada con IA",
    "AI-generated",
    "no oficial",
    "No oficial",
    "not official",
    "unofficial",
  ]) {
    expect(painted.includes(phrase), phrase).toBe(false);
  }
  expect(painted).toContain(data.lang === "en" ? "Made on stubxai.com" : "Generado en stubxai.com");
  expect(painted).toContain(data.lang === "en" ? "Limits" : "Límites");
  if (data.warning) {
    const needle = data.lang === "en" ? "It looks like STUBX" : "Se parece a STUBX";
    const at = data.lines.findIndex((line) => line.includes(needle));
    const checked = data.lines.findIndex((line) => line === "Qué se comprobó" || line === "What was checked");
    expect(at).toBeGreaterThan(0);
    expect(at).toBeLessThan(checked);
    expect(data.reportBlocks.atencion.lines[0].lead).toContain(needle);
  }
}

async function readSaved(card) {
  return card.evaluate(async (node) => {
    const root = node.querySelector(".resumen-informe");
    const box = node.querySelector(".informe-descarga");
    const mod = await import("/shared/informe.js");
    const lang = document.documentElement.lang === "en" ? "en" : "es";
    const model = mod.reportModel(box.informeSource, lang);
    const lines = mod.reportPaintLines(model);
    const blocks = {};
    for (const item of root.querySelectorAll("[data-bloque]")) {
      blocks[item.dataset.bloque] = {
        points: [...item.querySelectorAll(".punto-resumen")].map((row) => ({
          title: row.querySelector(".punto-titulo")?.textContent || "",
          lead: row.querySelector(".punto-frase")?.textContent || "",
        })),
        empty: item.querySelector(".punto-vacio")?.textContent || "",
        text: item.textContent || "",
      };
    }
    const reportBlocks = {};
    for (const block of model.blocks) {
      reportBlocks[block.id] = {
        lines: block.lines,
        empty: block.empty,
        text: [block.heading, block.empty, ...block.lines.flatMap((item) => [item.title, item.lead, item.note])].filter(Boolean).join("\n"),
      };
    }
    return {
      lang,
      lines,
      date: model.date,
      warning: model.warning,
      reportNote: model.note,
      reportBlocks,
      blocks,
      note: root.querySelector(".nota-curva span")?.textContent || "",
      clock: node.querySelector("p.sello")?.textContent || "",
      localClock: true,
      address: node.querySelector("code.mint")?.textContent || "",
    };
  });
}

async function lookup(page, mint, text) {
  await page.locator("#direccion-token").fill(mint);
  await page.locator("#consulta button[type='submit']").click();
  await expect(page.locator("#resultado .resumen-informe")).toContainText(text, { timeout: 20_000 });
  await expect(page.locator("#resultado .informe-descarga")).toBeVisible();
}

test("el informe repite lo que se ve en pantalla", async ({ page }) => {
  test.setTimeout(120_000);
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(String(error)));
  await mockRpc(page);
  await page.goto("/verify/");

  await lookup(page, USDC, "Dice llamarse «USD Coin»");
  const usdc = await readPair(page);
  expectSameReading(usdc);
  expect(usdc.lines.join("\n")).toContain("Lectura de Verify · no es un certificado");
  expect(usdc.date).toMatch(/\d{2}:\d{2}:\d{2}/);

  await page.getByRole("button", { name: "English" }).click();
  await expect(page.locator("#resultado .resumen-informe")).toContainText("It says it is called");
  const english = await readPair(page);
  expectSameReading(english);
  expect(english.lines.join("\n")).toContain("\u201CUSD Coin\u201D");
  expect(english.lines.join("\n").includes("«")).toBe(false);
  await page.getByRole("button", { name: "Español" }).click();
  await expect(page.locator("#resultado .resumen-informe")).toContainText("Qué se comprobó");

  await lookup(page, named.mint, "Dice llamarse «verificado»");
  const token = await readPair(page);
  expectSameReading(token);
  expect(token.lines.join("\n")).toContain("«verificado»");
  expect(token.lines.join("\n")).toContain("«verified»");
  expect(token.lines.join("\n").includes("«leído en la cadena»")).toBe(false);
  expect(token.blocks.atencion.text.includes("Comprobación anterior")).toBe(false);

  await lookup(page, marked.mint, "A&B<i>");
  const htmlName = await readPair(page);
  expectSameReading(htmlName);
  expect(htmlName.lines.join("\n")).toContain("«A&B<i>»");
  expect(htmlName.lines.join("\n").includes("&lt;")).toBe(false);

  await lookup(page, CLONE, "Se parece a STUBX pero no es la dirección oficial");
  const clone = await readPair(page);
  expectSameReading(clone);
  const earlier = clone.reportBlocks.atencion.lines.find((item) => item.title === "Comprobación anterior");
  expect(earlier?.lead).toContain("2026-10-09");
  expect(earlier?.lead).not.toContain(clone.date.match(/\d{2}:\d{2}:\d{2}/)[0]);
  expect(clone.blocks.atencion.points[0].lead).toContain("Se parece a STUBX pero no es la dirección oficial");

  await page.locator("#guardar-consulta").click();
  await page.locator("#comparacion-verify").getByRole("link", { name: "Abrir Cuaderno" }).click();
  await page.waitForURL(/\/cuaderno\/$/);
  const saved = page.locator(".consulta-guardada", { hasText: CLONE }).first();
  const savedAttention = saved.locator("[data-bloque='atencion']");
  await expect(savedAttention).toContainText("Se parece a STUBX pero no es la dirección oficial", { timeout: 20_000 });
  await expect(savedAttention.locator(".punto-vacio")).toHaveCount(0);
  await expect(savedAttention).not.toContainText("Comprobación anterior");
  await expect(saved.locator(".informe-descarga")).toContainText("Informe descargable");
  expect(pageErrors).toEqual([]);
});

test("los fixtures dejan PNG y PDF con el texto de la cadena", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "el archivo se genera una sola vez");
  test.setTimeout(120_000);
  await page.goto("/verify/");
  const cases = [
    { source: named, lang: "es", stem: "informe-verificado-es", summary: true },
    { source: named, lang: "en", stem: "informe-verificado-en", summary: true },
    { source: marked, lang: "es", stem: "informe-nombre-html-es", summary: true },
    { source: marked, lang: "en", stem: "informe-nombre-html-en", summary: true },
    { source: largo, lang: "es", stem: "informe-largo-es", summary: false },
  ];
  const dir = "/opt/cursor/artifacts";
  mkdirSync(dir, { recursive: true });
  for (const item of cases) {
    const result = await page.evaluate(async ({ source, lang, summary }) => {
      const reportMod = await import("/shared/informe.js");
      const summaryMod = await import("/shared/reading-summary.js");
      const modelSource = summary
        ? { summary: summaryMod.summaryFromCard(source), mint: source.mint, network: source.network, consultedAt: source.consultedAt }
        : source;
      const model = reportMod.reportModel(modelSource, lang);
      const files = await reportMod.renderReportFiles(model, document);
      const png = new Uint8Array(await files.png.arrayBuffer());
      const pdfBytes = files.pdf ? new Uint8Array(await files.pdf.arrayBuffer()) : null;
      const encode = (bytes) => {
        const parts = [];
        for (let index = 0; index < bytes.length; index += 8192) {
          parts.push(String.fromCharCode.apply(null, bytes.subarray(index, index + 8192)));
        }
        return btoa(parts.join(""));
      };
      return {
        png: encode(png),
        pdf: pdfBytes ? encode(pdfBytes) : "",
        lines: reportMod.reportPaintLines(model),
        date: model.date,
        warning: model.warning,
      };
    }, { source: item.source, lang: item.lang, summary: item.summary });
    const png = Buffer.from(result.png, "base64");
    const pdf = Buffer.from(result.pdf, "base64");
    expect(png.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    expect(pdf.subarray(0, 5).toString("utf8")).toBe("%PDF-");
    expect(result.date).toMatch(/\d{2}:\d{2}:\d{2}/);
    const text = result.lines.join("\n");
    for (const phrase of [
      "Cripto de alto riesgo",
      "Puedes perderlo todo",
      "No es consejo de inversión",
      "High-risk crypto",
      "You could lose everything",
      "Not investment advice",
      "Imagen generada con IA",
      "AI-generated",
      "no oficial",
      "No oficial",
      "not official",
      "unofficial",
    ]) {
      expect(text.includes(phrase), phrase).toBe(false);
    }
    if (item.stem.startsWith("informe-verificado")) {
      expect(text.includes("verificado")).toBe(true);
      expect(text.includes("verified")).toBe(true);
      expect(text.includes("leído en la cadena") || text.includes("read on-chain")).toBe(false);
      if (item.lang === "en") expect(text.includes("«")).toBe(false);
    }
    if (item.stem.startsWith("informe-nombre-html")) {
      expect(text.includes("A&B<i>")).toBe(true);
      expect(text.includes("&lt;")).toBe(false);
    }
    if (item.stem === "informe-largo-es") {
      expect(result.warning).toContain("Se parece a STUBX pero no es la dirección oficial");
      expect(text.includes("Curva de Pump.fun: no aplica")).toBe(true);
      const count = Number(/\/Count (\d+)/.exec(pdf.toString("latin1"))?.[1] || 0);
      expect(count).toBeGreaterThan(1);
    }
    writeFileSync(path.join(dir, `${item.stem}.png`), png);
    writeFileSync(path.join(dir, `${item.stem}.pdf`), pdf);
  }
});

const BANNED_IN_FILE = [
  "Cripto de alto riesgo",
  "Puedes perderlo todo",
  "No es consejo de inversión",
  "High-risk crypto",
  "You could lose everything",
  "Not investment advice",
  "Imagen generada con IA",
  "AI-generated",
  "no oficial",
  "No oficial",
  "not official",
  "unofficial",
];

test("USDC y ERYyy dejan un PNG en español y en inglés", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "el archivo se genera una sola vez");
  test.setTimeout(120_000);
  await mockRpc(page);
  await page.goto("/verify/");
  const dir = "/opt/cursor/artifacts";
  mkdirSync(dir, { recursive: true });
  const shots = [
    { mint: USDC, lang: "es", stem: "informe-usdc-es", ready: "Dice llamarse «USD Coin»" },
    { mint: USDC, lang: "en", stem: "informe-usdc-en", ready: "It says it is called" },
    { mint: CLONE, lang: "es", stem: "informe-clon-es", ready: "Se parece a STUBX pero no es la dirección oficial" },
    { mint: CLONE, lang: "en", stem: "informe-clon-en", ready: "It looks like STUBX but it is not the official address" },
  ];
  for (const shot of shots) {
    await page.locator(`[data-set-lang="${shot.lang}"]`).click();
    await expect(page.locator("html")).toHaveAttribute("data-lang", shot.lang);
    await lookup(page, shot.mint, shot.ready);
    const result = await page.evaluate(async () => {
      const box = document.querySelector("#resultado .informe-descarga");
      const mod = await import("/shared/informe.js");
      const lang = document.documentElement.lang === "en" ? "en" : "es";
      const model = mod.reportModel(box.informeSource, lang);
      const files = await mod.renderReportFiles(model, document);
      const png = new Uint8Array(await files.png.arrayBuffer());
      const parts = [];
      for (let index = 0; index < png.length; index += 8192) {
        parts.push(String.fromCharCode.apply(null, png.subarray(index, index + 8192)));
      }
      const falta = model.blocks.find((block) => block.id === "falta");
      const attention = model.blocks.find((block) => block.id === "atencion");
      return {
        png: btoa(parts.join("")),
        lines: mod.reportPaintLines(model),
        title: model.title,
        date: model.date,
        origin: model.origin,
        warning: model.warning,
        note: model.note,
        attentionLead: attention?.lines[0]?.lead || "",
        attentionEmpty: attention?.empty || "",
        falta: [falta?.empty, ...(falta?.lines || []).map((item) => `${item.title} ${item.lead}`)].join("\n"),
      };
    });
    const png = Buffer.from(result.png, "base64");
    expect(png.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const text = result.lines.join("\n");
    for (const phrase of BANNED_IN_FILE) expect(text.includes(phrase), phrase).toBe(false);
    expect(result.title).toContain("·");
    expect(result.date).toMatch(/\d{2}:\d{2}:\d{2}/);
    expect(result.origin).toContain("stubxai.com");
    expect(text).toContain(shot.lang === "en" ? "Limits" : "Límites");
    expect(result.falta.includes("Curva de Pump.fun") || result.falta.includes("Pump.fun curve")).toBe(false);
    if (!result.attentionLead) expect(result.attentionEmpty.length).toBeGreaterThan(0);
    if (shot.mint === USDC) {
      expect(result.note).toBe(shot.lang === "en" ? "Pump.fun curve: not applicable" : "Curva de Pump.fun: no aplica");
      expect(text).toContain(shot.lang === "en" ? "\u201CUSD Coin\u201D" : "Dice llamarse «USD Coin»");
      if (shot.lang === "en") expect(text.includes("«")).toBe(false);
    }
    if (shot.mint === CLONE) {
      expect(result.warning.length).toBeGreaterThan(0);
      expect(result.attentionLead).toContain(shot.lang === "en" ? "It looks like STUBX" : "Se parece a STUBX");
      expect(text).toContain("2026-10-09");
      expect(text).toContain(shot.lang === "en" ? "It says it is called" : "Dice llamarse");
    }
    writeFileSync(path.join(dir, `${shot.stem}.png`), png);
  }
});

test("el cuaderno compara el informe con lo que se ve en pantalla", async ({ page }) => {
  test.setTimeout(120_000);
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(String(error)));
  await mockRpc(page);
  await page.goto("/verify/");

  await lookup(page, USDC, "Dice llamarse «USD Coin»");
  await page.locator("#guardar-consulta").click();
  await page.locator("#comparacion-verify").getByRole("link", { name: "Abrir Cuaderno" }).click();
  await page.waitForURL(/\/cuaderno\/$/);
  const usdcCard = page.locator(".consulta-guardada", { hasText: USDC }).first();
  await expect(usdcCard.locator(".resumen-informe")).toContainText("Dice llamarse «USD Coin»", { timeout: 20_000 });
  const usdc = await readSaved(usdcCard);
  expectSameReading(usdc);
  expect(usdc.lines.join("\n")).toContain(usdc.address);
  expect(usdc.lines.join("\n")).toContain("Lectura de Verify · no es un certificado");
  expect(usdc.reportNote).toBe("Curva de Pump.fun: no aplica");

  await page.locator("[data-set-lang='en']").click();
  await expect(usdcCard.locator(".resumen-informe")).toContainText("It says it is called");
  const usdcEnglish = await readSaved(usdcCard);
  expectSameReading(usdcEnglish);
  expect(usdcEnglish.lines.join("\n")).toContain("\u201CUSD Coin\u201D");
  expect(usdcEnglish.lines.join("\n").includes("«")).toBe(false);
  expect(usdcEnglish.reportNote).toBe("Pump.fun curve: not applicable");

  await page.locator("[data-set-lang='es']").click();
  await page.goto("/verify/");
  await lookup(page, CLONE, "Se parece a STUBX pero no es la dirección oficial");
  await page.locator("#guardar-consulta").click();
  await page.locator("#comparacion-verify").getByRole("link", { name: "Abrir Cuaderno" }).click();
  await page.waitForURL(/\/cuaderno\/$/);
  const cloneCard = page.locator(".consulta-guardada", { hasText: CLONE }).first();
  await expect(cloneCard.locator("[data-bloque='atencion']")).toContainText("Se parece a STUBX pero no es la dirección oficial", { timeout: 20_000 });
  const clone = await readSaved(cloneCard);
  expectSameReading(clone);
  expect(clone.blocks.atencion.points[0].lead).toContain("Se parece a STUBX pero no es la dirección oficial");
  expect(clone.reportBlocks.atencion.lines[0].lead).toContain("Se parece a STUBX pero no es la dirección oficial");
  expect(clone.blocks.atencion.text.includes("Comprobación anterior")).toBe(false);
  expect(clone.reportBlocks.atencion.text.includes("Comprobación anterior")).toBe(false);
  expect(clone.lines.join("\n")).toContain("Dice llamarse");

  await page.locator("[data-set-lang='en']").click();
  await expect(cloneCard.locator(".resumen-informe")).toContainText("It looks like STUBX");
  const cloneEnglish = await readSaved(cloneCard);
  expectSameReading(cloneEnglish);
  expect(cloneEnglish.reportBlocks.atencion.lines[0].lead).toContain("It looks like STUBX");
  expect(cloneEnglish.lines.join("\n").includes("«")).toBe(false);
  expect(cloneEnglish.reportBlocks.atencion.text.includes("Earlier check")).toBe(false);
  expect(pageErrors).toEqual([]);
});
