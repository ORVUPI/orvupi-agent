# Privacidad

ORVUPI Work 0.1.0 procesa los documentos en el dispositivo. Crear, editar, guardar, exportar y restaurar no envían el contenido a un servidor de ORVUPI, porque esa ruta no existe en esta versión.

## Qué se guarda y dónde

| Dato | Lugar |
| --- | --- |
| Bytes del archivo | OPFS, o IndexedDB si OPFS no está disponible |
| Nombre, fechas, tipo, hash, carpeta, etiquetas y favorito | IndexedDB `orvupi-work` |
| Idioma | IndexedDB, clave de ajustes |
| Copia exportada | El archivo que descarga la persona |

No hay cuenta, cookie de sesión ni analítica. El documento HTML pide `Referrer-Policy: no-referrer`.

## Qué puede salir del dispositivo

- La descarga que la persona pide: PDF, HTML, TXT, `.orvdoc` o la copia del espacio.
- La instalación de la PWA y el precaché del cascarón, que el navegador guarda en su caché del propio origen.
- Si quien publica la vista previa sirve `dist/` desde un sitio, el navegador pide a ese origen el HTML, el JS, el CSS y las fuentes. Esos archivos no contienen los documentos.

## IA

El panel de IA no descarga un modelo y no tiene cliente de red. Las acciones informan de que el documento no se envía a ningún servicio. La detección de WebGPU y de memoria usa APIs locales del navegador.

## Borrado

Mover a la papelera marca `deletedAt`. Restaurar quita esa marca. Purgar borra metadatos y bytes. Restaurar una copia sustituye el espacio solo después de validar el archivo entero.

## Límites

Quien tenga acceso al perfil del navegador puede leer IndexedDB y OPFS. Una copia exportada es un JSON con los documentos en claro: hay que tratarla como los archivos mismos. El modo privado puede borrar el almacenamiento al cerrar la ventana. Esta versión no ofrece cifrado con contraseña.
