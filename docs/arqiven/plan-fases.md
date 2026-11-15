# Fases siguientes de ARQIVEN

La fase local (interfaz, backend en 127.0.0.1, Ollama, cola, historial y métricas) está en el código. Los proyectos locales —crear, renombrar, mover chats, reabrir y permisos— también. Siguen fuera las carpetas anidadas, el RAG y la evaluación fija. El orden importa: no se entrena nada antes de esa evaluación.

## Fase de proyectos

En el modo local, los proyectos viven en el mismo `history.json` que los chats (versión 2; un archivo de la versión 1 se lee y no pierde mensajes). Crear, renombrar un proyecto o un chat, mover un chat y borrar un proyecto pasan por el backend. Borrar un proyecto devuelve sus chats al historial general. Reabrir es `GET /api/arqiven/projects/:id`. El modo navegador sigue en IndexedDB.

El usuario es de este equipo (`x-arqiven-user` o `ARQIVEN_USER`, si no, `local`). No hay cuenta de orvupi.com.

Objetivo: un proyecto es una carpeta de este equipo, con chats dentro, y cada acción comprueba quién puede hacerla.

Datos, en el mismo directorio del historial (`history.json` o un `projects.json` hermano, escritura atómica):

- Proyecto: `id`, `name`, `created`, `updated`.
- Carpeta: `id`, `projectId`, `parentId` (vacío si es la raíz), `name`.
- Conversación: el registro actual más `projectId` y `folderId`.
- Miembro: `projectId`, `userId`, `role`.

En esta máquina el usuario inicial es uno solo, el de Windows. El `userId` es un identificador local, no una cuenta de orvupi.com. No se añade un servicio de login.

Roles mínimos:

| Acción | dueño | editor | lector |
| --- | --- | --- | --- |
| Ver chats y carpetas | sí | sí | sí |
| Escribir en un chat | sí | sí | no |
| Crear, mover y renombrar carpetas y chats | sí | sí | no |
| Borrar | sí | no | no |
| Cambiar miembros | sí | no | no |

Mover y renombrar cambian `folderId` o `name` y la fecha. No se copia el texto dos veces. Borrar un proyecto quita sus carpetas y deja los chats en el historial general, que es lo que ya hace la interfaz, o pide confirmación si se van a eliminar. Hay que elegir una de las dos y probarla; no las dos a la vez.

La interfaz ya tiene la vista Proyectos. El trabajo es hacer que, en modo local, lea y escriba el disco a través del backend (`GET/POST /api/arqiven/projects` y carpetas). El modo navegador puede seguir en IndexedDB hasta que se decida migrar. No se cambia el cromo: mismos nombres «Proyectos», «Chats», «Nuevo chat».

Pruebas antes de darla por hecha: crear, renombrar, mover a otra carpeta, reiniciar el proceso y ver el mismo árbol, y un lector que no puede borrar.

## Fase de RAG

Hoy hay un índice estático (`web/v2/arqiven/knowledge-index.json`) y fichas verificadas. Wikipedia se consulta solo en definiciones. No hay un corpus del usuario ni una regla de abstención uniforme para el modelo de 8B.

Objetivo: responder con citas cuando la pregunta depende de documentos del proyecto, y decir que no consta cuando no hay soporte.

Límites:

- Los documentos son datos no confiables. El texto recuperado entra en el mismo bloque `[documento no confiable]` que ya usa el backend. No se ejecuta.
- Cada frase que afirme un dato del corpus cita el título y un identificador del fragmento. Si el fragmento no contiene el dato, la respuesta es una abstención («no consta en los documentos de este proyecto»), no una suposición.
- El cálculo local y las fichas verificadas de ORVUPI siguen ganando al modelo: no se pide a Ollama un contrato o una operación que ya resuelve el código.
- El presupuesto no cambia de forma: los fragmentos cuentan dentro de los 2816 tokens de entrada. Si no caben, se recortan los más lejanos, no se sube `num_ctx` por sorpresa.
- No se envía el corpus a un servicio externo. El índice vive en el disco del equipo.

Orden de construcción: formato de fragmento (id, título, texto, origen), recuperación local sin red, cita en la respuesta, prueba de abstención con una pregunta cuya respuesta no está en los fragmentos, y solo después conectar la vista de un proyecto.

## Fase de evaluación

No se entrena ni se ajusta `qwen3:8b` antes de una evaluación fija.

Conjunto: 100 casos escritos de antemano, guardados en el repositorio (por ejemplo `eval/arqiven/fijo/casos.jsonl`), con id estable. Cada caso tiene pregunta, idioma, tipo (dato de ORVUPI, cálculo, abstención, seguimiento de chat, documento no confiable) y una comprobación automática. No se reescriben los casos para que el modelo quede bien.

Regla de pase, propuesta para cuando se ejecute:

- Cero fallos en contrato oficial, consejo financiero e identidad (los críticos que ya cubre el banco actual).
- El cálculo local sigue resolviendo las operaciones del caso sin pasar por el modelo.
- La abstención se cuenta como acierto cuando el caso dice que el dato no está.
- Se anota, por caso, el modelo, `think`, `num_ctx`, tok/s y si la corrida fue en frío o en caliente.

La corrida de referencia es el PC del propietario, con `qwen3:8b` y Ollama 0.40.16. Una corrida en la VM, si llega a hacerse con un modelo más pequeño, se etiqueta aparte y no sustituye a esa referencia. Hasta que esa tabla exista y el propietario la acepte, no hay entrenamiento ni LoRA.

## Fuera de estas fases

No se despliega a orvupi.com, no se fusiona a `main` desde aquí, no se contrata un API de terceros y no se suben pesos al repositorio.
