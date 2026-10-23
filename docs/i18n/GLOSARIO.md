# Glosario de i18n · ORVUPI

Fuente única para mantener los mismos términos en la web y en ORVUPI Work. Las traducciones manuales viven en `i18n/overrides.json` (inglés → pt-BR, ja, ko) e `i18n/attrs-manual.json` (español → en, pt-BR, ja, ko).

## No se traducen nunca

| Término | Motivo |
|---|---|
| ORVUPI, ORVUPI Work, ORVUPI AI, $ORVUPI | Marca |
| Verify, Lab, Studio, Work | Nombres de producto |
| `Bj6orFgn4UegmXtQ4WHcBsHSjjfgruHcScCSeauW1TyU` | Dirección del contrato (CA) |
| Direcciones de billetera, mints, firmas e identificadores de transacción | Datos on-chain |
| SOL, USDC, BNB, ETH y demás símbolos | Símbolos de token |
| Solana, Base, Ethereum, BNB Chain, Pump.fun, Raydium LaunchLab, Phantom, Solflare, Jupiter, DexScreener | Nombres propios de terceros |
| X, Telegram, TikTok, Farcaster, GitHub | Redes |
| DOCX, XLSX, PPTX, PDF, CSV, HTML, TXT, JSON, PNG | Formatos |
| Código, `<code>`, URLs y correos (`orvupi.hq@gmail.com`, `x.com/ORVUPI`, `t.me/orvupi`) | Enlaces oficiales |
| Nombres de fuentes (Inter, Silkscreen, Anton…) | Nombres propios |

El borrador automático los protege con marcadores (`scripts/i18n/mt_argos.py`, lista `PROTECT` y expresiones de direcciones/URL). Si un marcador se pierde, la cadena vuelve al inglés y queda listada en `i18n/review-status.json`.

## Términos fijados

| Español | English | Português (Brasil) | 日本語 | 한국어 |
|---|---|---|---|---|
| Inicio | Home | Início | ホーム | 홈 |
| Herramientas | Tools | Ferramentas | ツール | 도구 |
| Comunidad | Community | Comunidade | コミュニティ | 커뮤니티 |
| Visión | Vision | Visão | ビジョン | 비전 |
| Token ORVUPI | ORVUPI token | Token ORVUPI | ORVUPI トークン | ORVUPI 토큰 |
| Cuaderno | Notebook | Caderno | ノート | 노트 |
| Tablero | Board | Painel | ボード | 보드 |
| Curva | Curve | Curva | カーブ | 커브 |
| Riesgos | Risks | Riscos | リスク | 위험 |
| Seguridad | Security | Segurança | セキュリティ | 보안 |
| Marca | Brand | Marca | ブランド | 브랜드 |
| Dirección del mint | Mint address | Endereço do mint | ミントアドレス | 민트 주소 |
| Autoridad de mint | Mint authority | Autoridade de mint | ミント権限 | 민트 권한 |
| Autoridad de congelación | Freeze authority | Autoridade de congelamento | 凍結権限 | 동결 권한 |
| Metadatos mutables | Mutable metadata | Metadados mutáveis | 変更可能なメタデータ | 변경 가능한 메타데이터 |
| Posible suplantación | Possible impersonation | Possível imitação | なりすましの可能性 | 사칭 가능성 |
| Registro curado | Curated registry | Registro curado | キュレーション済みレジストリ | 선별 레지스트리 |
| Billetera (wallet) | Wallet | Carteira | ウォレット | 지갑 |
| Canales oficiales | Official channels | Canais oficiais | 公式チャンネル | 공식 채널 |
| Docs / Hojas / Presentaciones | Docs / Sheets / Slides | Docs / Planilhas / Apresentações | ドキュメント / スプレッドシート / スライド | 문서 / 시트 / 슬라이드 |
| Mi unidad | My Drive | Meu Drive | マイドライブ | 내 드라이브 |
| Plantillas | Templates | Modelos | テンプレート | 템플릿 |
| Ajustes | Settings | Configurações | 設定 | 설정 |
| Guardado / Cambios pendientes | Saved / Unsaved changes | Salvo / Alterações não salvas | 保存済み / 未保存の変更 | 저장됨 / 저장되지 않은 변경 사항 |

## Tono

- pt-BR: «você», frases cortas, sin portugués de Portugal (arquivo, tela, salvar, excluir).
- ja: です・ます調; UI con sustantivos cortos (保存, 削除); espacio entre latín y japonés solo junto a nombres de marca.
- ko: 합니다체 en mensajes, sustantivos en botones (저장, 삭제).
- Nada de promesas de rentabilidad, alianzas, certificaciones ni cifras que no estén en el original.
