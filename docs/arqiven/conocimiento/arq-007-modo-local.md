# Modo local

- id: arq-007
- fecha: 2026-11-15
- estado: revisado: pendiente de Cristian
- origen: local/arqiven/config.mjs; local/arqiven/server.mjs; docs/arqiven/arranque-windows.md; docs/arqiven/registro-cambios.md; scripts/arqiven-local.ps1

## Fragmento: qué es

El modo local es un proceso Node en el PC del propietario. Escucha solo en `127.0.0.1`, puerto `4174`, sirve `web/v2` y llama a Ollama en `http://127.0.0.1:11434`. No es orvupi.com. No abre el puerto 11434 y no crea un túnel. El script npm es `arqiven:local`.

Origen: `local/arqiven/config.mjs`, `package.json` y `docs/arqiven/arranque-windows.md`.

## Fragmento: cómo entra la página

Si `GET /api/arqiven/status` responde `mode: local`, la interfaz deja el motor del navegador y usa el backend. En Ajustes debe verse «Modo local/Ollama» y el aviso de que `qwen3:8b` es de terceros.

Origen: `docs/arqiven/arranque-windows.md` y `docs/arqiven/registro-cambios.md`.

## Fragmento: dos directorios de historial

Sin la variable `ARQIVEN_DATA`, `resolveConfig` guarda los datos en la carpeta `.arqiven/local` dentro del directorio personal (`os.homedir()`). El script `scripts/arqiven-local.ps1`, si esa variable no existe, la pone en `%LOCALAPPDATA%\ARQIVEN\local` y arranca el proceso con ella. En el PC, el 15 de noviembre de 2026, el historial verificado quedó en `C:\Users\crist\AppData\Local\ARQIVEN\local`. Quien arranque el servidor con `node local/arqiven/server.mjs` y sin la variable no usa esa carpeta de Windows.

Origen: `local/arqiven/config.mjs`, `scripts/arqiven-local.ps1` y `docs/arqiven/registro-cambios.md`.

## Fragmento: rutas del API

El servidor atiende, entre otras, `GET /api/arqiven/status`, `GET/POST /api/arqiven/projects`, documentos y `retrieve` bajo el proyecto, conversaciones, `POST /api/arqiven/chat`, `POST /api/arqiven/cancel` y `GET /api/arqiven/metrics`. La imagen, en este proceso, no llama a un modelo de imagen.

Origen: `local/arqiven/server.mjs`.

## Fragmento: máquina en la que se midió

Windows 11 Pro, i7-14700KF, 32 GB DDR5, RTX 5070 Ti de 16 GB, driver 621.24, Ollama 0.40.16, `qwen3:8b` Q4_K_M. Esos datos están en `docs/arqiven/auditoria.md` como dato entregado, no como una medida nueva de esta rama. Node en ese PC: v26.13.1. No había Python en el momento de la guía de arranque.

Origen: `docs/arqiven/auditoria.md` y `docs/arqiven/arranque-windows.md`.
