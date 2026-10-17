# ORVUPI Work

Suite de productividad en el navegador. Gratis, instalable y local-first. Los documentos se guardan en el dispositivo. Esta versión no tiene servidor, no llama a APIs de pago y no se vincula a ningún token.

Esta entrega es la alfa 0.6.3: la misma suite local, legible en un teléfono de 412 px. La auditoría está en `docs/AUDITORIA_FUNCIONAL.md`. El visor PDF y el modelo de IA local siguen previstos y todavía no editan. La matriz de funciones está en `docs/PARIDAD_DRIVE.md`. Las medidas, en `docs/ANALISIS_DRIVE_UI.md`.

## Arranque

Hace falta Node.js 22.14.0 o posterior.

```bash
cd apps/work
npm ci
npm run dev
```

`npm run dev` abre Vite en local. La build de producción y la vista previa:

```bash
cd apps/work
npm ci
npm run build
npm run preview
```

`npm run build` comprueba los tipos y escribe el sitio estático en `apps/work/dist`. `npm run preview` lo sirve en `http://127.0.0.1:4174`. Ese directorio es el que se puede publicar como vista previa estática. No es un despliegue de producción de ORVUPI.

## Pruebas

```bash
npm test
npm run test:e2e
```

`npm test` ejecuta Vitest (unidad e integración). `npm run test:e2e` construye la app y recorre con Playwright el ciclo de la sección 30 del manual, más el contraste con axe.

## Qué hay en 0.6.3

- En un Android de unos 460 px, Docs usa el menú ⋮ y la barra inferior. El corte es 840 px o un puntero grueso.
- Si el teléfono tenía guardada una versión anterior, aparece «Nueva versión» y al recargar entra la nueva. Ayuda muestra el número de versión.

## Qué hay en 0.6.2

- El inicio deja la cabecera por debajo del 20 % de la altura. «Nuevo» es un icono y no tapa el texto de «Nueva hoja».
- Si los filtros no caben, hay un fundido y una flecha.
- La barra de Docs empieza por negrita, cursiva, subrayado y alineación. La tabla se ve entera.
- La fórmula de Hojas cabe en una línea.

## Qué hay en 0.6.1

- Docs en el teléfono: título completo, menú ⋮, texto a 16 px que ocupa el ancho y una barra inferior con fuente, tamaño, color, listas y tabla.
- Hojas, presentaciones, formularios, dibujos y notas ocultan el cromo de Drive. La rejilla de Hojas deja ver al menos doce filas.
- Inicio: búsqueda ancha, filtros en una fila y el botón «Nuevo» separado del contenido.
- Un enlace a un archivo que no está guardado aquí muestra «Este archivo no está en este dispositivo» y un botón para volver a Drive.

## Qué hay en 0.6.0

- Docs en el teléfono: la página se encaja al ancho, sin regla vertical, con la barra desplazable y otra de formato abajo. Los menús salen en una hoja. El teclado no tapa el cursor.
- Hojas con celdas táctiles, barra de fórmulas y cabeceras fijas. Presentaciones con el lienzo encajado y la tira de miniaturas. Formularios, dibujos, notas y Drive con navegación inferior y botón «Nuevo».
- Sin desbordamiento horizontal en 360, 390, 412, 460 ni 768 px. Playwright lo comprueba en escritorio, Pixel 7 e iPhone 14, con contraste AA.
- Auditoría al 100 % (119 de 119). Lo que exige red o cuenta sigue fuera. Las funciones nuevas son locales: CONSULTA une texto, la tabla dinámica cuenta valores, la macro repite un estilo, y un archivo o un vídeo solo guardan el nombre.
- Un archivo de 0.5.0 abre igual.

## Qué hay en 0.5.0

- Auditoría herramienta por herramienta en `docs/AUDITORIA_FUNCIONAL.md`. Cobertura 89,9 % (107 funciones de 119). Lo que exige red o cuenta no se muestra.
- Hojas con formato, bordes, combinar, inmovilizar filas y columnas, ordenar, filtrar, validación, formato condicional, gráficos (Chart.js, MIT), autorrelleno arrastrando, copiar y pegar, buscar y reemplazar, y más de cien funciones, incluida la referencia a otra hoja.
- Diapositivas con texto formateado, formas, líneas, alinear, capas, fondo, diseños, transiciones, notas del orador y PDF.
- Archivos con detalles, actividad, versiones, mover, accesos directos, ZIP de carpeta y almacenamiento.
- Formularios con los tipos de pregunta de la ayuda, secciones, vista previa, resumen con gráfico y exportación a una hoja.
- Dibujos con línea y orden de capas. Notas con etiqueta, archivo y copia.
- Un documento, una hoja o una nota de 0.4.1 abre igual.

## Qué hay en 0.4.1

- Docs en `/document/d/<id>/edit`: rejilla de tablas 20×20, menú contextual de celda, borde, fondo y ancho de columna.
- Fuentes del sistema y OFL, tamaño 1–400, negrita, cursiva, subrayado, tachado, color, resaltado y alineación, con el atajo correspondiente.
- El resto de la barra (estilo, interlineado, listas, sangría, borrar formato, enlace, imagen, comentario, imprimir, zoom, copiar formato, deshacer y rehacer) ejecuta su comando.

## Qué hay en 0.4.0

- Docs a pantalla completa: título de 18 px, menús de 14 px, barra en píldora, reglas horizontal y vertical, hoja A4 y esquema de títulos.
- Desplegables de zoom, estilo, fuente, tamaño, alineación, interlineado y modo. Atajos Ctrl+B, Ctrl+I, Ctrl+U, Ctrl+Z, Ctrl+Y, Ctrl+F y Ctrl+K.
- Hojas con cuadro de nombre, marca `fx` y pestañas al pie. Archivos con buscador redondeado y tabla.
- Crear o abrir un archivo abre otra pestaña: `/document/d/<id>/edit`, `/spreadsheets/d/<id>/edit`, `/presentation/d/<id>/edit`, `/forms/d/<id>/edit`, `/drawings/d/<id>/edit` y `/notes/d/<id>/edit`. En Drive se abre con doble clic. Las pestañas se avisan entre sí.
- Lo de 0.3.0 sigue en su sitio. Un documento, una hoja o una diapositiva de esa versión abre igual.

## Qué hay en 0.3.0

- Inicio, barra lateral, barra superior y paleta de comandos (Ctrl o Cmd + K).
- Design system de la sección 5.
- Ajustes: idioma español o inglés, uso de almacenamiento, copia y restauración del espacio, instalación de la PWA.
- Documentos: crear, editar, autoguardar, cerrar, recuperar y exportar a PDF, HTML, TXT, DOCX y `.orvdoc`. Estilos, listas de tareas, comentarios locales, historial manual, buscar y reemplazar, índice, encabezado, pie y salto de página.
- El indicador solo dice «Guardado» o «Cambios pendientes», y ese estado coincide con la cola de escritura.
- Archivos: la columna Inicio, Mi unidad, Recientes, Destacados y Papelera; buscador con chips; Nuevo; lista Nombre, Modificado y Tamaño; cuadrícula; migas; clic derecho; selección; detalles y barra de uso local.
- Hojas: cuadrícula virtual de 1000×32 (A–AF), barra de fórmulas, SUMA, PROMEDIO, MIN, MAX, CONTAR y SI, pestañas al pie, fila inmovilizada, CSV y un XLSX sencillo.
- Diapositivas: miniaturas, cuatro temas, objetos movibles y presentación local.
- Formularios: preguntas, respuestas y modo de rellenar, en este dispositivo.
- Dibujos: lienzo con texto, formas e imágenes.
- Notas: tarjetas, colores, fijar y listas.
- ORVUPI AI muestra capacidades del equipo y deja claro que el modelo no está descargado.

## Documentación

- `ARCHITECTURE.md`
- `ARCHITECTURE_DECISION_RECORD.md`
- `DESIGN_SYSTEM.md`
- `PRIVACY.md`
- `SECURITY.md`
- `LICENSE_REVIEW.md`
- `TESTING.md`
- `ROADMAP.md`
- `CHANGELOG.md`
- `KNOWN_ISSUES.md`
- `docs/PARIDAD_DRIVE.md`
- `docs/ANALISIS_DRIVE_UI.md`
- `docs/AUDITORIA_FUNCIONAL.md`

## English

ORVUPI Work 0.4.0 is a free, local-first PWA. Documents stay on the device. There is no application server and no paid API. This build is an alpha, not a production release. The screen structure is described in `docs/ANALISIS_DRIVE_UI.md`. Feature parity is listed in `docs/PARIDAD_DRIVE.md`.

```bash
cd apps/work
npm ci
npm run build
```

Output directory: `apps/work/dist`. Preview: `npm run preview` at `http://127.0.0.1:4174`.
