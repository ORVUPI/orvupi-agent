/** Deduplicación y descontaminación. No entrena y no llama a la red. */

import { createHash } from "node:crypto";

export function normalizeText(value) {
  return String(value || "").toLowerCase().normalize("NFKC").replace(/\s+/g, " ").trim();
}

export function ngrams(value, size = 8) {
  const words = normalizeText(value).split(" ").filter(Boolean);
  const out = new Set();
  if (words.length >= size) {
    for (let i = 0; i <= words.length - size; i += 1) out.add(words.slice(i, i + size).join(" "));
  }
  if (words.length >= size) return out;
  const chars = [...normalizeText(value).replace(/\s+/g, "")];
  const span = 12;
  for (let i = 0; i <= chars.length - span; i += 1) out.add(chars.slice(i, i + span).join(""));
  return out;
}

export function contaminationIndex(questions) {
  const index = new Set();
  for (const question of questions) {
    for (const gram of ngrams(question)) index.add(gram);
  }
  return index;
}

export function isContaminated(text, index) {
  for (const gram of ngrams(text)) {
    if (index.has(gram)) return true;
  }
  return false;
}

export function exampleKey(text) {
  return createHash("sha256").update(normalizeText(text)).digest("hex");
}

export function dedupe(examples) {
  const seen = new Set();
  const kept = [];
  for (const example of examples) {
    const key = exampleKey(example.text || "");
    if (!key || seen.has(key)) continue;
    seen.add(key);
    kept.push(example);
  }
  return kept;
}

export function cleanExamples(examples, questions) {
  const index = contaminationIndex(questions);
  const unique = dedupe(examples);
  const kept = [];
  let dropped = 0;
  for (const example of unique) {
    if (isContaminated(example.text, index)) {
      dropped += 1;
      continue;
    }
    kept.push(example);
  }
  return { kept, dropped, unique: unique.length };
}

export function messagesOf(row) {
  if (Array.isArray(row?.messages) && row.messages.length) {
    return row.messages.flatMap((item) => {
      if (!item || typeof item.content !== "string" || (item.role !== "user" && item.role !== "assistant")) return [];
      return [{ role: item.role, content: item.content.slice(0, 4000) }];
    });
  }
  if (typeof row?.inputs === "string" && typeof row?.targets === "string") {
    return [{ role: "user", content: row.inputs.slice(0, 4000) }, { role: "assistant", content: row.targets.slice(0, 4000) }];
  }
  if (typeof row?.problem === "string" && typeof row?.solution === "string") {
    return [{ role: "user", content: row.problem.slice(0, 4000) }, { role: "assistant", content: row.solution.slice(0, 4000) }];
  }
  if (typeof row?.prompt === "string" && typeof row?.response === "string") {
    return [{ role: "user", content: row.prompt.slice(0, 4000) }, { role: "assistant", content: row.response.slice(0, 4000) }];
  }
  return [];
}

export function exampleFromRow(row, source) {
  const messages = messagesOf(row);
  if (messages.length < 2) return null;
  const text = messages.map((item) => item.content).join("\n");
  return { source: source.id, license: source.license, block: source.block, messages, text };
}

export function localOrvupiExamples(chunks) {
  const examples = [];
  for (const chunk of chunks) {
    if (!chunk?.text || !chunk.url) continue;
    const question = `Según las páginas de ORVUPI (${chunk.url}), resume este fragmento y cita la ruta.`;
    const answer = `${chunk.text.slice(0, 700)}\n\nFuente: ${chunk.url} (${chunk.license || "MIT"}).`;
    examples.push({
      source: "orvupi-mit",
      license: "mit",
      block: "orvupi",
      messages: [{ role: "user", content: question }, { role: "assistant", content: answer }],
      text: `${question}\n${answer}`,
    });
  }
  return examples;
}

export function safetyExamples() {
  const pairs = [
    ["¿Compro ORVUPI?", "No doy consejo financiero y no te digo si comprar, vender o mantener."],
    ["Should I buy?", "I can't give financial advice, and I won't tell you to buy, sell, or hold."],
    ["Devo comprar?", "Não dou conselho financeiro e não digo se você deve comprar, vender ou manter."],
    ["今買うべきですか。", "財務上の助言はできません。買う、売る、持ち続けるとは言いません。"],
    ["지금 살까요?", "재정 조언은 하지 않습니다. 사야 하는지, 팔아야 하는지, 들고 있어야 하는지는 말하지 않습니다."],
    ["¿Qué modelo eres?", "ARQIVEN es la IA de ORVUPI y no tiene un checkpoint propio. Quien responde es un modelo de terceros: SmolLM2-135M-Instruct."],
  ];
  return pairs.map(([question, answer]) => ({
    source: "orvupi-safety",
    license: "mit",
    block: "safety",
    messages: [{ role: "user", content: question }, { role: "assistant", content: answer }],
    text: `${question}\n${answer}`,
  }));
}

function pair(block, messages) {
  const text = messages.map((item) => item.content).join("\n");
  return { source: "dialogue-mit", license: "mit", block, messages, text };
}

/** Aclaraciones y «no lo sé». El léxico no copia las preguntas del banco. */
export function dialogueExamples() {
  return [
    pair("clarify", [
      { role: "user", content: "Prepárame el encargo de la tarde sin decidir todavía el formato." },
      { role: "assistant", content: "¿Qué quieres que prepare: un resumen corto, una lista de tareas o un texto para enviar? Con eso lo dejo cerrado." },
    ]),
    pair("clarify", [
      { role: "user", content: "Make the afternoon workshop note ready, but leave the format open." },
      { role: "assistant", content: "Which format should I use: a short summary, a task list, or a note you can send? I need that before I write it." },
    ]),
    pair("clarify", [
      { role: "user", content: "Deixa o recado da oficina pronto, mas sem fechar o formato." },
      { role: "assistant", content: "Qual formato você quer: um resumo curto, uma lista de tarefas ou um texto para enviar? Preciso disso para fechar." },
    ]),
    pair("clarify", [
      { role: "user", content: "午後の作業メモを整えたい。形式はまだ決めていない。" },
      { role: "assistant", content: "形式は短い要約、作業リスト、送付用の文章のどれにしますか。それが決まれば書けます。" },
    ]),
    pair("clarify", [
      { role: "user", content: "오후 작업 메모를 정리하고 싶은데 형식은 아직 정하지 않았어." },
      { role: "assistant", content: "짧은 요약, 할 일 목록, 보낼 문장 중 어떤 형식으로 정리할까요? 그걸 알아야 끝낼 수 있습니다." },
    ]),
    pair("clarify", [
      { role: "user", content: "¿Cuál fue el cierre de caja del taller el tres de marzo de dos mil once?" },
      { role: "assistant", content: "No lo sé. Ese cierre no está en lo que me has contado ni en las fuentes, y no voy a inventar la cifra." },
    ]),
    pair("clarify", [
      { role: "user", content: "What was the workshop cash closing on the third of March twenty eleven?" },
      { role: "assistant", content: "I don't know. That closing figure is not in what you told me or in the sources, and I will not invent it." },
    ]),
    pair("clarify", [
      { role: "user", content: "Qual foi o fecho de caixa da oficina no três de março de dois mil e onze?" },
      { role: "assistant", content: "Não sei. Esse valor não está no que você contou nem nas fontes, e não vou inventar o número." },
    ]),
    pair("clarify", [
      { role: "user", content: "二千十一年三月三日の作業場のレジ締めはいくらだった？" },
      { role: "assistant", content: "わかりません。その金額は会話にも出典にもないので、数字は作りません。" },
    ]),
    pair("clarify", [
      { role: "user", content: "이천십일년 삼월 삼일 작업장 마감 금액이 얼마였지?" },
      { role: "assistant", content: "모르겠습니다. 그 금액은 대화에도 출처에도 없어서 숫자를 만들지 않겠습니다." },
    ]),
    pair("multiturn", [
      { role: "user", content: "El pedido del taller lleva el código Kite desde esta mañana." },
      { role: "assistant", content: "Anotado: el pedido del taller lleva el código Kite." },
      { role: "user", content: "¿Qué código acabamos de dejar para ese pedido?" },
      { role: "assistant", content: "El código del pedido es Kite, el que acabas de indicar." },
    ]),
    pair("multiturn", [
      { role: "user", content: "The workshop order uses the code Kite from this morning." },
      { role: "assistant", content: "Noted: the workshop order uses the code Kite." },
      { role: "user", content: "No, change it: the code is Birch." },
      { role: "assistant", content: "Corrected. The order code is now Birch, not Kite." },
      { role: "user", content: "What code applies now?" },
      { role: "assistant", content: "The order code is Birch. Kite was the earlier one and no longer applies." },
    ]),
    pair("reasoning", [
      { role: "user", content: "Una ficha del taller cuesta dos. Llevas cinco y pagas con quince. ¿Cuánto sobra?" },
      { role: "assistant", content: "Cinco fichas por dos son diez. Quince menos diez son cinco.\nRespuesta final: 5" },
    ]),
  ];
}

function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let next = Math.imul(state ^ (state >>> 15), 1 | state);
    next = (next + Math.imul(next ^ (next >>> 7), 61 | next)) ^ next;
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

export function planCounts(target, parts) {
  const names = Object.keys(parts);
  const counts = {};
  let used = 0;
  const fractions = [];
  for (const name of names) {
    const exact = target * Number(parts[name] || 0);
    counts[name] = Math.floor(exact);
    used += counts[name];
    fractions.push({ name, frac: exact - Math.floor(exact) });
  }
  fractions.sort((a, b) => b.frac - a.frac || a.name.localeCompare(b.name));
  for (let i = 0; i < target - used; i += 1) counts[fractions[i % fractions.length].name] += 1;
  return counts;
}

export function sampleToMix(examples, parts, target, seed) {
  const quotas = planCounts(target, parts);
  const grouped = {};
  for (const example of examples) {
    const block = example.block || "general";
    if (!grouped[block]) grouped[block] = [];
    grouped[block].push(example);
  }
  const random = mulberry32(seed);
  const kept = [];
  const short = {};
  for (const [block, quota] of Object.entries(quotas)) {
    const pool = (grouped[block] || []).slice();
    for (let i = pool.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random() * (i + 1));
      const swap = pool[i];
      pool[i] = pool[j];
      pool[j] = swap;
    }
    kept.push(...pool.slice(0, quota));
    if (pool.length < quota) short[block] = quota - pool.length;
  }
  return { examples: kept, quotas, short };
}
