# Registro de cambios

## 0.4.0 — 2026-10-17

Alfa de desarrollo. No es una versión de producción.

- Docs ocupa la ventana, como el editor de referencia de 2024–2026: fondo `#f9fbfd`, título de 18 px, menú de 14 px, barra en una píldora `#edf2fa`, hoja A4 de 794×1123 px con margen de 96 px (2,54 cm), reglas en centímetros y panel de pestañas con el esquema de títulos.
- La barra aplica zoom, estilo, fuente, tamaño en puntos, negrita, cursiva, subrayado, color, resaltado, enlace, imagen, comentario, alineación, interlineado, listas, sangría y borrar formato. Los menús muestran el atajo (Ctrl+B, Ctrl+I, Ctrl+U, Ctrl+Z, Ctrl+Y, Ctrl+F, Ctrl+K).
- El icono es el de ORVUPI. La píldora de la derecha exporta en este dispositivo. No hay videollamada ni cambio de plan.
- Hojas muestra `fx` junto al cuadro de nombre. Encabezados grises y pestaña activa con franja verde de la paleta. Archivos usa buscador `#edf2fa` y lista de 48 px.
- Los archivos de 0.1, 0.2 y 0.3 siguen abriendo.

## 0.3.0 — 2026-10-17

Alfa de desarrollo. No es una versión de producción.

- La disposición de archivos sigue la estructura de Drive: buscador grande, chips Tipo y Modificado, chip Personas desactivado, botón Nuevo, columna con Inicio, Mi unidad, Recientes, Destacados, Papelera y barra de almacenamiento local.
- Lista con Nombre, Modificado y Tamaño, cuadrícula, migas, clic derecho, selección múltiple y panel de detalles. Inicio muestra sugeridos de este dispositivo.
- Atajos de archivos: `/`, Ctrl o Cmd + `/`, Alt+C y luego F, D, S o P, Alt+V y luego L o D.
- Docs, Hojas y Diapositivas tienen la fila Archivo, Editar, Ver, Insertar, Formato, Herramientas y Ayuda, estrella y título editable.
- Docs centra la página y muestra una regla.
- Hojas: barra de fórmulas, encabezados, pestañas al pie y cuadrícula virtual de 1000 filas por columnas A–AF. Un archivo de 50×12 de la 0.2.0 sigue abriendo.
- Diapositivas: miniaturas, cuatro temas y objetos movibles. Título y cuerpo se mantienen en el JSON.
- Iconos de Lucide 1.59.0 (ISC). El análisis está en `docs/ANALISIS_DRIVE_UI.md`.
- Formularios, Dibujos y Notas locales, con la disposición de esas herramientas: tarjetas de preguntas, lienzo y muro de notas. Los archivos antiguos de Docs, Hojas y Diapositivas siguen abriendo.

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
