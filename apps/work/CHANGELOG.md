# Registro de cambios

## 0.6.3 — 2026-10-17

Alfa de desarrollo. No es una versión de producción.

- Docs entra en el modo de teléfono con un ancho de hasta 840 px o con un puntero grueso, sin mirar el ancho del papel. A 460 y 480 px se ven el menú ⋮ y la barra inferior, y no las reglas de escritorio.
- La meta viewport fija el ancho al dispositivo.
- El service worker usa la red primero para la página y los archivos, toma el control en cuanto hay una versión nueva y muestra «Nueva versión» para recargar. La caché anterior se descarta.
- Ayuda muestra el número de versión, para comprobar qué carga el teléfono.
- El subrayado es una sola línea continua bajo la palabra. Negrita, cursiva, subrayado y tachado no cambian la fuente a monoespacio ni el color a morado, y no parten la palabra en una marca por letra. El corrector sigue en su línea ondulada.
- El contador dice «1 palabra» en singular, en un texto pequeño y sin negrita. En el teléfono la hoja llega hasta la barra inferior y el texto tiene margen a los lados.
- Un archivo de 0.1 a 0.6.2 sigue abriendo: la versión del archivo sigue en 1.

## 0.6.2 — 2026-10-17

Alfa de desarrollo. No es una versión de producción.

- En el inicio el botón «Nuevo» es un icono y el contenido tiene sitio abajo, así que no tapa la descripción de «Nueva hoja». La cabecera ocupa menos de una quinta parte de la pantalla.
- Los filtros siguen en una fila y, si no caben, se desvanecen y hay una flecha para seguir.
- En Docs, la barra inferior empieza por negrita, cursiva, subrayado y alineación. El icono de tabla no queda partido por la flecha.
- En Hojas, «Fórmula o valor» es un marcador de una sola línea.
- Un archivo de 0.1 a 0.6.1 sigue abriendo: la versión del archivo sigue en 1.

## 0.6.1 — 2026-10-17

Alfa de desarrollo. No es una versión de producción.

- En el teléfono, Docs muestra el título entero, cambia los menús por un botón ⋮ y deja la hoja a 16 px de ancho de pantalla, sin encoger el A4. La barra inferior lleva fuente, tamaño, color, listas, tabla y más.
- Dentro de un editor se ocultan la barra de Drive, la navegación inferior y el botón «Nuevo». En Hojas, los menús y el formato caben en una fila y una hoja, y la rejilla ocupa la mayor parte de la pantalla.
- El inicio tiene la búsqueda a todo el ancho, los filtros en una sola fila y sitio abajo para que «Nuevo» no tape la lista.
- Si el enlace no corresponde a un archivo de este dispositivo, Docs, Hojas, Presentaciones, Formularios, Dibujos y Notas muestran la misma tarjeta: «Este archivo no está en este dispositivo» y «Volver a Drive».
- Un archivo de 0.1 a 0.6.0 sigue abriendo: la versión del archivo sigue en 1.

## 0.6.0 — 2026-10-17

Alfa de desarrollo. No es una versión de producción.

- En el móvil la hoja de Docs se ajusta al ancho, la regla vertical se oculta, la barra se desplaza en horizontal y hay una barra de formato abajo. Los menús se abren en una hoja inferior. El teclado deja sitio al cursor.
- Hojas, presentaciones, formularios, dibujos, notas y Drive caben en 360, 390, 412, 460 y 768 px. En el teléfono hay navegación inferior y el botón «Nuevo».
- La auditoría pasa a 119 de 119 (100 %). Entran gráfico, dibujo, marca de agua, ecuación, encabezado, pie, número de página, columnas y letra capital en Docs; escala de color, casilla, fecha, intervalo, imagen, nota, tabla dinámica, macro y CONSULTA en Hojas; animación, cuadrícula y patrón en Presentaciones; archivo y vídeo en Formularios; texto decorado y diagrama en Dibujos; búsqueda en Notas. Son subconjuntos locales: no hay SQL, hilos de comentarios ni subida a un servidor.
- Un archivo de 0.1 a 0.5.0 sigue abriendo: los campos nuevos son opcionales y la versión del archivo sigue en 1.

## 0.5.0 — 2026-10-17

Alfa de desarrollo. No es una versión de producción.

- Auditoría funcional contra la ayuda de Google en `docs/AUDITORIA_FUNCIONAL.md`: Drive, Docs, Sheets, Slides, Forms, Drawings y Notas. Cobertura 107 de 119 (89,9 %). Lo que necesita red o cuenta no aparece en los menús.
- Hojas: formato de número, moneda, porcentaje y fecha; negrita y colores; bordes; combinar celdas; ajustar texto; alineación; inmovilizar filas y columnas; insertar y eliminar filas y columnas; ordenar y filtrar; formato condicional «mayor que»; validación con desplegable; gráficos de barras, líneas y circular con Chart.js 4.5.1 (MIT); autorrelleno arrastrando el cuadro de la celda; copiar y pegar con formato; buscar y reemplazar; más de cien funciones (SUMA, SI, BUSCARV, CONTAR.SI, SUMAR.SI, CONCATENAR, HOY, REDONDEAR y sus nombres en inglés) y referencias a otra hoja.
- Diapositivas: cuadros de texto con negrita y cursiva, formas, líneas, imágenes, alinear y distribuir, orden de capas, fondo, diseños, transiciones de fundido y deslizar, notas del orador y PDF.
- Archivos: detalles, actividad local, versiones, mover a, accesos directos, descarga de carpeta en ZIP y uso de almacenamiento. Compartir no está.
- Formularios: opción, casillas, desplegable, escala, fecha, hora y cuadrícula; obligatoria; secciones; vista previa; respuestas con resumen y gráfico; exportar a una hoja.
- Dibujos: línea, centrar y orden de capas, y descarga del `.ordraw`. Notas: etiqueta, archivar y copiar.
- Un archivo de 0.1 a 0.4.1 sigue abriendo: los campos nuevos son opcionales y la versión del archivo sigue en 1.

## 0.4.1 — 2026-10-17

Alfa de desarrollo. No es una versión de producción.

- En la página real del editor (`/document/d/<id>/edit`) la barra y los menús conservan la selección: el `mousedown` no le quita el foco a TipTap.
- Insertar tabla abre una rejilla de hasta 20×20. El clic derecho en una celda inserta o elimina filas, columnas y la tabla, combina y separa celdas, y cambia el borde y el fondo. Las columnas se arrastran.
- La fuente aplica Arial, Times New Roman, Georgia, Verdana, Courier New, Comic Sans MS y, con licencia OFL, Roboto, Inter, Lora, Merriweather y Montserrat. El control muestra la fuente de la selección.
- El tamaño baja y sube de uno en uno, acepta un número del 1 al 400 y ofrece la lista 8, 9, 10, 11, 12, 14, 18, 24, 30, 36, 48, 60, 72 y 96.
- Negrita, cursiva, subrayado y tachado se aplican, quedan activos y responden a Ctrl+B, Ctrl+I, Ctrl+U y Alt+Mayús+5. El color del texto y el resaltado abren una cuadrícula y un color personalizado.
- La alineación ofrece izquierda, centro, derecha y justificar, marca la opción activa y responde a Ctrl+Mayús+L, E, R y J.
- Estilo, interlineado, listas, sangría, borrar formato, enlace, imagen, comentario, imprimir, zoom, copiar formato, deshacer y rehacer ejecutan su acción.

## 0.4.0 — 2026-10-17

Alfa de desarrollo. No es una versión de producción.

- Docs ocupa la ventana, como el editor de referencia de 2024–2026: fondo `#f9fbfd`, título de 18 px, menú de 14 px, barra en una píldora `#edf2fa`, hoja A4 de 794×1123 px con margen de 96 px (2,54 cm), reglas en centímetros y panel de pestañas con el esquema de títulos.
- La barra aplica zoom, estilo, fuente, tamaño en puntos, negrita, cursiva, subrayado, color, resaltado, enlace, imagen, comentario, alineación, interlineado, listas, sangría y borrar formato. Los menús muestran el atajo (Ctrl+B, Ctrl+I, Ctrl+U, Ctrl+Z, Ctrl+Y, Ctrl+F, Ctrl+K).
- El icono es el de ORVUPI. La píldora de la derecha exporta en este dispositivo. No hay videollamada ni cambio de plan.
- Hojas muestra `fx` junto al cuadro de nombre. Encabezados grises y pestaña activa con franja verde de la paleta. Archivos usa buscador `#edf2fa` y lista de 48 px.
- Abrir o crear un documento, hoja, presentación, formulario, dibujo o nota abre otra pestaña del navegador. La URL es `/document/d/<id>/edit`, `/spreadsheets/d/<id>/edit`, `/presentation/d/<id>/edit`, `/forms/d/<id>/edit`, `/drawings/d/<id>/edit` o `/notes/d/<id>/edit`. El título es «nombre - ORVUPI Docs» (o la herramienta que corresponda) y cada una tiene su favicon. En Drive, el doble clic abre la pestaña. Un cambio en una pestaña avisa a las demás.
- Cloudflare Pages reenvía cualquier ruta a `index.html` (`public/_redirects`).
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
