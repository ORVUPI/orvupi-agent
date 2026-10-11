import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";
import { pathToFileURL } from "node:url";
import { repoRoot } from "../src/paths.js";

const OLD_ES = "Este sitio no guarda la dirección.";
const OLD_EN = "This site does not store the address, but";

describe("aviso de Guardar", () => {
  test("el texto aprobado está en un solo módulo y nombra los dos RPC", async () => {
    const root = repoRoot();
    const mod = (await import(pathToFileURL(path.join(root, "web/v2/shared/aviso-guardar.js")).href)) as {
      AVISO_GUARDAR: { es: string; en: string };
    };
    const aviso = mod.AVISO_GUARDAR;
    assert.equal(aviso.es.includes("["), false);
    assert.equal(aviso.en.includes("["), false);
    assert.equal(aviso.es.includes("PROVEEDOR"), false);
    assert.equal(aviso.en.includes("PROVIDER"), false);
    assert.match(aviso.es, /solana-rpc\.publicnode\.com y api\.mainnet-beta\.solana\.com/);
    assert.match(aviso.en, /solana-rpc\.publicnode\.com and api\.mainnet-beta\.solana\.com/);
    assert.match(aviso.es, /se envía a los nodos públicos de Solana solana-rpc\.publicnode\.com y api\.mainnet-beta\.solana\.com, que también ven tu IP/);
    assert.match(aviso.en, /it is sent to the Solana public nodes solana-rpc\.publicnode\.com and api\.mainnet-beta\.solana\.com, which also see your IP/);
    assert.match(aviso.es, /«Guardar esta consulta»/);
    assert.match(aviso.en, /"Save this lookup"/);
    assert.match(aviso.es, /tu navegador conecta con DEX Screener y DEX Screener también ve tu IP y la dirección consultada/);
    assert.match(aviso.en, /your browser connects to DEX Screener and it also sees your IP and the address you look up/);
    assert.equal(aviso.es.includes("sin reenviar tu IP"), false);
    assert.equal(aviso.en.includes("without forwarding your IP"), false);
    assert.equal(readFileSync(path.join(root, "web/v2/shared/aviso-guardar.js"), "utf8").includes("Pendiente de Legal"), false);
    assert.match(aviso.es, /Los datos de mercado no se guardan\./);
    assert.match(aviso.en, /Market data is not stored\./);
    const notebook = readFileSync(path.join(root, "web/v2/cuaderno/index.html"), "utf8");
    assert.equal(notebook.includes(aviso.es), true);
    assert.equal(notebook.includes(aviso.en), true);
    const verify = readFileSync(path.join(root, "web/v2/verify/index.html"), "utf8");
    const formStart = verify.indexOf('<form id="consulta"');
    const formEnd = verify.indexOf("</form>", formStart);
    const form = verify.slice(formStart, formEnd);
    const nodesEs = "Para leerla en directo, se envía a los nodos públicos de Solana solana-rpc.publicnode.com y api.mainnet-beta.solana.com, que también ven tu IP.";
    const nodesEn = "To read it live, it is sent to the Solana public nodes solana-rpc.publicnode.com and api.mainnet-beta.solana.com, which also see your IP.";
    assert.equal(form.includes('id="aviso-guardar"'), true);
    assert.equal(form.includes('class="aviso-nodos"'), true);
    const noticeStart = form.indexOf('id="aviso-guardar"');
    const detailsStart = form.indexOf("<details", noticeStart);
    const visible = form.slice(noticeStart, detailsStart);
    assert.equal(visible.includes(nodesEs), true);
    assert.equal(visible.includes(nodesEn), true);
    assert.equal(visible.includes("Los datos de mercado no se guardan"), false);
    const folded = form.slice(detailsStart, form.indexOf("</details>", detailsStart));
    assert.equal(folded.includes(nodesEs), false);
    assert.equal(folded.includes(nodesEn), false);
    assert.equal(folded.includes("Los datos de mercado no se guardan"), true);
    for (const sentence of aviso.es.split(/(?<=\.)\s+/)) assert.equal(form.includes(sentence), true, sentence);
    assert.equal(form.includes(nodesEn), true);
    assert.equal(form.includes("Save this lookup"), true);
    const howItWorks = verify.slice(verify.indexOf('<details class="como"'), verify.indexOf("</details>", verify.indexOf('<details class="como"')));
    assert.equal(howItWorks.includes(aviso.es), false);
    assert.equal(verify.includes(OLD_ES), false);
    assert.equal(verify.includes("__AVISO_"), false);
    for (const rel of ["web/v2/legal/index.html", "web/v2/methodology/index.html", "web/v2/pares/index.html"]) {
      const html = readFileSync(path.join(root, rel), "utf8");
      assert.equal(html.includes(OLD_ES), false, rel);
      assert.equal(html.includes(OLD_EN), false, rel);
      assert.equal(html.includes("__AVISO_"), false, rel);
    }
    const actions = readFileSync(path.join(root, "web/v2/assets/verificar-acciones.mjs"), "utf8");
    const save = actions.slice(actions.indexOf("function saveQuery"), actions.indexOf("async function comparePrevious"));
    assert.equal(save.includes("readMint"), false);
    assert.equal(save.includes("fetch("), false);
    const click = actions.slice(actions.indexOf('closest("#entender-resultado'));
    assert.equal(click.includes("GUIAS.has(href)"), true);
    assert.equal(click.includes('getAttribute("data-guia") ||'), false);
  });
});
