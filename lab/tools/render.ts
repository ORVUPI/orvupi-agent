import { readFileSync } from "node:fs";
import path from "node:path";
import { repoRootFromMeta } from "../paths.js";
import { AUDIT_EN, AUDIT_ES, DRAFT_LINE, HOW_LAB, HOW_VERIFY, OFFLINE_LINE, PRIVACY_EN, PRIVACY_ES, READONLY_LINE, UNKNOWN_LINE } from "../copy.js";
import { ENTENDER_BUTTON, ENTENDER_LINKS } from "../mission/entender-links.js";
import { loadGlossary, loadLessons, loadMission } from "../mission/load.js";
import type { CardSummary, GlossaryEntry, Lesson, Localized, Mission, MissionStep } from "../mission/types.js";
import { changelogHeadings, listTestFiles, loadBoard } from "../tablero/collect.js";
import type { BoardFile, TaskRecord, TaskStatus } from "../tablero/collect.js";
import { authorityWords, type DisplayCard } from "../display-copy.js";
import { escapeHtml, renderMarkdown, splitBilingualMarkdown } from "../text.js";

export type PageName = "index" | "verify" | "lab" | "tablero";

const STATUS_LABEL: Record<string, Localized> = {
  verificado: { es: "verificado", en: "verified" },
  inferido: { es: "inferido", en: "inferred" },
  no_disponible: { es: "no disponible", en: "unavailable" },
  no_aplica: { es: "no aplica", en: "not applicable" },
  desconocido: { es: "desconocido", en: "unknown" },
};

const TASK_STATUS: Record<TaskStatus, Localized> = {
  propuesta: { es: "Propuesta", en: "Proposal" },
  en_curso: { es: "En curso", en: "In progress" },
  en_revision: { es: "En revisión", en: "In review" },
  publicada: { es: "Publicada", en: "Published" },
};

const FIELD_LABEL: Record<string, Localized> = {
  name: { es: "Nombre on-chain", en: "On-chain name" },
  mint: { es: "Dirección del mint", en: "Mint address" },
  inRegistry: { es: "En el registro curado", en: "In the curated registry" },
  statement: { es: "Lectura de autenticidad", en: "Authenticity statement" },
  mintAuthority: { es: "Autoridad de emisión", en: "Mint authority" },
  freezeAuthority: { es: "Autoridad de congelación", en: "Freeze authority" },
  metadata: { es: "Metadatos", en: "Metadata" },
  holders: { es: "Muestra de cuentas con el token", en: "Token account sample" },
  impersonation: { es: "Señal de suplantación", en: "Impersonation signal" },
  curvePresent: { es: "Cuenta de curva", en: "Curve account" },
  curveProgress: { es: "Avance de la curva clásica", en: "Classic curve progress" },
};

const META_LABEL: Record<CardSummary["metadataReading"], Localized> = {
  no_mutables_en_fuentes: { es: "No mutables en las fuentes leídas", en: "Not mutable in the sources read" },
  mutables: { es: "Mutables", en: "Mutable" },
  desconocido: { es: "Desconocido", en: "Unknown" },
};

const REGISTRY_MARK = {
  es: "(publicada en el registro oficial)",
  en: "(listed in the official registry)",
};

function linkRegistry(escaped: string): string {
  return escaped
    .replaceAll(REGISTRY_MARK.es, `<a href="/security/">${REGISTRY_MARK.es}</a>`)
    .replaceAll(REGISTRY_MARK.en, `<a href="/security/">${REGISTRY_MARK.en}</a>`);
}

function both(text: Localized, tag = "span"): string {
  return `<${tag} class="lang es" lang="es">${linkRegistry(escapeHtml(text.es))}</${tag}><${tag} class="lang en" lang="en">${linkRegistry(escapeHtml(text.en))}</${tag}>`;
}

const LAB_READ: Localized = { es: "leído en la cadena", en: "read on-chain" };

function statusText(status: string, labRead = false): Localized {
  if (labRead && status === "verificado") return LAB_READ;
  return STATUS_LABEL[status] ?? STATUS_LABEL.desconocido ?? { es: "desconocido", en: "unknown" };
}

function fact(status: string, value: Localized | null, labRead = false): Localized {
  if (status !== "verificado" && status !== "inferido") {
    return statusText(status, labRead);
  }
  const mark = statusText(status, labRead);
  if (!value || value.es.length === 0) {
    return mark;
  }
  return { es: `${value.es} · ${mark.es}`, en: `${value.en} · ${mark.en}` };
}

function yn(value: boolean): Localized {
  return value ? { es: "sí", en: "yes" } : { es: "no", en: "no" };
}

function shown(card: CardSummary): DisplayCard {
  return card as DisplayCard;
}

function pairNote(es: string | null, en: string | null): Localized | null {
  if (!es && !en) return null;
  return { es: es ?? "", en: en || es || "" };
}

export function safeHref(value: string | undefined): string | null {
  if (!value) {
    return null;
  }
  if (value.startsWith("https://github.com/ORVUPI/orvupi-agent/") || value.startsWith("https://github.com/stubxai/stubx-agent/")) {
    return value;
  }
  if (/^[a-z0-9./_-]+$/i.test(value) && !value.includes("..")) {
    return value;
  }
  return null;
}

const LEVEL_LABEL: Record<string, Localized> = {
  ok: { es: "ok", en: "ok" },
  "atención": { es: "atención", en: "attention" },
  riesgo: { es: "riesgo", en: "risk" },
};

function fieldValue(card: CardSummary, key: string, labRead = false): { value: Localized; note: string | Localized | null; neutral?: boolean } {
  switch (key) {
    case "name":
      return { value: fact(card.nameStatus, card.name ? { es: card.name, en: card.name } : null, labRead), note: null };
    case "mint":
      return { value: { es: card.mint, en: card.mint }, note: null };
    case "inRegistry":
      return {
        value: fact(card.inRegistryStatus, card.inRegistry === null ? null : yn(card.inRegistry), labRead),
        note: null,
      };
    case "statement":
      return {
        value: fact(
          card.statementStatus,
          card.statement ? { es: card.statement, en: shown(card).statement_en || card.statement } : null,
          labRead,
        ),
        note: null,
      };
    case "mintAuthority":
      return {
        value: fact(card.mintAuthority.status, authorityWords(card.mintAuthority.state), labRead),
        note: null,
      };
    case "freezeAuthority":
      return {
        value: fact(card.freezeAuthority.status, authorityWords(card.freezeAuthority.state), labRead),
        note: null,
      };
    case "metadata":
      return { value: META_LABEL[card.metadataReading], note: null };
    case "holders":
      return { value: fact(card.holdersStatus, null, labRead), note: pairNote(shown(card).holdersNote, shown(card).holdersNote_en) };
    case "impersonation": {
      if (card.impersonation === null) {
        return { value: statusText("desconocido"), note: null, neutral: true };
      }
      const level = LEVEL_LABEL[card.authenticityLevel ?? ""] ?? {
        es: card.authenticityLevel ?? "",
        en: card.authenticityLevel ?? "",
      };
      if (card.impersonation) {
        return {
          value: { es: `Posible suplantación · ${level.es}`, en: `Possible impersonation · ${level.en}` },
          note: null,
        };
      }
      if (card.inRegistry === true) {
        return {
          value: { es: `En el registro · ${level.es}`, en: `In the registry · ${level.en}` },
          note: null,
        };
      }
      return {
        value: { es: "Sin esa señal", en: "No such signal" },
        note: {
          es: "Que no aparezca la señal no comprueba el mint.",
          en: "The lack of that signal does not check the mint.",
        },
        neutral: true,
      };
    }
    case "curvePresent":
      return {
        value: fact(card.curvePresentStatus, card.curvePresent === null ? null : yn(card.curvePresent), labRead),
        note: pairNote(shown(card).curveModuleNote, shown(card).curveModuleNote_en),
      };
    case "curveProgress":
      return {
        value: fact(
          card.curveProgressStatus,
          card.curveProgress ? { es: `${card.curveProgress} %`, en: `${card.curveProgress}%` } : null,
          labRead,
        ),
        note: pairNote(shown(card).curveProgressNote, shown(card).curveProgressNote_en),
      };
    default:
      return { value: statusText("desconocido"), note: null };
  }
}

export function renderCard(card: CardSummary, fields: readonly string[]): string {
  return `<article class="ficha">${cardInner(card, fields, true)}</article>`;
}

function cardInner(card: CardSummary, fields: readonly string[], labRead = false): string {
  const rows = fields
    .map((key) => {
      const label = FIELD_LABEL[key] ?? { es: key, en: key };
      const item = fieldValue(card, key, labRead);
      const note = item.note
        ? `<p class="muted">${typeof item.note === "string" ? escapeHtml(item.note) : both(item.note)}</p>`
        : "";
      const tone = item.neutral ? ` class="sin-senal"` : "";
      return `<dt>${both(label)}</dt><dd${tone}>${both(item.value)}${note}</dd>`;
    })
    .join("");
  return `<h3>${escapeHtml(card.name ?? card.mint)}</h3><p class="rol">${both(card.roleNote)}</p><p><code class="mint">${escapeHtml(card.mint)}</code></p><dl>${rows}</dl>`;
}

function asset(prefix: string, file: string): string {
  return `${prefix}assets/${file}`;
}

function pageHref(prefix: string, page: Exclude<PageName, never>): string {
  if (page === "index") {
    return prefix === "" ? "./indice-borrador.html" : "../indice-borrador.html";
  }
  return prefix === "" ? `${page}/index.html` : `../${page}/index.html`;
}

function howDetails(copy: { es: readonly string[]; en: readonly string[] }): string {
  const items = copy.es
    .map((line, index) => {
      const en = copy.en[index] ?? "";
      return `<li><span class="lang es" lang="es">${escapeHtml(line)}</span><span class="lang en" lang="en">${escapeHtml(en)}</span></li>`;
    })
    .join("");
  return `<details class="como"><summary>${both({ es: "¿Cómo funciona?", en: "How does it work?" })}</summary><ol>${items}</ol></details>`;
}

function shell(input: { title: string; description: string; prefix: string; current: PageName; main: string; mission?: boolean; verify?: boolean; narrow?: boolean; publish?: boolean }): string {
  const nav: Array<{ id: Exclude<PageName, "index">; es: string; en: string }> = [
    { id: "verify", es: "Verify", en: "Verify" },
    { id: "lab", es: "Lab", en: "Lab" },
    { id: "tablero", es: "Tablero", en: "Board" },
  ];
  const links = nav
    .map((item) => {
      const current = item.id === input.current ? ` aria-current="page"` : "";
      return `<li><a href="${pageHref(input.prefix, item.id)}"${current}>${both({ es: item.es, en: item.en })}</a></li>`;
    })
    .join("");
  const mission = input.mission ? `\n<script src="${asset(input.prefix, "mission.js")}"></script>` : "";
  const verify = input.verify ? `\n<script src="${asset(input.prefix, "verify.js")}"></script>` : "";
  const frame = input.narrow ? "wrap estrecha" : "wrap";
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="referrer" content="no-referrer">
${input.publish ? "" : `<meta name="robots" content="noindex">\n`}<title>${escapeHtml(input.title)}</title>
<meta name="description" content="${escapeHtml(input.description)}">
<link rel="stylesheet" href="${asset(input.prefix, "site.css")}">
<script src="${asset(input.prefix, "site.js")}"></script>
</head>
<body>
<a class="skip lang es" href="#contenido">Saltar al contenido</a>
<a class="skip lang en" href="#contenido">Skip to content</a>
<header class="site"><div class="${frame}">
<p class="brand"><strong>ORVUPI</strong></p>
${input.publish ? "" : `<p class="draft">${both(DRAFT_LINE)}</p>\n`}
<nav class="site" aria-label="Secciones / Sections"><ul>${links}</ul></nav>
<div class="langs" role="group" aria-label="Idioma / Language">
<button type="button" data-set-lang="es" lang="es">Español</button>
<button type="button" data-set-lang="en" lang="en">English</button>
</div>
</div></header>
<main id="contenido" class="${frame}">
<div class="aviso" data-disclaimer="si">
<p>${both(READONLY_LINE)}</p>
<p>${both(input.current === "lab" ? { es: UNKNOWN_LINE.es, en: "Unknown is not the same as checked." } : UNKNOWN_LINE)}</p>
<p>${both({ es: "Fichas del 2026-10-08 y, si las hay, ejemplos posteriores. No se actualizan solas. La hora de cada ficha va en Europe/Madrid.", en: "Cards from 2026-10-08 and, where present, later examples. They do not update themselves. Each card time is shown in Europe/Madrid." })}</p>
</div>
<p id="aviso-red" class="nota" hidden>${both(OFFLINE_LINE)}</p>
<p id="aviso-version" class="nota" hidden>${both({ es: "Hay otra copia de estas páginas. Recargar no borra el progreso local.", en: "Another copy of these pages is available. Reloading does not delete local progress." })} <button type="button" id="recargar">${both({ es: "Recargar", en: "Reload" })}</button></p>
${input.main}
</main>
<footer class="site"><div class="${frame}">
<p>${both(OFFLINE_LINE)}</p>
<p>${both(input.publish ? { es: "Sin cuentas, sin firma y sin analítica.", en: "No accounts, no signing, and no analytics." } : { es: "Borrador 2026-10-09. Sin cuentas, sin firma y sin analítica.", en: "Draft 2026-10-09. No accounts, no signing, and no analytics." })}</p>
</div></footer>${mission}${verify}
</body>
</html>
`;
}

function staticStep(step: MissionStep, index: number, total: number, cards: ReadonlyMap<string, CardSummary>, glossary: ReadonlyMap<string, GlossaryEntry>): string {
  const heading = { es: `Paso ${index + 1} de ${total}`, en: `Step ${index + 1} of ${total}` };
  const help = step.glossary
    .map((termId) => {
      const term = glossary.get(termId);
      if (!term) return "";
      return `<a href="#termino-${escapeHtml(term.id)}">${both({ es: `¿Qué significa «${term.term.es}»?`, en: `What does “${term.term.en}” mean?` })}</a>`;
    })
    .filter((item) => item.length > 0)
    .join("");
  const helpHtml = help.length > 0 ? `<p class="glosario-paso">${help}</p>` : "";
  const cardHtml = step.cards
    .map((mint) => {
      const card = cards.get(mint);
      return card ? renderCard(card, step.fields) : "";
    })
    .join("");
  const options = step.options
    .map((option) => `<li>${both(option.label)}</li>`)
    .join("");
  const wrong = Object.values(step.whyWrong)
    .map((line) => `<p>${both(line)}</p>`)
    .join("");
  const cardsFold = cardHtml
    ? `<details class="tecnico"><summary>${both({ es: "Detalles", en: "Details" })}</summary>${cardHtml}</details>`
    : "";
  return `<article class="paso"><h3>${both(heading)}</h3><p>${both(step.guide)}</p>${helpHtml}${cardsFold}<h4>${both(step.prompt)}</h4><ul>${options}</ul><details class="tecnico"><summary>${both({ es: "Explicación", en: "Explanation" })}</summary><p>${both(step.whyRight)}</p>${wrong}</details></article>`;
}

function glossaryArticle(entry: GlossaryEntry): string {
  return `<article id="termino-${escapeHtml(entry.id)}"><h3>${both(entry.term)}</h3><p>${both(entry.means)}</p><p>${both({ es: "Ejemplo. ", en: "Example. " })}${both(entry.example)}</p><p>${both({ es: "No permite concluir: ", en: "It does not let you conclude: " })}${both(entry.doesNotConclude)}</p></article>`;
}

function guideSection(repoRoot: string): string {
  const manifest = JSON.parse(readFileSync(path.join(repoRoot, "lab/library/guides.json"), "utf8")) as {
    guides: Array<{ id: string; file: string; title: Localized }>;
  };
  return manifest.guides
    .map((guide) => {
      const source = readFileSync(path.join(repoRoot, "lab/library/guides", guide.file), "utf8");
      const blocks = splitBilingualMarkdown(source);
      if (!blocks) {
        throw new Error(`La guía ${guide.id} no tiene español e inglés.`);
      }
      return `<article class="guia-texto" id="guia-${escapeHtml(guide.id)}"><h3>${both(guide.title)}</h3><div class="lang es" lang="es">${renderMarkdown(blocks.es)}</div><div class="lang en" lang="en">${renderMarkdown(blocks.en)}</div></article>`;
    })
    .join("");
}

function entenderBlock(topics: readonly string[]): string {
  const chosen = topics
    .map((id) => ENTENDER_LINKS.find((item) => item.id === id))
    .filter((item): item is (typeof ENTENDER_LINKS)[number] => Boolean(item));
  if (chosen.length === 0) return "";
  const label = `${ENTENDER_BUTTON.es} / ${ENTENDER_BUTTON.en}`;
  if (chosen.length === 1) {
    const only = chosen[0];
    if (!only) return "";
    return `<nav class="entender-resultado" aria-label="${escapeHtml(label)}"><a class="abrir-entender" href="${escapeHtml(only.href)}">${both(ENTENDER_BUTTON)}</a><p data-tema="${escapeHtml(only.id)}">${both(only.explain)}</p></nav>`;
  }
  const explains = chosen
    .map(
      (item) =>
        `<p data-tema="${escapeHtml(item.id)}">${both(item.explain)}</p><a href="${escapeHtml(item.href)}" data-guia="${escapeHtml(item.href)}">${both({ es: item.es, en: item.en })}</a>`,
    )
    .join("");
  return `<nav class="entender-resultado" aria-label="${escapeHtml(label)}"><p class="entender-rotulo">${both(ENTENDER_BUTTON)}</p><div class="explicacion-resultado">${explains}</div></nav>`;
}

function renderLesson(lesson: Lesson, byMint: Map<string, CardSummary>, glossaryById: Map<string, GlossaryEntry>): string {
  const steps = lesson.steps
    .map((step, index) => staticStep(step, index, lesson.steps.length, byMint, glossaryById))
    .join("");
  return `<article class="leccion" id="${escapeHtml(lesson.id)}"><h3>${both(lesson.title)}</h3><p>${both(lesson.intro)}</p><div class="leccion-app" data-leccion="${escapeHtml(lesson.id)}"></div><div class="leccion-estatica"><p class="nota">${both({ es: "Sin JavaScript se pueden leer las preguntas y la corrección. El progreso local necesita el script de esta misma carpeta.", en: "Without JavaScript the questions and the correction can still be read. Local progress needs the script in this same folder." })}</p>${entenderBlock(lesson.entender)}${steps}<p>${both(lesson.closing)}</p></div></article>`;
}

function renderLab(repoRoot: string, cards: readonly CardSummary[], mission: Mission, options: RenderOptions): string {
  const byMint = new Map(cards.map((card) => [card.mint, card]));
  const glossary = loadGlossary(repoRoot);
  const glossaryById = new Map(glossary.entries.map((entry) => [entry.id, entry]));
  const lessons = loadLessons(repoRoot);
  const staticSteps = mission.steps.map((step, index) => staticStep(step, index, mission.steps.length, byMint, glossaryById)).join("");
  const terms = glossary.entries.map((entry) => glossaryArticle(entry)).join("");
  const revision = JSON.parse(readFileSync(path.join(repoRoot, "lab/library/revision.json"), "utf8")) as {
    enStatus: string;
    enStatusEn?: string;
  };
  const index = lessons
    .map((lesson) => `<a href="#${escapeHtml(lesson.id)}">${both(lesson.title)}</a>`)
    .join("");
  const lessonHtml = lessons.map((lesson) => renderLesson(lesson, byMint, glossaryById)).join("");
  const main = `<h1>${both({ es: "Lecciones cortas con fichas reales", en: "Short lessons with real cards" })}</h1>
<p class="lede">${both({ es: "Tres lecciones para empezar, con fichas de Verify del 2026-10-09, y la misión de cinco pasos. Si no aciertas, puedes volver a intentar. El progreso se queda en este navegador. No dice qué hacer con un token.", en: "Three lessons to start with, using Verify cards from 2026-10-09, and the five-step mission. If you miss, you can try again. Progress stays in this browser. It does not say what to do with a token." })}</p>
<section class="lecciones" id="lecciones"><h2>${both({ es: "Para empezar", en: "Start here" })}</h2><nav class="lecciones-indice" aria-label="${escapeHtml("Lecciones / Lessons")}">${index}<a href="#mision-titulo">${both({ es: "Misión de cinco pasos", en: "Five-step mission" })}</a></nav>${lessonHtml}</section>
${howDetails(HOW_LAB)}
<h2 id="mision-titulo" class="mision-titulo">${both(mission.title)}</h2>
<p class="mision-intro">${both(mission.intro)}</p>
<div id="mision-app" data-mission="${escapeHtml(mission.id)}"></div>
<div class="estatica" id="mision-estatica"><p class="nota">${both({ es: "Sin JavaScript se pueden leer los pasos, las explicaciones y la biblioteca. El progreso local necesita el script de esta misma carpeta.", en: "Without JavaScript the steps, explanations, and library can still be read. Local progress needs the script in this same folder." })}</p>${staticSteps}</div>
<details class="biblioteca-extra" id="biblioteca"><summary>${both({ es: "Para quien quiera más detalle", en: "For anyone who wants more detail" })}</summary><h2>${both({ es: "Biblioteca", en: "Library" })}</h2><p><a href="/aprender/">${both({ es: "Biblioteca para cualquier token", en: "Library for any token" })}</a></p><p class="muted">${both({ es: revision.enStatus, en: revision.enStatusEn || revision.enStatus })}</p><div class="fichas">${terms}</div><h2>${both({ es: "Guías", en: "Guides" })}</h2><div class="fichas">${guideSection(repoRoot)}</div></details>
<dialog id="ayuda" aria-labelledby="ayuda-titulo"><h2 id="ayuda-titulo"></h2><div id="ayuda-cuerpo"></div><form method="dialog"><button type="submit" id="ayuda-cerrar">${both({ es: "Cerrar", en: "Close" })}</button></form></dialog>`;
  return shell({
    title: "ORVUPI Lab · lecciones · borrador",
    description: "Tres lecciones cortas con fichas de Verify del 2026-10-09, y una misión para distinguir un mint del registro de un clon.",
    prefix: "../",
    current: "lab",
    main,
    mission: true,
    narrow: true,
    publish: options.publish,
  });
}

const NODES_NOTICE = new Set([
  "Para leerla en directo, se envía a los nodos públicos de Solana solana-rpc.publicnode.com y api.mainnet-beta.solana.com, que también ven tu IP.",
  "To read it live, it is sent to the Solana public nodes solana-rpc.publicnode.com and api.mainnet-beta.solana.com, which also see your IP.",
]);

function splitAviso(text: string): { lead: string; rest: string } {
  const parts = text.split(/(?<=\.)\s+/);
  const lead = parts.find((part) => NODES_NOTICE.has(part));
  if (!lead) throw new Error("El aviso no trae la frase de los nodos.");
  const rest = parts.filter((part) => part !== lead).join(" ");
  return { lead, rest };
}

function privacyNotice(): string {
  const es = splitAviso(PRIVACY_ES);
  const en = splitAviso(PRIVACY_EN);
  return `<div id="aviso-guardar" class="aviso-fijo privacidad"><p class="aviso-nodos">${both({ es: es.lead, en: en.lead })}</p><details class="aviso-resto"><summary>${both({ es: "Más detalle", en: "More detail" })}</summary><p>${both({ es: es.rest, en: en.rest })}</p></details></div>`;
}

function renderVerify(cards: readonly CardSummary[], glossaryEntries: readonly GlossaryEntry[], options: RenderOptions): string {
  const fields = ["name", "mint", "inRegistry", "mintAuthority", "freezeAuthority", "metadata", "holders", "impersonation", "statement", "curvePresent", "curveProgress"];
  const articles = cards
    .map((card) => {
      const meta = `<p class="muted">${escapeHtml(madridStamp(card.createdAt))} · id ${escapeHtml(card.id ?? "")} · ${both(card.partial ? { es: "parcial: sí", en: "partial: yes" } : { es: "parcial: no", en: "partial: no" })}</p>`;
      return `<article class="ficha" data-mint="${escapeHtml(card.mint)}">${meta}${cardInner(card, fields)}</article>`;
    })
    .join("");
  const help = glossaryEntries
    .filter((entry) =>
      ["direccion", "autoridad-emision", "autoridad-congelacion", "metadatos-mutables", "desconocido", "curva-pump", "suplantacion"].includes(entry.id),
    )
    .map((entry) => glossaryArticle(entry))
    .join("");
  const main = `<h1>${both({ es: "Comprueba una dirección", en: "Check an address" })}</h1>
<p class="lede">${both({ es: "Cualquier token SPL o Token-2022, leído en directo y solo en lectura. Las fichas de abajo son ejemplos fechados, no una lista completa.", en: "Any SPL or Token-2022 token, read live and read-only. The cards below are dated examples, not a complete list." })}</p>
<p class="aviso-fijo">${both({ es: AUDIT_ES, en: AUDIT_EN })}</p>
${howDetails(HOW_VERIFY)}
<div class="herramienta">
<form id="consulta" class="consulta" action="#">
<div class="consulta-barra">
<label for="direccion-token">${both({ es: "Pega la dirección del token", en: "Paste the token address" })}</label>
<input id="direccion-token" name="direccion" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="done">
<button type="submit">${both({ es: "Comprobar", en: "Check" })}</button>
<p id="direccion-error" class="campo-error" hidden>${both({ es: "Pega primero una dirección. Suele tener entre 32 y 44 letras y números.", en: "Paste an address first. It is usually 32 to 44 letters and numbers." })}</p>
</div>
${privacyNotice()}
</form>
<section id="resultado" class="resultado" data-state="vacio" data-luz="neutro" aria-live="polite">
<h2>${both({ es: "La lectura aparece aquí", en: "The reading shows up here" })}</h2>
<p class="apoyo">${both({ es: "La lectura será una de estas tres. Los detalles técnicos se quedan plegados.", en: "The reading will be one of these three. Technical details stay folded." })}</p>
<ul class="leyenda"><li data-luz="ok">${both({ es: "Dirección del registro de ORVUPI", en: "ORVUPI registry address" })}</li><li data-luz="atencion">${both({ es: "Se parece a ORVUPI, pero no es la CA oficial", en: "Looks like ORVUPI, but it is not the official CA" })}</li><li data-luz="neutro">${both({ es: "No se pudo comprobar", en: "Could not be checked" })}</li></ul>
</section>
</div>
<details class="tecnico archivo"><summary>${both({ es: "Fichas de ejemplo", en: "Example cards" })}</summary>
<p>${both({ es: "Son ejemplos, no una lista completa de clones. Si una ficha es parcial, el dato que falta no se rellena ni anula lo verificado.", en: "These are examples, not a complete list of clones. If a card is partial, the missing fact is not filled in and does not cancel what was verified." })}</p>
<div class="fichas">${articles}</div>
<div class="fichas">${help}</div>
</details>`;
  return shell({
    title: "ORVUPI Verify · borrador",
    description: "Comprueba una dirección con las fichas públicas de ORVUPI Verify del 2026-10-08.",
    prefix: "../",
    current: "verify",
    main,
    verify: true,
    narrow: true,
    publish: options.publish,
  });
}

const PERSON_EN: Record<string, string> = {
  "Equipo del repositorio": "Repository team",
  "Sin asignar": "Unassigned",
  "Pendiente de una persona distinta del autor, antes de publicar.":
    "Pending review by a person other than the author, before publication.",
  "Pendiente de personas ajenas al equipo, como pide la ficha, y de autorización para publicar.":
    "Pending review by people outside the team, as the record requires, and authorization to publish.",
  "El creador, antes de cualquier publicación, como pide la ficha.":
    "The creator, before any publication, as the record requires.",
  "Revisión lingüística humana pendiente. Hasta entonces, si hay diferencia, manda el español.":
    "Human language review pending. Until then, if there is a difference, the Spanish version prevails.",
  "Pendiente de una prueba con lector de pantalla por otra persona.":
    "Pending a screen-reader test by another person.",
  "No aplica todavía.": "Not applicable yet.",
  "Revisado por Legal.": "Reviewed by Legal.",
};

const MILESTONE_EN: Record<string, string> = {
  "[0.1.0] — 2026-10-10": "[0.1.0] — 2026-10-10",
  "2026-10-09 · Medición de uso: ninguna en el cliente":
    "2026-10-09 · Usage measurement: none on the client",
  "2026-09-26 · Esqueleto público (queda dentro de 0.1.0)":
    "2026-09-26 · Public skeleton (part of 0.1.0)",
  "2026-10-09 · Verify lee cualquier mint, solo lectura, sin publicar":
    "2026-10-09 · Verify reads any mint, read-only, unpublished",
  "2026-10-09 · Verify y Lab: lectura visible en el móvil":
    "2026-10-09 · Verify and Lab: the reading stays visible on a phone",
  "2026-10-09 · Revisión de seguridad de Verify y Lab (borrador, sin publicar)":
    "2026-10-09 · Verify and Lab security review (draft, unpublished)",
  "2026-10-09 · ORVUPI Lab, misión 1 (borrador, sin publicar)":
    "2026-10-09 · ORVUPI Lab, mission 1 (draft, unpublished)",
  "2026-10-08 · ORVUPI Verify (MVP, solo lectura)": "2026-10-08 · ORVUPI Verify (MVP, read-only)",
  "2026-10-05 · PPM: casilla Wallet → no aplica": "2026-10-05 · PPM: Wallet check → not applicable",
  "2026-10-05 · PPM: casilla Logs marcada": "2026-10-05 · PPM: Logs check marked",
  "Sin publicar": "Unpublished",
  "2026-10-09 · Biblioteca y cuaderno de solo lectura":
    "2026-10-09 · Read-only library and notebook",
  "2026-10-11 · Guardia: un formato invisible entre letras cuenta como espacio":
    "2026-10-11 · Guard: an invisible format character between letters counts as a space",
  "2026-10-11 · Frase de señales en la ficha vacía, el informe y la portada":
    "2026-10-11 · Signal wording on the empty card, the report, and the home page",
  "2026-10-11 · Revisar direcciones guardadas": "2026-10-11 · Recheck saved addresses",
  "2026-10-11 · Informe descargable": "2026-10-11 · Downloadable report",
  "2026-10-11 · Pie de riesgo y etiqueta de imagen retirados":
    "2026-10-11 · Risk footer and image label removed",
  "2026-10-11 · Datos de mercado en Verify, solo lectura":
    "2026-10-11 · Market data in Verify, read-only",
};

function personLabel(value: string): Localized {
  return { es: value, en: PERSON_EN[value] ?? value };
}

function editorEn(value: string): string {
  if (value === "Equipo del repositorio. La revisión por una persona distinta está pendiente.") {
    return "repository team. Review by a different person is pending.";
  }
  return value;
}

function milestoneEn(value: string): string {
  return MILESTONE_EN[value] ?? value;
}

function taskArticle(task: TaskRecord): string {
  const status = TASK_STATUS[task.status];
  const evidence = task.evidence
    .map((item) => {
      const href = safeHref(item.href);
      const where = href
        ? `<a href="${escapeHtml(href)}">${both(item.label)}</a>`
        : `${both(item.label)}${item.path ? ` <code>${escapeHtml(item.path)}</code>` : ""}`;
      return `<li>${where} — ${both(item.note)}</li>`;
    })
    .join("");
  const history = task.history.map((item) => `<li><time datetime="${escapeHtml(item.on)}">${escapeHtml(item.on)}</time> — ${both(item.change)}</li>`).join("");
  const block = task.block ? `<p>${both({ es: "Bloqueo: ", en: "Blocker: " })}${both(task.block)}</p>` : "";
  const reviewed = task.reviewedOn ?? "—";
  return `<article class="tarea" id="tarea-${escapeHtml(task.id)}" data-status="${escapeHtml(task.status)}" data-web="${task.webPublished ? "si" : "no"}"><h3>${escapeHtml(task.id)} · ${both(task.title)}</h3><p class="estado">${both(status)} · ${both(task.webPublished ? { es: "En stubxai.com: sí", en: "On stubxai.com: yes" } : { es: "En stubxai.com: no", en: "On stubxai.com: no" })}</p><p>${both(task.scope)}</p><dl><dt>${both({ es: "Responsable", en: "Owner" })}</dt><dd>${both(personLabel(task.owner))}</dd><dt>${both({ es: "Revisión", en: "Review" })}</dt><dd>${both(personLabel(task.reviewer))}</dd><dt>${both({ es: "Fecha de revisión del registro", en: "Record review date" })}</dt><dd>${escapeHtml(reviewed)}</dd></dl>${block}<h4>${both({ es: "Evidencia", en: "Evidence" })}</h4>${evidence ? `<ul>${evidence}</ul>` : `<p>${both({ es: "Todavía no hay evidencia de implementación.", en: "There is no implementation evidence yet." })}</p>`}<h4>${both({ es: "Historial", en: "History" })}</h4><ul>${history}</ul></article>`;
}

const STATUS_ORDER = ["en_revision", "en_curso", "propuesta", "publicada"] as const;

function renderBoard(repoRoot: string, board: BoardFile, options: RenderOptions): string {
  const changelog = changelogHeadings(readFileSync(path.join(repoRoot, "CHANGELOG.md"), "utf8"));
  const tests = listTestFiles(repoRoot);
  const rows = board.tasks
    .map((task) => {
      const status = TASK_STATUS[task.status];
      return `<tr><th scope="row"><a href="#tarea-${escapeHtml(task.id)}">${escapeHtml(task.id)}</a></th><td>${both(task.title)}</td><td>${both(status)}</td><td>${both(task.webPublished ? { es: "sí", en: "yes" } : { es: "no", en: "no" })}</td></tr>`;
    })
    .join("");
  const groups = STATUS_ORDER.map((status) => {
    const tasks = board.tasks.filter((task) => task.status === status);
    if (tasks.length === 0) return "";
    const label = TASK_STATUS[status];
    return `<section id="grupo-${escapeHtml(status)}"><h2>${both(label)}</h2>${tasks.map((task) => taskArticle(task)).join("")}</section>`;
  }).join("");
  const jumps = STATUS_ORDER.filter((status) => board.tasks.some((task) => task.status === status))
    .map((status) => `<a href="#grupo-${escapeHtml(status)}">${both(TASK_STATUS[status])}</a>`)
    .join("");
  const runs = board.ci.recordedRuns
    .map((run) => {
      const href = safeHref(run.url);
      const link = href ? `<a href="${escapeHtml(href)}">${escapeHtml(run.subject)}</a>` : escapeHtml(run.subject);
      return `<li>${link} · ${escapeHtml(run.observedOn)} · ${escapeHtml(run.conclusion)} · ${escapeHtml(run.names.join(", "))}. ${both(run.limit)}</li>`;
    })
    .join("");
  const ciHref = safeHref(board.ci.actionsUrl);
  const main = `<h1>${both({ es: "Tablero de construcción", en: "Construction board" })}</h1>
<p>${both(board.note)}</p>
<p class="muted">${both({ es: `Registro ${board.version}, revisado el ${board.updated}. Editor: ${board.editor}`, en: `Record ${board.version}, reviewed on ${board.updated}. Editor: ${editorEn(board.editor)}` })}</p>
<section class="card" id="como-leerlo">
<h2>${both({ es: "Cómo leerlo", en: "How to read it" })}</h2>
<ul class="clean">
<li>${both({ es: "Propuesta: es una idea. Todavía no hay una entrega que puedas abrir.", en: "Proposal: it is an idea. There is no delivery you can open yet." })}</li>
<li>${both({ es: "En curso o en revisión: hay trabajo en este repositorio. Puedes abrir la evidencia.", en: "In progress or in review: there is work in this repository. You can open the evidence." })}</li>
<li>${both({ es: "La columna stubxai.com dice sí solo si la función se puede abrir hoy en la web.", en: "The stubxai.com column says yes only if the function can be opened on the website today." })}</li>
<li>${both({ es: "Una fecha del historial dice cuándo se anotó el cambio. No es un plazo.", en: "A history date says when the change was written down. It is not a deadline." })}</li>
</ul>
</section>
<nav class="grupos" aria-label="${escapeHtml("Estados / States")}">${jumps}</nav>
<div class="tabla-scroll" tabindex="0"><table><caption>${both({ es: "Tareas de este registro", en: "Tasks in this record" })}</caption><thead><tr><th scope="col">ID</th><th scope="col">${both({ es: "Tarea", en: "Task" })}</th><th scope="col">${both({ es: "Estado", en: "State" })}</th><th scope="col">stubxai.com</th></tr></thead><tbody>${rows}</tbody></table></div>
<p>${both({ es: "Propuesta es una idea. En curso o en revisión es trabajo en el repositorio. Publicada sería una función ya en stubxai.com.", en: "Proposal means an idea. In progress or in review means work in the repository. Published would mean a function already on stubxai.com." })}</p>
<div class="tareas">${groups}</div>
<section class="card" id="plantilla">
<h2>${both({ es: "Plantilla para copiar", en: "Template to copy" })}</h2>
<p>${both({ es: "El tablero de arriba es el de ORVUPI. La plantilla vacía no trae un token: otro proyecto puede copiar el archivo y rellenar su propio trabajo. Copiarla no hace socio ni representante de ORVUPI, y no avala ningún token.", en: "The board above is ORVUPI’s. The empty template carries no token: another project can copy the file and fill in its own work. Copying it does not make anyone a partner or a representative of ORVUPI, and it endorses no token." })}</p>
<p><a class="primary" href="/modules/tablero/plantilla.json">${both({ es: "Descargar plantilla.json", en: "Download plantilla.json" })}</a></p>
<p class="source">${both({ es: "Licencia MIT, la misma del código. El archivo no se envía a ningún sitio al descargarlo.", en: "MIT license, the same as the code. Downloading the file does not send it anywhere." })}</p>
</section>
<section><h2>${both({ es: "Integración continua", en: "Continuous integration" })}</h2><p><code>${escapeHtml(board.ci.workflow)}</code> · Node ${escapeHtml(board.ci.node)}</p><p>${both(board.ci.whatItRuns)}</p><p>${both(board.ci.limit)}</p>${ciHref ? `<p><a href="${escapeHtml(ciHref)}">${both({ es: "Workflow en Actions", en: "Workflow on Actions" })}</a></p>` : ""}<ul>${runs}</ul></section>
<section><h2>${both({ es: "Pruebas en el repositorio", en: "Tests in the repository" })}</h2><ul>${tests.map((file) => `<li><code>${escapeHtml(file)}</code></li>`).join("")}</ul></section>
<section><h2>${both({ es: "Hitos copiados de CHANGELOG.md", en: "Milestones copied from CHANGELOG.md" })}</h2><p class="muted">${both({ es: "Son encabezados del archivo, no compromisos de esta página.", en: "They are headings from the file, not commitments of this page." })}</p><ul>${changelog.map((line) => `<li>${both({ es: line, en: milestoneEn(line) })}</li>`).join("")}</ul></section>`;
  return shell({
    title: "ORVUPI · tablero de construcción · borrador",
    description: "Tablero estático del trabajo de ORVUPI, generado desde el repositorio y no publicado.",
    prefix: "../",
    current: "tablero",
    main,
    publish: options.publish,
  });
}

function renderIndex(options: RenderOptions): string {
  const main = `<h1>${both({ es: "Borradores para la web", en: "Drafts for the website" })}</h1>
<p>${both({ es: "Tres páginas estáticas listas para copiar a stubxai.com cuando haya autorización. Este índice no se llama index.html: no sustituye la portada.", en: "Three static pages ready to copy onto stubxai.com when there is authorization. This index is not named index.html: it does not replace the homepage." })}</p>
<ul>
<li><a href="./verify/index.html">/verify</a> — ${both({ es: "lectura en vivo y fichas de ejemplo", en: "live reading and example cards" })}</li>
<li><a href="./lab/index.html">/lab</a> — ${both({ es: "misión 1", en: "mission 1" })}</li>
<li><a href="./tablero/index.html">/tablero</a> — ${both({ es: "tablero de construcción", en: "construction board" })}</li>
</ul>`;
  return shell({
    title: "ORVUPI · borradores sin publicar",
    description: "Índice local de los borradores de Verify, Lab y el tablero.",
    prefix: "",
    current: "index",
    main,
    publish: options.publish,
  });
}

export type BuiltPage = { rel: string; body: string };

export type RenderOptions = { publish?: boolean };

export function renderPages(repoRoot: string, cards: readonly CardSummary[], options: RenderOptions = {}): BuiltPage[] {
  const mission = loadMission(repoRoot);
  const glossary = loadGlossary(repoRoot);
  const board = loadBoard(repoRoot);
  return [
    { rel: "site-drafts/indice-borrador.html", body: renderIndex(options) },
    { rel: "site-drafts/verify/index.html", body: renderVerify(cards, glossary.entries, options) },
    { rel: "site-drafts/lab/index.html", body: renderLab(repoRoot, cards, mission, options) },
    { rel: "site-drafts/tablero/index.html", body: renderBoard(repoRoot, board, options) },
    { rel: "site-drafts/lab/sw.js", body: renderLabWorker() },
    { rel: "site-drafts/_headers", body: renderHeaders() },
  ];
}

export function renderLabWorker(): string {
  return `var CACHE = "stubx-lab-2026-10-09-5";
var FILES = ["./index.html", "./sw.js"];
var ALLOWED = { "/lab/": true, "/lab/index.html": true, "/lab/sw.js": true };

function cacheable(url) {
  return url.search === "" && ALLOWED[url.pathname] === true;
}

function blocked(url) {
  var path = url.pathname;
  if (path === "/" || path === "/index.html") return true;
  if (/\\/(?:aviso|avisos|notice|notices)(?:\\/|$)/i.test(path)) return true;
  if (path.indexOf("/lab/") === -1 && !/\\/lab$/.test(path)) return true;
  return false;
}

self.addEventListener("install", function (event) {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(function (cache) {
    return cache.addAll(FILES);
  }));
});

self.addEventListener("activate", function (event) {
  event.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (key) {
      return key !== CACHE;
    }).map(function (key) {
      return caches.delete(key);
    }));
  }).then(function () {
    return self.clients.claim();
  }));
});

self.addEventListener("fetch", function (event) {
  var url = new URL(event.request.url);
  if (url.origin !== self.location.origin || event.request.method !== "GET") return;
  if (blocked(url)) return;
  event.respondWith(fetch(event.request).then(function (response) {
    if (response && response.ok && cacheable(url)) {
      var copy = response.clone();
      caches.open(CACHE).then(function (cache) {
        return cache.put(url.pathname, copy);
      });
    }
    return response;
  }).catch(function () {
    return caches.match(url.pathname);
  }));
});
`;
}

function rpcOrigins(): string[] {
  const limitsPath = path.join(repoRootFromMeta(import.meta.url), "verify/policy/limits.json");
  const limits = JSON.parse(readFileSync(limitsPath, "utf8")) as { defaultRpcUrl?: string; fallbackRpcUrl?: string };
  const origins: string[] = [];
  for (const raw of [limits.defaultRpcUrl, limits.fallbackRpcUrl]) {
    if (!raw) {
      throw new Error("limits.json no trae los dos servicios de lectura.");
    }
    const url = new URL(raw);
    if (url.protocol !== "https:") {
      throw new Error(`El servicio de lectura tiene que ser https: ${raw}`);
    }
    const origin = url.origin;
    if (!origins.includes(origin)) {
      origins.push(origin);
    }
  }
  return origins;
}

export function renderHeaders(): string {
  const shared = [
    "X-Content-Type-Options: nosniff",
    "Referrer-Policy: no-referrer",
    "Permissions-Policy:",
  ];
  const selfCsp =
    "Content-Security-Policy: default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; manifest-src 'self'; worker-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
  const verifyCsp = selfCsp.replace(
    "connect-src 'self'",
    `connect-src 'self' ${rpcOrigins().join(" ")} https://api.dexscreener.com`,
  );
  const blocks: Array<[string, string]> = [
    ["/verify/*", verifyCsp],
    ["/verify/index.html", verifyCsp],
    ["/lab/*", selfCsp],
    ["/lab/index.html", selfCsp],
    ["/lab/sw.js", selfCsp],
    ["/tablero/*", selfCsp],
    ["/tablero/index.html", selfCsp],
    ["/indice-borrador.html", selfCsp],
  ];
  return `${blocks
    .map(([item, csp]) => {
      const lines = item.startsWith("/verify") ? ["! Content-Security-Policy", csp, ...shared] : [csp, ...shared];
      return `${item}\n  ${lines.join("\n  ")}`;
    })
    .join("\n\n")}\n`;
}

function madridStamp(iso: string | null): string {
  if (!iso) {
    return "";
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  const formatted = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
  return `${formatted} Europe/Madrid`;
}
