# Plan QLoRA de ARQIVEN v0.1

Fecha: 15 de noviembre de 2026.
Estado: plan, pendiente del propietario.
No se ha instalado Python, no se ha descargado un modelo, no se ha lanzado un kernel y no se ha entrenado.

ARQIVEN v0.1, si este plan se ejecuta y las pruebas mejoran, será una versión especializada basada en un modelo existente: Qwen3 8B, de terceros, Apache 2.0. No será un modelo creado desde cero ni una API presentada como propia. Los datos de entrenamiento son `datos/arqiven/`, y solo después de la revisión. La evaluación no entra en el gradiente.

## Qué hay que verificar en el PC

Máquina descrita en `docs/arqiven/auditoria.md`: Windows 11 Pro, RTX 5070 Ti de 16 GB, driver 621.24. `docs/arqiven/arranque-windows.md` dice que ese PC no tenía Python. Node y Ollama sí quedaron instalados después, para el chat. Este plan no los cambia.

Antes de cualquier instalación, en PowerShell, y anotando la salida:

1. `nvidia-smi`: que la GPU que aparece sea la RTX 5070 Ti, la memoria total ronde los 16 GB y el driver responda. La cifra de VRAM en reposo no es la de un entrenamiento.
2. `python --version` y `py --version`: se espera que fallen o que no sean un Python de ciencia de datos. No instalar uno hasta que el propietario diga que sí.
3. Espacio libre en disco. Una copia en 4 bits del 8B ocupa varios gigabytes; una en 16 bits, más; el optimizador y las activaciones, aparte. Hay que medirlo, no fiarse de una estimación de esta nota.
4. Que Ollama pueda seguir sirviendo `qwen3:8b` para la comparación de velocidad. El entrenamiento, si usa otra pila (PyTorch), no debe borrar ese modelo de Ollama.
5. Que el lote haya pasado `node datos/arqiven/comprobar-solape.mjs` y que el propietario haya quitado el «pendiente de revisión».

QLoRA en 16 GB es un candidato, no una promesa. Un 8B en 4 bits más un adaptador de rango bajo y un lote de tamaño 1, con checkpoint de gradiente y una secuencia corta, a veces cabe. También se queda sin memoria si la secuencia o el rango se pasan. La primera corrida útil es una que arranque, imprima la memoria y se pueda cancelar. Si no cabe, se baja la longitud, no se sube la GPU de alquiler.

En Windows, las ruedas de bitsandbytes y de compiladores cambian con la versión de CUDA. Si eso atasca, el camino gratuito alternativo es Kaggle, no una compra.

## Qué hay que verificar en Kaggle, si se usa

Kaggle tiene GPU gratuita con cuenta, y la cuota y el tipo de GPU los publica Kaggle en ese momento. No se copia aquí un número de horas: hay que leerlo en la cuenta y en la documentación vigente, https://www.kaggle.com/docs/notebooks , antes de pulsar Run. Esta nota no abre una cuenta ni lanza un kernel.

Comprobar, sin entrenar todavía:

- Que el kernel sea gratuito y que la GPU que asigne quepa con el mismo criterio de memoria de arriba (muchas sesiones gratuitas han sido de 16 GB; si el día del uso es otra, se anota y se decide).
- Que no se pegue una clave en el cuaderno. `train/arqiven/kaggle-push.mjs` ya exige `KAGGLE_USERNAME` y `KAGGLE_KEY` en el entorno y sale sin red si faltan. No se llama desde aquí.
- Que el cuaderno no descargue SmolTalk, Aya ni Tulu. Esos corpus están descritos en `train/arqiven/README.md` y no son el lote de `datos/arqiven/`.
- Que la base sea `Qwen/Qwen3-8B`, con su licencia Apache 2.0, y que el adaptador se guarde en el disco de salida, no en este git.

El cuaderno `train/arqiven/lora-qwen35.ipynb` apunta a modelos pequeños (Qwen3.5 0.8B y, si falla, Qwen3 0.6B o 1.7B). No es el plan de la v0.1 sobre Qwen3 8B. No se reutiliza tal cual.

## Cómo comparar la base con la adaptada

La misma prueba, el mismo `think`, el mismo `num_ctx`, el mismo `num_predict` y la misma temperatura. Una corrida en frío y otra en caliente, como ya anota el backend. No se reescriben los casos para favorecer al adaptador.

| Qué | Cómo se mira | Cuándo cuenta |
| --- | --- | --- |
| Exactitud | Los 100 casos de `eval/arqiven/fijo/`, con la misma rúbrica. El número de hoy con `--mitigado2` es 97/100. El adaptador tiene que superar eso, no solo acercarse. | Informe, no para elegir hiperparámetros a mano mirando cada fallo y reescribiendo el filtro. |
| Instrucciones | Los casos de español del mismo banco: número de viñetas, idioma, palabras pedidas. | Misma tabla. |
| Citas | Los casos documentales: la cita existe y el dato está en el fragmento; si no está, abstención. | Misma tabla. |
| Velocidad | tok/s y tiempo hasta el primer token, en la misma GPU, con un relato largo como el del humo (cientos de tokens, no una frase de cuatro). | Al lado de la exactitud. Un adaptador más lento se anota, no se esconde. |
| Memoria | VRAM máxima durante la inferencia de una petición, y durante el entrenamiento si se llegó a lanzar. | Si el adaptador no cabe en los 16 GB para inferir, no sustituye al `qwen3:8b` que ya corre en Ollama. |

`eval/arqiven/v01/preguntas-reales.md` entra en la comparación solo después de que el propietario deje de marcarlas como borrador. Hasta entonces son una revisión humana, no una puntuación automática.

El conjunto reservado se ejecuta una vez, en el PC, sobre la candidata ya congelada. No se usa para decidir el rango, la tasa ni qué ejemplos añadir. Así lo pide `eval/arqiven/fijo/reservado.mjs`.

Identidad: en una muestra de preguntas, la adaptada tiene que seguir diciendo que es una versión especializada basada en Qwen3 8B, no un modelo propio. Si eso empeora, no se conserva aunque suba otra cifra.

## Regla de conservar la anterior

1. Los pesos base de Qwen3 8B no se sobrescriben. El adaptador vive en otra carpeta, con fecha y con el commit de datos en el nombre.
2. La carpeta anterior no se borra al empezar la corrida nueva.
3. Solo se declara vigente la nueva si gana en exactitud y no empeora citas, instrucciones ni identidad, y la velocidad y la memoria se han anotado.
4. Si empata o empeora, se deja la anterior (hoy: sin adaptador, el `qwen3:8b` de Ollama) y se archiva la candidata con el motivo.
5. No se sube ninguna de las dos a este repositorio. Si un adaptador llega a existir, el material de ORVUPI que lo acompaña queda bajo `LICENSE-ARQIVEN.md`. La parte derivada de Qwen3 8B sigue en Apache 2.0, con los avisos de `THIRD_PARTY_NOTICES.md`.

Nada de esta página se ha ejecutado.
