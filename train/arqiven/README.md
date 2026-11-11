# Datos del LoRA, sin entrenar

`build-dataset.mjs` prepara la mezcla. No alquila GPU, no llama a una API de pago y no lanza Unsloth.

```bash
node eval/arqiven/bank/generate.mjs
node train/arqiven/build-dataset.mjs
```

Eso escribe `train/arqiven/out/` con las fichas de ORVUPI, los rechazos, las aclaraciones y los «no lo sé». `out/` no se versiona. El objetivo es 50 000 ejemplos, semilla 42. Si un bloque no llega a su cuota, el manifiesto lo deja en `short` y no lo rellena con otro bloque.

## Proporciones

| Bloque | Peso | Origen, licencia comercial |
| --- | --- | --- |
| Varios turnos | 22 % | SmolTalk2 `multi_turn_reasoning_if_think` y `smoltalk_systemchats_Qwen3_32B_think`. Apache-2.0. |
| Razonamiento | 18 % | SmolTalk2 everyday reasoning, NuminaMath-TIR y Tulu 3 Personas Math. Apache-2.0 y ODC-BY. La respuesta cierra el cálculo. |
| Idiomas | 15 % | Aya en es, en, pt, ja y ko, más SmolTalk2 multilingual8. Apache-2.0. |
| Código | 10 % | Tulu 3 Personas Code (ODC-BY) y trazas smolagents (Apache-2.0). |
| General | 15 % | SmolTalk2 table-gpt y aya_dataset think. Apache-2.0. |
| Aclarar o abstenerse | 5 % | Ejemplos MIT del repositorio: pregunta ambigua y «no lo sé». |
| ORVUPI | 10 % | Páginas del propio repositorio. MIT. |
| Seguridad | 5 % | Rechazo de consejo financiero e identidad de terceros. MIT. |

No se incluye la mezcla entera de Tulu 3, ni los subconjuntos heredados de SmolTalk2, ni WildGuardMix, ni CoCoNot. El detalle está en `sources.mjs`.

Para una muestra remota, todavía sin clave:

```bash
node train/arqiven/build-dataset.mjs --fetch --limit 20
```

## Kaggle, cuando haya clave

El cuaderno `lora-qwen35.ipynb` sale de `kaggle_train.py`. En un kernel de Kaggle, con GPU T4 e internet, descarga la mezcla pública hasta las cuotas, entrena el LoRA y escribe el adaptador en `/kaggle/working/arqiven-lora` y las métricas en `/kaggle/working/metrics.json`. Fuera de Kaggle la primera celda sale sin entrenar.

La base es `Qwen/Qwen3.5-0.8B` (Apache-2.0). Si no carga, el cuaderno prueba `Qwen/Qwen3-0.6B` y `Qwen/Qwen3-1.7B`.

El lanzador local no imprime la clave y no la pone en los argumentos:

```bash
node train/arqiven/kaggle-push.mjs
```

Necesita `KAGGLE_USERNAME` y `KAGGLE_KEY` en el entorno, y el cliente `kaggle` (`pip install kaggle`). Sin esas variables sale con código 2 y no llama a la red. `--dry-run` enseña el plan. `--write-notebook` solo regenera el cuaderno.
