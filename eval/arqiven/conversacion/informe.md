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

`qwen05-cpu-q4` sigue fuera del selector. q8 de Qwen2.5 dio texto sin sentido en Node durante la auditoría y no se ha comprobado en el navegador. La generación de imágenes sigue apagada.

`?perfil=legacy` o `ACTIVE_PROFILE = "legacy"` en `web/v2/shared/ia/profile.mjs` vuelve a los límites anteriores. IndexedDB solo añade `modelContent` opcional: los chats viejos se leen igual.

Para repetir:

```bash
node eval/arqiven/conversacion/run.mjs onnx-community/Qwen3.5-0.8B-Text-ONNX q4 v1 4
node eval/arqiven/conversacion/run.mjs onnx-community/Qwen2.5-1.5B-Instruct q4 v1 4
node eval/arqiven/conversacion/rescore.mjs
```
