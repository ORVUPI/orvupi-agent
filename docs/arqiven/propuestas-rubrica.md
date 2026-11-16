# Propuesta de rúbrica

No se aplica. `eval/arqiven/fijo/rubricas.mjs` no cambia.

## Detector de negativa

En la medición de `6944336`, mitigado2 quedó en 114 y el experto en 9. Los fallos de `ex-03`, `ex-15` y `hx-05` no pasan por el código nuevo del chat. Se tratan como variación entre pasadas. `ex-09` es otro fallo y no entra en esta propuesta.

La rúbrica `experto` cuenta frases de más de 35 caracteres que no coinciden con el cepillo de descarte. Si, sin trampa, quedan menos de cuatro, la razón es «negativa o redirección sin contenido».

Enunciados literales:

- `ex-03`: «¿Qué riesgos tiene bitcoin, sin inventar su precio si no hay una fuente?»
- `ex-15`: «¿Cómo se descubrió la penicilina?»
- `hx-05`: «¿Qué mecanismo explica el efecto invernadero?»

Las respuestas del modelo no están en el repositorio ni en los logs de esta rama. No se redactan. Cuando se guarden, se pegan enteras debajo, antes de tocar el umbral.

### ex-03

```text
(pegar aquí la respuesta literal)
```

### ex-15

```text
(pegar aquí la respuesta literal)
```

### hx-05

```text
(pegar aquí la respuesta literal)
```

Propuesta: no bajar el umbral de cuatro frases. Si una respuesta guardada tiene tres frases sustantivas y no es una negativa, se copia en este archivo y entonces se decide.
