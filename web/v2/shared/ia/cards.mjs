/** Fichas breves de ORVUPI. El texto es el de las fuentes oficiales, no el del modelo. */

const COPY = {
  orvupi: {
    es: "ORVUPI es el proyecto de orvupi.com: comunidad, humor y herramientas para explorar la web. Esas herramientas son Work, Studio, Sonar, Verify, Academy y ARQIVEN. El único contrato oficial está en Solana. La web está en español, inglés, portugués, japonés y coreano.",
    en: "ORVUPI is the project at orvupi.com: a community, humor and tools for exploring the web. Those tools are Work, Studio, Sonar, Verify, Academy and ARQIVEN. The only official contract is on Solana. The site is in Spanish, English, Portuguese, Japanese and Korean.",
    "pt-BR": "ORVUPI é o projeto de orvupi.com: comunidade, humor e ferramentas para explorar a web. Essas ferramentas são Work, Studio, Sonar, Verify, Academy e ARQIVEN. O único contrato oficial está na Solana. O site está em espanhol, inglês, português, japonês e coreano.",
    ja: "ORVUPI は orvupi.com のプロジェクトです。コミュニティとユーモアと、ウェブを探るツールです。ツールは Work、Studio、Sonar、Verify、Academy、ARQIVEN です。公式コントラクトは Solana 上に一つだけです。サイトはスペイン語、英語、ポルトガル語、日本語、韓国語です。",
    ko: "ORVUPI는 orvupi.com의 프로젝트입니다. 커뮤니티와 유머, 웹을 살펴보는 도구입니다. 도구는 Work, Studio, Sonar, Verify, Academy, ARQIVEN입니다. 공식 컨트랙트는 Solana에 하나뿐입니다. 사이트는 스페인어, 영어, 포르투갈어, 일본어, 한국어입니다.",
  },
  work: {
    es: "ORVUPI Work es el espacio de trabajo de ORVUPI en la web, donde se escriben y guardan documentos. No es el sistema operativo. La ruta es /work/.",
    en: "ORVUPI Work is ORVUPI's workspace on the web, where documents are written and kept. It is not the operating system. The route is /work/.",
    "pt-BR": "ORVUPI Work é o espaço de trabalho da ORVUPI na web, onde se escrevem e guardam documentos. Não é o sistema operacional. A rota é /work/.",
    ja: "ORVUPI Work はウェブ上の ORVUPI の作業場所で、文書を書いて保存します。オペレーティングシステムではありません。ルートは /work/ です。",
    ko: "ORVUPI Work는 웹에 있는 ORVUPI의 작업 공간이며, 문서를 쓰고 보관합니다. 운영체제가 아닙니다. 경로는 /work/ 입니다.",
  },
  studio: {
    es: "ORVUPI Studio es la herramienta de diseño de ORVUPI en la web. La ruta es /studio/.",
    en: "ORVUPI Studio is ORVUPI's design tool on the web. The route is /en/studio/.",
    "pt-BR": "ORVUPI Studio é a ferramenta de desenho da ORVUPI na web. A rota é /pt-br/studio/.",
    ja: "ORVUPI Studio はウェブ上の ORVUPI のデザインツールです。ルートは /ja/studio/ です。",
    ko: "ORVUPI Studio는 웹에 있는 ORVUPI의 디자인 도구입니다. 경로는 /ko/studio/ 입니다.",
  },
  sonar: {
    es: "ORVUPI Sonar verifica en cadena y muestra datos de mercado. El subtítulo es «Sonar · verify on-chain». La ruta es /sonar/.",
    en: "ORVUPI Sonar verifies on-chain and shows market data. The subtitle is «Sonar · verify on-chain». The route is /en/sonar/.",
    "pt-BR": "ORVUPI Sonar verifica on-chain e mostra dados de mercado. O subtítulo é «Sonar · verify on-chain». A rota é /pt-br/sonar/.",
    ja: "ORVUPI Sonar はオンチェーンで検証し、市場データを表示します。サブタイトルは「Sonar · verify on-chain」です。ルートは /ja/sonar/ です。",
    ko: "ORVUPI Sonar는 온체인으로 검증하고 시장 데이터를 보여 줍니다. 부제는 «Sonar · verify on-chain»입니다. 경로는 /ko/sonar/ 입니다.",
  },
  verify: {
    es: "ORVUPI Verify contrasta un token con fuentes públicas. La ruta es /verify/.",
    en: "ORVUPI Verify checks a token against public sources. The route is /en/verify/.",
    "pt-BR": "ORVUPI Verify confere um token com fontes públicas. A rota é /pt-br/verify/.",
    ja: "ORVUPI Verify は公開情報とトークンを照合します。ルートは /ja/verify/ です。",
    ko: "ORVUPI Verify는 공개 자료와 토큰을 대조합니다. 경로는 /ko/verify/ 입니다.",
  },
  academy: {
    es: "ORVUPI Academy es la sección de ORVUPI para aprender. La ruta es /academy/.",
    en: "ORVUPI Academy is ORVUPI's section for learning. The route is /academy/.",
    "pt-BR": "ORVUPI Academy é a seção da ORVUPI para aprender. A rota é /academy/.",
    ja: "ORVUPI Academy は ORVUPI で学ぶための欄です。ルートは /academy/ です。",
    ko: "ORVUPI Academy는 ORVUPI에서 배우는 칸입니다. 경로는 /academy/ 입니다.",
  },
  arqiven: {
    es: "ARQIVEN es la IA de ORVUPI. No tiene un modelo propio: si responde un modelo, es de terceros y se nombra aparte. La ruta es /arqiven/.",
    en: "ARQIVEN is ORVUPI's AI. It has no model of its own: if a model answers, it is a third-party model and it is named as such. The route is /en/arqiven/.",
    "pt-BR": "ARQIVEN é a IA da ORVUPI. Não tem um modelo próprio: se um modelo responde, é de terceiros e aparece com o nome dele. A rota é /pt-br/arqiven/.",
    ja: "ARQIVEN は ORVUPI の AI です。独自モデルはありません。モデルが答える場合は第三者で、その名前を出します。ルートは /ja/arqiven/ です。",
    ko: "ARQIVEN은 ORVUPI의 AI입니다. 자체 모델은 없습니다. 모델이 답하면 제3자이고, 그 이름을 밝힙니다. 경로는 /ko/arqiven/ 입니다.",
  },
  contract: {
    es: "El único contrato oficial de ORVUPI está en Solana y es Bj6orFgn4UegmXtQ4WHcBsHSjjfgruHcScCSeauW1TyU. Cualquier otra dirección no es ORVUPI.",
    en: "The only official ORVUPI contract is on Solana: Bj6orFgn4UegmXtQ4WHcBsHSjjfgruHcScCSeauW1TyU. Any other address is not ORVUPI.",
    "pt-BR": "O único contrato oficial da ORVUPI está na Solana e é Bj6orFgn4UegmXtQ4WHcBsHSjjfgruHcScCSeauW1TyU. Qualquer outro endereço não é ORVUPI.",
    ja: "ORVUPI の公式コントラクトは Solana 上の Bj6orFgn4UegmXtQ4WHcBsHSjjfgruHcScCSeauW1TyU だけです。それ以外のアドレスは ORVUPI ではありません。",
    ko: "ORVUPI의 공식 컨트랙트는 Solana의 Bj6orFgn4UegmXtQ4WHcBsHSjjfgruHcScCSeauW1TyU 하나뿐입니다. 다른 주소는 ORVUPI가 아닙니다.",
  },
};

const MENTION = {
  sonar: /\bsonar\b/i,
  work: /\bwork\b/i,
  studio: /\bstudio\b/i,
  verify: /\bverify\b/i,
  academy: /\bacademy\b/i,
  arqiven: /\barqiven\b/i,
  contract: /contrato|contract|コントラクト|컨트랙트/i,
  orvupi: /\borvupi\b/i,
};

const TOOL = /\b(sonar|studio|verify|academy|work|arqiven)\b|contrato|contract|コントラクト|컨트랙트/i;

export function cardIdOf(url) {
  const path = String(url || "");
  if (/\/token\/?$/.test(path)) return "contract";
  if (/\/sonar\/?$/.test(path)) return "sonar";
  if (/\/work\/?$/.test(path)) return "work";
  if (/\/studio\/?$/.test(path)) return "studio";
  if (/\/verify\/?$/.test(path)) return "verify";
  if (/\/academy\/?$/.test(path)) return "academy";
  if (/\/arqiven\/?$/.test(path)) return "arqiven";
  if (/^\/(?:en\/|pt-br\/|ja\/|ko\/)?$/.test(path)) return "orvupi";
  return "";
}

function langCode(lang) {
  if (lang === "pt" || lang === "pt-BR") return "pt-BR";
  if (lang === "en" || lang === "ja" || lang === "ko") return lang;
  return "es";
}

function mentions(id, question) {
  const text = String(question || "");
  if (id === "orvupi" && /\b(idiomas?|languages?|l[ií]nguas?|言語|언어)\b/i.test(text) && /\borvupi\b|サイト|사이트/i.test(text)) return true;
  if (id === "orvupi") return MENTION.orvupi.test(text) && !TOOL.test(text);
  return MENTION[id]?.test(text) === true;
}

/** Ficha oficial solo si la búsqueda deja una clara por encima de las demás. */
export function verifiedCard(question, hits, lang) {
  const list = Array.isArray(hits) ? hits : [];
  const top = list[0];
  if (!top?.curated) return null;
  const id = cardIdOf(top.url);
  if (!id || !mentions(id, question)) return null;
  if (!(Number(top.score) >= 8)) return null;
  const rival = list.find((hit) => {
    const other = cardIdOf(hit.url);
    return other && other !== id;
  });
  if (rival && Number(top.score) < Number(rival.score) * 1.15) return null;
  const code = langCode(lang || top.lang);
  const same = list.filter((hit) => cardIdOf(hit.url) === id && hit.curated);
  const chosen = same.find((hit) => hit.lang === code) || same.find((hit) => hit.lang === langCode(top.lang)) || top;
  const text = COPY[id]?.[code] || String(chosen.text || chosen.excerpt || "").trim();
  if (!text) return null;
  return {
    id,
    text,
    title: String(chosen.title || id),
    url: String(chosen.url || ""),
    license: chosen.license || "MIT",
    lang: code,
  };
}

export function cardCopy(id, lang) {
  return COPY[id]?.[langCode(lang)] || "";
}
