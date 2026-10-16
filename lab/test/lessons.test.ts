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

function labWordHits(html: string): string[] {
  const hits: string[] = [];
  const re = /verified|verificad/gi;
  for (const match of html.matchAll(re)) {
    const at = match.index ?? 0;
    hits.push(html.slice(Math.max(0, at - 24), at + match[0].length + 24).replace(/\s+/g, " "));
  }
  return hits;
}

describe("lecciones cortas", () => {
  const lessons = loadLessons(root);
  const glossary = loadGlossary(root);
  const cards = loadCards(root, loadFuentes(root));
  const byId = new Map(lessons.map((lesson) => [lesson.id, lesson]));
  const dir = path.join(root, "verify/examples/2026-10-16");
  type Report = {
    permissions: {
      mintAuthority: Fact & { value: { state: string; address: string | null } };
      freezeAuthority: Fact & { value: { state: string; address: string | null } };
      metaplexUpdateAuthority: Fact;
    };
    distribution: { sample: Fact };
  };
  const readReport = (mint: string) => JSON.parse(readFileSync(path.join(dir, `${mint}.json`), "utf8")) as Report;
  const usdc = readReport("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
  const closed = readReport("5vJmAfBjsS6wEHcgQGNm69P3fbyPmUU1dVfE5j1rraVZ");
  const freeze = readReport("H5b7sHTqr7WJqL9X4io8VeTBfePSyv85wEBnKNaZKV9R");

  test("son tres, válidas y sin promesa", () => {
    assert.deepEqual(validateLessons(lessons, glossary, cards), []);
    assert.deepEqual(
      lessons.map((lesson) => lesson.id),
      ["leccion-permisos", "leccion-reparto", "leccion-huecos"],
    );
    assert.deepEqual(bannedHits(lessons), []);
    for (const lesson of lessons) {
      assert.equal(lesson.cardDate, "2026-10-16");
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
    const permisos = ENTENDER_LINKS.find((item) => item.id === "permisos");
    const metadatos = ENTENDER_LINKS.find((item) => item.id === "metadatos");
    assert.match(permisos?.explain.en ?? "", /the mint permission can create more tokens/);
    assert.equal((permisos?.explain.en ?? "").includes("one of them"), false);
    assert.match(metadatos?.explain.es ?? "", /puede que mañana el nombre o el símbolo ya no sean los de esta lectura/);
    assert.equal((metadatos?.explain.es ?? "").includes("pueden dejar de ser los de mañana"), false);
    const verifyUi = readFileSync(path.join(root, "lab/client/verify-ui.js"), "utf8");
    assert.match(verifyUi, /the mint permission can create more tokens/);
    assert.match(verifyUi, /puede que mañana el nombre o el símbolo ya no sean los de esta lectura/);
    assert.equal(verifyUi.includes("one of them can create more tokens"), false);
    assert.equal(verifyUi.includes("pueden dejar de ser los de mañana"), false);
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
    assert.equal(closed.permissions.mintAuthority.value.state, "revocada");
    assert.equal(closed.permissions.freezeAuthority.value.state, "revocada");
    assert.match(step?.whyRight.es ?? "", /BJE5MMbqXjVwjAF7oxwPYXnTXDyspzZyt4vwenNw5ruG/);
    assert.match(step?.whyRight.es ?? "", /no es una acusación/i);
    assert.match(step?.whyRight.en ?? "", /not an accusation/i);
    assert.match(lesson.steps[1]?.whyRight.es ?? "", /no es una garantía/i);
    assert.equal((lesson.steps[1]?.whyRight.es ?? "").toLowerCase().includes("seguro comprar"), false);
  });

  test("el reparto compara suministros y no inventa la muestra que no se pudo leer", () => {
    const lesson = byId.get("leccion-reparto");
    assert.ok(lesson);
    const text = JSON.stringify(lesson);
    assert.match(text, /7\.902\.630\.871,234262/);
    assert.match(text, /1\.029\.314\.281,190085282/);
    assert.equal(lesson.steps[0]?.correct, "tecnica");
    assert.match(lesson.steps[0]?.whyRight.es ?? "", /tokens distintos/);
    assert.equal(lesson.steps[1]?.correct, "no-censo");
    assert.equal(freeze.distribution.sample.status, "no_disponible");
    assert.equal(freeze.distribution.sample.source?.detail, "HTTP 429");
    assert.match(lesson.steps[1]?.whyRight.es ?? "", /HTTP 429/);
    assert.match(lesson.steps[1]?.whyRight.es ?? "", /no disponible/);
    assert.equal(text.toLowerCase().includes("wallet"), false);
    assert.equal(text.includes("cuenta personal"), false);
  });

  test("separa consulta fallida, ausencia y dato no pedido", () => {
    const lesson = byId.get("leccion-huecos");
    assert.ok(lesson);
    assert.equal(usdc.distribution.sample.status, "no_disponible");
    assert.equal(usdc.distribution.sample.source?.method, "getTokenLargestAccounts");
    assert.equal(usdc.distribution.sample.source?.detail, "HTTP 429");
    assert.equal(usdc.permissions.metaplexUpdateAuthority.status, "verificado");
    assert.equal(lesson.steps[0]?.correct, "fallo");
    assert.equal(lesson.steps[1]?.correct, "ausente");
    assert.equal(lesson.steps[2]?.correct, "no-pedido");
    assert.match(lesson.steps[0]?.whyRight.es ?? "", /HTTP 429/);
    assert.match(lesson.steps[1]?.whyRight.es ?? "", /La consulta respondió\. El dato no está/);
    assert.equal((lesson.steps[1]?.whyRight.es ?? "").toLowerCase().includes("verificad"), false);
    const absentEn = lesson.steps[1]?.whyRight.en ?? "";
    const glossaryEn = glossary.entries.find((entry) => entry.id === "ausente-comprobado")?.example.en ?? "";
    for (const sentence of [absentEn, glossaryEn]) {
      assert.equal(sentence.toLowerCase().includes("verified"), false);
    }
    assert.match(glossaryEn, /USDC/);
    assert.match(lesson.steps[2]?.whyRight.es ?? "", /no aplica/);
    assert.match(lesson.steps[2]?.whyWrong.fallo?.es ?? "", /HTTP 429/);
  });

  test("una respuesta incorrecta se explica y el recorrido correcto termina", () => {
    for (const lesson of lessons) {
      assert.equal(lessonStorageKey(lesson.id), `orvupi-lab-${lesson.id}`);
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
    assert.equal(lessonStorageKey("leccion-huecos"), "orvupi-lab-leccion-huecos");
    assert.equal(JSON.stringify(loadJson(path.join(root, "lab/mission/lecciones.json"))).toLowerCase().includes("wallet"), false);
    const reparto = lab.body.slice(lab.body.indexOf('id="leccion-reparto"'), lab.body.indexOf('id="leccion-huecos"'));
    assert.match(reparto, /HTTP 429/);
    assert.equal(reparto.includes("cuenta personal"), false);
    assert.equal(reparto.includes("personal account"), false);
  });
});
