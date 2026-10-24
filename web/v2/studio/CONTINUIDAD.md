# Continuidad de Studio P0

24 de octubre de 2026.

## Qué se hizo

La superficie anterior de Studio se sustituyó por una aplicación nueva. El paquete de trabajo pedía ampliar la placa antigua; el encargo directo fue crear Studio de cero. Se siguió el encargo directo. La interfaz es propia, en español, con la marca ORVUPI (pulpo, `#FF3070`, `#FFF8EC`, `#102032` y tipografías OFL ya usadas en el sitio). No se copió cromo, nombres ni recursos de otras herramientas.

Los patrones de inicio, catálogo, riel, posición, capas, marca y exportación salen del estudio de Canva con sesión iniciada, con una cobertura de alrededor del 85%. Ese estudio es la fuente de los patrones. El archivo del estudio no está en este repositorio: se aplicó la lista del encargo. La interfaz no nombra esa herramienta.

Entra en este P0:

- Inicio con un botón claro de crear, un diálogo de tamaño (publicación 1080×1080, historia 9:16, X 1600×900, TikTok 1080×1920 y tamaño propio) y los diseños recientes.
- Catálogo con búsqueda y filtros de estilo, tema, color, gratis y formato. Seis plantillas de meme y comunidad. Si un filtro no encaja, se ve el vacío (el formato X no tiene plantilla).
- Editor con riel: Plantillas, Elementos, Texto, Marca, Subidos, Herramientas (seleccionar, dibujar, forma, línea, texto) y Fondo.
- Imagen: cambiar y recorte rectangular.
- Posición: al frente, adelante, atrás, al fondo, seis alineaciones y números de x, y, ancho, alto y rotación.
- Capas: reordenar, todas o solapadas, agrupar, bloquear y duplicar con varias seleccionadas, y mostrar u ocultar.
- Marca siempre incluida: tres pulpos, los tres colores y las tipografías OFL. No hay muro de pago.
- Exportación PNG y JPG. La calidad JPG es libre. Publicación 1080×1080 e historia 1080×1920. No hay SVG.
- Ideas que abren una plantilla editable. No hay generación automática. Lienzo en blanco. Guardar, abrir, duplicar y borrar en este navegador.

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
- Playwright: `studio-vista`, `studio-rapido`, `studio-guardar`, `studio-placa` y el tramo de Studio en `orvupi-recorrido`.

## Fuera de este P0

Sin modelos generativos, sin quitar el fondo, sin animaciones, sin varias páginas, sin impresión, sin modo documento, sin SVG, sin APIs de pago y sin sincronizar diseños entre dispositivos. El JPG se codifica en el navegador. El cuerpo de las piezas usa Barlow Condensed porque Inter está solo en woff2 y no entra en el raster. Historia y TikTok comparten los mismos píxeles y se distinguen por el identificador. El cromo de la aplicación en japonés, coreano y portugués de Brasil sigue en español; el HTML de esas rutas sí se traduce. No se inspeccionó en esta pasada la sesión pública de Adobe Express ni de Microsoft Designer. No hay fusión ni despliegue.

## Siguiente

Revisar el borrador de la solicitud. Probar a mano una pieza con una imagen propia, cerrar la pestaña y comprobar que vuelve a abrir. No publicar todavía.
