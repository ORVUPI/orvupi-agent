# Logs

## Qué es

Un registro público de solo añadir: [`logs/agent-log.jsonl`](logs/agent-log.jsonl). Tiene una línea por entrada. Cada línea lleva la huella sha256 de su contenido y el hash de la línea anterior, así que forman una cadena. Si alguien cambia o borra una línea antigua, la cadena deja de cuadrar y la verificación falla.

Lo escribe el workflow `daily-log`, programado cada día a las 06:23 UTC y que también se puede lanzar a mano con «Run workflow». GitHub puede retrasar o saltarse ejecuciones programadas, y las desactiva si el repositorio pasa 60 días sin actividad. El historial de Actions muestra las que se han hecho de verdad:

`https://github.com/ORVUPI/orvupi-agent/actions/workflows/daily-log.yml`

## Qué se anota

El agente de este repositorio es un prototipo y hoy no hace acciones con efecto fuera de este repositorio: no publica en redes sociales, no firma y no mueve fondos. Por eso cada entrada solo anota datos que genera el propio repositorio en esa ejecución:

- fecha y hora (UTC) y número de entrada
- modo: `prototipo`
- commit del repositorio con el que se ha generado
- estado del kill-switch leído de `state/killswitch.json`: legible o no, activado o no
- resultado del simulacro del kill-switch hecho en esa misma ejecución: cuántos pasos y cuántos pasan
- enlace a la ejecución de Actions que la ha escrito
- huella sha256 del contenido, hash de la línea anterior y hash de la línea

Los posts de [@ORVUPI](https://x.com/orvupi) no salen de este repositorio: los prepara y publica otro agente de IA, a partir de textos aprobados antes de publicarse. Este log no los registra y el kill-switch de este repositorio no los para.

Si el kill-switch está activado o no se puede leer, el simulacro no se ejecuta y la entrada lo dice. El registro sigue escribiéndose, como excepción declarada en [KILL-SWITCH.md](KILL-SWITCH.md): solo anota el estado, no ejecuta ninguna acción del agente y no tiene efecto on-chain. Así se ve en público que el interruptor está activado.

No se anotan datos personales, secretos, direcciones de wallet ni datos de la cadena de bloques. No hay métricas.

El campo `actor` vale `orvupi-agent` porque identifica el paquete que escribe el log. No es una acción del agente.

## Qué no demuestra

- La cadena demuestra que lo publicado **no se ha cambiado** después. No demuestra que se haya anotado **todo**.
- Una entrada con el simulacro en verde solo demuestra lo que ese simulacro comprueba, en esa versión del código.
- El agente sigue sin hacer acciones con efecto fuera de este repositorio. Si algún día las hace, se explicará antes en este archivo y se anotarán aquí.
- El modo `prototipo` y la nota de cada entrada están fijados en el código. Si algún día el agente hace acciones con efecto fuera de este repositorio, se cambiarán antes, en un commit público.
- Desde el 28-09-2026 la nota de cada entrada distingue el agente de este repositorio de los posts de la cuenta del proyecto. Las entradas anteriores conservan la nota anterior («El agente no publica en redes sociales…»), que se refiere solo al agente de este repositorio. Las entradas nuevas, desde el 16-10-2026, nombran a @ORVUPI.

## Cambio de cadena del 16-10-2026 (ORVUPI)

El 16-10-2026 el proyecto pasó a llamarse ORVUPI y **la cadena se reinició**:

- La cadena anterior (22 entradas, actor con el nombre anterior del proyecto, último hash `00448b50f38e39a3e04b3bbc23e93a5e824f955eaa30f9f4911bfc9baf2b1168`) se conserva sin cambios en el tag `pre-orvupi-2026-10-16`, con sus anclas y sus sellos `.ots`. Los sellos confirmados que se citan abajo se comprueban sobre ese tag.
- La cadena nueva empieza con una entrada génesis (`action: "genesis"`, seq 1) cuya nota dice que la cadena se reinicia el 16-10-2026, que la anterior se conserva en el tag `pre-orvupi-2026-10-16` y cuál es su último hash. Las entradas 2 a 23 copian las 22 anteriores con su fecha original, su commit, el resultado del simulacro y el enlace a la misma ejecución de Actions (el repositorio se renombró a `ORVUPI/orvupi-agent`; GitHub redirige los enlaces antiguos). Su nota es neutra: no lleva ningún nombre de cuenta, para no atribuir a esas fechas un nombre que todavía no existía. El campo `actor` vale `orvupi-agent` porque el formato solo admite ese valor. Por eso la génesis es la única entrada con fecha posterior a la siguiente.
- Los sellos `.ots` antiguos sellaban las anclas de la cadena anterior y no valen para la nueva, así que se han retirado de `logs/anchors/` (siguen en el tag). Las anclas nuevas se sellarán en las próximas ejecuciones de `daily-log`; hasta entonces `logs:verify` las lista como pendientes.
- Por la regla de este archivo (si un sello confirmado deja de comprobarse, la casilla se desmarca), **la casilla «Logs» del PPM queda desmarcada desde el 16-10-2026**. Se podrá volver a marcar cuando la cadena nueva tenga un sello confirmado en Bitcoin y comprobado a mano, y haya revisión con OK legal.
- `logs:check-update` admite este cambio una sola vez: solo cuando la cadena de la base termina en ese hash y la nueva empieza con esa génesis exacta. Cualquier otro cambio sigue siendo solo-añadir.

## Sello de tiempo (OpenTimestamps)

Con cada entrada, el workflow escribe un «ancla» en `logs/anchors/`: un archivo de texto pequeño con el número de entradas, el hash de la última y el sha256 del log hasta esa línea. Después la sella con [OpenTimestamps](https://opentimestamps.org/) y guarda el sello al lado (`.txt.ots`).

- OpenTimestamps es gratuito y no usa wallet. Cuando el sello se confirma en un bloque de Bitcoin, permite comprobar que el ancla ya existía, como tarde, en la fecha de ese bloque. No demuestra que lo anotado sea verdad, ni que esté completo, ni que no se haya dejado nada fuera.
- Bitcoin y OpenTimestamps solo se usan como registro público de tiempo. No tienen relación con ORVUPI ni con el token y no le dan respaldo, seguridad ni valor.
- La confirmación en Bitcoin tarda horas. Hasta entonces el sello está pendiente y no prueba nada por sí solo. El workflow intenta completarlo en las ejecuciones siguientes.
- El sellado depende de los servidores de calendario públicos de OpenTimestamps, que ORVUPI no controla. Si fallan, la entrada se escribe igual sin sello y se vuelve a intentar en la ejecución siguiente. Si esos calendarios desaparecen antes de confirmar un sello, ese sello puede quedarse sin completar.

## Cómo comprobarlo

1. **La cadena.** Con Node.js 22 o superior:

   ```bash
   npm ci
   npm run logs:verify
   ```

   Recalcula todos los hashes, comprueba que cada línea enlaza con la anterior y que cada ancla coincide con el log. La CI lo hace en cada push y pull request de personas y en su ejecución semanal. Los commits del propio workflow `daily-log` no lanzan la CI (GitHub no lo hace con su token), pero ese workflow hace la misma verificación antes de cada commit.

   `logs:verify` solo comprueba que cada ancla tiene su archivo `.ots`, no que el sello esté confirmado en Bitcoin. Eso se comprueba en el paso 3.

2. **Que solo se añade.** La CI compara el log con el commit anterior y falla si una línea existente cambia o desaparece. En el historial de Git de `logs/agent-log.jsonl` también se ve que cada commit solo añade líneas al final.

3. **El sello.** Antes de marcar la casilla «Logs» del PPM hay que comprobar a mano, con `ots verify` o en opentimestamps.org, que al menos un sello está confirmado. Descarga un ancla (`logs/anchors/AAAA-MM-DD-NNNNNN.txt`) y su `.ots`. Súbelos juntos en https://opentimestamps.org/ o usa el cliente `ots verify` (para la comprobación completa necesita un nodo de Bitcoin propio).

4. **Cada entrada.** El campo `evidence` enlaza con la ejecución de Actions que la escribió. Ahí se ven el resumen y el resultado del simulacro.

## Comprobación manual de los sellos (03-10-2026, cadena anterior)

Esta comprobación es de la cadena anterior al 16-10-2026. Sus anclas y sellos están en el tag `pre-orvupi-2026-10-16`, no en `main`: para repetirla, usa ese tag.

Hecha a mano el 03-10-2026 a las 12:17 (Madrid) y repetida el mismo día a las 13:59 sobre un clon nuevo del commit `5187264` de `main`, con el cliente `ots` 0.7.2 fijado en `.github/ots-requirements.txt`. Sin nodo de Bitcoin propio: el merkle root de cada bloque se ha comparado con el de dos exploradores públicos independientes (blockstream.info y blockcypher.com). Coinciden todas las atestaciones de Bitcoin de los 7 sellos (24 en total); la tabla da el bloque más antiguo de cada uno.

| Ancla | Bloque de Bitcoin | ¿Coincide el merkle root? | Existía, como tarde (Madrid) |
| --- | --- | --- | --- |
| `2026-09-26-000001` | 968752 | Sí | 2026-09-27 01:27 |
| `2026-09-27-000002` | 968801 | Sí | 2026-09-27 09:39 |
| `2026-09-28-000003` | 968959 | Sí | 2026-09-28 08:51 |
| `2026-09-29-000004` | 969116 | Sí | 2026-09-29 09:01 |
| `2026-09-30-000005` | 969277 | Sí | 2026-09-30 09:34 |
| `2026-10-01-000006` | 969409 | Sí | 2026-10-01 08:55 |
| `2026-10-02-000007` | 969552 | Sí | 2026-10-02 09:04 |
| `2026-10-03-000008` | 969690 | Sí (completado a mano el 03-10 a las 23:35, ver abajo) | 2026-10-03 08:54 |

El sello `2026-10-03-000008` seguía pendiente en el repo a las 13:59. El 03-10 a las 23:35 (Madrid) se completó a mano con `ots upgrade` (mismo cliente 0.7.2), que es lo mismo que hace el workflow `daily-log` en cada ejecución. Tiene 3 atestaciones de Bitcoin (bloques 969690, 969693 y 969694) y las 3 coinciden con el merkle root de blockstream.info y de mempool.space. El commit solo cambia ese `.ots` y esta tabla; no toca `agent-log.jsonl` ni las anclas.

Pasos para repetirlo (Linux o macOS, con Python 3 y curl):

```bash
git clone https://github.com/ORVUPI/orvupi-agent && cd orvupi-agent
git checkout pre-orvupi-2026-10-16   # las anclas y sellos de esta tabla están en ese tag
python3 -m venv /tmp/ots && /tmp/ots/bin/pip install --require-hashes --no-deps -r .github/ots-requirements.txt
A=logs/anchors/2026-09-26-000001.txt
sha256sum "$A"                      # debe coincidir con «File sha256 hash» de la línea siguiente
/tmp/ots/bin/ots info "$A.ots" | grep -E "File sha256 hash|BitcoinBlockHeaderAttestation|merkle root"
H=968752                            # el número de bloque que sale arriba
curl -s https://blockstream.info/api/block/$(curl -s https://blockstream.info/api/block-height/$H) | grep -o '"merkle_root":"[^"]*"'
```

Si el merkle root del sello y el del bloque coinciden, el ancla existía como tarde a la hora de ese bloque. Sin terminal: sube el `.txt` y su `.ots` a https://opentimestamps.org/.

- Bitcoin y OpenTimestamps solo se usan como registro público de tiempo. No tienen relación con ORVUPI ni con el token y no le dan respaldo, seguridad ni valor.
- Comparar con un explorador público es más débil que `ots verify` con un nodo propio: confía en ese explorador.
- Esta comprobación del 03-10 fue un requisito previo para marcar la casilla «Logs» el 05-10-2026. Esa marca valía para la cadena anterior (ver «Casilla del PPM» abajo).

## Qué commit hace el workflow

El workflow tiene dos jobs:

- `build` (solo lectura) escribe la entrada, hace el simulacro, instala el cliente de OpenTimestamps fijado por versión y hash, sella el ancla y comprueba el resultado.
- `commit` (con permiso `contents: write`, solo en `main`) no instala nada de Python. Instala las dependencias de desarrollo de npm fijadas por `package-lock.json`, sin scripts (`npm ci --ignore-scripts`). Comprueba que el cambio solo añade líneas y anclas dentro de `logs/`, y hace el commit como `github-actions[bot]`.

## Casilla del PPM

**Desmarcada desde el 16-10-2026.** Se marcó el 05-10-2026 para la cadena anterior (entradas en `main` en al menos 7 días UTC, el ancla `2026-09-26-000001` confirmada en el bloque 968752 de Bitcoin y comprobada a mano, y OK legal). Al reiniciarse la cadena, esos sellos ya no valen para la cadena viva, así que, por la regla de abajo, la casilla se desmarca. La cadena anterior y sus sellos siguen comprobables en el tag `pre-orvupi-2026-10-16`.

Para volver a marcarla hacen falta, sobre la cadena nueva:

1. Entradas escritas por el workflow `daily-log` en `main` en al menos 7 días distintos (UTC) (`npm run logs:status` → `daysCriterionMet: true`).
2. Al menos un sello de OpenTimestamps confirmado en Bitcoin y comprobado a mano (pasos en «Comprobación manual de los sellos»).
3. Revisión, incluido el OK legal.

`npm run logs:status` sigue siendo de solo lectura: cuenta los días UTC y **no** marca la casilla (siempre responde `box: "pending"`). La marca vive en `src/ppm.ts` / `ppm:print`.

Una casilla marcada solo quiere decir que existe un log público diario y verificable del estado del kill-switch y del simulacro. No quiere decir que registre todo lo que hace el agente ni que lo anotado sea cierto. Si la cadena deja de cuadrar o un sello confirmado deja de comprobarse, la casilla se desmarca y se explica. Bitcoin y OpenTimestamps solo se usan como registro público de tiempo; no tienen relación con ORVUPI ni le dan respaldo, seguridad ni valor.

## Log en memoria (`log:append`)

La acción `log:append` del agente sigue siendo otra cosa: deja una nota en memoria, no la publica y se pierde al salir (`published: false`, `persisted: false`). `verifyChain()` de `src/log.ts` sigue respondiendo `ok: false` para ese log en memoria. El log público lo verifica `npm run logs:verify`.

## English

`logs/agent-log.jsonl` is a public, append-only, hash-chained log written by the `daily-log` workflow (scheduled daily at 06:23 UTC, also runnable by hand; GitHub may delay or skip scheduled runs). The agent in this repository is a prototype and takes no actions with effects outside this repository (it posts nothing to social media, signs nothing and moves no funds), so each entry only records data produced by the repository in that run: the kill-switch state, the result of the kill-switch drill, the commit and the Actions run link. Anchors in `logs/anchors/` are submitted to OpenTimestamps (free, no wallet, relies on public calendar servers). A proof stays pending for hours until it is confirmed in a Bitcoin block; once confirmed, it only shows that the anchor existed no later than that block's time, not that the log is true or complete. Bitcoin and OpenTimestamps are used only as a public time record; they have no link to ORVUPI or the token and give it no backing, security or value. The daily entry is still written when the kill-switch is engaged or unreadable (see KILL-SWITCH.md); it only records that state and has no on-chain effect. `npm run logs:verify` recomputes the chain and checks the anchors (it only checks that each `.ots` file exists, not that it is confirmed). CI rejects any change that edits or removes existing lines; commits made by the `daily-log` workflow itself do not trigger CI, but that workflow runs the same checks before each commit. The chain shows that published entries were not changed later; it does not show that everything was logged. The PPM box was marked on 2026-10-05 for the previous chain (entries on at least 7 distinct UTC days, an OpenTimestamps proof confirmed by hand in Bitcoin block 968752, and legal sign-off); since the chain restarted on 2026-10-16 and those proofs no longer apply to the live chain, the box is unmarked from that date until the new chain meets the same criteria. A marked box only means a public daily verifiable log of the kill-switch state and drill exists; it does not mean everything the agent does is logged or that the notes are true. If the chain or a confirmed stamp stops checking out, the box is unmarked. `npm run logs:status` is read-only: it counts distinct UTC days with entries linked to an Actions run of this repository and says whether they reach 7; it never marks the box (it always answers `box: "pending"`). Posts on @ORVUPI do not come from this repository: a separate AI agent prepares and publishes them from texts approved before publication. This log does not record them and this repository's kill-switch does not stop them. On 2026-10-16 the chain restarted under the ORVUPI name: the previous chain (22 entries) is kept unchanged in tag `pre-orvupi-2026-10-16`, the new genesis entry says the chain restarts on 2026-10-16 and records the previous last hash, and entries 2 to 23 copy the earlier dates, checks and links with a neutral note that names no account. The old `.ots` proofs were removed from `main` because they do not apply to the new anchors; they remain in the tag.
