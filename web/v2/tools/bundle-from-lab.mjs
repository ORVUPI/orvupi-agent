/**
 * Regenera la Verify, Lab y el tablero de web/v2 desde lab/ y site-drafts/.
 * lookup.mjs y cards.json salen del código de lab/, no de una copia a mano.
 * Si lab/ no está, no inventa un build.
 */
import { spawnSync } from "node:child_process";
import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../../..");

function git(args) {
  const run = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  if (run.status !== 0) return "";
  return run.stdout.trim();
}

function labCommit() {
  const headBlob = git(["rev-parse", "HEAD:lab/verify/lookup.ts"]);
  if (!headBlob) return "";
  // El commit real es el primero que tiene este lookup.ts. En el checkout
  // de un pull request HEAD es un merge: su blob coincide, pero el origen
  // del archivo es el commit de la rama, no el merge.
  const commits = git(["rev-list", "--reverse", "HEAD"]).split("\n").filter(Boolean);
  for (const commit of commits) {
    if (git(["rev-parse", `${commit}:lab/verify/lookup.ts`]) === headBlob) return commit;
  }
  return "";
}

function ensureCompiled() {
  const lookupJs = path.join(root, "dist/lab/verify/lookup.js");
  const loadJs = path.join(root, "dist/lab/mission/load.js");
  if (existsSync(lookupJs) && existsSync(loadJs)) return;
  const tsc = spawnSync("npx", ["tsc", "-p", "tsconfig.json"], { cwd: root, encoding: "utf8" });
  if (tsc.status !== 0) {
    console.error(tsc.stdout);
    console.error(tsc.stderr);
    process.exit(tsc.status ?? 1);
  }
}

function lookupModule() {
  const compiled = readFileSync(path.join(root, "dist/lab/verify/lookup.js"), "utf8");
  const body = compiled.replaceAll("\r\n", "\n").replaceAll(/^\/\/# sourceMappingURL=.*\n?/gm, "").trim();
  if (/^\s*import\s/m.test(body)) {
    throw new Error("lookup compilado todavía importa módulos.");
  }
  return `${body}\n`;
}

function mainInner(file) {
  const html = readFileSync(file, "utf8");
  const start = html.indexOf("<main");
  const open = html.indexOf(">", start);
  const end = html.lastIndexOf("</main>");
  if (start < 0 || open < 0 || end < 0) {
    throw new Error(`No hay <main> en ${file}`);
  }
  return `${html.slice(open + 1, end).trim()}\n`;
}

function dateProcessLinks(html) {
  return html
    .replaceAll("PR 13 en borrador", "PR 13 en borrador · 2026-10-08")
    .replaceAll("Draft PR 13", "Draft PR 13 · 2026-10-08")
    .replaceAll("PR 14 en borrador", "PR 14 en borrador · 2026-10-09")
    .replaceAll("Draft PR 14", "Draft PR 14 · 2026-10-09");
}

const lookupSource = path.join(root, "lab/verify/lookup.ts");
const verifyBundle = path.join(root, "site-drafts/assets/verify.js");
const missionBundle = path.join(root, "site-drafts/assets/mission.js");
if (!existsSync(lookupSource) || !existsSync(verifyBundle) || !existsSync(missionBundle)) {
  console.error("lab/ o site-drafts/ no están en esta rama. No se inventa un bundle.");
  process.exit(1);
}

const commit = labCommit();
if (!commit) {
  console.error("No se encontró el commit de lab/ incluido en HEAD.");
  process.exit(1);
}

ensureCompiled();
const { loadCards, loadFuentes } = await import(pathToFileURL(path.join(root, "dist/lab/mission/load.js")).href);
const { presentCard, presentClones, presentEvmItem } = await import(
  pathToFileURL(path.join(root, "dist/lab/display-copy.js")).href
);
const clones = JSON.parse(readFileSync(path.join(root, "verify/registry/clones.json"), "utf8"));
// ORVUPI todavía no tiene contrato: la web solo publica la ficha de contraste (USDC), sin registro ni clones del token anterior.
const cards = loadCards(root, loadFuentes(root)).map((card) => presentCard(card)).filter((card) => card.role === "contraste");
const payload = {
  source: "lista",
  cards,
  evm: [],
};
writeFileSync(path.join(root, "web/v2/modules/verify/cards.json"), `${JSON.stringify(payload, null, 2)}\n`);
writeFileSync(
  path.join(root, "web/v2/modules/verify/clones.json"),
  `${JSON.stringify({ ...presentClones(clones), examples: [], evm: [] }, null, 2)}\n`,
);
writeFileSync(path.join(root, "web/v2/modules/verify/lookup.mjs"), lookupModule());
copyFileSync(verifyBundle, path.join(root, "web/v2/assets/verify.js"));
copyFileSync(missionBundle, path.join(root, "web/v2/assets/mission.js"));
copyFileSync(path.join(root, "site-drafts/lab/sw.js"), path.join(root, "web/v2/lab/sw.js"));
copyFileSync(path.join(root, "lab/mission/mision-01.json"), path.join(root, "web/v2/modules/lab/mision-01.json"));
copyFileSync(path.join(root, "lab/mission/lecciones.json"), path.join(root, "web/v2/modules/lab/lecciones.json"));
copyFileSync(path.join(root, "lab/tablero/registros.json"), path.join(root, "web/v2/modules/tablero/registros.json"));
copyFileSync(path.join(root, "lab/tablero/plantilla.json"), path.join(root, "web/v2/modules/tablero/plantilla.json"));
copyFileSync(path.join(root, "lab/library/glossary.json"), path.join(root, "web/v2/modules/lab/glossary.json"));
copyFileSync(path.join(root, "lab/library/revision.json"), path.join(root, "web/v2/modules/lab/revision.json"));
copyFileSync(path.join(root, "lab/library/guides.json"), path.join(root, "web/v2/modules/lab/guides.json"));
mkdirSync(path.join(root, "web/v2/modules/lab/guides"), { recursive: true });
cpSync(path.join(root, "lab/library/guides"), path.join(root, "web/v2/modules/lab/guides"), { recursive: true });

writeFileSync(
  path.join(root, "web/v2/content/tools/verify.html"),
  mainInner(path.join(root, "site-drafts/verify/index.html")),
);
writeFileSync(path.join(root, "web/v2/content/tools/lab.html"), mainInner(path.join(root, "site-drafts/lab/index.html")));
writeFileSync(
  path.join(root, "web/v2/content/tools/tablero.html"),
  dateProcessLinks(mainInner(path.join(root, "site-drafts/tablero/index.html"))),
);

// %cI imprime +00:00 en Git 2.43 y Z desde Git 2.45. La fecha sale del
// instante Unix para que el snapshot no cambie según la versión de Git.
const unix = Number(git(["log", "-1", "--format=%ct", commit]));
const when = Number.isFinite(unix) ? new Date(unix * 1000).toISOString().replace(".000Z", "+00:00") : "";
const snapshot = {
  kind: "verify-browser-snapshot",
  pr: 21,
  branch: "feat/verify-universal",
  commit,
  commitDate: when,
  cardsDate: "2026-10-09",
  earlierCardsDate: "2026-10-08",
  liveNetwork: true,
  inBranch: true,
  serviceWorker: "lab/sw.js",
  serviceWorkerScope: "/lab/",
  uiBundle: "assets/verify.js",
  missionBundle: "assets/mission.js",
  browserApi: "modules/verify/lookup.mjs",
  cards: "modules/verify/cards.json",
  note: `Bundle regenerado desde lab/ en ${commit}, rama feat/verify-universal, PR 21. La página /verify/ lee en el navegador, solo lectura, con los servicios públicos de limits.json. El aviso de Guardar está en web/v2/shared/aviso-guardar.js. inBranch significa que el commit citado es ancestro de esta rama. Esta copia no está publicada.`,
};
writeFileSync(path.join(root, "web/v2/modules/snapshot.json"), `${JSON.stringify(snapshot, null, 2)}\n`);
console.log(`Bundle regenerado desde lab/ ${commit}.`);
