# Pruebas

Node 22.14.0. Desde `apps/work`:

```bash
npm test
npm run typecheck
npm run test:e2e
```

## Unidad e integración

Vitest, entorno Node. Cubren:

- la cola de guardado y el testigo que impide que una escritura vieja marque «Guardado»;
- el HTML escapado, el rechazo de una versión distinta de `orvupi-doc`, la cabecera `%PDF-`, la búsqueda y el saneado de nombres;
- DOMPurify en jsdom;
- la paridad de claves entre español e inglés y la clasificación del dispositivo;
- IndexedDB con `fake-indexeddb`, la copia y la restauración, un hash que no coincide y la ausencia de OPFS en Node;
- SUMA, PROMEDIO, MIN, MAX, CONTAR, SI, un ciclo, el orden con fila inmovilizada, las carpetas y una ida y vuelta de XLSX.

## Extremo a extremo

Playwright 1.64.1, Chromium, una sola worker, base `http://127.0.0.1:4174`. El servidor de pruebas ejecuta `npm run build && npm run preview`. El viewport del proyecto es 1360×900.

El recorrido de la sección 30:

1. entrar;
2. crear un documento;
3. escribir;
4. ver «Cambios pendientes» y después «Guardado»;
5. cerrar;
6. volver al inicio y recargar;
7. recuperar el documento;
8. exportar TXT y comprobar que el archivo contiene el texto.

Una segunda prueba ejecuta axe-core 4.14 con las etiquetas `wcag2a`, `wcag2aa`, `wcag21a` y `wcag21aa` en el inicio y en el editor. La tercera cambia el idioma a inglés y comprueba que sobrevive a la recarga.

La tercera prueba abre Mi unidad, ya no la etiqueta antigua «Archivos».

Resultado de esta entrega, en local: 29/29 de Vitest y 4/4 de Playwright, incluido el contraste en el inicio y en el editor, la navegación «Mi unidad» y una hoja virtual que muestra 30 en B1.

## 0.8.2 (DOCX y maquetación)

- `tests/fixtures/docx-082.ts` genera un DOCX sintético con cuadros de texto, formas, grupo, VML, notas al pie y finales, comentarios con respuesta y resuelto, cuatro imágenes flotantes, un párrafo y una tabla de 60 filas más altos que una hoja y dos secciones (la segunda horizontal y a dos columnas). `tests/unit/docx-082.test.ts` comprueba la importación y la ida y vuelta DOCX → DOCX.
- `tests/e2e/docx-082*.spec.ts` corre en los proyectos `d82-{chromium,firefox,webkit}-{desk,tablet,phone}` (1366×900, 820×1180, 390×844): `npx playwright test --project='d82-*'`. Incluye el selector de tablas 15 × 15 (ratón, toque y teclado) y la tabla personalizada.
- Con `ORVUPI_DOCX=/ruta/al/documento.docx` se prueba además un documento real que no se guarda en el repositorio.
- Comparación con LibreOffice: `soffice --headless --convert-to pdf` del original y de la exportación, y `pdftoppm` para las imágenes.

## Qué no cubre esta tanda

Firefox, Safari y Edge no están en el job. La prioridad del manual los nombra. El job de `apps/work` instala Chromium. La detección de navegador existe para cuando OPFS o WebGPU falten.

No hay prueba de carga de un archivo de 20 MB en el navegador real. El límite se rechaza en la capa de almacenamiento. La restauración se prueba en integración, no en el recorrido visual.

## 0.8.3

- `npx vitest run tests/unit/grandes-083.test.ts tests/unit/tabs-083.test.ts`
- Matriz d83 (Chromium, Firefox, WebKit × escritorio 1366/1920/1024, tablet 820×1180, móvil 360×740 y 390×844): `ORVUPI_BIG_SIZES=30,100,250 npx playwright test --project='d83-*'` — documentos grandes (tiempos en `ORVUPI_BIG_TIMES`), fuente −/+, centrado, redimensionar imágenes y pestañas. Capturas `083-*.png`.

## 0.8.4 (ORVUPI AI)

- Interfaz: `npx playwright test tests/e2e/docx-083-ia.spec.ts --project='d83-*'`.
- Modelo real (descarga el modelo): `ORVUPI_AI_REAL=1 ORVUPI_AI_MODEL=qwen05-cpu npx playwright test tests/e2e/docx-083-ia.spec.ts -g real --project=d83-chromium-desk` (y `d83-chromium-phone`). Comprueba que ninguna petición de red contiene el texto del documento; tiempos en `ORVUPI_AI_TIMES`.
