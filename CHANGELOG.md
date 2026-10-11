# Changelog

## 2026-10-11 · Datos de mercado en Verify, solo lectura

- Verify muestra pares, liquidez y volumen de un mint de Solana con la fuente (DEX Screener) y la hora UTC de la consulta. El navegador llama a `/api/market` en este sitio. Una Pages Function de solo lectura consulta la API pública, sin secreto y sin ampliar `connect-src`.
- Si no hay pares, la consulta falla o la fuente pide una pausa, el bloque «Qué falta» lo dice. No se rellena con cero.
- La ficha del cuaderno no guarda esas cifras y no las compara. Se pueden leer aparte, en el momento.

## 2026-10-10 · Biblioteca y cuaderno publicados

- `/cuaderno` está en stubxai.com/cuaderno desde el 2026-10-10 (PR #24). El tablero marca U05 como publicado. La dirección viaja en el fragmento `#a=` y se limpia al leerla; no llega al servidor ni queda en el historial.
- `/aprender` sigue en stubxai.com/aprender con los enlaces de Verify y Lab de la PR #24.

## [0.1.0] — 2026-10-10

Lo que hay en este repositorio hasta el 2026-10-10. El paquete `@stubx/agents` sigue en `0.1.0`. El tag anotado `v0.1.0` está preparado y **no está creado**. Cómo crearlo a mano, y por qué esta entrega no lo hace: [docs/releases/v0.1.0/TAG.md](docs/releases/v0.1.0/TAG.md).

Notas de la versión: [español](docs/releases/v0.1.0/NOTAS.es.md) · [English](docs/releases/v0.1.0/NOTAS.en.md).

Esta entrada resume. No reescribe el detalle fechado que sigue debajo.

### Verify

- Componente aparte, de solo lectura: CLI `verify`, fichas JSON, Markdown y HTML, y pruebas sin red. No firma, no envía y no custodia. El agente de `src/` sigue sin contactar ningún RPC.
- Ejemplos fechados del 2026-10-08 y del 2026-10-09, incluida la ficha oficial releída y los ejemplos añadidos ese día. Una ficha parcial no rellena el hueco.
- En la web v2, `/verify` es Verify universal, desplegado (merge `2434636`). Lee en el navegador, solo lectura, cualquier mint SPL o Token-2022, y también compara con las fichas fechadas.

### Lab

- Misión 1, cinco pasos, para distinguir la dirección del nombre. El progreso se queda en el navegador. No pide cartera ni pago. Está en stubxai.com/lab desde el 2026-10-09.
- Glosario y tres guías, en stubxai.com/aprender. El inglés de esa biblioteca sigue pendiente de revisión humana: si no coincide, manda el español.

### Web v2

- Misma navegación, mismos estilos y el mismo cambio de idioma en las páginas de `web/v2/`. Verify y Lab van dentro de ese cascarón, no en otra web.
- Pie vigente: «Cripto de alto riesgo · Puedes perderlo todo · No es consejo de inversión.» / «High-risk crypto · You could lose everything · Not investment advice.»
- `web/v2/` es la web publicada en stubxai.com desde el 2026-10-09 (merge `ed1c7759`). `web/current/` es la copia anterior, para volver atrás.
- Studio está desplegado (PR #20 y #26) y se indexa. Verify universal está desplegado (merge `2434636`). El cuaderno está en stubxai.com/cuaderno desde el 2026-10-10 (PR #24).
- Esta entrada no despliega `web/v2/`. stubxai.com no cambia por este documento. La v2 ya está desplegada desde el 2026-10-09.
- Este repositorio no inserta medición de visitas ni cookies. Cloudflare Web Analytics debe estar apagado en el panel de la zona (sin baliza en el HTML servido el 2026-10-10).

### Publicado en stubxai.com

Lo que el tablero de main da por abierto en la web, más lo fusionado después en Studio. Esta lista no despliega nada.

- El tablero está en stubxai.com/tablero (PR #27). La columna de la web dice sí solo si la función se abre hoy.
- Contribuir está en stubxai.com/contribuir desde el 2026-10-10 (PR #28; el tablero lo marca publicado en #32). La página no pide cuenta ni guarda datos.
- El ejemplo educativo fijo de una curva está en stubxai.com/comparar desde el 2026-10-10 (PR #29; el tablero lo anota en #32). No lee una dirección.
- En main, el logo de Studio acepta JPG, PNG y WebP, queda en 16 MP y no guarda el PNG inflado (PR #30). El menú marca Studio.
- En iPhone, guardar en Studio usa compartir o una pestaña, con aviso en español e inglés y revocación a los 60 segundos (PR #33). La pestaña de respaldo lleva `noopener`.
- La medición de uso no está en el cliente (PR #23, fusionada en main). El detalle es la entrada de debajo y [docs/medicion-uso.md](docs/medicion-uso.md).
- La lectura de la curva está en stubxai.com/pares desde el 2026-10-10 (PR #31). El tablero la da por publicada.

### Indexación

- `web/v2/robots.txt` (v3, 2026-10-09) permite el rastreo general y publica el sitemap. Los rastreadores de entrenamiento de IA que esa lista nombra quedan en `Disallow`.
- `web/v2/sitemap.xml` lista las páginas públicas con `lastmod`.
- No hay `noindex` global. `X-Robots-Tag: noindex, nofollow` queda en el service worker de Lab, los JSON, el manifiesto y la 404.
- `web/v2/` es la web publicada en stubxai.com desde el 2026-10-09 (merge `ed1c7759`). `web/current/` es la copia anterior, para volver atrás. La v2 ya está desplegada desde el 2026-10-09.

### Texto retirado

- En README y LIMITS, la frase retirada «Memecoin experimental · puedes perderlo todo…» pasa al pie vigente. En inglés, «could», no «can».

## 2026-10-09 · Biblioteca y cuaderno de solo lectura

- `/aprender` explica, para cualquier token de Solana, la dirección, los permisos, las extensiones de Token-2022 y la curva. El único ejemplo con un token real es la dirección oficial de STUBX. Verify y Lab enlazan a esos términos sin borrar lo escrito ni el progreso local.
- `/cuaderno` lee un mint con los mismos orígenes y la misma lista de métodos que Verify universal, guarda la ficha y la nota en este navegador, compara dos consultas de la misma dirección y permite exportar, importar y borrar. Una ficha antigua dice la hora y que puede haber cambiado. No conecta una cartera.

## 2026-10-09 · Medición de uso: ninguna en el cliente

- Este proyecto no añade baliza, cookie ni script de terceros, y no guarda la IP (Cloudflare la recibe como alojamiento). Tampoco un contador agregado: la petición llevaría la IP al alojamiento aunque el programa no la escriba.
- Las únicas cifras que se pueden mirar son las que GitHub ya enseña en la página del repositorio: estrellas, forks y watchers. No son visitas a la web. No se usa la API de tráfico.
- La decisión está en [docs/medicion-uso.md](docs/medicion-uso.md). `npm test` falla si el HTML, el CSS o el JavaScript de la web trae una baliza.

## 2026-10-09 · Verify lee cualquier mint, solo lectura, sin publicar

- La página `/verify` lee en el navegador, sin backend, cualquier mint SPL o Token-2022. El primer servicio es `https://solana-rpc.publicnode.com`, que responde desde el navegador. Si ese devuelve 403, 429 o se agota el tiempo, se prueba `https://api.mainnet-beta.solana.com`: ese fallo es del servicio, no del mint ni de su autoridad. Una respuesta rechazada no se anota como fuente de ese dato. Si los dos fallan, la página dice «No se pudo comprobar» y no inventa cifras. `connect-src` de `/*` se queda en `'self'`. Solo `/verify/` y `/verify/*` abren esos dos orígenes, con `! Content-Security-Policy`.
- El aviso fijo y el de privacidad dicen que no es una auditoría ni un aval, y que el servicio público recibe la dirección y la IP. No hay puntuación de seguro, recomendado ni estafa.
- Un nombre o un símbolo parecido a STUBX, ya plegado (NFKC, homoglifos y sin invisibles), sale en ámbar: «Se parece a STUBX, pero no es la CA oficial». El titular del resto de mints sigue siendo «Lectura de este token», con la línea «No es la dirección oficial de STUBX.» solo en ese caso. La muestra de cuentas no se pide sola.
- En menos de 600 px la cabecera deja de quedarse fija y el veredicto se desplaza a la vista. El campo vacío avisa en línea. `frame-ancestors` queda solo en `_headers`. Hay como máximo 6 lecturas por minuto y una memoria de 60 segundos en la pestaña. La PR 14 ya está en main (2026-10-09). Esta vista previa no se despliega antes del 2026-10-20.

## 2026-10-09 · Revisión de seguridad de Verify y Lab (borrador, sin publicar)

- El service worker queda en `/lab/sw.js`, con red primero, y no guarda la portada ni páginas de avisos. El índice de borrador pasa a `indice-borrador.html`.
- El registro de ejemplos de clones añade ERYyy y FMNb. No es una lista completa. La revisión del 09-10 no trae direcciones EVM, así que no se inventan.
- El detector pliega mayúsculas, NFKC y homoglifos, y marca variantes del nombre y dominios parecidos, incluida la URL de Netlify.
- Si la muestra de holders recibe 429, se leen las cuentas de la curva y de la creadora sin llamarlas censo. La CLI no descarga URIs de creadores fuera de pasarelas IPFS o Arweave. `redactEndpoint` no escribe claves de la ruta. Hay `_headers` solo para las rutas nuevas.
- El modo sin «No publicado» ni `noindex` exige `STUBX_PUBLISH=1` y `--publish`. No está activado.
- `.gitleaksignore` ignora solo huellas de cuentas públicas de token de esta rama (commit, archivo, regla y línea). Gitleaks recorre `base..HEAD`, no el resto de ramas: las huellas de `feat/web-v2` las añade la PR #15. Esta PR se fusiona con merge commit, sin squash. Una semilla bajo `tokenAccount` en otro archivo sigue detectándose. El relleno `\0` de Metaplex se recorta y no se muestra como «�».
- La CLI fija en cada intento `family` (4 o 6) y `autoSelectFamily: false`. El lookup de la IP ya validada se aplaza a la siguiente vuelta y, antes de conectar, se escucha `error` en el socket y en la petición. Así una conexión real a `2001:db8::1` (IPv6 sin ruta) devuelve `ENETUNREACH` y el proceso sigue. Toda la descarga tiene tope con `AbortSignal.timeout`. El detector marca `STU8X`, la U armenia, el cherokee y un host que contiene `stubxai.com` como etiquetas (`stubxai.com.evil.io`). Si `getTokenLargestAccounts` falla, la ficha oficial también lee la cuenta personal publicada `2fS12sTD4TNEEE9MoCEt19brV41UjGdAnaNaxWcmiWvX`, anotada en el registro de esta rama.
- La lista de ejemplos EVM añade dos direcciones de search-v2 de Pump.fun del 08-10 09:14, sin verificar en la cadena. Cualquier dirección `0x` dice que el STUBX oficial solo existe en Solana y, si coincide, que es una copia conocida.
- El detector también marca «S.T.U.B.X», «5TUBX», versalitas y handles `x.com/stubxai_` con sufijo. La ficha oficial y la de USDC se releyeron el 2026-10-09.

## 2026-10-09 · STUBX Lab, misión 1 (borrador, sin publicar)

- `lab/`: misión estática «Cómo detectar un token clon en 5 comprobaciones», sobre las fichas de Verify del 2026-10-08. Progreso solo en el navegador. Glosario y tres guías en español, con inglés pendiente de revisión humana.
- `site-drafts/`: páginas `/verify`, `/lab` y `/tablero` generadas, autocontenidas y sin publicar. No sustituyen la web existente.
- Pruebas sin red en `lab/test/`. `npm test` las incluye. `npm run lab:build` regenera los HTML.
- `/verify` comprueba una dirección pegada contra esas fichas, con semáforo y detalles plegados. Si la dirección no es válida o la lectura no está, lo dice en claro y no inventa un resultado. La misión pasa a 5 pasos con preguntas cortas.

## 2026-10-08 · STUBX Verify (MVP, solo lectura)

- Carpeta nueva `verify/`: CLI `verify <mint> [--format json|md|html] [--out dir]`. Componente aparte del agente. El agente sigue sin contactar la red principal ni ningún RPC, y el PPM no cambia (3 marcadas · 1 no aplica).
- Lee datos públicos de mainnet-beta (RPC por defecto `https://api.mainnet-beta.solana.com`, sustituible con `RPC_URL`), con reintentos, retroceso y pausa. No firma, no envía y no custodia. `npm run verify:scan` falla si aparece ese código.
- Ficha en JSON, Markdown y HTML estático, con fuente por campo. Pruebas sin red en `verify/test/`. Fichas de ejemplo del 2026-10-08 en `verify/examples/2026-10-08/`.
- Cómo reproducir cada dato: [verify/README.md](verify/README.md).

## 2026-10-05 · PPM: casilla Wallet → no aplica

- `ppm:print` pasa `wallet` a `status: "not-applicable"` (`notApplicableOn: 2026-10-05`, `ppmMarked: false`). Motivo: el agente no tiene wallet ni claves por diseño (decisión del creador). La wallet pública del proyecto (SOL) no cuenta para marcar esta casilla.
- Contadores: `ppmMarkedCount: 3`, `ppmTotal: 4`, `ppmNotApplicableCount: 1`. No es un PPM «cerrado» ni un 3/3.
- `ppm:check`, tests y el paso de CI comprueban `not-applicable` (nunca `badge`/estado de marcada).
- Docs: README tabla de casillas y párrafo EN.

## 2026-10-05 · PPM: casilla Logs marcada

- `ppm:print` marca también `logs` (`ppmMarked: true`, `markedOn: 2026-10-05`) con la ejecución pública del workflow `daily-log` del 05-10 (https://github.com/stubxai/stubx-agent/actions/runs/37274282121). `wallet` sigue `pending`. `approved` sigue en `false`. `ppmMarkedCount: 3`.
- Condiciones cumplidas: ≥7 días UTC distintos en `main` (10 a 05-10), sello OpenTimestamps confirmado en Bitcoin (ancla `2026-09-26-000001`, bloque 968752) comprobado a mano con los pasos de [LOGS.md](LOGS.md) (PR #5 / H5), y OK legal.
- Marcada no significa que el log registre todo ni que lo anotado sea cierto. Bitcoin/OpenTimestamps solo son registro de tiempo; no respaldan STUBX.
- `ppm:check` y la CI aceptan las tres casillas marcadas (logs, límites y kill-switch), cada una con un enlace a una ejecución de Actions de este repositorio.
- El paso de la CI pasa a «PPM marks logs, limits and kill-switch, with public runs».

## Sin publicar

Casillas del PPM «Límites» y «Kill-switch» (05-10-2026).

- `ppm:print` marca `limits` y `killSwitch` (`ppmMarked: true`, `markedOn: 2026-10-05`) con sus enlaces públicos: la CI del 05-10 y los simulacros del 26-09, 28-09 y 05-10. `wallet` y `logs` seguían `pending` en ese commit. `approved` sigue en `false`.
- `ppm:check` (y la CI) solo aceptaban esas dos casillas marcadas, cada una con un enlace a una ejecución de Actions de este repositorio, y `ppmMarkedCount` igual al número de casillas marcadas.
- El paso de la CI «PPM stays unmarked» pasa a «PPM marks only limits and kill-switch, with public runs» (luego ampliado a logs; ver entrada de arriba).
- KILL-SWITCH.md, LIMITS.md, README y THREAT-MODEL: textos al día. Marcada no significa auditada; una ejecución en rojo la desmarca.

P5 (28-09-2026): documentación y `logs:status`.

- README y THREAT-MODEL: según confirmó su propietario el 28-09-2026, la cuenta de X @stubxai tiene activada la 2FA con app de autenticación (no verificable desde fuera). El apartado del README pasa a llamarse «Ajustes de cuentas que no van en el código».
- `npm run logs:status` (28-09-2026): resumen de solo lectura que cuenta los días UTC distintos con entradas del workflow y dice si ya llegan a 7. No marca la casilla (siempre `box: "pending"`). Tests en `test/logs-status.test.ts`.
- Nota fija del log (`DAILY_NOTE`), resumen de Actions y LOGS.md: distinguen el agente de este repositorio (no publica en redes sociales) de los posts de @stubxai, que prepara y publica otro agente de IA fuera de este repositorio a partir de textos aprobados. Las entradas anteriores no se reescriben.
- LIMITS: «No tiene valor» pasa a «STUBX no tiene valor intrínseco ni da derechos, y su precio puede llegar a cero», con el pie de riesgo.

Fase P4: log público de solo añadir.

- `logs/agent-log.jsonl`: una entrada diaria encadenada por hash (estado del kill-switch, resultado del simulacro, commit y enlace a la ejecución). Modo `prototipo`: el agente no hace acciones con efecto fuera de este repositorio.
- Workflow `daily-log` (programado cada día a las 06:23 UTC y manual). `contents: write` solo en el job que hace el commit, solo en `main` y solo dentro de `logs/`.
- Anclas en `logs/anchors/` selladas con OpenTimestamps (gratis, sin wallet). Cliente fijado por versión y sha256 en `.github/ots-requirements.txt`.
- `npm run logs:verify` y `logs:check-update` (solo añadir). La CI verifica el log y falla si un cambio edita o borra líneas existentes.
- Tests en `test/public-log.test.ts`.
- CI: la ejecución programada semanal pasa de las 07:00 a las 07:11 UTC (cron `11 7 * * 1`). El README lo describe así.
- KILL-SWITCH.md declara la excepción: el registro diario sigue escribiéndose con el interruptor activado o ilegible, solo para anotar ese estado.
- La casilla «Logs» del PPM sigue `pending`.

Fase P3: simulacro del kill-switch.

- Workflow `killswitch-drill` (programado los lunes a las 08:17 UTC y manual), con permiso `contents: read` y acciones fijadas por SHA.
- `npm run drill:killswitch`: sin llamadas de red, en una copia temporal del estado activa el kill-switch, comprueba que todas las acciones permitidas se rechazan, comprueba el fail-closed con el archivo borrado o corrupto y comprueba que al desactivarlo todo vuelve. Escribe `drill-report.json` y `drill-report.md`.
- Tests del simulacro en `test/drill.test.ts`.
- README y THREAT-MODEL: según confirmó su propietario el 26-09-2026, la cuenta de GitHub `stubxai` tiene activada la 2FA (no verificable desde fuera).
- La casilla «Kill-switch» del PPM sigue sin marcar hasta tener al menos 2 simulacros públicos seguidos en verde y revisión.

## 2026-09-26 · Esqueleto público (queda dentro de 0.1.0)

Primera publicación del esqueleto público (fases P1 y P2). El número de versión del paquete no cambia: esto es el origen de `0.1.0`, no otra versión.

- Paquete `@stubx/agents` con licencia MIT. Sin dependencias de ejecución.
- Dispatcher con lista cerrada de acciones. Un nombre de firma o de envío se rechaza aunque alguien lo añada a la lista.
- Límites v1 en `policy/limits.json`, aplicados en código y cubiertos por tests negativos.
- Kill-switch fail-closed sobre `state/killswitch.json` (alcance `ops-social`).
- Huella sha256 usada en el formato de entrada de log. La cadena pública de solo-añadir queda para P4.
- `npm run ppm:print` imprime el estado honesto de las cuatro casillas. Wallet y logs siguen `pending`. Ninguna casilla se marca como PPM público.
- CI: typecheck, tests, `ppm:print`, `npm audit`, gitleaks (binario libre) y, en workflows aparte, CodeQL y OpenSSF Scorecard.
