# ARQIVEN — Hoja de ruta de producto e investigación
## Del prototipo local a un proyecto con evidencia para buscar financiación

**Fecha de referencia:** 15/11/2026.  
**Promotor:** Cristian Pardo Camacho.  
**Estado:** plan propuesto; las fases no representan resultados alcanzados.  
**Relación con el trabajo anterior:** complementa ARQIVEN_Instrucciones_Agentes_2026-11-15.md. No sustituye sus registros ni acredita implementaciones.

## 1. Decisión y ambición

La aspiración a largo plazo es investigar sistemas de inteligencia progresivamente más general y, si aparecen resultados científicos suficientes, contribuir al progreso hacia AGI. La superinteligencia queda como horizonte especulativo: no existe aquí una técnica validada, un plazo ni una probabilidad calculable de alcanzarla.

El objetivo operativo inmediato es producir evidencia desde el PC disponible: software funcional, resultados reproducibles, usuarios que completen tareas útiles y una contribución propia identificable. Buscar financiación cuando permita comprobar una hipótesis o atender una necesidad demostrada.

Se desarrollarán dos líneas coordinadas:

- **Producto:** un asistente ARQIVEN con utilidad, privacidad, fiabilidad y costes medidos.
- **Investigación:** experimentos sobre generalización, verificación, aprendizaje y resolución de tareas nuevas.

El éxito comercial de la primera línea no demuestra AGI. Una mejora científica puede ser valiosa antes de tener un producto comercial. Cada línea necesita sus propias pruebas.

## 2. Qué está confirmado y qué falta

Observado en las capturas y vídeos del propietario: i7-14700KF, RTX 5070 Ti de 16 GB, 32 GB DDR5-6000, SSD WD Blue SN5100 de 2 TB y Windows 11 Pro activado. Ollama ejecutó qwen3:8b con carga informada 100 % GPU y contexto 4096.

La prueba repetida registró 39 rondas, media aritmética 134,11 tokens/s y cronómetro de unos cinco minutos. Es una referencia de inferencia en esas condiciones. No mide inteligencia general, entrenamiento, usuarios simultáneos ni una comparación de calidad.

No se ha auditado en este encargo el repositorio actual, ni se ha verificado la integración completa de la web con el PC. No se ha demostrado un modelo entrenado propio, entrenamiento viable, demanda comercial o una innovación científica.

No comprar hardware ni contratar servicios para completar una fase que aún no los necesita. La ejecución en un entorno remoto distinto no cuenta como prueba de este ordenador.

## 3. Qué significa «propio»

| Capa | Trabajo propio posible | Procedencia que hay que declarar |
|---|---|---|
| Aplicación | Interfaz, servidor, historial, permisos, herramientas y evaluación | Dependencias y servicios utilizados |
| Sistema de IA | Recuperación documental, planificación, selección de herramientas y comprobación | Modelo o modelos que generan las respuestas |
| Adaptación del modelo | Dataset autorizado, receta y adaptadores entrenados | Modelo base, licencia y modificaciones |
| Modelo preentrenado desde cero | Arquitectura elegida, tokenizer, corpus y entrenamiento | Datos, componentes y métodos previos utilizados |
| Investigación | Método nuevo y experimentos que lo respaldan | Trabajo relacionado, condiciones y límites |

El núcleo defendible puede estar en un método, unos datos autorizados, una evaluación o un sistema eficiente. Crear una arquitectura desde cero no es requisito automático para innovar. Ejecutar modelos grandes mediante una API debe registrarse: sus capacidades no se atribuirán al modelo local.

## 4. Escalera de hitos y decisiones

Los hitos son condiciones de avance; no constituyen una secuencia que garantice AGI. Pueden revisarse con evidencia.

| Hito | Trabajo | Evidencia para pasar al siguiente |
|---|---|---|
| H0. Estado reproducible | Auditar repositorio, versiones, datos y ejecución | Otra persona puede arrancar el prototipo siguiendo instrucciones |
| H1. Referencia medible | Definir tareas y evaluar el modelo actual | Informe con aciertos, errores, tiempos y memoria |
| H2. Flujo útil completo | Chat persistente, documentos, citas y cancelación | Una tarea real se completa de principio a fin; los errores son visibles |
| H3. Mejora propia | Contrastar una hipótesis concreta sobre la referencia | Ganancia repetible en tareas reservadas, con sus costes y regresiones |
| H4. Piloto privado | Observar uso voluntario y necesidades reales | Tareas terminadas, errores, correcciones y continuidad de uso |
| H5. Proyecto presentable | Preparar demostración, informe y plan de recursos | Un tercero puede comprobar la ventaja y entender el uso de la financiación |
| H6. Investigación ampliada | Incorporar colaboradores y cómputo para experimentos concretos | Resultados reproducidos y revisión técnica externa |
| H7. Generalización más amplia | Probar aprendizaje y transferencia en tareas nuevas | Evidencia en varias familias de tareas, con referencias humanas apropiadas |
| H8. Evaluación de afirmaciones avanzadas | Definir criterios de AGI y someter resultados a evaluación independiente | Evidencia suficientemente amplia para discutir la afirmación; no un sello automático |

Entrenar un modelo fundacional propio se considerará dentro de H6 o posteriormente si existe una razón verificable. El primer experimento desde cero puede ser pequeño y educativo; eso no demuestra competitividad con modelos de frontera.

## 5. Primer ámbito recomendado

Propuesta inicial: asistencia técnica en español sobre proyectos informáticos, con documentos y comprobaciones ejecutables. Se elige porque permite verificar parte de las respuestas mediante archivos, citas y pruebas, y encaja con los intereses de aprendizaje del promotor. Su demanda comercial sigue sin validar.

Primeras tres tareas:

1. Responder una pregunta sobre documentos de ARQIVEN citando el pasaje correcto y reconociendo lo que falta.
2. Explicar y resolver un problema informático acotado, justificando los pasos que realmente se puedan comprobar.
3. Proponer o modificar código de una tarea pequeña y entregar pruebas ejecutadas, con sus fallos si existen.

Elegir después una tarea prioritaria para el piloto. Una plataforma con muchas funciones sin comprobar dificultaría identificar qué mejora aporta valor.

## 6. Evaluación inicial y registro

Preparar 100 casos como punto de partida propuesto, no como certificación. Reparto inicial:

| Familia | Casos |
|---|---:|
| Preguntas documentales con citas | 20 |
| Informática y programación verificable | 20 |
| Español y seguimiento de instrucciones | 20 |
| Conversación, historial y contexto | 15 |
| Incertidumbre y límites de acceso | 15 |
| Permisos y documentos con instrucciones engañosas | 10 |

Antes de realizar ajustes, separar los casos de desarrollo de los reservados para el examen final, manteniendo cobertura de familias. Los ejemplos usados para entrenar pertenecerán a otra colección. El conjunto final perderá su condición de reservado cuando sus resultados guíen nuevas modificaciones; habrá que renovarlo.

Registrar por caso: entrada, referencia o rúbrica, salida completa, versión y parámetros, puntuación y motivo, tiempo, tokens, memoria y herramientas usadas. En programación, ejecutar comprobaciones apropiadas. En documentos, verificar el contenido citado. La nota que se pone el propio modelo no basta como evaluación independiente.

Indicadores de producto: éxito de la tarea completa, correcciones necesarias, citas verificables, errores graves, velocidad de respuesta y coste. Si se comparan modelos, usar condiciones y presupuestos documentados. Repetir ensayos cuando la variabilidad pueda cambiar la conclusión; incluir dispersión, no solo el mejor intento.

Un umbral inicial sirve para tomar decisiones sobre un prototipo privado. No acredita seguridad pública ni inteligencia general. Los fallos críticos de acceso a datos bloquearán el piloto aunque la media sea buena.

## 7. Primera hipótesis de investigación

**Pregunta propuesta:** ¿un sistema con búsqueda documental y verificación de respuestas resuelve mejor ciertas tareas técnicas en español que el mismo modelo usado directamente, con un presupuesto de recursos comparable?

Experimento:

- A: modelo base con instrucciones básicas.
- B: mismo modelo con recuperación de documentos.
- C: mismo modelo, recuperación y verificación cuando la tarea permita comprobar resultados.
- Mantener separados los casos utilizados para desarrollar las variantes de los utilizados para juzgarlas.
- Medir tareas resueltas, errores, tiempo y consumo.
- Retirar componentes individualmente para comprobar qué aporta cada uno.
- Publicar o compartir resultados solo con autorización y sin exponer datos privados.

La recuperación y la verificación son técnicas conocidas. Integrarlas no constituye por sí solo una novedad científica. Una contribución investigadora requerirá comparar con trabajos relacionados y demostrar qué cambio aporta algo distinto.

Resultado aceptable: mejora consistente que compense su coste. También es útil un resultado negativo bien registrado: evita seguir invirtiendo en una hipótesis que no funciona.

## 8. Cuándo entrenar

Entrenar una adaptación cuando se detecte un comportamiento concreto que los datos puedan mejorar: seguir un formato, responder con un estilo apropiado o resolver mejor una familia de tareas. El conocimiento actualizado se gestionará inicialmente mediante fuentes recuperables y verificables.

Empezar con una prueba pequeña de LoRA/QLoRA si la receta y las versiones son compatibles con el equipo. Registrar modelo base, revisión, tokenizador, licencia, datos, particiones, semilla, parámetros y memoria. La configuración viable se determinará mediante ejecución, no por la prueba de Ollama.

El ciclo de aprendizaje será: errores reales → selección y revisión de ejemplos → entrenamiento candidato → evaluación → aprobación o descarte. Conservar versiones anteriores. Las conversaciones de usuarios no se convierten automáticamente en datos de entrenamiento.

Una caída de la pérdida de entrenamiento no demuestra que el usuario reciba mejores respuestas. Conversar con el modelo tampoco actualiza automáticamente sus pesos.

## 9. Cuándo ampliar recursos

| Cuello de botella demostrado | Decisión posible |
|---|---|
| El modelo falla por información ausente | Mejorar documentos y búsqueda |
| La RAM se agota en una tarea necesaria | Optimizar la tarea y valorar ampliación si persiste |
| La VRAM limita un experimento justificado | Reducir lote/contexto; después presupuestar cómputo adicional si hace falta |
| La velocidad impide completar el flujo útil | Medir cada etapa antes de cambiar hardware |
| Varios usuarios necesitan servicio continuo | Diseñar alojamiento, concurrencia y coste real |
| Una hipótesis necesita más entrenamiento del que permite el PC | Presentar experimento acotado, presupuesto máximo y criterio de cancelación |

La RAM del sistema no añade VRAM física. Una mejora de GPU tampoco garantiza mejoras de calidad. No asignar aquí un coste o una fecha a AGI: faltan un método validado y una estimación defendible.

## 10. Evidencia para buscar financiación

La financiación puede explorarse antes de facturar si existe evidencia técnica convincente; los requisitos cambian según el interlocutor. No se garantiza interés inversor.

Preparar un expediente verificable:

1. Problema y usuario objetivo, con evidencia de necesidad.
2. Demostración reproducible de una tarea completa, incluyendo errores y límites.
3. Comparación con una referencia accesible y pertinente.
4. Explicación de qué ha construido ARQIVEN y qué depende de terceros.
5. Datos de uso del piloto, cuando existan, sin inventar usuarios, ingresos o acuerdos.
6. Coste observado de ejecutar y mantener la solución; supuestos de crecimiento claramente separados.
7. Hipótesis investigadora, resultados y revisión externa disponible.
8. Equipo actual y capacidades que faltan.
9. Financiación solicitada vinculada a experimentos y entregables concretos.
10. Criterios de continuidad, revisión o cierre de cada línea.

La cantidad a solicitar se calculará después de conocer las horas, el equipo y el cómputo necesarios para el siguiente hito. Este documento no fija valoraciones de empresa ni recomienda una operación financiera.

## 11. Cómo investigar capacidades más generales

Ampliar gradualmente la diversidad de tareas y comprobar:

- Aprendizaje con pocos ejemplos en tareas nuevas.
- Transferencia a familias diferentes de las usadas para ajustar.
- Planificación, recuperación tras errores y finalización de tareas completas.
- Uso de herramientas con resultados verificables.
- Reconocimiento de incertidumbre y abstención apropiada.
- Coste de aprendizaje y ejecución respecto a referencias documentadas.

Utilizar una combinación de pruebas propias reservadas, benchmarks externos pertinentes y evaluación humana independiente. ARC-AGI puede aportar una perspectiva de generalización; no será el único criterio. Al usar cualquier benchmark, verificar versión, reglas, acceso a soluciones y posible contaminación de datos.

La evaluación de tareas largas debe medir éxito a una fiabilidad explícita. La duración que necesita un humano para resolver una tarea no equivale al tiempo que la IA puede actuar sola. Los resultados en software no se extrapolan automáticamente a todos los ámbitos.

Antes de anunciar AGI, definir de antemano qué se entiende por generalidad, desempeño y aprendizaje; comparar con referencias humanas adecuadas y someter resultados amplios a revisión independiente. Ninguna puntuación aislada certificará la afirmación.

Una eventual investigación sobre superinteligencia necesitaría métodos y evidencias que este plan no contiene. No presentar su llegada como un resultado contratado o programado.

## 12. Control del desarrollo y de la autonomía

Mantener pruebas aisladas, permisos explícitos, registros, cancelación y posibilidad de volver atrás. Las acciones externas importantes requieren autorización del propietario. Separar las instrucciones del sistema del contenido no confiable de documentos o herramientas.

El agente puede proponer experimentos y cambios; las versiones que afecten al sistema principal pasarán por revisión y evaluación. Aumentar capacidad no obliga a dar acceso irrestricto al ordenador, al dinero o a cuentas externas.

Antes de exposición pública, revisar riesgos de la aplicación y obligaciones aplicables con los especialistas correspondientes. Este plan no constituye una revisión legal ni de seguridad.

## 13. Primeros diez bloques de trabajo

Propuesta organizativa; ajustar duración a disponibilidad. No se atribuye un plazo fijo al proyecto.

1. Localizar el repositorio autorizado y leer sus instrucciones.
2. Arrancar la versión actual y registrar qué funciona realmente.
3. Confirmar el recorrido entre interfaz, servidor y Ollama.
4. Elegir la primera tarea prioritaria y escribir sus criterios de éxito.
5. Preparar los primeros casos y sus respuestas verificadas.
6. Completar la evaluación inicial y separar los conjuntos.
7. Ejecutar y registrar la referencia local.
8. Construir el flujo mínimo con historial y gestión de errores.
9. Incorporar una colección pequeña de documentos aprobados.
10. Comparar resultados y decidir el siguiente experimento.

En paralelo, el promotor aprenderá Git, Python básico, HTTP/API, datos y evaluación mediante estas tareas. Los agentes pueden apoyar el desarrollo; la validación de una afirmación seguirá necesitando evidencia comprobable y revisión humana apropiada.

## 14. Próxima decisión concreta

Acceder al repositorio actual, completar H0 y H1 y seleccionar una única tarea para H2. Si no hay acceso al código, preparar evaluación y documentación mientras se identifica el repositorio. No afirmar que la conexión o la implementación se han realizado.

Tras cada hito responder: ¿qué ha mejorado?, ¿cómo se ha comprobado?, ¿qué cuesta?, ¿qué falla todavía?, ¿qué experimento siguiente justifica más recursos?

## 15. Fuentes primarias

Consultadas el 15/11/2026. Respaldan conceptos y métodos; no certifican ARQIVEN ni predicen su éxito.

- Google DeepMind, *Measuring Progress Toward AGI: A Cognitive Framework*, 16/03/2026. Propone un perfil multidimensional y evaluaciones reservadas: https://storage.googleapis.com/deepmind-media/DeepMind.com/Blog/measuring-progress-toward-agi/measuring-progress-toward-agi-a-cognitive-framework.pdf
- Google Research, *Levels of AGI*. Diferencia desempeño, generalidad y autonomía: https://research.google/pubs/levels-of-agi-operationalizing-progress-on-the-path-to-agi/
- Hugging Face, consideraciones sobre particiones y evaluación: https://huggingface.co/docs/evaluate/main/en/considerations
- Hugging Face, ajuste de modelos: https://huggingface.co/docs/transformers/training
- Hugging Face PEFT, cuantización y adaptación eficiente: https://huggingface.co/docs/peft/developer_guides/quantization
- Qwen, ficha del modelo de referencia: https://huggingface.co/Qwen/Qwen3-8B
- ARC Prize, guía técnica y versiones de benchmark: https://arcprize.org/guide
- ARC Prize, política de evaluación reproducible: https://arcprize.org/policy
- METR, metodología de horizontes de tareas; página marcada como no actualizada activamente y última actualización 08/09/2026: https://metr.org/time-horizons/

**Criterio rector:** aumentar recursos y ambición operativa cuando los resultados lo justifiquen; conservar la aspiración científica sin convertirla en una promesa de resultado.

