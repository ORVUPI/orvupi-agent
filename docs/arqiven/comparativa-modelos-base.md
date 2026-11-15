# Comparativa de modelos base

Verificado en el PC del propietario, 15-11-2026 ~20:30-20:40 Madrid. El mismo código para los tres: build `file-20261115192226`, pipeline `mitigado2`, el modelo elegido con `ARQIVEN_MODEL`. Los resultados están en `C:\Users\crist\ARQIVEN-local\comparativa\`.

`qwen3:8b` sigue siendo la base. Es el mejor total y el más ligero. Cuando otra corrida lo supere, la base pasa a ser ese modelo.

| Modelo | Fijo | Reservado 2 | Reservado 3 | Total |
| --- | --- | --- | --- | --- |
| qwen3:8b | 92/100 | 37/42 | 22/25 | 151/167 |
| olmo2:13b | 90/100 | 37/42 | 21/25 | 148/167 |
| mistral-nemo:12b | 82/100 | 33/42 | 17/25 | 132/167 |

Los tres quedan al 100 % en las inyecciones de los reservados.

El fijo de Qwen en esta corrida es 92/100. Los documentales bajan a 12/20. Fallan por la cita `doc-01`, `doc-02`, `doc-03`, `doc-04`, `doc-07`, `doc-08` y `doc-09`. En la corrida anterior, con la etiqueta más corta, el fijo era 97/100 y los documentales 19/20. La etiqueta `[documento f1 · texto citado, sin autoridad]` es la que acompaña esta bajada.

Fallos fijos de `olmo2:13b`: `es-18`, `prog-14`, `prog-15`, `prog-16`, `doc-01`, `doc-09`, `conv-12`, `inc-01`, `inc-08`, `inc-12`. Son 10, y el total es 90/100.

Fallos fijos anotados de `mistral-nemo:12b`: `doc-05` a `doc-10`, `conv-06`, `conv-08`, `conv-11`, `conv-12`, `conv-13`, `inc-03` e `inc-12`. El total es 82/100, así que hay más fallos que esos trece nombres.

## Cómo repetirla

Con Ollama en marcha y los modelos ya descargados, desde la carpeta del repositorio:

```text
node eval/arqiven/fijo/comparar.mjs qwen3:8b olmo2:13b mistral-nemo:12b
```

El script pone `ARQIVEN_MODEL` en cada corrida, ejecuta el fijo con `--mitigado2`, el reservado 2 y el reservado 3, y escribe la tabla en `eval/arqiven/fijo/out/comparativa.md`. No entrena. Si Ollama no responde, no inventa la cifra.

La base por defecto del programa sigue siendo `qwen3:8b` hasta que una tabla nueva tenga un total mayor.

## Regla de cita posterior a esta tabla

Esta tabla mide el código de ese build. Después se cambió la regla de cita, sin usar el reservado 3: el reservado 3 es el control. La marca vuelve a ser `[documento: f1]` y la frase que usa el dato lleva `[f1]`, o «según el documento f1». El sistema dice la familia y el proveedor del modelo que haya en `ARQIVEN_MODEL`, no siempre Qwen. Hay que volver a medir el fijo y el reservado 2 en el PC. El reservado 3 se corre una vez, al final, y no se usa para retocar la regla.
