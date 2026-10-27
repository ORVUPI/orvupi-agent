# Auditoría — ARQIVEN, Fase 0

Objetivo de esta fase: inventario verificable y propuesta técnica. No se ha publicado en orvupi.com, no se ha contratado GPU ni API de pago y no se ha borrado ninguna función. Gasto: 0 €.

HEAD auditado: `707fef7c32aee3ed7a0dd9751995c690f27d56ef`. Detalle de hashes en [PAQUETE.md](PAQUETE.md).

`AGENTS.md` no está en el repositorio. Se leyeron `README.md`, `CONTRIBUTING.md` y `docs/ORVUPI.md`. El alojamiento público es `web/v2/`, servido por Cloudflare Pages (`web/v2/_headers`). Work vive en `/work/` y Studio en `/studio/`. No hay ruta `/arqiven/` ni `/ia/` en `web/v2/`. La palabra ARQIVEN no aparece en el HTML publicado.

## 0. Marca y barra del sitio

El paquete de encargo usa «ORVUPI IA» como nombre de producto. El propietario lo sustituye el 27 de octubre de 2026, con prioridad sobre ese nombre, en dos capas:

| Capa | Nombre que se escribe | Dónde |
| --- | --- | --- |
| Producto, marca independiente | ARQIVEN | Ítem de la barra principal, `<title>`, saludo de marca y cromo de la app |
| Familia de modelos, ficha técnica | Arqiven-1, Arqiven-2, … | Diagnóstico y ficha. El experimento desde cero se ficha como Arqiven-1 experimental |
| Identificador de máquina | `arqiven-1-experimental` | Campo `modelId`. No es el rótulo de la interfaz |
| Sitio | ORVUPI | Cabecera, Work, Studio, token |

El logotipo oficial es la hoja 1254×1254 en `docs/orvupi-ia/assets/arqiven-logo-oficial.png` (SHA256 `f0b8294692096b5d81151e1702e22fdfbe686a535e8cd834c72323af0000812b`). No está en `web/v2/`. Las cajas de las tres variantes están en [ARQUITECTURA.md](ARQUITECTURA.md).

«ORVUPI IA» deja de usarse como nombre comercial. El código auditado todavía pinta «ORVUPI AI» en `apps/work/src/ai/AiStudio.tsx` (título, botones, `console.info`) y en el sistema de `hybrid.ts` y `prompts.ts`. Eso es el estado actual, no la marca acordada. Cambiar esas cadenas es de la fase de interfaz.

Renombrar Qwen, LFM2 o SmolLM2 a Arqiven-N no crea un modelo de la familia. Los siete del catálogo siguen siendo de terceros.

### Dónde vive la barra

La captura de la home coincide con `web/v2/index.html`. La lista Inicio, Herramientas, Work, Memes, Novedades, Comunidad, Visión, Token ORVUPI es `<nav class="site">` dentro de `<header class="site">`. «Explorar todo» es otro control, `details.mapa`, con el mapa secundario (Verify, Lab, Studio, Cuaderno, Tablero y el resto). Studio no está en la barra principal. ARQIVEN se propone en esa barra, no solo dentro del mapa.

No hay un parcial ni un generador de esa barra. `lab/tools/render.ts` construye otro shell (Verify, Lab, Tablero) y no emite estos ítems. El marcado está copiado en el HTML. Conteo de esta corrida sobre `web/v2/`: 114 HTML, 110 con `<nav class="site">`.

| Copia | Archivos | Lista visible |
| --- | ---: | --- |
| Español, raíz | 21 | Inicio `/`, Herramientas `/#herramientas`, Work `/work/`, Memes `/memes/`, Novedades `/novedades/`, Comunidad `/community/`, Visión `/vision/`, Token ORVUPI `/token/` |
| `/en/` | 21 | Las mismas rutas con prefijo `/en/`, salvo Work, que sigue en `/work/` |
| `/pt-br/`, `/ja/`, `/ko/` | 21 cada uno | El mismo orden, con el rótulo de ese idioma. Work no se traduce |
| `studio/index.html` y sus cuatro idiomas | 5 | La lista anterior más un enlace a GitHub |

### Ruta propuesta

`/arqiven/`, con el rótulo **ARQIVEN** en los cinco idiomas. Es un nombre propio, igual que Work no se traduce. El orden queda así:

Inicio · Herramientas · Work · ARQIVEN · Memes · Novedades · Comunidad · Visión · Token ORVUPI

Hermanas: `/en/arqiven/`, `/pt-br/arqiven/`, `/ja/arqiven/`, `/ko/arqiven/`.

`/ia/` no se usa como ruta pública. El chat de Studio ya ocupa el hash `#/ia`, y el nombre visible no es «IA».

Esta fase no inserta el `<li>`. Un enlace en las 110 páginas apuntaría a una ruta que no existe y saldría en el siguiente despliegue de Pages. El esqueleto de [prototipo/](prototipo/README.md) dibuja la barra para revisión y no se enlaza desde `web/v2`. El alta, cuando se autorice, está en [ARQUITECTURA.md](ARQUITECTURA.md) y en [PLAN-IMPLEMENTACION.md](PLAN-IMPLEMENTACION.md).

## 1. Mapa actual

Hay cuatro superficies distintas que el producto llama IA. No comparten contrato ni estado de conversación.

| Superficie | Dónde | Qué hace de verdad | Modelo |
| --- | --- | --- | --- |
| Work, panel lateral | `aside.ow-ai` en `apps/work/src/app/App.tsx` | `AiStudio` compacto | Terceros, en el navegador, si el usuario prepara el motor |
| Work, página «IA» | `view === "ai"` en el mismo `App.tsx` | Otro `AiStudio`, con estado propio | El mismo singleton `aiEngine()` de esa pestaña |
| Work, documento | `apps/work/src/docs/DocsEditor.tsx` | `AiStudio` con texto y selección del editor | Otra ventana, otro montón de JavaScript |
| Studio, chat `#/ia` | `web/v2/studio/ia.mjs` + `lib/ia-chat.mjs` | Elige plantillas del catálogo local | No |
| Studio, rail y píldora del editor | `views.mjs` cuando `state.rail === "ia"` | Frases fijas de `lib/ai-optional.mjs` | No. El propio módulo dice `enabled: false` |

Los modelos del catálogo de Work son de terceros. Ninguno es un Arqiven-N entrenado desde cero. El identificador reservado para ese experimento es `arqiven-1-experimental`, con ficha «Arqiven-1 experimental». No se reserva `orvupi-text-experimental` ni `orvupi-text-experimental-0.1`: el paquete los sugería y el propietario los sustituye. El plan de ids está en [ARQUITECTURA.md](ARQUITECTURA.md).

| id | Repositorio | Dispositivo | dtype | Tamaño declarado |
| --- | --- | --- | --- | ---: |
| `qwen05-gpu` | `onnx-community/Qwen2.5-0.5B-Instruct` | webgpu | q4f16 | 490 MB |
| `qwen15-gpu` | `onnx-community/Qwen2.5-1.5B-Instruct` | webgpu | q4f16 | 1240 MB |
| `qwen05-cpu` | `onnx-community/Qwen2.5-0.5B-Instruct` | wasm | q8 | 520 MB |
| `qwen15-cpu` | `onnx-community/Qwen2.5-1.5B-Instruct` | wasm | q8 | 1580 MB |
| `lfm350-gpu` | `onnx-community/LFM2-350M-ONNX` | webgpu | q4f16 | 255 MB |
| `lfm350-gpu32` | `onnx-community/LFM2-350M-ONNX` | webgpu | q4 | 295 MB |
| `smol135-cpu` | `HuggingFaceTB/SmolLM2-135M-Instruct` | wasm | q8 | 140 MB |

Fuente: `apps/work/src/ai/engine.ts`. Los de 1.5B solo entran si alguien los elige a mano. En el móvil la cadena automática es LFM2 con WebGPU o SmolLM2 por WASM. En escritorio, Qwen 0.5B (GPU o CPU), luego alternativas. La interfaz los presenta como «ORVUPI AI» con el nombre del tercero en las etiquetas (`Qwen2.5`, `Modelo ligero`). La fase de interfaz cambia el cromo del producto a ARQIVEN y deja el nombre del repositorio en la ficha. No les pone el nombre Arqiven-N.

### Piezas de Work

| Pieza | Archivo | Papel |
| --- | --- | --- |
| Catálogo, detección, worker, cola, sonda | `engine.ts`, `worker.ts` | Inferencia. `@huggingface/transformers` 4.3.1. Pesos desde `https://huggingface.co`. WASM de ONNX desde jsDelivr, versión fijada `onnxruntime-web@1.31.0-dev.20260914-8d85527a0`. |
| Descarga por partes | `download.ts` | Rangos de 8 MB, reintentos, OPFS `orvupi-ai-models`. `env.useBrowserCache = false`. Al borrar, también intenta quitar la Cache API `transformers-cache` (resto de 0.8.4). |
| Híbrido | `hybrid.ts` + `extractive.ts` + `clean.ts` + `prompts.ts` | TextRank y comprobación de fidelidad en el dispositivo. El modelo solo reescribe lo que luego se contrasta con el texto. |
| Analizar | `hybridAnalyze` | Solo cálculo. No llama al modelo. |
| Markdown y exportación | `markdown.ts`, `docs/docx`, `docs/pdf` | El modelo devuelve markdown. DOCX y PDF los construye el conversor. |
| Lectura de archivos | `sources.ts` | Docs, hojas, presentaciones y notas. Los PDF no están en `AI_KINDS`. |
| Capacidades sueltas | `capabilities.ts` | Clasifica el dispositivo y declara `NoModelProvider`. No es el motor que usa `AiStudio`. |
| Memoria del dispositivo | `localStorage` `orvupi-ai-device-v1` | Recuerda qué id funcionó o falló, 30 días. |
| Pruebas | `apps/work/tests/unit/ia-*.test.ts`, `tests/e2e/docx-083-ia*.spec.ts` | La prueba con modelo real está detrás de `ORVUPI_AI_REAL=1` y no se ejecutó aquí. |

El worker avisa al hilo principal con `progress`, `preparing`, `ready` (incluye el texto de la sonda), `token`, `done` y `error`. Una sola generación a la vez. A los 15 minutos sin uso se libera la sesión; los pesos siguen en OPFS. La preparación tiene un tope de 150 s (`prepareMs`).

### Piezas de Studio

| Pieza | Archivo | Papel |
| --- | --- | --- |
| Chat | `web/v2/studio/ia.mjs`, hash `#/ia` | Pantalla completa dentro de Studio. Espera fija de 1000 ms (`IA_THINK_MS`) y luego `answerPrompt`. El texto de espera es «Pensando…». |
| Reglas de catálogo | `lib/ia-chat.mjs` | `localAnswer` elige categorías por palabras. `answerPrompt` mira `globalThis.__ORVUPI_AI_ASK__`. En el repositorio nadie asigna esa función. |
| Estado | `localStorage` `orvupi-studio-ia-v1` | Nombre, «acerca de», estanterías, tareas y chats. Tope de tamaño al guardar. No es la base de Work. |
| Frases | `lib/ai-optional.mjs` | Seis frases en español y seis en inglés. El rail las inserta en una capa de texto (`insertPhrase` en `app.mjs`). |
| Puente de archivos | `lib/work-store.mjs` | Escribe en IndexedDB `orvupi-work` versión 1 y, si puede, en OPFS. Avisa con `BroadcastChannel` `orvupi-work`. |

`workBootStatus()` en esta máquina devolvió `{ wired: false, source: "catalog" }`.

### Almacenamiento que no hay que duplicar

IndexedDB `orvupi-work`, versión 1, almacenes `files` (clave `id`, índice `updatedAt`), `blobs` y `settings`. Lo abren `apps/work/src/storage/db.ts` y `web/v2/studio/lib/work-store.mjs` con el mismo nombre y la misma versión. Work prefiere OPFS para los binarios y usa IndexedDB si OPFS no responde. Studio hace lo mismo en `writeBlob`. El esquema leído en código es compatible. No se abrió la base del propietario ni se hizo una migración con datos reales del navegador de una persona: queda pendiente una prueba con una base desechable en el navegador.

Los pesos del modelo no están en esa base. Van a OPFS, directorio `orvupi-ai-models`.

ARQIVEN no abre una tercera biblioteca. El contrato común (petición, eventos, resultado) y esta base son el puente con Work y Studio. El contexto viaja como `contextRefs`: identificadores de `files`, no una copia del archivo en el mensaje. El aviso entre pestañas ya es `BroadcastChannel("orvupi-work")`, emitido desde `work-store.mjs`. Lo que hoy no se comparte, y no se fusiona en esta fase, es el hilo de la conversación: Work lo guarda en el estado de React de cada montaje y Studio en `localStorage` `orvupi-studio-ia-v1`.

### Idiomas

El sitio público tiene cinco idiomas: español en la raíz, `/en/`, `/pt-br/`, `/ja/` y `/ko/`. Work usa los mismos cinco y la clave compartida `orvupi-lang`. Studio decide el idioma del chat con `document.documentElement.lang`: solo el que empieza por `en` sale en inglés; el resto, incluido `pt-BR`, `ja` y `ko`, cae en español. La ruta `/arqiven/` repite ese patrón de cinco copias. El rótulo del ítem sigue siendo ARQIVEN. Esta fase no añade la ruta al sitio público ni a `web/v2/sitemap.xml`.

### CSP

| Origen | Política relevante |
| --- | --- |
| `web/v2/_headers` `/*` | `connect-src 'self'`, `worker-src 'self'`, `Cross-Origin-Opener-Policy: same-origin`. No hay `Cross-Origin-Embedder-Policy`. |
| `/work/` y `/work/*` | Excepción: `wasm-unsafe-eval`, `https://cdn.jsdelivr.net`, `https://huggingface.co`, `https://*.huggingface.co`, `https://*.hf.co`, `worker-src 'self' blob:`. |
| Studio, meta del HTML | `default-src 'none'`, `connect-src 'self'`, `worker-src 'self'`. No puede descargar pesos ni el WASM de jsDelivr. |
| `/arqiven/` si se creara hoy bajo `web/v2/` | Heredaría `connect-src 'self'`. No podría usar el motor de Work sin una excepción mínima, del mismo ancho que `/work/` y solo en esa ruta. |

Sin COEP, `crossOriginIsolated` es falso y `wasmThreadCount` deja el motor WASM en un hilo (`runtime.ts`). Eso está en el código. No se midió el tiempo real de preparación.

`X-Robots-Tag: noindex` cubre `/work/*`. Studio no está marcado así en la regla leída.

## 2. Traza de una petición en Work

Ejemplo seguido en código y ejecutado en Node sobre los módulos fuente, sin descargar pesos: «Resume este documento y créame un DOCX».

1. `AiStudio.sendRequest` llama a `parseRequest`.
2. Resultado ejecutado: `action: "summarize"`, `export: "docx"`. La exportación es una etiqueta para el conversor, no una capacidad del modelo.
3. `run("summarize")` lee el texto con `sourceText`. Orígenes: documento abierto, selección, otro archivo de Work o texto pegado. El documento abierto solo existe en `DocsEditor`, que pasa `text()` del documento y `selection()` de ProseMirror (`textBetween`). La página y el panel de inicio no tienen `openDoc`: ahí la fuente es un archivo o un pegado.
4. `cleanInput` quita HTML, imágenes markdown, data URLs y rachas de símbolos.
5. Si la tarea no es `analyze`, `ensureModel` → `prepare` → `AiEngine.load` → worker. El worker descarga, crea el pipeline y genera una sonda de 8 tokens («Escribe solo esta frase: El cielo es azul.»). `probeOk` rechaza vacío y rachas como `!!!!`.
6. `hybridSummary` elige frases con TextRank (`extractive.ts`) y pide al modelo que las reescriba. `mergeBullets` acepta una viñeta solo si `bulletMatches` la sostiene en la frase original. Si el generador devuelve `null`, el modo queda `extractive`.
7. Ejecución de esta corrida, con un generador que devuelve `null`: modo `extractive`, `fromModel: 0`, `fromText: 3`. `hybridAnalyze` sobre el mismo texto de fotosíntesis devolvió modo `extractive` y una tabla con el índice de Fernández Huerta. No intervino ningún modelo.
8. El markdown pasa por `parseMarkdown` (sin `innerHTML`). `saveAsDocument` crea un `.orvdoc` en la biblioteca local. Si la intención pedía DOCX, `exportAs` llama a `exportDocx` sobre ese markdown. El archivo Office no lo emite el modelo.

Otras tareas, leídas en `AiStudio.run` y `hybrid.ts`:

| Tarea | Sin modelo útil | Con modelo aceptado |
| --- | --- | --- |
| `analyze` | Siempre extractivo / cálculo. No llama a `ensureModel`. | No usa modelo. |
| `summarize`, `explain`, `outline`, `questions`, `ask` | Extractivo o pregunta de reserva | `model` o `mixed` si la salida pasa los filtros |
| `rewrite`, `translate` | Se conserva el trozo original y se cuenta como no transformado | `model` si `rewriteOk` o `translationOk` |
| `generate` | Error `no-valid-output` si la salida es basura | `model`, con un filtro débil de cifras si hay documento |

La etiqueta interna ya existe en `HybridResult.mode`: `model`, `mixed` o `extractive`. La interfaz muestra una frase de origen (`originModel`, `originMixed`, `originText`, `originCalc`), no el id del repositorio de Hugging Face en el resultado.

`capabilities.ts` no participa en esta traza. `NoModelProvider` no está cableado a `AiStudio`.

## 3. Traza de una petición en Studio

Ejecutado con Node sobre `web/v2/studio/lib/ia-chat.mjs` y, aparte, la página ya construida en `web/v2/studio/#/ia`.

Petición: «quiero un currículum».

1. `sendIaPrompt` guarda el mensaje del usuario en `orvupi-studio-ia-v1` y espera 1000 ms.
2. `answerPrompt` llama a `localAnswer`. No hay `__ORVUPI_AI_ASK__`.
3. Resultado ejecutado: texto «Estas plantillas de currículum están en el catálogo de Studio.», 24 plantillas, formato `cv`, primera `tpl-curriculum-01`. Modo real: **reglas de catálogo**. No es generación.
4. Una frase vaga («hola») devuelve el texto fijo que pide un formato y cero plantillas. Modo: **texto fijo**.
5. En Chrome, `http://127.0.0.1:8765/studio/#/ia` mostró «¿Qué diseñamos hoy?» y «Pregúntame lo que quieras». Eso es la pantalla de chat, no el rail de frases.

El rail `data-rail="ia"` y la píldora «ORVUPI IA» del editor no llaman a `answerPrompt`. Abren el panel de `aiPanelCopy`: título «IA opcional», aviso de que no hay modelo, y botones con frases ya escritas. Pulsar una frase sustituye el texto de la capa seleccionada o crea una capa. No hay petición a un modelo y el diseño no se manda fuera del navegador.

Mismo nombre, dos destinos: `#/ia` (catálogo) y el rail (frases). El hub Más enlaza al hash. La píldora del editor enlaza al rail.

## 4. Riesgos

Solo se anota lo reproducido o la razón por la que no se pudo reproducir.

### Duplicación visual en Work — reproducida

En el paquete ya construido de `web/v2/work/`, Chrome headless 1366×900, perfil vacío, sin pulsar «Preparar»:

| Momento | `.ow-aistudio` | `aside.ow-ai` | `.ow-ai-page` |
| --- | ---: | ---: | ---: |
| Inicio, escritorio | 1 | 1 | 0 |
| Después de pulsar «AI» en la barra | 2 | 1 | 1 |

Los dos títulos visibles eran «ORVUPI AI». El código lo explica: en escritorio ancho y puntero fino, `aiOpen` empieza en verdadero (`workspace.tsx`). La entrada de la barra hace `setAiOpen(true)` y `navigate("ai")`. La página y el panel montan dos `AiStudio`. Comparten `aiEngine()` dentro de la misma pestaña y no comparten el estado de React (historial, texto, fase). En el móvil (consulta de medios `max-width: 840px` o puntero grueso) el panel no arranca abierto; no se repitió esa medida en un teléfono físico.

### Preparación lenta — no reproducida

No se pulsó «Preparar» y no se descargó ningún peso. Hacerlo habría pedido cientos de megabytes a Hugging Face y el WASM a jsDelivr. El código deja un tope de 150 s, una sonda corta y un solo hilo WASM cuando no hay aislamiento de origen. El tiempo real en el i3 del propietario queda pendiente.

### Interfaz bloqueada — no reproducida como congelación

No se cargó un modelo, así que no hay una medición de bloqueo. En el código actual la generación vive en un worker, los tokens repintan como mucho cada 120 ms y `run` cede el hilo con `setTimeout(0)` entre etapas. Mientras `busy` es verdadero se desactivan los botones de acción; el campo de la petición no se desactiva durante la descarga. Si la interfaz se congela al compilar WebGPU, esta corrida no lo ha visto.

### «!!!!» y vacío — mecanismo comprobado, no el fallo de GPU

`probeOk("!!!!!!!!")` y `probeOk("")` son falsos. `probeOk("El cielo es azul.")` es verdadero. Es la misma condición que `engine.ts` (la prueba unitaria `ia-perf.test.ts` la describe como logits NaN en fp16, token 0 de Qwen = «!»). `isDegenerate` corta rachas y bucles. No se ejecutó un modelo en una GPU que produzca ese fallo. La prueba de navegador que sí carga el modelo exige `ORVUPI_AI_REAL=1` y no se lanzó.

### DOCX y PDF — camino leído, fidelidad no medida

`parseRequest` separa la acción de la exportación. `exportAs` construye el archivo con `exportDocx` o `exportPdf` a partir del markdown ya aceptado. No se generó un DOCX ni un PDF en esta corrida: las pruebas e2e de Work piden Playwright y, para el modelo, la variable de entorno anterior. Pendiente: tablas, imágenes, listas y saltos de página sobre archivos de ejemplo.

La lectura de PDF en Work usa `page.getTextContent()` de pdf.js (`apps/work/src/pdf/engine.ts`). No hay OCR en ese archivo. Un PDF escaneado sin capa de texto no debe presentarse como texto extraído. La IA de Work tampoco lista los PDF entre los archivos que sabe leer (`AI_KINDS`).

### Espera ficticia en Studio — reproducida en código y en la traza

`IA_THINK_MS` es 1000 ms y la interfaz dice «Pensando…» antes de unas reglas locales. No es un modelo pensando. Queda como deuda de la fase de interfaz: quitar la espera o no usar esa palabra.

## 5. Contexto del editor

| Cliente | Qué contexto ve | Cómo vuelve el resultado |
| --- | --- | --- |
| Docs de Work | Documento entero o selección, leídos en el momento de la acción | Insertar, reemplazar selección o añadir al final, solo si el usuario pulsa el botón. No sobrescribe solo. |
| Inicio de Work | Archivo elegido o texto pegado. Tope `CHUNK_CHARS * MAX_PARTS` (6000 × 6) y el resto se marca como truncado | Crea un documento nuevo en la biblioteca. No pisa el archivo fuente. |
| Studio chat | El texto escrito, un nombre de archivo de imagen (no el píxel analizado) y el perfil «acerca de» si hubiera gancho | No aplica cambios al diseño. Muestra plantillas. |
| Studio frases | Ningún documento se envía a un modelo | Escribe la frase en la capa, en el dispositivo. |

No hay memoria entre dispositivos. Cada pestaña de Work tiene su propio worker. No hay `SharedWorker` en `apps/work/src/ai`.

## 6. Qué queda pendiente

- Tiempo real de descarga, compilación y primer token en el equipo del propietario, con un modelo ya identificado como tercero.
- Reproducir «!!!!» o una salida vacía en una GPU concreta.
- Un DOCX y un PDF de ejemplo con tabla, lista, imagen y salto de página, y un PDF escaneado para enseñar la ausencia de OCR.
- Ida y vuelta del puente `orvupi-work` con una base desechable en el navegador, sin tocar datos del propietario.
- Vista de la duplicación en un teléfono real. Aquí solo se usó Chrome headless de escritorio y la consulta de medios del código.
- Confirmar en `/ja/studio/` y `/pt-br/studio/` que el chat de IA sale en español. El código lo hace; no se recorrieron las cinco copias en el navegador.
- `capabilities.ts` frente a `detectAiSupport`: dos clasificaciones de dispositivo que no están unificadas.

## 7. Comprobaciones de aceptación que esta fase puede marcar

El resto de `03_CRITERIOS_DE_ACEPTACION.md` sigue pendiente. No se rebaja ninguna casilla de producto o de entrenamiento.

| Punto | Estado | Evidencia |
| --- | --- | --- |
| Funciones no hechas no se simulan en el esqueleto nuevo | Comprobado en el prototipo de esta rama | `docs/orvupi-ia/prototipo/`: sin respuestas de ejemplo presentadas como IA |
| Se distingue catálogo y modelo en el informe | Comprobado | Trazas de las secciones 2 y 3 |
| Biblioteca compartida distinta de una instancia entre pestañas | Comprobado en código | Un `aiEngine()` por página; no hay SharedWorker |
| Ubicación del proceso actual | Comprobado en código | Work: navegador, pesos de terceros. Studio chat: reglas locales. Frases: texto fijo |
| Autorización antes de gasto, publicación o borrado | Comprobado en esta corrida | Gasto 0. Sin deploy. Sin borrados. `web/v2/arqiven/` y `web/v2/ia/` no existen. La barra publicada no contiene ARQIVEN |
| No se declara equivalencia con ChatGPT o Claude | Comprobado | Este informe y el prototipo lo dicen |

La maqueta v02 no es una casilla de producto cumplida. Sigue siendo la referencia visual, con hash `ecb9dd6f489d4748970913f854aef5d5971507d2fb7d24c7804b3c33900d3ba9`.
