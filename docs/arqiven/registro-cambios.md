# Registro de cambios — backend local de ARQIVEN

Fecha: 15 de noviembre de 2026. Nada de esta tabla se ejecutó en el PC del propietario. «Verificado» dice el sitio real de la prueba.

| Elemento | Propuesto | Implementado | Verificado | Pendiente |
| --- | --- | --- | --- | --- |
| Auditoría de la pila, las pruebas, el almacenamiento, la autenticación, la IA y la marca | Sí, en `docs/arqiven/auditoria.md` | Sí | Lectura del repo en la VM, sobre `57fda94c` | Que el propietario confirme si falta algún flujo que use fuera de esta rama |
| Backend Node sin dependencias, solo en 127.0.0.1 | Sí | `local/arqiven/server.mjs`, script `arqiven:local` | VM: `node --test dist/test/arqiven-local.test.js` comprueba el bind en 127.0.0.1 y rechaza otro host y el puerto 11434 | Arranque en el PC del propietario |
| Adaptador `/api/chat` con `think: false` en el JSON | Sí | `local/arqiven/ollama.mjs` | VM, Ollama simulado: el cuerpo lleva `think: false` y no contiene `no_think` | La misma comprobación contra el Ollama 0.40.16 del PC |
| `num_ctx` 4096, `num_predict` 1024, temperatura 0.2 | Sí | `local/arqiven/config.mjs` | VM, Ollama simulado | PC del propietario |
| Presupuesto: la ventana no es 4096 de entrada más 1024 de salida | Sí. Entrada útil 2816, reserva 256 | `local/arqiven/budget.mjs` | VM: prueba de unidad y prueba HTTP con un historial largo | PC del propietario |
| Cola de una petición, aviso `en espera` | Sí | `local/arqiven/queue.mjs` y el evento `queued` | VM, Ollama simulado, dos peticiones; la segunda no entra hasta que acaba la primera | PC del propietario |
| Cancelación real | Sí. Abortar la petición a Ollama y soltar la cola | Señal en el servidor y `POST /api/arqiven/cancel` | VM, Ollama simulado: corte a mitad y la petición siguiente responde | El script de humo, en el PC |
| Tiempo de espera, tope de tamaño y errores claros | Sí. 180 s, 256 KiB, textos de Ollama apagado, modelo ausente, tiempo agotado y cancelado | `errors.mjs` y el servidor | VM, Ollama simulado, incluidos el puerto cerrado y el HTTP 404 del modelo | PC del propietario |
| Regenerar | Sí. Quita la última respuesta y pide otra | `regenerate: true` en el servidor; botón «Regenerar» solo en modo local | VM: el historial queda con una pregunta y la respuesta nueva | PC del propietario |
| Historial en disco que sobrevive al proceso | Sí. JSON atómico | `local/arqiven/store.mjs` | VM: se cierra el servidor, se abre otro sobre el mismo directorio y el chat sigue | PC del propietario, carpeta `%LOCALAPPDATA%\ARQIVEN\local` |
| Métricas por petición, frío y caliente | Sí. Campos de Ollama más el tiempo hasta el primer token medido aquí. Frío si `load_duration` > 50 ms | `local/arqiven/metrics.mjs` | VM, Ollama simulado, con duraciones inyectadas (frío). No hay una carga real de GPU | Una corrida fría y otra caliente en el PC |
| Modo local en la interfaz y modo navegador en la web | Sí. El navegador solo cambia de camino si `/api/arqiven/status` dice `mode: local` | `web/v2/shared/ia/local-client.mjs` y `web/v2/arqiven/app.js` | VM: el código del arranque público sigue llamando a `startPrepare`. No hay función de Pages nueva para el chat | Abrir `http://127.0.0.1:4174/arqiven/` en el PC y comprobar el aviso de modelo de terceros |
| Diseño aprobado | No se cambia | Logotipo, colores, pantalla completa, «Nuevo chat» y «Chats» siguen en el HTML | VM: `test/arqiven-public.test.ts` sigue comprobando el hash del logotipo y la ausencia de cabecera de sitio | Mirada del propietario en su pantalla |
| Pruebas con Ollama simulado | Sí | `test/arqiven-local.test.ts` | VM, Node 22, suite `npm test` | CI de GitHub al abrir el PR |
| Ollama real | Si la VM puede, con un modelo pequeño, marcado como VM | `local/arqiven/integracion.mjs` | VM, no el PC del propietario. Ollama 0.40.16 en CPU, modelo `qwen3:0.6b` (522 MB). Primera respuesta en frío, primer token 1276 ms, 40 tok/s. Segunda en caliente, primer token 61 ms, 73,9 tok/s. Cancelación a mitad con código `cancelled`. No es `qwen3:8b` ni la GPU del propietario | El humo con `qwen3:8b` en el PC |
| Arranque Windows | Sí | `scripts/arqiven-local.ps1` | No ejecutado en Windows. Esta VM es Linux | El propietario, con los pasos de `arranque-windows.md` |
| Humo de latencia y cancelación | Sí | `scripts/arqiven-humo.ps1` | No ejecutado contra un Ollama real | El propietario, en su PC |
| Proyectos con carpetas, mover, renombrar y permisos | Plan en `plan-fases.md` | No | No | Fase siguiente |
| RAG con citas y abstención | Plan en `plan-fases.md` | No | No | Después de los proyectos |
| Evaluación fija de 100 casos antes de entrenar | Plan en `plan-fases.md` | No | No | Antes de cualquier entrenamiento. La referencia es el PC, no esta VM |

## Lectura corta

Implementado y probado en la VM con un Ollama simulado: el backend, la cola, el presupuesto, la cancelación, el historial y las métricas. En la misma VM, con Ollama 0.40.16 real y `qwen3:0.6b` en CPU, una respuesta en frío, otra en caliente y una cancelación a mitad. No probado en el PC del propietario: el arranque, el humo y `qwen3:8b` en la GPU. No empezado: proyectos con permisos, RAG y la evaluación de 100 casos.
