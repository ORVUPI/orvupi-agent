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
| 360, 390, 768, 1366 y zoom 200 % | comprobado | Con la barra de preparación, `scrollWidth - clientWidth = 0` en 360, 390, 768 y 1366, y con `zoom: 2` a 1366. Chrome headless. No es un teléfono físico. |
| Sin datos personales de la maqueta | comprobado | No está «Espacio de Cristian» ni las respuestas fijas («Podríamos organizar tu idea», «RESUMEN DE EJEMPLO»). Test `arqiven-public`. |
| Lo no hecho se dice | comprobado | Proyectos y Documentos: «pendiente de implementación». La voz avisa de que no hay micrófono. Tras pulsarla, `getUserMedia` no se llama. |
| Nav tras Work y mapa | comprobado | Inicio, Herramientas, Work, ARQIVEN, Memes… en la home. 110 barras ya existentes más el mapa tras Studio. `aria-current="page"` en las cinco páginas de ARQIVEN. |
| La home no es la página de funciones de la maqueta | comprobado | La vista inicial es el saludo y la caja. |

## B. Núcleo común

| Criterio | Estado | Evidencia |
| --- | --- | --- |
| Contrato AiRequest / AiResult | comprobado | `web/v2/shared/ia/contract.mjs` y el paralelo `apps/work/src/ai/contract.ts`. Test de `createRequest`, `honestResult`, `settleResult`. |
| Sin modelo preparado: `none` / `rules` | comprobado | Chrome headless, `/arqiven/`. Enviar «hola» sin preparar dejó `rules · none · none` y «No hay respuesta generada…». La caja siguió habilitada. El cuerpo no contiene «Pensando». |
| Un tercero no pasa a llamarse Arqiven-N | comprobado | `thirdPartyResult` deja `smol135-cpu` / `third-party` / `SmolLM2-135M-Instruct`. `arqiven-1-experimental` sin checkpoint vuelve a `none`. `capabilities().models` sigue vacío. Test `arqiven-engine`. |
| Una sola superficie de AiStudio | comprobado en fuente y en el bundle | El menú abre el panel y no navega a `ai`. La ruta `ai` muestra un aviso y el mismo panel. El bundle `index-CS73DIMf.js` repite ese montaje. No se ha rehecho el build de Work. |
| Studio no sustituye el catálogo | comprobado | Sin `__ARQIVEN_ENGINE__.ready`, `studioAsk()` devuelve el catálogo vacío. Un resultado `arqiven` sin checkpoint tampoco lo sustituye. «Textos rápidos» no se toca. |
| Textos rápidos y espera honesta | comprobado en fuente | Título del panel en `ai-optional.mjs`. La copia dice «Buscando en el catálogo…». El spec de Playwright de Studio no se ha vuelto a ejecutar. |
| Sin SharedWorker | comprobado | `app.js` no lo menciona. El worker de ARQIVEN es dedicado, un hilo (`numThreads = 1`). |
| Flag `arqiven-core` | comprobado en fuente | `coreEnabled()` es verdadero salvo `localStorage` `arqiven-core=0`. El bundle publicado no llama a `runWorkGenerate`: esa llamada se añadió después del último build de Work. |

## C. Privacidad y documentos

| Criterio | Estado | Evidencia |
| --- | --- | --- |
| Guardar es explícito y no pisa | comprobado | Dos pulsaciones de «Guardar en Work» crearon `432bbff6-7287-496a-8474-f485cc867d3a` y `fca6ba35-816e-43cc-82f5-755d47f2e93c`. Nota `orvupi-note` versión 1. `BroadcastChannel` lo emite `work-store.mjs`. |
| TXT/MD se lee aquí | comprobado | `nota.txt` dejó el estado «Archivo leído en este navegador. No se ha enviado a ningún servidor.» |
| Sin `localStorage` para encender la página | comprobado | `app.js` no usa `localStorage`. |
| Los documentos no salen | comprobado en política | `documentsLeaveDevice: false`. La CSP nueva de `/arqiven/` solo añade Hugging Face y jsDelivr, los orígenes que Work ya usa para pesos y WASM. No hay `unsafe-inline`, ni YouTube, ni `form-action`. `/*` sigue en `connect-src 'self'`. Studio no recibe esa excepción. |
| OCR y DOCX/PDF | pendiente | La página dice que no genera DOCX ni PDF. No se ha vuelto a medir la fidelidad de pdf.js en Work. Esa lectura sigue siendo `getTextContent`, no OCR. |

## D. Entrenamiento

| Criterio | Estado | Evidencia |
| --- | --- | --- |
| Conteo a coste 0 | comprobado | `node docs/orvupi-ia/entrenamiento/comprobar.mjs` imprimió 17504640 y salió 0. Con `--checkpoint x.bin` salió 2 y no leyó el archivo. |
| Entrenamiento | pendiente | No hay forward, backward, GPU ni red. El tope de 100 € no se usa. |
| Id Arqiven-N | comprobado como reserva | El id de producto es `arqiven-1-experimental`. No existe `orvupi-text-experimental-0.1`. Arqiven-2 es solo un nombre. |
| Equivalencia con otros asistentes | no aplicable | No se afirma. |

## E. Coste y publicación

| Criterio | Estado | Evidencia |
| --- | --- | --- |
| Autorización de la ruta | comprobado | El propietario pidió la implementación en esta rama, sin merge y sin `wrangler`. |
| Publicación en orvupi.com | pendiente en esta rama | La ruta ya está en producción por el merge `760e3d0` y el deploy `a30885da`. Este cambio de motor no se despliega aquí. |
| Gasto | comprobado | Autorizado 0, gastado 0, reservado 0. Sin API de pago ni GPU. |
| Reversión | comprobado como procedimiento | Revertir los commits de esta rama quita la ruta, la barra y el sitemap. `arqiven-core` apagado deja AiStudio como está. No se borra el motor de Work. |

## Choques con el paquete

Se eligió conservar funciones y la marca ARQIVEN.

| El paquete decía | Esta rama |
| --- | --- |
| Nombre comercial «ORVUPI IA» e id `orvupi-text-experimental-0.1` | UI pública ARQIVEN. Id reservado `arqiven-1-experimental`. |
| Respuestas de ejemplo de la maqueta v02 | No se copian. La caja admite texto y la respuesta dice que no hay generación. |
| Work se presenta como «ORVUPI AI» | El botón «Preparar ORVUPI AI» y el `aria-label` se mantienen por los e2e. El prompt del bundle ya no dice «Eres ORVUPI AI». La ficha visible dice que Qwen, LFM2 y SmolLM2 son de terceros. |
| Abrir CSP si la página descarga pesos | Excepción mínima en `/arqiven/` y en el meta de las cinco páginas: Hugging Face y jsDelivr. `/*` y Studio no cambian. |
| Tope de 100 € | No es autorización. Esta corrida gasta 0. |

## Motor de terceros

| Criterio | Estado | Evidencia |
| --- | --- | --- |
| Preparar no bloquea el hilo ni arranca solo | comprobado | El click pidió `transformers@4.3.1` en jsDelivr y `HuggingFaceTB/SmolLM2-135M-Instruct` en Hugging Face. A los 2 s el estado era «Descargando un modelo de terceros. Puedes seguir escribiendo. 100% onnx/model_quantized.onnx». La caja seguía habilitada. |
| Cancelar | comprobado | En una carga anterior, Cancelar dejó el progreso vacío y la pastilla en «Sin modelo». |
| Etiqueta tras generar | comprobado | Con el modelo listo, la pastilla era `tercero · smol135-cpu`. Un envío produjo `model · third-party · smol135-cpu · SmolLM2-135M-Instruct` y texto del modelo. No es una respuesta fija de la maqueta ni un Arqiven-1. SmolLM2 135M divaga: eso se muestra, no se reescribe. |
| Editor lateral | comprobado | A 390 px el editor mide 390×844 y tapa la vista. El aviso dice que es texto local, no un documento generado. Desbordamiento 0. |
| Voz | comprobado | El botón dejó el aviso de propuesta. `getUserMedia` no se llamó. |

## Cómo probarlo en local

Servir `web/v2/` y abrir `/arqiven/`. Enviar sin pulsar «Preparar modelo de terceros» muestra «No hay respuesta generada» y la insignia `rules · none · none`. Preparar descarga SmolLM2 en el navegador y, al terminar, la insignia pasa a `model · third-party · smol135-cpu · SmolLM2-135M-Instruct`. Cancelar corta la descarga. «Guardar en Work» sigue creando una nota nueva. Studio, sin motor listo en esa página, sigue respondiendo con el catálogo.
