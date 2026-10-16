import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { repoRootFromMeta } from "../paths.js";
import { presentCard } from "../display-copy.js";
import { ENTENDER_LINKS } from "../mission/entender-links.js";
import { loadCards, loadFuentes, loadGlossary, loadLessons, loadMission } from "../mission/load.js";
import { validateLessons, validateMission } from "../mission/validate.js";
import { renderCss } from "./css.js";
import { bundleMission, bundleVerify } from "./bundle.js";
import { inlineModule } from "./inline.js";
import { renderPages } from "./render.js";
import type { BuiltPage } from "./render.js";

/** Vuelve a true solo cuando exista el contrato ORVUPI y esté en web/v2/shared/orvupi-contract.json. */
const WEB_PUBLISHES_REGISTRY = false;

export function buildOutputs(repoRoot: string, options: { publish?: boolean } = {}): BuiltPage[] {
  const fuentes = loadFuentes(repoRoot);
  const cards = loadCards(repoRoot, fuentes).map((card) => presentCard(card));
  const mission = loadMission(repoRoot);
  const lessons = loadLessons(repoRoot);
  const glossary = loadGlossary(repoRoot);
  const issues = [...validateMission(mission, glossary, cards), ...validateLessons(lessons, glossary, cards)];
  if (issues.length > 0) {
    throw new Error(issues.join("\n"));
  }
  const enginePath = path.join(repoRoot, "dist/lab/mission/engine.js");
  const uiPath = path.join(repoRoot, "lab/client/ui.js");
  const byMint: Record<string, (typeof cards)[number]> = {};
  for (const card of cards) {
    byMint[card.mint] = card;
  }
  const lookupPath = path.join(repoRoot, "dist/lab/verify/lookup.js");
  const verifyUiPath = path.join(repoRoot, "lab/client/verify-ui.js");
  const signalsPath = path.join(repoRoot, "dist/verify/signals.js");
  const limits = JSON.parse(readFileSync(path.join(repoRoot, "verify/policy/limits.json"), "utf8")) as {
    defaultRpcUrl: string;
    fallbackRpcUrl: string;
  };
  const canonical = JSON.parse(readFileSync(path.join(repoRoot, "verify/registry/canonical.json"), "utf8")) as {
    tokens: unknown[];
  };
  const clones = JSON.parse(readFileSync(path.join(repoRoot, "verify/registry/clones.json"), "utf8")) as {
    evm?: unknown[];
  };
  const summaryPath = path.join(repoRoot, "web/v2/shared/reading-summary.js");
  const marketPath = path.join(repoRoot, "web/v2/shared/market-view.js");
  const verifyJs = bundleVerify(
    readFileSync(lookupPath, "utf8"),
    inlineModule(signalsPath),
    `${inlineModule(summaryPath)}\n${inlineModule(marketPath)}`,
    readFileSync(verifyUiPath, "utf8"),
    {
      // ORVUPI todavía no tiene contrato: la web no publica registro, clones ni fichas del token anterior.
      // Solo queda la ficha de contraste (USDC). canonical y clones siguen en verify/registry para el agente.
      cards: cards.filter((card) => card.role === "contraste"),
      source: "lista" as const,
      evm: WEB_PUBLISHES_REGISTRY && Array.isArray(clones.evm) ? clones.evm : [],
      rpc: { primary: limits.defaultRpcUrl, fallback: limits.fallbackRpcUrl },
      registry: WEB_PUBLISHES_REGISTRY ? canonical.tokens : [],
    },
  );
  const missionJs = bundleMission(readFileSync(enginePath, "utf8"), readFileSync(uiPath, "utf8"), {
    mission,
    lessons,
    entender: ENTENDER_LINKS,
    cards: byMint,
    glossary: glossary.entries,
    cardDate: mission.cardDate,
  });
  return [
    { rel: "site-drafts/assets/site.css", body: renderCss() },
    { rel: "site-drafts/assets/mission.js", body: missionJs },
    { rel: "site-drafts/assets/verify.js", body: verifyJs },
    ...renderPages(repoRoot, cards, options),
  ];
}

export function pagesDiffer(repoRoot: string, pages: readonly BuiltPage[]): string[] {
  const diffs: string[] = [];
  for (const page of pages) {
    const file = path.join(repoRoot, page.rel);
    let current = "";
    try {
      current = readFileSync(file, "utf8");
    } catch {
      diffs.push(page.rel);
      continue;
    }
    if (current !== page.body) {
      diffs.push(page.rel);
    }
  }
  return diffs;
}

function writePages(repoRoot: string, pages: readonly BuiltPage[]): void {
  for (const page of pages) {
    const file = path.join(repoRoot, page.rel);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, page.body);
  }
}

function main(): void {
  const repoRoot = repoRootFromMeta(import.meta.url);
  const publishRequested = process.argv.includes("--publish");
  const publishConfirmed = process.env.STUBX_PUBLISH === "1";
  if (publishRequested !== publishConfirmed) {
    process.stderr.write("El modo publicación solo se activa con STUBX_PUBLISH=1 y --publish, y solo cuando el creador lo decida. El borrador no cambia.\n");
    process.exitCode = 1;
    return;
  }
  const pages = buildOutputs(repoRoot, { publish: publishRequested && publishConfirmed });
  const check = process.argv.includes("--check");
  if (check) {
    const diffs = pagesDiffer(repoRoot, pages);
    if (diffs.length > 0) {
      process.stderr.write(`Borradores desactualizados:\n${diffs.join("\n")}\n`);
      process.exitCode = 1;
    }
    return;
  }
  writePages(repoRoot, pages);
}

const entry = process.argv[1];
if (entry && import.meta.url === pathToFileURL(entry).href) {
  main();
}
