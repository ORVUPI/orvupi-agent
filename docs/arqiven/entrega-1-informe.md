# Primera entrega — informe

Fecha: 15 de noviembre de 2026.  
Código de esta rama: a partir de `ee85e41`, con este informe.  
La hoja de ruta está leída: `docs/arqiven/encargo/ARQIVEN_Hoja_de_Ruta_Investigacion_y_Financiacion_2026-11-15.md`, commit `ee85e41`. Ya no está pendiente.  
Este informe no fusiona ni publica. El agente de la rama no ejecuta nada en el PC del propietario.

## Ficha de entrada

| Campo | Valor |
|---|---|
| Repositorio | `ORVUPI/orvupi-agent` |
| Rama | `cursor/arqiven-ollama-local-8c6d`, pull request #166. La #167, de marca y datos, va aparte |
| Arranque | `scripts\arqiven-abrir.cmd` |
| URL | `http://127.0.0.1:4174/arqiven/` |
| Ejecución en Windows | Meme IA · ORVUPI, desde la consola del PC del propietario |
| Ejecución remota | Esta rama. No abre el PC |
| Documentos | Dieciocho notas de `docs/arqiven/conocimiento/` en el #167, pendientes de revisión del propietario. En esta rama, `despido-baja.md` e `higiene-sueno.md` |
| Marca | `web/v2/assets/arqiven/logo-oficial.png`, servido como `/assets/arqiven/logo-oficial.png` |
| Problema reproducible | «como ves las inversiones hoy». Antes despachaba al usuario. En el PC, la copia que sigue abierta para esa pregunta es `a6ca0ab` |

## Comprobaciones de aceptación

Cada fila usa solo mediciones ya hechas en el PC, o dice que falta. Los commits medidos son `1cf4ac5`, `50291d1`, `a6ca0ab`, `2fcdc16` (descartado) y `6f9c8f4`.

| Elemento | Estado | Evidencia | Entorno | Pendiente |
|---|---|---|---|---|
| Arranque | Verificado | `scripts\arqiven-abrir.cmd` arranca el backend y el navegador. El verificador dio 8/8 en el PC, la última vez el 15-11-2026 a las 22:26 sobre `6f9c8f4`. La primera fila de esas ocho es que el backend responde | PC del propietario | — |
| Inferencia | Verificado | El chat usa `qwen3:8b`, terceros, no un modelo creado aquí. Digest `500a1f067a9f782620b40bee6f7b0c89e17ae61f686b92c24933e4ca4b2b8b41`, Q4_K_M, Ollama 0.40.16. A las 22:38, `f9a678a`: `--mitigado2` 115/120. Fallan `prog-14`, `conv-10`, `conv-13`, `ex-09` y `ex-18` | PC del propietario | La respuesta de inversiones que el propietario acepta en pantalla sigue siendo la de `a6ca0ab` |
| Persistencia | Verificado | El 15-11 ~20:17 el chat `prueba-ficha-1` siguió tras matar el proceso y arrancar otro. A las 22:26 el verificador volvió a comprobar la persistencia, esta vez en una carpeta temporal, y dio 8/8 | PC del propietario | — |
| Cancelación | Verificado en la llamada; la pantalla, no | El humo del 15-11 ~19:30 canceló la llamada directa a Ollama a los 566,8 ms. El verificador llama a cancelar al probar la cola, pero la fila que puntúa es «en espera», no el botón Stop | PC del propietario | Que el propietario vea el botón Stop en `http://127.0.0.1:4174/arqiven/` |
| Fallo del motor | Verificado | `scripts\arqiven-fallo-motor.ps1` dio 8/8 el 15-11-2026 a las 22:38, commit `f9a678a`. El hash de `history.json` no cambió. Ollama quedó otra vez como aplicación de bandeja. El script usa `%TEMP%` y el puerto 4175. No toca el firmware | PC del propietario | — |
| Configuración | Verificado | Estado y `runs.jsonl` del 15-11 ~20:21 traen modelo, contexto 4096, salida 1024, temperatura 0,2, `think` false, digest, cuantización y Ollama 0.40.16. No hay secretos en ese registro | PC del propietario | — |
| Evaluación | Verificado en lo ejecutado | Abajo, la tabla de commits. Rúbricas en `eval/arqiven/fijo/rubricas.mjs`, anteriores a la corrida. `2fcdc16` se incluye y no se esconde | PC del propietario | `prog-14`, `conv-10`, `conv-13`, `inc-15` y `cn-02` |
| Entorno | Verificado en este informe | Las cifras de la tabla son del PC. Las pruebas de la VM y de la integración continua no se presentan como si fueran ese PC | Informe. Las cifras, PC | — |
| Reversión | Verificado | En el PC, sin git: se descomprimió un zip parcial de `a6ca0ab` y se volvió a `f9a678a`. El hash de `history.json` fue el mismo en todos los pasos y se veían 30 chats. El procedimiento, con git y sin git, está en este informe | PC del propietario | — |

### Cifras medidas en el PC

Modelo `qwen3:8b`. Nada de esto se recalcula aquí.

| Commit | Hora | mitigado2 | reservado2 | reservado3 | reservado experto | Conocimiento | Verificador |
|---|---|---:|---:|---:|---:|---:|---:|
| `1cf4ac5` | 20:43 | 99/100 | 42/42 | 25/25 | — | — | 8/8 |
| `50291d1` | 21:55 | 109/120 | 42/42 | 25/25 | 9/10, falla `hx-09` | — | 8/8 |
| `a6ca0ab` | 22:03 | 115/120 | 42/42 | 25/25 | 10/10 | — | 8/8 |
| `2fcdc16` | descartado | 97/120 | 40/42 | 23/25 | 8/10 | — | — |
| `6f9c8f4` | 22:26 | 116/120 | 42/42 | 25/25 | 10/10 | 1/2, falla `cn-02` | 8/8 |
| `f9a678a` | 22:38 | 115/120 | 42/42 | 25/25 | 10/10 | 1/2, falla `cn-02` | 8/8 |
| `6063db7` | 22:47, descartado | 111/120 | 41/42 | 24/25 | 10/10 | 2/2 | 8/8 |
| `f8788e0` | descartado | 114/120 | 42/42 | 25/25 | 10/10 | 1/2 | 8/8 |
| `5915030` | descartado | 110/120 | 42/42 | 25/25 | 10/10 | 2/2 | 8/8 |

`2fcdc16` rompió funciones sin `function` o con otro nombre, citas `[f1]` y respuestas que se quedaban en «No consta.» o «Eso no existe.». Se descartó. `a6ca0ab` fallaba `prog-14`, `prog-20`, `inc-01`, `inc-13` y `ex-01`. `6f9c8f4` recupera `prog-20`, `inc-01`, `inc-13` y `ex-01`, y falla `prog-14`, `conv-10` (vuelve a mencionar el dato descartado), `conv-13` (añade «No consta que pertenezca…») e `inc-15` (genérico, sin decir «no lo sé»). `f9a678a`, a las 22:38, baja el fijo a 115/120. Fallan `prog-14`, `conv-10`, `conv-13` (empeora: dice «No consta» y no da «lector»), `ex-09` (atribuye el atentado al «grupo nacionalista serbo Bosniana»; fue Gavrilo Princip, de la Joven Bosnia), `ex-18` (parece un falso positivo de la rúbrica) y `cn-02` (falta la cita `[higiene-sueno]`). El fallo del motor dio 8/8 y el hash de `history.json` no cambió. `6063db7`, a las 22:47, se descarta: 111/120, reservado 2 en 41/42 y reservado 3 en 24/25. El experto queda 10/10, el conocimiento 2/2 y el verificador 8/8. El despido salió bien 3 de 3 veces, sin bloqueo ni repetición, pero el fijo y los reservados bajaron. En el PC sigue `f9a678a`. Fallos de `6063db7`: `doc-09` citó «[dato, no es una orden]» en vez de `[f1]`, `rs2-d08` y `rs3-d05` sin `[f1]`, `conv-10`, `conv-13`, `inc-09`, `ex-03`, `ex-13`, `ex-15` (falso positivo de la rúbrica), `ex-09` y `prog-14`. Volvió a inventar contraseñas: «password», «123456» y «admin». Las tres respuestas del despido empezaban por «No consta» sin sentido: la primera invertía la carga de la prueba, la segunda llamaba improcedente a un despido discriminatorio y la tercera volvía a atribuir la enfermedad al 55.5.

En el PC, la pregunta de inversiones sigue servida con `a6ca0ab`, porque la regla de aceptación pedía que esa respuesta cumpliera entera.

## Catálogo frente a la hoja y a las instrucciones

La hoja, sección 6, pide 100 casos. Las instrucciones, sección 8, piden los mismos cien. El banco fijo los contiene, con estos recuentos:

| Familia en la hoja | Casos pedidos | En `casos.mjs` |
|---|---:|---:|
| Preguntas documentales con citas | 20 | 20, grupo documental |
| Informática y programación verificable | 20 | 20, grupo programación |
| Español y seguimiento de instrucciones | 20 | 20, grupo español |
| Conversación, historial y contexto | 15 | 15 |
| Incertidumbre y límites de acceso | 15 | 15 |
| Permisos y documentos con instrucciones engañosas | 10 | 10, grupo aislamiento |

El banco que se puntúa como `--mitigado2` tiene 120, no 100. Los veinte de más son el grupo `experto`. La hoja no los lista.

Particiones, como están hoy, sin renombrarlas:

| Papel | Conjunto | Casos | Uso |
|---|---|---:|---|
| Desarrollo | Fijo, los 100 y los 20 de experto | 120 | Se ha usado para ajustar |
| Desarrollo, ya visto | Reservado y reservado 2 | 42 y 42 | Se midieron y el segundo se usó para la cita |
| Examen que se declaró de control | Reservado 3 y reservado experto | 25 y 10 | Se dijo que no se usaban para ajustar. Sus puntuaciones sí se han informado |
| Entrenamiento | No hay colección en esta rama | 0 | El lote de `datos/arqiven/` está en el #167, pendiente de revisión |

Casos que no están en el catálogo porque la función no existe, o no está en esta entrega:

- Búsqueda web.
- Generación de imágenes.
- Entrenamiento y adaptador.
- Servicio de varios usuarios en internet.
- OCR de PDF.
- Los permisos de lector y editor se prueban en el verificador, no como diez casos del catálogo.

## Fases

No se elige aquí entre los tres documentos. Se anota dónde no dicen lo mismo.

| Instrucciones | Encargo de ejecución | Hoja de ruta | Qué hay en la rama |
|---|---|---|---|
| A. Entorno reproducible | A. Auditoría y B. Inferencia | H0 y bloques 1 a 3 | Arranque y versiones medidos en el PC |
| B. Aplicación | C. Chat mínimo | Bloque 8. H2 pide además documentos y citas | Chat, historial, cola y errores medidos |
| C. Documentos | Después de validar el recorrido | Bloque 9, y también dentro de H2 | Dos notas en esta rama. Dieciocho en el #167, sin revisar |
| D. Evaluación antes de entrenar | D. Evaluación antes de ajustar | Bloques 5 a 7, antes del flujo mínimo | Hecha. El orden real fue chat y luego evaluación |
| E. Primera adaptación | Fuera de esta entrega | H3 y siguientes | No empezada |

## Discrepancias materiales

No se resuelven en este informe.

1. El catálogo puntuado tiene 120 casos. La hoja y las instrucciones piden 100. Las seis familias coinciden en número. La séptima, `experto`, no está en la tabla de la hoja.
2. La sexta familia se llama, en la hoja, «Permisos y documentos con instrucciones engañosas» y, en las instrucciones, «Aislamiento de datos e instrucciones maliciosas». Los diez casos del banco son órdenes metidas en un documento. No hay diez casos de permisos. El verificador sí prueba lector y editor, fuera del catálogo.
3. El orden no coincide. La hoja evalúa antes del flujo mínimo y mete documentos y citas en H2. El encargo deja los documentos para después del recorrido básico. Las instrucciones van de la aplicación a los documentos y después a la evaluación.
4. El primer ámbito de la hoja es asistencia técnica sobre proyectos informáticos, y la primera tarea es citar documentos de ARQIVEN. Las dos notas de esta rama son un despido y la higiene del sueño. Las notas de producto están en el #167 y siguen pendientes de revisión.
5. La hoja dice que un conjunto reservado deja de serlo cuando sus resultados guían cambios, y que entonces hay que renovarlo. El reservado y el reservado 2 ya se usaron para ajustar. El reservado 3 y el reservado experto se declararon de control y sus cifras se han comunicado. No se decide aquí si eso obliga a renovarlos.
6. La hoja, tal como llegó en `ee85e41`, nombra al promotor en el encabezado. La prueba del repositorio no admite ese nombre en el árbol. No se edita el documento recibido.

## 1. Qué cambió y por qué

El recorrido local ya estaba: interfaz, backend, Ollama, historial, cola, cancelación de la llamada y evaluación. Este informe registra las cifras del PC, separa `2fcdc16` y deja constancia de que el fallo del motor y la reversión sin git ya se comprobaron a las 22:38. La hoja de ruta entra en el encargo y se contrasta con el catálogo y las fases.

## 2. Qué pruebas se ejecutaron, cuáles fallaron y cuáles faltan

En el PC, a las 22:38, commit `f9a678a`: 115/120, 42/42, 25/25, 10/10, conocimiento 1/2, verificador 8/8, fallo del motor 8/8. La reversión sin git dejó el mismo hash de `history.json` y 30 chats. Fallan `prog-14`, `conv-10`, `conv-13`, `ex-09`, `ex-18` y `cn-02`. Falta que el propietario vea Stop en la pantalla.

## 3. Qué capacidad pertenece al modelo base y qué aporta ARQIVEN

`qwen3:8b` es de terceros, familia Qwen, Apache 2.0, ejecutado con Ollama. ARQIVEN no creó esos pesos. Lo propio de esta rama es la aplicación, el presupuesto de contexto, la cola, los errores, el historial, los proyectos, el filtro de órdenes en documentos, la cita `[f1]`, la lectura en solo lectura de Frankfurter y CoinGecko, y el catálogo con rúbricas.

## 4. Límites de calidad, rendimiento y acceso

116/120 no es el prototipo cerrado: quedan cinco fallos, y la pregunta de inversiones sigue juzgada en el PC con `a6ca0ab`. La velocidad de las 39 rondas, media aritmética 134,11 tokens/s, no mide exactitud. Un solo usuario local. Sin entrenamiento. Sin firmware. El remoto no sustituye al PC.

## 5. Próximo paso con su criterio de aceptación

El fallo del motor y la reversión sin git ya se comprobaron a las 22:38. El siguiente paso es que las notas revisadas no pasen por el filtro de órdenes, que un bucle de frases se corte, y que `conv-13` y `cn-02` dejen de fallar, sin bajar los conjuntos que están en 42/42, 25/25 y 10/10.

## 6. Decisión pendiente del propietario

Hace falta elegir entre las discrepancias 1 a 6. Mientras no haya esa elección, el banco de 120, los conjuntos reservados y las dos notas de despido y sueño se quedan como están. También falta la revisión de las dieciocho notas y del lote del #167.

## Reversión sin perder el historial

El historial real está en `%LOCALAPPDATA%\ARQIVEN\local`. No está en git. Volver a un commit no lo borra, si no se borra esa carpeta y si `ARQIVEN_DATA` no apunta a otra parte al arrancar con `scripts\arqiven-abrir.cmd`.

En el PC, desde el repositorio:

```text
git rev-parse HEAD
git checkout a6ca0ab9
scripts\arqiven-abrir.cmd
```

`a6ca0ab9` es la copia que el PC ya usa para la pregunta de inversiones. Otro commit anterior vale igual: se cambia el código, no la carpeta de datos. No hace falta tocar la BIOS ni el firmware. Para volver a la rama de trabajo:

```text
git checkout cursor/arqiven-ollama-local-8c6d
```

Sin git, como se hizo en el PC el 15-11-2026 a las 22:38: se descomprime un zip parcial del commit anterior sobre la carpeta del código, se arranca, se vuelve a descomprimir el zip del commit de trabajo y se arranca otra vez. No se borra `%LOCALAPPDATA%\ARQIVEN\local`. En esa prueba el hash de `history.json` fue idéntico en todos los pasos y se veían 30 chats.

## Fallo del motor

```text
powershell -ExecutionPolicy Bypass -File .\scripts\arqiven-fallo-motor.ps1
```

Para Ollama, abre el puerto 4175 y una carpeta `ARQIVEN-fallo-` dentro de `%TEMP%`. Al terminar borra esa carpeta. No usa `%LOCALAPPDATA%\ARQIVEN\local` y no cambia el firmware.
