# Inventario de i18n · ORVUPI web y ORVUPI Work

Fecha: 2026-10-18 · Rama `feat/i18n-5-idiomas` (parte de `main` a7e02ea, Work 0.8.2).

## Tecnología encontrada

- **Web (orvupi.com)**: HTML estático en `web/v2/`, servido por Cloudflare Pages. Ya era bilingüe es/en *en la misma URL*: cada texto va en pares `<span class="lang es">…</span><span class="lang en">…</span>`, la CSS oculta uno según `html[data-lang]` y `assets/shell.js` lo cambiaba con botones ES/EN guardando `orvupi-lab-lang`. Sin URL por idioma, sin hreflang.
- **Scripts de la web** (`assets/*.js|mjs`): textos dinámicos en pares `{ es, en }` o ternarios `lang === "en" ? …`.
- **ORVUPI Work** (`apps/work`, React 19 + Vite + TipTap): i18n propio en `src/i18n/` con catálogos `es` y `en` (642 claves, mismas claves), función `translate()` y ajuste `locale` guardado en IndexedDB. Plantillas de Docs con texto propio por idioma en `src/docs/templates.ts`.

## Solución elegida

- Web: el par es/en sigue siendo la fuente. `scripts/i18n/build_web.py` genera páginas estáticas por idioma: `/` (es, URLs de siempre), `/en/` (inglés, x-default), `/pt-br/`, `/ja/`, `/ko/`. Catálogos en `i18n/web/<idioma>.json` (clave = texto inglés de origen). Los textos que pintan los scripts se traducen con `/i18n/web/dyn-<idioma>.json`, que solo se descarga en su idioma.
- Work: se amplía el sistema existente. `es`/`en` siguen en `messages.ts`; `pt-BR`, `ja`, `ko` en `src/i18n/locales/*.json`, cargados con `import()` (un trozo por idioma). Respaldo: inglés.

## Páginas públicas de la web

| Página | Tramos en inglés | Título actual |
|---|---:|---|
| `404.html` | 34 | ORVUPI · Página no encontrada |
| `aprender/index.html` | 131 | ORVUPI · Aprender |
| `community/index.html` | 39 | ORVUPI · Comunidad |
| `comparar/index.html` | 44 | ORVUPI · Ejemplo de una curva |
| `contribuir/index.html` | 68 | ORVUPI · Contribuir |
| `cuaderno/index.html` | 63 | ORVUPI · Cuaderno |
| `index.html` | 76 | ORVUPI · Ocho brazos. Mil ideas. |
| `lab/index.html` | 517 | ORVUPI Lab |
| `legal/index.html` | 33 | ORVUPI · Legal |
| `marca/index.html` | 50 | ORVUPI · Identidad y recursos |
| `memes/index.html` | 34 | ORVUPI · Galería de memes |
| `methodology/index.html` | 32 | ORVUPI · Metodología |
| `pares/index.html` | 41 | ORVUPI · Lectura de la curva |
| `risks/index.html` | 41 | ORVUPI · Riesgos |
| `security/index.html` | 52 | ORVUPI · Seguridad |
| `studio/index.html` | 74 | ORVUPI · Studio |
| `studio/reglas/index.html` | 79 | ORVUPI · Reglas y procedencia de Studio |
| `tablero/index.html` | 383 | ORVUPI · Tablero |
| `token/index.html` | 64 | ORVUPI · Token |
| `verify/index.html` | 136 | ORVUPI Verify |
| `vision/index.html` | 49 | ORVUPI · Visión del proyecto |

Total: 21 páginas, 974 textos únicos de página, 156 textos de scripts y 59 atributos (alt, aria-label, title, metadatos).

No incluidas en la generación: `web/v2/content/tools/*.html` (fragmentos internos sin enlace público ni pares de idioma; ver limitaciones).

## Scripts con texto visible

| Script | Uso |
|---|---|
| `assets/shell.js` | idioma, copiar, avisos |
| `assets/verify.js` | Verify: resultados, errores de lectura, estados de carga |
| `assets/verificar-acciones.mjs` | acciones de Verify |
| `assets/mission.js` | misiones de Lab |
| `assets/cuaderno.js` | Cuaderno |
| `assets/pares.mjs` | Curva |
| `assets/redes.mjs` | redes EVM |
| `assets/orvupi-gallery.js` | galería de memes |
| `assets/aviso-privacidad.js` | aviso de privacidad de Verify |

## ORVUPI Work (apps/work/src)

| Área | Archivos |
|---|---|
| Inicio, navegación, barra superior | `app/App.tsx, ui/chrome.tsx, views/screens.tsx` |
| Docs | `docs/*.tsx, docs/templates.ts` |
| Sheets | `sheets/SheetScreen.tsx` |
| Slides | `slides/SlidesScreen.tsx` |
| PDF | `views/screens.tsx` |
| Formularios | `forms/FormsScreen.tsx` |
| Dibujos | `drawings/DrawingsScreen.tsx` |
| Notas | `notes/NotesScreen.tsx` |
| Mi unidad / archivos | `files/FilesScreen.tsx` |
| ORVUPI AI | `ui/AiPanel.tsx, ai/capabilities.ts` |
| Menús, paleta, tablas, avisos | `ui/menus.tsx, ui/CommandPalette.tsx, ui/TablePicker.tsx, ui/UpdateBanner.tsx, ui/MissingFile.tsx` |
| Errores | `security/errors.ts → i18n errorMessageKey` |
| Ajustes (idioma) | `views/screens.tsx` |

Todas las cadenas visibles de Work pasan por las 642 claves de `messages.ts`. Excepciones encontradas: nombres de fuentes (no se traducen) y textos de plantillas (`templates.ts`), ahora traducidos con claves `tpl:`.
