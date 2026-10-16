# Borradores de páginas

Estas páginas no están publicadas. Cuando haya autorización se pueden copiar `/verify`, `/lab` y `/tablero` a stubxai.com sin sustituir las páginas que ya existen.

`indice-borrador.html` es solo el índice local. No se llama `index.html` y no se copia a la raíz: sustituiría la portada oficial.

El service worker vive en `lab/sw.js`, con alcance `/lab/`. No se publica un `sw.js` en la raíz. No guarda `/`, `/index.html` ni páginas de avisos. Las navegaciones dentro de `/lab/` van primero a la red y, si falla, a la caché de esa misma ruta. `assets/site.js` solo lo registra cuando la ruta es `/lab/`.

`_headers` aplica la CSP y el resto de cabeceras solo a `/verify`, `/lab`, `/tablero` y a `indice-borrador.html`. No hay una regla `/*`: no debe imponerse a las páginas que ya están en stubxai.com. Antes de activarla en el hosting, el creador tiene que comprobar que no rompe esas páginas.

No usan CDN ni fuentes externas. No hay analítica, cuentas ni firma.

Cada HTML, el worker de `/lab/` y `_headers` los genera `npm run lab:build`. Si se editan a mano, `npm test` falla.

El aviso de cada página dice que es solo lectura, que no conecta carteras ni firma, y que las fichas no son una auditoría ni una garantía. Las fichas de la misión son del 2026-10-08. Los ejemplos posteriores, si los hay, van fechados. Lo desconocido no es lo mismo que lo comprobado. La lista de clones de ejemplo no es completa.

## Publicar, solo si el creador lo decide

El borrador lleva `noindex` y la línea «No publicado». Para regenerar sin eso hacen falta las dos cosas a la vez:

```
ORVUPI_PUBLISH=1 npm run lab:build -- --publish
```

Sin las dos, el comando no escribe nada. Ese modo no está activado en esta rama.
