# Preguntas frecuentes

- id: arq-017
- fecha: 2026-11-15
- estado: revisado: pendiente del propietario
- origen: web/v2/arqiven/index.html; web/v2/shared/ia/cards.mjs; docs/arqiven/arranque-windows.md; README.md

## Fragmento: ¿ARQIVEN tiene un modelo propio?

No. La página lo dice. En la web responden modelos de terceros descargados en el navegador. En el PC, si el modo local está arrancado, responde `qwen3:8b` vía Ollama, también de terceros.

Origen: `web/v2/arqiven/index.html` y `docs/arqiven/arranque-windows.md`.

## Fragmento: ¿Dónde queda lo que escribo?

En orvupi.com, en este navegador. En el modo local del PC, en el disco de ese equipo, dentro del directorio que fija `ARQIVEN_DATA` o, si el script de Windows no la puso, en `.arqiven/local` del directorio personal. No es una cuenta.

Origen: `web/v2/arqiven/index.html` y `docs/arqiven/arranque-windows.md`.

## Fragmento: ¿Puedo preguntar si compro el token?

La interfaz rechaza el consejo financiero. No dice si comprar, vender o mantener. ORVUPI no promete un precio. La decisión es de quien pregunta, después de comprobar el contrato oficial.

Origen: `web/v2/shared/ia/guard.mjs` y `README.md`.

## Fragmento: ¿Qué archivos lee el adjunto?

TXT y MD se leen en el navegador y el aviso dice que no se han enviado a un servidor. Otro tipo de texto no se lee. Las imágenes png, jpeg, webp y gif entran por el selector de archivo. El modo local trata un adjunto como dato, no como instrucción.

Origen: `web/v2/arqiven/index.html` y `docs/arqiven/auditoria.md`.

## Fragmento: ¿Hay que instalar Python para usar el chat local?

No. La guía de arranque dice que este backend no usa Python. Python haría falta solo para un entrenamiento futuro, y ese entrenamiento no está hecho.

Origen: `docs/arqiven/arranque-windows.md` y `docs/arqiven/registro-cambios.md`.
