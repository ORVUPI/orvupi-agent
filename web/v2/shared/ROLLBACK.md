# Volver atrás el cuaderno de este navegador

La base local se llama `stubx-cuaderno`. La versión 2 guarda en cada ficha la red y la dirección, también en las fichas que ya estaban. No borra notas.

## Si otra pestaña no deja actualizar

Eso es `onblocked`: el aviso dice que otra pestaña tiene el cuaderno abierto. Cierra las otras pestañas de stubxai.com y recarga esta. No hace falta borrar las fichas.

## Si esta pestaña se quedó en la versión anterior

Eso es `onversionchange`: el aviso pide recargar. La otra pestaña ya actualizó la base. Recargar no borra las fichas.

## Si hay que volver al código anterior

El código anterior abre la versión 1. El navegador no abre una base que ya está en la versión 2 con un programa que pide la versión 1.

1. En el Cuaderno, pulsa Exportar JSON y guarda el archivo.
2. Cierra todas las pestañas de este sitio.
3. En las herramientas del navegador, en Almacenamiento, borra la base `stubx-cuaderno` de este origen.
4. Abre el código anterior y pulsa Elegir una copia JSON.

Las fichas de Solana se importan. Una ficha de Base no entra en el código que solo acepta Solana: el archivo exportado la conserva. No borres ese archivo si quieres volver a leerla cuando la versión 2 esté otra vez.

Borrar la base sin exportar elimina las fichas y las notas de este navegador. No se puede deshacer aquí.
