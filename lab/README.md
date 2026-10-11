# STUBX Lab

Borrador. No está publicado en stubxai.com y no pide autorización para existir en el repositorio: sí la pide para copiarse a la web.

La misión 1, «Cómo detectar un token clon en 5 pasos», lee las fichas de `verify/examples/2026-10-08/`. No vuelve a consultar la red. El progreso se guarda solo en el navegador (`localStorage`, clave `stubx-lab-mision-01`). Se puede borrar. No es un certificado y no tiene valor.

Tres lecciones cortas, en `mission/lecciones.json`, usan las fichas del 2026-10-09: permisos, reparto y datos que faltan. Cada una tiene preguntas con corrección y el enlace «Entender este resultado». El progreso de cada lección usa su propia clave: `stubx-lab-leccion-permisos`, `stubx-lab-leccion-reparto` y `stubx-lab-leccion-huecos`.

`/verify` pide una dirección y responde en una frase: parece la oficial, se parece a STUBX pero no es la CA oficial, o no se pudo comprobar. Una dirección que no parece válida, o una lectura que no está disponible, tienen su propio mensaje. No llama a la red.

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

No hace falta una cuenta, una cartera ni tener STUBX.
