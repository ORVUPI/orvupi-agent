# Studio ORVUPI — Fase 5 (P2) y cierre fino

Fecha: 25 de octubre de 2026. Rama aislada. **No fusionar ni desplegar** salvo que Meme IA lo pida.

Base: `main` en `1f99143` (Fases 0–4 ya en producción).

## 1. Alcance aplicado

| Punto del manual | Qué hay en esta rama | Límite declarado |
|---|---|---|
| Fotos con licencias claras | Biblioteca local CC0 (`web/v2/studio/photos/`), búsqueda, nota de licencia | Sin stock de pago ni descarga remota |
| Gráficos con datos + tablas | Capas `chart` y `table` editables; raster y HTML | Series locales; no hay Excel embebido |
| Vídeo / timeline / audio / export | Escenas con duración; tira de escenas | Sin audio ni MP4 |
| Sitios HTML/responsive | `exportSiteHtml` + botón Descargar HTML | Sin publicación ni hosting |
| Pizarra ampliable, comentarios, historial | Ampliar lienzo, comentarios en `meta`, historial local (20) | Sin colaboración remota; coste documentado |
| IA opcional desacoplada | Riel «IA opcional» con frases locales | Ningún modelo se descarga; el editor no depende de IA |
| Gratis / local | Todo el procesamiento en el navegador | Sin APIs de pago |

## 2. Cierre fino sobre 0–4

- Se reafirmó el puente Work / paquete / PDF sin cambiar su contrato (tests `studio-fase3` y `studio-bridge` verdes).
- El riel «Fotos» ya no finge ser solo «subidos»: hay biblioteca + subida.
- El riel «Gráficos» ya no inserta solo formas mudas: inserta series y tablas.
- «Exportar» en sitio descarga HTML; no publica.
- `site-drafts/tablero/index.html` regenerado para listar `test/studio-fase5.test.ts`.

## 3. Archivos nuevos

- `web/v2/studio/lib/photos.mjs`, `chart-data.mjs`, `table-data.mjs`, `html-export.mjs`, `history.mjs`, `ai-optional.mjs`
- `web/v2/studio/photos/*.png` + `catalog.json` + `LICENCIAS.md`
- `test/studio-fase5.test.ts`
- Este informe

## 4. Pruebas

- `npm test` — suite del repositorio, incluidas fases 1–5 y p0.
- Capturas en `/opt/cursor/artifacts/studio-fase5/` (fotos, gráfico, HTML, vídeo, pizarra).

## 5. Autorización

No merge. No deploy. Solicitar OK de Meme IA / quien encarga el producto antes de publicar.
