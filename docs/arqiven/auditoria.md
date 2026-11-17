# Auditoría de ARQIVEN

Fecha de la lectura: 15 de noviembre de 2026. Punto de partida: rama `cursor/arqiven-conversacion-v1`, commit `57fda94c` (PR #165, borrador). Esta nota describe lo que hay y el plan que ejecuta el backend local. No despliega orvupi.com y no fusiona a `main`.

## Qué es hoy

ARQIVEN es la interfaz de IA de ORVUPI en `/arqiven/` (y en `/en/`, `/pt-br/`, `/ja/`, `/ko/`). La página es una aplicación a pantalla completa: logotipo oficial, azul marino, blanco y grises, fucsia solo en la acción principal, sin cabecera de sitio. El texto visible dice que no hay un modelo propio.

El propietario, en su PC, tiene Ollama 0.40.16 con `qwen3:8b` Q4_K_M. Esa máquina no tiene Git, Node ni Python. La prueba que hizo (~134 tok/s) solo valida una inferencia local de 8B, con `num_ctx` 4096 y una petición. No valida la aplicación.

## Pila

| Capa | Qué usa |
| --- | --- |
| Sitio | HTML, CSS y JS estáticos en `web/v2/`. Cloudflare Pages (`_headers`, `_redirects`, `functions/`). |
| Herramientas | Node 22.14.0 (`.nvmrc`). TypeScript solo para comprobar y compilar pruebas. `package.json` no tiene dependencias de ejecución. |
| Interfaz ARQIVEN | `web/v2/arqiven/index.html`, `app.js`, `app.css`. Los otros idiomas reutilizan `app.js` por reescritura. |
| Motor del navegador | `web/v2/arqiven/engine-worker.mjs` y `web/v2/shared/ia/`. Transformers.js 4.3.1 y ONNX Runtime WASM, ambos desde jsDelivr. Pesos desde Hugging Face. |
| Modelo por defecto en la web | `onnx-community/Qwen3.5-0.8B-Text-ONNX`, cuantizado q4, id `qwen35-cpu`. Si hay poca memoria, SmolLM2-135M. Con WebGPU puede elegir Qwen2.5. |
| Contrato | `web/v2/shared/ia/contract.mjs`. Un id `arqiven-*` no se anuncia como modelo propio mientras no exista un checkpoint. |
| Funciones de Pages | Sonar y una ruta de imagen. No hay un proxy de chat. |

## Cómo se ejecuta hoy

```text
npm ci
npm run typecheck
npm test
npm run test:ui
```

La web pública no tiene proceso de Node: Pages sirve `web/v2/`. En local, las pruebas de interfaz usan `test/ui/static-server.mjs`.

Evaluaciones que ya existen y no forman parte de la CI de cada push:

```text
node eval/arqiven/run-baseline.mjs
node eval/arqiven/conversacion/run.mjs <repo> <dtype> <legacy|v1>
node scripts/build-arqiven-index.mjs
```

## Pruebas que ya cubren ARQIVEN

- `test/arqiven-engine.test.ts`: catálogo de terceros, COOP/COEP, parada del worker, tope de tokens.
- `test/arqiven-knowledge.test.ts`: fichas, cálculo, índice, chats en IndexedDB, votos.
- `test/arqiven-public.test.ts`: logotipo, ausencia de cabecera de sitio, contrato honesto.
- `test/ui/arqiven.spec.mjs` y `test/ui/arqiven-model.spec.mjs`: Playwright sobre el modo navegador.

No había pruebas de Ollama, de cola en un servidor ni de historial en disco.

## Almacenamiento

Todo el chat de la web vive en el navegador:

- IndexedDB `orvupi-arqiven-chats` (conversaciones, proyectos, imágenes).
- IndexedDB `orvupi-arqiven-settings` (modelo elegido).
- IndexedDB de votos.
- Guardar en Work escribe en IndexedDB `orvupi-work` de ese dispositivo.
- Los pesos del modo navegador quedan en la caché del motor (OPFS / caché de Transformers.js).

No hay base de datos de servidor ni sesión. Un reinicio del navegador conserva esos almacenes; un reinicio de un proceso de servidor no existía, así que no había historial de servidor que conservar.

## Autenticación

No hay cuentas. La propia pantalla lo dice: «Sesión de este navegador. No es una cuenta.» No hay cookies de acceso ni usuarios de ARQIVEN.

## Integración de IA

Modo navegador, el que ve orvupi.com:

1. La interfaz prepara un worker.
2. El worker descarga Transformers.js y el WASM desde jsDelivr, y los pesos desde Hugging Face.
3. La generación es local a la pestaña. Detener usa una señal en memoria compartida y, si no confirma, recrea el worker.
4. Antes del modelo, la app resuelve fichas verificadas de ORVUPI, un cálculo local y rechazos (consejo financiero, identidad, direcciones ajenas).
5. Una pregunta de definición puede consultar Wikipedia. Esa consulta envía la pregunta, no un documento de Work.
6. Qwen3.5 puede desactivar el pensamiento con `chat_template_kwargs.enable_thinking: false` dentro del worker. No es Ollama.

Orígenes de red del modo navegador, en la CSP de `/arqiven/`: el propio sitio, Hugging Face, jsDelivr y Wikipedia. No hay OpenAI, Anthropic ni otra API de chat.

`functions/api/arqiven/image.js` puede llamar a Workers AI (`flux-1-schnell`) solo si el sitio tiene el enlace `AI`. Sin ese enlace responde apagado. Esta fase no lo enciende y el backend local responde `{ enabled: false }`.

No hay túnel ni proxy hacia el Ollama del propietario. El puerto 11434 no lo abre esta aplicación.

## Marca

- Logotipo publicado: `web/v2/assets/arqiven/logo-oficial.png`. SHA256 `f0b8294692096b5d81151e1702e22fdfbe686a535e8cd834c72323af0000812b`. La misma hoja está en `docs/orvupi-ia/assets/`.
- Iconos: `web/v2/arqiven/favicon-32.png` y `icon-192.png`.
- Colores de la app: tinta `#102033`, fondo blanco, grises de línea y texto secundario, acento `#fc2d63`, botón principal `#b3124d`.
- Cromo que se conserva: pantalla completa, sin cabecera ORVUPI, «Nuevo chat», «Chats».

## Entorno del propietario

Dato entregado el 15 de noviembre de 2026, no medido de nuevo desde esta VM:

- Windows 11 Pro, i7-14700KF, 32 GB DDR5, RTX 5070 Ti 16 GB, driver 621.24.
- Ollama 0.40.16 en `http://localhost:11434`.
- Modelo `qwen3:8b`, Q4_K_M, digest `500a1f067a9f782620b40bee6f7b0c89e17ae61f686b92c24933e4ca4b2b8b41`, contexto nativo 40960.
- Prueba suya: ~134 tok/s con `think=false`, `num_ctx=4096`, `num_predict=1024`, temperatura 0.2, una petición.

Esa cifra no se copia como resultado de ARQIVEN.

## Plan de cambios

Se añade un proceso local, sin dependencias npm, porque en el PC no hay Git ni Python y Node LTS se instala con el instalador de Windows. El historial va a JSON con escritura temporal y rename: no hace falta compilar SQLite.

```text
navegador en /arqiven/
        |
        | si GET /api/arqiven/status no existe -> modo navegador (la web pública)
        | si responde mode=local              -> modo local/Ollama
        v
backend en 127.0.0.1:4174
        |
        | sirve web/v2
        | cola de una petición
        | recorta el historial para que quepa en num_ctx
        v
Ollama ya abierto en 127.0.0.1:11434
```

Decisiones cerradas:

- `think: false` va en el JSON de `/api/chat`, no como texto `/no_think`.
- `num_ctx` 4096 es la ventana entera. La entrada útil queda en 2816 tokens estimados (4096 − 1024 de salida − 256 de reserva de plantilla).
- Concurrencia 1. La segunda petición recibe `en espera` y se puede cancelar.
- Cancelar aborta la petición HTTP a Ollama y suelta el hueco.
- Tiempo de espera, tope de 256 KiB por cuerpo y mensajes de Ollama apagado, modelo ausente, tiempo agotado y cancelado.
- Regenerar quita la última respuesta y pide otra.
- El historial de los turnos del modo local se escribe en disco y se vuelve a leer al abrir el proceso.
- Cada cierre guarda carga, prefill (`prompt_eval`), generación (`eval`), tiempo hasta el primer token y el error. Frío si `load_duration` supera 50 ms; si no, caliente.
- El proceso escucha solo en 127.0.0.1. Rechaza otro host, el puerto 11434 y un Ollama que no sea de loopback.
- Un archivo adjunto entra como dato no confiable, entre marcas, y no como instrucción.
- `qwen3:8b` se nombra como modelo de terceros. No se presenta como Arqiven-N.

Lo que no entra en esta fase: carpetas de proyecto con permisos, RAG con citas y abstención, y la evaluación fija de 100 casos. El detalle está en [plan-fases.md](plan-fases.md).
