import { canonicalJson, describePair, drawSnapshot, evidenceRecord, FEE_CAVEAT, GLOBAL_FEE_ACCOUNT, PUBLIC_WARNING, readWithinLimit, sha256Hex, snapshotLines } from "../modules/pair-report.mjs";

const TEXT = {
  direccion: ["Esa dirección no es válida. Suele tener entre 32 y 44 letras y números.", "That address is not valid. It is usually 32 to 44 letters and numbers."],
  no_mint: ["Esa cuenta no es un mint. No hay informe.", "That account is not a mint. There is no report."],
  limite: ["El servicio limitó la consulta. No se inventa ningún dato. Puedes volver a leer.", "The service limited the query. No data is invented. You can read again."],
  tiempo: ["El servicio no respondió a tiempo. No se inventa ningún dato. Puedes volver a leer.", "The service did not answer in time. No data is invented. You can read again."],
  red: ["El servicio no respondió. No se inventa ningún dato. Puedes volver a leer.", "The service did not answer. No data is invented. You can read again."],
  minuto: ["Se han hecho 6 lecturas en un minuto. Espera un momento antes de comprobar otra. No se inventa ningún dato.", "6 readings were made in one minute. Wait a moment before checking another. No data is invented."],
  leyendo: ["Leyendo datos públicos. No se firma nada.", "Reading public data. Nothing is signed."],
};

let current = null;
let queryStamps = [];

function lang() {
  return document.documentElement.dataset.lang === "en" ? "en" : "es";
}

function span(es, en) {
  const wrap = document.createDocumentFragment();
  const left = document.createElement("span");
  left.className = "lang es";
  left.lang = "es";
  left.textContent = es;
  const right = document.createElement("span");
  right.className = "lang en";
  right.lang = "en";
  right.textContent = en;
  wrap.append(left, right);
  return wrap;
}

function show(lines) {
  const out = document.querySelector("#resultado");
  if (!out) return;
  out.replaceChildren();
  const title = document.createElement("h2");
  title.append(span("Informe", "Report"));
  out.append(title);
  for (const item of lines) {
    const p = document.createElement("p");
    p.append(span(item.es, item.en));
    out.append(p);
  }
  out.tabIndex = -1;
  out.focus();
}

function showReading(evidence, digest) {
  const out = document.querySelector("#resultado");
  if (!out) return;
  out.replaceChildren();
  const title = document.createElement("h2");
  title.append(span("Informe", "Report"));
  out.append(title);
  const strip = document.createElement("p");
  strip.className = "franja-identidad";
  strip.append(
    span(
      evidence.official
        ? "Identidad del proyecto: esta dirección coincide con la del proyecto."
        : "Identidad del proyecto, aparte de este análisis: ORVUPI no revisa ni respalda este token.",
      evidence.official
        ? "Project identity: this address matches the project one."
        : "Project identity, separate from this analysis: ORVUPI does not review or endorse this token.",
    ),
  );
  out.append(strip);
  for (const item of pageLines(evidence, digest)) {
    const p = document.createElement("p");
    p.append(span(item.es, item.en));
    out.append(p);
  }
  const details = document.createElement("details");
  details.className = "tecnico";
  const summary = document.createElement("summary");
  summary.append(span("Detalles técnicos", "Technical details"));
  const slot = document.createElement("p");
  slot.append(
    span(
      evidence.slot === null ? "El momento de la red no se leyó. No se inventa un número." : `Momento de la red: ${evidence.slot}.`,
      evidence.slot === null ? "The network moment was not read. A number is not invented." : `Network moment: ${evidence.slot}.`,
    ),
  );
  details.append(summary, slot);
  out.append(details);
  out.tabIndex = -1;
  out.focus();
}

function fail(code) {
  current = null;
  const exportButton = document.querySelector("#exportar");
  if (exportButton) exportButton.hidden = true;
  const pair = TEXT[code] ?? TEXT.red;
  show([{ es: pair[0], en: pair[1] }]);
}

function hosts(reads) {
  const found = [];
  for (const row of reads ?? []) {
    try {
      const host = new URL(row.endpoint).host;
      if (host && !found.includes(host)) found.push(host);
    } catch {
      /* una fuente ilegible no se inventa */
    }
  }
  return found;
}

function feeLine(field, offset, bps) {
  if (bps === null) {
    return {
      es: `Cuenta Global de Pump.fun ${GLOBAL_FEE_ACCOUNT}, campo ${field}, desplazamiento ${offset}: no se leyó. No se pone cero en su lugar. ${FEE_CAVEAT.es}`,
      en: `Pump.fun Global account ${GLOBAL_FEE_ACCOUNT}, field ${field}, offset ${offset}: not read. Zero is not used in its place. ${FEE_CAVEAT.en}`,
    };
  }
  const percentEs = (bps / 100).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const percentEn = (bps / 100).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return {
    es: `Leído en la cuenta Global de Pump.fun ${GLOBAL_FEE_ACCOUNT}, campo ${field}, desplazamiento ${offset}: ${bps} diezmilésimas (${percentEs} %). ${FEE_CAVEAT.es}`,
    en: `Read on the Pump.fun Global account ${GLOBAL_FEE_ACCOUNT}, field ${field}, offset ${offset}: ${bps} basis points (${percentEn}%). ${FEE_CAVEAT.en}`,
  };
}

function pageLines(evidence, digest) {
  const curve = {
    abierta: ["Curva: abierta.", "Curve: open."],
    completa: ["Curva: completa.", "Curve: complete."],
    sin_curva: ["Curva: no hay curva.", "Curve: no curve."],
  }[evidence.curve] ?? ["Curva: no disponible.", "Curve: unavailable."];
  const base = evidence.base === "desconocida"
    ? ["Moneda base: desconocida.", "Base currency: unknown."]
    : [`Moneda base: ${evidence.base}.`, `Base currency: ${evidence.base}.`];
  const lines = [
    { es: PUBLIC_WARNING.es, en: PUBLIC_WARNING.en },
    { es: "No se inventa ningún dato.", en: "No data is invented." },
    { es: "No es una auditoría ni una recomendación. Muestra datos públicos de la cadena en el momento indicado; no dice si un token es bueno, seguro o una buena compra.", en: "It is not an audit or a recommendation. It shows public chain data at the stated time; it does not say whether a token is good, safe, or a good purchase." },
    { es: `Token analizado: ${evidence.mint}`, en: `Token analyzed: ${evidence.mint}` },
  ];
  lines.push({ es: "Un emparejamiento no es una colaboración ni un respaldo.", en: "A pairing is not a collaboration or an endorsement." });
  if (evidence.name) lines.push({ es: `Nombre leído: ${evidence.name}. Es un texto de la cuenta, no un aval.`, en: `Name read: ${evidence.name}. It is account text, not an endorsement.` });
  else lines.push({ es: "Nombre: no disponible. No se rellena.", en: "Name: not available. It is not filled in." });
  if (evidence.uri) lines.push({ es: `Enlace de metadatos, no se abre: ${evidence.uri}`, en: `Metadata link, not opened: ${evidence.uri}` });
  lines.push(
    { es: base[0], en: base[1] },
    { es: curve[0], en: curve[1] },
    feeLine("fee_basis_points", 105, evidence.protocolFeeBps),
    feeLine("creator_fee_basis_points", 154, evidence.creatorFeeBps),
    { es: `Hora UTC: ${evidence.readAt}`, en: `UTC time: ${evidence.readAt}` },
    { es: `Fuente de las lecturas que respondieron: ${evidence.source}`, en: `Source of the reads that answered: ${evidence.source}` },
    { es: "Instantánea: puede haber cambiado.", en: "Snapshot: it may have changed." },
    { es: `sha256: ${digest}`, en: `sha256: ${digest}` },
    { es: "El hash detecta cambios respecto a esta evidencia. No certifica que sea verdad.", en: "The hash detects changes against this evidence. It does not certify that it is true." },
  );
  return lines;
}

function download(filename, blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function exportReport() {
  if (!current) return;
  const lines = snapshotLines(current.evidence, lang());
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  drawSnapshot(ctx, lines);
  const png = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!png) return;
  const stem = `pares-${current.evidence.mint.slice(0, 8)}`;
  download(`${stem}.png`, png);
  download(`${stem}.json`, new Blob([`${current.json}\n`], { type: "application/json" }));
}

async function onSubmit(event) {
  event.preventDefault();
  const address = document.querySelector("#direccion-token");
  const button = event.submitter ?? document.querySelector("#consulta button[type='submit']");
  if (!address || !address.value.trim()) {
    fail("direccion");
    return;
  }
  if (button) button.disabled = true;
  fail("leyendo");
  try {
    const gate = await readWithinLimit(queryStamps, Date.now(), () => readCurveState(address.value));
    queryStamps = gate.stamps;
    if (!gate.allowed) {
      fail("minuto");
      return;
    }
    const state = gate.result;
    if (!state.ok) {
      fail(TEXT[state.code] ? state.code : "red");
      return;
    }
    const pair = describePair(state);
    if (!pair.ok) {
      fail("red");
      return;
    }
    const evidence = evidenceRecord({
      mint: state.mint,
      name: state.metadata?.name || null,
      uri: state.metadata?.uri || null,
      base: pair.base,
      curve: pair.curve,
      protocolFeeBps: pair.protocolFeeBps,
      creatorFeeBps: pair.creatorFeeBps,
      slot: state.slot,
      source: hosts(state.reads).join(", ") || "no disponible",
      readAt: state.fetchedAt,
    });
    const canonical = canonicalJson(evidence);
    const digest = await sha256Hex(canonical);
    current = { evidence, json: JSON.stringify({ evidence, sha256: digest }, null, 2) };
    const exportButton = document.querySelector("#exportar");
    if (exportButton) exportButton.hidden = false;
    showReading(evidence, digest);
  } catch {
    fail("red");
  } finally {
    if (button) button.disabled = false;
  }
}

const form = document.querySelector("#consulta");
form?.addEventListener("submit", onSubmit);
document.querySelector("#exportar")?.addEventListener("click", () => {
  exportReport().catch(() => fail("red"));
});
