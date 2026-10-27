# Criterios de aceptación — ARQIVEN

Paquete 1.0 (27 de octubre de 2026). Marca pública ARQIVEN. Ficha reservada `arqiven-1-experimental`. Esta revisión no despliega y no gasta.

Estados: comprobado (hay prueba en esta corrida), pendiente, no aplicable.

## A. Diseño y navegación

| Criterio | Estado | Evidencia |
| --- | --- | --- |
| Saludo «¿En qué puedo ayudarte?» | comprobado | Chrome headless del entorno, `http://127.0.0.1:8765/arqiven/`, 1366×900. El inglés dice «How can I help?». |
| Caja protagonista, herramientas dentro, chips | comprobado | `#tools` visible en 360, 390, 768 y 1366. Enter abre el menú y activa «Resumir». El chip «Crear un texto» rellena la caja y no crea un mensaje. |
| Barra lateral | comprobado | Nuevo chat, Chat, Proyectos, Documentos, historial de la pestaña, enlaces a Work y Studio. Contraer deja el icono y el desbordamiento horizontal sigue en 0 (1366). |
| Colores | comprobado | El botón de enviar usa `#fc2d63`, medido en la hoja del logotipo. No se recolorea el PNG. La cabecera de ORVUPI sigue en su CSS (`#FF3070` / `#102032`). |
| 360, 390, 768, 1366 y zoom 200 % | comprobado | `scrollWidth - clientWidth = 0` en los cuatro anchos y con `zoom: 2` a 1366. Hay scroll vertical (cabecera y pie del sitio). No es un teléfono físico. |
| Sin datos personales de la maqueta | comprobado | No está «Espacio de Cristian» ni las respuestas fijas («Podríamos organizar tu idea», «RESUMEN DE EJEMPLO»). Test `arqiven-public`. |
| Lo no hecho se dice | comprobado | Proyectos y Documentos: «pendiente de implementación». La voz avisa de que no hay micrófono. Tras pulsarla, `getUserMedia` no se llama. |
| Nav tras Work y mapa | comprobado | Inicio, Herramientas, Work, ARQIVEN, Memes… en la home. 110 barras ya existentes más el mapa tras Studio. `aria-current="page"` en las cinco páginas de ARQIVEN. |
| La home no es la página de funciones de la maqueta | comprobado | La vista inicial es el saludo y la caja. |

## B. Núcleo común

| Criterio | Estado | Evidencia |
| --- | --- | --- |
| Contrato AiRequest / AiResult | comprobado | `web/v2/shared/ia/contract.mjs` y el paralelo `apps/work/src/ai/contract.ts`. Test de `createRequest`, `honestResult`, `settleResult`. |
| Sin modelo: `none` / `rules` | comprobado | En Chrome el mensaje lleva `rules · none · none` y el texto «No hay respuesta generada». |
| Un tercero no pasa a llamarse Arqiven-N | comprobado | `settleResult` conserva `qwen05-gpu` / `third-party`. `arqiven-1-experimental` sin `checkpoint: true` vuelve a `none`. `listModels` quita los id `arqiven-*` si no hay checkpoint. `capabilities().models` está vacío. |
| Una sola superficie de AiStudio | comprobado en fuente | `App.tsx`: el lateral no se monta si `view === "ai"`. El paquete publicado `web/v2/work/assets/` no se ha reconstruido. |
| Studio no sustituye el catálogo | comprobado | Test: un gancho con texto vacío deja el formato `logo` y añade `mode: rules`. `catalogAsk()` no devuelve texto. |
| Textos rápidos y espera honesta | comprobado en fuente | Título del panel en `ai-optional.mjs`. La copia dice «Buscando en el catálogo…». El spec de Playwright de Studio se actualizó y no se ejecutó en esta corrida. |
| Sin SharedWorker | comprobado | `app.js` no lo menciona. No hay promesa de un worker compartido. |
| Flag `arqiven-core` | comprobado en fuente | `coreEnabled()` lee `localStorage` `arqiven-core=1`. Por defecto el camino de `engine.generate` no cambia. |

## C. Privacidad y documentos

| Criterio | Estado | Evidencia |
| --- | --- | --- |
| Guardar es explícito y no pisa | comprobado | Dos pulsaciones de «Guardar en Work» crearon `432bbff6-7287-496a-8474-f485cc867d3a` y `fca6ba35-816e-43cc-82f5-755d47f2e93c`. Nota `orvupi-note` versión 1. `BroadcastChannel` lo emite `work-store.mjs`. |
| TXT/MD se lee aquí | comprobado | `nota.txt` dejó el estado «Archivo leído en este navegador. No se ha enviado a ningún servidor.» |
| Sin `localStorage` para encender la página | comprobado | `app.js` no usa `localStorage`. |
| Los documentos no salen | comprobado | `documentsLeaveDevice: false`. La CSP de `/arqiven/` sigue en `connect-src 'self'`. |
| OCR y DOCX/PDF | pendiente | La página dice que no genera DOCX ni PDF. No se ha vuelto a medir la fidelidad de pdf.js en Work. Esa lectura sigue siendo `getTextContent`, no OCR. |

## D. Entrenamiento

| Criterio | Estado | Evidencia |
| --- | --- | --- |
| Línea documentada, sin ejecutarla | pendiente | Sigue en `PLAN-IMPLEMENTACION.md`: `initialize_from: random`, semilla 42, 8 capas, hidden 384, 6 cabezas, contexto 512, vocabulario 8192. No se ha alquilado GPU ni se han cargado pesos. |
| Id Arqiven-N | comprobado como reserva | El id de producto es `arqiven-1-experimental`. No existe `orvupi-text-experimental-0.1`. Arqiven-2 es solo un nombre. |
| Equivalencia con otros asistentes | no aplicable | No se afirma. |

## E. Coste y publicación

| Criterio | Estado | Evidencia |
| --- | --- | --- |
| Autorización de la ruta | comprobado | El propietario pidió la implementación en esta rama, sin merge y sin `wrangler`. |
| Publicación en orvupi.com | pendiente | No hay deploy. El sitemap ya incluye las cinco URL para cuando se publique. |
| Gasto | comprobado | Autorizado 0, gastado 0, reservado 0. Sin API de pago ni GPU. |
| Reversión | comprobado como procedimiento | Revertir los commits de esta rama quita la ruta, la barra y el sitemap. `arqiven-core` apagado deja AiStudio como está. No se borra el motor de Work. |

## Choques con el paquete

Se eligió conservar funciones y la marca ARQIVEN.

| El paquete decía | Esta rama |
| --- | --- |
| Nombre comercial «ORVUPI IA» e id `orvupi-text-experimental-0.1` | UI pública ARQIVEN. Id reservado `arqiven-1-experimental`. |
| Respuestas de ejemplo de la maqueta v02 | No se copian. La caja admite texto y la respuesta dice que no hay generación. |
| Work se presenta como «ORVUPI AI» | Se mantiene en la interfaz y en los tests e2e de Work, y en el paquete ya compilado `web/v2/work/`. El prompt de sistema en fuente ya no dice «Eres ORVUPI AI». |
| Abrir CSP si la página descarga pesos | No se abre. La página no descarga pesos. Work conserva su excepción actual. |
| Tope de 100 € | No es autorización. Esta corrida gasta 0. |

## Cómo probarlo en local

Servir `web/v2/` y abrir `/arqiven/`. Escribir y enviar muestra la frase de «no hay respuesta generada». «Guardar en Work» crea una nota nueva en IndexedDB `orvupi-work`. No hace falta red para ese recorrido.
