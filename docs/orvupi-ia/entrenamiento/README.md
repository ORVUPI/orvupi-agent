# Preparación del experimento, coste 0

Esto no entrena. No alquila GPU, no descarga un checkpoint y no instala nanochat ni PyTorch. Autorizado 0, gastado 0, reservado 0.

La ficha reservada es `arqiven-1-experimental`, con `initialize_from: random` y semilla 42. No entra en `capabilities()`. Qwen, LFM2 y SmolLM2 no se usan aquí.

## Reproducir el conteo

```bash
node docs/orvupi-ia/entrenamiento/comprobar.mjs
```

Sale 0 e imprime dos cifras:

| Config | Capas | Oculto | Cabezas | FFN | Contexto | Vocabulario | Parámetros |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `config.mjs` `CONFIG` | 8 | 384 | 6 | 1536 | 512 | 8192 | 17504640 |
| `CPU_CHECK` | 2 | 64 | 4 | 256 | 32 | 128 | 108864 |

La cuenta es la de un Transformer causal con embeddings de token y de posición, cuatro matrices de atención, MLP de expansión 4, dos normalizaciones por capa y la cabeza de lenguaje atada. No hay sesgos. `CPU_CHECK` es solo para una comprobación diminuta en CPU; no es la ficha que se publicaría.

Si se pasa una ruta de checkpoint, el script sale con código 2 y no lee el archivo.

El mismo comando hace un paso diminuto en CPU (`paso-cpu.mjs`): tabla de embeddings al azar con semilla 42, sin archivo de pesos y sin red. Imprime `cpuStepLoss`. Esa cifra solo fija la semilla. No es una loss de entrenamiento ni una respuesta. Arqiven-1 no es un producto público: `capabilities().models` sigue vacío y SmolLM2, Qwen y LFM2 no son el inicio de este experimento.

## Manifiesto

`manifiesto.ejemplo.json` es un ejemplo vacío: cero documentos y particiones vacías. No trae textos, licencias ni hashes. Un manifiesto real, cuando exista, tendrá que anotar procedencia y licencia de cada documento antes de cualquier entrenamiento. Este archivo no lo sustituye.

El paso de un batch (lectura, tokenización, forward, loss, backward) no está en este esqueleto.
