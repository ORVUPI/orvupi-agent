# Módulos de la web v2

Una sola web estática. Verify, Lab y el tablero no son sitios aparte: el generador `tools/build_site.py` mete su `<main>` dentro de la misma cabecera, el mismo mapa, el mismo selector ES/EN y el mismo pie.

## Qué está vivo en esta copia

| Pieza | Dónde | Qué hace ahora |
| --- | --- | --- |
| Cascarón | `assets/shell.js`, `assets/site.css` | Idioma (`stubx-lab-lang`), títulos, copiar solo la CA oficial, menú. El service worker solo se registra en `/lab/`. |
| Verify en el navegador | `assets/verify.js` | Lee en directo, y solo en lectura, cualquier mint SPL o Token-2022. También pinta las fichas del 2026-10-09 y las anteriores. La ficha oficial incluye la cuenta personal publicada y el resto 0,0000 %. El aviso de Guardar está en web/v2/shared/aviso-guardar.js. |
| Misma regla, importable | `modules/verify/lookup.mjs` | Salida de `tsc` sobre `lab/verify/lookup.ts`, sin source map. Lo usan las pruebas. No llama a la red. Responde a direcciones `0x`. |
| Fichas | `modules/verify/cards.json` | Las fichas de `loadCards`, con textos de presentación añadidos (`statement_en`, `holdersNote_en` y las notas de la curva) sin cambiar los nombres de la API, más los ejemplos EVM. `snapshot.json` dice que el commit citado es ancestro de esta rama (`inBranch`) y que la lectura en vivo está activa (`liveNetwork`). `inBranch` no es la marca de publicación. |
| Lab | `assets/mission.js` + `modules/lab/` | Misión de cinco pasos, tres lecciones cortas, glosario y tres guías. El progreso se queda en el navegador. |
| Tablero | `modules/tablero/registros.json` | Registro envuelto en el mismo cascarón. La ficha de contribuciones está al día 2026-10-10. |
| Curva | `pares/index.html`, `modules/pair-report.mjs` | Moneda base y estado de la curva. La lectura de la cadena no está en `modules/`. La exportación es una instantánea. |
| Contribuciones | `/contribuir` | Enlaces a issues y propuestas de GitHub, con plantilla descargable. Sin formulario y sin datos personales. |
| Hueco | `/cuaderno` | Texto fechado «No construido · 2026-10-09». Sin formulario ni botones de crear, guardar, exportar o enviar. |

`/avances` no es un segundo tablero: explica que el tablero está en `/tablero`.

## La PR 14 ya está en main

La PR 14 se fusionó en main el 2026-10-09.

1. `lab/` y `site-drafts/` ya están en esta rama, por el merge de `feat/lab-mision-1` (`0cb1633`).
2. `node web/v2/tools/bundle-from-lab.mjs` regenera `verify.js`, `mission.js`, `lookup.mjs`, `cards.json`, la misión, el tablero y `snapshot.json` desde ese árbol. Si `lab/` no está, sale con error. No inventa un build.
3. Volver a ejecutar `python3 web/v2/tools/build_site.py`.
4. `snapshot.json` `inBranch` significa que el commit citado es ancestro de esta rama. La PR 14 está en main desde el 2026-10-09. Esta copia de la web sigue sin publicarse. El aviso de demo sigue visible.

La lectura en vivo consulta la red al pegar una dirección de Solana. Si el servicio no responde, la página lo dice y no inventa un resultado. Publicar sigue exigiendo `STUBX_PUBLISH=1` y `--publish`. Esta copia no se publica sola: `liveNetwork` es verdadero y el sitio sigue sin desplegar.

## Huecos que un módulo futuro debe cumplir

El cuaderno, cuando exista, entra igual que Verify:

- Su HTML es un `<main>` que `build_site.py` envuelve. No traen su propia cabecera ni su propio selector.
- Usan las variables de `assets/tool.css` y lo que añada `assets/site-extra.css`.
- El idioma sale de `html[data-lang]` y de la clave `stubx-lab-lang`. Cada frase visible tiene par ES/EN. Las direcciones no se traducen.
- En móvil usan la misma navegación. No hay un layout distinto.
- Si el módulo no sabe hacer algo, la página lo dice con fecha. No se dibuja un control que no haga nada.
- Nada de service worker que cachee la portada o los avisos.
- CSP: `'self'`, y en `/verify` también los dos servicios públicos de lectura de `verify/policy/limits.json`. Sin CDN.
