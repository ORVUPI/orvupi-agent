# ORVUPI Work

Suite de productividad en el navegador. Gratis, instalable y local-first. Los documentos se guardan en el dispositivo. Esta versión no tiene servidor, no llama a APIs de pago y no se vincula a ningún token.

Esta entrega es la alfa 0.3.0: núcleo, ORVUPI Docs, archivos con la disposición de una unidad local, hojas de 1000 filas y diapositivas con miniaturas. El visor PDF y el modelo de IA local siguen previstos y todavía no editan. La matriz de funciones está en `docs/PARIDAD_DRIVE.md`. La disposición, en `docs/ANALISIS_DRIVE_UI.md`.

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

## English

ORVUPI Work 0.3.0 is a free, local-first PWA. Documents stay on the device. There is no application server and no paid API. This build is an alpha, not a production release. The screen structure is described in `docs/ANALISIS_DRIVE_UI.md`. Feature parity is listed in `docs/PARIDAD_DRIVE.md`.

```bash
cd apps/work
npm ci
npm run build
```

Output directory: `apps/work/dist`. Preview: `npm run preview` at `http://127.0.0.1:4174`.
