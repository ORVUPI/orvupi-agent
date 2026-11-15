# Datos para una SFT de ARQIVEN

Fecha: 15 de noviembre de 2026.
Estado de todo este directorio: pendiente de revisión.
No se entrena. No se descarga un modelo. No se llama a Kaggle.

## Qué hay

| Archivo | Papel |
| --- | --- |
| `esquema.json` | Formato `messages`, el que acepta TRL `SFTTrainer`. |
| `construir-lote.mjs` | Escribe `lote-01.jsonl` desde los ejemplos revisables. |
| `lote-01.jsonl` | Primer lote, 48 conversaciones en español. Una por línea. |
| `comprobar-solape.mjs` | Falla si un ejemplo repite, exacto o casi exacto, la evaluación. |

Cabecera de los dos programas: «© 2026 ORVUPI. Todos los derechos reservados.» El archivo `LICENSE` de la raíz sigue siendo MIT. Cómo encaja eso está en `LICENSE-propuesta.md`.

## Procedencia y permiso

Cada línea del lote lleva `procedencia`. El texto lo hemos escrito aquí, o resume un hecho que ya está en este repositorio (código, documentos de `docs/arqiven/conocimiento/`, README). No entra SmolTalk, Aya, Tulu, WildGuard ni ningún otro corpus de terceros. `train/arqiven/README.md` nombra esos corpus para una mezcla distinta, que no se usa en este lote.

Nada de este directorio copia la ficha de Qwen más allá de nombrar el modelo, la licencia Apache 2.0 y que es de terceros. Los pesos no están aquí.

Hasta que Cristian revise el lote, no debe usarse para entrenar. El campo `estado` lo dice en cada línea.

## Separación con la evaluación

El lote no debe solaparse con:

- `eval/arqiven/fijo/` (los 100 casos),
- el conjunto reservado del mismo directorio,
- `eval/arqiven/v01/preguntas-reales.json`.

Comprobación, sin modificar esos archivos:

```text
node datos/arqiven/construir-lote.mjs
node datos/arqiven/comprobar-solape.mjs
```

La segunda orden sale con código 0 si no hay solape. Compara el texto del usuario y del asistente, y también los dos juntos, con cada pregunta, fuente o respuesta esperada. Cuenta como solape una igualdad tras normalizar, un fragmento de 80 caracteres o más contenido en el otro, o un índice de Jaccard de tokens de 0,82 o más cuando ambos lados tienen al menos 8 tokens. El 15 de noviembre de 2026 esa orden dio «sin solape» para 48 ejemplos frente a 162 referencias. Un ejemplo plantado con el enunciado de `es-17` sí lo detecta: se probó aparte y no está en el lote.

Si se añade una línea, hay que volver a pasar el script antes de considerar el lote.

## Qué practica el lote

Identidad honesta (Qwen3 8B de terceros, sin Arqiven-N), citas a un fragmento con su id, abstención cuando el dato no está y petición del dato, programación del propio backend en ángulos que no son las 20 preguntas de v0.1, fichas de ORVUPI citando `arq-00N`, instrucciones de formato, una corrección de historial, rechazo de consejo financiero y una orden escondida en un documento que no se obedece.

## Cómo lo leería un entrenador, el día que Cristian lo autorice

El dataset es JSON lines. La columna que importa es `messages`. `id`, `estado` y `procedencia` se pueden dejar fuera de la pérdida. La versión de TRL que haya en el PC manda sobre el nombre de la clase y de los argumentos: hay que leerla entonces, no dar por buena una llamada escrita hoy. Un esquema de lectura, sin ejecutarlo:

```python
from datasets import load_dataset
datos = load_dataset("json", data_files="lote-01.jsonl", split="train")
# SFTTrainer(..., train_dataset=datos, processing_class=tokenizador)
```

Eso no se lanza desde aquí. El plan de la adaptación está en `docs/arqiven/plan-qlora-v01.md`.
