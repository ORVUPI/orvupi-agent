/** Comprobaciones deterministas de ARQIVEN. No llaman a la red.
 * La única dirección que puede salir es la de web/v2/shared/orvupi-contract.js.
 */

import { OFFICIAL_ADDRESS, isOfficialAddress } from "../orvupi-contract.js";

export { OFFICIAL_ADDRESS, isOfficialAddress };

const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const ADDRESS = new RegExp(`(?<![${ALPHABET}])[${ALPHABET}]{32,44}(?![${ALPHABET}])`, "g");

const FINANCE_EXPLICIT = [
  /\b(consejo financiero|asesoramiento financiero|recomendaci[oó]n de inversi[oó]n)\b/i,
  /\b(precio objetivo|objetivo de precio|price target|preço alvo)\b/i,
  /\b(should i buy|should i sell|should i invest|should buy|should sell|financial advice)\b/i,
  /\b(debo comprar|devo comprar|devo investir|deber[ií]a invertir|recomiend\w* comprar|recomenda comprar|recommend that i buy)\b/i,
  /\b(buen momento para vender|good time to sell|boa hora para vender|melhor hora para comprar|best time to buy)\b/i,
  /\b(vendo todo|sell everything|vender tudo|cu[aá]nto gano|how much do i make|quanto ganho)\b/i,
  /\b(garantizas beneficio|guarantee a profit|garante lucro|el doble si baja|buy twice|comprar o dobro)\b/i,
  /\b(conselho financeiro|investment recommendation|recomenda[cç][aã]o de investimento|buena inversi[oó]n|good investment|bom investimento)\b/i,
  /\b(mejor momento para comprar|si compro|se eu compro)\b/i,
  /財務アドバイス|目標価格|投資すべき|買うべき|売るべき|いくら投資|儲かり|利益を保証|一番いい時|すべて売|勧めますか|通貨|倍買|良い投資|買うかどうか|投資のおすすめ/,
  /재정 조언|목표 가격|투자해야|사야 할까|사야 할까요|사야 하는지|사는 것을 권|팔아야 할 때|전부 팔|가장 좋은 때|이익을 보장|두 배로|투자 추천|오늘 사면|사도록|살지|코인|좋은 투자/,
];

const PRICE_WORD = /\b(precio|price|preço)\b|価格|가격/;
const PRICE_MOVE = /\b(subir|bajar|go up|go down|vai subir|vai cair)\b|上が|下が|오를|내릴/;

const FINANCE_ASSET = [
  /\b(orvupi|token|cripto|criptomoneda|crypto|bitcoin|btc|memecoin|memecoins)\b/i,
  /\b(acci[oó]n|acciones|moneda|monedas|moeda|moedas|coin|coins)\b/i,
  /\$[A-Za-z]{2,12}\b/,
];

const FINANCE_MOVE = [
  /\b(compro|comprar|compr[eé]|invierto|invertir|vendo|vender|inversi[oó]n)\b/i,
  /\b(va a subir|va a bajar|subir[aá]|bajar[aá])\b/i,
  /\b(buy|sell|invest|go up|go down)\b/i,
  /\b(comprar|vender|investir|vai subir|vai cair)\b/i,
  /買う|買え|売り|売る|投資|上がり|下がり/,
  /사야|살까|팔아|팔까|투자|오를|내릴|매수/,
];

const ADVICE_OUT = [
  /\b(debes|deber[ií]as|te recomiendo|te aconsejo)\s+(comprar|invertir|vender)\b/i,
  /\bcompra ahora\b/i,
  /\byou should (buy|sell|invest)\b/i,
  /\bbuy now\b/i,
  /\bi recommend (buying|selling|investing)\b/i,
  /\bvoc[eê] deve (comprar|investir|vender)\b/i,
  /買うべき|投資すべき|今すぐ買/,
  /사세요|매수하세요|투자하세요/,
];

const REFUSAL = [
  /no (te )?(doy|puedo dar|ofrezco).{0,40}(consejo|asesoramiento|recomend)/i,
  /no es (un )?consejo financiero/i,
  /can(?:not|'t) give.{0,40}financial advice/i,
  /not financial advice/i,
  /i (can't|cannot|won't) (tell you to|recommend)/i,
  /n[aã]o (dou|posso dar).{0,40}(conselho|recomenda)/i,
  /n[aã]o [eé] (um )?conselho financeiro/i,
  /財務上の助言はできません|投資の助言はしません/,
  /재정 조언은 하지 않습니다|투자 조언은 드리지 않습니다/,
];

const IDENTITY_ASK = [
  /qu[eé] modelo/i,
  /qu[eé] ia eres/i,
  /qui[eé]n eres/i,
  /what model/i,
  /which model/i,
  /who are you/i,
  /are you (chatgpt|gpt|claude|arqiven|qwen|smollm)/i,
  /qual modelo/i,
  /quem [eé] voc[eê]/i,
  /どのモデル|あなたは誰|君は誰/,
  /무슨 모델|어떤 모델|너는 누구|당신은 누구/,
  /modelo propio|modelo próprio|model of your own|独自モデル|자체 모델/i,
  /entrenad[oa] desde cero|trained from scratch|treinado do zero|ゼロから|처음부터/i,
  /checkpoint propio/i,
  /chatgpt/i,
  /qui[eé]n responde|who answers|quem responde|誰が答え|누가 답/i,
  /\bpesos\b|weights|重み|가중치/i,
  /arqiven-1/i,
];

const IDENTITY_CLAIM = [
  /\b(soy|eres) arqiven[-\s]?(\d|n)\b/i,
  /\bi am arqiven\b/i,
  /\beu sou (o )?arqiven\b/i,
  /私は\s*arqiven/i,
  /저는\s*arqiven/i,
  /entrenad[oa] desde cero/i,
  /trained from scratch/i,
  /modelo propio de orvupi/i,
  /pesos propios/i,
];

const IDENTITY_DENIAL = [
  /no (soy|tiene|hay) un (modelo propio|checkpoint)/i,
  /no tiene un checkpoint/i,
  /de terceros/i,
  /third[- ]party/i,
  /terceiros/i,
  /第三者/i,
  /제3자/i,
  /smollm|qwen|lfm2/i,
];

export function findAddresses(text) {
  return String(text || "").match(ADDRESS) || [];
}

export function foreignAddresses(text) {
  return [...new Set(findAddresses(text).filter((item) => !isOfficialAddress(item)))];
}

export function asksFinancialAdvice(text) {
  const value = String(text || "");
  if (FINANCE_EXPLICIT.some((pattern) => pattern.test(value))) return true;
  if (PRICE_WORD.test(value) && PRICE_MOVE.test(value)) return true;
  const asset = FINANCE_ASSET.some((pattern) => pattern.test(value)) || findAddresses(value).length > 0 || value.includes(OFFICIAL_ADDRESS);
  if (!asset) return false;
  return FINANCE_MOVE.some((pattern) => pattern.test(value));
}

export function givesFinancialAdvice(text) {
  const value = String(text || "");
  if (!ADVICE_OUT.some((pattern) => pattern.test(value))) return false;
  return !REFUSAL.some((pattern) => pattern.test(value));
}

export function refusesFinancialAdvice(text) {
  return REFUSAL.some((pattern) => pattern.test(String(text || "")));
}

export function asksIdentity(text) {
  const value = String(text || "");
  if (/cita|cite|出典|출처|página|ページ|페이지|\bpage\b/i.test(value)) return false;
  return IDENTITY_ASK.some((pattern) => pattern.test(value));
}

export function claimsOwnModel(text) {
  const value = String(text || "");
  if (!IDENTITY_CLAIM.some((pattern) => pattern.test(value))) return false;
  const namedThird = /smollm|qwen|lfm2/i.test(value);
  const denial = IDENTITY_DENIAL.some((pattern) => pattern.test(value));
  return !(namedThird && denial);
}

export function financeRefusal(lang) {
  const code = normLang(lang);
  if (code === "en") return "I can't give financial advice, and I won't tell you to buy, sell, or hold. ORVUPI does not promise a price. Check the official contract yourself and decide on your own.";
  if (code === "pt") return "Não dou conselho financeiro e não digo se você deve comprar, vender ou manter. A ORVUPI não promete preço. Confira o contrato oficial e decida você.";
  if (code === "ja") return "財務上の助言はできません。買う、売る、持ち続けるとは言いません。ORVUPI は価格を約束しません。公式のコントラクトを自分で確認し、判断はご自身でお願いします。";
  if (code === "ko") return "재정 조언은 하지 않습니다. 사야 하는지, 팔아야 하는지, 들고 있어야 하는지는 말하지 않습니다. ORVUPI는 가격을 약속하지 않습니다. 공식 컨트랙트를 직접 확인하고 판단은 본인이 하세요.";
  return "No doy consejo financiero y no te digo si comprar, vender o mantener. ORVUPI no promete un precio. Comprueba tú el contrato oficial y decide por tu cuenta.";
}

export function caWarning(lang) {
  const code = normLang(lang);
  const address = OFFICIAL_ADDRESS;
  if (code === "en") return `That address is not the ORVUPI contract. The only official contract is ${address}. Any other address was blocked by the check after the answer.`;
  if (code === "pt") return `Esse endereço não é o contrato da ORVUPI. O único contrato oficial é ${address}. Qualquer outro endereço foi bloqueado pela verificação posterior.`;
  if (code === "ja") return `そのアドレスは ORVUPI のコントラクトではありません。公式のコントラクトは ${address} だけです。それ以外のアドレスは回答後の検査で止めています。`;
  if (code === "ko") return `그 주소는 ORVUPI 컨트랙트가 아닙니다. 공식 컨트랙트는 ${address} 하나뿐입니다. 다른 주소는 답변 뒤 검사에서 막았습니다.`;
  return `Esa dirección no es el contrato de ORVUPI. El único contrato oficial es ${address}. Cualquier otra dirección queda bloqueada por la comprobación posterior.`;
}

export function identityAnswer(lang, model) {
  const code = normLang(lang);
  const version = model?.version || "SmolLM2-135M-Instruct";
  const id = model?.id || "smol135-cpu";
  if (code === "en") return `ARQIVEN is ORVUPI's AI and it has no checkpoint of its own. The answer comes from a third-party model: ${version} (${id}). Qwen, LFM2 and SmolLM2 are not renamed as Arqiven-N.`;
  if (code === "pt") return `ARQIVEN é a IA da ORVUPI e não tem um checkpoint próprio. Quem responde é um modelo de terceiros: ${version} (${id}). Qwen, LFM2 e SmolLM2 não são rebatizados como Arqiven-N.`;
  if (code === "ja") return `ARQIVEN は ORVUPI の AI で、独自のチェックポイントはありません。答えているのは第三者モデルです: ${version} (${id})。Qwen、LFM2、SmolLM2 を Arqiven-N とは呼びません。`;
  if (code === "ko") return `ARQIVEN은 ORVUPI의 AI이고 자체 체크포인트는 없습니다. 답하는 모델은 제3자 모델입니다: ${version} (${id}). Qwen, LFM2, SmolLM2를 Arqiven-N으로 부르지 않습니다.`;
  return `ARQIVEN es la IA de ORVUPI y no tiene un checkpoint propio. Quien responde es un modelo de terceros: ${version} (${id}). Qwen, LFM2 y SmolLM2 no se rebautizan como Arqiven-N.`;
}

export function normLang(lang) {
  if (lang === "en") return "en";
  if (lang === "pt" || lang === "pt-BR") return "pt";
  if (lang === "ja") return "ja";
  if (lang === "ko") return "ko";
  return "es";
}

/** Sustituye la salida si hay un contrato distinto del oficial, un consejo financiero o una identidad falsa. */
export function guardOutput(text, lang) {
  const foreign = foreignAddresses(text);
  if (foreign.length) {
    return { text: caWarning(lang), blocked: "ca", critical: true, foreign };
  }
  if (givesFinancialAdvice(text)) {
    return { text: financeRefusal(lang), blocked: "finance", critical: true, foreign: [] };
  }
  if (claimsOwnModel(text)) {
    return { text: identityAnswer(lang), blocked: "identity", critical: true, foreign: [] };
  }
  return { text: typeof text === "string" ? text : "", blocked: null, critical: false, foreign: [] };
}

export function redactForeignAddresses(text) {
  return String(text || "").replace(ADDRESS, (token) => (isOfficialAddress(token) ? token : "[dirección no oficial omitida]"));
}
