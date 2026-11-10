# Benchmarks públicos, en Kaggle o Colab gratis

No se ejecutan en la CI de este repositorio: MMLU-Pro y HumanEval no caben en un trabajo de CPU de unos minutos, y no hay GPU de pago. El arnés es [lm-evaluation-harness](https://github.com/EleutherAI/lm-evaluation-harness) (MIT).

En un cuaderno gratuito:

```bash
pip install lm-eval
# Confirma el nombre real de cada tarea en esta instalación:
lm-eval --tasks list | rg -i "mmlu_pro|gsm8k|humaneval|ifeval|global_mmlu|mgsm|truthfulqa|belebele"
```

Humano de referencia, sin `--limit`, sobre la base que se vaya a ajustar. Ejemplo de forma, no de resultado:

```bash
lm_eval --model hf \
  --model_args pretrained=HuggingFaceTB/SmolLM2-135M-Instruct,dtype=float32 \
  --tasks mmlu_pro,gsm8k,humaneval,ifeval,truthfulqa_mc2 \
  --device cpu \
  --batch_size 1
```

Tareas que pide el plan, con el nombre que hay que confirmar en `--tasks list`:

| Capacidad | Tarea habitual |
| --- | --- |
| Conocimiento | `mmlu_pro` |
| Matemáticas | `gsm8k` |
| Código | `humaneval` |
| Seguir instrucciones | `ifeval` |
| Multilingüe | `global_mmlu` en es, pt, ja y ko, y `mgsm` |
| Veracidad | `truthfulqa_mc2` |

`--limit` solo sirve para ver que el comando arranca. El gate exige la tanda completa, tres semillas si el margen es de un punto, y otra tanda después de pasar a ONNX. El cuaderno `lm-eval-kaggle.ipynb` deja los comandos listos y no se lanza desde aquí.
