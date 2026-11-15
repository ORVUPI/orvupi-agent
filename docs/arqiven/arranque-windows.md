# Arrancar ARQIVEN en el PC del propietario

El PC no tiene Git, Node ni Python. Ollama ya está instalado y el modelo `qwen3:8b` ya está descargado. No hace falta volver a bajar los pesos ni instalar Python. Esta guía no abre el puerto 11434 y no crea un túnel.

El backend escucha solo en `127.0.0.1`. La página queda en este equipo. No es orvupi.com.

## 1. Instalar Node.js 22 LTS

1. Abre https://nodejs.org/ y descarga el instalador de Windows de la rama 22 LTS (x64).
2. Instálalo con las opciones por defecto. No marques herramientas nativas ni Python si el instalador las ofrece: este backend no las usa.
3. Cierra PowerShell si estaba abierta y abre una nueva.
4. Comprueba:

```text
node -v
```

Tiene que decir `v22` o una versión mayor. Si dice que no reconoce `node`, el instalador no quedó en el PATH: cierra la ventana y ábrela otra vez.

## 2. Traer el código sin Git

En el navegador, descarga el ZIP de la rama (cuando el PR exista, usa esa rama; si no, el ZIP del commit que te indiquen):

```text
https://github.com/ORVUPI/orvupi-agent/archive/refs/heads/cursor/arqiven-ollama-local-8c6d.zip
```

Descomprime el ZIP. Entra en la carpeta `orvupi-agent-cursor-arqiven-ollama-local-8c6d`. No ejecutes `npm install`: el servidor no tiene dependencias.

## 3. Comprobar Ollama

Ollama tiene que estar en marcha, como ya lo usas. En PowerShell:

```text
ollama list
```

Tiene que aparecer `qwen3:8b`. Si la lista falla, abre la aplicación de Ollama y espera a que diga que está en ejecución. No cambies el puerto: sigue en `http://127.0.0.1:11434`.

## 4. Arrancar la interfaz

Desde la carpeta descomprimida:

```text
powershell -ExecutionPolicy Bypass -File .\scripts\arqiven-local.ps1
```

La ventana se queda ocupada. Eso es el servidor. Abre el navegador en:

```text
http://127.0.0.1:4174/arqiven/
```

Qué tienes que ver:

- La misma pantalla de ARQIVEN (logotipo, «Nuevo chat», «Chats»), sin la cabecera del sitio.
- En Ajustes, la línea «Modo local/Ollama» y el aviso de que `qwen3:8b` es un modelo de terceros.
- Al enviar un mensaje, la respuesta sale de Ollama. Si mandas otro mientras el primero no ha terminado, el estado dice `en espera`.
- Detener corta la respuesta y deja libre la cola.
- En la última respuesta, «Regenerar» pide otra vez la misma pregunta.

El historial queda en `%LOCALAPPDATA%\ARQIVEN\local\history.json`. Cierra la ventana del servidor, vuelve a arrancarlo y el chat sigue ahí.

Si Ollama está cerrado, el mensaje dice que no responde en `127.0.0.1:11434`. Si el modelo no está en `ollama list`, dice que no está descargado.

## 5. Humo de latencia y cancelación

Con Ollama en marcha, en otra ventana de PowerShell y en la misma carpeta:

```text
powershell -ExecutionPolicy Bypass -File .\scripts\arqiven-humo.ps1
```

Eso hace dos cosas contra tu Ollama:

1. Una respuesta corta (`num_predict` 64, `think` false, `num_ctx` 4096, temperatura 0.2) e imprime el tiempo hasta el primer token, los tokens y los tok/s que calcula Ollama con `eval_count` y `eval_duration`.
2. Otra generación que se cancela al llegar el primer fragmento.

No es la prueba de ~134 tok/s. Aquella usaba `num_predict` 1024. Para repetir ese largo:

```text
powershell -ExecutionPolicy Bypass -File .\scripts\arqiven-humo.ps1 -Completa
```

Si además quieres pasar por el backend (con la ventana del paso 4 todavía abierta):

```text
powershell -ExecutionPolicy Bypass -File .\scripts\arqiven-humo.ps1 -Backend "http://127.0.0.1:4174"
```

## Qué no hace este arranque

- No instala Ollama ni baja `qwen3:8b`.
- No abre el 11434, no cambia el firewall y no publica la página.
- No llama a una API de pago ni a Hugging Face para el modo local. El modo navegador, si pulsas «Reintentar» en Ajustes, sigue pudiendo descargar el modelo pequeño de la web; no es necesario para usar Ollama.
