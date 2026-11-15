# ARQIVEN — Encargo de ejecución y primera entrega
**Fecha:** 15/11/2026.  
**Estado:** instrucciones para aplicar; no certifican trabajo implementado.  
**Uso:** adjuntar a los agentes junto con la hoja de ruta y las instrucciones técnicas existentes.

## 1. Encargo para los agentes

Aplicad la idea de ARQIVEN al proyecto existente mediante resultados comprobables. Leed primero las instrucciones del repositorio y los tres documentos facilitados. La hoja de ruta define la dirección de producto e investigación; las instrucciones técnicas describen el entorno observado; este encargo concreta la primera entrega.

Empezad por auditar el código y reproducir su funcionamiento. Reutilizad lo que funcione y desarrollad en una rama o copia aislada. Registrad dependencias, datos, integración del modelo y pruebas disponibles. No sustituyáis toda la aplicación sin justificar la necesidad.

Objetivo inmediato: establecer una referencia de calidad y entregar el primer recorrido completo entre el chat ARQIVEN, su backend y el modelo local, con persistencia, gestión de errores y mediciones. La primera tarea de producto propuesta es responder sobre un conjunto pequeño de documentos aprobados con citas comprobables; se desarrollará después de validar el recorrido básico.

Trabajad de forma autónoma en las tareas locales y reversibles del encargo para las que tengáis acceso. No os detengáis a pedir confirmación por cada decisión rutinaria. Si falta un acceso material, describidlo exactamente y continuad con lo que sea independiente. Los pasos que dependan de una autorización expresa permanecerán pendientes.

La aspiración a AGI orienta la investigación a largo plazo. No constituye una función implementada, un plazo ni una promesa de resultado. Identificad siempre el modelo base y la contribución propia.

## 2. Material que debe acompañar el encargo

| Material | Qué facilitar | Para qué |
|---|---|---|
| Hoja de ruta | ARQIVEN_Hoja_de_Ruta_Investigacion_y_Financiacion_2026-11-15.md | Dirección, hitos y criterios de inversión |
| Instrucciones técnicas | ARQIVEN_Instrucciones_Agentes_2026-11-15.md | Hardware observado, parámetros, límites y especificación |
| Este encargo | ARQIVEN_Encargo_Ejecucion_Agentes_2026-11-15.md | Alcance y aceptación de la primera entrega |
| Código actual | Repositorio autorizado y rama, o copia completa del proyecto | Auditar y aplicar cambios reales |
| Estado visible | URL o forma de arranque, capturas de fallos y pasos para reproducirlos | Contrastar interfaz y comportamiento |
| Fuentes documentales | Una colección pequeña de documentos aprobados y su procedencia | Construir y verificar la recuperación documental |
| Identidad | Logotipo y activos aprobados o su ruta verificada en el proyecto | Conservar la marca sin inventar recursos |
| Ejemplos de uso | Diez consultas representativas, con respuesta o criterios de corrección revisados | Precisar qué significa una respuesta útil |
| Acceso de ejecución | Qué agente puede ejecutar comandos en el PC y cuál trabaja remotamente | Atribuir correctamente las pruebas |

Los enlaces privados de un chat no garantizan acceso a otro agente. Adjuntar los archivos o dejarlos en una ubicación del proyecto que los agentes puedan leer. No solicitar contraseñas ni claves en texto dentro de la conversación: utilizar los mecanismos de acceso y secretos del entorno.

Ficha de entrada, completada el 15/11/2026 tras inspeccionar el repositorio. La hoja de ruta ya está en `docs/arqiven/encargo/` (commit `ee85e41`). No se inventan rutas.

- Repositorio o carpeta: `ORVUPI/orvupi-agent`.
- Rama de trabajo: `cursor/arqiven-ollama-local-8c6d`, pull request #166. La #167, de marca y datos, está aparte y en borrador.
- Comandos de arranque observados: `scripts\arqiven-abrir.cmd`.
- URL de desarrollo, si existe: `http://127.0.0.1:4174/arqiven/`.
- Agente o proceso con ejecución en Windows: Meme IA · ORVUPI, desde la consola del PC del propietario. El agente de esta rama trabaja en remoto y no ejecuta nada en ese PC.
- Documentos autorizados para la primera tarea: los dieciocho de `docs/arqiven/conocimiento/` en el pull request #167, pendientes de la revisión del propietario, y los dos de esta rama, `despido-baja.md` e `higiene-sueno.md`.
- Activos de marca verificados: `web/v2/assets/arqiven/logo-oficial.png`, usado en `web/v2/arqiven/index.html` como `/assets/arqiven/logo-oficial.png`.
- Problema actual reproducible: «como ves las inversiones hoy». Antes la respuesta despachaba al usuario. En el PC, el código que sigue abierto para esa pregunta es `a6ca0ab`, porque la regla de aceptación pedía que la respuesta cumpliera entera.

Resolver los campos inspeccionando el proyecto antes de pedir información que ya esté disponible. No inventar rutas o accesos.

## 3. Primera entrega: orden de trabajo

### A. Auditoría reproducible

Identificar frontend, backend, almacenamiento, autenticación, modelos y proveedores utilizados. Determinar qué existe, qué es una simulación y qué está incompleto. Registrar el commit o estado inicial y preservar cambios previos del propietario.

Entregar instrucciones verificadas de arranque y un mapa breve de los archivos relevantes. No entregar únicamente una propuesta de reescritura.

### B. Inferencia local y conexión

Conservar Qwen3 8B en Ollama como referencia inicial, no como selección definitiva de producción. Verificar versiones y parámetros actuales: el registro del 15/11/2026 es una observación histórica, no una inspección nueva.

La referencia anterior usó contexto 4096 y concurrencia 1. Respetar el presupuesto total de contexto y registrar cualquier modificación. Verificar respuesta real, modelo utilizado y cancelación; tratar desconexiones y tiempos de espera.

Distinguir los entornos. El localhost de un servidor remoto apunta a ese servidor; no proporciona acceso al PC del propietario. Para el primer recorrido, preferir desarrollo local. Si el agente está en otro equipo, podrá preparar código y comprobaciones, pero deberá indicar cuáles faltan por ejecutar en Windows.

### C. Chat mínimo persistente

Entregar un chat utilizable con envío de consulta, respuesta visible, cancelación, error comprensible e historial que se conserve tras reiniciar. Preservar el diseño aprobado e independencia visual de ARQIVEN.

Mantener las funciones adicionales en una lista ordenada. La generación de imágenes, el despliegue público y el entrenamiento quedan fuera de esta primera entrega. La recuperación documental será el siguiente incremento después de validar el recorrido básico.

### D. Evaluación antes de ajustar

Preparar el catálogo inicial de 100 casos de la hoja de ruta con rúbricas y procedencia. Separar desarrollo y evaluación final antes de usar resultados para ajustar; mantener los ejemplos de entrenamiento en otro conjunto.

Ejecutar los casos aplicables a las capacidades existentes y registrar qué casos están pendientes por funciones aún no implementadas. No presentar una prueba parcial como una evaluación completa de 100 casos. Una muestra pequeña puede validar el funcionamiento del evaluador, pero no acredita calidad general.

Guardar respuestas y métricas reales, con versión del código, modelo y entorno. Establecer la referencia antes de cambiar instrucciones o entrenar. Las respuestas esperadas generadas por IA necesitan revisión; no utilizarlas como verdad solo porque las produzca otro modelo.

## 4. Comprobaciones de aceptación

Cada fila debe incluir resultado, evidencia y entorno real de ejecución.

| Comprobación | Condición de aceptación |
|---|---|
| Arranque | Los pasos documentados arrancan la versión entregada |
| Inferencia | El chat obtiene una respuesta del modelo identificado, sin sustituirla por una simulación |
| Persistencia | Una conversación se conserva al reiniciar la aplicación |
| Cancelación | La petición se cancela de forma controlada y el chat sigue utilizable |
| Fallo del motor | Al detener el servicio del modelo aparece un error claro y recuperable |
| Configuración | Modelo, parámetros y versiones quedan registrados; no se exponen secretos |
| Evaluación | Casos, rúbricas, particiones y resultados ejecutados son trazables |
| Entorno | Las pruebas remotas y las realizadas en el PC están separadas |
| Reversión | Se documenta cómo volver al estado anterior sin perder datos del usuario |

Cuando exista autenticación con varios usuarios, comprobar aislamiento de conversaciones. Si solo existe un prototipo de un usuario, declararlo y no presentarlo como servicio multiusuario validado.

En el siguiente incremento documental se añadirán comprobaciones de citas correctas, abstención cuando falte información y recuperación limitada a los documentos permitidos. Preparar estas pruebas ahora no significa que la función ya funcione.

Una entrega que falle no se presentará como aprobada. Registrar causa y siguiente acción. Las pruebas de aceptación funcionales tampoco certifican AGI o calidad general.

## 5. Autonomía y límites de ejecución

Este encargo cubre inspección del proyecto, cambios reversibles en desarrollo, documentación y pruebas pertinentes dentro del acceso concedido. Las decisiones rutinarias autorizadas se ejecutarán y se explicarán.

Solicitar autorización expresa antes de gastos, contratación, publicación, despliegue público, envío de mensajes o datos privados a terceros, borrados destructivos y cambios de firmware. No interpretar la ambición del proyecto como permiso general para esas acciones.

No abrir servicios locales a Internet para solventar una conexión de desarrollo. No utilizar una API de pago de forma silenciosa. Registrar toda dependencia externa ya existente y respetar los permisos concedidos.

Una ampliación de hardware o nube deberá responder a un problema reproducible y traer una estimación del siguiente experimento. No añadir gastos por anticipado.

## 6. Entregables que deben quedar en el repositorio

Adaptar los nombres a la estructura existente; no duplicar documentación equivalente:

- Un registro del estado inicial, arquitectura y pendientes.
- Instrucciones de instalación y arranque que se hayan ejecutado.
- Código del recorrido mínimo e historial persistente.
- Configuración de ejemplo sin secretos.
- Catálogo de evaluación, rúbricas y procedimiento de ejecución.
- Resultados reales, con errores y pruebas pendientes claramente separados.
- Registro de decisiones: problema, alternativa elegida, motivo y evidencia.
- Procedimiento de reversión y tratamiento de datos.
- Plan del siguiente incremento documental y de la primera comparación experimental.

Conservar resultados de referencia. No seleccionar solo el mejor intento ni ocultar regresiones para mejorar el informe.

## 7. Formato de informe

| Elemento | Estado | Evidencia | Entorno | Pendiente |
|---|---|---|---|---|
| Ejemplo de fila a completar | Propuesto / implementado / verificado / bloqueado | Archivo, prueba o resultado real | PC, contenedor o servidor identificado | Acción concreta |

Incluir al final:

1. Qué cambió y por qué.
2. Qué pruebas se ejecutaron, cuáles fallaron y cuáles faltan.
3. Qué capacidad pertenece al modelo base y qué aporta ARQIVEN.
4. Límites de calidad, rendimiento y acceso.
5. Próximo paso con su criterio de aceptación.
6. Decisión pendiente del propietario, solo si es material.

Una captura acredita lo que muestra; no demuestra por sí sola persistencia, backend o entrenamiento. Ningún resultado ficticio o ejecutado en otro entorno se atribuirá al PC.

## 8. Cierre de la primera entrega

El resultado esperado es un proyecto reproducible, un recorrido mínimo funcional y una referencia de evaluación. Después se incorporará la recuperación documental y se probará la hipótesis de mejora descrita en la hoja de ruta.

El agente debe continuar el trabajo autorizado hasta completar la entrega o identificar un bloqueo material. Si hay bloqueo, entregar los cambios, pruebas y documentación que sí haya podido realizar.

Las discrepancias entre documentos se resolverán distinguiendo dirección estratégica, especificación técnica y alcance inmediato. Las observaciones históricas se contrastarán con el estado actual. Si una discrepancia cambia una autorización o una decisión material, comunicarla con precisión; no inventar permiso ni resolverla ocultamente.

**Este documento concreta el primer paso. Aplicarlo correctamente requiere acceso al proyecto, ejecución real y revisión de resultados; ningún mensaje por sí solo garantiza una implementación perfecta.**

