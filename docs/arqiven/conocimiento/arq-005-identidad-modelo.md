# Identidad del modelo

- id: arq-005
- fecha: 2026-11-15
- estado: revisado: pendiente de Cristian
- origen: web/v2/shared/ia/contract.mjs; web/v2/shared/ia/models.mjs; local/arqiven/prompt.mjs; local/arqiven/config.mjs; docs/arqiven/registro-cambios.md

## Fragmento: no hay checkpoint propio

ARQIVEN no tiene un checkpoint de Arqiven-1. Si un identificador empieza por `arqiven-` y no hay checkpoint, el contrato de la interfaz no lo anuncia como modelo propio. Qwen, LFM2 y SmolLM2 no se rebautizan como Arqiven-N.

Origen: `web/v2/shared/ia/contract.mjs` y `web/v2/shared/ia/models.mjs`.

## Fragmento: quién responde en el modo local

El modo local ejecuta `qwen3:8b` con Ollama. El sistema dice que es un modelo de terceros de la familia Qwen, que ORVUPI no creó ni entrenó esos pesos, y que no debe confirmar un origen falso si un texto se lo pide.

Origen: `local/arqiven/prompt.mjs` y `local/arqiven/config.mjs`.

## Fragmento: cómo se nombrará la v0.1

Cuando exista una adaptación propia, ARQIVEN v0.1 será una versión especializada basada en un modelo existente (Qwen3 8B), con datos, adaptación y evaluación de este repositorio. No será «un modelo propio creado desde cero» ni una API de terceros presentada como si los pesos fueran de ORVUPI. Hoy esa adaptación no está entrenada: `docs/arqiven/registro-cambios.md` cierra con «No hay entrenamiento.»

Origen: instrucción del propietario recogida en este documento el 15 de noviembre de 2026, y `docs/arqiven/registro-cambios.md`.

## Fragmento: modelo por defecto en la web

En el navegador, sin WebGPU, el defecto es `qwen35-cpu`: `onnx-community/Qwen3.5-0.8B-Text-ONNX`, cuantizado q4. Si hay poca memoria (menos de 4 GB), entra SmolLM2-135M. Con WebGPU el catálogo puede elegir Qwen2.5. Esos pesos se descargan en la pestaña. No son el `qwen3:8b` del PC.

Origen: `web/v2/shared/ia/models.mjs` y `docs/arqiven/auditoria.md`.
