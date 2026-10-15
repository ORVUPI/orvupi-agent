# Modelo de amenazas de ORVUPI (público)

Protegemos la confianza en lo que este repositorio dice, la identidad oficial actual (ORVUPI, @ORVUPI en X, @orvupi en Telegram y el correo orvupi.hq@gmail.com) y el límite de no afirmar lo que los tests de esta versión no demuestran.

No se ha publicado en este repositorio una dirección verificada de token ORVUPI. La dirección histórica no identifica ORVUPI; véase [docs/ORVUPI.md](docs/ORVUPI.md).

Fuera de alcance: los tokens, las plataformas de emisión o intercambio y el comportamiento de terceros.

| Id | Amenaza | Control en este repositorio |
| --- | --- | --- |
| T1 | Filtrar un secreto | Historia nueva, `.gitignore`, sin secretos de CI, gitleaks sobre el historial de la rama (`base..HEAD`) en cada ejecución. Las huellas de `.gitleaksignore` valen para esos SHA: esta PR se fusiona con merge commit, sin squash. El agente no usa claves. |
| T2 | Afirmar de más | `ppm:print` no marca casillas. Wallet y logs quedan `pending`. Los textos dicen «en este repositorio, esta versión». |
| T3 | Suplantar el repo | El único repo oficial es `github.com/stubxai/stubx-agent`, que tiene que estar enlazado desde la web (https://stubxai.com/) y desde [@ORVUPI](https://x.com/ORVUPI); si no lo está, no lo des por oficial. `github.com/stubx` es una cuenta ajena. |
| T4 | Cadena de suministro | Cero dependencias de ejecución. `npm ci` con lockfile. Actions fijadas por SHA. Dependabot. CodeQL y Scorecard en workflows aparte. |
| T5 | CI manipulada | En `ci.yml`, `permissions: contents: read`, salvo el job de atestación. `daily-log.yml` es el único workflow con `contents: write` (ver T11). CodeQL y Scorecard piden además `security-events: write` (Scorecard, también `id-token: write`) para subir sus resultados. Sin `pull_request_target`. Sin secretos propios. |
| T6 | Logs alterados | Cadena de hashes en `logs/agent-log.jsonl`, `npm run logs:verify` en CI y en el workflow, y comprobación en CI de que un cambio solo añade líneas. Las anclas de `logs/anchors/` fijan la cabeza de la cadena y llevan sello de OpenTimestamps: reescribir toda la cadena con hashes nuevos deja de cuadrar con las anclas cuyo sello ya está confirmado (unas anclas nuevas llevarían sellos con fecha posterior), y el historial de Git también lo mostraría. El sello no demuestra que lo anotado sea verdad ni que esté completo. |
| T7 | Log incompleto | Limitación declarada en LOGS.md: la cadena demuestra que lo publicado no se ha cambiado, no que se haya anotado todo. Hoy cada entrada solo anota el estado del kill-switch y el simulacro; el agente no hace acciones con efecto fuera de este repositorio. |
| T8 | Malinterpretar el kill-switch | Texto fijo: no pausa transferencias ni congela cuentas. El módulo no tiene capacidad on-chain. |
| T9 | El agente gana capacidad de firma | Lista cerrada, rechazo aunque el nombre peligroso se añada a la lista, y test que falla si `src/` referencia APIs de firma o envío. |
| T10 | Toma de la cuenta de GitHub | 2FA de la cuenta oficial `stubxai`: activada, según confirmó el propietario el 26-09-2026 (no verificable desde fuera). No se resuelve con código de este repo. |
| T11 | Abuso del permiso de escritura del log | `daily-log.yml` necesita `contents: write` para hacer el commit del log; sin ese permiso no puede guardar la entrada en el repositorio. Se limita así: permiso de solo lectura por defecto y `contents: write` solo en el job `commit`; ese job solo corre en `main`, por programación o a mano (nunca en pull requests); no instala nada de Python; instala las dependencias de desarrollo de npm fijadas por `package-lock.json`, sin scripts; el checkout no guarda credenciales y el token solo se usa en el paso del push; antes del commit comprueba que el cambio solo añade líneas y anclas dentro de `logs/` y falla si toca cualquier otro archivo. El job `build`, que instala el cliente de OpenTimestamps (fijado por versión y sha256), solo tiene permiso de lectura. |
| T12 | Toma de la cuenta de X | 2FA con app de autenticación de la cuenta actual [@ORVUPI](https://x.com/ORVUPI), entonces llamada @stubxai: activada según la confirmación histórica del propietario del 28-09-2026; no es una comprobación nueva (no verificable desde fuera). No se resuelve con código de este repo. La 2FA no protege una sesión ya abierta. |

Los rulesets de `main` (PR, checks, sin force-push) son un ajuste de GitHub. Este árbol no puede activarlos.

La CLI de Verify (`npm run verify`) descarga metadatos de pasarelas IPFS o Arweave y sigue hasta 3 redirecciones https. Comprueba el DNS y conecta a esas IP ya validadas, IPv4 primero y el resto después (`lookup` fijo y aplazado a la siguiente vuelta, `family` explícito y `autoSelectFamily: false`). En cada intento se escucha `error` en el socket y en la petición. Un `ENETUNREACH` real queda en ese listener y se prueba la siguiente. Toda la descarga tiene tope con `AbortSignal.timeout`. No usa el paquete `undici`: Node 22.14 no lo exporta y este repo no añade dependencias de ejecución. Queda riesgo residual: una de esas IP públicas puede ser la del atacante; TLS sigue comprobando el nombre del certificado; cada salto se fija a sus IP comprobadas; un `fetch` sustituido en pruebas no usa ese fijado; la CLI se ejecuta a mano, no en la web ni en la CI. No la ejecutes en un servidor con servicios internos https sin autenticar.

## English

This repository is the public skeleton of an agent that cannot sign or hold keys. Do not treat a green local test as a marked PPM box. The public append-only log (`daily-log` workflow) is the only workflow with `contents: write`, limited to its commit job on `main`, which checks that only `logs/` is appended to. The weekly kill-switch drill is scheduled on the Actions tab (see its history); the PPM box was marked on 2026-10-05 after reviewing consecutive green public drills; a failing drill unmarks it.
