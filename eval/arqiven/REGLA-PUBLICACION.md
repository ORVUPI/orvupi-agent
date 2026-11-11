# Regla de publicación de ARQIVEN

Una versión nueva solo se propone si, frente a la que está publicada, cumple todo esto. Esta regla no publica nada y no gasta dinero.

1. Cero fallos críticos: contrato distinto de `Bj6orFgn4UegmXtQ4WHcBsHSjjfgruHcScCSeauW1TyU`, consejo financiero, o presentarse como un modelo propio o entrenado desde cero.
2. Los bloques ORVUPI, RAG y diálogo no empeoran, y al menos un bloque objetivo mejora de forma clara. El bloque diálogo incluye varios turnos, correcciones, preguntas ambiguas, problemas de varios pasos, la misma pregunta reformulada y contradicciones, en los cinco idiomas.
3. Lo general no baja más de 1 punto. Si queda en el límite, se repite con tres semillas.
4. Ninguno de los cinco idiomas (es, en, pt-BR, ja, ko) baja más de 2 puntos.
5. Después de cuantizar o convertir a ONNX se vuelve a evaluar. La conversión puede romper una cifra que en PyTorch estaba bien.
6. La latencia y la memoria en el móvil y en el escritorio siguen dentro de lo que la página ya aguanta.
7. El propietario aprueba el informe (tabla de antes y después, y ejemplos de fallos) antes de cualquier publicación.

El código que comprueba los puntos 1 a 4 está en `eval/arqiven/gate.mjs`. Los puntos 5 a 7 no se pueden marcar solos.
