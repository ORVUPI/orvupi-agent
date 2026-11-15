# Auditoría de licencias de terceros

Fecha: 15 de noviembre de 2026.
Estado: revisado: pendiente de Cristian.
Alcance: lo que el modo local y la página `/arqiven/` usan o nombran, leído en esta rama. No se han descargado pesos ni se ha instalado nada.

El listado corto para redistribuir está en `THIRD_PARTY_NOTICES.md`, en la raíz.

## Cómo se leyó

- `package.json` y `package-lock.json`: no hay dependencias de ejecución. Las de desarrollo tienen el campo `license`.
- `local/arqiven/embed.mjs` y `local/arqiven/config.mjs`: modelo de chat y modelo de embeddings. Esos archivos no se han modificado.
- `web/v2/shared/ia/models.mjs`: catálogo del navegador.
- `web/v2/arqiven/app.css` y las páginas `web/v2/ja/arqiven/index.html` y `web/v2/ko/arqiven/index.html`: fuentes.
- Fichas públicas de Qwen3-8B y Qwen3-Embedding-0.6B, README en bruto, el 15 de noviembre de 2026.
- Avisos OFL ya guardados en el repositorio.

## Modelos de lenguaje y de embeddings

### Qwen3 8B

Origen: Alibaba Cloud / Qwen Team. En el PC del propietario corre como `qwen3:8b` dentro de Ollama (`docs/arqiven/registro-cambios.md`). La ficha https://huggingface.co/Qwen/Qwen3-8B declara `license: apache-2.0` y enlaza https://huggingface.co/Qwen/Qwen3-8B/blob/main/LICENSE .

Obligaciones si se reparte el modelo o un derivado (un adaptador QLoRA lo es):

- Incluir el texto de la Apache 2.0.
- Conservar los avisos de copyright, patente, marca y atribución.
- Si el paquete trae NOTICE, copiar los avisos que correspondan. En el README leído no hay un NOTICE separado. Hay que mirar el árbol de archivos del commit de pesos antes de empaquetar.
- Indicar qué archivos se modificaron.
- La cita que el README ofrece es el informe técnico arXiv:2505.09388. Está copiada en `THIRD_PARTY_NOTICES.md`.

Riesgos:

- Llamar al resultado «modelo propio», «Arqiven-1» o «entrenado desde cero» contradice la licencia de cara al usuario y la política del producto (`web/v2/shared/ia/contract.mjs`, `local/arqiven/prompt.mjs`). La Apache 2.0 permite adaptar los pesos; no permite atribuirse la autoría de Qwen.
- «Qwen» es marca de su titular. La Apache 2.0 no da derecho a usar esa marca como nombre del producto.
- Los pesos no están en git. Subirlos queda fuera (`docs/arqiven/plan-fases.md`).

### Qwen3-Embedding 0.6B

Origen: Qwen Team. Nombre en Ollama: `qwen3-embedding:0.6b`. El código lo elige por español y tamaño, y lo marca Apache 2.0 (`local/arqiven/embed.mjs`). La ficha https://huggingface.co/Qwen/Qwen3-Embedding-0.6B declara `license: apache-2.0`. La cita del README (arXiv:2506.05176) está en `THIRD_PARTY_NOTICES.md`.

Obligaciones: las de la Apache 2.0, igual que el modelo de chat. El backend no sustituye este modelo por el de chat si falta (`docs/arqiven/plan-fases.md`).

Riesgo: en el PC todavía no consta instalado ni medido (`docs/arqiven/registro-cambios.md`). Instalarlo es una descarga de terceros, no un cambio de licencia.

### Resto del catálogo del navegador

| Pieza | Licencia que consta | Riesgo |
| --- | --- | --- |
| SmolLM2-135M-Instruct | Apache 2.0 en https://huggingface.co/HuggingFaceTB/SmolLM2-135M-Instruct | Bajo si se nombra como tercero. |
| Qwen2.5 0.5B y 1.5B Instruct | Familia publicada como Apache 2.0. Confirmar la ficha ONNX que descarga el navegador. | El puerto ONNX puede añadir un aviso propio. |
| Qwen3.5-0.8B-Text-ONNX | `models.mjs` no guarda la licencia. | No darla por Apache 2.0 hasta leer https://huggingface.co/onnx-community/Qwen3.5-0.8B-Text-ONNX y la ficha de origen. Es el modelo por defecto de la web. |
| LFM2-350M | LFM Open License v1.0, https://www.liquid.ai/lfm-license | No es Apache. El uso comercial por encima de 10 millones de dólares de ingresos anuales necesita licencia de Liquid AI. Si ARQIVEN ofrece ese modelo en un producto de pago, hay que releer el umbral con el titular. |
| FLUX.1 schnell, ruta de imagen | El código nombra `@cf/black-forest-labs/flux-1-schnell`. La ruta local está apagada. | No activarla sin leer https://huggingface.co/black-forest-labs/FLUX.1-schnell el día del encendido. Hay un tope gratuito de Workers AI descrito en `functions/api/arqiven/image.js`. |
| Texto de Wikipedia | CC BY-SA 4.0, marcado en `web/v2/shared/ia/wikipedia.mjs` | Atribución y compartir igual si se republica ese texto. |

## Ollama, Node y bibliotecas del navegador

Ollama es MIT (https://github.com/ollama/ollama/blob/main/LICENSE). ARQIVEN habla con él en loopback y no copia el programa.

Node.js, con el que corre el backend, es MIT (https://github.com/nodejs/node/blob/main/LICENSE). Hace falta la versión 22 o superior.

`@huggingface/transformers@4.3.1` es Apache 2.0. `onnxruntime-web@1.31.1` es MIT. Se cargan desde jsDelivr; el CDN no cambia la licencia del paquete.

## npm

El backend no tiene dependencias npm. Quien ejecute `npm ci` instala solo herramientas de desarrollo. Versiones y licencias, en `THIRD_PARTY_NOTICES.md`.

La única copyleft del árbol de desarrollo es MPL-2.0 (`axe-core` y `@axe-core/playwright`). Obliga sobre los archivos de axe que se modifiquen y se repartan, no sobre el HTML de ARQIVEN. Playwright, TypeScript y fake-indexeddb son Apache 2.0. `@types/node` y `undici-types` son MIT.

## Fuentes

Inter, en la aplicación, es OFL 1.1. El texto de la licencia está en el repositorio (`web/v2/studio/assets/OFL-Inter.txt`). No se puede publicar una modificación con el nombre reservado Inter, ni vender el archivo de la fuente suelto.

JetBrains Mono, también en `app.css`, se publica como OFL 1.1 (https://github.com/JetBrains/JetBrainsMono/). En `web/v2/fonts/` no hay un OFL al lado del `.woff2`. Conviene copiar ese aviso junto al archivo antes de un paquete que solo lleve `web/v2/fonts/`. Mientras el repositorio completo se reparte, el tercero puede leer el aviso aguas arriba, pero el hueco está.

Noto Sans JP y Noto Sans KR, en las páginas japonesa y coreana de ARQIVEN, son OFL 1.1 y sí tienen su aviso en `web/v2/fonts/noto/`.

## Iconos, logotipo y avatar

El logotipo oficial de ARQIVEN es `web/v2/assets/arqiven/logo-oficial.png`. SHA256, medido de nuevo el 15 de noviembre de 2026: `f0b8294692096b5d81151e1702e22fdfbe686a535e8cd834c72323af0000812b`. La copia de `docs/orvupi-ia/assets/` tiene los mismos bytes. La página de marca no declara ese archivo como MIT ni como CC0.

`web/v2/arqiven/favicon-32.png` (SHA256 `12361f385517f2fc9e78065458f5c52a979819b9c275233a9024973a85c2f4cc`) e `icon-192.png` (SHA256 `74d5504d51b417864df4eab9223fe49a94a3ecb76a5bdd9b23d0d1a49ae26aca`) son iconos de la aplicación. No se ha encontrado una licencia de un autor externo. Se tratan como recursos de marca hasta que Cristian diga otra cosa.

El avatar del pulpo, `web/v2/assets/orvupi/avatar.png` (SHA256 `352f34d82481ac001fb9746d4229289e7ab2b43de90a4d8249df83c1e41d6ac5`), queda fuera de la MIT. La página `web/v2/marca/index.html` dice que las imágenes se generaron por encargo del creador, que una búsqueda de similitud fue preliminar y no acredita exclusividad, y que no se declaran CC0.

Los iconos de la interfaz (más, menú, clip, engranaje) son SVG en línea en `web/v2/arqiven/index.html`. No apuntan a una biblioteca de iconos.

## Datos de entrenamiento que ya nombra otra carpeta

`train/arqiven/README.md` describe una mezcla futura con SmolTalk2, Aya, Tulu 3 y otros, con licencias Apache 2.0 u ODC-BY, y dice que no se entrena. Ese material de terceros no entra en `datos/arqiven/`. El lote de esta rama es texto propio o redactado aquí. Mezclar aquellos corpus exigiría conservar cada licencia y no se hace en este borrador.

## Resumen de obligaciones

| Situación | Qué hay que cumplir |
| --- | --- |
| Alguien clona el repositorio | MIT para el resto (`LICENSE` y `NOTICE.md`). Las rutas de ARQIVEN van en `LICENSE-ARQIVEN.md`, con todos los derechos reservados desde el 15 de noviembre de 2026, 20:25. Quien ya tuviera una copia anterior bajo MIT la conserva. Los pesos no vienen en el clon. |
| Se copia Qwen3 8B o el embedding, o se publica un adaptador | Apache 2.0 completa, avisos, cita, y no usar la marca Qwen como si fuera ARQIVEN. |
| Se sirve LFM2 en un producto con ingresos altos | Releer LFM Open License v1.0 antes. |
| Se cita un párrafo de Wikipedia | CC BY-SA 4.0. |
| Se reparte Inter o Noto | OFL 1.1, ya archivada. |
| Se reparte JetBrains Mono sola | Falta el archivo OFL al lado del `.woff2`. |
| Se usa el logotipo o el pulpo fuera del proyecto | No lo permite la página de marca sin contacto con el creador. |
