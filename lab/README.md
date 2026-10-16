# ORVUPI Lab

Este directorio conserva la misión educativa y la biblioteca desarrolladas antes del cambio de marca. La web actual de ORVUPI ofrece Lab en https://stubxai.com/lab/ y Aprender en https://stubxai.com/aprender/. Generar los borradores de este directorio no publica cambios en esa web.

Los ejemplos usan fichas reales de USDC, de USDT y de copias que se llaman «USD Coin», leídas el 2026-10-16. No representan un token ORVUPI: ORVUPI todavía no tiene contrato. Las claves de almacenamiento antiguas se migran solas a `orvupi-*` al cargar la página; véase [la guía de transición](../docs/ORVUPI.md).

La misión 1, «Cómo detectar un token clon en 5 pasos», lee las fichas de `verify/examples/2026-10-16/`. No vuelve a consultar la red. El progreso se guarda solo en el navegador (`localStorage`, clave `orvupi-lab-mision-01`). Se puede borrar. No es un certificado y no tiene valor.

Tres lecciones cortas, en `mission/lecciones.json`, usan las fichas del 2026-10-16: permisos, reparto y datos que faltan. Cada una tiene preguntas con corrección y el enlace «Entender este resultado». El progreso de cada lección usa su propia clave: `orvupi-lab-leccion-permisos`, `orvupi-lab-leccion-reparto` y `orvupi-lab-leccion-huecos`.

El comparador local de los borradores pide una dirección y la compara con las fichas históricas: está en el registro curado, se parece a un token del registro pero la dirección es otra, o no se pudo comprobar. Una dirección que no parece válida, o una lectura que no está disponible, tienen su propio mensaje. Esta comparación local no llama a la red; es distinta de la consulta en directo de la web.

## Qué hay

| Ruta | Qué es |
| --- | --- |
| `mission/mision-01.json` | Guion, opciones y explicaciones en español e inglés. |
| `mission/fuentes.json` | Qué mint de los ejemplos entra, y con qué rótulo. |
| `mission/engine.ts` | Lógica de la misión, sin red y sin almacenamiento. |
| `library/glossary.json` | Glosario. La fuente es el español. |
| `library/guides/` | Tres guías bilingües. |
| `library/revision.json` | El inglés está pendiente de revisión humana. |
| `tablero/registros.json` | Tareas, estados y evidencias del tablero. |
| `client/ui.js` | Interacción del navegador. No se publica suelto. |
| `test/` | Pruebas sin red. Las ejecuta `npm test`. |

## Regenerar las páginas

```bash
npm run lab:build
```

Escribe `site-drafts/`. Para abrirlas en local, desde esa carpeta:

```bash
python3 -m http.server 8765
```

Las rutas quedan en `/verify/`, `/lab/` y `/tablero/`. Abrir el HTML como archivo también sirve para leer; el service worker solo arranca con `http` o `https`.

No hace falta una cuenta, una cartera ni tener tokens.
