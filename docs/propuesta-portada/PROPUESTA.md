# Propuesta de portada ORVUPI

Revisión del 8 de noviembre de 2026. Después se autorizó aplicar este diseño a la web del repositorio (`web/v2`), sin fusionar y sin publicar en orvupi.com. La maqueta de esta carpeta sigue siendo la referencia visual.

La página es `docs/propuesta-portada/index.html`. El saludo está en `marca/saludo.mp4`. Los enlaces «Abrir» salen de la propuesta y abren el producto actual.

El pulido lo hizo este agente. Opus no estaba disponible.

## Qué cambió

La primera versión era un índice sobre papel, con el avatar en un marco y una sombra opcional. Esta versión deja el papel para las fichas y mete al pulpo en una escena de tinta: titular a un lado, saludo al otro, logotipo solo en la cabecera.

- De BONK: el personaje habita el color, no va pegado como una foto sobre el papel. El logotipo no se repite junto a él.
- De FLOKI: una frase, dos acciones con jerarquía, y después fichas con cara, nombre, una línea de uso, estado y enlace.
- De SHIB: la entrada es por tarea (crear, explorar, aprender, escribir, participar), en el flujo de la página. No hay un panel flotante ni cartera en la cabecera.

Sigue siendo ORVUPI: tinta `#0d1628`, papel `#f4f1eb`, coral del logotipo. No hay sol, hierba, barco ni moneda sobre circuitos. La frase sigue siendo «Ocho brazos. Mil ideas.» La acción principal es Abrir Work. La secundaria, Ver herramientas.

## Qué aprendí de esta visita

Fuente: el informe de escritorio del 8 de noviembre de 2026 y sus capturas. No conecté cartera, no compré y no acepté boletines.

### BONK

Cabecera ciruela, logotipo a la izquierda, navegación corta y un botón ACCESS $BONK. El hero es un campo naranja con el titular blanco a la izquierda y el personaje a la derecha, delante de un sol. Debajo hay una tira de logos. El DOM tiene dos vídeos con `autoplay`, `loop`, `muted` y `playsinline`, sin controles. Entre capturas cambia la postura: es un bucle, no un modelo 3D que responda al cursor.

En esas capturas de escritorio no se vio con claridad un saludo de pata levantada. El informe lo dice así, y no lo contradigo. El saludo pedido está en la grabación móvil anterior del paquete, en los primeros segundos. Para ORVUPI uso nuestro clip, no el de BONK.

Descarto el boletín, la tira de socios, el naranja y el botón de acceso al token como acción principal.

### FLOKI

Página negra, cápsula de navegación, una ilustración grande, una frase y dos botones (el lleno manda). Después, fichas con imagen, nombre, una línea y enlace.

Tomo la frase corta, la jerarquía de los dos botones y el catálogo visual. Descarto «Buy» como acción principal, la banda de medios y el barco.

### SHIB

Esta vez la portada cargó, después de una pantalla «Loading...». Navegación agrupada, un carrusel de tareas, un acceso rápido fijo por tarea, y más abajo bloques por público y por verbo.

Tomo la entrada por tarea. El acceso de ORVUPI es una fila en la página (Crear, Explorar, Aprender, Escribir, Participar), no un panel que tape el contenido. Descarto Connect Wallet, el carrito, los reclamos de NFT y «Trusted By Leading Publications».

## Cómo saluda

El archivo `marca/saludo.mp4` dura 6 segundos, mide 480×480 y vuelve a la pose oficial. Lo generaron a partir de `Avatar_ORVUPI_3D.png`: un tentáculo se levanta, se conservan el rizo único, los ojos azules, el rosa coral y las ventosas claras, sin emblema ni brazalete. Los primeros fotogramas tienen los ojos más cerrados que la foto oficial. Se usa igual.

En la página es un `<video>` con `muted`, `loop` y `playsinline`. El póster y la imagen de respaldo son `avatar-3d.png`.

- Si no hay preferencia de movimiento reducido, el guion asigna el archivo y llama a `play()` al cargar. No puse `autoplay` en el HTML: así, con movimiento reducido, el navegador no arranca el clip antes del guion. `muted`, `loop` y `playsinline` sí están en el elemento.
- Hay tres botones visibles, debajo del encuadre: Reproducir saludo, Pausar e Imagen fija. BONK no los tiene.
- Con `prefers-reduced-motion` no se asigna `src` hasta que la persona pulsa Reproducir. La foto oficial se queda.
- Si el vídeo falla o `play()` lo rechaza de verdad, vuelve la foto y el texto lo dice. Ningún enlace depende del vídeo.
- El cuadro reserva proporción 1:1 y usa `object-fit: contain`. No recorta cara ni tentáculo.
- Al salir de la pantalla o de la pestaña se pausa. Una pausa elegida no se reanuda sola.
- El archivo trae una pista de audio. No se oye: la reproducción va en mute.

## Identidad y herramientas

La cabecera es clara para que el wordmark azul marino del logotipo se lea. El hero es tinta, con un halo coral, no un sol. Las fichas vuelven al papel.

Work, Studio, Sonar, Verify, Academy y ARQIVEN conservan nombre, estado y enlace. Verify no es el ranking. ARQIVEN sigue siendo una pestaña para escribir, sin modelo propio, con Proyectos pendiente. La dirección publicada es `Bj6orFgn4UegmXtQ4WHcBsHSjjfgruHcScCSeauW1TyU`. Los cinco idiomas apuntan a las URL reales. `/aprender/`, `/lab/`, `/pares/`, `/cuaderno/` y `/comparar/` siguen hacia Academy. El mapa de rutas no se ha recortado.

## Autorrevisión

Chrome 156 headless en Linux, el 8 de noviembre de 2026. No es un teléfono, ni Safari, ni Firefox, ni Edge.

| Comprobación | Resultado |
| --- | --- |
| 1440, 1024, 768, 390 y 320 | Sin desbordamiento horizontal. |
| Saludo | En 1440 el vídeo llega a opacidad 1 y, en el segundo 3, se ve el tentáculo levantado. En 320 también arranca (el encuadre empieza más abajo y hay que bajar para verlo entero). |
| Menú | En 390 abre, dice Cerrar y no desborda. |
| Teclado | El primer tab es «Saltar al contenido». Enter abre Herramientas. Escape lo cierra. |
| Movimiento reducido | No hay `src`, no hay reproducción, el texto avisa. Reproducir saludo lo enciende. Pausar lo apaga. |
| Fallo de vídeo | Con un archivo inexistente, el estado pasa a imagen fija y lo dice. |
| Contraste | Blanco sobre tinta 18:1. Texto del hero `#d7deea` y la entradilla `#f6d5e2` sobre tinta, 13:1. Rosa de ficha `#b81452` sobre papel, 5,7:1. |

En esta pasada el vídeo se reproducía pero no se veía: la regla de opacidad apuntaba a una clase `.escena` y el elemento solo tiene `id="escena"`. Quedó corregido. También dejé de tratar como fallo permanente un `play()` abortado al salir de pantalla.

## Pendiente

- Autorización explícita antes de tocar la web publicada.
- El clip no es transparente: su fondo viaja dentro del cuadro. No se recorta para disimularlo.
- Los ojos del arranque no coinciden del todo con la foto oficial.
- Safari, Firefox, Edge y un dispositivo real no están probados. En un móvil estrecho el saludo empieza bajo los botones; la cara y el tentáculo no se recortan, pero no caben todos a la vez en 390 px de alto junto al titular.
- El README sigue contradiciendo la página del token. No se corrige aquí.

## Reversión

No hay cambio en la web publicada ni en datos locales. No fusionar la rama, o borrar `docs/propuesta-portada/`, quita la propuesta.
