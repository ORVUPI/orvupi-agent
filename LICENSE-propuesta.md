# Propuesta de aviso y de licencia — no sustituye a LICENSE

Fecha: 15 de noviembre de 2026.
Estado: borrador para que decida Cristian.
Este archivo no cambia `LICENSE`. La licencia vigente del repositorio sigue siendo MIT, con el aviso «Copyright (c) 2026 ORVUPI».

## Qué hay hoy

`LICENSE` es la licencia MIT completa. `package.json` declara `"license": "MIT"`. El pie de `web/v2/legal/index.html` y de `web/v2/marca/index.html` ya separa dos cosas: el código original va en MIT, y el nombre, el pulpo y los recursos visuales se reservan («todos los derechos reservados»). `docs/ORVUPI.md` dice lo mismo sobre el código.

La plantilla de pull request (`.github/PULL_REQUEST_TEMPLATE.md`) pide que quien envía un cambio acepte publicarlo bajo esa MIT. Una cabecera nueva que diga «todos los derechos reservados» no deroga `LICENSE` por sí sola. Si las dos frases conviven, hace falta una decisión.

## Aviso de copyright que se propone

Texto pedido, listo para usar cuando Cristian lo adopte:

© 2026 ORVUPI. Todos los derechos reservados.

Dónde encaja, si él lo confirma:

- En la marca, el logotipo de ARQIVEN, el avatar y el pulpo de ORVUPI, que la web ya deja fuera de la MIT.
- En una cabecera corta de los fuentes nuevos de ARQIVEN, como la de `datos/arqiven/comprobar-solape.mjs`.

Dónde no se ha aplicado:

- No se ha reescrito `LICENSE`.
- No se han tocado cabeceras de archivos ajenos ni de `local/arqiven/`, `eval/arqiven/fijo/` ni `scripts/`.

## Opción A, la que deja el código como está

Se mantiene la MIT para el código del repositorio, con su texto íntegro y el aviso «Copyright (c) 2026 ORVUPI». La marca y los recursos visuales siguen con todos los derechos reservados, como ya dice el pie de la web. La política de marca vive en `docs/arqiven/proteccion/propuesta-licencia-marca.md`.

En los fuentes nuevos, la cabecera coherente con esta opción sería:

Copyright (c) 2026 ORVUPI

y, en el mismo archivo o en `LICENSE`, el permiso MIT. «Todos los derechos reservados» se reserva para marca y recursos visuales, no para un archivo que el repositorio ofrece bajo MIT.

## Opción B, si quiere cerrar el código de ARQIVEN

Sustituir la MIT solo en un paquete futuro de ARQIVEN (no en todo el repositorio histórico) por una licencia de código con todos los derechos reservados, y relicenciar los commits anteriores solo con el acuerdo de quienes los escribieron. Esta opción no está hecha. Cambiar la MIT de un repositorio ya publicado afecta a copias que ya circulan: la MIT concedida no se revoca con un commit nuevo.

## Qué se pide a Cristian

1. Elegir la opción A o la B.
2. Si elige A, alinear la cabecera de `datos/arqiven/comprobar-solape.mjs` con la MIT, y dejar «Todos los derechos reservados» para la marca.
3. Si elige B, no hacerlo en este borrador: hace falta un texto de licencia propio y una nota de qué archivos cubre.
4. No usar el símbolo ® hasta que exista un registro. ARQIVEN™ y ORVUPI™, como marcas no registradas, están descritos en la política de marca.

Esto no es un dictamen. Un registro de marca o un cambio de licencia de un proyecto ya publicado conviene revisarlo con quien lleve la propiedad industrial.
