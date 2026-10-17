import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";
import { loadCards, loadFuentes } from "../mission/load.js";
import { repoRootFromMeta } from "../paths.js";
import { bannedHits } from "../text.js";
import { classifyAddress, emptyView, pendingView, reserveWhenLiveFails, type EvmExample } from "../verify/lookup.js";

const root = repoRootFromMeta(import.meta.url);
const cards = loadCards(root, loadFuentes(root));
// La lista real de copias EVM está vacía desde el 16-10-2026; la lectura 0x se prueba con un ejemplo.
const evm: EvmExample[] = [
  ...(JSON.parse(readFileSync(path.join(root, "verify/registry/clones.json"), "utf8")) as { evm: EvmExample[] }).evm,
  { chain: "eip155:5042", address: "0xc99056c762f0802e4154e6322bd71ae928857777", source: "ejemplo de prueba", verifiedOnChain: false },
];
// «official» es la ficha del registro curado (USDC); ORVUPI no tiene contrato.
const official = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const clone = "4XRbnGgay2XpqJ1F5jGPQ9pRh1JSX12RPCPJASMJU5JW";
const usdc = official;
const usdt = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB";
const wrappedSol = "So11111111111111111111111111111111111111112";

describe("lectura de una dirección", () => {
  test("el vacío, la dirección inválida y la espera no dejan la pantalla en blanco", () => {
    const empty = emptyView();
    assert.equal(empty.kind, "vacio");
    assert.equal(empty.title.es, "La lectura aparece aquí");
    assert.ok(empty.support.es.length > 0);
    const invalid = classifyAddress("<script>alert(1)</script>", cards, "lista");
    assert.equal(invalid.kind, "invalida");
    assert.equal(invalid.title.es, "Esta dirección no es válida");
    assert.match(invalid.support.es, /32 a 44/);
    assert.match(invalid.support.es, new RegExp(usdc));
    assert.match(invalid.support.en, /32 to 44/);
    assert.equal(invalid.mint, null);
    const spaces = classifyAddress("   hola mundo  ", cards, "lista");
    assert.equal(spaces.kind, "invalida");
    const pending = pendingView(`  ${official}  `);
    assert.equal(pending.kind, "comprobando");
    assert.equal(pending.title.es, "Comprobando esta dirección…");
    assert.equal(pending.mint, official);
    assert.equal(pending.support.es.includes("no se envía"), true);
  });

  test("la oficial, la copia y otra ficha no se confunden", () => {
    const known = classifyAddress(` \n${official}\n `, cards, "lista", evm);
    assert.equal(known.kind, "oficial");
    assert.equal(known.light, "ok");
    assert.equal(known.title.es, "Está en el registro curado");
    const officialCard = cards.find((card) => card.role === "registro");
    if (officialCard?.holdersNote && /no es un censo/i.test(officialCard.holdersNote)) {
      assert.match(known.partialNote?.es ?? "", /no es un censo/i);
    } else {
      assert.equal(known.partialNote?.es.includes("no se rellena con un cero"), true);
    }
    const copy = classifyAddress(clone, cards, "lista");
    assert.equal(copy.kind, "copia");
    assert.equal(copy.light, "atencion");
    assert.equal(copy.title.es, "Se parece a un token del registro, pero la dirección es otra");
    assert.equal(copy.lightLabel.es, "Se parece a un token del registro, pero la dirección es otra");
    assert.match(copy.support.es, /La única dirección oficial de ORVUPI está en orvupi.com\/token\./);
    assert.equal(copy.rows.find((row) => row.label.es === "Señal de copia")?.value.es, "Sí");
    const other = classifyAddress(usdt, cards, "lista");
    assert.equal(other.kind, "otra");
    assert.equal(other.title.es, "No está en el registro");
    assert.notEqual(other.light, "riesgo");
    const curve = other.rows.find((row) => row.label.es === "Avance de la curva");
    assert.equal(curve?.value.es, "No aplica");
    assert.equal(curve?.value.es.includes("0"), false);
  });

  test("una dirección válida parecida a la oficial no se presenta como comprobación fallida", () => {
    const near = `${official.slice(0, -1)}q`;
    const view = classifyAddress(near, cards, "lista", evm);
    assert.equal(view.kind, "sin_ficha");
    assert.equal(view.title.es, "No es un contrato de ORVUPI");
    assert.equal(view.title.en, "Not an ORVUPI contract");
    assert.equal(
      view.support.es,
      `No está en el registro. Esto no dice quién creó esta dirección ni con qué intención.`,
    );
    assert.equal(
      view.support.en,
      `It is not in the registry. This does not say who created this address or why.`,
    );
    assert.match(view.partialNote?.es ?? "", /No hay ficha de ejemplo/);
    assert.equal(view.compare?.official, official);
    const changed = view.compare?.marks.filter((mark) => mark.changed) ?? [];
    assert.equal(changed.length, 1);
    assert.equal(changed[0]?.char, "q");
    assert.equal(view.compare?.marks.at(-1)?.changed, true);
    assert.equal(view.compare?.marks[0]?.changed, false);
    const down = classifyAddress(near, cards, "caida", evm);
    assert.equal(down.title.es, "No es un contrato de ORVUPI");
    assert.notEqual(down.kind, "lectura_caida");
  });

  test("una dirección válida distinta, aunque no se parezca, no es la oficial", () => {
    const expectNotOfficial = (raw: string, marks: boolean) => {
      const view = classifyAddress(raw, cards, "lista", evm);
      assert.equal(view.title.es, "No es un contrato de ORVUPI", raw);
      assert.equal(
        view.support.es,
        `No está en el registro. Esto no dice quién creó esta dirección ni con qué intención.`,
      );
      assert.equal(
        view.support.en,
        `It is not in the registry. This does not say who created this address or why.`,
      );
      assert.equal(view.compare !== null, marks, raw);
      return view;
    };
    const chars = official.split("");
    for (let i = 8; i < 13; i += 1) chars[i] = chars[i] === "1" ? "2" : "1";
    const many = chars.join("");
    let diff = 0;
    for (let i = 0; i < many.length; i += 1) if (many[i] !== official[i]) diff += 1;
    assert.equal(diff, 5);
    expectNotOfficial(many, true);
    expectNotOfficial(official.slice(0, -1), false);
    const vanity = `EPjF${"1".repeat(official.length - 8)}Dt1v`;
    const vanityView = expectNotOfficial(vanity, true);
    assert.equal(vanity.startsWith("EPjF"), true);
    assert.equal(vanity.endsWith("Dt1v"), true);
    assert.equal(vanityView.compare?.marks.slice(0, 4).every((mark) => !mark.changed), true);
    assert.equal(vanityView.compare?.marks.slice(-4).every((mark) => !mark.changed), true);
    assert.ok((vanityView.compare?.marks.filter((mark) => mark.changed).length ?? 0) >= 5);
    const lower = expectNotOfficial(official.toLowerCase(), true);
    assert.match(lower.partialNote?.es ?? "", /distinguen mayúsculas/);
    assert.match(lower.partialNote?.en ?? "", /case-sensitive/);
    const exact = classifyAddress(official, cards, "lista", evm);
    assert.equal(exact.title.es, "Está en el registro curado");
    assert.equal(exact.support.es.includes("No es un contrato de ORVUPI"), false);
    const copy = classifyAddress(clone, cards, "lista", evm);
    assert.equal(copy.light, "atencion");
    assert.equal(copy.title.es, "Se parece a un token del registro, pero la dirección es otra");
    assert.equal(/copia|riesgo/i.test(copy.title.es), false);
    const other = classifyAddress(usdt, cards, "lista", evm);
    assert.equal(other.title.es, "No está en el registro");
    const far = classifyAddress(wrappedSol, cards, "caida", evm);
    assert.equal(far.title.es, "No es un contrato de ORVUPI");
    assert.notEqual(far.kind, "lectura_caida");
  });

  test("con la CA oficial y los RPC caídos la ficha no sale en verde", () => {
    const card = classifyAddress(official, cards, "lista", evm);
    assert.equal(card.light, "ok");
    assert.equal(card.title.es, "Está en el registro curado");
    const down = reserveWhenLiveFails(card);
    assert.equal(down.kind, "oficial");
    assert.equal(down.mint, official);
    assert.equal(down.light, "neutro");
    assert.notEqual(down.light, "ok");
    assert.equal(down.title.es, "No se pudo comprobar en directo");
    assert.equal(down.title.en, "Could not check live");
    assert.equal(down.lightLabel.es, "No se pudo comprobar en directo");
    assert.equal(down.lightLabel.en, "Could not check live");
    assert.match(down.partialNote?.es ?? "", /Es la ficha del 2026-10-16/);
    assert.match(down.partialNote?.en ?? "", /2026-10-16 card/);
    assert.equal((down.partialNote?.es ?? "").includes("Está en el registro curado"), false);
    assert.ok(down.rows.length > 0);
    assert.match(down.partialNote?.es ?? "", /censo|no está|no se rellena/);
    const cloneCard = classifyAddress(clone, cards, "lista", evm);
    const cloneDown = reserveWhenLiveFails(cloneCard);
    assert.equal(cloneDown.title.es, "Se parece a un token del registro, pero la dirección es otra");
    assert.equal(cloneDown.light, "atencion");
  });

  test("con el RPC caído un clon del registro sale en ámbar y no en rojo", () => {
    const down = classifyAddress(clone, cards, "caida", evm);
    assert.notEqual(down.light, "riesgo");
    assert.equal(/copia|riesgo/i.test(down.title.es), false);
    assert.equal((down.support.es + (down.partialNote?.es ?? "")).includes("no consulta la red"), false);
    const reserve = classifyAddress(clone, cards, "lista", evm);
    assert.equal(reserve.kind, "copia");
    assert.equal(reserve.light, "atencion");
    assert.equal(reserve.title.es, "Se parece a un token del registro, pero la dirección es otra");
    assert.equal(reserve.title.en, "Looks like a token in the registry, but the address is different");
    assert.match(reserve.support.es, /Esto no dice quién lo creó ni con qué intención/);
    assert.equal(/copia|riesgo/i.test(reserve.title.es), false);
  });

  test("sin ficha conocida y con la lectura caída no se inventa un resultado", () => {
    const missing = classifyAddress(wrappedSol, cards, "lista");
    assert.equal(missing.kind, "sin_ficha");
    assert.equal(missing.title.es, "No es un contrato de ORVUPI");
    assert.equal(
      missing.partialNote?.es,
      "No hay ficha de ejemplo. La lista no es completa y no hay lectura en directo de esta dirección, así que no rellena el hueco.",
    );
    assert.equal(
      missing.partialNote?.en,
      "There is no example card. The list is not complete and there is no live reading of this address, so it does not fill the gap.",
    );
    assert.equal((missing.partialNote?.es ?? "").includes("no consulta la red"), false);
    assert.equal(missing.rows.length, 0);
    const down = classifyAddress(official, cards, "caida");
    // Sin contrato ORVUPI no hay dirección oficial: con la red caída, la del token anterior no se presenta como oficial.
    assert.equal(down.kind, "sin_ficha");
    assert.notEqual(down.kind, "oficial");
    const stillInvalid = classifyAddress("no-es-una-direccion", [], "caida");
    assert.equal(stillInvalid.kind, "invalida");
  });

  test("cualquier dirección 0x dice que el oficial solo existe en Solana", () => {
    const known = classifyAddress("0xC99056C762F0802e4154E6322bd71ae928857777", cards, "lista", evm);
    assert.equal(known.kind, "evm");
    assert.equal(known.title.es, "Copia conocida");
    assert.match(known.support.es, /La única dirección oficial de ORVUPI está en orvupi.com\/token/);
    assert.match(known.support.es, /sin verificar en la cadena/);
    const same = classifyAddress("0xc99056c762f0802e4154e6322bd71ae928857777", cards, "caida", evm);
    assert.equal(same.title.es, "Copia conocida");
    const other = classifyAddress("0x0000000000000000000000000000000000000001", cards, "lista", evm);
    assert.equal(other.kind, "evm");
    assert.equal(other.title.es, "La única dirección oficial de ORVUPI está en orvupi.com/token");
    assert.equal(other.title.es.includes("Copia conocida"), false);
    const loose = classifyAddress("0xhola", cards, "lista", evm);
    assert.equal(loose.title.es, "La única dirección oficial de ORVUPI está en orvupi.com/token");
  });

  test("el texto de la lectura no promete rentabilidad ni urgencia", () => {
    const views = [
      emptyView(),
      pendingView(official),
      classifyAddress(official, cards, "lista"),
      classifyAddress(clone, cards, "lista"),
      classifyAddress(usdt, cards, "lista"),
      classifyAddress(wrappedSol, cards, "lista"),
      classifyAddress(official, cards, "caida"),
      classifyAddress("???", cards, "lista"),
      classifyAddress("0xC99056C762F0802e4154E6322bd71ae928857777", cards, "lista", evm),
      classifyAddress("0x1111111111111111111111111111111111111111", cards, "lista", evm),
      classifyAddress(`${official.slice(0, -1)}q`, cards, "lista", evm),
    ];
    assert.deepEqual(bannedHits(views), []);
  });
});
