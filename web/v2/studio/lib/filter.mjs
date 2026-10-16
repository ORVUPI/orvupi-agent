import blocklist from "../blocklist.json" with { type: "json" };

const HOMO = new Map(
  [
    ["а", "a"], ["е", "e"], ["о", "o"], ["р", "p"], ["с", "c"], ["у", "y"], ["х", "x"], ["і", "i"], ["ѕ", "s"], ["ј", "j"], ["һ", "h"],
    ["г", "r"], ["в", "b"], ["к", "k"], ["м", "m"], ["н", "h"], ["п", "n"], ["т", "t"], ["и", "u"], ["ё", "e"], ["ԁ", "d"], ["ԛ", "q"], ["ԝ", "w"],
    ["А", "a"], ["Е", "e"], ["О", "o"], ["Р", "p"], ["С", "c"], ["Х", "x"], ["У", "y"], ["К", "k"], ["М", "m"], ["Т", "t"], ["Н", "h"], ["В", "b"],
    ["Г", "r"], ["П", "n"], ["И", "u"], ["Ё", "e"], ["І", "i"], ["Ј", "j"], ["Ѕ", "s"],
    ["α", "a"], ["ε", "e"], ["ο", "o"], ["ρ", "p"], ["τ", "t"], ["υ", "u"], ["χ", "x"], ["ι", "i"], ["κ", "k"], ["ν", "v"],
    ["β", "b"], ["γ", "y"], ["η", "n"], ["ζ", "z"], ["μ", "u"], ["π", "n"], ["ω", "w"],
    ["Α", "a"], ["Β", "b"], ["Ε", "e"], ["Ζ", "z"], ["Η", "h"], ["Ι", "i"], ["Κ", "k"], ["Μ", "m"], ["Ν", "n"], ["Ο", "o"], ["Ρ", "p"], ["Τ", "t"], ["Υ", "y"], ["Χ", "x"],
    ["Γ", "y"], ["Π", "n"], ["Ω", "w"],
  ].map(([from, to]) => [from, to]),
);

const SMALL = new Map(
  [
    ["ᴀ", "a"], ["ʙ", "b"], ["ᴄ", "c"], ["ᴅ", "d"], ["ᴇ", "e"], ["ꜰ", "f"], ["ɢ", "g"], ["ʜ", "h"], ["ɪ", "i"], ["ᴊ", "j"],
    ["ᴋ", "k"], ["ʟ", "l"], ["ᴍ", "m"], ["ɴ", "n"], ["ᴏ", "o"], ["ᴘ", "p"], ["ʀ", "r"], ["ꜱ", "s"], ["ᴛ", "t"], ["ᴜ", "u"],
    ["ᴠ", "v"], ["ᴡ", "w"], ["ʏ", "y"], ["ᴢ", "z"], ["×", "x"], ["✕", "x"], ["✖", "x"],
  ].map(([from, to]) => [from, to]),
);

const BASE58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const BASE58_SET = new Set(BASE58);

function foldHomoglyphs(text) {
  let out = "";
  for (const ch of text) out += HOMO.get(ch) ?? ch;
  return out;
}

function foldSmall(text) {
  let out = "";
  for (const ch of text) out += SMALL.get(ch) ?? ch;
  return out;
}

const LATIN = "abcdefghijklmnopqrstuvwxyz";

function foldExtra(text) {
  let out = "";
  for (const ch of text) {
    if (ch === "€") {
      out += "e";
      continue;
    }
    const cp = ch.codePointAt(0) ?? 0;
    const latin =
      cp >= 0x1f130 && cp <= 0x1f149
        ? cp - 0x1f130
        : cp >= 0x1f150 && cp <= 0x1f169
          ? cp - 0x1f150
          : cp >= 0x1f170 && cp <= 0x1f189
            ? cp - 0x1f170
            : cp >= 0x24b6 && cp <= 0x24cf
              ? cp - 0x24b6
              : cp >= 0x24d0 && cp <= 0x24e9
                ? cp - 0x24d0
                : -1;
    out += latin >= 0 ? LATIN[latin] : ch;
  }
  return out;
}

function stripMarks(text) {
  return text.normalize("NFD").replace(/\p{M}/gu, "");
}

export const INVISIBLE_CHARS = /[\u00AD\u034F\u061C\u115F\u1160\u17B4\u17B5\u180E\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u206F\u2800\u3164\uFE00-\uFE0F\uFEFF\uFFA0\uFFF9-\uFFFB]/g;

function prepare(text) {
  const nfkc = String(text ?? "").normalize("NFKC");
  const noZw = nfkc.replace(INVISIBLE_CHARS, "");
  const folded = stripMarks(foldHomoglyphs(foldSmall(foldExtra(noZw).toLowerCase())));
  return { original: noZw, folded };
}

function leet(text, one) {
  return text
    .replaceAll("0", "o")
    .replaceAll("3", "e")
    .replaceAll("4", "a")
    .replaceAll("5", "s")
    .replaceAll("7", "t")
    .replaceAll("@", "a")
    .replaceAll("$", "s")
    .replaceAll("1", one);
}

function compact(text) {
  return text.replace(/[^\p{L}\p{N}]+/gu, "");
}

function wordsOf(text) {
  return text.split(/[^a-z]+/).filter(Boolean);
}

function joinLooseLetters(words) {
  const out = [];
  let run = "";
  for (const word of words) {
    if (word.length === 1) {
      run += word;
      continue;
    }
    if (run) {
      out.push(run);
      run = "";
    }
    out.push(word);
  }
  if (run) out.push(run);
  return out;
}

function termKey(term) {
  return compact(stripMarks(foldHomoglyphs(foldSmall(String(term).normalize("NFKC")).toLowerCase())));
}

function maskExceptions(text) {
  const plainMark = ["un", "official"].join("");
  return text.replace(new RegExp(plainMark, "g"), " ").replace(/no(?:[^\p{L}\p{N}]+)?oficial/gu, " ");
}

const NEGATION = new Set(["no", "nunca", "jamas", "nadie", "sin", "never", "not", "dont", "without"]);
const FUNCTION_WORD = new Set([
  "el", "la", "los", "las", "un", "una", "unos", "unas", "the", "a", "an", "de", "del", "al",
  "lo", "le", "les", "me", "te", "se", "nos", "os", "mi", "tu", "su", "mis", "tus", "sus",
  "my", "your", "our", "their", "to", "of", "por", "para", "con", "que",
]);
const ADVICE_VERB = new Set([
  "compartas", "comparta", "compartir", "compartais", "compartan",
  "envies", "envie", "enviar", "envieis",
  "des", "deis", "dar",
  "conectes", "conecte", "conectar",
  "firmes", "firme", "firmar",
  "mandes", "mande", "mandar",
  "pases", "pase",
  "share", "give", "connect", "sign", "send", "approve",
]);
const REQUEST = new Set([
  "envia", "enviad", "envialo", "enviala", "enviamela", "enviamelo", "enviamelas", "enviamelos", "enviasela", "enviaselo",
  "manda", "mandame", "mandad", "pasa", "pasame", "pasamela", "pasamelo", "pasamelas", "pasamelos",
  "dame", "damela", "damelo", "damelas", "damelos",
  "conecta", "conectad", "firma", "firmad", "comparte", "compartid", "aprueba",
  "send", "share", "give", "connect", "sign", "approve", "dm",
]);
const DELIVERY = new Set([
  "dame", "damela", "damelo", "damelas", "damelos",
  "enviamela", "enviamelo", "enviamelas", "enviamelos",
  "pasamela", "pasamelo", "pasamelas", "pasamelos",
]);
const SENSITIVE = [
  "frase de recuperacion",
  "recovery phrase",
  "seed phrase",
  "frase semilla",
  "clave privada",
  "private key",
  "conecta tu billetera",
  "conecta tu wallet",
  "connect your wallet",
  "connect wallet",
  "sign the transaction",
  "sign transaction",
  "firma la transaccion",
  "12 palabras",
  "24 palabras",
  "billetera",
  "mnemonic",
  "semilla",
  "wallet",
  "seed",
];
const ASK_VERB = new Set(["pide", "piden", "pedir", "pidio", "pedira", "pediran", "ask", "asks", "asking"]);
const WARNING_CUE = new Set(["desconfia", "desconfie", "desconfiad", "cuidado", "beware", "alerta", "distrust"]);
const WARNING_END = new Set(["estafa", "scam", "fraude", "fraud", "phishing", "timo"]);
const MONEY = new Set([
  "dinero", "pasta", "plata", "lana", "guita", "cash", "money", "sol", "sols", "token", "tokens", "cripto", "crypto",
  "usdc", "usdt", "btc", "eth", "profit", "profits", "beneficio", "beneficios", "ganancia", "ganancias",
  "usd", "eur", "euro", "euros", "dolar", "dolares", "dollar", "dollars",
]);
const QUANTITY = new Set([
  "mucho", "mucha", "muchos", "muchas", "muchisimo", "muchisima", "muchisimos", "muchisimas",
  "bastante", "mas", "tanto", "tanta", "tantos", "tantas",
]);
const PRICE = new Set([
  "precio", "price", "valor", "cotizacion", "mercado", "sol", "sols", "token", "tokens", "chart",
  "grafico", "mcap", "capitalizacion",
]);
const ASSET = new Set(["orvupi"]);
const WARNING_SAFE = [
  "frase de recuperacion",
  "recovery phrase",
  "seed phrase",
  "frase semilla",
  "clave privada",
  "private key",
  "conecta tu billetera",
  "conecta tu wallet",
  "connect your wallet",
  "connect wallet",
  "12 palabras",
  "24 palabras",
  "billetera",
  "mnemonic",
  "airdrops",
  "semillas",
  "wallets",
  "seeds",
  "privkey",
  "semilla",
  "airdrop",
  "wallet",
  "seed",
];
const IMPERATIVE = new Set([
  ...REQUEST,
  "compra", "vende", "entra", "mira", "haz", "ten", "ven", "pon", "sal", "di", "ve", "sube", "baja", "corre", "buy",
]);

function wordList(text) {
  return text.split(/[^a-z0-9]+/).filter(Boolean);
}

function nextContent(words, index, step) {
  let i = index + step;
  while (i >= 0 && i < words.length && FUNCTION_WORD.has(words[i])) i += step;
  return i >= 0 && i < words.length ? words[i] : "";
}

function phrasePattern(phrase) {
  return phrase.replace(/ /g, "[^a-z0-9]+");
}

function adviceGoverns(words, at, count) {
  let i = at - 1;
  while (i >= 0 && FUNCTION_WORD.has(words[i])) i -= 1;
  if (i < 0 || !ADVICE_VERB.has(words[i])) return false;
  if (!NEGATION.has(words[i - 1] ?? "")) return false;
  return !words.slice(at + count).some((word) => REQUEST.has(word));
}

function warningSentence(words) {
  if (words.some((word) => REQUEST.has(word))) return false;
  if (words.some((word) => WARNING_CUE.has(word))) return true;
  const asks = words.some((word) => ASK_VERB.has(word));
  const conditional = words.includes("si") || words.includes("if");
  const conclusion = words.some((word) => WARNING_END.has(word));
  if (conditional && asks && conclusion) return true;
  return asks && words.some((word) => NEGATION.has(word));
}

function maskNegatedAdvice(text) {
  const source = text.replace(/['’]/g, "");
  let out = source;
  const words = wordList(source);
  for (const phrase of SENSITIVE) {
    const body = phrasePattern(phrase);
    const re = new RegExp(`(^|[^a-z0-9])(${body})(?![a-z0-9])`, "g");
    out = out.replace(re, (full, lead, match, offset) => {
      const at = wordList(source.slice(0, offset + lead.length)).length;
      const count = wordList(phrase).length;
      if (!adviceGoverns(words, at, count)) return full;
      return `${lead}${" ".repeat(match.length)}`;
    });
  }
  return out;
}

const PRIVATE_SPLIT = /[.!?;:,¡¿…\n]+|\p{Extended_Pictographic}+/gu;
const PRIVATE_ALLOWED = [
  /^(?:los admins|nadie|el equipo) nunca(?: te)? escriben? por privado$/,
  /^no (?:respondas|contestes|escribas) por privado$/,
  /^si te escriben por privado es(?: una)? estafa$/,
  /^nunca te escribiremos por privado$/,
  /^el equipo nunca pide nada por privado$/,
  /^nadie del equipo te escribira por privado$/,
  /^cuidado con quien te escribe por privado$/,
  /^(?:admins|the team|we) will never (?:dm|message) you$/,
  /^admins never dm you$/,
  /^we never dm first$/,
  /^never reply to dms?$/,
  /^if someone dms you its a scam$/,
  /^no respondas a nadie que te escriba por privado$/,
];
/** Frases fijas que pueden acompañar a un aviso. Cualquier otra anula el permiso. */
const phrase = (...parts) => parts.join("");
const PRIVATE_NEUTRAL = new Set([
  "cuidado",
  "ojo",
  phrase("no es consejo de ", "inversion"),
  phrase("cripto de alto ", "riesgo"),
  phrase("puedes perder", "lo todo"),
  phrase("cripto de alto ", "riesgo ", "puedes perder", "lo todo ", "no es consejo de ", "inversion"),
  phrase("high risk ", "crypto"),
  phrase("you could lose ", "everything"),
  phrase("not investment ", "advice"),
  phrase("high risk ", "crypto ", "you could lose ", "everything ", "not investment ", "advice"),
  "protege tu cartera",
  "be careful",
]);
/** Canal o invitación. «por priv» y «al priv» no tragan «privado». */
const INVITE_RULES = [
  ["escribeme", /(?:^| )(?:escribirme|escribeme|escribanme|escribidme|escribanos)(?: |$)/],
  ["hablemos", /(?:^| )(?:hablemos|hablame|habladme)(?: |$)/],
  ["mandame", /(?:^| )(?:mandame|contactame|pasame|enviame)(?: |$)/],
  ["mensajeame", /(?:^| )mensajeame(?: |$)/],
  ["llamame", /(?:^| )llamame(?: |$)/],
  ["conmigo", /(?:^| )conmigo(?: |$)/],
  ["inbox", /(?:^| )inbox(?: |$)/],
  ["te paso", /(?:^| )te paso(?: |$)/],
  ["al priv", /(?:^| )al priv(?: |$)/],
  ["al pv", /(?:^| )al pv(?: |$)/],
  ["por priv", /(?:^| )por priv(?: |$)/],
  ["por pv", /(?:^| )por pv(?: |$)/],
  ["por interno", /(?:^| )por interno(?: |$)/],
  ["pm me", /(?:^| )pm me(?: |$)/],
  ["text me", /(?:^| )text me(?: |$)/],
  ["hit me up", /(?:^| )hit me up(?: |$)/],
  ["ping me", /(?:^| )ping me(?: |$)/],
  ["msg me", /(?:^| )msg me(?: |$)/],
  ["DMs abiertos", /(?:^| )dms? abiertos(?: |$)/],
  ["wasap", /(?:^| )wasap(?: |$)/],
  ["whatsapp", /(?:^| )whatsapp(?: |$)/],
  ["signal", /(?:^| )signal(?: |$)/],
  ["instagram", /(?:^| )instagram(?: |$)/],
  ["insta", /(?:^| )insta(?: |$)/],
  ["tg", /(?:^| )tg(?: |$)/],
  ["wsp", /(?:^| )wsp(?: |$)/],
  ["telegram", /(?:^| )telegram(?: |$)/],
  ["ig", /(?:^| )ig(?: |$)/],
  ["snapchat", /(?:^| )snapchat(?: |$)/],
  ["kik", /(?:^| )kik(?: |$)/],
  ["viber", /(?:^| )viber(?: |$)/],
  ["wechat", /(?:^| )(?:wechat|we chat)(?: |$)/],
  ["threema", /(?:^| )threema(?: |$)/],
  // El 1 ocupa la y de skype; el leet general lo convierte en i («skipe»).
  ["skype", /(?:^| )sk(?:y|1|i)pe(?: |$)/],
  ["tiktok", /(?:^| )tiktok(?: |$)/],
  ["reddit dm", /(?:^| )reddit dms?(?: |$)/],
  ["dm", /(?:^| )dm(?: |$)/],
  ["dms", /(?:^| )dms(?: |$)/],
  ["md", /(?:^| )md(?: |$)/],
];
const TELEGRAM_AT = /(?:^|[^a-z0-9])telegram\s*@\s*[a-z0-9_]+/;
const CONTEXT_CHANNEL = ["line", "session"];
const CONTEXT_CUE = /(?:^|[^a-z0-9])(?:mi|por|me|dm|add|mensaje|contact\w*|escrib\w*|al)(?![a-z0-9])|@/;
const MARKED_CHANNEL = ["line", "session", "reddit"];
const PHONE_DIGITS = /(?:\d[ \t.\-]*){8}\d/;
const PHONE_CUE = /(?:^|[^a-z0-9])(?:mi\s+numero|telefono|llamame|whatsapp|contacto|movil|wasap|phone|telf|llama|call|tlf|tel|wsp|wa)(?![a-z0-9])/g;

function canonSentence(text) {
  return text.replace(/[^a-z0-9]+/g, " ").trim();
}

function leetDigits(text) {
  return text
    .replaceAll("0", "o")
    .replaceAll("3", "e")
    .replaceAll("4", "a")
    .replaceAll("5", "s")
    .replaceAll("1", "i");
}

function isClosedPrivate(text) {
  return PRIVATE_ALLOWED.some((pattern) => pattern.test(canonSentence(text)));
}

function isNeutralPhrase(text) {
  return PRIVATE_NEUTRAL.has(canonSentence(text));
}

function splitPrivate(text) {
  const pieces = [];
  let last = 0;
  for (const match of text.matchAll(PRIVATE_SPLIT)) {
    pieces.push({ text: text.slice(last, match.index), sep: match[0] });
    last = match.index + match[0].length;
  }
  pieces.push({ text: text.slice(last), sep: "" });
  return pieces;
}

function allowIndexes(pieces) {
  const allow = new Set();
  for (let i = 0; i < pieces.length; i += 1) {
    if (isClosedPrivate(pieces[i].text)) allow.add(i);
  }
  for (let i = 0; i < pieces.length - 1; i += 1) {
    if (!pieces[i].sep.includes(",")) continue;
    const joined = `${pieces[i].text} ${pieces[i + 1].text}`;
    if (!isClosedPrivate(joined)) continue;
    allow.add(i);
    allow.add(i + 1);
  }
  return allow;
}

function phraseForms(text) {
  return [canonSentence(text), canonSentence(leet(text, "i"))].filter(Boolean);
}

function inviteTerms(text) {
  const found = new Set();
  for (const form of phraseForms(text)) {
    for (const [term, re] of INVITE_RULES) {
      if (re.test(form)) found.add(term);
    }
  }
  if (TELEGRAM_AT.test(text) || TELEGRAM_AT.test(leetDigits(text))) found.add("telegram");
  for (const term of contextualChannels(text)) found.add(term);
  for (const term of markedChannels(text)) found.add(term);
  return found;
}

function contextualChannels(text) {
  const found = new Set();
  const forms = [text, leet(text, "i"), leetDigits(text)];
  for (const form of forms) {
    for (const word of CONTEXT_CHANNEL) {
      const re = new RegExp(`(?:^|[^a-z0-9])${word}(?![a-z0-9])`, "g");
      for (const match of form.matchAll(re)) {
        const at = match.index ?? 0;
        const around = form.slice(Math.max(0, at - 32), at + word.length + 20);
        if (CONTEXT_CUE.test(around)) found.add(word);
      }
    }
  }
  return found;
}

function markedChannels(text) {
  const found = new Set();
  const forms = [text, leet(text, "i"), leetDigits(text)];
  for (const form of forms) {
    for (const word of MARKED_CHANNEL) {
      const boundary = `(?:^|[^a-z0-9])${word}(?![a-z0-9])`;
      if (new RegExp(`${boundary}\\s*:`).test(form)) found.add(word);
      if (new RegExp(`${boundary}\\s+id(?![a-z0-9])`).test(form)) found.add(word);
      if (new RegExp(`${boundary}\\s+u/`).test(form)) found.add(word);
    }
  }
  return found;
}

function hasIntlZero(text) {
  const re = /(?:^|[^a-z0-9])(00(?:[ \t.\-]*\d){7,})/g;
  for (const match of text.matchAll(re)) {
    if (/[1-9]/.test(match[1])) return true;
  }
  return false;
}

function hasPhone(text) {
  if (/(?:^|[^a-z0-9])\+(?:[ \t.\-]*\d)+/.test(text)) return true;
  if (hasIntlZero(text)) return true;
  for (const match of text.matchAll(new RegExp(PHONE_CUE.source, "g"))) {
    const at = match.index ?? 0;
    const around = text.slice(Math.max(0, at - 24), at + match[0].length + 40);
    if (PHONE_DIGITS.test(around)) return true;
  }
  return false;
}

function blankPrivatePhrase(text) {
  return text.replace(/(^|[^a-z0-9])(por(?:[^a-z0-9]+)?privado)(?![a-z0-9])/g, (full, lead, match) => `${lead}${" ".repeat(match.length)}`);
}

function blankEnglishPrivate(text) {
  return text.replace(/(^|[^a-z0-9])(md|dms?|message)(?![a-z0-9])/g, (full, lead, match) => `${lead}${" ".repeat(match.length)}`);
}

/**
 * «por privado» y «DM» solo se tapan si cada frase del texto es un aviso cerrado
 * o una frase neutra fija. Cualquier otra frase deja el canal a la vista.
 */
function reviewPrivate(text) {
  const pieces = splitPrivate(text);
  const allow = allowIndexes(pieces);
  const pure = pieces.every((piece, index) => {
    if (!canonSentence(piece.text)) return true;
    return allow.has(index) || isNeutralPhrase(piece.text);
  });
  const permit = pure && allow.size > 0;
  const hits = permit ? [] : [...inviteTerms(text)];
  if (!permit) return { text, hits };
  const masked = pieces.map((piece, index) => {
    if (!canonSentence(piece.text)) return piece.text + piece.sep;
    if (!allow.has(index)) return `${" ".repeat(piece.text.length)}${piece.sep}`;
    return blankEnglishPrivate(blankPrivatePhrase(piece.text)) + piece.sep;
  }).join("");
  return { text: masked, hits };
}

function maskWarnings(text) {
  const phrases = [...WARNING_SAFE].sort((a, b) => b.length - a.length);
  return text.split(/(?<=[.!?;:\n])/).map((sentence) => {
    if (!warningSentence(wordList(sentence))) return sentence;
    let out = sentence;
    for (const phrase of phrases) {
      out = out.replace(new RegExp(`(^|[^a-z0-9])(?:${phrasePattern(phrase)})(?![a-z0-9])`, "g"), "$1 ");
    }
    return out;
  }).join("");
}

function isNonImperativeVerb(word) {
  if (!word || IMPERATIVE.has(word) || word.length < 4) return false;
  return /(amos|emos|imos|aste|iste|aron|ieron|aba|ias|iamos|ria|rias|remos)$/.test(word) || /(as|es)$/.test(word);
}

function maskShortContext(text) {
  const parts = text.split(/([a-z0-9]+)/);
  const words = parts.filter((part) => /^[a-z0-9]+$/.test(part));
  const indexes = [];
  parts.forEach((part, index) => {
    if (/^[a-z0-9]+$/.test(part)) indexes.push(index);
  });
  words.forEach((word, wordIndex) => {
    const next = nextContent(words, wordIndex, 1);
    const prev = nextContent(words, wordIndex, -1);
    let drop = false;
    if (word === "ganar") drop = Boolean(next) && !MONEY.has(next) && !QUANTITY.has(next) && !/^\d+$/.test(next);
    else if (word === "sube") {
      const near = [next, prev].filter(Boolean);
      drop = near.length > 0 && near.every((item) => !PRICE.has(item) && !ASSET.has(item));
    }
    else if (word === "support") drop = Boolean(next);
    else if (word === "ya") drop = isNonImperativeVerb(next);
    if (drop) parts[indexes[wordIndex]] = " ";
  });
  return parts.join("");
}

function verbIsNegated(text, index) {
  const prior = wordList(text.slice(Math.max(0, index - 24), index));
  return NEGATION.has(prior[prior.length - 1] ?? "");
}

function hasSolDouble(text) {
  const re = /\benvia\w{0,8}\s+\d+(?:[.,]\d+)?\s+sols?\b/g;
  for (const match of text.matchAll(re)) {
    const after = text.slice(match.index ?? 0, (match.index ?? 0) + match[0].length + 40);
    if (!/devolv/.test(after)) continue;
    if (verbIsNegated(text, match.index ?? 0)) continue;
    return true;
  }
  return false;
}

function hasTypoDouble(text) {
  const re = /\b(?:envia|enivia)\w{0,8}\b/g;
  for (const match of text.matchAll(re)) {
    if (verbIsNegated(text, match.index ?? 0)) continue;
    const after = text.slice(match.index ?? 0, (match.index ?? 0) + match[0].length + 48);
    if (/devolv/.test(after) && /\bdoble\b/.test(after)) return true;
  }
  return false;
}

function hasSendSolBack(text) {
  const re = /\bsend\w{0,6}\s+\d+(?:[.,]\d+)?\s+sols?\b/g;
  for (const match of text.matchAll(re)) {
    const after = text.slice(match.index ?? 0, (match.index ?? 0) + match[0].length + 48);
    if (!/\bget\s+\d+(?:[.,]\d+)?\s+(?:sols?\s+)?back\b/.test(after)) continue;
    if (verbIsNegated(text, match.index ?? 0)) continue;
    return true;
  }
  return false;
}

const FOREIGN_LETTER =
  /[\p{Script=Cyrillic}\p{Script=Greek}\p{Script=Cherokee}\p{Script=Coptic}\p{Script=Hangul}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u;

function pushHit(hits, seen, kind, term) {
  const id = `${kind}:${term}`;
  if (seen.has(id)) return;
  seen.add(id);
  hits.push({ kind, term });
}

const JOINERS = new Set(["y", "and", "luego"]);

function isSplitter(ch) {
  return /\s/u.test(ch) || "/._,|+·•∙⋅–—-~:".includes(ch);
}

function softenJoiners(text) {
  return text.replace(/(^|[^1-9A-HJ-NP-Za-km-z])(?:and|luego)(?=$|[^1-9A-HJ-NP-Za-km-z])/gi, "$1 ");
}

function hasBase58Address(text) {
  let piece = "";
  let parts = [];
  let found = false;
  const consider = (chunks) => {
    if (found || chunks.length === 0) return;
    for (const chunk of chunks) {
      if (chunk.length >= 32 && chunk.length <= 44) found = true;
    }
    const joined = chunks.join("");
    if (joined.length < 32 || joined.length > 44 || chunks.length === 1) return;
    if (chunks.every((chunk) => chunk.length >= 4)) {
      found = true;
      return;
    }
    if (chunks.every((chunk) => chunk.length >= 2 && chunk.length <= 3)) {
      found = true;
      return;
    }
    const singles = chunks.filter((chunk) => chunk.length === 1).length;
    if (singles >= chunks.length * 0.8 && /[1-9]/.test(joined)) {
      found = true;
      return;
    }
    const mixed = /[A-Z]/.test(joined) && /[a-z]/.test(joined);
    if (mixed && /[1-9]/.test(joined) && chunks.some((chunk) => chunk.length >= 8)) found = true;
  };
  const flushPiece = () => {
    if (!piece) return;
    if (!JOINERS.has(piece.toLowerCase())) parts.push(piece);
    piece = "";
  };
  const flushChain = () => {
    flushPiece();
    consider(parts);
    parts = [];
  };
  for (const ch of softenJoiners(text)) {
    if (BASE58_SET.has(ch)) piece += ch;
    else if (isSplitter(ch)) flushPiece();
    else flushChain();
  }
  flushChain();
  return found;
}

function evmChunks(text) {
  const chunks = [];
  let current = "";
  let word = "";
  const flushWord = () => {
    if (!word) return;
    if (JOINERS.has(word.toLowerCase())) {
      if (current) chunks.push(current);
      current = "";
    } else current += word;
    word = "";
  };
  for (const ch of softenJoiners(text)) {
    if (isSplitter(ch)) flushWord();
    else word += ch;
  }
  flushWord();
  if (current) chunks.push(current);
  return chunks;
}

function chunkIsEvm(chunk) {
  return /^0x[0-9a-f]{40}$/i.test(chunk) || /^[0-9a-f]{40}$/i.test(chunk);
}

function hasEvmAddress(text) {
  const chunks = evmChunks(text);
  if (chunks.some(chunkIsEvm)) return true;
  const joined = chunks.join("");
  if (chunkIsEvm(joined)) return true;
  if (/0x[0-9a-f]{40}(?![0-9a-f])/i.test(joined)) return true;
  return /(?:^|[^0-9a-f])[0-9a-f]{40}(?![0-9a-f])/i.test(joined);
}

export function analyze(text, list = blocklist) {
  const hits = [];
  const seen = new Set();
  const { original, folded } = prepare(text);
  const emojiSource = original.replace(/\uFE0F/g, "");
  for (const sequence of list.emojiSequences ?? []) {
    if (sequence && emojiSource.includes(sequence)) pushHit(hits, seen, "emoji", sequence);
  }
  for (const emoji of list.emojis ?? []) {
    if (emoji && emojiSource.includes(emoji)) pushHit(hits, seen, "emoji", emoji);
  }

  if (hasBase58Address(original)) pushHit(hits, seen, "base58", "direccion");
  if (hasEvmAddress(original)) pushHit(hits, seen, "base58", "direccion");
  if (FOREIGN_LETTER.test(original)) pushHit(hits, seen, "term", "script");

  const urlText = folded.replace(/\s+/g, "");
  const urlSquash = compact(folded);
  if (/https?:\/\//.test(urlText) || /www\./.test(urlText)) pushHit(hits, seen, "url", "url");
  for (const domain of list.domains ?? []) {
    const needle = String(domain).toLowerCase().replace(/\s+/g, "");
    const squashed = compact(needle);
    const shortSquash = squashed.length > 0 && squashed.length <= 4
      && new RegExp(`(?:^|[^a-z0-9])${squashed}(?![a-z0-9])`).test(urlSquash);
    const longSquash = squashed.length > 4 && urlSquash.includes(squashed);
    if ((needle && urlText.includes(needle)) || shortSquash || longSquash) pushHit(hits, seen, "url", domain);
  }
  if (/[a-z0-9-]+\.(?:com|net|org|io|xyz|fun|me)\b/.test(urlText)) pushHit(hits, seen, "url", "url");

  const handleNames = new Set((list.handles ?? []).map((handle) => termKey(handle)));
  for (const handle of list.handles ?? []) {
    const name = termKey(handle);
    if (!name) continue;
    const re = new RegExp(`@\\s*${name}(?![a-z0-9])`, "i");
    if (re.test(folded)) pushHit(hits, seen, "handle", `@${handle}`);
  }

  const plainWords = wordList(folded.replace(/['’]/g, ""));
  for (const word of plainWords) {
    if (DELIVERY.has(word)) pushHit(hits, seen, "term", word);
  }
  if (hasPhone(folded)) pushHit(hits, seen, "term", "telefono");
  const priv = reviewPrivate(maskWarnings(maskNegatedAdvice(maskExceptions(folded))));
  for (const term of priv.hits) pushHit(hits, seen, "term", term);
  const advised = priv.text;
  if (hasSolDouble(advised) || hasSendSolBack(advised) || hasTypoDouble(advised)) pushHit(hits, seen, "term", "sol");
  const short = new Set((list.shortWords ?? []).map((word) => termKey(word)));
  const variants = [advised, leet(advised, "i"), leet(advised, "l")];
  for (const variant of variants) {
    for (const word of joinLooseLetters(wordsOf(maskShortContext(variant)))) {
      if (short.has(word)) pushHit(hits, seen, "short", word);
      if (handleNames.has(word)) pushHit(hits, seen, "handle", word);
    }
  }

  const compactForms = [...new Set(variants.map((variant) => compact(variant)))];
  const plain = compact(advised);
  if (/\d+x/.test(plain) || /x\d+/.test(plain)) pushHit(hits, seen, "term", "Nx");
  for (const term of list.terms ?? []) {
    const key = termKey(term);
    if (!key || short.has(key)) continue;
    if (compactForms.some((form) => form.includes(key))) pushHit(hits, seen, "term", term);
  }

  return { blocked: hits.length > 0, hits };
}

export function exportAllowed(title, body, list = blocklist, token = "") {
  return !analyze(title, list).blocked && !analyze(body, list).blocked && !analyze(token, list).blocked;
}

export { blocklist };
