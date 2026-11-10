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
