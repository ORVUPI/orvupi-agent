# QA de ORVUPI Sonar

Fecha: 31 de octubre de 2026. Sin merge y sin deploy. La herramienta se llama ORVUPI Sonar, con el subtítulo «Sonar · verify on-chain». `/sonar/` es un alias de la misma app y `/verify/` sigue activo.

## Qué se comprobó

| Comprobación | Resultado |
| --- | --- |
| Título, cabecera, `<title>`, subtítulo y manifest (`short_name`: Sonar) | Hecho en español e inglés en la app, y en los títulos y descripciones de pt-BR, ja y ko |
| Menú principal, junto a Work y ARQIVEN | El enlace se llama Sonar y apunta a `/sonar/` (o a la variante de idioma) |
| Favicon y estado de carga | Pulpo rosa con ondas hacia puntos de red, en `assets/orvupi/sonar.svg` y en el esqueleto de carga |
| Velas con datos reales y redimensionado | En 1440 y 390 el gráfico de Bitcoin muestra velas. La fuente visible es una línea corta, por ejemplo «Fuente: CoinGecko · en vivo · 21:14» |
| Números y redes | Capitalización y volumen en formato compacto (`$488,91K`, `$2,92M`). La variación de 24 h va en verde o rojo. La red se lee con nombre (Ethereum, TON, Robinhood Chain) y un punto de color |
| Horas | Hora local del navegador (`21:14`, `31 oct 21:14`), no ISO con Z |
| Temporalidades | Bitcoin/CoinGecko: 30m, 4h y 1D. Un pool de GeckoTerminal: 1m, 5m, 15m, 1h, 4h y 1D. El botón muestra el tamaño real si la fuente lo cambia |
| Pantallas con datos al abrir | Explorar, DEX, Mercado y Transfers cargan mercado, pools y operaciones. Tracer y Visualizer leen la dirección pública del proyecto. Ficha abre el mint de ORVUPI. Paneles muestra capitalización, volumen y dominio de BTC. Alertas y Etiquetas tienen formulario, alta, edición y borrado local |
| Cadena de respaldo | CoinGecko, luego pool de GeckoTerminal, luego klines de `data-api.binance.vision` y `api.binance.com`. En la prueba, al cortar CoinGecko y GeckoTerminal el gráfico siguió con Binance. Coinbase, Kraken, Tronscan, el archivo CC BY-NC-SA de Binance Vision y la API de Blockscout con clave no se llaman. Detalle en MATRIZ.md |
| Direcciones reales | En Chromium a 1440: mint ORVUPI, USDC de Ethereum, USDC de Base, WBNB, USDC de Arbitrum, USDC de Polygon, una dirección Bitcoin y USDT de Tron. La entrada `esto-no-es-una-direccion` muestra «Eso no es una dirección…» y no tumba la página |
| Navegación | Menú, dock móvil, Más, pestañas de DEX y Mercado, filtros de Transfers, paginación, buscador con `/`, zoom, arrastre y pellizco del grafo, cambio a inglés y apertura de `/sonar/` |
| Accesibilidad | axe sobre `#vf-root` en Chromium 1440, sin violaciones críticas. El contraste de color se revisó aparte del tema oscuro y no bloqueó la prueba |
| Consola | El recorrido no deja `pageerror` ni promesas rechazadas. Un 429 de la fuente sigue pudiendo escribir en la consola del navegador la falta de cabecera CORS; la app no lo enseña como un cero y pasa a la fuente siguiente |
| Capturas | `docs/verify/capturas/` a 1440 y 390: explorar, dex, tracer, visualizer, mercado, alertas, etiquetas, paneles, transfers y ficha |

## Playwright

Configuración: `playwright.sonar.config.mjs`. Chromium y Firefox, 1440 y 390.

| Proyecto | Recorrido | Respaldo de velas |
| --- | --- | --- |
| chromium-1440 | pasa | pasa |
| firefox-1440 | pasa | omitido (basta un navegador) |
| chromium-390 | pasa | omitido |
| firefox-390 | pasa | omitido |

## `npm test` y build

`npm run build` es `tsc`. La pasada completa de `npm test` compila y ejecuta la suite. Los tests nuevos de Sonar (`test/verify-fallback.test.ts`) pasan, igual que la CSP de Verify (el hash del estilo del gráfico no abre `unsafe-inline`).

La suite completa del repositorio sigue en rojo por fallos que ya estaban en la rama y no tocan estos archivos: clases `canva-*` dentro de Studio, la palabra `reserve` dentro del worker PDF de Work, el tablero generado de `site-drafts` y el rastreo de nombres en documentos ajenos a Sonar. No se han cambiado para no mezclar ese arreglo con esta entrega.
