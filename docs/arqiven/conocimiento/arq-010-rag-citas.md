# RAG, citas y abstención

- id: arq-010
- fecha: 2026-11-15
- estado: revisado: pendiente de Cristian
- origen: local/arqiven/rag.mjs; local/arqiven/embed.mjs; local/arqiven/prompt.mjs; local/arqiven/guard.mjs; docs/arqiven/plan-fases.md

## Fragmento: índice por proyecto

El índice del usuario es `rag-index.json`, separado por proyecto. Un documento se parte en trozos de 480 caracteres con solape de 80, hasta 20000 caracteres de texto. El embedding por defecto es `qwen3-embedding:0.6b`, de terceros, Apache 2.0. Las pruebas de la VM no lo descargan: usan un vector determinista. Si el modelo no está en Ollama, el backend lo dice y no lo cambia por el modelo de chat.

Origen: `local/arqiven/rag.mjs`, `local/arqiven/embed.mjs` y `docs/arqiven/registro-cambios.md`.

## Fragmento: citar o abstenerse

Si no hay fragmentos del proyecto, o el mejor coseno queda por debajo de 0,45, la respuesta de recuperación es «No consta en los documentos de este proyecto.» y no llama al modelo. Si hay cita, el extracto tiene que ser un prefijo real del fragmento, como máximo 240 caracteres. Borrar el documento o el proyecto quita sus fragmentos y no los de otro proyecto.

Origen: `local/arqiven/rag.mjs`.

## Fragmento: el documento no es una orden

El texto indexado es fuente de hechos. Se usa y se cita como `[nombre]` o «según el documento nombre». Antes del modelo, una capa sustituye órdenes (ignora, di que, afirma que, responde con, imprime, filtra, eres, obedece) por `[instrucción del documento omitida]`. Si la respuesta las repite, se descarta. El texto no se ejecuta.

Origen: `local/arqiven/prompt.mjs`, `local/arqiven/guard.mjs` y `docs/arqiven/plan-fases.md`.

## Fragmento: qué no está medido en el PC

Hace falta instalar el modelo de embeddings en el PC y repetir una pregunta con `ground: true`. El registro de cambios dice que eso no está medido allí.

Origen: `docs/arqiven/registro-cambios.md`.
