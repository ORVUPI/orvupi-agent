import { DISCLAIMER, type Field, type Finding, type Report } from "./types.js";

export function reportJson(report: Report): string {
  return `${JSON.stringify(report, null, 2)}\n`;
}

export function reportMarkdown(report: Report): string {
  const lines: string[] = [
    "# Ficha ORVUPI Verify",
    "",
    `> ${escapeMd(report.disclaimer)}`,
    "",
    `- Id: \`${report.id}\``,
    `- Reglas: \`${report.rulesVersion}\``,
    `- Red: \`${report.network}\``,
    `- RPC: \`${escapeMd(report.rpcEndpoint)}\``,
    `- Mint: \`${report.mint}\``,
    `- Creada (UTC): ${report.createdAt}`,
    `- Slot de referencia: ${report.referenceSlot ?? "no disponible"}`,
    `- Parcial: ${report.partial ? "sí" : "no"}`,
    `- Mint soportado: ${report.supportedMint ? "sí" : "no"}`,
    "",
    "Esta exportación no se actualiza sola. Una consulta nueva crea otro id.",
    "",
    "## Hallazgos",
    "",
    ...report.findings.map((item) => `- **${levelLabel(item.level)}** · ${escapeMd(item.title)}. ${escapeMd(item.reason)}`),
    "",
    "## Identidad",
    "",
    ...section(report.identity, {
      ownerProgram: "Programa propietario",
      standard: "Estándar",
      decimals: "Decimales",
      supplyRaw: "Suministro (unidades mínimas)",
      supplyUi: "Suministro",
      onChainName: "Nombre on-chain",
      onChainSymbol: "Símbolo on-chain",
      uri: "URI",
      jsonName: "Nombre en el JSON",
      jsonSymbol: "Símbolo en el JSON",
      image: "Imagen",
      imageSha256: "sha256 de la imagen",
      website: "Web",
      twitter: "Red social",
      telegram: "Telegram",
      description: "Descripción (texto del JSON, no de Verify)",
    }),
    "",
    "## Permisos",
    "",
    ...section(report.permissions, {
      mintAuthority: "Autoridad de emisión",
      freezeAuthority: "Autoridad de congelación",
      metaplexUpdateAuthority: "Update authority (Metaplex)",
      metaplexMutable: "Metadatos Metaplex mutables",
      tokenMetadataUpdateAuthority: "Update authority (Token-2022)",
      extensions: "Extensiones",
    }),
    "",
    "## Distribución",
    "",
    ...section(report.distribution, {
      denominatorRaw: "Denominador",
      sample: "Muestra de mayores cuentas",
      largestNonTechnicalPercent: "Mayor cuenta sin etiqueta técnica",
    }),
    "",
    "## Mercado",
    "",
    ...section(report.market, {
      module: "Módulo",
      bondingCurve: "PDA de la curva",
      present: "Cuenta de curva presente",
      complete: "complete",
      virtualTokenReserves: "Reserva virtual de tokens",
      virtualQuoteReserves: "Reserva virtual quote",
      realTokenReserves: "Reserva real de tokens",
      realQuoteReserves: "Reserva real quote",
      curveTokenSupply: "Suministro en la cuenta de la curva",
      creator: "Creator de la cuenta",
      quoteMint: "Mint quote",
      progressPercent: "Avance de la curva clásica",
    }),
    "",
    "## Autenticidad",
    "",
    ...section(report.authenticity, {
      inRegistry: "En el registro curado",
      registryId: "Id del registro",
      signals: "Señales",
      statement: "Lectura",
    }),
    "",
    "## Limitaciones",
    "",
    ...report.limitations.map((item) => `- ${escapeMd(item)}`),
    "",
    "## Cómo reproducir un campo",
    "",
    "Cada campo de arriba lleva método, cuenta, slot y hora. Para repetir una lectura de cuenta:",
    "",
    "```",
    `curl ${report.rpcEndpoint} -H 'content-type: application/json' -d '{"jsonrpc":"2.0","id":1,"method":"getAccountInfo","params":["${report.mint}",{"encoding":"base64","commitment":"confirmed"}]}'`,
    "```",
    "",
    "El detalle de offsets y de la curva está en `verify/README.md`.",
    "",
  ];
  return lines.join("\n");
}

export function reportHtml(report: Report): string {
  const findings = report.findings.map((item) => findingHtml(item)).join("\n");
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>ORVUPI Verify ${escapeHtml(report.mint)}</title>
<style>
  body { font-family: Georgia, serif; margin: 2rem auto; max-width: 46rem; line-height: 1.45; color: #1c1917; background: #fafaf9; }
  h1, h2 { font-family: system-ui, sans-serif; }
  .note { background: #fff7ed; border: 1px solid #fdba74; padding: 0.8rem 1rem; }
  .meta { font-family: ui-monospace, monospace; font-size: 0.92rem; }
  article { border-top: 1px solid #e7e5e4; padding: 0.6rem 0; }
  .level { font-family: system-ui, sans-serif; font-weight: 700; }
  .ok { color: #166534; }
  .atencion { color: #9a3412; }
  .riesgo { color: #991b1b; }
  .neutro { color: #44403c; }
  dt { font-weight: 700; margin-top: 0.8rem; }
  dd { margin: 0.2rem 0 0.6rem; }
  code { font-family: ui-monospace, monospace; }
</style>
</head>
<body>
<h1>Ficha ORVUPI Verify</h1>
<p class="note" role="note">${escapeHtml(DISCLAIMER)}</p>
<p class="meta">Id <code>${escapeHtml(report.id)}</code><br>
Reglas ${escapeHtml(report.rulesVersion)} · red ${escapeHtml(report.network)} · RPC ${escapeHtml(report.rpcEndpoint)}<br>
Mint <code>${escapeHtml(report.mint)}</code><br>
Creada ${escapeHtml(report.createdAt)} · slot ${escapeHtml(String(report.referenceSlot ?? "no disponible"))} · parcial ${report.partial ? "sí" : "no"}</p>
<p>Esta página es estática. No se actualiza sola y no llama a ninguna red.</p>
<h2>Hallazgos</h2>
${findings}
<h2>Identidad</h2>
${htmlSection(report.identity, {
    ownerProgram: "Programa propietario",
    standard: "Estándar",
    decimals: "Decimales",
    supplyRaw: "Suministro (unidades mínimas)",
    supplyUi: "Suministro",
    onChainName: "Nombre on-chain",
    onChainSymbol: "Símbolo on-chain",
    uri: "URI",
    jsonName: "Nombre en el JSON",
    jsonSymbol: "Símbolo en el JSON",
    image: "Imagen",
    imageSha256: "sha256 de la imagen",
    website: "Web",
    twitter: "Red social",
    telegram: "Telegram",
    description: "Descripción (texto del JSON, no de Verify)",
  })}
<h2>Permisos</h2>
${htmlSection(report.permissions, {
    mintAuthority: "Autoridad de emisión",
    freezeAuthority: "Autoridad de congelación",
    metaplexUpdateAuthority: "Update authority (Metaplex)",
    metaplexMutable: "Metadatos Metaplex mutables",
    tokenMetadataUpdateAuthority: "Update authority (Token-2022)",
    extensions: "Extensiones",
  })}
<h2>Distribución</h2>
${htmlSection(report.distribution, {
    denominatorRaw: "Denominador",
    sample: "Muestra de mayores cuentas",
    largestNonTechnicalPercent: "Mayor cuenta sin etiqueta técnica",
  })}
<h2>Mercado</h2>
${htmlSection(report.market, {
    module: "Módulo",
    bondingCurve: "PDA de la curva",
    present: "Cuenta de curva presente",
    complete: "complete",
    virtualTokenReserves: "Reserva virtual de tokens",
    virtualQuoteReserves: "Reserva virtual quote",
    realTokenReserves: "Reserva real de tokens",
    realQuoteReserves: "Reserva real quote",
    curveTokenSupply: "Suministro en la cuenta de la curva",
    creator: "Creator de la cuenta",
    quoteMint: "Mint quote",
    progressPercent: "Avance de la curva clásica",
  })}
<h2>Autenticidad</h2>
${htmlSection(report.authenticity, {
    inRegistry: "En el registro curado",
    registryId: "Id del registro",
    signals: "Señales",
    statement: "Lectura",
  })}
<h2>Limitaciones</h2>
<ul>
${report.limitations.map((item) => `<li>${escapeHtml(item)}</li>`).join("\n")}
</ul>
</body>
</html>
`;
}

function findingHtml(item: Finding): string {
  const neutral = item.id === "authenticity" && item.level === "ok" && item.title.startsWith("Sin señales");
  const cls = neutral ? "neutro" : item.level === "atención" ? "atencion" : item.level;
  const label = neutral ? "sin señal" : levelLabel(item.level);
  return `<article><p><span class="level ${cls}">${escapeHtml(label)}</span> · ${escapeHtml(item.title)}</p><p>${escapeHtml(item.reason)}</p></article>`;
}

function levelLabel(level: Finding["level"]): string {
  if (level === "ok") {
    return "ok";
  }
  if (level === "atención") {
    return "atención";
  }
  return "riesgo";
}

function section(data: Record<string, Field>, labels: Record<string, string>): string[] {
  const lines: string[] = [];
  for (const [key, label] of Object.entries(labels)) {
    const item = data[key];
    if (!item) {
      continue;
    }
    lines.push(`### ${label}`, "", formatField(item), "");
  }
  return lines;
}

function htmlSection(data: Record<string, Field>, labels: Record<string, string>): string {
  const rows = Object.entries(labels).map(([key, label]) => {
    const item = data[key];
    if (!item) {
      return "";
    }
    return `<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(plainField(item))}</dd>`;
  });
  return `<dl>${rows.join("")}</dl>`;
}

function formatField(item: Field): string {
  return escapeMd(plainField(item));
}

function plainField(item: Field): string {
  const value = item.value === null ? "—" : stringify(item.value);
  const unit = item.unit ? ` ${item.unit}` : "";
  const source = item.source
    ? ` Fuente: ${item.source.method}${item.source.account ? ` · cuenta ${item.source.account}` : ""} · slot ${item.source.slot ?? "—" } · ${item.source.fetchedAt}${item.source.detail ? ` · ${item.source.detail}` : ""}.`
    : "";
  const note = item.note ? ` Nota: ${item.note}` : "";
  return `${value}${unit}. Estado: ${item.status}.${source}${note}`;
}

function stringify(value: unknown): string {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value);
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeMd(value: string): string {
  return escapeHtml(value).replace(/`/g, "'");
}
