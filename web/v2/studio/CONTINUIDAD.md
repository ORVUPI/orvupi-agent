# Continuidad de Studio

24 de octubre de 2026.

## Qué se hizo

Studio es una aplicación propia en `/studio/`, con la marca ORVUPI (pulpo, `#FF3070`, `#FFF8EC`, `#102032` y tipografías OFL). El cromo de la página (cabecera de navegación y pie) se oculta; el idioma sigue visible. No se copian nombres, colores ni recursos de otras herramientas, y la interfaz no las nombra.

El catálogo cubre meme, redes, currículum, presentación, documento, vídeo (fotograma), flyer, cartel, folleto, logo, invitación, infografía, pizarra y sitio. Cada pieza se edita en este navegador y se descarga en PNG o JPG.

Carcasas:

- Diseño, presentación, vídeo e impresión: riel de 12 pestañas, con Fondo.
- Documento: riel de 9, sin Texto, Herramientas ni Fondo, y barra de texto.
- Pizarra: riel de 11, sin Fondo. Lienzo de puntos más ancho que la vista, sin «Añadir una página». Abajo: notas, temporizador, zoom, «1 de 1», cuadrícula y pantalla completa.
- Sitio: el mismo riel de 12. Cabecera con Vista previa y Exportar. Exportar descarga el PNG de esta página; no hay publicación ni alojamiento. En el lienzo, «+ Añadir una sección» y la tira de páginas.
- Cartel, flyer, logo, invitación y folleto comparten la carcasa de impresión, con Imprimir (diálogo del navegador). El folleto muestra dos guías de pliegue discontinuas, solo en pantalla.

## Qué queda para otra pasada

Medidas exactas en pulgadas o milímetros, línea de tiempo con audio, exportar todas las páginas en un solo archivo, coordenadas infinitas de pizarra, alojar un sitio, barras de herramientas de cada forma y ficha de detalle de plantilla. Los tamaños del diálogo están en px y son aproximaciones útiles.

## Qué se borró y qué se conservó

Se borraron `studio.js`, `render.worker.mjs` y el formulario de la placa (nombre de pieza, pestañas y vista de lienzo única).

Se conservan los recursos oficiales, `catalog.json`, `templates.json`, el filtro de texto, el PNG, los límites del logo, el guardado en el dispositivo, `render.mjs` (las pruebas de píxel de la placa siguen vivas) y las reglas. La clave `orvupi-studio-draft` no se borra. Si había un borrador de la versión anterior, se copia una vez a un proyecto nuevo y la clave antigua permanece.

Las imágenes que sube la persona se guardan en IndexedDB. El JSON exportado no lleva esos bytes.

## Cómo verlo en local

```bash
cd web/v2
python3 -m http.server 4173 --bind 127.0.0.1
```

Abrir `http://127.0.0.1:4173/studio/`. Crear una pieza o elegir una plantilla, editar, recargar y volver a abrirla desde Recientes. Descargar PNG y JPG.

## Pruebas

- `npm test` (TypeScript y la suite de Node, incluida `test/studio-p0.test.ts`).
- Playwright: `studio-vista`, `studio-rapido`, `studio-guardar`, `studio-placa`, `studio-categorias` y el tramo de Studio en `orvupi-recorrido`.

## Fuera de esta pasada

Sin modelos generativos, sin quitar el fondo, sin SVG, sin APIs de pago y sin sincronizar diseños entre dispositivos. El JPG se codifica en el navegador. El cuerpo de las piezas usa Barlow Condensed porque Inter está solo en woff2 y no entra en el raster. Historia y TikTok comparten los mismos píxeles y se distinguen por el identificador. El cromo de la aplicación en japonés, coreano y portugués de Brasil sigue en español; el HTML de esas rutas sí se traduce. No hay despliegue en esta rama.

## Siguiente

Revisar el borrador de la solicitud. Probar a mano una pieza con una imagen propia, cerrar la pestaña y comprobar que vuelve a abrir. No publicar todavía.
