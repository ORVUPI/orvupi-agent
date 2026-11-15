# Presupuesto y parámetros

- id: arq-008
- fecha: 2026-11-15
- estado: revisado: pendiente del propietario
- origen: local/arqiven/config.mjs; local/arqiven/budget.mjs; docs/arqiven/registro-cambios.md

## Fragmento: valores por defecto

`think` es false y viaja en el JSON de `/api/chat`, no como un texto `/no_think` dentro del prompt. `num_ctx` es 4096. `num_predict` es 1024. La temperatura es 0.2. La concurrencia es 1. El tiempo de espera es 180000 ms. El cuerpo máximo es 262144 bytes (256 KiB). La reserva de plantilla es 256.

Origen: `local/arqiven/config.mjs`.

## Fragmento: la ventana no se suma dos veces

`num_ctx` es la ventana entera: entrada, reserva y respuesta. La entrada útil es `num_ctx - num_predict - templateReserve`. Con los defectos, 4096 − 1024 − 256 = 2816. `budgetPlan` rechaza un plan si la entrada útil baja de 32. Una segunda petición no entra hasta que acaba la primera; el estado avisa `en espera`.

Origen: `local/arqiven/budget.mjs` y `docs/arqiven/registro-cambios.md`.

## Fragmento: estimación de tokens

`estimateTokens` cuenta caracteres y divide entre 2, redondeando hacia arriba. Una cadena vacía vale 0. La cadena `ARQIVEN` (7 caracteres) vale 4. Cada mensaje suma además 8. Es una cota para recortar, no el tokenizador de Qwen. Si el historial no cabe, `fitMessages` suelta primero los turnos antiguos y puede acortar el último mensaje.

Origen: `local/arqiven/budget.mjs`.

## Fragmento: frío y caliente

Una petición se anota como fría si `load_duration` de Ollama supera 50 ms; si no, caliente. El registro de cambios distingue las medidas del PC (alrededor de 132 tok/s en un relato de 512 tokens) de una corrida en la VM con `qwen3:0.6b`, que no sustituye a la de la GPU.

Origen: `docs/arqiven/registro-cambios.md` y `local/arqiven/metrics.mjs`.
