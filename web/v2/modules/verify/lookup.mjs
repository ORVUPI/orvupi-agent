const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
// Contrato ORVUPI: aún no existe (web/v2/shared/orvupi-contract.json).
export const OFFICIAL_MINT = "";
const COPY = {
    vacio: {
        light: "neutro",
        lightLabel: { es: "Sin resultado", en: "No result" },
        title: { es: "La lectura aparece aquí", en: "The reading shows up here" },
        support: {
            es: "La lectura será una de estas tres. Los detalles técnicos se quedan plegados.",
            en: "The reading will be one of these three. Technical details stay folded.",
        },
    },
    invalida: {
        light: "atencion",
        lightLabel: { es: "Dirección no válida", en: "Address is not valid" },
        title: { es: "Esta dirección no es válida", en: "This address is not valid" },
        support: {
            es: `Tiene que ser la dirección completa, sin el nombre del token y sin texto alrededor. Una dirección de Solana es larga: de 32 a 44 letras y números, sin 0, O, I ni l. Por ejemplo: EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v.`,
            en: `It has to be the full address, without the token name and without surrounding text. A Solana address is long: 32 to 44 letters and numbers, with no 0, O, I, or l. For example: EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v.`,
        },
    },
    oficial: {
        light: "ok",
        lightLabel: { es: "Parece oficial", en: "Looks official" },
        title: { es: "Parece el ORVUPI oficial", en: "Looks like the official ORVUPI" },
        support: {
            es: "La dirección coincide con la ficha del registro. La fecha va en los detalles. «Parece» no es una garantía permanente.",
            en: "The address matches the registry card. The date is in the details. “Looks like” is not a permanent guarantee.",
        },
    },
    copia: {
        light: "atencion",
        lightLabel: { es: "Se parece a ORVUPI, pero no es la CA oficial", en: "Looks like ORVUPI, but it is not the official CA" },
        title: { es: "Se parece a ORVUPI, pero no es la CA oficial", en: "Looks like ORVUPI, but it is not the official CA" },
        support: {
            es: `El nombre o el símbolo se parece a ORVUPI y la dirección es otra. Esto no dice quién lo creó ni con qué intención. ORVUPI todavía no tiene contrato.`,
            en: `The name or the symbol looks like ORVUPI and the address is different. This does not say who created it or why. ORVUPI does not have a contract yet.`,
        },
    },
    otra: {
        light: "atencion",
        lightLabel: { es: "Otra dirección", en: "Another address" },
        title: { es: "No es el ORVUPI oficial", en: "This is not the official ORVUPI" },
        support: {
            es: "Hay ficha de esta dirección y no es la del registro. Tampoco es una señal de copia.",
            en: "There is a card for this address and it is not the registry one. It is not a copy signal either.",
        },
    },
    sin_ficha: {
        light: "neutro",
        lightLabel: { es: "Sin ficha", en: "No card" },
        title: { es: "No se pudo comprobar", en: "Could not be checked" },
        support: {
            es: "No está entre las fichas de ejemplo. La lista no es completa y no hay lectura en directo de esta dirección, así que no rellena el hueco.",
            en: "It is not among the example cards. The list is not complete and there is no live reading of this address, so it does not fill the gap.",
        },
    },
    lectura_caida: {
        light: "neutro",
        lightLabel: { es: "Lectura no disponible", en: "Reading unavailable" },
        title: { es: "No se pudo comprobar", en: "Could not be checked" },
        support: {
            es: "La lectura no está disponible. Pasa lo mismo si la red de lectura no responde: no hay resultado y no se inventa uno.",
            en: "The reading is unavailable. The same happens if the read network does not respond: there is no result, and none is invented.",
        },
    },
    comprobando: {
        light: "espera",
        lightLabel: { es: "Comprobando", en: "Checking" },
        title: { es: "Comprobando esta dirección…", en: "Checking this address…" },
        support: {
            es: "Solo se mira la ficha local. La dirección no se envía a ningún sitio.",
            en: "Only the local card is read. The address is not sent anywhere.",
        },
    },
};
function pair(es, en) {
    return { es, en };
}
function shown(status, value) {
    if (status === "no_disponible")
        return "no_disponible";
    if (status === "no_aplica")
        return "no_aplica";
    if (status !== "verificado" && status !== "inferido")
        return "desconocido";
    if (value === null || value === "")
        return "desconocido";
    return value;
}
function statusWord(status, lang) {
    if (status === "no_disponible")
        return lang === "en" ? "Unavailable" : "No disponible";
    if (status === "no_aplica")
        return lang === "en" ? "Not applicable" : "No aplica";
    if (status === "verificado")
        return lang === "en" ? "verified" : "verificado";
    if (status === "inferido")
        return lang === "en" ? "inferred" : "inferido";
    return lang === "en" ? "Unknown" : "No se sabe";
}
function authorityLine(fact) {
    const visible = shown(fact.status, fact.state);
    if (visible === "no_disponible" || visible === "desconocido" || visible === "no_aplica") {
        return pair(statusWord(visible, "es"), statusWord(visible, "en"));
    }
    const es = fact.state === "revocada" ? "Cerrado" : fact.state === "activa" ? "Abierto" : "No se pudo leer";
    const en = fact.state === "revocada" ? "Closed" : fact.state === "activa" ? "Open" : "Could not be read";
    return pair(`${es} · ${statusWord(fact.status, "es")}`, `${en} · ${statusWord(fact.status, "en")}`);
}
export function normalizeAddress(raw) {
    return raw.replace(/[\s\u00a0]+/g, "");
}
export function isAddress(value) {
    return BASE58.test(value);
}
function viewOf(kind, mint, rows, partialNote) {
    const copy = COPY[kind];
    return {
        kind,
        light: copy.light,
        lightLabel: copy.lightLabel,
        title: copy.title,
        support: copy.support,
        mint,
        rows,
        partialNote,
        compare: null,
    };
}
export function looksLikeOfficial(mint, official) {
    if (mint.length === 0 || mint.length !== official.length || mint === official)
        return false;
    for (let i = 0; i < mint.length; i += 1) {
        if (mint[i] !== official[i])
            return true;
    }
    return false;
}
export function addressMarks(mint, official) {
    const marks = [];
    for (let i = 0; i < mint.length; i += 1) {
        const char = mint[i] ?? "";
        marks.push({ char, changed: char !== (official[i] ?? "") });
    }
    return marks;
}
function officialMintOf(cards) {
    return cards.find((card) => card.role === "registro")?.mint ?? OFFICIAL_MINT;
}
const NOT_OFFICIAL_GAP = {
    es: "No hay ficha de ejemplo. La lista no es completa y no hay lectura en directo de esta dirección, así que no rellena el hueco.",
    en: "There is no example card. The list is not complete and there is no live reading of this address, so it does not fill the gap.",
};
function notOfficialView(mint, official) {
    const caseOnly = mint !== official && mint.toLowerCase() === official.toLowerCase();
    const caseNote = {
        es: "Las direcciones distinguen mayúsculas. Esta coincide con la oficial salvo por las mayúsculas.",
        en: "Addresses are case-sensitive. This one matches the official address except for the letter case.",
    };
    return {
        kind: "sin_ficha",
        light: "atencion",
        lightLabel: pair("No es la oficial", "Not the official one"),
        title: pair("No es la dirección oficial", "Not the official address"),
        support: pair(`No es la dirección oficial de ORVUPI. Esto no dice quién creó esta dirección ni con qué intención.`, `This is not the official ORVUPI address. This does not say who created this address or why.`),
        mint,
        rows: [],
        partialNote: pair(caseOnly ? `${caseNote.es} ${NOT_OFFICIAL_GAP.es}` : NOT_OFFICIAL_GAP.es, caseOnly ? `${caseNote.en} ${NOT_OFFICIAL_GAP.en}` : NOT_OFFICIAL_GAP.en),
        compare: looksLikeOfficial(mint, official) ? { official, marks: addressMarks(mint, official) } : null,
    };
}
export function pendingView(raw) {
    const mint = normalizeAddress(raw);
    return viewOf("comprobando", mint.length > 0 ? mint : null, [], null);
}
export function emptyView() {
    return viewOf("vacio", null, [], null);
}
function rowsFor(card) {
    const registry = shown(card.inRegistryStatus, card.inRegistry === null ? null : card.inRegistry ? "sí" : "no");
    const registryEn = shown(card.inRegistryStatus, card.inRegistry === null ? null : card.inRegistry ? "yes" : "no");
    const name = shown(card.nameStatus, card.name);
    const copySignal = card.impersonation === null
        ? pair("No se sabe", "Unknown")
        : card.impersonation
            ? pair("Sí", "Yes")
            : pair("No", "No");
    const progress = shown(card.curveProgressStatus, card.curveProgress);
    const progressValue = progress === "no_disponible" || progress === "no_aplica" || progress === "desconocido"
        ? pair(statusWord(progress, "es"), statusWord(progress, "en"))
        : pair(`${progress} % · ${statusWord(card.curveProgressStatus, "es")}`, `${progress}% · ${statusWord(card.curveProgressStatus, "en")}`);
    const metadata = card.metadataReading === "mutables"
        ? pair("Sí, en la ficha", "Yes, on the card")
        : card.metadataReading === "no_mutables_en_fuentes"
            ? pair("No, en las fuentes leídas", "No, in the sources read")
            : pair("No se sabe", "Unknown");
    return [
        { label: pair("Nombre", "Name"), value: name === card.name && card.name ? pair(card.name, card.name) : pair(statusWord(name, "es"), statusWord(name, "en")) },
        {
            label: pair("En el registro de esta ficha", "In this card’s registry"),
            value: registry === "sí" || registry === "no" ? pair(registry === "sí" ? "Sí" : "No", registryEn === "yes" ? "Yes" : "No") : pair(statusWord(registry, "es"), statusWord(registry, "en")),
        },
        { label: pair("Permiso de crear más tokens", "Permission to create more tokens"), value: authorityLine(card.mintAuthority) },
        { label: pair("Permiso de congelar", "Permission to freeze"), value: authorityLine(card.freezeAuthority) },
        { label: pair("El nombre puede cambiar", "The name can change"), value: metadata },
        { label: pair("Señal de copia", "Copy signal"), value: copySignal },
        { label: pair("Avance de la curva", "Curve progress"), value: progressValue },
        { label: pair("Fecha de la ficha", "Card date"), value: pair(card.createdAt ?? "2026-10-08", card.createdAt ?? "2026-10-08") },
    ];
}
const PARTIAL = pair("La ficha está incompleta: la muestra de cuentas con tokens no está. Eso no se rellena con un cero.", "The card is incomplete: the token account sample is missing. That is not filled in with a zero.");
const CENSUS = pair("Hay saldos de la curva y de la creadora. No es un censo ni se rellena el resto con un cero.", "There are balances for the curve and the creator. It is not a census, and the rest is not filled in with a zero.");
const CENSUS_PERSONAL = pair("Hay saldos de la curva, de la creadora y de la cuenta personal publicada. No es un censo ni se rellena el resto con un cero.", "There are balances for the curve, the creator, and the published personal account. It is not a census, and the rest is not filled in with a zero.");
const SOLANA_ONLY = "ORVUPI todavía no tiene contrato en ninguna red";
function partialNoteFor(card) {
    if (!card.partial)
        return null;
    if (card.holdersNote && /cuenta personal publicada/i.test(card.holdersNote) && !/no apareció/i.test(card.holdersNote))
        return CENSUS_PERSONAL;
    if (card.holdersNote && /no es un censo/i.test(card.holdersNote))
        return CENSUS;
    return PARTIAL;
}
function evmView(address, evm) {
    const found = evm.find((item) => item.address.toLowerCase() === address.toLowerCase());
    if (found) {
        const chain = found.chain || "EVM";
        const creator = found.creator ?? "";
        return {
            kind: "evm",
            light: "riesgo",
            lightLabel: pair("Copia conocida", "Known copy"),
            title: pair("Copia conocida", "Known copy"),
            support: pair(`${SOLANA_ONLY}. Ejemplo de search-v2 de Pump.fun, 08-10 09:14, sin verificar en la cadena (${chain}).`, `ORVUPI does not have a contract on any network yet. Example from Pump.fun search-v2, 2026-10-08 09:14, not verified on-chain (${chain}).`),
            mint: found.address,
            rows: [
                { label: pair("Red", "Network"), value: pair(chain, chain) },
                { label: pair("Creadora anotada", "Noted creator"), value: pair(creator || "No se sabe", creator || "Unknown") },
                { label: pair("En la cadena", "On-chain"), value: pair("Sin verificar", "Not verified") },
            ],
            partialNote: null,
            compare: null,
        };
    }
    const shown = /^0x[0-9a-fA-F]{40}$/.test(address) ? address : null;
    return {
        kind: "evm",
        light: "atencion",
        lightLabel: pair("Otra red", "Another network"),
        title: pair(SOLANA_ONLY, "ORVUPI does not have a contract on any network yet"),
        support: pair("Una dirección que empieza por 0x no es el mint de Solana. La lista de ejemplos no es completa y no se ha verificado en la cadena.", "An address that starts with 0x is not the Solana mint. The example list is not complete and it has not been verified on-chain."),
        mint: shown,
        rows: [],
        partialNote: null,
        compare: null,
    };
}
export function classifyAddress(raw, cards, source, evm = []) {
    if (raw.trim() === "")
        return emptyView();
    const mint = normalizeAddress(raw);
    if (/^0x/i.test(mint))
        return evmView(mint, evm);
    if (!isAddress(mint))
        return viewOf("invalida", null, [], null);
    const official = officialMintOf(source === "caida" ? [] : cards);
    if (mint === official) {
        if (source === "caida")
            return viewOf("lectura_caida", mint, [], null);
        const registry = cards.find((item) => item.mint === mint);
        if (!registry)
            return viewOf("lectura_caida", mint, [], null);
        const kind = registry.role === "registro" ? "oficial" : registry.role === "clon" ? "copia" : "otra";
        return viewOf(kind, registry.mint, rowsFor(registry), partialNoteFor(registry));
    }
    if (source !== "caida") {
        const card = cards.find((item) => item.mint === mint);
        if (card) {
            const kind = card.role === "registro" ? "oficial" : card.role === "clon" ? "copia" : "otra";
            return viewOf(kind, card.mint, rowsFor(card), partialNoteFor(card));
        }
    }
    return notOfficialView(mint, official);
}
const DATED_CARD_NOTE = pair("Es la ficha del 2026-10-09. No es una lectura en directo.", "It is the 2026-10-09 card. It is not a live reading.");
/** La ficha fechada sigue, pero un fallo de los dos RPC no la pinta como lectura en verde. */
export function reserveWhenLiveFails(view) {
    if (view.kind !== "oficial")
        return view;
    const previous = view.partialNote;
    return {
        ...view,
        light: "neutro",
        lightLabel: pair("No se pudo comprobar en directo", "Could not check live"),
        title: pair("No se pudo comprobar en directo", "Could not check live"),
        partialNote: previous
            ? pair(`${DATED_CARD_NOTE.es} ${previous.es}`, `${DATED_CARD_NOTE.en} ${previous.en}`)
            : DATED_CARD_NOTE,
    };
}
