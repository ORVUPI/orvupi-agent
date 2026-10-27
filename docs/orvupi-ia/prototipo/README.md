# Prototipo visual de ARQIVEN

Esto es un esqueleto de interfaz para revisar el recorrido y la barra del sitio. No es ARQIVEN operativo. No hay modelo conectado, ni de terceros ni de la familia Arqiven. No está en `web/v2/` y no se publica en orvupi.com.

ORVUPI sigue siendo el nombre del sitio en la cabecera de la maqueta. ARQIVEN es el ítem de la barra y el nombre del producto. La ficha reservada, escrita en la nota de la barra, es Arqiven-1 experimental (`arqiven-1-experimental`). No se muestra como si hubiera un checkpoint.

## Cómo abrirlo

El archivo es `index.html`. Sin parámetros, la vista está apagada.

Para ver el esqueleto:

```text
index.html?preview=1
```

El parámetro no se guarda. Recargar sin `preview=1` vuelve a la página apagada. No usa `localStorage` para encenderse.

## Qué hace la vista encendida

- Barra principal en el orden de `web/v2/index.html`, con ARQIVEN después de Work. El chip de ese ítem y el icono de la barra lateral salen de `docs/orvupi-ia/assets/arqiven-logo-oficial.png` (variante 3 y variante 1). No hay un símbolo genérico. Los demás enlaces apuntan a orvupi.com. ARQIVEN se queda en esta página.
- Saludo «¿En qué puedo ayudarte?» y caja «Pregunta lo que quieras».
- Barra lateral plegable, nuevo chat, búsqueda de la sesión, proyectos y documentos marcados como pendientes.
- Herramientas dentro de la caja. La voz dice que es una propuesta y no abre el micrófono.
- Los cuatro atajos rellenan la caja. No prometen una capacidad del modelo.
- Enviar muestra el texto de la persona y un aviso de que no hay respuesta generada. No hay espera ficticia ni texto de ejemplo que imite un resumen.
- El historial vive en la memoria de la pestaña. Recargar lo borra.
- Enlaces a Work y Studio: las aplicaciones que ya existen. Esta página no les envía el texto y no abre IndexedDB.

## Qué se comprobó

Chrome headless 1366×900 de ventana, emulación, el 27 de octubre de 2026. No es un teléfono ni un monitor físico.

| Ancho | Alto | `preview` | Horizontal | Vertical |
| ---: | ---: | --- | ---: | ---: |
| 1366 | 900 | apagado | 0 px | 0 px |
| 360 | 800 | encendido | 0 px | 0 px |
| 390 | 844 | encendido | 0 px | 0 px |
| 768 | 900 | encendido | 0 px | 0 px |
| 1366 | 900 | encendido | 0 px | 0 px |
| 1366 con `zoom` CSS 2 | 900 | encendido | 0 px | 900 px |

El zoom es el de CSS, no el del menú del navegador. A 200 % la página crece hacia abajo y se puede recorrer; no se sale por el lado. No se usó un teléfono ni un monitor físico.

En la misma pasada, con `preview=1`: el ítem ARQIVEN queda el actual y no cambia de URL; un atajo solo rellena la caja; enviar muestra «No hay respuesta generada»; la voz avisa que no abre el micrófono; Proyectos y Documentos se muestran; en 390 px el menú abre y un toque fuera lo cierra. La página apagada deja el recorrido en `display: none`.

Tras colocar el logotipo oficial, las mismas anchuras volvieron a medirse: horizontal y vertical siguen en 0 px. Con la barra lateral contraída, el icono sigue visible y el horizontal sigue en 0 px.

La página de funciones de la maqueta v02 no es la pantalla de inicio. Aquí no se ha copiado.
