# Avisos de terceros que usa ARQIVEN

Fecha de la lectura: 15 de noviembre de 2026.
Estado: revisado en el repositorio; pendiente de que Cristian lo confirme antes de redistribuir pesos o un adaptador.

Este archivo no redistribuye pesos. El repositorio no incluye los archivos de Qwen, de Ollama ni de los modelos del navegador. Si más adelante se entrega una copia de esos pesos, o un adaptador derivado (QLoRA u otro), hay que acompañarla de la licencia que corresponda y conservar los avisos. La licencia del código de este repositorio sigue en `LICENSE` (MIT) y no se modifica aquí.

La ficha larga, con riesgos, está en `docs/arqiven/proteccion/auditoria-licencias.md`.

## Modelos

### Qwen3-8B

- Qué es aquí: el modelo de chat del modo local, nombre de Ollama `qwen3:8b`. Terceros. No es un modelo de ORVUPI.
- Ficha: https://huggingface.co/Qwen/Qwen3-8B
- Licencia declarada en la ficha: Apache 2.0. Texto: https://huggingface.co/Qwen/Qwen3-8B/blob/main/LICENSE y https://www.apache.org/licenses/LICENSE-2.0
- Lectura del README el 15 de noviembre de 2026: `license: apache-2.0`. No aparece un archivo NOTICE aparte en ese README. Si el paquete de pesos trae NOTICE, hay que copiarlo al redistribuir.
- Atribución que pide el README (cita, no es una obligación de la Apache distinta del aviso):

```
@misc{qwen3technicalreport,
      title={Qwen3 Technical Report},
      author={Qwen Team},
      year={2025},
      eprint={2505.09388},
      archivePrefix={arXiv},
      primaryClass={cs.CL},
      url={https://arxiv.org/abs/2505.09388},
}
```

- Al redistribuir el modelo o una obra derivada: entregar la Apache 2.0, marcar los archivos modificados, y conservar avisos de copyright, patente, marca y atribución (Apache 2.0, sección 4).
- La Apache 2.0 no concede la marca «Qwen». ARQIVEN no se presenta como Qwen ni como un modelo propio. La fórmula acordada para una v0.1 futura es: una versión especializada basada en un modelo existente (Qwen3 8B).

### Qwen3-Embedding-0.6B

- Qué es aquí: embeddings del RAG local, nombre de Ollama `qwen3-embedding:0.6b`, constante `EMBED_MODEL` en `local/arqiven/embed.mjs`. Terceros.
- Ficha: https://huggingface.co/Qwen/Qwen3-Embedding-0.6B
- Licencia declarada en la ficha: Apache 2.0.
- Cita que pide el README:

```
@article{qwen3embedding,
  title={Qwen3 Embedding: Advancing Text Embedding and Reranking Through Foundation Models},
  author={Zhang, Yanzhao and Li, Mingxin and Long, Dingkun and Zhang, Xin and Lin, Huan and Yang, Baosong and Xie, Pengjun and Yang, An and Liu, Dayiheng and Lin, Junyang and Huang, Fei and Zhou, Jingren},
  journal={arXiv preprint arXiv:2506.05176},
  year={2025}
}
```

- Mismas condiciones de redistribución que la Apache 2.0. El mismo límite de marca: no llamar «ARQIVEN» al modelo de embeddings.

### Modelos del modo navegador

El catálogo está en `web/v2/shared/ia/models.mjs`. Los pesos no están en el repositorio: el navegador los pide a Hugging Face. Licencia que hay que volver a leer en cada ficha antes de vender un derivado.

| Id en ARQIVEN | Repositorio | Licencia publicada | Enlace |
| --- | --- | --- | --- |
| `qwen35-cpu` (defecto en CPU) | `onnx-community/Qwen3.5-0.8B-Text-ONNX` | No consta dentro de `models.mjs`. Hay que leer la ficha del ONNX y la del modelo de origen antes de darla por Apache 2.0. | https://huggingface.co/onnx-community/Qwen3.5-0.8B-Text-ONNX |
| `qwen05-*`, `qwen15-*` | `onnx-community/Qwen2.5-0.5B-Instruct` y `Qwen2.5-1.5B-Instruct` | Qwen2.5 Instruct se publica como Apache 2.0 en la familia Qwen. Confirmar en la ficha ONNX. | https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct |
| `smol135-cpu` | `HuggingFaceTB/SmolLM2-135M-Instruct` | Apache 2.0 | https://huggingface.co/HuggingFaceTB/SmolLM2-135M-Instruct |
| `lfm350-gpu`, `lfm350-gpu32` | `onnx-community/LFM2-350M-ONNX` | LFM Open License v1.0, no Apache. El uso comercial tiene un umbral de ingresos anuales de 10 millones de dólares estadounidenses. Por encima, Liquid AI exige otra licencia. | https://huggingface.co/LiquidAI/LFM2-350M y https://www.liquid.ai/lfm-license |

`nomic-embed-text` se nombra en un comentario de `local/arqiven/embed.mjs` como alternativa Apache 2.0 que no es el modelo por defecto. No se descarga solo.

## Programas

### Ollama

- Uso: proceso local en `127.0.0.1:11434`. ARQIVEN no lo redistribuye.
- Licencia: MIT. https://github.com/ollama/ollama/blob/main/LICENSE
- Obligación si se copia el programa: conservar el aviso de copyright y el texto MIT.

### Node.js

- El backend se ejecuta con Node.js 22 o superior (`.nvmrc`, `package.json`). En el PC del propietario quedó la v26.13.1 (`docs/arqiven/arranque-windows.md`).
- Licencia del runtime: MIT. https://github.com/nodejs/node/blob/main/LICENSE
- No se incluye el binario de Node en este repositorio.

### Motor del navegador, cargado desde jsDelivr

- `@huggingface/transformers` 4.3.1. Apache 2.0. https://github.com/huggingface/transformers.js
- `onnxruntime-web` 1.31.1. MIT. https://github.com/microsoft/onnxruntime
- Constantes: `web/v2/shared/ia/models.mjs`.
- jsDelivr es el canal de descarga, no el autor de esas bibliotecas.

### Wikipedia

- `web/v2/shared/ia/wikipedia.mjs` marca el texto recuperado como CC BY-SA 4.0.
- Si una respuesta cita ese texto, hay que atribuir y, al reutilizarlo, mantener la misma licencia. https://creativecommons.org/licenses/by-sa/4.0/

### Imagen, apagada en el modo local

- `functions/api/arqiven/image.js` nombra `@cf/black-forest-labs/flux-1-schnell`.
- El backend local responde que la imagen está apagada (`docs/arqiven/auditoria.md`). Esta entrega no la enciende.
- Antes de activarla hay que leer la ficha vigente: https://huggingface.co/black-forest-labs/FLUX.1-schnell
- El comentario del propio archivo dice que el plan gratuito de Workers AI tiene un tope diario. No se contrata nada aquí.

## Dependencias npm

`package.json` no tiene `dependencies` de ejecución. El servidor `local/arqiven/server.mjs` no instala paquetes. Lo que sigue es de desarrollo, leído en `package-lock.json` el 15 de noviembre de 2026.

| Paquete | Versión | Licencia | Papel |
| --- | --- | --- | --- |
| `@axe-core/playwright` | 4.13.0 | MPL-2.0 | Pruebas de accesibilidad |
| `axe-core` | 4.13.0 | MPL-2.0 | Dependencia de la anterior |
| `@playwright/test` | 1.64.0 | Apache-2.0 | Pruebas de interfaz |
| `playwright` | 1.64.0 | Apache-2.0 | Pruebas de interfaz |
| `playwright-core` | 1.64.0 | Apache-2.0 | Dependencia de Playwright |
| `typescript` | 7.0.2 | Apache-2.0 | Comprobación de tipos |
| `@types/node` | 22.20.4 | MIT | Tipos |
| `undici-types` | 6.21.0 | MIT | Tipos, dependencia de `@types/node` |
| `fake-indexeddb` | 6.2.5 | Apache-2.0 | Pruebas |

El lockfile también arrastra paquetes opcionales `@typescript/typescript-*` 7.0.2, Apache-2.0, uno por sistema. No entran en la página publicada.

La MPL-2.0 de axe-core obliga a ofrecer el código de ese archivo si se distribuye una modificación de axe-core. No está enlazada en la web de ARQIVEN. Si se reparte el árbol de `node_modules` de desarrollo, hay que conservar su licencia.

## Fuentes

| Fuente | Dónde la pide ARQIVEN | Licencia | Aviso en el repo |
| --- | --- | --- | --- |
| Inter | `web/v2/arqiven/app.css` carga `web/v2/fonts/Inter-Regular.woff2` e `Inter-SemiBold.woff2` | SIL Open Font License 1.1 | `web/v2/studio/assets/OFL-Inter.txt` y `apps/work/licenses/Inter-OFL-1.1.txt`. Copyright 2016 The Inter Project Authors (https://github.com/rsms/inter). Nombre reservado: no publicar una fuente derivada con el nombre Inter. |
| JetBrains Mono | `web/v2/arqiven/app.css` carga `web/v2/fonts/JetBrainsMono-Regular.woff2` | OFL 1.1 para la fuente; el código fuente del proyecto es Apache 2.0 | No hay un archivo OFL junto a `web/v2/fonts/JetBrainsMono-Regular.woff2`. El aviso oficial está en https://github.com/JetBrains/JetBrainsMono/ y https://www.jetbrains.com/lp/mono/ . Riesgo: el archivo viaja sin su licencia al lado. |
| Noto Sans JP | `web/v2/ja/arqiven/index.html` | OFL 1.1 | `web/v2/fonts/noto/OFL-noto-sans-jp.txt`. Copyright del aviso: Google Inc. |
| Noto Sans KR | `web/v2/ko/arqiven/index.html` | OFL 1.1 | `web/v2/fonts/noto/OFL-noto-sans-kr.txt` |
| Silkscreen | No la carga la página de ARQIVEN. Está en el sitio. | OFL 1.1 | `web/v2/fonts/OFL-Silkscreen.txt` |

La OFL 1.1 permite usar, estudiar, modificar y redistribuir la fuente, también dentro de un programa, sin vender la fuente sola. Una versión modificada no puede usar el nombre reservado. El texto creado con la fuente no hereda la OFL.

## Iconos, logotipo y avatar

| Recurso | Ruta | SHA256 medido el 15 de noviembre de 2026 | Licencia |
| --- | --- | --- | --- |
| Logotipo ARQIVEN | `web/v2/assets/arqiven/logo-oficial.png` (mismos bytes en `docs/orvupi-ia/assets/arqiven-logo-oficial.png`) | `f0b8294692096b5d81151e1702e22fdfbe686a535e8cd834c72323af0000812b` | Recurso de marca de ORVUPI. No es MIT. Ver `web/v2/marca/index.html`. |
| Icono 32 | `web/v2/arqiven/favicon-32.png` | `12361f385517f2fc9e78065458f5c52a979819b9c275233a9024973a85c2f4cc` | Mismo criterio de marca. No se ha localizado un autor externo. |
| Icono 192 | `web/v2/arqiven/icon-192.png` | `74d5504d51b417864df4eab9223fe49a94a3ecb76a5bdd9b23d0d1a49ae26aca` | Mismo criterio de marca. |
| Avatar ORVUPI | `web/v2/assets/orvupi/avatar.png` | `352f34d82481ac001fb9746d4229289e7ab2b43de90a4d8249df83c1e41d6ac5` | Nombre, pulpo y recursos visuales: todos los derechos reservados (`web/v2/marca/index.html`). |
| Símbolos de la interfaz | `<symbol>` dentro de `web/v2/arqiven/index.html` | — | SVG propio de la página. No hay una biblioteca de iconos de terceros en esa plantilla. |

## Qué hay que hacer si se publica un adaptador

1. Nombrar la base: Qwen3 8B, terceros, Apache 2.0, con la cita de arriba.
2. Adjuntar el texto de la Apache 2.0 y cualquier NOTICE que trajera el paquete de pesos.
3. No llamar al adaptador «Qwen» ni «Arqiven-1 creado desde cero».
4. No subir los pesos a este repositorio (`docs/arqiven/plan-fases.md`).
