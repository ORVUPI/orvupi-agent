# Modo navegador

- id: arq-006
- fecha: 2026-11-15
- estado: revisado: pendiente de Cristian
- origen: docs/arqiven/auditoria.md; web/v2/arqiven/index.html; web/v2/shared/ia/models.mjs

## Fragmento: cuándo se usa

Si `GET /api/arqiven/status` no existe, la página se queda en el modo navegador. Es el camino de orvupi.com. No hay un proceso Node sirviendo el chat público.

Origen: `docs/arqiven/auditoria.md` y `docs/arqiven/plan-fases.md`.

## Fragmento: qué hace la pestaña

La interfaz prepara un worker. El worker descarga Transformers.js y el WASM de ONNX Runtime desde jsDelivr, y los pesos desde Hugging Face. La generación ocurre en la pestaña. Detener usa una señal en memoria compartida y, si no confirma, recrea el worker. Antes del modelo, la app puede resolver una ficha verificada de ORVUPI, un cálculo local o un rechazo (consejo financiero, identidad, dirección ajena). Una pregunta de definición puede consultar Wikipedia: se envía la pregunta, no un documento de Work.

Origen: `docs/arqiven/auditoria.md`.

## Fragmento: dónde se guarda

El chat de la web vive en el navegador: IndexedDB `orvupi-arqiven-chats`, ajustes en `orvupi-arqiven-settings`, y votos en su propio almacén. Guardar en Work escribe en IndexedDB `orvupi-work` de ese dispositivo. No hay cuenta. La pantalla dice: «Sesión de este navegador. No es una cuenta.»

Origen: `docs/arqiven/auditoria.md` y `web/v2/arqiven/index.html`.

## Fragmento: red permitida

La CSP de `/arqiven/` permite el propio sitio, Hugging Face, jsDelivr y Wikipedia. La auditoría dice que no hay OpenAI, Anthropic ni otra API de chat. Los orígenes concretos están en la etiqueta de política de `web/v2/arqiven/index.html`.

Origen: `web/v2/arqiven/index.html` y `docs/arqiven/auditoria.md`.
