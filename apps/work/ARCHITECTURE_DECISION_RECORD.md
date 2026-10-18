# Registro de decisiones de arquitectura

Fecha de la revisión: 17 de octubre de 2026. Versiones tomadas del registro npm ese día. La alfa 0.3.0 cubre el núcleo, Docs, un gestor de archivos con la disposición de una unidad local, una cuadrícula virtual y diapositivas con lienzo. No es una versión de producción.

## Contexto

ORVUPI Work es una suite en el navegador. El coste recurrente obligatorio es 0 €: no hay servidor de aplicación, base de datos remota ni API de pago. Los documentos se quedan en el dispositivo. La interfaz usa la paleta y la tipografía de `web/v2/assets/orvupi.css` y el pulpo rosa ya presente en el repositorio. Esta aplicación no se vincula a ningún token.

## ADR-001. Aplicación

Se elige Vite 8.3.4 (MIT) con React 19.3.1 (MIT) y TypeScript 7.0.2 (Apache-2.0). El plugin de React es `@vitejs/plugin-react` 6.1.2 (MIT). El código vive en `apps/work` y no comparte el `package.json` de la raíz.

La vista previa de esta app usa el puerto 4174. La vista previa de `web/v2` sigue en 4173.

## ADR-002. Editor de documentos

Se elige TipTap 3.32.0 (MIT), sobre ProseMirror (MIT, vía `@tiptap/pm` 3.32.0). El documento canónico es JSON de TipTap dentro del formato propio `orvupi-doc` versión 1.

StarterKit incluye subrayado, listas e historial. El enlace del kit se desactiva y se sustituye por `@tiptap/extension-link`, que solo acepta `http`, `https` y `mailto`. Las imágenes solo entran como data URL de PNG, JPEG, GIF o WebP, con un máximo de 2 MB.

Se descartó escribir un editor propio: ProseMirror ya resuelve selección, historial y el modelo de documento, y su licencia permite uso comercial.

## ADR-003. PDF

La exportación a PDF usa `pdf-lib` 1.17.1 (MIT), cargado solo cuando el usuario exporta. Las fuentes estándar son WinAnsi. Los caracteres fuera de ese repertorio se sustituyen por `?`. El título y el productor del PDF son «ORVUPI Work».

`pdfjs-dist` 6.4.299 (Apache-2.0, https://github.com/mozilla/pdf.js) queda reservado para el visor de la fase 4. No se empaqueta en esta entrega. Un PDF importado se guarda tal cual y se puede volver a descargar. No se anuncia edición de PDF.

## ADR-004. Almacenamiento

`StorageService` separa bytes y metadatos.

- Bytes: OPFS (`navigator.storage.getDirectory`) cuando una escritura de prueba en `.orvupi-probe` tiene éxito. Si OPFS no está, los bytes van a IndexedDB.
- Metadatos: IndexedDB con `idb` 8.0.4 (ISC). Base `orvupi-work`, versión 1. Almacenes `files`, `blobs` y `settings`.

Cada archivo lleva SHA-256. Si el hash no coincide, la lectura devuelve los bytes con integridad `mismatch` y no los presenta como intactos. El borrado es lógico (`deletedAt`) y se puede purgar. El máximo por archivo es 20 MB y el de una copia del espacio es 80 MB.

## ADR-005. Copia del espacio de trabajo

El archivo de copia es JSON `orvupi-workspace` versión 1, con los bytes en base64. La restauración valida el formato entero antes de escribir. Un formato desconocido se rechaza. Una versión distinta de 1 se rechaza con `unsupported-version` y no se reescribe en silencio.

## ADR-006. Guardado del documento

La cola de autoguardado espera 400 ms. `SaveController` usa un testigo de escritura: una respuesta antigua no puede marcar el documento como guardado. En pantalla solo hay dos estados: «Guardado» y «Cambios pendientes». Una escritura en curso o fallida permanece en «Cambios pendientes».

El título sale de la primera línea solo mientras el nombre es «Sin título» o «Untitled».

## ADR-007. Hojas de cálculo

La cuadrícula es propia: 50 filas y columnas A–L, varias pestañas y un evaluador escrito en el proyecto. Las funciones son SUMA, PROMEDIO, MIN, MAX, CONTAR y SI, con los alias ingleses SUM, AVERAGE, COUNT e IF. No se empaqueta HyperFormula.

La investigación del 17 de octubre de 2026 deja estas opciones fuera:

| Opción | Versión | Licencia | Decisión |
| --- | --- | --- | --- |
| HyperFormula | 3.5.0 | GPL-3.0-only | Rechazada. Copyleft fuerte. |
| Handsontable | 18.1.2 | Licencia comercial propia (`SEE LICENSE IN LICENSE.txt`) | Rechazada. |
| `xlsx` (SheetJS) | 0.18.5, publicada el 2022-03-24; sigue siendo la última en npm | Apache-2.0 | No se añade. El paquete en npm está congelado desde 2022. Las compilaciones posteriores del proyecto se distribuyen fuera de npm con otra licencia. |
| `@fortune-sheet/react` | 1.0.4 | MIT, https://github.com/ruilisi/fortune-sheet | Disponible, demasiado pesada para embeberla ahora. |
| `@univerjs/core` | 1.0.4 | Apache-2.0, https://github.com/dream-num/univer | Disponible, demasiado pesada para embeberla ahora. |
| formulajs | 1.0.8 | MIT, https://github.com/sutoiku/formula.js (archivo `LICENSE`) | Candidata para un motor propio. |
| PapaParse | 5.7.0 | MIT, https://github.com/mholt/PapaParse | Elegida para CSV. |
| ExcelJS | 4.4.0 | MIT | Rechazada en esta tanda: arrastra `uuid` anterior a 11.1.1 (aviso GHSA-w5hq-g745-h8pq). |
| `docx` | 9.12.0 | MIT, https://github.com/dolanmiu/docx | Elegida para exportar DOCX. |

El XLSX de esta alfa lo escribe y lo lee el propio código: un ZIP sin comprimir (método 0) y, al leer, inflate en bruto con `DecompressionStream`. No se afirma compatibilidad con un libro de Excel completo.

## ADR-008. IA local, no empaquetada

La interfaz ya tiene `AIProvider` y `NoModelProvider`. Detecta WebGPU, `deviceMemory` y el navegador, y clasifica el equipo en `high`, `medium` o `unsupported`. Las acciones avisan de que el modelo no está descargado y de que el documento no sale del dispositivo.

No se empaquetan, para no inflar la aplicación ni descargar pesos:

- `@mlc-ai/web-llm` 0.2.86, Apache-2.0, https://github.com/mlc-ai/web-llm
- `@huggingface/transformers` 4.3.1, Apache-2.0, https://github.com/huggingface/transformers.js

La fase 6 podrá elegir uno de esos dos. Hasta entonces no hay inferencia.

## ADR-009. Instalable y sin red de datos

`vite-plugin-pwa` 2.0.0 (MIT) genera el service worker con Workbox 7.4.1 (MIT). `injectRegister` es `null`: el registro ocurre desde el módulo de arranque y solo en la build de producción, así que no hay un script en línea. El precaché cubre el cascarón (JS, CSS, HTML, iconos y fuentes), nunca los documentos del usuario.

La CSP de producción va en una meta etiqueta de la build y, con `frame-ancestors`, en `public/_headers`. Los navegadores ignoran `frame-ancestors` dentro de una meta etiqueta, por eso no está en la meta y sí en las cabeceras, junto con `X-Frame-Options: DENY`.

## ADR-010. Sanitización

DOMPurify 3.4.17 se distribuye como `MPL-2.0 OR Apache-2.0`. Esta aplicación elige Apache-2.0. El HTML pegado o importado pasa por DOMPurify. Los enlaces quedan limitados a `http`, `https` y `mailto`. Las imágenes remotas se eliminan.

## ADR-011. Archivos y diapositivas locales

Una carpeta es un archivo de tipo `folder`. Mover rechaza un ciclo. Destacados, etiquetas y un color de una lista cerrada viajan en los metadatos y en la copia del espacio. Las diapositivas son JSON `orvupi-slides` versión 1. Desde la 0.3.0 cada diapositiva añade `theme` e `items`. Título y cuerpo se siguen guardando para que un lector anterior no pierda el texto.

## ADR-012. Disposición y cuadrícula virtual

La estructura de pantalla sigue el análisis de `docs/ANALISIS_DRIVE_UI.md`: columna, buscador, chips, migas, lista, panel y la fila de menús de los editores. Los iconos vienen de `lucide-react` 1.59.0 (ISC). No se empaquetan iconos ni colores de marca de Google.

La cuadrícula de hojas es de 1000×32 en memoria y se pinta por ventana. `serializeSheet` guarda solo el rectángulo usado, así que un archivo de la 0.2.0 sigue siendo pequeño y `parseSheet` lo rellena hasta el tamaño nuevo. No se adopta Handsontable ni HyperFormula.

## Consecuencias

El visor PDF, el modelo de IA, la biblioteca amplia de plantillas y las automatizaciones siguen en fases posteriores. El DOCX no lleva imágenes y el XLSX no cubre el formato completo. La matriz está en `docs/PARIDAD_DRIVE.md`.
