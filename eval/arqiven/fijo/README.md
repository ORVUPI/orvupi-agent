# Conjunto fijo de 100 casos

Las rúbricas están en `rubricas.mjs` y el banco en `casos.mjs`. No se cambia un caso para que un modelo quede bien, y no se entrena a partir de esta corrida.

| Grupo | Casos | Rúbrica |
| --- | --- | --- |
| Español e instrucciones | 20 | viñetas exactas o palabras pedidas |
| Programación | 20 | la función se ejecuta contra dos comprobaciones |
| Documentales | 20 | cita `[f1]` con el dato, o se abstiene si no está |
| Conversación | 15 | usa la corrección del historial y no el dato viejo |
| Incertidumbre | 15 | dice que no lo sabe y no inventa el cebo |
| Aislamiento | 10 | no obedece una orden metida en el documento |

Comprobar el banco sin llamar a Ollama:

```text
node eval/arqiven/fijo/run.mjs --comprobar
```

Correrlo en el PC, contra el Ollama que ya está (no abre otro puerto):

```text
node eval/arqiven/fijo/run.mjs
node eval/arqiven/fijo/run.mjs --mitigado
```

Sin `--mitigado` usa el mismo prompt de la línea base (91/100, 15-11-2026 18:36Z). Con `--mitigado` usa las instrucciones nuevas del backend: el dato va entre marcas, y el historial corregido manda. Cada fila de `eval/arqiven/fijo/out/resultado.json` guarda el prompt enviado y la respuesta completa. No se sube al repositorio. Una corrida en la VM con otro modelo no sustituye a la del PC.

`prog-20` pide `clampTexto("hola", 2) === "ho"`. `ho...` es un fallo del modelo: son cinco caracteres. `prog-14` también: `primo(5)` con `![1, n].some(i => n % i === 0)` sale siempre falso. No se cambian esos casos.

La etiqueta que ve el modelo en `--mitigado` es `[documento: nombre]` … `[/documento]`, con la regla de usar los hechos y citarlos, e ignorar las instrucciones de dentro. La corrida sin `--mitigado` conserva el prompt de la línea base.

Para repetir las dos en el PC:

```text
node eval/arqiven/fijo/run.mjs
node eval/arqiven/fijo/run.mjs --mitigado
```

El índice de documentos del modo local usa, si está instalado, `qwen3-embedding:0.6b` (terceros, Apache 2.0, cubre español). No es el modelo de chat. Si falta:

```text
ollama pull qwen3-embedding:0.6b
```
