# Límites

- id: arq-012
- fecha: 2026-11-15
- estado: revisado: pendiente del propietario
- origen: README.md; docs/arqiven/plan-fases.md; docs/arqiven/arranque-windows.md; web/v2/shared/ia/guard.mjs; LIMITS.md

## Fragmento: qué no hace ARQIVEN

No firma, no custodia activos y no envía transacciones. No da consejo financiero: no dice si comprar, vender o mantener, y no promete un precio. No inventa cifras, teléfonos, números de serie, contraseñas, direcciones ni ingredientes cuando el dato no consta. No presenta a Qwen como un modelo de ORVUPI.

Origen: `README.md`, `local/arqiven/prompt.mjs` y `web/v2/shared/ia/guard.mjs`.

## Fragmento: qué no hace el arranque local

No instala Ollama ni vuelve a bajar `qwen3:8b`. No abre el puerto 11434, no cambia el firewall y no publica la página. No llama a una API de pago ni a Hugging Face para el modo local. El modo navegador, si se pulsa reintentar en Ajustes, sí puede descargar el modelo pequeño de la web.

Origen: `docs/arqiven/arranque-windows.md`.

## Fragmento: fuera de la fase

No se despliega a orvupi.com desde estas notas, no se fusiona a `main` desde aquí, no se contrata un API de terceros y no se suben pesos al repositorio. Las carpetas anidadas siguen fuera. No hay entrenamiento.

Origen: `docs/arqiven/plan-fases.md` y `docs/arqiven/registro-cambios.md`.

## Fragmento: archivos que el chat admite

En la caja se puede adjuntar texto `.txt` o `.md`, y también imagen png, jpeg, webp o gif. Un archivo que no sea TXT ni MD no se lee como texto. La voz es una propuesta: no hay micrófono conectado.

Origen: `web/v2/arqiven/index.html`.
