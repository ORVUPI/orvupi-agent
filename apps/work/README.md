# ORVUPI Work

Suite de productividad en el navegador. Gratis, instalable y local-first. Los documentos se guardan en el dispositivo. Esta versión no tiene servidor, no llama a APIs de pago y no se vincula a ningún token.

Esta entrega es la alfa 0.2.0: núcleo, ORVUPI Docs, archivos locales, hojas básicas y diapositivas de título y texto. El visor PDF y el modelo de IA local siguen previstos y todavía no editan. La matriz de funciones está en `docs/PARIDAD_DRIVE.md`.

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

## Qué hay en 0.2.0

- Inicio, barra lateral, barra superior y paleta de comandos (Ctrl o Cmd + K).
- Design system de la sección 5.
- Ajustes: idioma español o inglés, uso de almacenamiento, copia y restauración del espacio, instalación de la PWA.
- Documentos: crear, editar, autoguardar, cerrar, recuperar y exportar a PDF, HTML, TXT, DOCX y `.orvdoc`. Estilos, listas de tareas, comentarios locales, historial manual, buscar y reemplazar, índice, encabezado, pie y salto de página.
- El indicador solo dice «Guardado» o «Cambios pendientes», y ese estado coincide con la cola de escritura.
- Archivos: carpetas, mover, renombrar, duplicar, papelera, destacados, recientes, filtros, lista o cuadrícula, etiquetas, color y vista previa.
- Hojas: cuadrícula de 50×12, SUMA, PROMEDIO, MIN, MAX, CONTAR y SI, varias pestañas, fila inmovilizada, CSV y un XLSX sencillo.
- Diapositivas: título, texto y presentación local.
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

## English

ORVUPI Work 0.2.0 is a free, local-first PWA. Documents stay on the device. There is no application server and no paid API. This build is an alpha, not a production release. Feature parity with Drive, Docs, Sheets, and Slides is listed in `docs/PARIDAD_DRIVE.md`.

```bash
cd apps/work
npm ci
npm run build
```

Output directory: `apps/work/dist`. Preview: `npm run preview` at `http://127.0.0.1:4174`.
