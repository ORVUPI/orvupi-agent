# Referencias a «stubx» que quedan en el repositorio y por qué

Rama `orvupi-limpieza`. Ninguna se ve en la web como nombre del proyecto. El test «STUBX y su dirección no salen en ningún archivo publicado» (`test/web-v2.test.ts`) recorre `web/v2` y falla con cualquier aparición que no esté en esta lista.

## Web publicada (`web/v2`): solo piezas técnicas invisibles
- **`stubxai.com`**: es el dominio actual de producción (canonical, og:url, sitemap, robots, security.txt). Se cambiará cuando haya un dominio ORVUPI.
- **Claves de almacenamiento local**: `stubx-cuaderno` (IndexedDB), `stubx-lang`, `stubx-studio-draft`, `stubx-lab-*`, `stubx.notebook.*`, `stubx.market.v1`, etc. Si se renombran, cada visitante pierde su cuaderno, sus borradores y su progreso. No se muestran.
- **Identificadores de código**: `STUBX_VERIFY`, `STUBX_LAB`, `isStubxToken`, `officialStubx`, `looksLikeStubx`… Son nombres internos de funciones y variables. `officialStubx` se mantiene en el formato de ficha para que importen los cuadernos ya exportados (`LEGACY_FLAG_MINT`, solo compatibilidad).
- **`studio/blocklist.json`**: los handles `stubxai` y `CreadorSTUBX` están en la lista de bloqueo para impedir que alguien se haga pasar por esas cuentas desde Studio.
- **Caché del Service Worker de Lab** (`stubx-lab-orvupi-…`): es un nombre interno de caché.

## Núcleo del agente y pruebas públicas (no se publican en la web)
- **`logs/agent-log.jsonl`, `LOGS.md`, `src/public-log.ts`, `src/ppm.ts`, `test/public-log.test.ts`, `test/logs-status.test.ts`**: es el registro público encadenado por hashes. Las entradas antiguas (y los enlaces a ejecuciones de CI `github.com/stubxai/stubx-agent/actions/runs/…`, que GitHub redirige al repo renombrado) no se pueden reescribir sin romper la cadena.
- **`src/public-mint.ts`, `state/public-mint.json`, `verify/registry/canonical.json`, `verify/registry/clones.json`**: es el registro curado del CLI de Verify. Contiene datos on-chain fechados del token anterior. La web ya no los publica (`WEB_PUBLISHES_REGISTRY=false`).
- **`verify/examples/2026-10-0*/`**: son informes históricos fechados y reproducibles. Se citan en los tests offline.
- **`policy/limits.json` (`stubx-agent-limits`)**: es el id de la política. Los tests comparan el markdown con el JSON.
- **`docs/releases/v0.1.0/*`, `CHANGELOG` antiguo**: son notas históricas de la versión 0.1.0.

## Fuentes de generación y tests
- **`web/v2/tools/build_site.py`**: es el generador antiguo. Las páginas de producción ya no salen de él porque se editaron a mano. Se conserva para los tests de las plantillas de herramientas. Pendiente: retirarlo o reescribirlo.
- **`lab/tablero/registros.json` y `web/v2/modules/tablero/registros.json`**: son el historial del tablero, con fechas y enlaces a PR. Solo aparece `stubxai.com` (el dominio).
- **`lab/display-copy.ts`**: contiene la función que convierte el nombre anterior en «TOKEN A» al presentar las fichas antiguas.
- **Tests (`test/`, `verify/test/`, `test/ui/`)**: comprueban que «STUBX» no aparece, que los parecidos se detectan o que las claves técnicas siguen igual.

Lista completa: `git grep -n -i stubx` (ver `rg-stubx-final.txt` en el informe).
