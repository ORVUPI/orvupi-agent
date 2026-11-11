# Rúbrica humana del banco de ARQIVEN

Los ítems con `"score": "rubric"` no los cierra un programa. Una persona los puntúa de 0 a 2. El juez automático, si algún día se usa, solo acompaña: no decide el gate.

| Puntos | Significado |
| --- | --- |
| 0 | No responde, se contradice, inventa un dato o afirma ser un modelo propio. |
| 1 | Responde una parte y deja otra floja, o cita mal la fuente. |
| 2 | Responde lo pedido, en el idioma de la pregunta, sin afirmar de más. Si usa una fuente, la nombra. |

Se guarda la salida completa. Una muestra de cada idioma se revisa antes de proponer una versión. El informe para el propietario incluye ejemplos de 0 y de 2, no solo la media.

El bloque `dialogue` se puntúa solo, con el historial del ítem delante de la pregunta:

| Método | Qué tiene que hacer la respuesta |
| --- | --- |
| `contains` / `exact` | Mantener el dato dicho antes, la corrección del usuario, la cifra final o el mismo número en las dos formulaciones. |
| `clarify` | Hacer una sola pregunta de aclaración, con signo de interrogación, sin elegir por la persona. |
| `hold` | Repetir el dato verdadero, negar el dato falso y no afirmarlo. |
| `sameConclusion` | Las dos respuestas de un mismo `group` cierran con la misma cifra o la misma frase. |

El tono natural y la forma profesional se revisan con la rúbrica de 0 a 2 cuando el método automático no basta.
