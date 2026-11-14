# Criterios de aceptación fijados ANTES de medir (12-11-2026 ~00:55 Madrid)
Evaluación inicial de la app actual (configuración idéntica a engine-worker.mjs de main f5f14d3e).
Cada tarea tiene comprobaciones automáticas (regex) definidas en tasks.mjs antes de ejecutar.
- Una tarea "pasa" si cumple TODAS sus comprobaciones.
- Respuesta truncada = alcanza el tope de tokens y no termina en signo de cierre.
- Umbral "conversación básica fiable" (objetivo fase 2): ≥ 80 % de tareas es superadas, 0 tareas de contexto/corrección falladas por recorte del historial, ≤ 5 % truncadas, mediana de tiempo total ≤ 20 s en CPU del box para el modelo por defecto.
- Una configuración candidata solo se considera mejor si sube la tasa de acierto sin bajar ninguna categoría y sin empeorar la mediana de tiempo más de un 50 %.

## Corrección del verificador (01:2x Madrid, antes de comparar configuraciones)
Dos expresiones regulares del verificador tenían un fallo de acentos: `\bsí\b` no reconoce «Sí,» en JavaScript y `clorofil` no reconoce «clorofílica». Se corrigieron y se recalificaron TODAS las corridas con el mismo verificador (rescore.mjs). No se cambió ningún criterio.
