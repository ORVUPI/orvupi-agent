# Conversación fiable v1

Medición en esta máquina, CPU, 4 hilos, cuantización q4, Transformers.js 4.3.1 (la misma versión del navegador). Coste: 0 €. No se ha publicado nada.

`legacy` es el perfil anterior: 4 turnos, 3200 caracteres, 1500 por mensaje, 120 tokens, penalización 1.22 y n-grama 5. `v1` es el perfil que queda activo.

## Total

| Modelo | Perfil | Aciertos | Español | Mediana | Truncadas | Extractos | Vacías |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Qwen3.5-0.8B q4 | legacy | 9/21 | 8/19 | 7708 ms | 13 | 1 | 0 |
| Qwen3.5-0.8B q4 | v1 | 16/21 | 14/19 | 4487 ms | 0 | 1 | 0 |
| Qwen2.5-1.5B q4 | legacy | 7/21 | 7/19 | 10752 ms | 12 | 1 | 0 |
| Qwen2.5-1.5B q4 | v1 | 17/21 | 16/19 | 7277 ms | 0 | 1 | 1 |

Qwen3.5-0.8B `v1` llega a 16/21. Ninguna categoría baja respecto de `legacy` en el mismo modelo. En la corrida emparejada la mediana baja de 7708 ms a 4487 ms. La última repetición del mismo `v1` midió 1808 ms de carga y 8993 ms de mediana, otra vez 16/21 y 0 truncadas.

Qwen2.5-1.5B `v1` llega a 17/21. La mediana baja de 10752 ms a 7277 ms. Aclaración baja de 1/1 a 0/1: la pregunta ambigua salió vacía. El resto de categorías sube o se mantiene. El suelo pedido para este modelo era 15/21.

«intencion-correo» y «detalle-entrevista» salen sin truncar en los dos modelos con `v1` (0 de 4). En `legacy` las dos se truncan en 1.5B, y «detalle-entrevista» también en 0.8B.

## Qwen3.5-0.8B q4 por categoría

| Categoría | legacy | v1 |
| --- | ---: | ---: |
| contexto | 3/5 | 4/5 |
| correccion | 1/3 | 2/3 |
| instrucciones | 1/2 | 2/2 |
| incertidumbre | 2/2 | 2/2 |
| aclaracion | 1/1 | 1/1 |
| razonamiento | 0/2 | 1/2 |
| comprension | 0/2 | 1/2 |
| documento | 0/2 | 2/2 |
| fuentes | 1/2 | 1/2 |

## Qwen2.5-1.5B q4 por categoría

| Categoría | legacy | v1 |
| --- | ---: | ---: |
| contexto | 2/5 | 4/5 |
| correccion | 0/3 | 1/3 |
| instrucciones | 1/2 | 2/2 |
| incertidumbre | 2/2 | 2/2 |
| aclaracion | 1/1 | 0/1 |
| razonamiento | 0/2 | 2/2 |
| comprension | 0/2 | 2/2 |
| documento | 0/2 | 2/2 |
| fuentes | 1/2 | 2/2 |

## Filtro y cálculos

El filtro ya no corta «Un lápiz cuesta 3 €. Compro 4…». Las 16 frases benignas de la auditoría pasan. Siguen bloqueadas «¿Compro ORVUPI ahora?», «Should I buy ORVUPI?», «今 ORVUPI を買うべきですか» y «지금 ORVUPI를 사야 할까요?». La línea base de reglas queda en 0 fallos críticos (382 aciertos automáticos de 860).

En esta corrida, «calculo-1» llega al modelo en los dos perfiles. Con `v1`, 1.5B responde 8 €. 0.8B no usa la negativa del filtro, pero falla la cuenta y dice 23 €.

## Ejemplos de v1

1. **calculo-1, Qwen2.5-1.5B.** «Costo total = 4 × 3 € = 12 €. Devolución = 20 € − 12 € = 8 €.»
2. **ctx-lejos, Qwen3.5-0.8B.** «Velatia se dedica a vender software de logística.» El dato sigue después de varios turnos.
3. **doc-lejos, Qwen2.5-1.5B.** «El código interno del proyecto según el documento adjunto es KX-4471.» El dato estaba hacia el final de un texto de unos 3200 caracteres.
4. **intencion-correo, Qwen2.5-1.5B.** Correo completo, sin cortar, pidiendo el viernes por una cita médica. En 0.8B la respuesta tampoco se corta, pero pide más datos y no menciona la cita, así que no cuenta como acierto.
5. **detalle-entrevista, Qwen3.5-0.8B.** Lista de pasos (perfil del puesto, competencias, preguntas, ejemplos) por encima de 300 caracteres y sin llegar al tope de tokens.

## Modelo por defecto

En CPU, también sin WebGPU, el modelo por defecto es Qwen3.5-0.8B q4 (`qwen35-cpu`) con el perfil `v1`. SmolLM2-135M sigue en el selector. Si el navegador declara menos de 4 GB, o si Qwen no llega a cargarse, se usa SmolLM2 y el aviso queda en la barra de estado: no se guarda como mensaje del chat. La elección manual se guarda en IndexedDB `orvupi-arqiven-settings`. El porcentaje de la descarga se muestra en Ajustes y en esa misma barra. Con WebGPU se mantiene el modelo de GPU que ya elegía el dispositivo.

El q4 sigue siendo la variante: 526 MB. `model_q4f16` y `model_quantized` también usan `GatherBlockQuantized` en `embed_tokens`. fp16 pesa 1,5 GB y fp32 pasa de 2 GB. El runtime del navegador era `onnxruntime-web@1.31.0-dev` en su build WebGPU, que no implementa ese operador en WASM. ARQIVEN carga ahora el build WASM de `onnxruntime-web@1.31.1`, que sí crea la sesión. Work no cambia de runtime. En Chromium, sin WebGPU, la respuesta a «¿Cuánto es 12 por 7?» incluye 84.

Repetición del arnés en esta máquina, CPU, 4 hilos, el mismo q4 y el perfil `v1`:

| | |
| --- | ---: |
| Carga del pipeline | 1808 ms |
| Mediana de respuesta | 8993 ms |
| Tareas | 16/21 |
| Truncadas | 0 |

Las categorías siguen igual que la tabla de Qwen3.5 de arriba. La mediana en Node varía entre corridas (4487 ms, 6206 ms y 8993 ms) sin cambiar los aciertos.

## Navegador, después de cargar

Sin aislamiento WASM se queda en 1 hilo. `/*` ya envía COOP, y repetirlo en `/arqiven/` y `/arqiven/*` hacía que Cloudflare mandara el valor dos o tres veces; Chromium lo leía como inválido y no aislaba. Cada ruta de ARQIVEN suelta primero la cabecera heredada (`! Cross-Origin-Opener-Policy`, `! Cross-Origin-Embedder-Policy`) y pone una sola: COOP `same-origin` y COEP `credentialless`. El resto del sitio no lleva COEP. Con aislamiento, el worker usa hasta 4 hilos; si no hay aislamiento, se queda en 1. El pensamiento de Qwen3 sigue apagado (`enable_thinking: false`). Una cuenta se corta al aparecer el número, con tope de 12 tokens. El seguimiento no espera al modelo: la frase es el resultado verificado.

Medición en Chromium, sin WebGPU, con el modelo ya cargado, 4 hilos y `crossOriginIsolated` verdadero:

| Pantalla | Pregunta | Tiempo de generación | Tokens | Tokens/s |
| --- | --- | ---: | ---: | ---: |
| 1440×900 | ¿Cuánto es 12 por 7? | 12,0 s | 16 | 1,3 |
| 1440×900 | ¿Y si le sumo 16? | 1 ms | frase local | — |
| 390×844 | ¿Cuánto es 12 por 7? | 9,4 s | 16 | 1,7 |
| 390×844 | ¿Y si le sumo 16? | 1 ms | frase local | — |

Las dos respuestas dicen 84 y 100. El cálculo lo resuelve el navegador y, si el modelo añade otro número, se sustituye por el resultado verificado. Enviar un mensaje no abre el editor local.

## Preguntas sobre ORVUPI y prefill

Una pregunta como «¿Qué es ORVUPI Sonar?» tardaba unos 62 s (63 tokens) y la interfaz la sustituía por el extracto: el modelo no usaba las fuentes. El prefill metía el sistema largo y hasta cuatro extractos de 700 caracteres, y el segundo fragmento de Sonar («verify on chain») empujaba al modelo a inventar una verificación de contratos.

Ahora una pregunta de ORVUPI lleva un sistema corto y un solo fragmento, recortado a 160 caracteres. El sistema de las demás preguntas no cambia, así que la puntuación de 16/21 sigue medida con el mismo `SYSTEM_V1`. La respuesta se pinta token a token, se corta al tercer inicio de frase y no pasa de 40 tokens. Si cita un dato de la fuente, se conserva; si se inventa otra cosa, sigue el extracto citado.

Medición nueva, CPU, 4 hilos, q4, 5 preguntas generales y 5 de ORVUPI en es, en, pt-BR, ja y ko (50 en total). Carga del pipeline: 1357 ms.

| Grupo | n | Mediana hasta la primera palabra | Mediana de la respuesta | Mediana de tokens de entrada |
| --- | ---: | ---: | ---: | ---: |
| Generales | 25 | 409 ms | 3869 ms | 134 |
| ORVUPI | 25 | 290 ms | 1273 ms | 79 |

| Idioma | General, primera palabra | General, total | General, tokens | ORVUPI, primera palabra | ORVUPI, total | ORVUPI, tokens |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| es | 446 ms | 4328 ms | 135 | 286 ms | 1073 ms | 72 |
| en | 393 ms | 4184 ms | 134 | 288 ms | 1987 ms | 75 |
| pt-BR | 388 ms | 4119 ms | 135 | 281 ms | 1387 ms | 78 |
| ja | 336 ms | 1469 ms | 135 | 421 ms | 1323 ms | 84 |
| ko | 414 ms | 1643 ms | 134 | 399 ms | 1080 ms | 82 |

En esa corrida, «¿Qué es ORVUPI Sonar?» respondió «ORVUPI Sonar muestra datos de mercado con su ruta oficial en español.» en 1210 ms, con 84 tokens de entrada y la primera palabra a los 379 ms. En japonés el primer fragmento pasa a ser la ficha de Sonar, no la página general de ORVUPI. El filtro financiero no se ha tocado.

Estas medianas son de Node. En Chromium, con 4 hilos, la generación iba a unos 1,3 tokens/s: dos frases no llegan a 30 s, y un prefill de menos de 90 tokens deja la primera palabra por debajo de 5 s.

`qwen05-cpu-q4` sigue fuera del selector. q8 de Qwen2.5 dio texto sin sentido en Node durante la auditoría y no se ha comprobado en el navegador. La generación de imágenes sigue apagada.

`?perfil=legacy` o `ACTIVE_PROFILE = "legacy"` en `web/v2/shared/ia/profile.mjs` vuelve a los límites anteriores. IndexedDB solo añade `modelContent` opcional: los chats viejos se leen igual.

Para repetir:

```bash
node eval/arqiven/conversacion/latencia.mjs onnx-community/Qwen3.5-0.8B-Text-ONNX q4
node eval/arqiven/conversacion/run.mjs onnx-community/Qwen3.5-0.8B-Text-ONNX q4 v1 4
node eval/arqiven/conversacion/run.mjs onnx-community/Qwen2.5-1.5B-Instruct q4 v1 4
node eval/arqiven/conversacion/rescore.mjs
```
