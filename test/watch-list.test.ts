import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";
import { pathToFileURL } from "node:url";
import { repoRoot } from "../src/paths.js";

const CA = "TNWwnzecb37272ZoySDE6D2UcmqNnU12EqtycNSpump";
const OTHER = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const ERY = "ERYyyaE2Y2GuKB28YbC2w1nCuQ5ENQ89LR44kicvpump";
const WHEN = "2026-10-09T12:00:00.000Z";
const LATER = "2026-10-09T13:00:00.000Z";

interface Card {
  mint: string;
  network: string;
  consultedAt: string;
  program: string;
  programStatus: string;
  decimals: number | null;
  supplyAccount: string | null;
  supplyRpc: string | null;
  supplyRpcStatus: string;
  isMint: boolean;
  partial: boolean;
  name: { text: string | null; status: string };
  symbol: { text: string | null; status: string };
  uri: { text: string | null; status: string };
  metadataMutable: string;
  mintAuthority: { state: string; address: string | null; status: string };
  freezeAuthority: { state: string; address: string | null; status: string };
  curve: { present: boolean | null; status: string; virtualToken: string | null; virtualQuote: string | null; realToken: string | null; realQuote: string | null; complete: boolean | null };
  extensions: unknown[];
  extensionsStatus: string;
  largestStatus: string;
  slot: number | null;
  slotStatus: string;
  errors: Array<{ method: string; message: string; httpStatus?: number | null; at?: string }>;
  officialStubx: boolean;
  [key: string]: unknown;
}

async function modules() {
  const root = repoRoot();
  const read = await import(pathToFileURL(path.join(root, "web/v2/shared/solana-read.js")).href) as {
    blankCard: (mint: string, at: string, errors: unknown[]) => Card;
    clearBlockedMethods: () => void;
    readMint: (options: Record<string, unknown>) => Promise<{ ok: boolean; card: Card }>;
  };
  const model = await import(pathToFileURL(path.join(root, "web/v2/shared/notebook-model.js")).href) as {
    migrateStoredRecord: (record: Record<string, unknown> | null) => { changed: boolean; record: Record<string, unknown> | null };
    stampIdentity: (record: Record<string, unknown>) => { network: string; address: string };
    watchTargets: (records: Array<Record<string, unknown>>) => Array<{ key: string; network: string; address: string; latest: { id: string; card: Card } }>;
    chooseWatchTargets: (targets: Array<{ key: string }>, keys: string[]) => Array<{ key: string }>;
    reserveWatchSlots: (entries: unknown[], stamps: number[], now: number, take: (stamps: number[], now: number, limit?: number, windowMs?: number) => { allowed: boolean; stamps: number[] }) => { ready: unknown[]; waiting: unknown[]; stamps: number[] };
    serviceRejection: (card: Card | null) => { rejected: boolean; primary: boolean };
    watchVerdict: (previous: { card: Card }, result: { card: Card | null }) => { kind: string; save: boolean; rejection: { rejected: boolean } };
    validateCard: (card: Card) => { ok: boolean; error?: { es: string } };
    readingComplete: (card: Card) => boolean;
    readingGaps: (card: Card) => Array<{ es: string; en: string }>;
    NOTEBOOK_DB_VERSION: number;
  };
  const summary = await import(pathToFileURL(path.join(root, "web/v2/shared/reading-summary.js")).href) as {
    summaryFromCard: (card: Card) => { blocks: Array<{ id: string; items: Array<{ lead: { es: string }; note?: { es?: string } | null }> }> };
  };
  const gapsUi = await import(pathToFileURL(path.join(root, "web/v2/shared/explain-incomplete.js")).href) as {
    explainIncomplete: (model: { blocks: Array<{ id: string; items: Array<{ lead: { es: string } }> }> }, gaps: Array<{ es: string; en: string }>) => { blocks: Array<{ id: string; items: Array<{ lead: { es: string } }> }> };
  };
  const slots = await import(pathToFileURL(path.join(root, "web/v2/modules/pair-report.mjs")).href) as {
    takeQuerySlot: (stamps: number[], now: number, limit?: number, windowMs?: number) => { allowed: boolean; stamps: number[] };
  };
  const notice = await import(pathToFileURL(path.join(root, "web/v2/shared/aviso-guardar.js")).href) as {
    AVISO_GUARDAR: { es: string; en: string };
  };
  read.clearBlockedMethods();
  return { read, model, slots, notice, summary, explainIncomplete: gapsUi.explainIncomplete };
}

function filled(read: { blankCard: (mint: string, at: string, errors: unknown[]) => Card }, mint: string, at: string, supply: string): Card {
  const card = read.blankCard(mint, at, []);
  card.isMint = true;
  card.partial = false;
  card.program = "spl-token";
  card.programStatus = "verificado";
  card.decimals = 6;
  card.supplyAccount = supply;
  card.supplyRpc = supply;
  card.supplyRpcStatus = "verificado";
  card.slot = 10;
  card.slotStatus = "verificado";
  card.mintAuthority = { state: "revocada", address: null, status: "verificado" };
  card.freezeAuthority = { state: "revocada", address: null, status: "verificado" };
  card.name = { text: mint === ERY ? "STUBX" : "USD Coin", status: "verificado" };
  card.symbol = { text: mint === ERY ? "STUBX" : "USDC", status: "verificado" };
  card.uri = { text: null, status: "ausente" };
  card.metadataMutable = "no";
  card.largestStatus = "ok";
  card.extensions = [];
  card.extensionsStatus = "no_aplica";
  card.curve = {
    present: false,
    status: mint.endsWith("pump") ? "ausente" : "no_aplica",
    virtualToken: null,
    virtualQuote: null,
    realToken: null,
    realQuote: null,
    complete: null,
  };
  card.errors = [];
  return card;
}

describe("revisar direcciones guardadas", () => {
  test("la migración añade red y dirección y no borra la entrada vieja", async () => {
    const { read, model } = await modules();
    const card = filled(read, OTHER, WHEN, "1000");
    const old = { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", note: "nota vieja", card, source: "leida" };
    const migrated = model.migrateStoredRecord(old);
    assert.equal(migrated.changed, true);
    assert.equal(migrated.record?.network, "solana");
    assert.equal(migrated.record?.address, OTHER);
    assert.equal(migrated.record?.note, "nota vieja");
    assert.equal(migrated.record?.source, "leida");
    assert.equal(migrated.record?.id, old.id);
    const again = model.migrateStoredRecord(migrated.record as Record<string, unknown>);
    assert.equal(again.changed, false);
    const kept = model.migrateStoredRecord({ ...old, network: "solana", address: "ya-escrita" });
    assert.equal(kept.changed, false);
    assert.equal(kept.record?.address, "ya-escrita");
    const empty = model.migrateStoredRecord({ id: "sin-ficha", note: "" });
    assert.equal(empty.changed, false);
    assert.equal(empty.record?.network, undefined);
    assert.equal(model.migrateStoredRecord(null).record, null);
    const stamped = model.stampIdentity({ id: "1", note: "", card });
    assert.equal(stamped.network, "solana");
    assert.equal(stamped.address, OTHER);
    assert.equal(model.NOTEBOOK_DB_VERSION, 2);
  });

  test("la lista agrupa por red y dirección y el cupo deja el resto en espera", async () => {
    const { read, model, slots } = await modules();
    const first = filled(read, OTHER, WHEN, "1000");
    const second = filled(read, OTHER, LATER, "2000");
    const clone = filled(read, ERY, WHEN, "3000");
    const targets = model.watchTargets([
      { id: "1", note: "", card: first },
      { id: "2", note: "", card: second },
      { id: "3", note: "", card: clone },
    ]);
    assert.equal(targets.length, 2);
    assert.equal(targets[0]?.address, OTHER);
    assert.equal(targets[0]?.latest.id, "2");
    assert.equal(targets[1]?.address, ERY);
    assert.equal(targets[0]?.network, "solana");
    const onlyClone = model.chooseWatchTargets(targets, [`solana\n${ERY}`]);
    assert.deepEqual(onlyClone.map((item) => item.key), [`solana\n${ERY}`]);
    assert.equal(model.chooseWatchTargets(targets, []).length, 2);
    const many = Array.from({ length: 7 }, (_, index) => ({ key: String(index) }));
    const plan = model.reserveWatchSlots(many, [], 1_000, slots.takeQuerySlot);
    assert.equal(plan.ready.length, 6);
    assert.equal(plan.waiting.length, 1);
    assert.equal(plan.stamps.length, 6);
    const blocked = model.reserveWatchSlots([{ key: "otra" }], plan.stamps, 1_000, slots.takeQuerySlot);
    assert.equal(blocked.ready.length, 0);
    assert.equal(blocked.waiting.length, 1);
    const opened = slots.takeQuerySlot(plan.stamps, 61_000, 6, 60_000);
    assert.equal(opened.allowed, true);
  });

  test("un rechazo no se guarda como igual y un cambio usa el comparador", async () => {
    const { read, model } = await modules();
    const previous = { id: "1", note: "", card: filled(read, OTHER, WHEN, "1000") };
    const same = filled(read, OTHER, LATER, "1000");
    const checked = model.validateCard(same);
    assert.equal(checked.ok, true, checked.error?.es);
    const equal = model.watchVerdict(previous, { card: same });
    assert.equal(equal.kind, "igual");
    assert.equal(equal.save, false);
    const moved = filled(read, OTHER, LATER, "2500");
    const changed = model.watchVerdict(previous, { card: moved });
    assert.equal(changed.kind, "cambio");
    const refused = filled(read, OTHER, LATER, "1000");
    refused.program = "no_disponible";
    refused.programStatus = "fallo";
    refused.partial = true;
    refused.errors = [{ method: "getMultipleAccounts", message: "HTTP 403", httpStatus: 403, at: LATER }];
    const rejection = model.watchVerdict(previous, { card: refused });
    assert.equal(rejection.kind, "rechazada");
    assert.equal(rejection.save, false);
    assert.equal(String(rejection.kind) === "igual", false);
    assert.equal(model.serviceRejection(refused).primary, true);
    const partial = filled(read, OTHER, LATER, "1000");
    partial.partial = true;
    partial.supplyRpc = null;
    partial.supplyRpcStatus = "fallo";
    partial.errors = [{ method: "getTokenSupply", message: "HTTP 403", httpStatus: 403, at: LATER }];
    const incomplete = model.watchVerdict(previous, { card: partial });
    assert.equal(String(incomplete.kind) === "igual", false);
    assert.equal(incomplete.kind, "incompleto");
    assert.equal(incomplete.rejection.rejected, true);
    assert.equal(incomplete.save, false);
    const missing = model.watchVerdict(previous, { card: null });
    assert.equal(missing.kind, "rechazada");
    assert.equal(missing.save, false);
  });

  test("la cola respeta el hueco antes de borrar el recuerdo de un rechazo, y el aviso legal no cambia", async () => {
    const { notice } = await modules();
    const root = repoRoot();
    const source = readFileSync(path.join(root, "web/v2/assets/cuaderno.js"), "utf8");
    const follow = source.slice(source.indexOf("async function followSelected"), source.indexOf("function bind"));
    const reserved = follow.indexOf("reserveWatchSlots(list, queryStamps, Date.now(), takeQuerySlot)");
    const cleared = follow.indexOf("if (forgetKey && plan.ready.length) clearBlockedMethods()");
    const read = follow.indexOf("readMint({");
    assert.ok(reserved >= 0);
    assert.ok(reserved < cleared);
    assert.ok(cleared < read);
    assert.match(source, /takeQuerySlot\(\s*queryStamps,\s*Date\.now\(\),\s*6,\s*60000\s*\)/);
    const page = readFileSync(path.join(root, "web/v2/cuaderno/index.html"), "utf8");
    assert.match(page, /Revisar direcciones guardadas/);
    assert.match(page, /Recheck saved addresses/);
    assert.equal(page.includes("Lista de seguimiento"), false);
    assert.equal(page.includes("Watch list"), false);
    assert.match(source, /Esta lectura queda guardada en este navegador\. Puedes borrarla en el Cuaderno\./);
    assert.match(source, /This reading is saved in this browser\. You can delete it in the Notebook\./);
    assert.equal(page.includes("Al pulsar, tu navegador envía las direcciones que se revisan (las marcadas, o todas si no marcas ninguna) a los nodos públicos de Solana solana-rpc.publicnode.com y api.mainnet-beta.solana.com, que también ven tu IP. No se guarda nada nuevo hasta que pulses «Guardar»."), true);
    assert.equal(page.includes("When you tap, your browser sends the addresses being checked (the marked ones, or all of them if none are marked) to the Solana public nodes solana-rpc.publicnode.com and api.mainnet-beta.solana.com, which also see your IP. Nothing new is saved until you tap \"Save\"."), true);
    assert.match(page, /id="detener"/);
    assert.match(page, /id="guardar-todas"[^>]*aria-disabled="true"/);
    assert.match(page, /id="guardar-todas-ayuda"/);
    assert.match(source, /No hay lecturas nuevas que guardar/);
    assert.match(source, /There are no new readings to save/);
    assert.match(source, /para no saturar los servicios públicos de Solana/);
    assert.match(source, /so we do not overload Solana's public services/);
    assert.match(source, /Faltan \$\{left\} segundos/);
    assert.match(source, /\$\{left\} seconds remain/);
    assert.match(source, /setInterval\(\(\) => paintLimit\(false\), 1000\)/);
    assert.equal(follow.includes("persist("), false);
    assert.match(page, /id="seguir"/);
    assert.equal(page.includes(notice.AVISO_GUARDAR.es), true);
    assert.equal(page.includes(notice.AVISO_GUARDAR.en), true);
    assert.match(notice.AVISO_GUARDAR.es, /«Guardar esta consulta»/);
    assert.match(notice.AVISO_GUARDAR.en, /"Save this lookup"/);
    assert.equal(source.includes("innerHTML"), false);
    const actions = readFileSync(path.join(root, "web/v2/assets/verificar-acciones.mjs"), "utf8");
    assert.match(actions, /stubx-cuaderno/);
    assert.match(actions, /stampIdentity/);
    assert.match(actions, /openNotebookDb\(DB_NAME/);
    assert.match(source, /Cierra las otras pestañas de stubxai.com y recarga\./);
    assert.match(actions, /Cierra las otras pestañas de stubxai.com y recarga\./);
    const rollback = readFileSync(path.join(root, "ROLLBACK.md"), "utf8");
    const back = "Para volver atrás: cargar otra vez esta página, o borrar en el navegador los datos del sitio de la base llamada stubx-cuaderno.";
    assert.equal(rollback.includes(back), true);
    assert.equal(rollback.includes("36eea1a3"), true);
    assert.equal(rollback.includes("f2a24c14"), true);
    assert.equal(rollback.includes("VersionError"), true);
    const verify = readFileSync(path.join(root, "web/v2/assets/verify.js"), "utf8");
    const draft = readFileSync(path.join(root, "site-drafts/assets/verify.js"), "utf8");
    assert.equal(verify.includes("function explainIncomplete"), false);
    assert.equal(draft.includes("function explainIncomplete"), false);
    assert.equal(readFileSync(path.join(root, "web/v2/shared/reading-summary.js"), "utf8").includes("function explainIncomplete"), false);
    assert.equal(page.includes('id="aviso-pasada" class="aviso-pasada"'), true);
    assert.equal(page.includes('id="aviso-pasada" class="sello"'), false);
  });

  test("un tiempo de espera en la segunda lectura del suministro no es igual", async () => {
    const { read, model } = await modules();
    const previous = { id: "1", note: "", card: filled(read, OTHER, WHEN, "1000") };
    const card = filled(read, OTHER, LATER, "1000");
    card.partial = true;
    card.supplyRpc = null;
    card.supplyRpcStatus = "fallo";
    card.errors = [{ method: "getTokenSupply", message: "timeout", httpStatus: 408, at: LATER }];
    const verdict = model.watchVerdict(previous, { card });
    assert.equal(verdict.kind, "incompleto");
    assert.equal(String(verdict.kind) === "igual", false);
    assert.equal(verdict.save, false);
  });

  test("dos cuentas en la respuesta no es igual", async () => {
    const { read, model } = await modules();
    const previous = { id: "1", note: "", card: filled(read, OTHER, WHEN, "1000") };
    const card = filled(read, OTHER, LATER, "1000");
    card.partial = true;
    card.programStatus = "fallo";
    card.errors = [{ method: "getMultipleAccounts", message: "No se pudo comprobar", httpStatus: 200, at: LATER }];
    const verdict = model.watchVerdict(previous, { card });
    assert.equal(verdict.kind, "incompleto");
    assert.equal(String(verdict.kind) === "igual", false);
  });

  test("cuatro cuentas en la respuesta no es igual", async () => {
    const { read, model } = await modules();
    const previous = { id: "1", note: "", card: filled(read, OTHER, WHEN, "1000") };
    const card = filled(read, OTHER, LATER, "1000");
    card.partial = true;
    card.programStatus = "fallo";
    card.errors = [{ method: "getMultipleAccounts", message: "No se pudo comprobar", httpStatus: 200, at: LATER }];
    const verdict = model.watchVerdict(previous, { card });
    assert.equal(verdict.kind, "incompleto");
    assert.equal(String(verdict.kind) === "igual", false);
  });

  test("una respuesta mal formada no es igual", async () => {
    const { read, model } = await modules();
    const previous = { id: "1", note: "", card: filled(read, OTHER, WHEN, "1000") };
    const card = filled(read, OTHER, LATER, "1000");
    card.partial = true;
    card.programStatus = "fallo";
    card.errors = [{ method: "getMultipleAccounts", message: "Cuenta ilegible.", httpStatus: 200, at: LATER }];
    const verdict = model.watchVerdict(previous, { card });
    assert.equal(verdict.kind, "incompleto");
    assert.equal(String(verdict.kind) === "igual", false);
  });

  test("una ficha parcial no es igual", async () => {
    const { read, model } = await modules();
    const previous = { id: "1", note: "", card: filled(read, OTHER, WHEN, "1000") };
    const card = filled(read, OTHER, LATER, "1000");
    card.partial = true;
    const verdict = model.watchVerdict(previous, { card });
    assert.equal(verdict.kind, "incompleto");
    assert.equal(String(verdict.kind) === "igual", false);
  });

  test("suministros que no coinciden no es igual", async () => {
    const { read, model } = await modules();
    const previous = { id: "1", note: "", card: filled(read, OTHER, WHEN, "1000") };
    const card = filled(read, OTHER, LATER, "1000");
    card.supplyRpc = "1001";
    card.partial = false;
    card.errors = [];
    const verdict = model.watchVerdict(previous, { card });
    assert.equal(verdict.kind, "incompleto");
    assert.equal(String(verdict.kind) === "igual", false);
  });

  test("un fallo del momento de la red no es igual", async () => {
    const { read, model } = await modules();
    const previous = { id: "1", note: "", card: filled(read, OTHER, WHEN, "1000") };
    const card = filled(read, OTHER, LATER, "1000");
    card.slotStatus = "fallo";
    card.slot = null;
    const verdict = model.watchVerdict(previous, { card });
    assert.equal(verdict.kind, "incompleto");
    assert.equal(String(verdict.kind) === "igual", false);
  });

  test("la lectura anterior incompleta no es igual", async () => {
    const { read, model } = await modules();
    const older = filled(read, OTHER, WHEN, "1000");
    older.partial = true;
    older.errors = [{ method: "getTokenSupply", message: "timeout", httpStatus: 408, at: WHEN }];
    const previous = { id: "1", note: "", card: older };
    const card = filled(read, OTHER, LATER, "1000");
    const verdict = model.watchVerdict(previous, { card });
    assert.equal(verdict.kind, "incompleto");
    assert.equal(String(verdict.kind) === "igual", false);
    assert.equal(verdict.save, false);
  });

  test("un incompleto nombra el motivo y un estado fallido cuenta sin marca de parcial", async () => {
    const { read, model, summary, explainIncomplete } = await modules();
    const previous = { id: "1", note: "", card: filled(read, OTHER, WHEN, "1000") };
    const cases = [
      { label: "suministros que no coinciden", touch: (card: Card) => { card.supplyRpc = "1001"; card.partial = false; }, phrase: "no coinciden" },
      { label: "fallo del momento de la red", touch: (card: Card) => { card.slotStatus = "fallo"; card.slot = null; card.partial = false; }, phrase: "momento de la red" },
      { label: "ficha parcial", touch: (card: Card) => { card.partial = true; }, phrase: "a medias" },
      { label: "cuentas grandes en fallo", touch: (card: Card) => { card.largestStatus = "fallo"; card.partial = false; card.errors = []; }, phrase: "quién tiene más tokens" },
    ];
    for (const item of cases) {
      const card = filled(read, OTHER, LATER, "1000");
      item.touch(card);
      assert.equal(model.readingComplete(card), false, item.label);
      const verdict = model.watchVerdict(previous, { card });
      assert.equal(verdict.kind, "incompleto", item.label);
      assert.equal(String(verdict.kind) === "igual", false, item.label);
      const text = missingText(summary, model, explainIncomplete, card);
      assert.equal(text.includes("No falta ningún dato"), false, item.label);
      assert.match(text, new RegExp(item.phrase), item.label);
    }
  });

  test("una ficha importada con suministro o momento vacío, o sin consultar, no es igual", async () => {
    const { read, model, summary, explainIncomplete } = await modules();
    const previous = { id: "1", note: "", card: filled(read, OTHER, WHEN, "1000") };
    const cases = [
      { label: "supplyRpc null", touch: (card: Card) => { card.supplyRpc = null; }, phrase: "No se leyó la segunda comprobación del suministro." },
      { label: "supplyAccount null", touch: (card: Card) => { card.supplyAccount = null; }, phrase: "No se leyó el suministro de la cuenta." },
      { label: "slot null", touch: (card: Card) => { card.slot = null; }, phrase: "No se leyó el momento de la red." },
      { label: "slotStatus no_consultado", touch: (card: Card) => { card.slotStatus = "no_consultado"; }, phrase: "Esta lectura no pidió el momento de la red." },
      { label: "supplyRpcStatus no_consultado", touch: (card: Card) => { card.supplyRpcStatus = "no_consultado"; }, phrase: "Esta lectura no pidió la segunda comprobación del suministro." },
      { label: "largestStatus no_consultado", touch: (card: Card) => { card.largestStatus = "no_consultado"; }, phrase: "Esta lectura no pidió quién tiene más tokens." },
    ];
    for (const item of cases) {
      const card = filled(read, OTHER, LATER, "1000");
      item.touch(card);
      assert.equal(model.validateCard(card).ok, true, item.label);
      assert.equal(model.readingComplete(card), false, item.label);
      const verdict = model.watchVerdict(previous, { card });
      assert.equal(verdict.kind, "incompleto", item.label);
      assert.equal(String(verdict.kind) === "igual", false, item.label);
      const text = missingText(summary, model, explainIncomplete, card);
      assert.equal(text.includes("No falta ningún dato"), false, item.label);
      assert.equal(text.includes(item.phrase), true, item.label);
    }
  });

  test("un 429 en los dos nodos no es igual", async () => {
    const { read, model, summary, explainIncomplete } = await modules();
    const seen = await bothNodes(read, 429);
    assert.deepEqual(seen.hosts, ["solana-rpc.publicnode.com", "api.mainnet-beta.solana.com"]);
    const previous = { id: "1", note: "", card: filled(read, OTHER, WHEN, "1000") };
    const verdict = model.watchVerdict(previous, { card: seen.card });
    assert.equal(verdict.kind, "rechazada");
    assert.equal(String(verdict.kind) === "igual", false);
    assert.equal(model.readingComplete(seen.card), false);
    const text = missingText(summary, model, explainIncomplete, seen.card);
    assert.equal(text.includes("No falta ningún dato"), false);
    assert.match(text, /No se pudo/);
  });

  test("los dos nodos caídos no es igual", async () => {
    const { read, model, summary, explainIncomplete } = await modules();
    const seen = await bothNodes(read, 0);
    assert.deepEqual(seen.hosts, ["solana-rpc.publicnode.com", "api.mainnet-beta.solana.com"]);
    const previous = { id: "1", note: "", card: filled(read, OTHER, WHEN, "1000") };
    const verdict = model.watchVerdict(previous, { card: seen.card });
    assert.equal(verdict.kind, "rechazada");
    assert.equal(String(verdict.kind) === "igual", false);
    const text = missingText(summary, model, explainIncomplete, seen.card);
    assert.equal(text.includes("No falta ningún dato"), false);
    assert.match(text, /No se pudo/);
  });
});

function missingText(
  summary: { summaryFromCard: (card: Card) => { blocks: Array<{ id: string; items: Array<{ lead: { es: string } }> }> } },
  model: { readingGaps: (card: Card) => Array<{ es: string; en: string }> },
  explainIncomplete: (model: { blocks: Array<{ id: string; items: Array<{ lead: { es: string } }> }> }, gaps: Array<{ es: string; en: string }>) => { blocks: Array<{ id: string; items: Array<{ lead: { es: string } }> }> },
  card: Card,
) {
  const explained = explainIncomplete(summary.summaryFromCard(card), model.readingGaps(card));
  const block = explained.blocks.find((item) => item.id === "falta");
  return (block?.items || []).map((item) => item.lead.es).join(" ");
}

async function bothNodes(read: { clearBlockedMethods: () => void; readMint: (options: Record<string, unknown>) => Promise<{ ok: boolean; card: Card }> }, status: number) {
  read.clearBlockedMethods();
  const hosts: string[] = [];
  const result = await read.readMint({
    mint: OTHER,
    now: () => new Date(LATER),
    sleep: async () => undefined,
    mono: () => 0,
    minIntervalMs: 0,
    maxRetries: 0,
    transport: async (endpoint: string) => {
      hosts.push(new URL(endpoint).hostname);
      return { status, body: "" };
    },
  });
  assert.equal(result.ok, false);
  return { hosts, card: result.card };
}
