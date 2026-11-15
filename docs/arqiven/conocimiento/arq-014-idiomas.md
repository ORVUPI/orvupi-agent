# Idiomas

- id: arq-014
- fecha: 2026-11-15
- estado: revisado: pendiente del propietario
- origen: web/v2/arqiven/index.html; web/v2/shared/ia/cards.mjs; web/v2/ja/arqiven/index.html; web/v2/ko/arqiven/index.html

## Fragmento: los cinco idiomas del sitio

La web de ORVUPI y la de ARQIVEN están en español, inglés, portugués de Brasil, japonés y coreano. Los enlaces `hreflang` de la página española apuntan a `/arqiven/`, `/en/arqiven/`, `/pt-br/arqiven/`, `/ja/arqiven/` y `/ko/arqiven/`. El `x-default` de esa plantilla es la ruta inglesa.

Origen: `web/v2/arqiven/index.html` y `web/v2/shared/ia/cards.mjs`.

## Fragmento: idioma de la respuesta en local

El sistema del modo local pide responder en el idioma de la última pregunta. Una ficha verificada, en el modo navegador, sale en el idioma de la pregunta cuando la ficha tiene ese texto.

Origen: `local/arqiven/prompt.mjs` y `docs/arqiven/registro-cambios.md`.

## Fragmento: fuentes de las páginas japonesa y coreana

La página japonesa de ARQIVEN carga Noto Sans JP. La coreana carga Noto Sans KR. La hoja común de la app usa Inter y JetBrains Mono.

Origen: `web/v2/ja/arqiven/index.html`, `web/v2/ko/arqiven/index.html` y `web/v2/arqiven/app.css`.
