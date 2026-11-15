# Implementado y pendiente

- id: arq-016
- fecha: 2026-11-15
- estado: revisado: pendiente del propietario
- origen: docs/arqiven/registro-cambios.md; docs/arqiven/plan-fases.md; docs/arqiven/auditoria.md

## Fragmento: implementado en el código de esta rama

Backend Node solo en `127.0.0.1`, adaptador de Ollama con `think: false`, presupuesto de 2816 tokens de entrada, cola de una petición, cancelación, regenerar, historial en disco, métricas, proyectos con roles, RAG por proyecto con citas y abstención, y una capa determinista delante y detrás del modelo. La interfaz distingue modo local y modo navegador. El diseño de pantalla completa, el logotipo y los nombres «Nuevo chat» y «Chats» se mantienen.

Origen: `docs/arqiven/registro-cambios.md`.

## Fragmento: verificado en el PC del propietario el 15 de noviembre de 2026

Arranque con el script de Windows y Node v26.13.1. Historial que sobrevive al reinicio del proceso. Verificador 8/8 sobre backend, chat, proyecto, mover, permisos, regenerar, cola y persistencia. Medición de `qwen3:8b` en la RTX 5070 Ti. Línea base repuntuada 94/100. `--mitigado2` 97/100 con aislamiento 10/10.

Origen: `docs/arqiven/registro-cambios.md`.

## Fragmento: pendiente

Instalar y medir `qwen3-embedding:0.6b` en el PC con `ground: true`. Ejecutar el conjunto reservado en el PC, sin usarlo para retocar el filtro. Repetir el humo `-Backend` contra el proceso de esta rama. Carpetas anidadas. Entrenamiento: no está hecho y no se hace hasta que la evaluación que el propietario acepte lo permita. Despliegue en orvupi.com: no. Fusionar a `main`: no. La nota `docs/arqiven/auditoria.md` describe un punto anterior, el commit `57fda94c`, y dice que proyectos, RAG y los 100 casos no entraban en aquella fase. El registro de cambios es posterior y sí los da por escritos.

Origen: `docs/arqiven/registro-cambios.md`, `docs/arqiven/plan-fases.md` y `docs/arqiven/auditoria.md`.
