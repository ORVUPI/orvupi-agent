# Decisiones cerradas

- id: arq-018
- fecha: 2026-11-15
- estado: revisado: pendiente del propietario
- origen: docs/arqiven/auditoria.md; docs/arqiven/plan-fases.md; docs/arqiven/registro-cambios.md; local/arqiven/config.mjs

## Fragmento: decisiones del modo local

`think: false` va en el JSON, no como texto dentro del prompt. `num_ctx` 4096 es la ventana entera y la entrada útil queda en 2816. La concurrencia es 1. Cancelar aborta la petición a Ollama y suelta el hueco. Regenerar quita la última respuesta. El proceso rechaza otro host, el puerto 11434 y un Ollama que no sea de loopback. `qwen3:8b` se nombra como modelo de terceros.

Origen: `docs/arqiven/auditoria.md` y `local/arqiven/config.mjs`.

## Fragmento: decisiones del documento y de la evaluación

El documento es fuente de hechos. Las órdenes que haya dentro no se obedecen. La marca que ve el modelo es `[documento: nombre]`. El cálculo local y las fichas verificadas ganan al modelo: no se pide a Ollama un contrato o una operación que el código ya resuelve. Los fragmentos cuentan dentro de los 2816 tokens de entrada. No se envía el corpus a un servicio externo.

Origen: `docs/arqiven/plan-fases.md`.

## Fragmento: decisiones que el plan dejó abiertas y el código ya cerró una

El plan decía que borrar un proyecto podía devolver los chats al historial general o pedir confirmación para eliminarlos, y que había que elegir una. `removeProject` devuelve los chats (deja `projectId` vacío) y no pide un segundo modo. Las carpetas anidadas siguen sin implementarse. No hay servicio de login.

Origen: `docs/arqiven/plan-fases.md` y `local/arqiven/projects.mjs`.

## Fragmento: primera versión del asistente

La primera versión prevista, todavía sin entrenar, es un asistente en español para programación y para consultar documentos del proyecto. Los datos de especialización y la evaluación van separados. Solo se conservará una adaptación si las mismas pruebas demuestran una mejora. El detalle del plan, sin ejecutarlo, está en `docs/arqiven/plan-qlora-v01.md`.

Origen: instrucción del propietario del 15 de noviembre de 2026, recogida como decisión de producto pendiente de su revisión, y `docs/arqiven/plan-fases.md`.
