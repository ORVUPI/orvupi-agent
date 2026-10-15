# stubx-agent

Esqueleto público del agente de **STUBX** (`@stubx/agents`, v0.1.0; nombre interno del paquete; no tiene relación con la cuenta @stubx de X).

> Prototipo. Cripto de alto riesgo · Puedes perderlo todo · No es consejo de inversión. El agente no tiene claves, no firma, no custodia y no envía transacciones.

Qué incluye esta versión, sin tag creado: [CHANGELOG.md](CHANGELOG.md) y las notas [en español](docs/releases/v0.1.0/NOTAS.es.md) y [en inglés](docs/releases/v0.1.0/NOTAS.en.md).

[![killswitch-drill](https://github.com/stubxai/stubx-agent/actions/workflows/killswitch-drill.yml/badge.svg)](https://github.com/stubxai/stubx-agent/actions/workflows/killswitch-drill.yml)

Estado del último simulacro del kill-switch. Un simulacro en verde solo demuestra lo que ese simulacro comprueba, en esa versión del código. Por sí solo no marca ninguna casilla del PPM.

El mint público del token (Pump.fun) es `TNWwnzecb37272ZoySDE6D2UcmqNnU12EqtycNSpump`. Este programa no lo mueve.

El único repositorio oficial es [github.com/stubxai/stubx-agent](https://github.com/stubxai/stubx-agent). Compruébalo: tiene que estar enlazado desde la web oficial y desde [@stubxai](https://x.com/stubxai). Cualquier otra cuenta u organización de GitHub (también `github.com/stubx`, sin «ai») no tiene relación con STUBX.

Canales oficiales: X [@stubxai](https://x.com/stubxai) · web https://stubxai.com/ (la dirección antigua, superb-horse-9036f5.netlify.app, está grabada en el token y redirige con 301) · **stubxai.hq@gmail.com**.

## Qué puede hacer

Solo estas acciones, y solo si el kill-switch se lee bien y está apagado:

| Acción | Qué hace aquí |
| --- | --- |
| `ppm:print` | Imprime el estado honesto de las cuatro casillas. |
| `ppm:check` | Comprueba que ese informe no marca casillas de más. |
| `log:append` | Deja un borrador o una nota **en memoria**, con huella sha256. No lo publica. |
| `status` | Resume versión, acciones permitidas y kill-switch. |
| `killswitch:check` | Lee el interruptor. No tiene efecto on-chain. |
| `chain:read` | Lee el mint guardado en `state/public-mint.json`. No llama a ninguna red. |

Cualquier otro nombre se rechaza. Un nombre de firma, custodia, intercambio o envío se rechaza **aunque** alguien lo meta en la lista.

## Qué no puede hacer

- No tiene wallet ni claves. No firma. No custodia. No intercambia tokens. No envía transacciones.
- No contacta la red principal ni ningún RPC.
- No pide activos. No inventa direcciones. No promete resultados.
- No guarda secretos.
- El kill-switch no pausa transferencias de holders, no congela cuentas, no confisca saldos y no apaga Solana.

El detalle está en [LIMITS.md](LIMITS.md) y en [KILL-SWITCH.md](KILL-SWITCH.md).

## STUBX Verify

[`verify/`](verify/README.md) es un componente aparte, de solo lectura, con su propia política. El agente de arriba sigue sin contactar la red principal ni ningún RPC. Verify, solo si se ejecuta a propósito, lee datos públicos de mainnet-beta y no firma, no envía transacciones y no custodia claves. Cómo reproducir cada dato: [verify/README.md](verify/README.md).

## Estado de las cuatro casillas

`npm run ppm:print` imprime el JSON. Hoy:

| Casilla | Estado en este repo | ¿Casilla pública marcada? |
| --- | --- | --- |
| Wallet | `not-applicable` desde el 05-10-2026 (por diseño: el agente no tiene wallet ni claves) | No (no aplica; el total sigue siendo 4 casillas: 3 marcadas · 1 no aplica) |
| Logs | Log público diario en `logs/` con sellos OpenTimestamps (ver [LOGS.md](LOGS.md)) | Sí, desde el 05-10-2026: ≥7 días UTC en `main`, sello confirmado (bloque Bitcoin 968752) comprobado a mano y OK legal. [Ejecución daily-log del 05-10](https://github.com/stubxai/stubx-agent/actions/runs/37274282121) |
| Límites | Tests de este repositorio (`repo-tested`) | Sí, desde el 05-10-2026: CI pública en verde ([ejecución](https://github.com/stubxai/stubx-agent/actions/runs/37278171372)) y OK legal. Ver [LIMITS.md](LIMITS.md) |
| Kill-switch | Fail-closed cubierto por tests de este repositorio y simulacro semanal programado en Actions (ver historial) | Sí, desde el 05-10-2026: simulacros públicos seguidos en verde (26-09, 28-09 y 05-10) y OK legal. Ver [KILL-SWITCH.md](KILL-SWITCH.md) |

Un test en verde solo demuestra lo que ese test comprueba, en esa versión del código. Lo mismo vale para el simulacro. Marcada no significa auditada. Si una CI o un simulacro posterior sale en rojo, la casilla se desmarca y se explica.

## Cómo comprobarlo

Hace falta Node.js 22 o superior (`.nvmrc` fija 22.14.0).

```bash
npm ci
npm run typecheck
npm test
npm run ppm:print
npm run drill:killswitch
npm run logs:verify
```

O todo de una vez, con un informe fechado (`verify-report.md` y `verify-report.json`, con la fecha UTC, el commit y el resultado de cada paso):

```bash
npm ci
npm run verify:all
```

`verify:all` ejecuta en orden `test`, `scan:forbidden`, `drill:killswitch`, `logs:verify` y `logs:status`. No usa red ni secretos y no añade capacidades al agente: solo junta comprobaciones que ya existen. `npm test` también ejecuta las pruebas de `lab/` (misión, biblioteca y páginas de `site-drafts/`).

El test anti-nombre de Studio lee `STUBX_NAME_DENYLIST`. Si esa lista no está, el test se omite con un aviso y el resto de la suite sigue. Este repositorio no guarda esa lista. Seguridad hace esa comprobación a mano antes de cada merge.

## STUBX Lab (borrador, sin publicar)

[`lab/`](lab/README.md) es la primera misión educativa y la biblioteca mínima en español e inglés. [`site-drafts/`](site-drafts/README.md) tiene las páginas estáticas `/verify`, `/lab` y `/tablero`, generadas desde el repositorio y listas para copiar a la web cuando haya autorización. No están publicadas y no sustituyen las páginas que ya existen. `npm run lab:build` las regenera.

No hace falta red para los tests. No hace falta una clave.

`npm test` escribe `test-report.json` (no se versiona). `npm run scan:forbidden` recorre `src/`, `scripts/`, `policy/` y `state/` y sale con error si encuentra APIs de firma o de envío.

## Dónde ver la CI

En la pestaña **Actions** del repositorio, workflow `ci`:

`https://github.com/stubxai/stubx-agent/actions/workflows/ci.yml`

Se ejecuta en cada push, en cada pull request y en una ejecución programada semanal (cron `11 7 * * 1`: los lunes a las 07:11 UTC; GitHub puede retrasarla o saltársela), con Node 22.14.0 (la matriz del workflow y `.nvmrc`). Hace `npm ci`, typecheck, tests (incluidos los de `verify/` y `lab/`, sin red), la verificación del log público (`logs:verify` y que solo se añadan líneas), `ppm:print`, `npm run verify:scan` (el componente Verify no firma ni envía), `npm audit --audit-level=high` y un escaneo de secretos con el binario libre de gitleaks. Ese escaneo recorre solo el historial de la rama (`base..HEAD`, el rango de la PR), no el de las demás ramas. Las huellas de `.gitleaksignore` citan el SHA del commit: esta PR se fusiona con un merge commit, sin squash y sin rebase. Un squash cambia esos SHA y gitleaks vuelve a avisar en `main` hasta regenerar las huellas. El artefacto `test-report` incluye el informe, la salida de `ppm:print` y `SHA256SUMS`. El artefacto `verify-report` guarda el informe de `npm run verify:all` de esa ejecución.

En `main`, un job aparte genera la atestación de procedencia de ese informe (`id-token: write` y `attestations: write` solo en ese job). El resto del workflow usa `contents: read`.

El simulacro del kill-switch va en su propio workflow, `killswitch-drill`, programado los lunes a las 08:17 UTC y también manual con «Run workflow». Solo tiene permiso `contents: read`. Qué comprueba y dónde ver el informe: [KILL-SWITCH.md](KILL-SWITCH.md#simulacro-semanal).

El log público va en su propio workflow, `daily-log`, programado cada día a las 06:23 UTC y también manual con «Run workflow». Es el único workflow que puede escribir en el repositorio (`contents: write`, solo en el job que hace el commit y solo dentro de `logs/`). Qué anota, qué no demuestra y cómo comprobarlo: [LOGS.md](LOGS.md).

CodeQL y OpenSSF Scorecard van en workflows distintos. No prometemos una nota de Scorecard.

El escáner de secretos es el binario de gitleaks publicado en GitHub, fijado por versión y checksum. No usamos el wrapper `gitleaks-action`: en repositorios de organización pide una licencia guardada como secreto, y esta CI no guarda secretos.

## Ajustes de cuentas que no van en el código

Según confirmó su propietario el 26-09-2026, la cuenta de GitHub `stubxai` tiene activada la verificación en dos pasos (2FA). Es un ajuste de la cuenta y no se puede comprobar desde fuera.

Según confirmó su propietario el 28-09-2026, la cuenta de X [@stubxai](https://x.com/stubxai) tiene activada la verificación en dos pasos (2FA) con app de autenticación. También es un ajuste de la cuenta y no se puede comprobar desde fuera.

Activado en el repositorio (comprobado con la API de GitHub el 03-10-2026): secret scanning, push protection y actualizaciones de seguridad de Dependabot.

Pendiente en el repositorio:

- Ruleset en `main`: sin force-push y sin borrado; pull request y checks obligatorios para cambios de personas, sin bloquear el commit diario del workflow `daily-log` (ver LOGS.md).

## Mapa

| Ruta | Para qué |
| --- | --- |
| `src/` | Agente. Sin red y sin claves. |
| `verify/` | STUBX Verify, componente aparte de solo lectura. No forma parte del agente. Ver [verify/README.md](verify/README.md). |
| `lab/` | Misión educativa y biblioteca. Borrador. Ver [lab/README.md](lab/README.md). |
| `site-drafts/` | Páginas estáticas `/verify`, `/lab` y `/tablero`. Sin publicar. |
| `policy/limits.json` | Límites v1, versión máquina. |
| `state/killswitch.json` | Interruptor. Fail-closed si no se puede leer. |
| `state/public-mint.json` | Mint público, solo lectura local. |
| `logs/` | Log público de solo añadir y sus sellos de OpenTimestamps. Lo escribe el workflow `daily-log`. |
| `test/` | Tests. El fixture `test/fixtures/` no es parte del agente. |
| `LIMITS.md`, `KILL-SWITCH.md`, `LOGS.md`, `SECURITY.md`, `THREAT-MODEL.md` | Política y alcance. |

Licencia MIT. Copyright 2026 STUBX. Ver [LICENSE](LICENSE).

Informes de seguridad: [SECURITY.md](SECURITY.md). No hay recompensa económica.

## English

Public skeleton of the STUBX agent. Prototype. High-risk crypto · You could lose everything · Not investment advice. The agent holds no keys: it does not sign, custody, exchange, or send transactions. What this version includes, with the tag left uncreated: [CHANGELOG.md](CHANGELOG.md) and the notes [in Spanish](docs/releases/v0.1.0/NOTAS.es.md) and [in English](docs/releases/v0.1.0/NOTAS.en.md).

Official channels: [x.com/stubxai](https://x.com/stubxai), https://stubxai.com/ (the old address, superb-horse-9036f5.netlify.app, is recorded in the token metadata and redirects with a 301), stubxai.hq@gmail.com.

Verify with Node.js 22 or newer (`npm ci`, `npm run typecheck`, `npm test`, and `npm run ppm:print`). [`verify/`](verify/README.md) is a separate read-only component; the agent above still does not contact mainnet or any RPC. CI runs on Node 22.14.0, on push, on pull request, and on a weekly schedule (cron `11 7 * * 1`, Mondays 07:11 UTC; GitHub may delay or skip scheduled runs). Results are on the Actions tab of `github.com/stubxai/stubx-agent`. Any other GitHub account or organization (including `github.com/stubx`, without “ai”) has no relation to STUBX.

`ppm:print` keeps wallet at `not-applicable` (since 2026-10-05, by design: no agent wallet or keys). Logs, limits and the kill-switch have tests in this repository, and a weekly kill-switch drill is scheduled on the Actions tab (see its history). Three public PPM boxes, logs, limits and kill-switch, were marked on 2026-10-05 with public daily-log, CI and drill runs and legal sign-off; the public count is 3 of 4 marked · 1 not applicable (never a silent 3/3). Marked does not mean audited. The GitHub account `stubxai` has 2FA enabled, as confirmed by its owner on 2026-09-26, and the X account @stubxai has 2FA enabled with an authenticator app, as confirmed by its owner on 2026-09-28 (neither is publicly verifiable). The kill-switch cannot pause holder transfers or freeze accounts. A public append-only, hash-chained log is written by the `daily-log` workflow (scheduled daily; GitHub may delay or skip runs). Its anchors are submitted to OpenTimestamps and each proof stays pending until it is confirmed in Bitcoin; a proof only shows that an anchor existed by then, not that the log is true or complete. The logs box was marked on 2026-10-05 (see LOGS.md).
