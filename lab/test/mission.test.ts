import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";
import { UNKNOWN_LINE } from "../copy.js";
import { answer, checkCount, initialProgress, parseProgress, PROGRESS_ECONOMIC_VALUE, PROGRESS_IS_CERTIFICATE, resetProgress } from "../mission/engine.js";
import { loadCards, loadFuentes, loadGlossary, loadJson, loadMission, shownFact, summarizeReport } from "../mission/load.js";
import { validateMission } from "../mission/validate.js";
import { repoRootFromMeta } from "../paths.js";
import { changelogHeadings, listTestFiles, loadBoard } from "../tablero/collect.js";
import { bannedHits, splitBilingualMarkdown } from "../text.js";

const root = repoRootFromMeta(import.meta.url);

describe("misión 1", () => {
  const fuentes = loadFuentes(root);
  const cards = loadCards(root, fuentes);
  const mission = loadMission(root);
  const glossary = loadGlossary(root);
  const byMint = new Map(cards.map((card) => [card.mint, card]));

  test("tiene cinco pasos y un caso nuevo al final", () => {
    assert.equal(mission.steps.length, 5);
    assert.equal(checkCount(mission), 4);
    assert.equal(mission.steps.at(-1)?.kind, "comprehension");
    assert.deepEqual(mission.steps.at(-1)?.cards, []);
    assert.deepEqual(validateMission(mission, glossary, cards), []);
  });

  test("el mint correcto de la primera comprobación es el del registro curado", () => {
    const canonical = loadJson(path.join(root, "verify/registry/canonical.json")) as { tokens: Array<{ mint: string }> };
    const official = cards.find((card) => card.role === "registro");
    const first = mission.steps[0];
    const correct = first?.options.find((option) => option.id === first.correct);
    assert.ok(official);
    assert.equal(official.mint, canonical.tokens[0]?.mint);
    assert.equal(correct?.mint, official.mint);
    assert.equal(
      first?.whyRight.es,
      "Solo esta dirección está en el registro del 2026-10-08. Las otras se llaman parecido y la ficha indica que se parecen a STUBX pero no son la CA oficial. Eso no dice quién las creó ni con qué intención.",
    );
    assert.equal(
      first?.whyRight.en,
      "Only this address is in the 2026-10-08 registry. The others have a similar name and the card indicates that they look like STUBX but they are not the official CA. That does not say who created them or why.",
    );
    assert.equal(first?.whyRight.es.includes("posible copia"), false);
    assert.equal(first?.whyRight.en.toLowerCase().includes("possible copy"), false);
    assert.equal(official.inRegistry, true);
    assert.equal(official.impersonation, false);
  });

  test("los clones son señal de suplantación y USDC no", () => {
    const clones = cards.filter((card) => card.role === "clon");
    assert.equal(clones.length, 5);
    assert.ok(clones.some((card) => card.mint === "ERYyyaE2Y2GuKB28YbC2w1nCuQ5ENQ89LR44kicvpump"));
    assert.ok(clones.some((card) => card.mint === "FMNb4CR8ksibmgY7Ztei6BWcZXi3WHcVeJhYb9TNpump"));
    for (const card of clones) {
      assert.equal(card.inRegistry, false);
      assert.equal(card.impersonation, true);
      assert.equal(card.mintAuthority.state, "revocada");
      assert.equal(card.mintAuthority.status, "verificado");
      assert.equal(card.curveProgress, "0.00");
      assert.equal(card.curveProgressStatus, "inferido");
      assert.equal(shownFact(card.curveProgressStatus, card.curveProgress), "0.00");
    }
    const usdc = cards.find((card) => card.role === "contraste");
    assert.ok(usdc);
    assert.equal(usdc.impersonation, false);
    assert.equal(usdc.mintAuthority.state, "activa");
    assert.equal(usdc.freezeAuthority.state, "activa");
    assert.equal(usdc.metadataReading, "mutables");
    assert.equal(usdc.curvePresent, false);
    assert.equal(usdc.curveProgressStatus, "no_aplica");
    assert.equal(shownFact(usdc.curveProgressStatus, "0"), "no_aplica");
  });

  test("lo no disponible no se muestra como cero ni como revocada", () => {
    const batch2026 = new Set([
      "Hhq4ffySVX3UQqSowjhP1Lwa8YuJDf7iH2hYWvVHTuEf",
      "DjEjb6bxQ3Hjej9CzUAVeRqyt7k1tevHgcS37t41PUhQ",
      "3Zi6p6wzYZYKyuHdBhsDfb2pRR7XTfTfLKkXL7rwpump",
    ]);
    const official = cards.find((card) => card.role === "registro");
    assert.equal(official?.holdersStatus, "verificado");
    assert.match(official?.holdersNote ?? "", /no es un censo/i);
    for (const card of cards) {
      if (batch2026.has(card.mint)) {
        assert.equal(card.holdersStatus, "no_disponible");
        assert.equal(shownFact(card.holdersStatus, "0"), "no_disponible");
      }
      if (card.holdersStatus === "no_disponible") {
        assert.equal(shownFact(card.holdersStatus, "0"), "no_disponible");
      }
    }
    const missing = summarizeReport(
      {
        tool: "stubx-verify",
        mint: "MintDePrueba",
        permissions: { mintAuthority: { value: null, status: "no_disponible", note: null } },
      },
      "contraste",
      { es: "Contraste de prueba", en: "Test contrast" },
    );
    assert.equal(missing.mintAuthority.status, "no_disponible");
    assert.equal(missing.mintAuthority.state, "desconocido");
    assert.notEqual(missing.mintAuthority.state, "revocada");
    assert.equal(missing.metadataReading, "desconocido");
    assert.equal(missing.impersonation, null);
  });

  test("el avance del registro es inferido y distinto de cero", () => {
    const official = cards.find((card) => card.role === "registro");
    assert.equal(official?.curveProgress, "1.74");
    assert.equal(official?.curveProgressStatus, "inferido");
    assert.equal(official?.metadataReading, "no_mutables_en_fuentes");
    assert.equal(official?.partial, true);
  });

  test("una respuesta incorrecta se explica y no cierra la misión", () => {
    let progress = initialProgress(mission, "es");
    const first = mission.steps[0];
    assert.ok(first);
    const wrong = first.options.find((option) => option.id !== first.correct);
    assert.ok(wrong);
    const grade = answer(mission, progress, first.id, wrong.id);
    progress = grade.progress;
    assert.equal(grade.applied, true);
    assert.equal(grade.correct, false);
    assert.equal(grade.code, "incorrecto");
    assert.ok(grade.explanation?.es);
    assert.equal(progress.completed, false);
    assert.deepEqual(progress.solved, []);
    assert.equal(progress.attempts[first.id], 1);
    const again = answer(mission, progress, first.id, first.correct);
    assert.equal(again.correct, true);
    assert.equal(again.progress.attempts[first.id], 1);
    assert.equal(again.progress.solved[0], first.id);
  });

  test("no se puede saltar un paso ni marcar la misión a mano", () => {
    const progress = initialProgress(mission, "en");
    const later = mission.steps[1];
    assert.ok(later);
    const skipped = answer(mission, progress, later.id, later.correct);
    assert.equal(skipped.applied, false);
    assert.equal(skipped.code, "paso_no_actual");
    assert.equal(parseProgress({ ...progress, completed: true, solved: [] }, mission), null);
    assert.equal(parseProgress({ ...progress, solved: [later.id], completed: false }, mission), null);
  });

  test("el recorrido correcto termina sin valor económico", () => {
    let progress = initialProgress(mission, "es");
    for (const step of mission.steps) {
      const grade = answer(mission, progress, step.id, step.correct);
      assert.equal(grade.correct, true, step.id);
      progress = grade.progress;
    }
    assert.equal(progress.completed, true);
    assert.equal(progress.solved.length, mission.steps.length);
    const closed = answer(mission, progress, mission.steps[0]?.id ?? "", mission.steps[0]?.correct ?? "");
    assert.equal(closed.code, "ya_completa");
    assert.equal(PROGRESS_ECONOMIC_VALUE, 0);
    assert.equal(PROGRESS_IS_CERTIFICATE, false);
    const restored = parseProgress(JSON.parse(JSON.stringify(progress)), mission);
    assert.deepEqual(restored, progress);
    assert.equal(resetProgress(mission, "en").completed, false);
  });

  test("cada opción incorrecta tiene explicación en los dos idiomas", () => {
    for (const step of mission.steps) {
      assert.ok(step.prompt.es.length > 0 && step.prompt.es.length <= 120);
      assert.ok(step.prompt.en.length <= 140);
      assert.ok(step.prompt.en.length > 0);
      assert.ok(step.whyRight.es.length > 0);
      assert.ok(step.whyRight.en.length > 0);
      for (const option of step.options) {
        if (option.id === step.correct) continue;
        const line = step.whyWrong[option.id];
        assert.ok(line?.es);
        assert.ok(line?.en);
      }
    }
  });

  test("la quinta comprobación usa el clon con avance 0,00", () => {
    const step = mission.steps.find((item) => item.id === "curva");
    assert.ok(step);
    const clone = step.cards
      .map((mint) => byMint.get(mint))
      .find((card) => card?.role === "clon");
    assert.equal(clone?.curveProgress, "0.00");
    assert.equal(step.whyRight.es.includes("793100000000000"), false);
    assert.equal(step.whyRight.en.includes("793100000000000"), false);
    assert.equal(step.prompt.es.includes("793100000000000"), false);
    assert.match(step.whyRight.es, /no atribuye intención/i);
    assert.match(step.whyRight.es, /Detalles/);
    assert.ok(step.glossary.includes("curva-pump"));
    assert.ok(step.glossary.includes("reserva-real"));
    assert.ok(step.glossary.includes("suplantacion"));
  });

  test("cada pregunta lleva una frase llana y el glosario del paso", () => {
    const emision = mission.steps.find((item) => item.id === "emision");
    assert.ok(emision);
    assert.match(emision.guide.es, /Permiso cerrado/);
    assert.match(emision.guide.en, /Closed permission/);
    assert.equal(emision.prompt.es.includes("no dice cuál es la oficial"), false);
    assert.ok(emision.glossary.includes("autoridad-emision"));
    assert.ok(emision.glossary.includes("autoridad-congelacion"));
    for (const step of mission.steps) {
      assert.ok(step.guide.es.length >= 40, step.id);
      assert.ok(step.guide.en.length >= 40, step.id);
      assert.ok(step.glossary.length >= 1, step.id);
    }
  });
});

describe("biblioteca", () => {
  const glossary = loadGlossary(root);

  test("cubre los términos de la misión en español e inglés", () => {
    const needed = [
      "direccion",
      "registro",
      "autoridad-emision",
      "autoridad-congelacion",
      "metadatos-mutables",
      "desconocido",
      "curva-pump",
      "reserva-real",
      "reserva-virtual",
      "suplantacion",
      "titular",
      "ficha",
      "censo",
      "comision",
    ];
    const ids = new Set(glossary.entries.map((entry) => entry.id));
    for (const id of needed) {
      const entry = glossary.entries.find((item) => item.id === id);
      assert.ok(ids.has(id), id);
      assert.ok(entry?.means.es);
      assert.ok(entry?.means.en);
      assert.ok(entry?.doesNotConclude.en);
    }
    assert.equal(glossary.sourceLanguage, "es");
  });

  test("las tres guías tienen el mismo par de idiomas", () => {
    const manifest = loadJson(path.join(root, "lab/library/guides.json")) as {
      guides: Array<{ id: string; file: string }>;
    };
    assert.deepEqual(manifest.guides.map((guide) => guide.id), [
      "identificar-el-token",
      "interpretar-permisos",
      "comprender-liquidez",
    ]);
    for (const guide of manifest.guides) {
      const source = readFileSync(path.join(root, "lab/library/guides", guide.file), "utf8");
      const blocks = splitBilingualMarkdown(source);
      assert.ok(blocks, guide.id);
      assert.match(blocks.es, /2026-10-08/);
      assert.match(blocks.en, /2026-10-08/);
    }
  });

  test("el inglés queda pendiente de revisión humana", () => {
    const revision = loadJson(path.join(root, "lab/library/revision.json")) as { enStatus: string; reviewer: null };
    assert.match(revision.enStatus, /pendiente/i);
    assert.equal(revision.reviewer, null);
  });

  test("el texto no promete rentabilidad, premios ni urgencia", () => {
    const mission = loadMission(root);
    const guides = ["identificar-el-token.md", "interpretar-permisos.md", "comprender-liquidez.md"]
      .map((file) => readFileSync(path.join(root, "lab/library/guides", file), "utf8"))
      .join("\n");
    assert.deepEqual(bannedHits({ mission, glossary, guides, disclaimer: "" }), []);
    assert.match(UNKNOWN_LINE.es, /desconocido/);
  });
});

describe("tablero", () => {
  test("separa idea, revisión y web, sin fechas prometidas", () => {
    const board = loadBoard(root);
    const byId = new Map(board.tasks.map((task) => [task.id, task]));
    assert.equal(byId.get("VERIFY")?.status, "en_revision");
    assert.equal(byId.get("U01")?.status, "en_revision");
    assert.equal(byId.get("U03")?.status, "en_revision");
    assert.equal(byId.get("U06")?.status, "en_revision");
    assert.equal(byId.get("U08")?.status, "en_curso");
    assert.equal(byId.get("U02")?.status, "en_revision");
    assert.ok((byId.get("U02")?.evidence.length ?? 0) > 0);
    assert.equal(byId.get("U04")?.status, "en_revision");
    assert.ok((byId.get("U04")?.evidence.length ?? 0) > 0);
    assert.equal(byId.get("U04")?.webPublished, true);
    assert.match(byId.get("U04")?.block?.es ?? "", /Publicada en stubxai.com\/contribuir el 2026-10-10/);
    assert.equal(byId.get("U07")?.status, "en_revision");
    assert.ok((byId.get("U07")?.evidence.length ?? 0) > 0);
    assert.equal(byId.get("U07")?.webPublished, true);
    assert.match(byId.get("U07")?.block?.es ?? "", /Ejemplo educativo fijo, revisado por Legal/);
    assert.equal(byId.get("U09")?.status, "en_revision");
    assert.equal(byId.get("U09")?.webPublished, true);
    assert.match(byId.get("U09")?.block?.es ?? "", /Publicada en stubxai.com\/pares el 2026-10-10/);
    assert.ok((byId.get("U09")?.evidence.length ?? 0) > 0);
    assert.equal(byId.get("U05")?.status, "en_revision");
    assert.equal(byId.get("U05")?.webPublished, true);
    assert.match(byId.get("U05")?.block?.es ?? "", /Publicado en stubxai.com\/cuaderno el 2026-10-10/);
    assert.ok((byId.get("U05")?.evidence.length ?? 0) > 0);
    const onWeb = new Set(["VERIFY", "U01", "U02", "U03", "U04", "U05", "U06", "U07", "U09"]);
    for (const task of board.tasks) {
      assert.equal(task.webPublished, onWeb.has(task.id), task.id);
      assert.ok(task.history.length > 0, task.id);
    }
    assert.equal(board.tasks.some((task) => task.status === "publicada"), false);
    const headings = changelogHeadings(readFileSync(path.join(root, "CHANGELOG.md"), "utf8"));
    assert.ok(headings.some((line) => line.includes("Verify")));
    assert.ok(listTestFiles(root).includes("lab/test/mission.test.ts"));
    assert.deepEqual(bannedHits(board), []);
  });
});
