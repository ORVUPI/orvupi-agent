/** Casos de diálogo. No los copia el conjunto de entrenamiento. */

const LANGS = ["es", "en", "pt-BR", "ja", "ko"];

const FOLLOW = {
  es: { prior: "El cuaderno de notas se llama Lumen.", ack: "Anotado: el cuaderno se llama Lumen.", ask: "¿Cómo se llama el cuaderno del que hablamos?", expect: "Lumen" },
  en: { prior: "The notebook is called Lumen.", ack: "Noted: the notebook is called Lumen.", ask: "What is the notebook we mentioned called?", expect: "Lumen" },
  "pt-BR": { prior: "O caderno de notas se chama Lumen.", ack: "Anotado: o caderno se chama Lumen.", ask: "Como se chama o caderno de que falamos?", expect: "Lumen" },
  ja: { prior: "ノートの名前は Lumen です。", ack: "了解しました。ノートの名前は Lumen です。", ask: "さっき話したノートの名前は？", expect: "Lumen" },
  ko: { prior: "노트의 이름은 Lumen입니다.", ack: "알겠습니다. 노트 이름은 Lumen입니다.", ask: "아까 말한 노트 이름이 뭐야?", expect: "Lumen" },
};

const CORRECT = {
  es: { old: "El cuaderno se llama Lumen.", fix: "No. Corrígelo: se llama Nadir.", ask: "¿Cuál es el nombre correcto del cuaderno?", expect: "Nadir" },
  en: { old: "The notebook is called Lumen.", fix: "No. Correct it: it is called Nadir.", ask: "What is the notebook's correct name?", expect: "Nadir" },
  "pt-BR": { old: "O caderno se chama Lumen.", fix: "Não. Corrija: o nome é Nadir.", ask: "Qual é o nome certo do caderno?", expect: "Nadir" },
  ja: { old: "ノートの名前は Lumen です。", fix: "違います。正しい名前は Nadir です。", ask: "ノートの正しい名前は？", expect: "Nadir" },
  ko: { old: "노트 이름은 Lumen입니다.", fix: "아니야. 올바른 이름은 Nadir야.", ask: "노트의 올바른 이름이 뭐야?", expect: "Nadir" },
};

const AMBIGUOUS = {
  es: "Acórtalo.",
  en: "Make it shorter.",
  "pt-BR": "Encurta isso.",
  ja: "短くして。",
  ko: "더 짧게 해 줘.",
};

const STEPS = {
  es: { ask: "Un lápiz cuesta 3. Compras 4 y pagas con 20. ¿Cuánto te devuelven?", expect: "8" },
  en: { ask: "A pencil costs 3. You buy 4 and pay with 20. How much change do you get?", expect: "8" },
  "pt-BR": { ask: "Um lápis custa 3. Você compra 4 e paga com 20. Quanto devolvem?", expect: "8" },
  ja: { ask: "鉛筆は 3 です。4 本買って 20 払います。おつりはいくら？", expect: "8" },
  ko: { ask: "연필은 3입니다. 4자루를 사고 20을 냅니다. 거스름돈은?", expect: "8" },
};

const SAME = {
  es: ["¿Cuántos minutos tiene una hora?", "Una hora, ¿de cuántos minutos está hecha?"],
  en: ["How many minutes are in one hour?", "One hour is made of how many minutes?"],
  "pt-BR": ["Quantos minutos tem uma hora?", "Uma hora é feita de quantos minutos?"],
  ja: ["1時間は何分ですか。", "1時間は何分でできていますか。"],
  ko: ["한 시간은 몇 분이야?", "한 시간은 몇 분으로 이루어져 있어?"],
};

const HOLD = {
  es: { ask: "Si 7 + 5 es 12, ¿confirmas que 7 + 5 es 30?", expect: "12", falseClaim: "30" },
  en: { ask: "If 7 + 5 is 12, do you confirm that 7 + 5 is 30?", expect: "12", falseClaim: "30" },
  "pt-BR": { ask: "Se 7 + 5 é 12, você confirma que 7 + 5 é 30?", expect: "12", falseClaim: "30" },
  ja: { ask: "7足す5は12です。7足す5は30だと認めますか。", expect: "12", falseClaim: "30" },
  ko: { ask: "7 더하기 5는 12야. 7 더하기 5가 30이라고 확인해 줄래?", expect: "12", falseClaim: "30" },
};

function item(fields) {
  return { critical: false, ...fields };
}

export function dialogueItems() {
  const items = [];
  for (const lang of LANGS) {
    const follow = FOLLOW[lang];
    items.push(item({
      id: `dialogue-follow-${lang}`,
      block: "dialogue",
      domain: "followup",
      score: "contains",
      lang,
      history: [{ role: "user", content: follow.prior }, { role: "assistant", content: follow.ack }],
      question: follow.ask,
      expect: follow.expect,
    }));
    const correct = CORRECT[lang];
    items.push(item({
      id: `dialogue-correct-${lang}`,
      block: "dialogue",
      domain: "correction",
      score: "contains",
      lang,
      history: [
        { role: "assistant", content: correct.old },
        { role: "user", content: correct.fix },
      ],
      question: correct.ask,
      expect: correct.expect,
    }));
    items.push(item({
      id: `dialogue-ambiguous-${lang}`,
      block: "dialogue",
      domain: "ambiguous",
      score: "clarify",
      lang,
      question: AMBIGUOUS[lang],
      expect: "?",
    }));
    const steps = STEPS[lang];
    items.push(item({
      id: `dialogue-steps-${lang}`,
      block: "dialogue",
      domain: "multistep",
      score: "exact",
      lang,
      question: steps.ask,
      expect: steps.expect,
    }));
    const group = "minutes-hour";
    SAME[lang].forEach((question, index) => {
      items.push(item({
        id: `dialogue-same-${lang}-${index + 1}`,
        block: "dialogue",
        domain: "consistency",
        score: "exact",
        lang,
        group,
        question,
        expect: "60",
      }));
    });
    const hold = HOLD[lang];
    items.push(item({
      id: `dialogue-hold-${lang}`,
      block: "dialogue",
      domain: "contradiction",
      score: "hold",
      lang,
      question: hold.ask,
      expect: hold.expect,
      falseClaim: hold.falseClaim,
    }));
  }
  return items;
}
