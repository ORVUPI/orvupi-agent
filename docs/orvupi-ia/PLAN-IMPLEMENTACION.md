# Plan de la primera implementación

La pantalla `/arqiven/` ya está publicada. Esta rama conecta el motor de terceros de Work (SmolLM2, Qwen, LFM2) por el contrato. Sin preparación, la respuesta sigue siendo `provider: "none"` y `modelId: "none"`. No hay checkpoint Arqiven-1 y no hay despliegue en esta rama.

## Hecho en esta revisión

El propietario autorizó la ruta. Estas filas sustituyen el plan de «todavía no copiar»:

| Pieza | Estado |
| --- | --- |
| `<nav class="site">` y `details.mapa` | ARQIVEN justo después de Work, y también después de Studio en el mapa. 110 páginas ya existentes, más las cinco de `/arqiven/`. El rótulo no se traduce. `aria-current="page"` solo en esas cinco. |
| `/arqiven/` y `/en/`, `/pt-br/`, `/ja/`, `/ko/` | Interfaz usable. Saludo, caja, herramientas, chips y barra lateral. Sin respuestas de la maqueta. |
| Logotipo | `web/v2/assets/arqiven/logo-oficial.png` con el mismo SHA256. Favicon 32 y 192 salen de la variante 3. |
| Contrato | `web/v2/shared/ia/contract.mjs` y `apps/work/src/ai/contract.ts` más `client.ts`. `arqiven-core` queda encendido salvo `localStorage` `0`. |
| Studio | El chat del catálogo sigue siendo determinista. El gancho vacío no sustituye el texto. El rail de frases se llama «Textos rápidos». La espera dice «Buscando en el catálogo…». |
| Puente | «Guardar en Work» crea una nota nueva (`orvupi-note` v1) y avisa por `BroadcastChannel("orvupi-work")`. No reescribe una nota anterior. |
| Sitemap | Cinco URL, porque la ruta ya está autorizada. Sigue sin desplegarse. |
| CSP | `/arqiven/` puede conectar con Hugging Face y jsDelivr, los mismos orígenes que Work, solo para pesos y WASM. `/*` sigue en `connect-src 'self'`. Studio no se abre. |

`arqiven-central` no es una clave de `localStorage`: la ruta es la página. Para quitarla del árbol, se revierten estos commits. `arqiven-core` en Work vuelve al camino anterior en cuanto la clave no es `1`. No se borran `engine.ts`, `hybrid.ts`, `worker.ts` ni `download.ts`.

Lo que sigue debajo es el plan con el que se preparó la fase. Donde diga que la pantalla aún no se copia, manda esta sección.

## Flag y reversión

| Flag | Dónde | Defecto | Efecto |
| --- | --- | --- | --- |
| `preview=1` en la query | `docs/orvupi-ia/prototipo/index.html` | apagado | Enseña el esqueleto, con la barra del sitio y el ítem ARQIVEN. Sin el parámetro, la página dice que ARQIVEN no está activada. |
| `arqiven-central` | Aún no existe en la web | apagado | Cuando se cree, `/arqiven/` y el `<li>` de `<nav class="site">` no entran en el sitemap hasta que el propietario autorice la publicación. |
| `arqiven-core` | Aún no existe en Work | apagado | El envoltorio del contrato se prueba en unidad. Las pantallas siguen llamando a `AiStudio` hasta que el flag se encienda en una rama de prueba. |

Reversión de esta entrega: revertir el commit. No cambia `web/v2/`, no cambia el motor y no hay servicio que apagar.

Reversión de la fase siguiente, cuando exista el envoltorio:

1. Dejar `arqiven-core` en falso. `AiStudio` vuelve a ser el único camino de la pantalla.
2. No borrar `engine.ts`, `hybrid.ts`, `ia-chat.mjs` ni `ai-optional.mjs` en ese paso.
3. Si se hubiera copiado una carpeta a `web/v2/arqiven/` o un ítem ARQIVEN en las 110 barras, quitarlos del árbol publicado y no añadir la ruta al sitemap. Hace falta el despliegue que el propietario autorice; esta fase no despliega.

## Archivos de la fase siguiente

Orden del encargo, sección 7. Cada fila es un cambio pequeño y reversible.

| Paso | Archivos | Qué se hace | Qué no se toca |
| --- | --- | --- | --- |
| 1. Contrato y envoltorio | `web/v2/shared/ia/contract.mjs` (nuevo), `apps/work/src/ai/client.ts` (nuevo), test en `apps/work/tests/unit/` | `run`, `cancel`, `prepare`, `capabilities` sobre el motor actual. El test usa un generador falso, sin red. | `worker.ts`, `download.ts`, catálogo |
| 2. Una sola superficie en la ventana de Work | `apps/work/src/app/App.tsx` | Si `view === "ai"`, no renderizar `aside.ow-ai`. El estado de la conversación pasa a un sitio compartido por los montajes que queden. | Lógica híbrida |
| 3. Cliente ARQIVEN de prueba | El prototipo de `docs/orvupi-ia/prototipo/`, todavía fuera de `web/v2/` | Sustituir el aviso «sin modelo» por eventos del contrato cuando el flag de prueba esté encendido. Las tareas no hechas siguen diciéndolo. El contexto de prueba usa ids de la biblioteca, no un almacén nuevo. | Sitemap, las 110 copias de `<nav class="site">`, idiomas publicados |
| 4. Studio | `web/v2/studio/lib/ia-chat.mjs`, `web/v2/studio/views.mjs`, `web/v2/studio/lib/ai-optional.mjs` | Chat marca `rules`. El rail pasa a «Textos rápidos». Se quita la espera de 1000 ms llamada «Pensando…» o se cambia el texto para que no simule un modelo. | Catálogo de plantillas, diseños guardados |
| 5. Puente con Work y Studio | `web/v2/studio/lib/work-store.mjs`, `apps/work/src/storage/db.ts` y un test con IndexedDB desechable | Comprobar ida y vuelta de un archivo de prueba. El cliente ARQIVEN lee y escribe por el mismo `WORK_DB` (`orvupi-work`, versión 1) y escucha `BroadcastChannel("orvupi-work")`. No abrir la base de un usuario real. | Versión 1 del esquema, salvo que el test demuestre una rotura. No se fusionan los hilos de chat de Work y de Studio. |
| 6. Barra, cuando se autorice | Las 110 copias de `<nav class="site">` en `web/v2/`, más `web/v2/arqiven/` y las cuatro carpetas de idioma | Insertar el ítem después de Work. El texto es ARQIVEN y no se traduce. `aria-current="page"` solo en esas páginas. El chip, si se mantiene, usa la variante 3 del logotipo. | `web/v2/sitemap.xml` hasta la autorización. `details.mapa` no sustituye a la barra. |
| 7. Logotipo publicado, en el mismo paso que la ruta | `web/v2/assets/arqiven/logo-oficial.png`, favicon de `/arqiven/` | Copiar el PNG de `docs/orvupi-ia/assets/` sin cambiar bytes: el SHA256 tiene que seguir siendo `f0b8294692096b5d81151e1702e22fdfbe686a535e8cd834c72323af0000812b`. Exportar la variante 3 a `favicon-32.png` y a un icono de 192 para `apple-touch-icon`, al modo de `/work/favicon-32.png`. La hoja entera no se usa como favicon. | No sustituir el avatar de ORVUPI ni el favicon de Work o Studio. |

La pantalla ARQIVEN no se copia a `web/v2/arqiven/` en el paso 3, y el ítem no se añade a la barra. El alojamiento real publica ese directorio. Hace falta, antes de copiarla:

- excepción CSP solo si de verdad va a descargar pesos, copiada del bloque `/work/` y no más ancha, limitada a `/arqiven/` y `/arqiven/*`;
- las cinco copias de idioma, con el rótulo ARQIVEN en todas;
- ausencia en el sitemap hasta la autorización;
- `noindex` mientras sea prueba;
- el enlace de la barra entra en el mismo cambio que la página, no antes. Hasta ese cambio no hay enlace nuevo en la portada, en Studio ni en Work.

## Qué enseñará la interfaz

- Cromo del producto: ARQIVEN. La cabecera del sitio sigue diciendo ORVUPI. Saludo «¿En qué puedo ayudarte?», caja «Pregunta lo que quieras», rosa `#FF3070` y azul `#102032`.
- Barra principal de revisión, en el mismo orden que `web/v2/index.html`, con ARQIVEN después de Work. El chip de ese ítem es la variante 3 del logotipo oficial. Es una maqueta: no navega a una ruta publicada.
- Marca lateral: icono de la variante 1 (tentáculos y «A» en el negativo) y la palabra ARQIVEN. Al contraer la barra queda el icono. El símbolo genérico anterior no se usa.
- Herramientas dentro de la caja. La acción elegida queda visible.
- Sugerencias «Crear un texto», «Analizar un documento», «Aprender algo» y «Programar» como atajos de tarea, con un texto que no promete que el modelo sepa hacerlas.
- Voz marcada como propuesta. No se llama a `getUserMedia`.
- Sin «Espacio de Cristian» y sin respuestas fijas presentadas como generación.
- Estado del motor: no preparado, preparando, listo, o sin modelo. El diagnóstico puede mostrar la ficha (Arqiven-N, o el repositorio del tercero). El título de la página no cambia a Arqiven-1. Si el modelo es Qwen, LFM2 o SmolLM2, se dice que es de un tercero y no se le llama Arqiven-N.
- El usuario escribe aunque la preparación no haya terminado.

Anchos a comprobar en el navegador, con emulación si no hay dispositivo físico, y dicho así en el informe: 360, 390, 768 y 1366. También ampliación al 200 %. Esta fase ya emuló el esqueleto; el resultado está en el README del prototipo. No se declara una prueba en un teléfono físico.

## Entrenamiento — línea futura, primero a coste 0

Estado: no ejecutada. Este documento no autoriza gasto. El tope experimental del encargo sigue siendo 100 € y cada tramo de pago necesita un sí del propietario antes de encender nada. Presupuesto de esta corrida: autorizado 0, gastado 0, reservado 0, recursos de pago activos: ninguno.

El plan completo está en `02_PLAN_DE_ENTRENAMIENTO.md` (SHA256 `09cd9f06a67e95d38f2033fe9b87581d449f1446cfec94d47b0fc5efeab5a96f`). Aquí solo se fija cómo entra en el producto y cuál es el primer paso local.

### Lo que no cuenta como modelo propio

Cargar Qwen, SmolLM, LFM2 u otro checkpoint y cambiarle el nombre a Arqiven-N. El experimento empieza con parámetros aleatorios (`initialize_from: random`), tokenizador propio entrenado solo con la partición de entrenamiento, y datos con licencia anotada. La ficha prevista es «Arqiven-1 experimental». El `modelId` es `arqiven-1-experimental` y `provider` es `"arqiven"`. No se crea el id `orvupi-text-experimental-0.1`.

### Primer paso, sin GPU de alquiler

En una rama aparte, cuando se aborde el experimento, y solo con herramientas ya instaladas en el equipo:

1. Elegir una implementación pequeña de Transformer causal. nanochat es la referencia citada por el encargo; hay que fijar un commit concreto antes de copiar nada. No se lanza su entrenamiento por defecto.
2. Un script que cuente parámetros e haga un batch diminuto: lectura, tokenización, forward, loss, backward, actualización, guardado y recarga. Semilla propuesta 42, configuración de partida del encargo (8 capas, oculto 384, 6 cabezas, contexto 512, vocabulario 8192). El número de parámetros se imprime; no se da por bueno el orden de magnitud sin esa cifra.
3. Comprobar en el código que no hay carga de un checkpoint de terceros.
4. Guardar semilla, configuración, versiones y hash del código.

Eso puede hacerse en CPU, con una red minúscula, sin alquilar. El equipo descrito en el encargo (i3-1115G4, 8 GB, gráfica integrada) sirve para ese ensayo mínimo. No se extrapola su tiempo a un entrenamiento útil. No se instala aquí ningún stack de entrenamiento: esta rama no añade dependencias.

El esqueleto de esta entrega es `docs/orvupi-ia/entrenamiento/comprobar.mjs`. Imprime 17504640 parámetros para la config de arriba y sale con código 2 si se le pide un checkpoint. No hace el batch de forward ni backward.

### Lo que sigue, y no empieza solo

Datos con manifiesto, partición 98/1/1 por documento, tokenizador, piloto de como máximo 10 € si se autoriza, preentrenamiento dentro del resto del tope, ajuste conversacional solo desde nuestro checkpoint, y una evaluación de 100 tareas reservadas. El umbral del 80 % con nota 2 es una propuesta de aceptación, no un resultado esperado. Si no se alcanza, el informe lo dice y el adaptador `provider: "arqiven"` no se enciende. La ficha sigue pudiendo decir «Arqiven-1 experimental» en un informe interno; `capabilities()` no lo ofrece a Work, Studio ni a la pantalla ARQIVEN.

La ficha del modelo, cuando exista, dirá procedencia, límites y tareas no validadas. No se comparará en la interfaz con ChatGPT o Claude como si fueran equivalentes.

### Encaje con el contrato

Un adaptador futuro traduce el checkpoint a `AiResult` con `modelId: "arqiven-1-experimental"`, `modelVersion: "Arqiven-1 experimental"`, `provider: "arqiven"` y el modo que la evaluación haya sostenido. Hasta entonces las capacidades de esa ficha no aparecen en `capabilities()`. El adaptador de terceros de Work sigue siendo el que responde en el navegador. La nav, el título y el saludo de marca siguen en ARQIVEN: el número de la ficha no pasa a la barra del sitio.

Arqiven-2 queda como nombre de la generación siguiente. No tiene id activo, configuración ni carpeta de pesos en esta fase. Un tercero no se promociona a Arqiven-1 por cambiarle el rótulo.

## Criterio para dar por empezada la fase siguiente

1. Un test de unidad ejecuta `summarize` con generador falso y recibe `mode: "extractive"` o `mode: "model"` según lo que el doble devuelva, con `provider` correcto.
2. En la ventana de Work, abrir la página IA deja un solo `AiStudio`.
3. El prototipo sigue apagado sin `preview=1`, sigue fuera de `web/v2/` y la barra publicada sigue sin el ítem ARQIVEN.
4. Gasto acumulado 0 mientras nadie haya autorizado un tramo.
