# Datos del LoRA, sin entrenar

`build-dataset.mjs` prepara la mezcla. No alquila GPU, no llama a una API de pago y no lanza Unsloth.

```bash
node eval/arqiven/bank/generate.mjs
node train/arqiven/build-dataset.mjs
```

Eso escribe `train/arqiven/out/` con las fichas de ORVUPI y los rechazos propios, ya descontaminados contra el banco. `out/` no se versiona.

Para una muestra remota, todavía gratis y sin clave:

```bash
node train/arqiven/build-dataset.mjs --fetch --limit 20
```

El objetivo de 40–60 mil ejemplos, con cerca de un 90 % general, se completa en Kaggle o Colab con el mismo script y un `--limit` alto, o con el cuaderno `lora-qwen35.ipynb`. La base es `Qwen/Qwen3.5-0.8B` (Apache-2.0). Si la exportación ONNX de un Qwen3.5 ajustado no sale, el cuaderno deja el cambio a `Qwen/Qwen3-0.6B` o `Qwen/Qwen3-1.7B`.

No se incluye la mezcla entera de Tulu 3, ni los subconjuntos heredados de SmolTalk2, ni WildGuardMix (gated) ni CoCoNot (licencias de las partes sin cerrar). El detalle está en `sources.mjs`.
