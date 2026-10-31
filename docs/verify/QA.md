# QA de ORVUPI Sonar

Fecha: 31 de octubre de 2026. Sin merge y sin deploy. Rama `cursor/verify-app-b8c0`, pull request #142. La herramienta se llama ORVUPI Sonar y el subtítulo, dentro de la marca, es «Sonar · verify on-chain». `/sonar/` sigue siendo alias y `/verify/` sigue activo.

## Pulido de esta pasada

| Punto | Qué queda |
| --- | --- |
| Visualizer | Abre el grafo de la wallet pública del proyecto `GKpccLJwKArptzt9j897njXUx9RsV5NKL3Egu7bfMA6Q`. En la captura hay 6 nodos y las contrapartes de las transferencias leídas. El panel derecho es Resumen / Nodos y las transferencias del nodo elegido. No repite las velas de Bitcoin |
| Vistas | Wallet del proyecto y el contrato ORVUPI `Bj6orFgn4UegmXtQ4WHcBsHSjjfgruHcScCSeauW1TyU`, más las vistas guardadas en el navegador |
| Transfers | Filas reales y paginador `1 / 2` en la captura de escritorio. En Visualizer, `1 / 1`. Si no hay filas, el paginador no se pinta. `present.pager(0, 1).label` sigue siendo `— / —` |
| Cabecera | El wordmark es ORVUPI Sonar. El subtítulo va debajo, dentro del logo, y ya no flota en el contenido |
| Mercado | Pestañas segmentadas Resumen y Spot, con mayúscula inicial. Futuros y opciones no tienen una fuente gratuita válida y no están. Una sola tarjeta de Bitcoin |
| Navegación | Solo el ítem activo va en rosa, en el menú de escritorio y en la barra móvil. Las secciones de Más marcan Más, no Tracer ni Visualizer |
| Buscador | El placeholder es «Buscar» (en inglés, «Search»). La etiqueta accesible sigue siendo «Dirección o token». En escritorio se ve el atajo `/` |
| Densidad | Tablas con `tabular-nums`, números a la derecha y scroll horizontal si no caben. Las tarjetas de dos columnas se alinean al contenido. Alertas usa dos columnas y no deja una tercera vacía |

La lectura de Solana en el navegador no llama a `api.mainnet-beta.solana.com`: cualquier `Origin` recibe 403. La cuenta sale de PublicNode. Si la lista de firmas viene vacía, sigue en el RPC público de Vibe Station (el host general y las regiones `atl1` y `ams1`), sin clave. `getTransaction` va en lotes de 3, con 1,2 s entre llamadas al mismo host. Suministro y cuentas grandes no pasan por PublicNode, que las marca como indexadas. El detalle y los términos están en `MATRIZ.md`.

## Playwright

`npx playwright test --config=playwright.sonar.config.mjs`

31 de octubre de 2026, después del pulido: 5 pasaron, 3 se omitieron, salida 0, 1,7 min. El respaldo de velas solo corre en Chromium 1440.

| Proyecto | Recorrido | Respaldo de velas |
| --- | --- | --- |
| chromium-1440 | pasa | pasa (al cortar CoinGecko y GeckoTerminal el gráfico sigue; la línea de fuente puede quedar en Binance) |
| firefox-1440 | pasa | omitido |
| chromium-390 | pasa | omitido |
| firefox-390 | pasa | omitido |

El recorrido abre las diez pantallas, pulsa pestañas, filtros, temporalidades, paginación, buscador, zoom, arrastre y pellizco del grafo, alta, edición y borrado local de alertas y etiquetas, el dock móvil y el cambio a inglés y a `/sonar/`. En Chromium 1440 también lee el mint de ORVUPI, USDC de Ethereum, USDC de Base, WBNB, USDC de Arbitrum, USDC de Polygon, una dirección Bitcoin, USDT de Tron y la entrada `esto-no-es-una-direccion`. axe sobre `#vf-root` no dejó violaciones críticas. El contraste de color del tema oscuro no bloquea la prueba.

## Consola

La prueba falla si hay `pageerror`, una promesa rechazada sin manejar, o un `console.error` de la aplicación. En esta pasada eso quedó en cero.

El navegador puede escribir por su cuenta `Failed to load resource` o un aviso CORS cuando una fuente responde 429 y no manda `Access-Control-Allow-Origin`. CoinGecko lo hace a veces desde `127.0.0.1`. Esas líneas no tumbran la prueba: la app no enseña un cero y pasa a la fuente siguiente. Un 4xx o 5xx que la app deja sin tratar sí haría fallar el recorrido.

## Capturas

Regeneradas en `docs/verify/capturas/` a 1440 y 390: explorar, dex, tracer, visualizer, mercado, alertas, etiquetas, paneles, transfers y ficha. Las de 768, 1024 y `1440-token.png` son de una pasada anterior; este Playwright no las vuelve a sacar.

El bloque «Qué puede comprobar esta red» que se ve debajo de la app es el glosario clásico de `/verify/`. Sigue ahí a propósito.

## `npm test`

`npm test` compila con `tsc` y luego corre la suite. La compilación salió. Resultado de esta pasada: 456 pruebas en verde, 1 omitida, 6 en rojo. Las de Sonar (respaldo de velas, cabecera `<strong>ORVUPI</strong>`, CSP con los hosts de Vibe Station) están entre las verdes.

Los seis rojos ya estaban y no se tocan en este cambio:

| Prueba | Por qué se queda |
| --- | --- |
| `los HTML generados coinciden con los archivos del repositorio` | Solo difiere `site-drafts/tablero/index.html`. El propio test dice que la fila «Usage measurement» está en el tablero editado a mano y que eso ya fallaba en main. Regenerarlo borraría esa fila |
| Studio, «la interfaz no nombra otras herramientas…» y «la licencia va literal…» | `web/v2/studio/app.mjs` usa clases `canva-row`, `canva-plantillas` y similares. La prueba busca la palabra `canva` como término suelto y esas clases la disparan. Renombrar el layout de Studio no es este pulido |
| Studio, «no hay hosts externos…» | `web/v2/studio/desktop.css` lleva `http://www.w3.org/2000/svg` dentro de un icono SVG en un data-URI. Es el espacio de nombres del SVG, no un host de Sonar, y la lista permitida es la de Studio |
| «el nombre y los apellidos no distinguen mayúsculas» | Marca `docs/orvupi-ia/CRITERIOS.md`, `docs/orvupi-ia/PLAN-IMPLEMENTACION.md`, `docs/orvupi-ia/README.md`, `docs/verify/AUDITORIA.md`, `test/arqiven-public.test.ts`, `test/orvupi-ia-fase0.test.ts` y el diff de la rama frente a main. Reescribir esos documentos o el historial queda fuera de Sonar |
| «las palabras prohibidas no salen…» | El único resto es `reserve` dentro de `work/assets/pdf.worker.min-yatZIOMy.mjs`, el worker PDF minificado de Work. No es texto de Sonar y no se edita un archivo minificado para quitar una palabra interna |
