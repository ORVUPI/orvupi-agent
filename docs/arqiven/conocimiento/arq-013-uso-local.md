# Instrucciones de uso en el PC

- id: arq-013
- fecha: 2026-11-15
- estado: revisado: pendiente del propietario
- origen: docs/arqiven/arranque-windows.md; package.json; docs/arqiven/registro-cambios.md

## Fragmento: preparación

Hace falta Node.js 22 o superior. En el PC del propietario quedó la v26.13.1. No hace falta Python para este backend, ni `npm install`: el servidor no tiene dependencias. Ollama tiene que estar en marcha y `ollama list` tiene que mostrar `qwen3:8b`. El puerto de Ollama sigue en `http://127.0.0.1:11434`.

Origen: `docs/arqiven/arranque-windows.md`.

## Fragmento: arranque

Desde la carpeta del código:

```text
powershell -ExecutionPolicy Bypass -File .\scripts\arqiven-local.ps1
```

El navegador se abre en `http://127.0.0.1:4174/arqiven/`. Si el puerto 4174 ya lo tiene un ARQIVEN anterior, el script lo para. Si lo tiene otro programa, se detiene y avisa. La ventana de PowerShell es el servidor: cerrarla apaga la página.

Origen: `docs/arqiven/arranque-windows.md`.

## Fragmento: qué se puede hacer en pantalla

Nuevo chat, Chats, Proyectos y Ajustes están en la interfaz. Enviar un mensaje pide la respuesta a Ollama. Un segundo mensaje mientras el primero no ha terminado queda `en espera`. Detener corta la respuesta y suelta la cola. Regenerar, en la última respuesta del modo local, quita esa respuesta y pide otra vez la misma pregunta. El historial sobrevive al cierre del proceso.

Origen: `docs/arqiven/arranque-windows.md` y `docs/arqiven/registro-cambios.md`.

## Fragmento: humo

Con Ollama en marcha, en otra ventana:

```text
powershell -ExecutionPolicy Bypass -File .\scripts\arqiven-humo.ps1
```

Eso pide un relato largo (`num_predict` 512) y otra generación que se cancela. `-Completa` pide 1024 tokens. `-Backend` pasa por el servidor de ARQIVEN. El registro advierte que una respuesta de 4 tokens no sirve para medir tok/s, y que una pasada `-Backend` se hizo contra un proceso Node antiguo.

Origen: `docs/arqiven/arranque-windows.md` y `docs/arqiven/registro-cambios.md`.
