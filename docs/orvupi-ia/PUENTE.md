# Puente de archivos ARQIVEN ↔ Work

Una sola biblioteca: IndexedDB `orvupi-work`, versión 1. Las tiendas son `files` (clave `id`, índice `updatedAt`), `blobs` y `settings`. Si el navegador deja usar OPFS, los bytes van a `files/<id>` ahí; si no, al almacén `blobs` con esa misma clave. Studio y ARQIVEN usan `web/v2/studio/lib/work-store.mjs`. No hay una segunda base.

La nota que guarda ARQIVEN es `orvupi-note` versión 1, MIME `application/vnd.orvupi.note+json`, `kind: "note"`. El mismo formato lee Work. En Chrome headless, la nota `92537ab4-ed53-4fd6-b304-efed12e0144f` (cuerpo `nota-abierta-1793178012321`) apareció en Notas de `/work/` y, al abrirla, el campo de texto mostró ese mismo cuerpo. No hay una segunda biblioteca.

El visor PDF de Work usa `pageText` (`pdf.js` `getTextContent`). Eso no es OCR. Un escaneado sin capa de texto devuelve una cadena vacía y no se presenta como texto extraído. La pantalla del PDF lo dice.

Cada pulsación de «Guardar en Work» crea un id nuevo. No se reescribe una nota anterior. `BroadcastChannel("orvupi-work")` avisa `{ type: "files-changed" }`.

El texto del modelo se procesa en este navegador. No se envía el documento a un servidor. Guardar solo escribe en este dispositivo.

Límites: no hay OCR. En `/arqiven/` solo se leen TXT y MD. El modelo no genera DOCX ni PDF. La lectura de PDF en Work sigue siendo `getTextContent` de pdf.js, no OCR. El texto se pinta como texto plano (`textContent`) y no se ejecuta. Un diseño de Studio con revisión más nueva no se pisa: `saveWorkBytes` crea otra ficha si la revisión guardada es mayor.

Arqiven-1 no existe como producto. Si hay respuesta, la insignia dice el modelo de terceros.
