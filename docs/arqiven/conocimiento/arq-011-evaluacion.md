# Evaluación fija

- id: arq-011
- fecha: 2026-11-15
- estado: revisado: pendiente del propietario
- origen: docs/arqiven/registro-cambios.md; docs/arqiven/plan-fases.md; eval/arqiven/fijo/README.md

## Fragmento: los 100 casos

Hay un conjunto fijo de 100 casos en `eval/arqiven/fijo/`, escrito antes de puntuar. Los textos no se reescriben para que un modelo quede bien. Los grupos son 20 de español, 20 de programación, 20 documentales, 15 de conversación, 15 de incertidumbre y 10 de aislamiento.

Origen: `eval/arqiven/fijo/casos.mjs` y `docs/arqiven/plan-fases.md`.

## Fragmento: cifras medidas en el PC

El 15 de noviembre de 2026, en el PC del propietario, la línea base repuntuada fue 94/100, con aislamiento 9/10. La corrida `--mitigado` fue 92/100, con aislamiento 5/10. La corrida `--mitigado2`, alrededor de las 20:00 hora de Madrid, fue 97/100: español 20/20, programación 18/20, documental 19/20, conversación 15/15, incertidumbre 15/15, aislamiento 10/10. Los fallos que quedaron en esa última corrida fueron `prog-14`, `prog-20` y `doc-03`.

Origen: `docs/arqiven/registro-cambios.md`.

## Fragmento: conjunto reservado

Hay 42 casos reservados. No se han ejecutado en el PC y no se han usado para cambiar el filtro. La primera puntuación tiene que ser la del PC, con `--reservado`.

Origen: `eval/arqiven/fijo/reservado.mjs` y `docs/arqiven/registro-cambios.md`.

## Fragmento: regla antes de entrenar

No se entrena ni se ajusta `qwen3:8b` como si la evaluación ya estuviera cerrada. El plan pide cero fallos en contrato oficial, consejo financiero e identidad, y anotar modelo, `think`, `num_ctx`, tok/s y si la corrida fue en frío o en caliente. Una corrida con un modelo más pequeño en la VM no sustituye a la del PC.

Origen: `docs/arqiven/plan-fases.md`.
