# Registro de cambios

## 0.2.0 — 2026-10-17

Alfa de desarrollo. No es una versión de producción.

- El typecheck incluye los tipos de Node 22.19.7, así que `npm run build` ve `process` y `Buffer` en la configuración y en las pruebas.
- Archivos: carpetas anidadas, mover, renombrar, duplicar, papelera con restaurar, destacados, recientes, búsqueda, filtros, lista o cuadrícula, orden, etiquetas, color, arrastrar y soltar, subida y vista previa.
- Docs: estilos, fuentes, color, resaltado, interlineado, lista de tareas, índice, comentarios locales, historial manual, encabezado, pie, salto de página, impresión y exportación DOCX.
- Hojas: cuadrícula 50×12, SUMA, PROMEDIO, MIN, MAX, CONTAR, SI, orden, filtro, pestañas, fila inmovilizada, CSV y XLSX sencillo.
- Diapositivas de título y texto, con presentación local.
- Matriz de paridad en `docs/PARIDAD_DRIVE.md`.

## 0.1.0 — 2026-10-17

Alfa de desarrollo. No es una versión de producción.

- Aplicación Vite y React en `apps/work`, con barra lateral, barra superior, design system y paleta de comandos.
- Almacenamiento local: OPFS para bytes, IndexedDB para metadatos, y blobs de IndexedDB cuando OPFS no responde.
- Copia y restauración `orvupi-workspace` versión 1.
- PWA: manifiesto, iconos del pulpo y service worker solo en la build.
- ORVUPI Docs: TipTap, autoguardado con indicador veraz, exportación PDF, HTML, TXT y `.orvdoc`.
- Interfaz en español e inglés.
- CSP, saneado de HTML y revisión de licencias.
- Pruebas de unidad, integración, Playwright y axe.
