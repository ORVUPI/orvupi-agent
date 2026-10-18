# Informe i18n · 5 idiomas (2026-10-18)

Vista previa (no producción): https://i18n-preview.stubxai.pages.dev · producción (orvupi.com, rama main de Pages) sin tocar.

## URLs
- `/` español (URLs de siempre), `/en/` inglés (x-default), `/pt-br/`, `/ja/`, `/ko/`. Sin redirecciones 301 nuevas.
- ORVUPI Work sigue en `/work/` (base `/work/`), noindex (meta + `X-Robots-Tag`).

## Cambios
- `scripts/i18n/`: extracción, borrador automático sin conexión (Argos/CTranslate2), unión con traducciones manuales, generador de páginas, sitemap con alternates y reescrituras 200 para archivos relativos (Studio, Lab).
- Web: selector accesible (`details` + enlaces, nombres propios, sin banderas) en escritorio y móvil; `assets/i18n.js` (preferencia `orvupi-lang` compartida con Work, sugerencia del idioma del navegador sin redirigir, una sola apertura de la versión elegida por sesión, datos de formularios conservados, es⇄en en la misma página sin perder lecturas, diccionario dinámico del idioma activo); `assets/i18n.css`; Noto Sans JP/KR (OFL, 400, subconjuntos unicode-range) solo en ja/ko; lang, title, description, og, canonical y hreflang por página; CSP de /verify/ y /pares/ repetida por idioma.
- Work: `Locale` con 5 idiomas, catálogos pt-BR/ja/ko cargados con `import()` (un trozo por idioma), respaldo inglés, selector en la barra superior y en Ajustes, idioma del navegador si no hay preferencia, plantillas traducidas (`tpl:`), Intl con el idioma activo; cambiar de idioma ya no relee el documento ni la hoja (antes se perdían cambios pendientes); fuentes CJK solo para ja/ko; filtros y barra superior sin desbordar.
- Contenido del usuario, CA, direcciones, símbolos, código y enlaces: sin traducir (protegidos y probados).

## Métricas de carga (Chromium, sin caché)
- Portada: +10 kB (i18n.js + i18n.css) y +1 kB de HTML; resto igual que producción.
- /ja/verify/: +421 kB de subconjuntos Noto JP y +21 kB de diccionario, solo en japonés. /en/ y / no descargan diccionarios ni fuentes CJK.
- Work: trozos ja 43 kB, ko 39 kB, pt-BR 38 kB (≈16 kB gzip), solo el activo.

## Rebase con 0.8.3
Tocan los mismos archivos: `apps/work/src/i18n/messages.ts` (claves nuevas → `make_catalogs.py` + borrador de las nuevas; el test `i18n-locales` falla si faltan), `app/workspace.tsx`, `app/App.tsx`, `ui/chrome.tsx`, `views/screens.tsx`, `sheets/SheetScreen.tsx`, `storage/*`, `package.json`/lock (Noto). Estilos en `styles/i18n.css` aparte. Tras el rebase: regenerar `web/v2/work` con `npx vite build --base /work/`.
