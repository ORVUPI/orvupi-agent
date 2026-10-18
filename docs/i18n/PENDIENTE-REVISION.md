# Traducciones pendientes de revisión humana

**Estado: TODO lo que está en pt-BR, ja y ko es un borrador hecho con IA y necesita revisión por un hablante competente antes de publicarse en producción.** El inglés de la web ya existía (escrito por el equipo); los 15 atributos que solo estaban en español se tradujeron a mano.

## Cómo se ha hecho

1. Términos más visibles (navegación, botones, selector, portada, menús de Work, plantillas): traducción manual en `i18n/overrides.json` y `i18n/attrs-manual.json`.
2. Resto: borrador automático sin conexión con los modelos de Argos Translate (MIT; modelos OPUS-MT/CC) mediante `scripts/i18n/mt_fast.py`, desde el inglés. Calidad **baja-media**, sobre todo en japonés y coreano, y en frases largas. No usar en producción sin revisar.
3. Si el borrador perdía un nombre protegido (ORVUPI, CA, URL, `{marcador}`), la cadena queda **en inglés** (respaldo) y aparece abajo.

## Cifras

| Idioma | Manual | Borrador automático | Queda en inglés |
|---|---:|---:|---:|
| pt-BR | 215 | 1562 | 77 |
| ja | 215 | 1626 | 13 |
| ko | 215 | 1632 | 7 |

Además se descartan (y quedan en inglés) las salidas automáticas con palabras vetadas por las reglas del proyecto (holder/reserva, analítica, «no oficial», STUBX) o con caracteres de otro alfabeto.

## Prioridad 1: legal, riesgos y finanzas (revisar primero)

Páginas: `/risks/`, `/legal/`, `/token/`, `/security/`, `/methodology/`, `/verify/` (resultados y avisos), `/pares/` y `/comparar/` (curva), y en Work `aiUnavailable`, `privacy`, `offline` y los textos de copia de seguridad.

Cualquier frase sobre riesgo, rentabilidad, custodia, firma, contrato, curva, liquidez o «no es una recomendación» debe revisarla una persona con criterio legal en cada idioma. Mientras no se revise, la versión de referencia es la española (raíz) o la inglesa (/en/).

## Prioridad 2: interfaz de ORVUPI Work

`apps/work/src/i18n/locales/{pt-BR,ja,ko}.json` (642 claves + 55 de plantillas `tpl:`).

## Prioridad 3: resto de páginas

Lab (lecciones), Aprender, Cuaderno, Studio, Tablero, Contribuir, Marca, Memes, Visión, Comunidad.

## Cadenas que caen al inglés

### pt-BR (77)

- 2026-10-08 · ORVUPI Verify (MVP, read-only)
- 2026-10-09 · Verify and Lab security review (draft, unpublished)
- 2026-10-09 · Verify reads any mint, read-only, unpublished
- 2026-10-11 · Base, fase 1 de la lectura multired
- 2026-10-11 · Seguridad de Ethereum y BNB Chain
- Do not pretend to be ORVUPI: do not use the avatar as your profile picture or say your account is official.
- Educational example. It is not a quality comparison, a recommendation, or an endorsement. ORVUPI has no relationship with any token in this example.
- Educational exercises with real cards for USDC and for copies that use its name. None of them is an ORVUPI contract.
- Legal reviews this fixed educational example. Any version with real data will need a new review. Still absent from this website.
- Library and notebook.
- Library for any token
- Limits and risks
- Live reading of public blockchain data. It is not an audit, a recommendation, or an endorsement. ORVUPI has no relationship with this token. No signals showing does not mean everything was checked.
- MIT code. Flat color taken from the ORVUPI meme kit palette.
- MIT code. Studio drawing, with no outside files.
- Meet the community
- Merged into main. The page is at /verify.
- Named like ORVUPI, but not the official address
- Network selector on Verify and the Notebook, with Solana when the page opens. Read-only reading of a contract on Base through the public node mainnet.base.org. Ethereum and BNB Chain were switched on 
- No account or mandatory wallet connection. Language, Lab progress, the Studio draft, and the notebook, if they are used, stay in this browser.
- No form. It links to GitHub.
- Nobody from ORVUPI will ask for your seed or funds by DM or email (the only official email:
- Nobody from ORVUPI will write to you by private message about your meme. If it happens, it is a scam: do not reply, do not open links and do not sign anything.
- ORVUPI Lab, mission 1
- ORVUPI Verify, read-only MVP
- ORVUPI assets are the default option. Your token logo stays in this browser and is not sent to any server.
- ORVUPI brings community, humour and creativity together with tools for exploring Web3. The study describes a future vision: we will grow from what people use and find valuable.
- ORVUPI distinguishes checked facts, points needing attention and missing data. Unknown does not mean zero. Check the date, network and address before comparing readings. Lab examples are educational e
- ORVUPI · Board
- ORVUPI · Brand and resources
- ORVUPI · Community
- ORVUPI · Contribute
- ORVUPI · Curve example
- ORVUPI · Curve reading
- ORVUPI · Eight arms. Endless ideas.
- On 2026-10-16 USDC&#39;s metadata account answered and the URI field is empty. The query answered. The fact is not there. It is not an HTTP 429.
- On 2026-10-16, USDC has mint and freeze permissions active. The 5vJm… copy named “USD Coin” has them closed. The same permission is not read the same way on both.
- On USDC, on 2026-10-16, the metadata account was queried. The query was answered and the link (URI) is empty: that fact is not there.
- On every push and pull request: npm ci, typecheck, tests (including verify/ and lab/), a scan of the Verify component for signing code, logs, ppm:print, npm audit, verify:all, and gitleaks. The attest
- On the 2026-10-16 card, USDC has the mint permission active at BJE5MMbqXjVwjAF7oxwPYXnTXDyspzZyt4vwenNw5ruG and the freeze permission active at 7dGbd2QZcCKcTndnHcTL8q7SMVXAkp688NTQYwrRCrar. For a stab
- On the 2026-10-16 cards, EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v (USDC) and 5vJmAfBjsS6wEHcgQGNm69P3fbyPmUU1dVfE5j1rraVZ are different addresses even though both are named “USD Coin”.
- On these cards, the Pump.fun curve is a derived account. If the owner is the curve program, Verify reads public fields: virtual and real curve amounts, the supply on that account, and whether
- Only the channels on this list are official. If an account, website or address is not listed here, treat it as unofficial until you check it on this website.
- Paste any Solana mint. If there is a Pump.fun curve, you see the base currency and the curve state, as they are on chain. If there is no curve, the page says so.
- Real amount of SOL
- SHA-256 of token.json: 6b21145b7482cc649bc687e1a7b7794a3b946fd83c995c1abd6c66ea556b5f0c. securityNotice is still the 2026-10-05 text.
- The 2026-10-16 cards for 4XRbnGgay2XpqJ1F5jGPQ9pRh1JSX12RPCPJASMJU5JW, 5vJmAfBjsS6wEHcgQGNm69P3fbyPmUU1dVfE5j1rraVZ, and H5b7sHTqr7WJqL9X4io8VeTBfePSyv85wEBnKNaZKV9R carry that signal: they are named 
- The ORVUPI study proposes seven families for gradual growth. They are future directions, not seven finished applications or committed dates.
- The ORVUPI token can lose all its value and has no guaranteed price. If the LaunchLab curve does not reach 30 SOL, the Raydium pool is not created and the team's 5% stays locked forever. There may be 
- The Verify cards from 2026-10-16 include one mint in the curated registry, USDC&#39;s (
- The copy has its permissions closed and USDC has them open. What is true?
- The virtual_token_reserves or virtual_quote_reserves field. The card keeps it apart from the real curve amount. On the classic curve, and with the default quote, the quote amount is in lamports.
- USDC, on 2026-10-16, asked for getTokenLargestAccounts and got HTTP 429. The sample stays unavailable.
- We are ORVUPI. A curious octopus, a community to build and tools to explore Web3. Come learn, create and share.
- ‘Holder’ (industry term)
- ‘Holder’ (industry term): an account that holds tokens. It implies no rights and no investor community.
- ≈ 200,000,000 (≈ 20%) when 30 SOL is reached, migration to Raydium CPMM
- Likeness with the registry
- Pump.fun curve: not applicable
- This page is available in English.
- work:laterSheetsTitle
- work:laterSlidesTitle
- work:aiBody
- work:aiMemory
- work:driverOpfs
- work:tableSize
- work:installDone
- work:aboutBody
- work:commandAi
- work:brandAlt
- work:pdfDownload
- work:commentBody
- work:formHint
- work:mergeCells
- work:sheetChartLine
- work:pageMargin
- tpl:City · name@example.com

### ja (13)

- Network selector on Verify and the Notebook, with Solana when the page opens. Read-only reading of a contract on Base through the public node mainnet.base.org. Ethereum and BNB Chain were switched on 
- Nobody from ORVUPI will ask for your seed or funds by DM or email (the only official email:
- None of the 2026-10-16 cards is a Pump.fun curve: on USDC, USDT, and the copies, progress stays not applicable. On a token that is on the curve, progress is inferred from the real amount left.
- On 2026-10-16, USDC has mint and freeze permissions active. The 5vJm… copy named “USD Coin” has them closed. The same permission is not read the same way on both.
- On USDC, on 2026-10-16, the metadata account was queried. The query was answered and the link (URI) is empty: that fact is not there.
- On every push and pull request: npm ci, typecheck, tests (including verify/ and lab/), a scan of the Verify component for signing code, logs, ppm:print, npm audit, verify:all, and gitleaks. The attest
- On the 2026-10-16 card, USDC has the mint permission active at BJE5MMbqXjVwjAF7oxwPYXnTXDyspzZyt4vwenNw5ruG and the freeze permission active at 7dGbd2QZcCKcTndnHcTL8q7SMVXAkp688NTQYwrRCrar. For a stab
- Only the channels on this list are official. If an account, website or address is not listed here, treat it as unofficial until you check it on this website.
- SHA-256 of token.json: 6b21145b7482cc649bc687e1a7b7794a3b946fd83c995c1abd6c66ea556b5f0c. securityNotice is still the 2026-10-05 text.
- The Verify cards from 2026-10-16 include one mint in the curated registry, USDC&#39;s (
- USDC, on 2026-10-16, asked for getTokenLargestAccounts and got HTTP 429. The sample stays unavailable.
- The blockchain could not be read right now. This is the official ORVUPI address published on orvupi.com/token. Press «Try again».
- This page is available in English.

### ko (7)

- Only the channels on this list are official. If an account, website or address is not listed here, treat it as unofficial until you check it on this website.
- SHA-256 of token.json: 6b21145b7482cc649bc687e1a7b7794a3b946fd83c995c1abd6c66ea556b5f0c. securityNotice is still the 2026-10-05 text.
- The only example that uses a real token is the USDC address on Solana:
- With another name the ORVUPI mascot is not used.
- ‘Holder’ (industry term)
- ‘Holder’ (industry term): an account that holds tokens. It implies no rights and no investor community.
- This page is available in English.
