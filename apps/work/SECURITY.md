# Seguridad

## Política de contenido

La build inyecta esta CSP en el HTML:

```
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';
img-src 'self' data: blob: https:; media-src 'self' data: blob:; font-src 'self'; connect-src 'self';
worker-src 'self'; manifest-src 'self'; object-src 'none';
base-uri 'self'; form-action 'self'; frame-src https://www.youtube-nocookie.com
```

`style-src` permite estilo en línea porque el editor aplica color y tamaño en el documento. `script-src` no permite scripts en línea. El service worker se registra desde un módulo.

`public/_headers` repite la política y añade `frame-ancestors 'none'`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff` y `Referrer-Policy: no-referrer`. Esas cabeceras las aplica el alojamiento que las respete. La meta etiqueta no incluye `frame-ancestors` porque los navegadores la ignoran ahí y escriben un error de consola.

## HTML

DOMPurify trata el HTML pegado y el HTML importado. Esta aplicación elige la licencia Apache-2.0 de su dual. Después del saneado:

- un enlace solo permanece si el esquema es `http`, `https` o `mailto`;
- una imagen solo permanece si es `data:image/png`, `jpeg`, `gif` o `webp`;
- se eliminan imágenes remotas y enlaces con otros esquemas.

SVG está en la lista de extensiones bloqueadas. También lo están `exe`, `dll`, `bat`, `cmd`, `com`, `msi`, `sh`, `js`, `mjs` y `cjs`.

## Límites de tamaño

| Tope | Bytes |
| --- | --- |
| Archivo | 20 MB |
| Imagen dentro de un documento | 2 MB |
| Copia del espacio | 80 MB |
| Nombre | 180 caracteres |

Un id de archivo tiene que ser un UUID. El nombre visible se limpia de caracteres de control y de separadores de ruta.

## Integridad

Cada escritura calcula SHA-256. Si al leer el hash no coincide, el resultado lleva `integrity: "mismatch"`. La interfaz lo muestra como error de integridad y no sigue editando esos bytes como si fueran válidos.

## Service worker

Workbox precachea el cascarón de la aplicación, con un máximo de 4 MB por entrada de precaché. Los documentos viven en OPFS o IndexedDB y no entran en ese precaché.

## Amenazas que esta versión no cierra

- No cifra los datos en reposo.
- No aísla dos personas que compartan el mismo perfil del navegador.
- Un XSS futuro en el mismo origen podría leer IndexedDB. La CSP y el saneado reducen esa superficie. No la convierten en imposible si se relaja `script-src`.
- La exportación PDF usa fuentes estándar. No es una frontera de seguridad. Es un límite de fidelidad.
