import { createHash } from "node:crypto";
import { canonicalJson, formatUnits, percentTruncated } from "./bytes.js";
import { fetchBytes, fetchJson, sha256Hex } from "./http.js";
import { compareCanonical } from "./impersonation.js";
import { decodeMetaplex, readJsonMetadata } from "./metadata.js";
import { decodeMint, readTokenAccount } from "./mint.js";
import { PUMP_PROGRAM, associatedTokenAddress, bondingCurvePda, metadataPda } from "./programs.js";
import { decodeBondingCurve } from "./pump.js";
import { type AccountInfo, type ChainReader, type RpcResult } from "./rpc.js";
import {
  DISCLAIMER,
  LEGITIMACY_LIMIT,
  RULES_VERSION,
  field,
  type CanonicalToken,
  type ExtensionReport,
  type Field,
  type Finding,
  type HolderRow,
  type Report,
  type Source,
} from "./types.js";

const NO_RESPONSE = "Sin respuesta utilizable. No se interpreta como autoridad revocada, como inmutabilidad ni como cantidad cero.";

export type BuildInput = {
  mint: string;
  rpc: ChainReader;
  rpcEndpoint: string;
  registry: readonly CanonicalToken[];
  now?: () => Date;
  attentionBps?: number;
  loadMetadata?: typeof fetchJson;
  loadImage?: typeof fetchBytes;
};

export async function buildReport(input: BuildInput): Promise<Report> {
  const now = input.now ?? (() => new Date());
  const createdAt = now().toISOString();
  const attentionBps = input.attentionBps ?? 2000;
  const loadMetadata = input.loadMetadata ?? fetchJson;
  const loadImage = input.loadImage ?? fetchBytes;
  const failures: string[] = [];
  const slots = new Set<number>();
  const endpoint = redactEndpoint(input.rpcEndpoint);

  const slotResult = await input.rpc.getSlot();
  remember(slotResult, slots);
  if (!slotResult.ok) {
    failures.push(`getSlot: ${slotResult.error}`);
  }

  const mintInfo = await input.rpc.getAccountInfo(input.mint);
  remember(mintInfo, slots);
  if (!mintInfo.ok) {
    failures.push(`getAccountInfo del mint: ${mintInfo.error}`);
  }

  const account = mintInfo.ok ? mintInfo.value : null;
  const decoded = account && !account.executable ? decodeMint(account.owner, account.data) : null;
  const supportedMint = Boolean(decoded && decoded.initialized && !account?.executable);
  const exists = mintInfo.ok && mintInfo.value !== null;
  const missing = mintInfo.ok && mintInfo.value === null;

  const metaPda = metadataPda(input.mint);
  const curvePda = bondingCurvePda(input.mint);
  const shouldReadChain = supportedMint || !mintInfo.ok;

  const metaInfo = shouldReadChain ? await input.rpc.getAccountInfo(metaPda) : null;
  const curveInfo = shouldReadChain ? await input.rpc.getAccountInfo(curvePda) : null;
  const supplyInfo = shouldReadChain ? await input.rpc.getTokenSupply(input.mint) : null;
  const largestInfo = shouldReadChain ? await input.rpc.getTokenLargestAccounts(input.mint) : null;
  if (metaInfo) {
    remember(metaInfo, slots);
  }
  if (curveInfo) {
    remember(curveInfo, slots);
  }
  if (supplyInfo) {
    remember(supplyInfo, slots);
  }
  if (largestInfo) {
    remember(largestInfo, slots);
  }
  if (metaInfo && !metaInfo.ok) {
    failures.push(`getAccountInfo de metadatos Metaplex: ${metaInfo.error}`);
  }
  if (curveInfo && !curveInfo.ok) {
    failures.push(`getAccountInfo de la curva: ${curveInfo.error}`);
  }
  if (supplyInfo && !supplyInfo.ok) {
    failures.push(`getTokenSupply: ${supplyInfo.error}`);
  }
  if (largestInfo && !largestInfo.ok) {
    failures.push(`getTokenLargestAccounts: ${largestInfo.error}`);
  }

  const mintSource = accountSource(mintInfo, input.mint, "Cuenta del mint, encoding base64, decodificada en local.");
  let supplyRaw = decoded?.supplyRaw ?? null;
  let decimals = decoded?.decimals ?? null;
  let supplyFieldSource = mintSource;
  let supplyNote = "Suministro leído de los bytes del mint (u64 little-endian en el offset 36).";
  let mismatch = false;
  if (supplyInfo?.ok) {
    const remote = supplyInfo.value;
    if (supplyRaw !== null && decimals !== null && (remote.amount !== supplyRaw.toString() || remote.decimals !== decimals)) {
      mismatch = true;
      supplyNote = `Los bytes del mint dicen ${supplyRaw.toString()} con ${decimals} decimales; getTokenSupply dice ${remote.amount} con ${remote.decimals}. No se calculan porcentajes.`;
      failures.push("getTokenSupply no coincide con los bytes del mint");
    } else if (supplyRaw === null) {
      supplyRaw = BigInt(remote.amount);
      decimals = remote.decimals;
      supplyFieldSource = {
        method: "getTokenSupply",
        account: input.mint,
        slot: supplyInfo.slot,
        fetchedAt: supplyInfo.fetchedAt,
        detail: "Se usa la cadena amount y se ignora uiAmount.",
      };
      supplyNote = "El suministro sale de getTokenSupply porque los bytes del mint no estaban disponibles.";
    } else {
      supplyNote = `${supplyNote} Coincide con getTokenSupply (amount, no uiAmount).`;
    }
  } else if (!decoded) {
    supplyFieldSource = supplyInfo && !supplyInfo.ok
      ? failSource("getTokenSupply", input.mint, supplyInfo)
      : null;
    supplyNote = NO_RESPONSE;
  }

  const curve = curveInfo?.ok && curveInfo.value ? decodeBondingCurve(curveInfo.value.owner, curveInfo.value.data) : null;
  const curveAccountSource = curveInfo ? accountSource(curveInfo, curvePda, "PDA derivada con las semillas bonding-curve y el mint, programa Pump.fun.") : null;
  const technical = new Set<string>();
  if (supportedMint && decoded) {
    const ata = associatedTokenAddress(curvePda, input.mint, account?.owner ?? "");
    if (ata) {
      technical.add(ata);
    }
  }

  let holderAccounts: RpcResult<(AccountInfo | null)[]> | null = null;
  const largest = largestInfo?.ok ? largestInfo.value.slice(0, 20) : [];
  if (largest.length > 0) {
    holderAccounts = await input.rpc.getMultipleAccounts(largest.map((row) => row.address));
    remember(holderAccounts, slots);
    if (!holderAccounts.ok) {
      failures.push(`getMultipleAccounts de la muestra: ${holderAccounts.error}`);
    }
  }

  const denominator = !mismatch && supplyRaw !== null ? supplyRaw : null;
  const rows: HolderRow[] = largest.map((row, index) => {
    const info = holderAccounts?.ok ? holderAccounts.value[index] ?? null : null;
    const token = info ? readTokenAccount(info.data) : null;
    const owner = token?.owner ?? null;
    if (owner === curvePda) {
      technical.add(row.address);
    }
    const amount = BigInt(row.amount);
    const labeled = technical.has(row.address);
    return {
      tokenAccount: row.address,
      owner,
      amountRaw: row.amount,
      percent: denominator === null ? null : percentTruncated(amount, denominator, 4),
      label: labeled ? "cuenta técnica: cantidad de la curva de Pump.fun (PDA derivada)" : null,
    };
  });

  const published = input.registry.find((token) => token.mint === input.mint)?.publishedAccounts ?? [];
  const known = !largestInfo?.ok && supportedMint && decoded && account && curve
    ? await readKnownHolderAccounts({
        rpc: input.rpc,
        mint: input.mint,
        program: account.owner,
        curvePda,
        creator: curve?.creator ?? null,
        published,
        denominator,
        slots,
        fetchedAt: createdAt,
      })
    : null;
  if (known?.failure) {
    failures.push(known.failure);
  }
  const knownRows = known?.rows ?? [];
  const usingKnown = Boolean(!largestInfo?.ok && knownRows.length > 0 && known?.source);
  const ranked = largestInfo?.ok ? rows : [];

  let largestNonTech: bigint | null = null;
  if (denominator !== null && ranked.length > 0) {
    largestNonTech = 0n;
    for (const row of ranked) {
      if (row.label) {
        continue;
      }
      const amount = BigInt(row.amountRaw);
      if (largestNonTech === null || amount > largestNonTech) {
        largestNonTech = amount;
      }
    }
  }

  const metaplex = metaInfo?.ok && metaInfo.value ? decodeMetaplex(metaInfo.value.owner, metaInfo.value.data, input.mint) : null;
  const metaSource = metaInfo ? accountSource(metaInfo, metaPda, "PDA Metaplex: semillas metadata, programa de metadatos y mint.") : null;
  const onChain = decoded?.tokenMetadata ?? null;
  const uri = presentText(onChain?.uri) || presentText(metaplex?.uri) || null;
  const uriSource = onChain
    ? mintSource
    : metaplex
      ? metaSource
      : null;

  const jsonResult = uri ? await loadMetadata(uri, { now, random: () => 0 }) : null;
  const jsonMeta = jsonResult?.ok ? readJsonMetadata(jsonResult.json) : null;
  if (uri && jsonResult && !jsonResult.ok) {
    failures.push(`contenido de la URI: ${jsonResult.error}`);
  }
  const jsonSource: Source | null = jsonResult?.ok
    ? {
        method: "GET",
        account: null,
        slot: null,
        fetchedAt: jsonResult.fetchedAt,
        detail: `URI on-chain ${uri}. Contenido leído en ${jsonResult.url}.`,
      }
    : jsonResult
      ? {
          method: "GET",
          account: null,
          slot: null,
          fetchedAt: jsonResult.fetchedAt,
          detail: jsonResult.error,
        }
      : null;

  const imageUrl = jsonMeta?.image ?? null;
  const imageResult = imageUrl ? await loadImage(imageUrl, { now, random: () => 0, maxBytes: 2_000_000 }) : null;
  const imageHash = imageResult?.ok ? sha256Hex(imageResult.bytes) : null;

  const pointerOff = Boolean(decoded?.metadataPointer && decoded.metadataPointer.address !== input.mint);
  const names = [onChain?.name, metaplex?.name, jsonMeta?.name].filter((item): item is string => Boolean(item));
  const symbols = [onChain?.symbol, metaplex?.symbol, jsonMeta?.symbol].filter((item): item is string => Boolean(item));
  const links = [jsonMeta?.website, jsonMeta?.twitter, jsonMeta?.telegram].filter((item): item is string => Boolean(item));
  const authenticity = compareCanonical(
    { mint: input.mint, names, symbols, imageUris: imageUrl ? [imageUrl] : [], links },
    input.registry,
  );

  const limitations = [
    LEGITIMACY_LIMIT,
    "La muestra de cuentas con tokens tiene como máximo 20. No es un censo ni un recuento de personas. Una cuenta puede ser un custodio.",
    "Si los slots de las consultas no coinciden, no es una instantánea atómica.",
    "ORVUPI Verify no firma, no envía transacciones y no custodia claves.",
    "Cada consulta nueva produce un id nuevo. Esta ficha no se actualiza sola.",
  ];
  if (slots.size > 1) {
    limitations.push(`Slots observados: ${[...slots].sort((a, b) => a - b).join(", ")}.`);
  }
  if (missing) {
    limitations.push("La cuenta no existe en el estado consultado.");
  } else if (mintInfo.ok && !supportedMint) {
    limitations.push("La cuenta no es un mint SPL o Token-2022 inicializado. No se calcula una puntuación.");
  }
  if (!curve && curveInfo?.ok && curveInfo.value === null) {
    limitations.push("No hay cuenta de curva de Pump.fun en la PDA derivada. El módulo de otros mercados no está disponible. La ausencia no se anota como cantidad 0.");
  }
  if (curve && curve.complete) {
    limitations.push("La curva está marcada complete. Esta versión no lee el pool posterior.");
  }
  for (const failure of failures) {
    limitations.push(failure);
  }

  const unsupported = (decoded?.extensions ?? []).filter((item) => !item.supported || !item.decoded);
  if (decoded && !decoded.extensionsParsed) {
    limitations.push("No se pudo separar el TLV de extensiones. No se afirma qué extensiones faltan.");
  } else if (unsupported.length > 0) {
    limitations.push(
      `Extensiones no soportadas o no decodificadas: ${unsupported.map((item) => item.name).join(", ")}. No se interpretan como ausentes.`,
    );
  }

  const report: Report = {
    tool: "orvupi-verify",
    rulesVersion: RULES_VERSION,
    disclaimer: DISCLAIMER,
    id: "",
    createdAt,
    network: "mainnet-beta",
    rpcEndpoint: endpoint,
    mint: input.mint,
    partial: failures.length > 0,
    supportedMint,
    referenceSlot: slotResult.ok ? slotResult.value : null,
    limitations,
    findings: [],
    identity: {
      ownerProgram: account
        ? field({ value: account.owner, status: "verificado", source: mintSource })
        : missing
          ? field({ value: null, status: "verificado", source: mintSource, note: "No existe en el estado consultado." })
          : unavailable<string>("getAccountInfo", input.mint, mintInfo),
      standard: decoded
        ? field({ value: decoded.standard, status: "verificado", source: mintSource })
        : field({ value: null, status: mintInfo.ok ? "no_aplica" : "no_disponible", source: mintSource, note: mintInfo.ok ? "No es un mint soportado." : NO_RESPONSE }),
      decimals: decimals !== null && supplyFieldSource
        ? field({ value: decimals, status: "verificado", unit: "decimales", source: supplyFieldSource, note: supplyNote })
        : unavailable<number>("getAccountInfo", input.mint, mintInfo, supplyNote),
      supplyRaw: supplyRaw !== null && supplyFieldSource
        ? field({ value: supplyRaw.toString(), status: "verificado", unit: "unidades mínimas", source: supplyFieldSource, note: supplyNote })
        : unavailable<string>("getTokenSupply", input.mint, supplyInfo ?? mintInfo, supplyNote),
      supplyUi: supplyRaw !== null && decimals !== null && supplyFieldSource
        ? field({ value: formatUnits(supplyRaw, decimals), status: "verificado", unit: "tokens", source: supplyFieldSource, note: "Calculado con enteros a partir de las unidades mínimas. No se usa uiAmount." })
        : unavailable<string>("getTokenSupply", input.mint, supplyInfo ?? mintInfo, NO_RESPONSE),
      onChainName: pointerOff
        ? field({
            value: onChain?.name ?? metaplex?.name ?? null,
            status: "no_disponible",
            source: onChain ? mintSource : metaSource,
            note: "El MetadataPointer no apunta a este mint. El nombre no se da como verificado.",
          })
        : textField(onChain?.name ?? metaplex?.name ?? null, onChain ? mintSource : metaSource, !shouldReadChain),
      onChainSymbol: pointerOff
        ? field({
            value: onChain?.symbol ?? metaplex?.symbol ?? null,
            status: "no_disponible",
            source: onChain ? mintSource : metaSource,
            note: "El MetadataPointer no apunta a este mint. El símbolo no se da como verificado.",
          })
        : textField(onChain?.symbol ?? metaplex?.symbol ?? null, onChain ? mintSource : metaSource, !shouldReadChain),
      uri: textField(uri, uriSource, !shouldReadChain),
      jsonName: jsonField(jsonMeta?.name ?? null, jsonSource, uri),
      jsonSymbol: jsonField(jsonMeta?.symbol ?? null, jsonSource, uri),
      image: jsonField(imageUrl, jsonSource, uri),
      imageSha256: imageResult?.ok
        ? field({ value: imageHash, status: "verificado", unit: "sha256", source: { method: "GET", account: null, slot: null, fetchedAt: imageResult.fetchedAt, detail: imageResult.url } })
        : imageUrl
          ? field({ value: null, status: "no_disponible", source: imageResult ? { method: "GET", account: null, slot: null, fetchedAt: imageResult.fetchedAt, detail: imageResult.error } : null, note: "No se pudo leer la imagen. La comparación por URL o CID sigue disponible si la URI está." })
          : field({ value: null, status: uri ? "no_disponible" : "no_aplica", note: uri ? "El JSON no trae imagen o no se pudo leer." : "No hay URI de metadatos." }),
      website: jsonField(jsonMeta?.website ?? null, jsonSource, uri),
      twitter: jsonField(jsonMeta?.twitter ?? null, jsonSource, uri),
      telegram: jsonField(jsonMeta?.telegram ?? null, jsonSource, uri),
      description: jsonField(jsonMeta?.description ?? null, jsonSource, uri),
    },
    permissions: {
      mintAuthority: decoded
        ? field({ value: decoded.mintAuthority, status: decoded.mintAuthority.state === "no_decodificable" ? "no_disponible" : "verificado", source: mintSource, note: "COption: 0 revocada, 1 activa. Otro valor no se trata como revocada." })
        : authorityUnavailable(mintInfo, input.mint, mintSource, missing, supportedMint),
      freezeAuthority: decoded
        ? field({ value: decoded.freezeAuthority, status: decoded.freezeAuthority.state === "no_decodificable" ? "no_disponible" : "verificado", source: mintSource, note: "COption: 0 revocada, 1 activa. Otro valor no se trata como revocada." })
        : authorityUnavailable(mintInfo, input.mint, mintSource, missing, supportedMint),
      metaplexUpdateAuthority: metaplex
        ? field({ value: metaplex.updateAuthority, status: "verificado", source: metaSource })
        : metaInfo?.ok && metaInfo.value === null
          ? field({ value: null, status: "verificado", source: metaSource, note: "No hay cuenta de metadatos de Metaplex en la PDA derivada." })
          : metaInfo
            ? unavailable<string>("getAccountInfo", metaPda, metaInfo, NO_RESPONSE)
            : field({ value: null, status: "no_aplica", note: "No consultada: la cuenta no es un mint soportado." }),
      metaplexMutable: metaplex
        ? field({
            value: metaplex.mutable,
            status: metaplex.mutable === null ? "no_disponible" : "verificado",
            source: metaSource,
            note: "Campo is_mutable de Metaplex. false no demuestra que el proyecto sea legítimo.",
          })
        : metaInfo?.ok && metaInfo.value === null
          ? field({ value: null, status: "no_aplica", source: metaSource, note: "No hay cuenta Metaplex." })
          : metaInfo
            ? unavailable<boolean>("getAccountInfo", metaPda, metaInfo, NO_RESPONSE)
            : field({ value: null, status: "no_aplica", note: "No consultada." }),
      tokenMetadataUpdateAuthority: onChain
        ? field({
            value: onChain.updateAuthority,
            status: "verificado",
            source: mintSource,
            note: onChain.updateAuthority
              ? "Autoridad de actualización de la extensión TokenMetadata."
              : "32 bytes a cero: no hay autoridad de actualización en la extensión TokenMetadata.",
          })
        : decoded
          ? field({ value: null, status: "no_aplica", source: mintSource, note: "El mint no trae la extensión TokenMetadata." })
          : unavailable<string>("getAccountInfo", input.mint, mintInfo, NO_RESPONSE),
      extensions: decoded
        ? field({
            value: decoded.extensions,
            status: decoded.extensionsParsed ? "verificado" : "no_disponible",
            source: mintSource,
            note: decoded.extensionsParsed
              ? "TLV a partir del byte 166 (relleno hasta 165, tipo de cuenta en 165). Una extensión que no sale en la lista no está en la cuenta."
              : "Cobertura limitada: el TLV no se pudo leer entero.",
          })
        : field({ value: null, status: supportedMint ? "no_disponible" : "no_aplica", note: supportedMint ? NO_RESPONSE : "No es un mint soportado." }),
    },
    distribution: {
      denominatorRaw: denominator !== null && supplyFieldSource
        ? field({ value: denominator.toString(), status: "verificado", unit: "unidades mínimas", source: supplyFieldSource, note: mismatch ? supplyNote : "Denominador común de los porcentajes." })
        : field({ value: null, status: mismatch ? "no_disponible" : "no_disponible", note: mismatch ? supplyNote : NO_RESPONSE }),
      sample: largestInfo?.ok
        ? field({
            value: rows,
            status: "verificado",
            source: {
              method: "getTokenLargestAccounts",
              account: input.mint,
              slot: largestInfo.slot,
              fetchedAt: largestInfo.fetchedAt,
              detail: holderAccounts?.ok ? "Propietarios con getMultipleAccounts. Muestra, no censo." : "Sin propietarios: getMultipleAccounts no estuvo disponible.",
            },
            note: "Como máximo 20 cuentas. Los porcentajes usan el suministro verificado y se truncan a 4 decimales hacia cero.",
          })
        : usingKnown && known?.source
          ? field({
              value: knownRows,
              status: "verificado",
              source: known.source,
              note: known.note,
            })
          : unavailable<HolderRow[]>(
              "getTokenLargestAccounts",
              input.mint,
              largestInfo ?? { ok: false, method: "getTokenLargestAccounts", error: NO_RESPONSE, httpStatus: null, fetchedAt: createdAt },
              NO_RESPONSE,
            ),
      largestNonTechnicalPercent: largestNonTech !== null && denominator !== null && denominator > 0n
        ? field({
            value: percentTruncated(largestNonTech, denominator, 4),
            status: "verificado",
            unit: "porcentaje",
            source: usingKnown && known?.source
              ? known.source
              : {
                  method: "getTokenLargestAccounts",
                  account: input.mint,
                  slot: largestInfo?.ok ? largestInfo.slot : null,
                  fetchedAt: largestInfo?.ok ? largestInfo.fetchedAt : createdAt,
                  detail: "Máximo entre las cuentas de la muestra sin etiqueta técnica.",
                },
            note: usingKnown ? "Solo entre las cuentas concretas leídas, no un censo." : null,
          })
        : field({
            value: null,
            status: largestInfo?.ok ? "verificado" : "no_disponible",
            note: largestInfo?.ok
              ? "En la muestra no hay cuentas sin etiqueta técnica, o no hay denominador."
              : usingKnown
                ? knownRows.some((row) => (row.label ?? "").includes("cuenta personal publicada"))
                  ? "No se calcula un máximo fuera de la muestra: solo hay saldos de cuentas concretas, incluida la cuenta personal publicada, no un censo."
                  : "No se calcula un máximo fuera de la muestra: solo hay saldos de la curva y de la creadora, no un censo."
                : NO_RESPONSE,
          }),
    },
    market: marketBlock(curveInfo, curve, curvePda, curveAccountSource, createdAt),
    authenticity: {
      inRegistry: field({ value: authenticity.inRegistry, status: "verificado", source: localSource(createdAt, "Registro curado verify/registry/canonical.json"), note: "Comparación local. No consulta una red para decidir el registro." }),
      registryId: field({ value: authenticity.registryId, status: authenticity.registryId ? "verificado" : "no_aplica", source: localSource(createdAt, "Registro curado.") }),
      signals: field({ value: authenticity.signals, status: "verificado", source: localSource(createdAt, "Nombre, símbolo, imagen y enlaces frente al registro.") }),
      statement: field({ value: authenticity.statement, status: authenticity.signals.length > 0 && !authenticity.inRegistry ? "inferido" : "verificado", source: localSource(createdAt, "Regla de autenticidad de rulesVersion.") }),
    },
  };

  report.findings = buildFindings(report, attentionBps, mismatch, curve?.complete === true, pointerOff);
  const { id: ignored, ...body } = report;
  void ignored;
  report.id = createHash("sha256").update(canonicalJson(body)).digest("hex");
  return report;
}

function buildFindings(report: Report, attentionBps: number, mismatch: boolean, curveComplete: boolean, pointerOff: boolean): Finding[] {
  const findings: Finding[] = [];
  if (pointerOff && report.supportedMint) {
    findings.push({
      id: "metadata-pointer",
      level: "atención",
      title: "El puntero de metadatos no apunta a este mint",
      reason: "metadataPointer.metadataAddress no es la dirección del mint. El nombre incrustado no se da como verificado.",
    });
  }
  if (!report.supportedMint && report.identity.ownerProgram.status === "verificado" && report.identity.ownerProgram.value === null) {
    return findings;
  }
  if (!report.supportedMint && report.permissions.mintAuthority.status === "no_aplica") {
    return findings;
  }
  findings.push(authorityFinding("mint-authority", "Autoridad de emisión revocada", "Autoridad de emisión activa", report.permissions.mintAuthority, "emisión"));
  findings.push(authorityFinding("freeze-authority", "Autoridad de congelación revocada", "Autoridad de congelación activa", report.permissions.freezeAuthority, "congelación"));
  findings.push(mutabilityFinding(report));
  findings.push(authenticityFinding(report));
  if (mismatch) {
    findings.push({
      id: "supply-mismatch",
      level: "atención",
      title: "El suministro no cuadra entre fuentes",
      reason: "getTokenSupply y los bytes del mint no coinciden. No se calculan porcentajes y no se elige una cifra en silencio.",
    });
  }
  if (report.distribution.sample.status === "no_disponible") {
    findings.push({
      id: "holders",
      level: "atención",
      title: "Muestra de cuentas con tokens no disponible",
      reason: "No hubo lista de cuentas. No se interpreta como concentración cero.",
    });
  } else if (isHolderRows(report.distribution.sample.value)) {
    const rawDenominator = report.distribution.denominatorRaw.value;
    const denominator = typeof rawDenominator === "string" ? BigInt(rawDenominator) : null;
    let top = 0n;
    if (denominator && denominator > 0n) {
      for (const row of report.distribution.sample.value) {
        if (!row.label && BigInt(row.amountRaw) > top) {
          top = BigInt(row.amountRaw);
        }
      }
      const bps = (top * 10000n) / denominator;
      const shown = typeof report.distribution.largestNonTechnicalPercent.value === "string"
        ? report.distribution.largestNonTechnicalPercent.value
        : percentTruncated(top, denominator, 4);
      findings.push({
        id: "holders",
        level: bps >= BigInt(attentionBps) ? "atención" : "ok",
        title: bps >= BigInt(attentionBps) ? "Concentración alta en la muestra" : "Muestra de cuentas con tokens leída",
        reason: `La mayor cuenta de la muestra sin etiqueta técnica representa el ${shown}% del suministro verificado. Umbral informativo: ${attentionBps / 100}%. No es un censo ni un recuento de personas.`,
      });
    }
  }
  const extensions = isExtensions(report.permissions.extensions.value) ? report.permissions.extensions.value : [];
  const notable = extensions.filter((item) => !item.supported || !item.decoded || [1, 3, 6, 9, 12, 14].includes(item.type));
  if (notable.length > 0) {
    findings.push({
      id: "extensions",
      level: "atención",
      title: "Extensiones con permiso extra o sin decodificar",
      reason: notable.map((item) => `${item.name}${item.summary ? `: ${item.summary}` : item.supported ? "" : " (extensión no soportada)"}`).join(". ") + ". Una extensión no listada, si el TLV se leyó entero, no está en la cuenta. Una no decodificada no se da por ausente.",
    });
  }
  if (curveComplete) {
    findings.push({
      id: "market",
      level: "atención",
      title: "Curva de Pump.fun marcada complete",
      reason: "El campo complete es verdadero. Esta versión no lee el pool posterior. No afirma que la cantidad de la curva sea 0.",
    });
  }
  return findings;
}

function isHolderRows(value: unknown): value is HolderRow[] {
  return Array.isArray(value);
}

function isExtensions(value: unknown): value is ExtensionReport[] {
  return Array.isArray(value);
}

function isAuthority(value: unknown): value is { state: string; address: string | null } {
  return Boolean(value) && typeof value === "object" && value !== null && "state" in value;
}

function textValue(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function authorityFinding(id: string, revoked: string, active: string, item: Field, kind: string): Finding {
  const authority = isAuthority(item.value) ? item.value : null;
  if (item.status !== "verificado" || !authority || authority.state === "no_decodificable") {
    return {
      id,
      level: "atención",
      title: `Autoridad de ${kind} no disponible`,
      reason: "No se pudo verificar el campo. No se interpreta como revocada.",
    };
  }
  if (authority.state === "revocada") {
    return {
      id,
      level: "ok",
      title: revoked,
      reason: `La opción del mint está en 0. Eso quita ese permiso concreto. ${LEGITIMACY_LIMIT}`,
    };
  }
  const power = id === "mint-authority" ? "aumentar el suministro" : "congelar cuentas de este token";
  return {
    id,
    level: "atención",
    title: active,
    reason: `Sigue asignada a ${authority.address}. Quien la controle puede ${power}.`,
  };
}

function mutabilityFinding(report: Report): Finding {
  const embedded = report.permissions.tokenMetadataUpdateAuthority;
  const meta = report.permissions.metaplexMutable;
  const embeddedMutable = embedded.status === "verificado" && typeof embedded.value === "string";
  const embeddedFixed = embedded.status === "verificado" && embedded.value === null && embedded.note?.includes("32 bytes");
  const metaMutable = meta.status === "verificado" && meta.value === true;
  const metaFixed = meta.status === "verificado" && meta.value === false;
  const metaMissing = meta.status === "no_aplica";
  const embeddedMissing = embedded.status === "no_aplica";
  if (embedded.status === "no_disponible" || meta.status === "no_disponible" || (meta.value === null && meta.status === "verificado" && !metaMissing)) {
    return {
      id: "metadata-mutability",
      level: "atención",
      title: "Mutabilidad de metadatos no disponible",
      reason: "Falta una fuente. No se interpreta como metadatos inmutables.",
    };
  }
  if (embeddedMutable || metaMutable) {
    return {
      id: "metadata-mutability",
      level: "atención",
      title: "Metadatos mutables",
      reason: "Hay una autoridad de actualización o is_mutable es verdadero. El nombre, el símbolo o la imagen pueden cambiar.",
    };
  }
  if ((embeddedFixed || embeddedMissing) && (metaFixed || metaMissing) && (embeddedFixed || metaFixed)) {
    return {
      id: "metadata-mutability",
      level: "ok",
      title: "Metadatos no mutables en las fuentes leídas",
      reason: `La autoridad de actualización está ausente o is_mutable es falso. ${LEGITIMACY_LIMIT}`,
    };
  }
  return {
    id: "metadata-mutability",
    level: "atención",
    title: "Mutabilidad de metadatos no disponible",
    reason: "No hay una fuente de metadatos verificada. No se interpreta como inmutable.",
  };
}

function authenticityFinding(report: Report): Finding {
  const signals = Array.isArray(report.authenticity.signals.value)
    ? report.authenticity.signals.value.filter((item): item is string => typeof item === "string")
    : [];
  const inRegistry = report.authenticity.inRegistry.value === true;
  const statement = textValue(report.authenticity.statement.value, "");
  if (!inRegistry && signals.length > 0) {
    return {
      id: "authenticity",
      level: "riesgo",
      title: "Posible suplantación",
      reason: statement || "Hay señales de coincidencia con el registro curado y el mint es otro.",
    };
  }
  if (inRegistry && signals.some((item) => item.includes("distinto"))) {
    return {
      id: "authenticity",
      level: "atención",
      title: "Mint del registro con nombre distinto",
      reason: statement || "El nombre no coincide con el curado.",
    };
  }
  if (inRegistry) {
    return {
      id: "authenticity",
      level: "ok",
      title: "Mint en el registro curado",
      reason: statement || "Coincide con el registro.",
    };
  }
  return {
    id: "authenticity",
    level: "ok",
    title: "Sin señales de suplantación en el registro",
    reason: statement || "No está en el registro y no hay coincidencia de nombre, símbolo, imagen o enlaces.",
  };
}

function authorityUnavailable(
  mintInfo: RpcResult<AccountInfo | null>,
  mint: string,
  mintSource: Source | null,
  missing: boolean,
  supportedMint: boolean,
): Field {
  const notMint = missing || (mintInfo.ok && !supportedMint);
  return field({
    value: null,
    status: notMint ? "no_aplica" : "no_disponible",
    source: mintInfo.ok ? mintSource : failSource("getAccountInfo", mint, mintInfo),
    note: missing ? "No existe en el estado consultado." : mintInfo.ok ? "No es un mint soportado." : NO_RESPONSE,
  });
}

function marketBlock(
  curveInfo: RpcResult<AccountInfo | null> | null,
  curve: ReturnType<typeof decodeBondingCurve>,
  curvePda: string,
  source: Source | null,
  createdAt: string,
): Report["market"] {
  const blank = <T>(status: "no_aplica" | "no_disponible", note: string, src: Source | null = null): Field =>
    field({ value: null, status, source: src, note });
  if (!curveInfo) {
    const empty = <T,>(): Field => blank<T>("no_aplica", "No consultada: la cuenta no es un mint soportado.");
    return {
      module: field({ value: null, status: "no_aplica", note: "Módulo de mercado no consultado." }),
      bondingCurve: field({ value: curvePda, status: "verificado", source: localSource(createdAt, "Derivación local. No implica que la cuenta exista."), note: "Semillas: bonding-curve + mint. Programa 6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P." }),
      present: empty<boolean>(),
      complete: empty<boolean>(),
      virtualTokenReserves: empty<string>(),
      virtualQuoteReserves: empty<string>(),
      realTokenReserves: empty<string>(),
      realQuoteReserves: empty<string>(),
      curveTokenSupply: empty<string>(),
      creator: empty<string>(),
      quoteMint: empty<string>(),
      progressPercent: empty<string>(),
    };
  }
  if (!curveInfo.ok) {
    const src = failSource("getAccountInfo", curvePda, curveInfo);
    const down = <T,>(): Field => field({ value: null, status: "no_disponible", source: src, note: NO_RESPONSE });
    return {
      module: field({ value: "no_disponible", status: "no_disponible", source: src, note: NO_RESPONSE }),
      bondingCurve: field({ value: curvePda, status: "verificado", note: "Dirección derivada. La cuenta no se pudo leer." }),
      present: down<boolean>(),
      complete: down<boolean>(),
      virtualTokenReserves: down<string>(),
      virtualQuoteReserves: down<string>(),
      realTokenReserves: down<string>(),
      realQuoteReserves: down<string>(),
      curveTokenSupply: down<string>(),
      creator: down<string>(),
      quoteMint: down<string>(),
      progressPercent: down<string>(),
    };
  }
  if (!curveInfo.value) {
    return {
      module: field({ value: "no_disponible", status: "verificado", source, note: "No hay cuenta en la PDA. El módulo de otros mercados no está en esta versión. La ausencia no se rellena con una cantidad de cero." }),
      bondingCurve: field({ value: curvePda, status: "verificado", source, note: "PDA derivada. La cuenta no existe en el estado consultado." }),
      present: field({ value: false, status: "verificado", source }),
      complete: field({ value: null, status: "no_aplica", source, note: "No hay curva." }),
      virtualTokenReserves: field({ value: null, status: "no_aplica", note: "No hay curva." }),
      virtualQuoteReserves: field({ value: null, status: "no_aplica", note: "No hay curva." }),
      realTokenReserves: field({ value: null, status: "no_aplica", note: "No hay curva." }),
      realQuoteReserves: field({ value: null, status: "no_aplica", note: "No hay curva." }),
      curveTokenSupply: field({ value: null, status: "no_aplica", note: "No hay curva." }),
      creator: field({ value: null, status: "no_aplica", note: "No hay curva." }),
      quoteMint: field({ value: null, status: "no_aplica", note: "No hay curva." }),
      progressPercent: field({ value: null, status: "no_aplica", note: "No hay curva. No se rellena con cero." }),
    };
  }
  if (!curve && curveInfo.value.owner !== PUMP_PROGRAM) {
    const ownerNote = `Propietario leído: ${curveInfo.value.owner}.`;
    return {
      module: field({
        value: "no_disponible",
        status: "verificado",
        source,
        note: "La dirección derivada tiene una cuenta cuyo propietario no es el programa de Pump.fun. No es una curva y no se rellenan con cero las cantidades de la curva.",
      }),
      bondingCurve: field({ value: curvePda, status: "verificado", source, note: ownerNote }),
      present: field({ value: false, status: "verificado", source, note: ownerNote }),
      complete: field({ value: null, status: "no_aplica", source, note: "No hay curva." }),
      virtualTokenReserves: field({ value: null, status: "no_aplica", note: "No hay curva." }),
      virtualQuoteReserves: field({ value: null, status: "no_aplica", note: "No hay curva." }),
      realTokenReserves: field({ value: null, status: "no_aplica", note: "No hay curva." }),
      realQuoteReserves: field({ value: null, status: "no_aplica", note: "No hay curva." }),
      curveTokenSupply: field({ value: null, status: "no_aplica", note: "No hay curva." }),
      creator: field({ value: null, status: "no_aplica", note: "No hay curva." }),
      quoteMint: field({ value: null, status: "no_aplica", note: "No hay curva." }),
      progressPercent: field({ value: null, status: "no_aplica", note: "No hay curva. No se rellena con cero." }),
    };
  }
  if (!curve) {
    return {
      module: field({ value: "no_disponible", status: "no_disponible", source, note: "La cuenta existe pero no tiene el discriminador de BondingCurve. Módulo no disponible." }),
      bondingCurve: field({ value: curvePda, status: "verificado", source }),
      present: field({ value: true, status: "verificado", source }),
      complete: field({ value: null, status: "no_disponible", source, note: "Formato no soportado." }),
      virtualTokenReserves: field({ value: null, status: "no_disponible", note: "Formato no soportado." }),
      virtualQuoteReserves: field({ value: null, status: "no_disponible", note: "Formato no soportado." }),
      realTokenReserves: field({ value: null, status: "no_disponible", note: "Formato no soportado." }),
      realQuoteReserves: field({ value: null, status: "no_disponible", note: "Formato no soportado." }),
      curveTokenSupply: field({ value: null, status: "no_disponible", note: "Formato no soportado." }),
      creator: field({ value: null, status: "no_disponible", note: "Formato no soportado." }),
      quoteMint: field({ value: null, status: "no_disponible", note: "Formato no soportado." }),
      progressPercent: field({ value: null, status: "no_disponible", note: "No se estima el avance." }),
    };
  }
  const reserve = (value: bigint, unit: string, note: string, status: "verificado" | "inferido" = "verificado"): Field =>
    field({ value: value.toString(), status, unit, source, note });
  return {
    module: field({ value: "pump-bonding-curve", status: "verificado", source, note: "Cuenta con el discriminador público de BondingCurve." }),
    bondingCurve: field({ value: curvePda, status: "verificado", source }),
    present: field({ value: true, status: "verificado", source }),
    complete: field({ value: curve.complete, status: "verificado", source }),
    virtualTokenReserves: reserve(curve.virtualTokenReserves, "unidades mínimas", "Cantidad virtual de tokens de la curva, separada de la cantidad real."),
    virtualQuoteReserves: reserve(curve.virtualQuoteReserves, "unidades mínimas", curve.quoteUnitNote),
    realTokenReserves: reserve(curve.realTokenReserves, "unidades mínimas", "Reserva real de tokens, separada de la virtual."),
    realQuoteReserves: reserve(curve.realQuoteReserves, "unidades mínimas", curve.quoteUnitNote),
    curveTokenSupply: reserve(curve.tokenTotalSupply, "unidades mínimas", "token_total_supply de la cuenta de la curva."),
    creator: curve.creator
      ? field({ value: curve.creator, status: "verificado", source, note: "Pubkey guardada en la cuenta. No identifica a una persona." })
      : field({ value: null, status: "no_disponible", source, note: "La cuenta es más corta que el campo creator." }),
    quoteMint: curve.quoteMint
      ? field({ value: curve.quoteMint, status: "verificado", source, note: curve.quoteMintNote })
      : field({ value: null, status: "no_disponible", source, note: curve.quoteMintNote }),
    progressPercent: curve.progressPercent
      ? field({ value: curve.progressPercent, status: "inferido", unit: "porcentaje", source, note: curve.progressNote })
      : field({ value: null, status: "no_disponible", source, note: curve.progressNote }),
  };
}

function presentText(value: string | null | undefined): string | null {
  if (value == null) {
    return null;
  }
  const cleaned = value.trim();
  if (cleaned === "" || cleaned === "\uFFFD") {
    return null;
  }
  return cleaned;
}

function textField(value: string | null, source: Source | null, skipped: boolean): Field {
  if (skipped) {
    return field({ value: null, status: "no_aplica", note: "No consultado." });
  }
  if (!source) {
    return field({ value: null, status: "no_disponible", note: NO_RESPONSE });
  }
  if (value === null) {
    return field({ value: null, status: "verificado", source, note: "La fuente leída no trae este campo." });
  }
  return field({ value, status: "verificado", source });
}

function jsonField(value: string | null, source: Source | null, uri: string | null): Field {
  if (!uri) {
    return field({ value: null, status: "no_aplica", note: "No hay URI on-chain que consultar." });
  }
  if (!source || source.detail?.startsWith("HTTP") || source.detail?.includes("no es") || (source.method === "GET" && value === null && source.detail && !source.detail.startsWith("URI"))) {
    if (source && source.detail && !source.detail.startsWith("URI on-chain")) {
      return field({ value: null, status: "no_disponible", source, note: NO_RESPONSE });
    }
  }
  if (!source) {
    return field({ value: null, status: "no_disponible", note: NO_RESPONSE });
  }
  if (value === null && source.detail?.startsWith("URI on-chain")) {
    return field({ value: null, status: "verificado", source, note: "El JSON no trae este campo." });
  }
  if (value === null) {
    return field({ value: null, status: "no_disponible", source, note: NO_RESPONSE });
  }
  return field({ value, status: "verificado", source });
}

function accountSource(result: RpcResult<AccountInfo | null>, account: string, detail: string): Source | null {
  if (!result.ok) {
    return failSource("getAccountInfo", account, result);
  }
  return { method: "getAccountInfo", account, slot: result.slot, fetchedAt: result.fetchedAt, detail };
}

function failSource(method: string, account: string | null, result: { fetchedAt: string; error: string }): Source {
  return { method, account, slot: null, fetchedAt: result.fetchedAt, detail: result.error };
}

function unavailable<T>(methodOrStatus: string, accountOrMethod?: string, result?: RpcResult<unknown> | null, note?: string): Field {
  if (methodOrStatus === "no_aplica" || methodOrStatus === "no_disponible") {
    const status = methodOrStatus;
    const method = accountOrMethod ?? "getAccountInfo";
    return field({
      value: null,
      status,
      source: result && !result.ok ? failSource(method, null, result) : null,
      note: note ?? NO_RESPONSE,
    });
  }
  const method = methodOrStatus;
  const account = accountOrMethod ?? null;
  if (result && !result.ok) {
    return field({ value: null, status: "no_disponible", source: failSource(method, account, result), note: note ?? NO_RESPONSE });
  }
  return field({ value: null, status: "no_disponible", note: note ?? NO_RESPONSE });
}

function localSource(fetchedAt: string, detail: string): Source {
  return { method: "local", account: null, slot: null, fetchedAt, detail };
}

function remember(result: RpcResult<unknown>, slots: Set<number>): void {
  if (result.ok && result.slot !== null) {
    slots.add(result.slot);
  }
}

const PUBLIC_RPC_HOSTS = new Set(["api.mainnet-beta.solana.com", "solana-rpc.publicnode.com"]);

export function redactEndpoint(value: string): string {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    const bare = !url.username && !url.password && !url.search && !url.hash && (url.pathname === "/" || url.pathname === "");
    if (PUBLIC_RPC_HOSTS.has(host) && bare) {
      return url.origin;
    }
    return "rpc-configurada";
  } catch {
    return "rpc-configurada";
  }
}

async function readKnownHolderAccounts(input: {
  rpc: ChainReader;
  mint: string;
  program: string;
  curvePda: string;
  creator: string | null;
  published: ReadonlyArray<{ address: string; label: string }>;
  denominator: bigint | null;
  slots: Set<number>;
  fetchedAt: string;
}): Promise<{ rows: HolderRow[]; source: Source | null; note: string; failure: string | null }> {
  const targets: Array<{ address: string; label: string; published: boolean }> = [];
  const curveAta = associatedTokenAddress(input.curvePda, input.mint, input.program);
  if (curveAta) {
    targets.push({ address: curveAta, label: "cuenta de la curva, saldo leído; no es un censo", published: false });
  }
  const creatorAta = input.creator ? associatedTokenAddress(input.creator, input.mint, input.program) : null;
  if (creatorAta) {
    targets.push({ address: creatorAta, label: "cuenta de la creadora, saldo leído; no es un censo", published: false });
  }
  for (const account of input.published) {
    const ata = associatedTokenAddress(account.address, input.mint, input.program);
    if (!ata || targets.some((item) => item.address === ata)) {
      continue;
    }
    targets.push({ address: ata, label: account.label, published: true });
  }
  if (targets.length === 0) {
    return { rows: [], source: null, note: "", failure: null };
  }
  const packed = await input.rpc.getMultipleAccounts(targets.map((item) => item.address));
  remember(packed, input.slots);
  if (!packed.ok) {
    return { rows: [], source: null, note: "", failure: `getMultipleAccounts de curva, creadora y cuentas publicadas: ${packed.error}` };
  }
  const rows: HolderRow[] = [];
  let covered = 0n;
  for (let index = 0; index < targets.length; index += 1) {
    const target = targets[index];
    if (!target) {
      continue;
    }
    const info = packed.value[index] ?? null;
    const token = info ? readTokenAccount(info.data) : null;
    if (!token) {
      continue;
    }
    covered += token.amount;
    rows.push({
      tokenAccount: target.address,
      owner: token.owner,
      amountRaw: token.amount.toString(),
      percent: input.denominator === null ? null : percentTruncated(token.amount, input.denominator, 4),
      label: target.label,
    });
  }
  if (rows.length === 0) {
    return { rows: [], source: null, note: "", failure: null };
  }
  const rest = input.denominator === null ? null : input.denominator - covered;
  const restPercent = rest !== null && input.denominator !== null && input.denominator > 0n
    ? percentTruncated(rest < 0n ? 0n : rest, input.denominator, 4)
    : null;
  const readPublished = rows.some((row) => (row.label ?? "").includes("cuenta personal publicada"));
  const missingPublished = targets.some((item) => item.published && !rows.some((row) => row.tokenAccount === item.address));
  const who = readPublished ? "la curva, de la creadora y de la cuenta personal publicada" : "la curva y de la creadora";
  const missing = missingPublished ? " La cuenta personal publicada no apareció en esta lectura." : "";
  const note = restPercent
    ? `Saldos leídos de ${who}. El resto respecto al suministro es ${restPercent} %.${missing} No es un censo de cuentas con tokens.`
    : `Saldos leídos de ${who}.${missing} No es un censo de cuentas con tokens.`;
  const detail = input.published.length > 0
    ? "ATA de la curva, ATA de la creadora si la curva la trae, y ATA de las cuentas publicadas del registro. No sustituye a getTokenLargestAccounts ni es un censo."
    : "ATA de la curva y, si la curva trae creadora, ATA de la creadora. No sustituye a getTokenLargestAccounts ni es un censo.";
  return {
    rows,
    source: {
      method: "getMultipleAccounts",
      account: input.mint,
      slot: packed.slot,
      fetchedAt: packed.fetchedAt || input.fetchedAt,
      detail,
    },
    note,
    failure: null,
  };
}
