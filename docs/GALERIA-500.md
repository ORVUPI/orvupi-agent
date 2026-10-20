# Galería ORVUPI: 500 imágenes

El catálogo reúne los 250 PNG existentes y 250 PNG nuevos en 30 colecciones.
Los identificadores anteriores y las rutas de descarga se conservan. Las nuevas
imágenes usan los identificadores 482–731. Cada entrada tiene una vista previa
WebP para evitar cargar el PNG completo al navegar por la galería.

## Publicación pendiente

Este cambio de código no publica los archivos del álbum. El directorio
`web/v2/assets/orvupi/album/` sigue excluido de Git, como en la versión anterior.
No desplegar el catálogo nuevo hasta disponer también de los 500 PNG y las
500 vistas previas que enumera `album-manifest.json`.

La preparación local verificó los 1.000 archivos con SHA-256 y tamaño:

- 500 PNG: 1.090.403.674 bytes.
- 500 WebP: 30.148.852 bytes.
- Los primeros 250 PNG conservan exactamente sus huellas anteriores.

Para preparar otro directorio de publicación desde una copia completa del álbum:

```sh
node web/v2/tools/album.mjs fetch /ruta/publicacion --from /ruta/album-completo
```

Verificar todos los archivos antes de publicar en el proyecto existente de
Cloudflare Pages. Tras publicar, comprobar `/memes/`, las 30 colecciones,
la búsqueda y las descargas PNG de ambas series. El origen configurado es
`https://orvupi.com/assets/orvupi/album/`; los archivos nuevos no podrán
descargarse desde ese origen hasta completar su primera publicación.

## Validación

- Comprobación TypeScript: correcta.
- Pruebas de la galería: 4 de 4 correctas.
- Suite general: 408 correctas, 2 fallidas y 1 omitida. Los fallos afectan a
  `site-drafts/tablero/index.html` generado y a una prueba de red IPv6 que
  recibe `timeout` donde espera `ENETUNREACH`; no verifican la galería.
- No se ha completado una revisión visual en navegador ni una publicación.
