# Decisión de arquitectura — núcleo común

Esta decisión no añade un paquete npm ni una dependencia de ejecución. `CONTRIBUTING.md` deja vacía la lista de dependencias de runtime. El núcleo de la primera fase es un contrato y adaptadores sobre el código que ya existe. Un checkpoint de la familia Arqiven, si llega, será un adaptador más. No sustituye a Work ni a Studio: los tres clientes hablan el mismo contrato y leen la misma biblioteca local.

## Marca, ruta y ficha

ARQIVEN es la marca del producto. ORVUPI es el sitio. La familia de modelos se escribe Arqiven-1, Arqiven-2, … solo en la ficha técnica. El experimento desde cero se ficha como **Arqiven-1 experimental**. Su `modelId` es `arqiven-1-experimental`. No se usa `orvupi-text-experimental` ni `orvupi-text-experimental-0.1` como nombre de producto ni como id.

| Qué ve la persona | Qué guarda el contrato |
| --- | --- |
| Nav, título y cromo: ARQIVEN | `source: "central"` en la pantalla `/arqiven/` |
| Ficha: Arqiven-1 experimental | `modelId: "arqiven-1-experimental"`, `provider: "arqiven"` |
| Ficha de un tercero ya cargado en Work | El id actual (`qwen05-gpu`, `lfm350-gpu`, `smol135-cpu`, …), `provider: "third-party"` |
| Catálogo de Studio | `modelId: "none"`, `provider: "none"`, `mode: "rules"`, `modelVersion: "studio-catalog"` |

`provider` vale `"third-party"`, `"arqiven"` o `"none"`. `"arqiven"` queda reservado a un checkpoint de la familia. Los siete modelos actuales no lo usan. `capabilities()` no lista un id `arqiven-*` hasta que ese checkpoint exista y la evaluación lo sostenga.

### Barra principal

La barra es `<nav class="site">` en 110 HTML de `web/v2/`, no un componente. El detalle del conteo está en [AUDITORIA.md](AUDITORIA.md). El ítem se inserta después de Work:

```html
<li><a href="/arqiven/">ARQIVEN</a></li>
```

En `/en/`, `/pt-br/`, `/ja/` y `/ko/` el `href` lleva el prefijo de idioma y el texto sigue siendo ARQIVEN. En la página de ARQIVEN, ese enlace lleva `aria-current="page"`. «Explorar todo» (`details.mapa`) no es el sitio de este ítem: Studio vive ahí, y el propietario pide la misma barra que Inicio, Herramientas y Work.

Esta fase no escribe ese `<li>` ni crea `web/v2/arqiven/`. Hacerlo publicaría un enlace a una ruta vacía en el siguiente despliegue. El esqueleto de `docs/orvupi-ia/prototipo/` enseña la barra con el ítem ya colocado, detrás de `?preview=1`.

Cuando se autorice el alta:

1. Añadir el `<li>` en las 110 copias, o extraer antes `<nav class="site">` a un solo parcial y regenerar. Hoy no hay generador de esa barra. `lab/tools/render.ts` no sirve: emite Verify, Lab y Tablero.
2. Crear `web/v2/arqiven/index.html` y las cuatro copias de idioma. `noindex` mientras sea prueba. Fuera de `web/v2/sitemap.xml` hasta la autorización.
3. Excepción CSP de `/arqiven/` y `/arqiven/*` solo si esa página descarga pesos. Se copia el bloque de `/work/` en `web/v2/_headers` y no se ensancha. La CSP de Studio se queda en `connect-src 'self'`.
4. Work sigue en `/work/` para los cinco idiomas, como ya hace la barra. ARQIVEN no se mete dentro de `/work/` ni de `/studio/`: es una entrada del sitio y, por dentro, un cliente del mismo núcleo.

## Qué significa un solo motor aquí

Una sola biblioteca lógica de peticiones, cancelación, resultados, errores y capacidades. Work, Studio y la pantalla ARQIVEN son clientes. No hace falta el mismo proceso físico: hoy Work infiere en un worker de la pestaña y Studio no infiere.

Separar, y no prometer lo que no se ha medido:

| Capa | Hoy | Decisión |
| --- | --- | --- |
| Contrato | No existe. `AiEngine` habla con el worker por mensajes propios. Studio habla por reglas. | Un contrato común, descrito abajo. |
| Inferencia | `AiEngine` + worker + Transformers.js | Se envuelve. No se reescribe en la primera entrega. |
| Catálogo de Studio | `localAnswer` | Sigue siendo determinista y se etiqueta `rules`. |
| Frases | `localPhrases` | Dejan de llamarse IA. Nombre de producto: «Textos rápidos». |
| Pesos | OPFS `orvupi-ai-models`, por pestaña que los cargue | No se promete una sola carga en todo el dispositivo. No se propone SharedWorker hasta probarlo; la alternativa es una carga por pestaña, que es lo que ya funciona. |
| Servicio remoto | No hay | Fuera de esta fase. Si algún día una petición sale del dispositivo, el texto de privacidad de Work («Tus documentos no salen del dispositivo») tiene que cambiar antes de enviar nada. |
| Conversiones DOCX/PDF | `exportDocx` / `exportPdf` | Siguen fuera del modelo. El contrato puede pedir `export` como paso posterior. |

## Clientes

```text
                    contrato AiRequest / AiEvent / AiResult
                    biblioteca IndexedDB orvupi-work v1
                    BroadcastChannel "orvupi-work"
                                      |
          +---------------------------+---------------------------+
          |                           |                           |
   cliente ARQIVEN              cliente Work               cliente Studio
   ruta /arqiven/              tres montajes de            chat #/ia
   nav del sitio,              AiStudio                   y, aparte,
   aún no publicada            |                           Textos rápidos
          |                    adaptador Work              (no es un cliente
          |                    AiEngine + hybrid            de generación)
          |
          +-- más adelante: adaptador arqiven-1-experimental
              ficha «Arqiven-1 experimental»
              solo si el experimento de entrenamiento lo justifica
```

Los tres clientes comparten el contrato y la biblioteca. No comparten, en esta decisión, un único hilo de chat entre aplicaciones: Work guarda la conversación en el estado de cada montaje y Studio en `orvupi-studio-ia-v1`. Un archivo creado en uno se ve en el otro por el puente que ya existe. El contexto de una petición es la lista `contextRefs` de ids de `files`, más la selección que el editor pase en esa pestaña.

Los tres montajes de Work (página, panel, documento) deben compartir conversación cuando estén en la misma pestaña, o no mostrarse a la vez. La decisión de producto para la primera implementación: si `view === "ai"`, el panel lateral no se monta. El documento sigue teniendo su panel contextual, en su ventana, porque ya es otra página. No se borran los componentes.

Studio mantiene dos herramientas con nombres distintos:

1. Chat de catálogo, modo `rules`, hasta que un adaptador real responda.
2. Textos rápidos, que no pasan por `run()`.

`__ORVUPI_AI_ASK__` no se trata como integración hecha. El adaptador de Studio, cuando exista, sustituye ese gancho por el contrato. Hasta entonces el gancho puede quedar, sin asignar, para no romper el archivo.

## Dónde vive el código

No se abre una app nueva. La primera implementación toca sitios que ya existen:

| Pieza | Ruta propuesta | Por qué |
| --- | --- | --- |
| Tipos y validación sin dependencias | `web/v2/shared/ia/contract.mjs` | Studio ya carga módulos sueltos. Work puede importar el mismo archivo desde Vite si la raíz del repo está permitida; si el empaquetado de Work no puede salir de `apps/work`, se duplica el tipo en `apps/work/src/ai/contract.ts` y un test compara los nombres de campo. Una sola fuente es preferible. |
| Adaptador de Work | `apps/work/src/ai/client.ts` | Envuelve `aiEngine`, `hybrid.ts` y `parseRequest`. No mueve el worker. |
| Cliente de prueba | test de unidad en `apps/work/tests/unit/` | Antes de cambiar pantallas, como pide el orden de migración. |
| Pantalla ARQIVEN | No entra en `web/v2/` en esta fase | Pages publica `web/v2`. Una carpeta `web/v2/arqiven/` y un ítem en `<nav class="site">` quedarían en el siguiente despliegue del sitio. El esqueleto de revisión está en `docs/orvupi-ia/prototipo/` y no se enlaza desde la web. |
| Frases | `web/v2/studio/lib/ai-optional.mjs` y el rail en `views.mjs` | Cambio de nombre visible, misma función. |
| Chat de Studio | `ia-chat.mjs` | Sigue eligiendo plantillas. La llamada al núcleo, cuando exista, no sustituye el catálogo: lo acompaña y marca el modo. |

El contrato de abajo es la especificación acordada para esa implementación. No es una API que ya esté en el código.

## Contrato adaptado al repositorio

Se conservan los campos del encargo y se añaden los que Work ya necesita para no perder comportamiento.

```ts
type AiSource = "central" | "work" | "studio";

type AiTask =
  | "chat"
  | "summarize"
  | "explain"
  | "rewrite"
  | "translate"
  | "outline"
  | "questions"
  | "analyze"
  | "generate"
  | "ask";

type AiMode = "model" | "mixed" | "extractive" | "rules";

type AiProviderKind = "third-party" | "arqiven" | "none";

type AiRequest = {
  requestId: string;
  conversationId: string;
  source: AiSource;
  task: AiTask;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  /** Identificadores de archivo de la biblioteca local, no el archivo entero. */
  contextRefs: string[];
  selection?: string;
  targetLanguage?: string;
  /** Paso del conversor, después del texto. El modelo no emite el binario. */
  exportAs?: "docx" | "pdf" | "txt";
};

type AiEvent =
  | { type: "progress"; requestId: string; stage: "prepare" | "analyze" | "generate" | "format" | "create" }
  | { type: "token"; requestId: string; text: string }
  | { type: "done"; requestId: string; result: AiResult }
  | { type: "error"; requestId: string; code: string; message: string };

type AiResult = {
  text: string;
  /**
   * Id interno, nunca el rótulo de la nav.
   * Terceros actuales: qwen05-gpu, lfm350-gpu, smol135-cpu, etc.
   * Familia propia, cuando exista: arqiven-1-experimental, luego arqiven-1, arqiven-2.
   */
  modelId: string;
  /**
   * Ficha visible cuando hace falta nombrar el modelo.
   * Propio: "Arqiven-1 experimental", "Arqiven-1", "Arqiven-2".
   * Tercero: repo + dtype + dispositivo. Reglas: "studio-catalog".
   */
  modelVersion: string;
  provider: AiProviderKind;
  mode: AiMode;
  contextUsed: string[];
};

type AiCapabilities = {
  tasks: AiTask[];
  /** Vacío si no hay motor cargado. Nunca lista un tercero como Arqiven-N. */
  models: Array<{ id: string; version: string; provider: AiProviderKind; ready: boolean }>;
  documentsLeaveDevice: false;
};
```

`analyze` y `generate` están en Work y se quedan. `mixed` es el modo que ya devuelve `hybrid.ts` cuando una parte sale del modelo y otra del texto. `rules` cubre el catálogo de Studio. `provider: "arqiven"` queda reservado a un checkpoint de la familia. Los siete modelos actuales son `third-party`. Si no hay modelo, `modelId` es `"none"` y `provider` es `"none"`.

### Ids de la familia

El número es la generación. El sufijo dice el estado. La ficha es lo que puede leer una persona. El id es estable y en minúsculas.

| Ficha técnica | `modelId` | Cuándo entra en `capabilities()` |
| --- | --- | --- |
| Arqiven-1 experimental | `arqiven-1-experimental` | Cuando haya un checkpoint entrenado desde cero (`initialize_from: random`) y la evaluación lo sostenga. Hasta entonces no se lista. |
| Arqiven-1 | `arqiven-1` | Generación 1 aceptada, si el experimental deja de serlo. No se asigna por adelantado a un tercero. |
| Arqiven-2 | `arqiven-2` | Generación siguiente. No hay configuración ni entrenamiento en esta fase. |

No hay id `orvupi-text-experimental-0.1`. El paquete lo proponía; la marca independiente lo retira. El cromo público sigue diciendo ARQIVEN aunque la ficha diga Arqiven-1 experimental: el número no sustituye a la marca en la nav ni en el título.

Operaciones del núcleo, con los nombres del código actual cuando ya existen:

| Operación del encargo | Equivalente actual | Notas |
| --- | --- | --- |
| `capabilities()` | `detectAiSupport` + `usableModels` + estado de caché | Unificar con `capabilities.ts`, que hoy no gobierna la pantalla. |
| `prepare()` | `AiStudio.prepare` / `AiEngine.load` | Cancelable. No bloquea el campo de escritura. |
| `run()` | `AiStudio.run` + funciones `hybrid*` | Devuelve eventos, no solo el markdown final. |
| `cancel()` | `AiEngine.stop` y `stopRef` | Ya corta la generación. Hay que unificar el nombre. |

Límites que el núcleo debe aplicar y que en parte ya están:

- Contexto por referencia y por presupuesto. Work ya corta a 36 000 caracteres (`CHUNK_CHARS * MAX_PARTS`) y lo dice. El núcleo no mete el archivo completo en el mensaje del sistema.
- Las instrucciones de sistema salen de `hybrid.ts` y `prompts.ts`, no del documento importado.
- Salidas tratadas como texto no confiable: `parseMarkdown` pinta nodos, no HTML. Se mantiene.
- Cola de una generación, reintentos acotados (hoy dos rondas y dos juegos de parámetros) y descarga de la sesión a los 15 minutos.
- Sin telemetría del documento. El `console.info` actual no debe crecer a un envío remoto.

## Migración, en el orden del encargo

Cada paso conserva lo que ya es útil. Nada se borra al empezar.

1. Envolver el motor de Work con el contrato y probarlo con un cliente de prueba. Siguen `AI_MODELS`, el worker, la descarga, TextRank y los filtros de fidelidad.
2. Conectar la pantalla ARQIVEN al mismo contrato y a la biblioteca `orvupi-work`. Mientras el modelo no está, la pantalla escribe y explica el límite. El esqueleto de `docs/orvupi-ia/prototipo/` es la referencia visual, no el cliente.
3. Unir las acciones de Work: selección o archivo, resultado revisable, aplicar solo con un botón. Con la página de IA abierta, no montar el panel lateral de la misma ventana.
4. Conectar el chat de Studio. El catálogo sigue siendo la herramienta determinista y se marca `rules`.
5. Renombrar el panel de frases a «Textos rápidos». No es un segundo modelo.
6. Hacer que los accesos llamados ORVUPI IA en Studio lleven a un destino explicado: la pantalla ARQIVEN o el panel contextual de Work, no los dos bajo el mismo nombre. El rótulo nuevo es ARQIVEN. Las frases del rail siguen llamándose «Textos rápidos» y no pasan por `run()`.
7. Pasar un resultado a Work por `work-store.mjs` cuando el esquema siga siendo el de la versión 1. No se crea otra base. En Studio, un briefing o una propuesta de cambio se aplican solo tras revisión.
8. Importación y exportación en un paso aparte. Sin afirmar fidelidad de PDF o DOCX hasta ver ejemplos con imágenes, tablas, listas y saltos. Sin llamar OCR a `getTextContent`.
9. Flag de activación y reversión. El código redundante se retira después de la prueba, no antes.
10. Rutas e idiomas actuales se quedan. `/arqiven/` y el ítem de `<nav class="site">` se comprueban en el alojamiento real y en es, en, pt-BR, ja y ko antes de entrar en el sitemap. Hasta entonces no se copian a `web/v2/`.

## Privacidad que no se negocia en el diseño

- Orientación local mientras no haya una decisión distinta del propietario.
- No usar conversaciones ni documentos para entrenar.
- No registrar el texto como telemetría.
- No debilitar la CSP de Studio para «conectar el modelo» de Work. Si la pantalla ARQIVEN necesita Hugging Face o jsDelivr, será una excepción de `/arqiven/` tan estrecha como la de `/work/`, y solo cuando esa pantalla esté autorizada a publicarse.
- Los pesos de Qwen, LFM2 y SmolLM2 se nombran como modelos de terceros en la ficha de capacidades. Cambiarles el nombre a Arqiven-N no crea el modelo de la familia.

## Familia Arqiven

Queda fuera del núcleo hasta tener un checkpoint. El primer id reservado es `arqiven-1-experimental`, con ficha «Arqiven-1 experimental», `provider: "arqiven"` e `initialize_from: random`. Arqiven-2 no se reserva más que como nombre de la generación siguiente. El plan de esa línea está en [PLAN-IMPLEMENTACION.md](PLAN-IMPLEMENTACION.md). No sustituye al adaptador de Work por el hecho de existir un diseño. La nav y el título siguen diciendo ARQIVEN, con o sin ficha.
