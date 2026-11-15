# Aceptación del flujo 1

Esto es lo que hay que poder hacer en el PC, de principio a fin, sin otra herramienta. Windows 11, PowerShell 5.1, Node v26, Ollama con `qwen3:8b`. No es una maqueta.

Los estados de abajo son de este commit. «Verificado en el PC» solo se escribe cuando tú lo has visto. Hasta entonces queda pendiente.

## 1. Abrir ARQIVEN

Implementado. Pendiente de verificar en el PC.

1. Descomprime el ZIP de esta rama y entra en la carpeta.
2. Ollama tiene que estar en marcha (`ollama list` muestra `qwen3:8b`).
3. Doble clic en `scripts\arqiven-abrir.cmd`.
   También vale, en PowerShell:

```text
powershell -ExecutionPolicy Bypass -File .\scripts\arqiven-local.ps1 -Abrir
```

4. Tiene que abrirse el navegador en `http://127.0.0.1:4174/arqiven/`.
5. La ventana de PowerShell se queda abierta. Esa ventana es el servidor. No la cierres todavía.
6. En la pantalla: logotipo de ARQIVEN, «Nuevo chat», «Chats», sin la cabecera del sitio.
7. Debajo del cuadro de escritura, una línea con el modelo. Tiene que nombrar `qwen3:8b`, la cuantización si Ollama la da (en este PC, Q4_K_M), los primeros caracteres del digest, `ctx 4096`, `salida 1024`, `temp 0.2`, `think no`, la versión de Ollama y `mitigado2`.

Si el puerto 4174 ya tenía un ARQIVEN viejo, el script lo para y lo dice. Si lo ocupa otro programa, se detiene y no lo mata.

## 2. Conversar y recuperar el chat

El guardado en disco está verificado en el PC (verificador 8/8, 15-11-2026 19:45). Abrir el navegador con el acceso directo y ver el mismo chat después de reiniciar el PC está pendiente.

1. Escribe una frase, por ejemplo «Di solo la palabra mesa», y envíala.
2. Tiene que aparecer una respuesta. No hace falta que sea larga.
3. En «Detalles» de esa respuesta, la ficha del modelo: nombre, digest, cuantización, ctx, salida, temperatura, think, versión de Ollama y `mitigado2`.
4. Cierra la ventana de PowerShell. El navegador deja de poder pedir otra respuesta.
5. Vuelve a abrir con `arqiven-abrir.cmd`.
6. En «Chats» sigue el chat. Ábrelo. La frase y la respuesta siguen ahí, y los detalles siguen mostrando la ficha con la que se generó, no la de un arranque posterior.
7. El archivo está en `%LOCALAPPDATA%\ARQIVEN\local\history.json`.
8. Cada respuesta añade una línea en `%LOCALAPPDATA%\ARQIVEN\local\runs.jsonl` con la misma ficha, sin el texto del chat.
9. Reinicia el PC, abre otra vez el acceso directo y comprueba que el chat sigue. Este reinicio del PC no está verificado todavía.

## 3. Stop y errores que se entienden

La cancelación, Ollama apagado, el modelo ausente y el tiempo de espera están probados en la VM con un Ollama simulado. El texto en la pantalla de este PC está pendiente.

1. Envía una pregunta larga. Mientras escribe, pulsa Stop. La generación se corta, el botón deja de estar activo y puedes enviar otra cosa. No se queda «en espera» para siempre.
2. Cierra Ollama (sal de la aplicación, no solo de la ventana del chat). Envía un mensaje. La respuesta tiene que decir que Ollama no responde en este equipo, no un código suelto.
3. Abre Ollama otra vez. Si quitas el modelo (`ollama rm qwen3:8b` solo si vas a volver a descargarlo), el mensaje dice que el modelo no está descargado y que es de terceros. Vuelve a dejar `qwen3:8b` antes de seguir.
4. Si el texto no cabe en el contexto, la pantalla dice que la conversación no cabe y que acortes o abras un chat nuevo. No dice solo «budget».
5. Si la petición tarda más del tiempo de espera, dice que superó el tiempo. En la VM el corte está probado. En el PC, con el modelo ya cargado, puede que no llegues a verlo: no hace falta forzarlo si lo demás va bien.
6. Cierra la ventana de PowerShell con el chat abierto y envía un mensaje. Tiene que decir que el backend de ARQIVEN no responde en este equipo.

## 4. Qué modelo responde

Implementado. Pendiente de verificar en el PC.

La línea bajo el cuadro y los «Detalles» de cada respuesta tienen que coincidir con lo que Ollama declara:

- nombre: `qwen3:8b`
- digest: el de `ollama show qwen3:8b`
- cuantización: la de esa ficha
- ctx 4096, salida 1024, temp 0.2, think no
- versión de Ollama (`ollama --version`)
- pipeline: `mitigado2`

Esa ficha queda en el mensaje del historial y en `runs.jsonl`. Una respuesta vieja no cambia de ficha porque rearranques.

## Qué no es este flujo

No entrena. No publica orvupi.com. No abre el puerto 11434. `qwen3:8b` sigue siendo un modelo de terceros.
