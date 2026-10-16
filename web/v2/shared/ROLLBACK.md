# Volver atrás el cuaderno de este navegador

La base local se llama `orvupi-cuaderno`. La versión 2 guarda en cada ficha la red y la dirección, también en las fichas que ya estaban. No borra notas.

## Si otra pestaña no deja actualizar

Eso es `onblocked`: el aviso dice que otra pestaña tiene el cuaderno abierto. Cierra las otras pestañas de esta web y recarga esta. No hace falta borrar las fichas.

## Si esta pestaña se quedó en la versión anterior

Eso es `onversionchange`: el aviso pide recargar. La otra pestaña ya actualizó la base. Recargar no borra las fichas.

## Si el navegador responde VersionError

Eso es VersionError: la base de este navegador ya está en una versión mayor que la que pide esta página. El Cuaderno abre esa base sin subirla y sigue. No borres las fichas por ese aviso. Si hace falta la versión de esta página, recarga cuando esta página sea la más nueva, o exporta el JSON antes de borrar la base.

## Cambio de nombre a ORVUPI (16-10-2026)

Antes del cambio, el cuaderno y las claves de este navegador usaban el nombre anterior (los nombres exactos están en `shared/legacy-names.js` y en `assets/shell.js`). Al abrir la web ORVUPI por primera vez:

- Las fichas válidas se copian a `orvupi-cuaderno`. La base con el nombre anterior **no se borra**.
- El progreso del Lab, el idioma y el borrador de Studio se copian a claves `orvupi-*`. Las claves antiguas **no se borran**.
- Solo se copian fichas que pasan la validación (ficha correcta, red habilitada, dirección de la ficha) y claves conocidas con un valor válido. Lo demás se queda en la base o la clave antigua, sin tocar.
- Si ya había una ficha o una clave ORVUPI con el mismo nombre, manda la nueva.
- La copia se hace una vez por navegador: lo marcan `orvupi-migracion-cuaderno` y `orvupi-migracion-claves`.

Los datos antiguos se mantienen durante dos versiones después del cambio. Se retirarán en una versión posterior, que lo dirá aquí.

### Volver al código anterior al cambio de nombre

Como no se borra nada, el código anterior sigue viendo su base y sus claves tal como estaban el día del cambio. Lo que se haya guardado después en la web ORVUPI no está en la base antigua. Para llevarlo:

1. En el Cuaderno ORVUPI, pulsa Exportar JSON y guarda el archivo.
2. Abre el código anterior y pulsa Elegir una copia JSON.

Si después se vuelve a la web ORVUPI, la copia no se repite (ya está la marca) y `orvupi-cuaderno` sigue como estaba.

## Si hay que volver al código anterior

El código anterior abre la versión 1. El navegador no abre una base que ya está en la versión 2 con un programa que pide la versión 1.

1. En el Cuaderno, pulsa Exportar JSON y guarda el archivo.
2. Cierra todas las pestañas de este sitio.
3. En las herramientas del navegador, en Almacenamiento, borra la base `orvupi-cuaderno` de este origen.
4. Abre el código anterior y pulsa Elegir una copia JSON.

Las fichas de Solana se importan. Una ficha de Base no entra en el código que solo acepta Solana: el archivo exportado la conserva. No borres ese archivo si quieres volver a leerla cuando la versión 2 esté otra vez.

Borrar la base sin exportar elimina las fichas y las notas de este navegador. No se puede deshacer aquí.
