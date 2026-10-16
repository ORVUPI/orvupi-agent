# Kill-switch

## Qué es

Un interruptor para el código del agente de este repositorio: si está activado, el agente no ejecuta ninguna acción. No tiene efecto on-chain. El estado vive en [`state/killswitch.json`](state/killswitch.json).

Excepción: el registro diario del log público (workflow `daily-log`, ver [LOGS.md](LOGS.md)) sigue escribiéndose aunque el interruptor esté activado o no se pueda leer. Solo anota ese estado en `logs/` (con la fecha, el commit y el enlace a la ejecución), y el workflow sella el ancla con OpenTimestamps. No ejecuta el simulacro ni ninguna acción del agente, no publica en redes sociales, no firma, no mueve fondos y no tiene efecto on-chain.

Hoy el archivo guardado en el repositorio está desactivado (`engaged: false`). Cambiarlo es un commit. El simulacro semanal automático se explica más abajo.

## Qué para

Si `engaged` es `true`, el orquestador no ejecuta acciones (`ppm:print`, `ppm:check`, `log:append`, `status`, `chain:read`, `killswitch:check`). Un borrador social válido se rechaza con el límite `no-publish-while-killed`.

## Qué no puede hacer

- No puede pausar transferencias de holders.
- No puede congelar cuentas.
- No puede confiscar saldos.
- No puede apagar Solana.

No hay efecto on-chain. El alcance es `ops-social`. Cualquier otro `scope` en el archivo hace que el agente no actúe.

## Fail-closed

Si el archivo no se puede leer, es un enlace simbólico, no es JSON o no tiene la forma exacta, **no se ejecuta ninguna acción** del agente. El log diario solo anota que el archivo no se puede leer (ver la excepción de arriba).

## Cómo se comprueba

`test/kill-switch.test.ts` y `test/drill.test.ts`.

Eso cubre el código de esta versión. Los tests, por sí solos, no marcan la casilla del PPM (ver «Casilla del PPM» abajo).

## Simulacro semanal

El workflow `killswitch-drill` está programado para cada lunes a las 08:17 UTC y también se puede lanzar a mano con «Run workflow». GitHub puede retrasar o saltarse ejecuciones programadas en horas de mucha carga, y las desactiva si el repositorio pasa 60 días sin actividad: el historial de Actions muestra las que se han hecho de verdad.

El simulacro no hace llamadas de red, no usa secretos propios y no toca el archivo real `state/killswitch.json`: trabaja con una copia temporal. (El workflow solo descarga el código y las dependencias de desarrollo, y sube el informe.)

Qué comprueba, en este orden:

1. Con la copia desactivada, las acciones permitidas responden.
2. Activa el kill-switch en la copia.
3. Intenta todas las acciones permitidas (14 intentos) y comprueba que **todas** se rechazan. El efecto llega en la acción siguiente, sin reiniciar nada.
4. Borra el archivo, lo corrompe, lo deja vacío, le quita un campo y lo hace demasiado grande. En cada caso comprueba que **todas** las acciones se rechazan (fail-closed).
5. Lo desactiva y comprueba que las acciones vuelven a responder.
6. Comprueba que el archivo real del repositorio no ha cambiado.

Dónde ver el resultado: pestaña **Actions** del repositorio, workflow `killswitch-drill`:

`https://github.com/ORVUPI/orvupi-agent/actions/workflows/killswitch-drill.yml`

Cada ejecución muestra un resumen con la fecha, el commit y si cada paso pasa o falla. El informe (`drill-report.json` y `drill-report.md`, con sus sha256) queda como artefacto `killswitch-drill-report` durante 90 días.

Para repetirlo en local: `npm ci` y después `npm run drill:killswitch`.

La casilla «Kill-switch» del PPM **no** se marca por tener este workflow. Solo se marca cuando hay al menos 2 simulacros públicos seguidos en verde y después de revisarlos. El simulacro comprueba el código del agente de este repositorio, en una copia temporal. Un simulacro en verde solo demuestra lo que ese simulacro comprueba, en esa versión del código. Ni el simulacro ni el kill-switch tienen efecto on-chain: no afectan al token, que ya tiene revocadas las autoridades de mint y de congelación (eso no depende de este repositorio).

## Casilla del PPM

Marcada el 05-10-2026, después de revisar estos simulacros públicos seguidos en verde y con el OK legal:

- 26-09-2026 (manual): https://github.com/ORVUPI/orvupi-agent/actions/runs/36264436020
- 28-09-2026 (programado): https://github.com/ORVUPI/orvupi-agent/actions/runs/36397668286
- 05-10-2026 (programado): https://github.com/ORVUPI/orvupi-agent/actions/runs/37284177840

En los tres, con el interruptor activado o su archivo roto de 5 formas, se rechazan todas las acciones del agente. Marcada no significa auditada: un simulacro en verde solo demuestra lo que ese simulacro comprueba, en esa versión del código. Solo para el agente: no pausa transferencias ni congela tokens o cuentas. Si un simulacro sale en rojo, la casilla se desmarca y se explica en la web y aquí. `npm run ppm:print` lo refleja (`killSwitch.ppmMarked: true` con los enlaces) y la CI comprueba que están marcadas esta casilla, la de límites y la de logs (wallet sigue sin marcar).

## English

The kill-switch is a switch for the agent code in this repository: when engaged, the agent runs no actions. Exception: the daily public-log entry (`daily-log` workflow, see LOGS.md) is still written when the switch is engaged or unreadable. It only records that state in `logs/` (with the date, commit and run link), and the workflow submits the anchor to OpenTimestamps; it runs no drill and no agent action, posts nothing to social media, signs nothing, moves no funds and has no on-chain effect. The switch itself only stops this package and has no on-chain effect; it does not affect the token, whose mint and freeze authorities are already revoked. The switch reads `state/killswitch.json` and fails closed when that file cannot be read or parsed. It cannot pause holder transfers, freeze accounts, seize balances, or stop Solana. A drill (`killswitch-drill` workflow, scheduled for Mondays 08:17 UTC and also runnable by hand; GitHub may delay or skip scheduled runs, so the Actions history shows the real ones) engages the switch in a temporary copy, checks that every allowed action is refused, checks fail-closed on a missing or corrupt file, and checks that disengaging restores service. The drill itself makes no network calls; the workflow only downloads the code and dev dependencies and uploads the report. A green drill only proves what that drill checks, in that version of the code. Results are on the Actions tab. The PPM box was marked on 2026-10-05, after reviewing consecutive green public drills (2026-09-26, 2026-09-28 and 2026-10-05) and with legal sign-off. Marked does not mean audited. If a drill fails, the box is unmarked and the reason is published.
