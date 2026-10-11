import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";
import { READONLY_LINE } from "../copy.js";
import { ENTENDER_BUTTON, ENTENDER_LINKS } from "../mission/entender-links.js";
import { answer, initialProgress, lessonStorageKey } from "../mission/engine.js";
import { loadCards, loadFuentes, loadGlossary, loadJson, loadLessons } from "../mission/load.js";
import { validateLessons } from "../mission/validate.js";
import { repoRootFromMeta } from "../paths.js";
import { bannedHits } from "../text.js";
import { buildOutputs } from "../tools/build-pages.js";

const root = repoRootFromMeta(import.meta.url);

type Fact = { value?: unknown; status?: string; source?: { method?: string; detail?: string } | null; note?: string | null };

function readEntender(source: string): Array<{ id: string; href: string; es: string; en: string }> {
  const out: Array<{ id: string; href: string; es: string; en: string }> = [];
  const re =
    /id:\s*"([^"]+)"[\s\S]*?href:\s*"([^"]+)"[\s\S]*?explain:\s*\{\s*es:\s*"((?:\\.|[^"\\])*)",\s*en:\s*"((?:\\.|[^"\\])*)"/g;
  for (const match of source.matchAll(re)) {
    out.push({
      id: match[1] ?? "",
      href: match[2] ?? "",
      es: JSON.parse(`"${match[3] ?? ""}"`) as string,
      en: JSON.parse(`"${match[4] ?? ""}"`) as string,
    });
  }
  return out;
}

describe("lecciones cortas", () => {
  const lessons = loadLessons(root);
  const glossary = loadGlossary(root);
  const cards = loadCards(root, loadFuentes(root));
  const byId = new Map(lessons.map((lesson) => [lesson.id, lesson]));
  const official = JSON.parse(
    readFileSync(path.join(root, "verify/examples/2026-10-09/TNWwnzecb37272ZoySDE6D2UcmqNnU12EqtycNSpump.json"), "utf8"),
  ) as {
    permissions: { mintAuthority: Fact; freezeAuthority: Fact; metaplexUpdateAuthority: Fact };
    distribution: { sample: Fact & { value: Array<{ owner: string; percent: string; label: string }> | null }; largestNonTechnicalPercent: Fact };
    market: { complete: Fact };
  };
  const usdc = JSON.parse(
    readFileSync(path.join(root, "verify/examples/2026-10-09/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v.json"), "utf8"),
  ) as {
    permissions: { mintAuthority: Fact & { value: { state: string; address: string } }; freezeAuthority: Fact & { value: { state: string; address: string } } };
    distribution: { sample: Fact };
  };

  test("son tres, válidas y sin promesa", () => {
    assert.deepEqual(validateLessons(lessons, glossary, cards), []);
    assert.deepEqual(
      lessons.map((lesson) => lesson.id),
      ["leccion-permisos", "leccion-reparto", "leccion-huecos"],
    );
    assert.deepEqual(bannedHits(lessons), []);
    for (const lesson of lessons) {
      assert.equal(lesson.cardDate, "2026-10-09");
      assert.ok(lesson.entender.length >= 1);
      assert.match(lesson.closing.es, /certificado/i);
      assert.match(lesson.closing.en, /certificate/i);
      for (const step of lesson.steps) {
        assert.equal(step.kind, "check");
        assert.ok(step.whyRight.es.length > 0 && step.whyRight.en.length > 0);
        for (const option of step.options) {
          if (option.id === step.correct) continue;
          assert.ok(step.whyWrong[option.id]?.es);
          assert.ok(step.whyWrong[option.id]?.en);
        }
      }
    }
  });

  test("el enlace es el de Entender este resultado en Verify", () => {
    const live = readEntender(readFileSync(path.join(root, "web/v2/shared/entender.js"), "utf8"));
    assert.equal(live.length, ENTENDER_LINKS.length);
    for (const link of ENTENDER_LINKS) {
      const found = live.find((item) => item.id === link.id);
      assert.ok(found, link.id);
      assert.equal(found.href, link.href);
      assert.equal(found.es, link.explain.es);
      assert.equal(found.en, link.explain.en);
    }
    assert.equal(ENTENDER_BUTTON.es, "Entender este resultado");
    assert.equal(ENTENDER_BUTTON.en, "Understand this result");
    assert.deepEqual(byId.get("leccion-permisos")?.entender, ["permisos"]);
    assert.deepEqual(byId.get("leccion-reparto")?.entender, ["distribucion"]);
    assert.deepEqual(byId.get("leccion-huecos")?.entender, ["distribucion", "metadatos"]);
  });

  test("los permisos salen de las fichas y no acusan", () => {
    const lesson = byId.get("leccion-permisos");
    assert.ok(lesson);
    const step = lesson.steps[0];
    assert.equal(step?.correct, "contexto");
    assert.equal(usdc.permissions.mintAuthority.value.state, "activa");
    assert.equal(usdc.permissions.mintAuthority.value.address, "BJE5MMbqXjVwjAF7oxwPYXnTXDyspzZyt4vwenNw5ruG");
    assert.equal(usdc.permissions.freezeAuthority.value.state, "activa");
    assert.equal(usdc.permissions.freezeAuthority.value.address, "7dGbd2QZcCKcTndnHcTL8q7SMVXAkp688NTQYwrRCrar");
    assert.equal((official.permissions.mintAuthority.value as { state: string }).state, "revocada");
    assert.equal((official.permissions.freezeAuthority.value as { state: string }).state, "revocada");
    assert.match(step?.whyRight.es ?? "", /BJE5MMbqXjVwjAF7oxwPYXnTXDyspzZyt4vwenNw5ruG/);
    assert.match(step?.whyRight.es ?? "", /no acusa/i);
    assert.match(step?.whyRight.en ?? "", /does not accuse/i);
    assert.match(lesson.steps[1]?.whyRight.es ?? "", /no es una garantía/i);
    assert.equal((lesson.steps[1]?.whyRight.es ?? "").toLowerCase().includes("seguro comprar"), false);
  });

  test("el reparto nombra la curva, la creadora y la cuenta personal", () => {
    const lesson = byId.get("leccion-reparto");
    assert.ok(lesson);
    const sample = official.distribution.sample.value ?? [];
    assert.equal(sample[0]?.owner, "3shQFExQ3rpFL6GaXPRQNTMYazVHmTvRfuazfv62toAE");
    assert.equal(sample[0]?.percent, "98.6122");
    assert.match(sample[0]?.label ?? "", /curva/);
    assert.equal(sample[1]?.owner, "77RKUqMprQHDSkhFBpC1REU1kE9aM1uw189orHo7wypD");
    assert.equal(sample[1]?.percent, "0.5272");
    assert.equal(sample[2]?.owner, "2fS12sTD4TNEEE9MoCEt19brV41UjGdAnaNaxWcmiWvX");
    assert.equal(sample[2]?.percent, "0.8604");
    assert.equal(official.market.complete.value, false);
    const text = JSON.stringify(lesson);
    assert.match(text, /98,6122 %/);
    assert.match(text, /98\.6122%/);
    assert.match(text, /3shQFExQ3rpFL6GaXPRQNTMYazVHmTvRfuazfv62toAE/);
    assert.match(text, /2fS12sTD4TNEEE9MoCEt19brV41UjGdAnaNaxWcmiWvX/);
    assert.match(text, /77RKUqMprQHDSkhFBpC1REU1kE9aM1uw189orHo7wypD/);
    assert.equal(lesson.steps[0]?.correct, "tecnica");
    assert.match(lesson.steps[0]?.whyRight.es ?? "", /no es la de una persona|no la de una persona|no es un censo/i);
    assert.equal(lesson.steps[1]?.correct, "no-censo");
    assert.equal(text.toLowerCase().includes("wallet"), false);
  });

  test("separa consulta fallida, ausencia y dato no pedido", () => {
    const lesson = byId.get("leccion-huecos");
    assert.ok(lesson);
    assert.equal(usdc.distribution.sample.status, "no_disponible");
    assert.equal(usdc.distribution.sample.source?.method, "getTokenLargestAccounts");
    assert.equal(usdc.distribution.sample.source?.detail, "HTTP 429");
    assert.equal(official.permissions.metaplexUpdateAuthority.status, "verificado");
    assert.equal(official.permissions.metaplexUpdateAuthority.value, null);
    assert.match(official.permissions.metaplexUpdateAuthority.note ?? "", /No hay cuenta de metadatos/);
    assert.equal(official.distribution.sample.source?.method, "getMultipleAccounts");
    assert.equal(official.distribution.largestNonTechnicalPercent.source, null);
    assert.match(official.distribution.sample.source?.detail ?? "", /No sustituye a getTokenLargestAccounts/);
    assert.equal(lesson.steps[0]?.correct, "fallo");
    assert.equal(lesson.steps[1]?.correct, "ausente");
    assert.equal(lesson.steps[2]?.correct, "no-pedido");
    assert.match(lesson.steps[0]?.whyRight.es ?? "", /HTTP 429/);
    assert.match(lesson.steps[1]?.whyRight.es ?? "", /verificado/);
    assert.match(lesson.steps[2]?.whyRight.es ?? "", /getMultipleAccounts/);
    assert.match(lesson.steps[2]?.whyWrong.fallo?.es ?? "", /HTTP 429/);
  });

  test("una respuesta incorrecta se explica y el recorrido correcto termina", () => {
    for (const lesson of lessons) {
      assert.equal(lessonStorageKey(lesson.id), `stubx-lab-${lesson.id}`);
      let progress = initialProgress(lesson, "es");
      const first = lesson.steps[0];
      assert.ok(first);
      const wrong = first.options.find((option) => option.id !== first.correct);
      assert.ok(wrong);
      const grade = answer(lesson, progress, first.id, wrong.id);
      assert.equal(grade.correct, false);
      assert.equal(grade.applied, true);
      assert.ok(grade.explanation?.es && grade.explanation.en);
      assert.equal(grade.progress.completed, false);
      const skipped = answer(lesson, progress, lesson.steps[1]?.id ?? "", lesson.steps[1]?.correct ?? "");
      assert.equal(skipped.code, "paso_no_actual");
      progress = initialProgress(lesson, "en");
      for (const step of lesson.steps) {
        const next = answer(lesson, progress, step.id, step.correct);
        assert.equal(next.correct, true, `${lesson.id}/${step.id}`);
        progress = next.progress;
      }
      assert.equal(progress.completed, true);
      assert.equal(progress.solved.length, lesson.steps.length);
    }
  });

  test("la página muestra las tres lecciones y el aviso", () => {
    const pages = buildOutputs(root);
    const lab = pages.find((item) => item.rel.endsWith("lab/index.html"));
    assert.ok(lab);
    assert.match(lab.body, /id="leccion-permisos"/);
    assert.match(lab.body, /id="leccion-reparto"/);
    assert.match(lab.body, /id="leccion-huecos"/);
    assert.match(lab.body, /Entender este resultado/);
    assert.match(lab.body, /Understand this result/);
    assert.match(lab.body, /href="\/aprender\/#guia-permisos"/);
    assert.match(lab.body, /href="\/aprender\/#censo"/);
    assert.match(lab.body, /href="\/aprender\/#metadatos-mutables"/);
    const permisos = lab.body.slice(lab.body.indexOf('id="leccion-permisos"'), lab.body.indexOf('id="leccion-reparto"'));
    const huecos = lab.body.slice(lab.body.indexOf('id="leccion-huecos"'), lab.body.indexOf('id="mision-titulo"'));
    assert.match(permisos, /<a class="abrir-entender" href="\/aprender\/#guia-permisos">/);
    assert.match(huecos, /href="\/aprender\/#censo"/);
    assert.match(huecos, /href="\/aprender\/#metadatos-mutables"/);
    assert.equal(huecos.includes('<a class="abrir-entender"'), false);
    assert.match(lab.body, /data-leccion="leccion-permisos"/);
    assert.match(lab.body, /Cómo detectar un token clon en 5 pasos/);
    assert.match(lab.body, new RegExp(READONLY_LINE.es.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.equal(lab.body.includes("Cripto de alto riesgo · Puedes perderlo todo"), false);
    assert.equal(lab.body.includes("No es consejo de inversión"), false);
    assert.equal(lab.body.includes("Not investment advice"), false);
    assert.match(lab.body, /2026-10-09/);
    const missionJs = pages.find((item) => item.rel.endsWith("assets/mission.js"));
    assert.ok(missionJs);
    assert.match(missionJs.body, /leccion-permisos/);
    assert.match(missionJs.body, /function lessonStorageKey/);
    assert.match(missionJs.body, /leccion-huecos/);
    assert.match(missionJs.body, /panel\.hidden = true/);
    assert.match(missionJs.body, /aria-expanded/);
    assert.equal(missionJs.body.includes('class: "abrir-entender", href: firstHref'), false);
    assert.equal(lessonStorageKey("leccion-huecos"), "stubx-lab-leccion-huecos");
    assert.equal(JSON.stringify(loadJson(path.join(root, "lab/mission/lecciones.json"))).toLowerCase().includes("wallet"), false);
  });
});
