# Studio ORVUPI — Fase 0 a Fase 4

Fecha: 25 de octubre de 2026. Entorno aislado. Esta rama no se publica y no se fusiona.

Identidad que se conserva en el cromo: ORVUPI Studio, `#FF3070`, `#FFF8EC`, `#102032`. Las plantillas genéricas usan huecos neutros (`Tu empresa`, `Nombre y apellidos`, `Cargo`, `Tu logotipo`, `Tu foto`). El álbum de memes (`meme-punch`, `meme-vineta` y sus imágenes) no se modifica.

## 1. Commit de partida y despliegue

| Fuente | Valor |
|---|---|
| Rama de partida | `main` |
| Commit | `9b2d58f488874ee61ae41f38ecf704d24706a3a9` |
| Fecha | 2026-10-25 11:47:20 UTC |
| Mensaje | `log: entrada diaria 2026-10-25` |
| Revisión del manual | el mismo commit |

Comparación con https://orvupi.com/studio/ hecha antes de editar, por bytes:

| Archivo | Resultado |
|---|---|
| `web/v2/studio/app.mjs` | idéntico al desplegado |
| `web/v2/studio/studio-boot.js` | idéntico al desplegado |
| `web/v2/studio/lib/thumbs.mjs` | idéntico al desplegado |

`openThumb()` en el sitio y en ese commit es el mismo:

```js
function openThumb(id) {
  const item = thumbById(id);
  const meta = item ? thumbCat(item.category) : null;
  const doc = meta ? instantiate(meta.open) : null;
  if (!doc) return;
  doc.name = item.title.slice(0, 80);
  openDoc(doc);
}
```

`CONTINUIDAD.md` (24 de octubre de 2026) describe el alcance real: vídeo como fotograma, sitio sin alojamiento, pizarra finita, JSON sin los bytes de las imágenes subidas, guardado en el navegador. No promete editor completo ni puente con Work.

## 2. Causa P0 confirmada en código

`THUMB_CATS` asociaba cada categoría a una sola plantilla `open`:

| Categoría | `open` de partida | Qué veía quien elegía otra miniatura |
|---|---|---|
| curriculum | `cv-partido` | «Nico Olas», «Curiosidad aplicada», pulpo, «ORVUPI» |
| presentacion | `deck-portada` | «Una idea clara», «Presentación para la comunidad», franja rosa, pulpo |
| documento, informe y portada | `doc-portada` | la misma portada de documento |
| propuesta y negocio | `emp-brief` | el mismo brief |
| resto | una base por categoría | el diseño de esa base, con el título de la miniatura |

El nombre del proyecto cambiaba. El documento, no.

### 2.1 Evidencia reproducida en el navegador

Inspección de https://orvupi.com/studio/ el 25 de octubre de 2026, sobre el sitio publicado. El `openThumb` de esa página es el de la sección 1. Lo que sigue es lo que muestra la interfaz, no una deducción solo del código.

Caso 1, CV Ejecutivo Navy. La miniatura es un currículum navy con las frases HABILIDADES, NovaTech y MBA IE. El editor abre un lienzo de 794×1123 con «Nico Olas», «Curiosidad aplicada» y la lista Cartel / Invitación / …. Las capas se llaman Título, Nombre, Cuerpo, Oficio, Marca, Pulpo y Mitad, y hay una imagen del pulpo. Es `cv-partido`, la base de la categoría curriculum, con el nombre del proyecto cambiado.

Caso 2, Portada Estrategia. La miniatura dice «Estrategia 2026» e «Informe ejecutivo». El editor abre un lienzo de 1920×1080 cuyo proyecto se llama «Portada Estrategia», pero el contenido es «Una idea clara», «Presentación para la comunidad» y una franja «Creamos juntos». Las capas se llaman Sub, Título, Pie, Marca y Pulpo. Es `deck-portada`, la base de la categoría presentacion.

El sitio publicado sigue mostrando ese fallo. Esta rama no se despliega.

## 3. Inventario de `thumbs/catalog.json` (106)

En el commit de partida el índice tenía 106 entradas, 106 PNG presentes, 0 ausentes, 0 campos `templateId`. Claves: `id`, `category`, `title`, `width`, `height`, `file`. Las medidas son de la miniatura, no del documento.

Ninguna entrada tenía documento editable propio. El PNG era la cara del catálogo; al abrir se instanciaba la base de la categoría.

| Categoría | Entradas |
|---|---|
| curriculum | 8 |
| presentacion | 8 |
| post-instagram | 8 |
| documento, informe, propuesta, flyer, infografia, miniatura-youtube, negocio, meme | 5 cada una |
| tarjeta-visita, logo, story | 6 cada una |
| cartel, invitacion, portada, video, pizarra, sitio-web | 4 cada una |

La lista completa, ya con el documento de esta rama, está en la sección 7.

Decisión de Fase 1: no se retira ninguna entrada del catálogo. Cada PNG se sustituye, como oferta editable, por un documento de objetos neutro con el mismo `templateId`. El PNG histórico permanece en `web/v2/studio/thumbs/` y deja de ser la ficha que se abre. La ficha pinta el documento (`miniStage`), así que la miniatura visible y el lienzo son el mismo árbol de capas.

Esa reconstrucción no es un calco píxel a píxel del PNG anterior. Conserva categoría, título anunciado, proporción del formato de trabajo y una composición de objetos (texto y rectángulos). No hay fotografía incrustada ni texto dentro de un bitmap.

Las dos miniaturas de la sección 2.1 sí llevan en el documento las frases leídas en su miniatura: HABILIDADES, NovaTech y MBA IE; Estrategia 2026 e Informe ejecutivo. El nombre del proyecto sigue siendo el título del catálogo. NovaTech y MBA IE son el contenido de esa miniatura, no la marca del cromo. El resto del catálogo usa huecos neutros.

## 4. Matriz de estado

Estado en `9b2d58f`, antes de esta rama.

| Capacidad | Estado | Evidencia | Reproducción |
|---|---|---|---|
| Catálogo de 106 miniaturas | defectuosa | `openThumb` + `THUMB_CATS.open` | Abrir «CV Ejecutivo Navy» o «Portada Estrategia» en `/studio/` |
| Correspondencia miniatura → documento | ausente | el JSON no tiene `templateId`; solo hay PNG | Inventario de las 106 entradas |
| Plantillas de `plantillas.mjs` (267) | parcial | objetos reales, con pulpo y marca en el contenido genérico | Abrir `cv-partido` o cualquier pieza que no sea meme |
| Copias independientes | parcial | `instantiate` ya creaba un id nuevo; el original de categoría era compartido como definición, no como proyecto | Dos aperturas seguidas |
| Editor (capas, mover, agrupar, páginas) | parcial | el modelo guarda texto, color, fuente, posición, rotación, opacidad, grupo y recorte; la interfaz expone una parte | CONTINUIDAD y manual § hallazgos P1 |
| «Seguir diseñando» | defectuosa | sin proyectos, `thumbSeguir` pintaba `THUMB_SEGUIR` | Entrar en Inicio con `localStorage` vacío |
| Guardado | parcial | `projects.mjs` conserva 40 proyectos (`slice(0, CAP)`) y el JSON no incluye bytes de imagen | CONTINUIDAD; no se provocó el proyecto 41 |
| Exportación PNG/JPG | implementada | `compose.mjs`, sin marca de agua | Descargar desde Archivo |
| Exportación JSON portable | defectuosa | no viajan las imágenes subidas | CONTINUIDAD |
| PDF, DOCX, PPTX, paquete `.orvdesign` | ausente | no hay motor en Studio | Menú Archivo |
| Límites 48 capas / 8 páginas / 2048 px | parcial | `document.mjs` recorta al importar | Lectura de código, sin prueba de carga |
| Integración con Work | ausente | modelos y almacenes distintos | `apps/work/src/storage/` y Studio en `localStorage` |
| Vídeo, sitio, pizarra infinita | ausente como producto completo | fotograma, PNG de una página, lienzo finito | CONTINUIDAD |
| Álbum de memes | implementada y fuera de esta limpieza | `meme-punch`, `meme-vineta` | No se toca |

Estado que deja esta rama (Fase 1, sin publicar):

| Capacidad | Estado ahora |
|---|---|
| Cada `templateId` abre su documento | implementada para las 106 |
| Base genérica por categoría | retirada (`open` ya no existe) |
| Contenido genérico sin pulpo ni «ORVUPI» / «Comunidad ORVUPI» | implementada al instanciar; los memes siguen con la mascota |
| Ficha del catálogo = documento que se abre | implementada vía `miniStage` |
| Copy de CV Ejecutivo Navy y Portada Estrategia | implementada: el lienzo lleva las frases de la miniatura inspeccionada, no las de `cv-partido` ni `deck-portada` |
| Calco del PNG histórico | ausente; el PNG queda de archivo |
| «Seguir diseñando» solo con proyectos reales | implementada; vacío honesto si no hay ninguno |
| Copias independientes | implementada: cada apertura tiene `id` de proyecto y de capas nuevos |
| Editor cómodo, paquete portable, Work | siguen en Fases 2–4 |

## 5. Arquitectura

### Antes

```
clic en miniatura
  → thumbById
  → thumbCat(category).open
  → instantiate(plantilla de categoría)
  → doc.name = título
  → saveProject (proyecto nuevo, contenido compartido de la categoría)
```

Las 267 plantillas de `lib/plantillas.mjs`, `mas-plantillas.mjs` y `lote-plantillas.mjs` sí son documentos de capas. El catálogo visual de Inicio no las usaba: usaba el PNG y, al abrir, una de esas bases.

Guardado: `localStorage` (`orvupi-studio-projects`), imágenes en IndexedDB (`orvupi-studio`). Tope silencioso de 40. El borrador v1 no se borra.

### En esta rama

```
clic en miniatura
  → documentForThumb(templateId)     // lib/thumb-docs.mjs
  → documento nuevo, templateId = id de la entrada
  → openDoc → saveProject
```

- `thumbs/catalog.json`: cada entrada tiene `templateId` igual a su `id`. Si alguien apunta `templateId` a otro id, `documentForThumb` devuelve null. No hay alias de categoría.
- `lib/thumbs.mjs`: queda el índice y el formato en blanco de cada categoría. Se eliminó `open`.
- `lib/neutral.mjs`: al instanciar una plantilla que no es meme, sustituye `orvupi-avatar`, `orvupi-saludo` y `orvupi-buen-humor` por un rectángulo y el texto «Tu foto» o «Tu logotipo», y reescribe la marca promocional. No recorre proyectos ya guardados.
- `imageLayer` sin `src` ya no cae en la mascota.
- El riel Elementos ya no inserta la mascota. El riel Marca y el avatar de la navegación siguen: son el cromo y el kit voluntario, no el contenido de una plantilla.
- «Seguir diseñando» lista como máximo 4 proyectos reales. Si no hay, muestra «Todavía no hay diseños en este navegador.» Las ideas siguen en «Para ti» y en los carriles.

Formatos de trabajo (no los píxeles del PNG):

| Categoría | Formato |
|---|---|
| curriculum | cv 794×1123 |
| presentacion | deck 1920×1080 |
| documento, informe, propuesta (salvo las dos portadas de abajo) | doc 794×1123 |
| `tpl-propuesta-02`, `tpl-propuesta-05`, `tpl-negocio-02`, `tpl-negocio-05` | deck |
| `tpl-negocio-03` | card 1050×600 |
| tarjeta-visita | card |
| logo | logo 1080×1080 |
| flyer, cartel, infografia, invitacion | flyer, poster, info, invite |
| post-instagram, story, meme | ig, story, square |
| miniatura-youtube | thumb 1280×720 |
| portada y video | video 1920×1080 |
| pizarra, sitio-web | board, web |

Una página por documento. No se anuncia un folleto ni un deck multipágina.

### Puente con Work (Fase 4, en esta rama)

La ruta preferida guarda el paquete `orvupi-design` en la biblioteca local de Work (`orvupi-work`: OPFS si el navegador lo ofrece, si no IndexedDB) y abre el mismo editor en `#/work/<uuid>`. La URL lleva el id, no el documento. Work, al abrir un archivo `application/vnd.orvupi.design+json`, asigna `/studio/#/work/<uuid>`.

«Convertir a documento» escribe un `orvupi-doc` real (títulos, párrafos e imágenes) y «Convertir a presentación» un `orvupi-slides` v2 con objetos a escala sobre 960×540. Las dos piden confirmación y listan lo que se pierde. El diseño de Studio no se borra. El pie del derivado nombra el id de origen y no promete una vuelta automática.

El módulo Dibujos de Work no es el destino. Compartir esa biblioteca no es sincronizar en la nube.

## 6. Qué corrige la Fase 1

1. Relación individual `templateId` → documento de capas → ficha pintada desde ese documento.
2. Las 106 entradas se reconstruyen como objetos editables. No se retira ninguna. El PNG histórico se conserva y se deja de usar como cara del catálogo. CV Ejecutivo Navy y Portada Estrategia abren las frases de su miniatura (sección 2.1). El resto usa huecos neutros, sin pulpo y sin marca promocional.
3. Pulpo y marca promocional fuera del contenido genérico, incluidas las páginas extra de esas plantillas. Placeholders: «Tu empresa», «Nombre y apellidos», «Cargo», «Tu logotipo», «Tu foto».
4. Cada apertura es un proyecto nuevo. Editar una copia no cambia la plantilla ni otra copia.
5. «Seguir diseñando» ya no presenta miniaturas como si estuvieran guardadas.
6. Regresión en `test/studio-fase1.test.ts`: CV Ejecutivo Navy, Portada Estrategia, las 106, la neutralización y los dos memes intactos.

Cuatro títulos no pueden ir literales en el lienzo: el filtro de exportación bloquea `inversión`, `countdown`, `seed` y `partner`. El nombre del proyecto conserva el título del catálogo. El texto del lienzo usa una frase exportable:

| templateId | Nombre del proyecto | Texto en el lienzo |
|---|---|---|
| tpl-propuesta-04 | Inversión y Valor | Cifras y valor |
| tpl-story-02 | Countdown Webinar | Webinar |
| tpl-miniatura-youtube-05 | Ronda Seed | Ronda de proyecto |
| tpl-negocio-05 | Partnership Deck | Alianza |

Casos de aceptación de esta fase:

| Caso | Resultado en esta rama |
|---|---|
| CV Ejecutivo Navy | proyecto con ese nombre, `templateId` `tpl-curriculum-01`, 794×1123, columna `#102032`, «HABILIDADES», «NovaTech», «MBA IE», «Nombre y apellidos». Sin Nico Olas, sin «Curiosidad aplicada», sin Cartel/Invitación, sin capa Pulpo, sin imagen |
| Portada Estrategia | proyecto con ese nombre, 1920×1080, fondo `#102032`, lienzo «Estrategia 2026» e «Informe ejecutivo», acento `#FF3070` corto. Sin «Una idea clara», sin «Presentación para la comunidad», sin franja «Creamos juntos», sin capa Pulpo |
| Dos aperturas | ids de proyecto y de capas distintos; editar una no altera la siguiente instancia |
| Resto del catálogo | 106 documentos, firmas de texto distintas dentro de cada categoría, exportables, sin mascota |
| meme-punch / meme-vineta | siguen con la mascota |

Evidencia raster (mismo motor `compose.mjs`, sin marca de agua):

- Antes, PNG histórico: `antes-cv-ejecutivo-navy.png`, `antes-portada-estrategia.png`
- Después, documento abierto: `tpl-curriculum-01.png` (794×1123, columna marina `#102032`, frases HABILIDADES, NovaTech y MBA IE), `tpl-presentacion-01.png` (1920×1080, fondo `#102032`, «Estrategia 2026» e «Informe ejecutivo»)

## 7. Lista de plantillas de esta rama

Leyenda: «título» significa que el lienzo repite el título del catálogo. Otra frase es el titular del lienzo: o la sustitución exportable de la tabla anterior, o la frase leída en la miniatura (HABILIDADES, Estrategia 2026). El PNG es el archivo histórico, no el documento.

| templateId | categoría | título | PNG histórico | documento | páginas | capas | titular | estado |
|---|---|---|---|---|---|---|---|---|
| tpl-curriculum-01 | curriculum | CV Ejecutivo Navy | thumbs/curriculum-01-cv-ejecutivo-navy.png | cv 794×1123 | 1 | 21 | HABILIDADES | editable neutro |
| tpl-curriculum-02 | curriculum | CV Consultor Cream | thumbs/curriculum-02-cv-consultor-cream.png | cv 794×1123 | 1 | 12 | título | editable neutro |
| tpl-curriculum-03 | curriculum | CV UX Bold | thumbs/curriculum-03-cv-ux-bold.png | cv 794×1123 | 1 | 8 | título | editable neutro |
| tpl-curriculum-04 | curriculum | CV Tech con Foto | thumbs/curriculum-04-cv-tech-con-foto.png | cv 794×1123 | 1 | 7 | título | editable neutro |
| tpl-curriculum-05 | curriculum | CV Board Executive | thumbs/curriculum-05-cv-board-executive.png | cv 794×1123 | 1 | 8 | título | editable neutro |
| tpl-curriculum-06 | curriculum | CV Timeline Marketing | thumbs/curriculum-06-cv-timeline-marketing.png | cv 794×1123 | 1 | 9 | título | editable neutro |
| tpl-curriculum-07 | curriculum | CV Data Grid | thumbs/curriculum-07-cv-data-grid.png | cv 794×1123 | 1 | 9 | título | editable neutro |
| tpl-curriculum-08 | curriculum | CV Clásico Serif | thumbs/curriculum-08-cv-clasico-serif.png | cv 794×1123 | 1 | 5 | título | editable neutro |
| tpl-presentacion-01 | presentacion | Portada Estrategia | thumbs/presentacion-01-portada-estrategia.png | deck 1920×1080 | 1 | 3 | Estrategia 2026 | editable neutro |
| tpl-presentacion-02 | presentacion | Agenda Ejecutiva | thumbs/presentacion-02-agenda-ejecutiva.png | deck 1920×1080 | 1 | 13 | título | editable neutro |
| tpl-presentacion-03 | presentacion | KPIs del Trimestre | thumbs/presentacion-03-kpis-del-trimestre.png | deck 1920×1080 | 1 | 10 | título | editable neutro |
| tpl-presentacion-04 | presentacion | Reto y Solución | thumbs/presentacion-04-reto-y-solucion.png | deck 1920×1080 | 1 | 7 | título | editable neutro |
| tpl-presentacion-05 | presentacion | Cita con Imagen | thumbs/presentacion-05-cita-con-imagen.png | deck 1920×1080 | 1 | 5 | título | editable neutro |
| tpl-presentacion-06 | presentacion | Roadmap Anual | thumbs/presentacion-06-roadmap-anual.png | deck 1920×1080 | 1 | 9 | título | editable neutro |
| tpl-presentacion-07 | presentacion | Slide Equipo | thumbs/presentacion-07-slide-equipo.png | deck 1920×1080 | 1 | 13 | título | editable neutro |
| tpl-presentacion-08 | presentacion | Cierre Gracias | thumbs/presentacion-08-cierre-gracias.png | deck 1920×1080 | 1 | 4 | título | editable neutro |
| tpl-documento-01 | documento | Creative Brief | thumbs/documento-01-creative-brief.png | doc 794×1123 | 1 | 5 | título | editable neutro |
| tpl-documento-02 | documento | Acuerdo de Servicios | thumbs/documento-02-acuerdo-de-servicios.png | doc 794×1123 | 1 | 5 | título | editable neutro |
| tpl-documento-03 | documento | Guía de Onboarding | thumbs/documento-03-guia-de-onboarding.png | doc 794×1123 | 1 | 5 | título | editable neutro |
| tpl-documento-04 | documento | Informe Técnico | thumbs/documento-04-informe-tecnico.png | doc 794×1123 | 1 | 5 | título | editable neutro |
| tpl-documento-05 | documento | Acta de Proyecto | thumbs/documento-05-acta-de-proyecto.png | doc 794×1123 | 1 | 5 | título | editable neutro |
| tpl-informe-01 | informe | Informe Mensual | thumbs/informe-01-informe-mensual.png | doc 794×1123 | 1 | 5 | título | editable neutro |
| tpl-informe-02 | informe | Memoria Anual Cover | thumbs/informe-02-memoria-anual-cover.png | doc 794×1123 | 1 | 5 | título | editable neutro |
| tpl-informe-03 | informe | Dashboard Resumen | thumbs/informe-03-dashboard-resumen.png | doc 794×1123 | 1 | 5 | título | editable neutro |
| tpl-informe-04 | informe | Comparativa Antes/Después | thumbs/informe-04-comparativa-antesdespues.png | doc 794×1123 | 1 | 5 | título | editable neutro |
| tpl-informe-05 | informe | Datos del Sector | thumbs/informe-05-datos-del-sector.png | doc 794×1123 | 1 | 5 | título | editable neutro |
| tpl-propuesta-01 | propuesta | Propuesta de Colaboración | thumbs/propuesta-01-propuesta-de-colaboracion.png | doc 794×1123 | 1 | 5 | título | editable neutro |
| tpl-propuesta-02 | propuesta | Pitch Cover Navy | thumbs/propuesta-02-pitch-cover-navy.png | deck 1920×1080 | 1 | 7 | título | editable neutro |
| tpl-propuesta-03 | propuesta | Alcance y Timeline | thumbs/propuesta-03-alcance-y-timeline.png | doc 794×1123 | 1 | 5 | título | editable neutro |
| tpl-propuesta-04 | propuesta | Inversión y Valor | thumbs/propuesta-04-inversion-y-valor.png | doc 794×1123 | 1 | 5 | Cifras y valor | editable neutro |
| tpl-propuesta-05 | propuesta | Cierre de Propuesta | thumbs/propuesta-05-cierre-de-propuesta.png | deck 1920×1080 | 1 | 4 | título | editable neutro |
| tpl-tarjeta-visita-01 | tarjeta-visita | Tarjeta Clásica | thumbs/tarjeta-visita-01-tarjeta-clasica.png | card 1050×600 | 1 | 5 | título | editable neutro |
| tpl-tarjeta-visita-02 | tarjeta-visita | Tarjeta Navy | thumbs/tarjeta-visita-02-tarjeta-navy.png | card 1050×600 | 1 | 5 | título | editable neutro |
| tpl-tarjeta-visita-03 | tarjeta-visita | Tarjeta Cream Serif | thumbs/tarjeta-visita-03-tarjeta-cream-serif.png | card 1050×600 | 1 | 5 | título | editable neutro |
| tpl-tarjeta-visita-04 | tarjeta-visita | Tarjeta Accent Rosa | thumbs/tarjeta-visita-04-tarjeta-accent-rosa.png | card 1050×600 | 1 | 5 | título | editable neutro |
| tpl-tarjeta-visita-05 | tarjeta-visita | Tarjeta Minimal | thumbs/tarjeta-visita-05-tarjeta-minimal.png | card 1050×600 | 1 | 5 | título | editable neutro |
| tpl-tarjeta-visita-06 | tarjeta-visita | Tarjeta Consultor | thumbs/tarjeta-visita-06-tarjeta-consultor.png | card 1050×600 | 1 | 5 | título | editable neutro |
| tpl-logo-01 | logo | Marca Nova | thumbs/logo-01-marca-nova.png | logo 1080×1080 | 1 | 4 | título | editable neutro |
| tpl-logo-02 | logo | Marca Atlas | thumbs/logo-02-marca-atlas.png | logo 1080×1080 | 1 | 3 | título | editable neutro |
| tpl-logo-03 | logo | Marca Meridian | thumbs/logo-03-marca-meridian.png | logo 1080×1080 | 1 | 4 | título | editable neutro |
| tpl-logo-04 | logo | Marca Linea | thumbs/logo-04-marca-linea.png | logo 1080×1080 | 1 | 4 | título | editable neutro |
| tpl-logo-05 | logo | Marca Forge | thumbs/logo-05-marca-forge.png | logo 1080×1080 | 1 | 3 | título | editable neutro |
| tpl-logo-06 | logo | Marca Horizon | thumbs/logo-06-marca-horizon.png | logo 1080×1080 | 1 | 4 | título | editable neutro |
| tpl-flyer-01 | flyer | Meetup Empresa | thumbs/flyer-01-meetup-empresa.png | flyer 816×1056 | 1 | 6 | título | editable neutro |
| tpl-flyer-02 | flyer | Workshop Pitch | thumbs/flyer-02-workshop-pitch.png | flyer 816×1056 | 1 | 6 | título | editable neutro |
| tpl-flyer-03 | flyer | Outlet Corporativo | thumbs/flyer-03-outlet-corporativo.png | flyer 816×1056 | 1 | 6 | título | editable neutro |
| tpl-flyer-04 | flyer | Evento Formación | thumbs/flyer-04-evento-formacion.png | flyer 816×1056 | 1 | 6 | título | editable neutro |
| tpl-flyer-05 | flyer | Open Day | thumbs/flyer-05-open-day.png | flyer 816×1056 | 1 | 6 | título | editable neutro |
| tpl-cartel-01 | cartel | Summit Futuro del Trabajo | thumbs/cartel-01-summit-futuro-del-trabajo.png | poster 1080×1440 | 1 | 7 | título | editable neutro |
| tpl-cartel-02 | cartel | Exposición Galería | thumbs/cartel-02-exposicion-galeria.png | poster 1080×1440 | 1 | 7 | título | editable neutro |
| tpl-cartel-03 | cartel | Conferencia Tech | thumbs/cartel-03-conferencia-tech.png | poster 1080×1440 | 1 | 7 | título | editable neutro |
| tpl-cartel-04 | cartel | Muestra Anual | thumbs/cartel-04-muestra-anual.png | poster 1080×1440 | 1 | 7 | título | editable neutro |
| tpl-infografia-01 | infografia | Proceso en 4 Pasos | thumbs/infografia-01-proceso-en-4-pasos.png | info 800×2000 | 1 | 17 | título | editable neutro |
| tpl-infografia-02 | infografia | Datos del Sector | thumbs/infografia-02-datos-del-sector.png | info 800×2000 | 1 | 17 | título | editable neutro |
| tpl-infografia-03 | infografia | Comparativa | thumbs/infografia-03-comparativa.png | info 800×2000 | 1 | 17 | título | editable neutro |
| tpl-infografia-04 | infografia | Embudo de Ventas | thumbs/infografia-04-embudo-de-ventas.png | info 800×2000 | 1 | 17 | título | editable neutro |
| tpl-infografia-05 | infografia | Roadmap Visual | thumbs/infografia-05-roadmap-visual.png | info 800×2000 | 1 | 17 | título | editable neutro |
| tpl-invitacion-01 | invitacion | Cena Formal Clientes | thumbs/invitacion-01-cena-formal-clientes.png | invite 750×1050 | 1 | 6 | título | editable neutro |
| tpl-invitacion-02 | invitacion | Inauguración Oficina | thumbs/invitacion-02-inauguracion-oficina.png | invite 750×1050 | 1 | 6 | título | editable neutro |
| tpl-invitacion-03 | invitacion | Masterclass UX | thumbs/invitacion-03-masterclass-ux.png | invite 750×1050 | 1 | 6 | título | editable neutro |
| tpl-invitacion-04 | invitacion | Evento Networking | thumbs/invitacion-04-evento-networking.png | invite 750×1050 | 1 | 6 | título | editable neutro |
| tpl-post-instagram-01 | post-instagram | Cita Cultura Equipo | thumbs/post-instagram-01-cita-cultura-equipo.png | ig 1080×1350 | 1 | 3 | título | editable neutro |
| tpl-post-instagram-02 | post-instagram | Promo Plan Pro | thumbs/post-instagram-02-promo-plan-pro.png | ig 1080×1350 | 1 | 4 | título | editable neutro |
| tpl-post-instagram-03 | post-instagram | Tips Productividad | thumbs/post-instagram-03-tips-productividad.png | ig 1080×1350 | 1 | 3 | título | editable neutro |
| tpl-post-instagram-04 | post-instagram | Colección Overlay | thumbs/post-instagram-04-coleccion-overlay.png | ig 1080×1350 | 1 | 5 | título | editable neutro |
| tpl-post-instagram-05 | post-instagram | Stat del Mes | thumbs/post-instagram-05-stat-del-mes.png | ig 1080×1350 | 1 | 3 | título | editable neutro |
| tpl-post-instagram-06 | post-instagram | Checklist Lanzamiento | thumbs/post-instagram-06-checklist-lanzamiento.png | ig 1080×1350 | 1 | 4 | título | editable neutro |
| tpl-post-instagram-07 | post-instagram | Marca Clara | thumbs/post-instagram-07-marca-clara.png | ig 1080×1350 | 1 | 3 | título | editable neutro |
| tpl-post-instagram-08 | post-instagram | Testimonio Cliente | thumbs/post-instagram-08-testimonio-cliente.png | ig 1080×1350 | 1 | 5 | título | editable neutro |
| tpl-story-01 | story | Anuncio Inscripciones | thumbs/story-01-anuncio-inscripciones.png | story 1080×1920 | 1 | 3 | título | editable neutro |
| tpl-story-02 | story | Countdown Webinar | thumbs/story-02-countdown-webinar.png | story 1080×1920 | 1 | 7 | Webinar | editable neutro |
| tpl-story-03 | story | Tip Rápido | thumbs/story-03-tip-rapido.png | story 1080×1920 | 1 | 6 | título | editable neutro |
| tpl-story-04 | story | Producto Nuevo | thumbs/story-04-producto-nuevo.png | story 1080×1920 | 1 | 3 | título | editable neutro |
| tpl-story-05 | story | Encuesta Equipo | thumbs/story-05-encuesta-equipo.png | story 1080×1920 | 1 | 7 | título | editable neutro |
| tpl-story-06 | story | Behind the Scenes | thumbs/story-06-behind-the-scenes.png | story 1080×1920 | 1 | 6 | título | editable neutro |
| tpl-miniatura-youtube-01 | miniatura-youtube | Así lo Hicimos | thumbs/miniatura-youtube-01-asi-lo-hicimos.png | thumb 1280×720 | 1 | 4 | título | editable neutro |
| tpl-miniatura-youtube-02 | miniatura-youtube | Antes y Después | thumbs/miniatura-youtube-02-antes-y-despues.png | thumb 1280×720 | 1 | 4 | título | editable neutro |
| tpl-miniatura-youtube-03 | miniatura-youtube | 5 Errores | thumbs/miniatura-youtube-03-5-errores.png | thumb 1280×720 | 1 | 4 | título | editable neutro |
| tpl-miniatura-youtube-04 | miniatura-youtube | 10 Herramientas | thumbs/miniatura-youtube-04-10-herramientas.png | thumb 1280×720 | 1 | 4 | título | editable neutro |
| tpl-miniatura-youtube-05 | miniatura-youtube | Ronda Seed | thumbs/miniatura-youtube-05-ronda-seed.png | thumb 1280×720 | 1 | 4 | Ronda de proyecto | editable neutro |
| tpl-portada-01 | portada | Libro Liderazgo | thumbs/portada-01-libro-liderazgo.png | video 1920×1080 | 1 | 3 | título | editable neutro |
| tpl-portada-02 | portada | Memoria Anual | thumbs/portada-02-memoria-anual.png | video 1920×1080 | 1 | 3 | título | editable neutro |
| tpl-portada-03 | portada | Ebook Guía | thumbs/portada-03-ebook-guia.png | video 1920×1080 | 1 | 3 | título | editable neutro |
| tpl-portada-04 | portada | Informe Cover Cream | thumbs/portada-04-informe-cover-cream.png | video 1920×1080 | 1 | 3 | título | editable neutro |
| tpl-video-01 | video | Cover Documental | thumbs/video-01-cover-documental.png | video 1920×1080 | 1 | 3 | título | editable neutro |
| tpl-video-02 | video | Webinar En Directo | thumbs/video-02-webinar-en-directo.png | video 1920×1080 | 1 | 3 | título | editable neutro |
| tpl-video-03 | video | Serie Episodio | thumbs/video-03-serie-episodio.png | video 1920×1080 | 1 | 3 | título | editable neutro |
| tpl-video-04 | video | Trailer Producto | thumbs/video-04-trailer-producto.png | video 1920×1080 | 1 | 3 | título | editable neutro |
| tpl-pizarra-01 | pizarra | Sprint Board | thumbs/pizarra-01-sprint-board.png | board 1920×1080 | 1 | 10 | título | editable neutro |
| tpl-pizarra-02 | pizarra | Mind Map Idea | thumbs/pizarra-02-mind-map-idea.png | board 1920×1080 | 1 | 10 | título | editable neutro |
| tpl-pizarra-03 | pizarra | Notas Adhesivas | thumbs/pizarra-03-notas-adhesivas.png | board 1920×1080 | 1 | 10 | título | editable neutro |
| tpl-pizarra-04 | pizarra | Kanban Producto | thumbs/pizarra-04-kanban-producto.png | board 1920×1080 | 1 | 10 | título | editable neutro |
| tpl-sitio-web-01 | sitio-web | Landing SaaS | thumbs/sitio-web-01-landing-saas.png | web 1280×1800 | 1 | 10 | título | editable neutro |
| tpl-sitio-web-02 | sitio-web | Dashboard App | thumbs/sitio-web-02-dashboard-app.png | web 1280×1800 | 1 | 10 | título | editable neutro |
| tpl-sitio-web-03 | sitio-web | Portfolio Studio | thumbs/sitio-web-03-portfolio-studio.png | web 1280×1800 | 1 | 10 | título | editable neutro |
| tpl-sitio-web-04 | sitio-web | Home Corporativa | thumbs/sitio-web-04-home-corporativa.png | web 1280×1800 | 1 | 10 | título | editable neutro |
| tpl-meme-01 | meme | Standup Eterno | thumbs/meme-01-standup-eterno.png | square 1080×1080 | 1 | 6 | título | editable neutro |
| tpl-meme-02 | meme | Reunión vs Doc | thumbs/meme-02-reunion-vs-doc.png | square 1080×1080 | 1 | 4 | título | editable neutro |
| tpl-meme-03 | meme | Opción Correcta | thumbs/meme-03-opcion-correcta.png | square 1080×1080 | 1 | 6 | título | editable neutro |
| tpl-meme-04 | meme | Expectativa Realidad | thumbs/meme-04-expectativa-realidad.png | square 1080×1080 | 1 | 4 | título | editable neutro |
| tpl-meme-05 | meme | Un Minuto Slack | thumbs/meme-05-un-minuto-slack.png | square 1080×1080 | 1 | 6 | título | editable neutro |
| tpl-negocio-01 | negocio | One-pager Oferta | thumbs/negocio-01-one-pager-oferta.png | doc 794×1123 | 1 | 5 | título | editable neutro |
| tpl-negocio-02 | negocio | Pitch Elevator | thumbs/negocio-02-pitch-elevator.png | deck 1920×1080 | 1 | 7 | título | editable neutro |
| tpl-negocio-03 | negocio | Tarjeta Empresa | thumbs/negocio-03-tarjeta-empresa.png | card 1050×600 | 1 | 5 | título | editable neutro |
| tpl-negocio-04 | negocio | Fact Sheet | thumbs/negocio-04-fact-sheet.png | doc 794×1123 | 1 | 5 | título | editable neutro |
| tpl-negocio-05 | negocio | Partnership Deck | thumbs/negocio-05-partnership-deck.png | deck 1920×1080 | 1 | 7 | Alianza | editable neutro |

## 8. Fase 2 — editor en esta rama

La Fase 2 está en esta rama. No sustituye a la Fase 1: CV Ejecutivo Navy y Portada Estrategia siguen abriendo su documento.

Qué hace el editor:

1. Barra superior con nombre, estado de guardado, deshacer, rehacer, tamaño, «Abrir en Work», exportar PNG/JPG y el resto de acciones que ya tenía cada tipo de pieza. Un riel y un panel de recursos. Lienzo central. Inspector que se cierra. La navegación global se contrae al editar; el botón Menú la abre.
2. El ajuste usa el hueco medido del escenario (`fitScale` en `lib/arrange.mjs`) y la altura real bajo la cabecera del sitio. Abrir o cerrar panel e inspector vuelve a medir. No hay un margen fijo de 760 px ni un `zoom` de CSS sobre la interfaz.
3. Texto: doble clic en el lienzo, fragmentos (`lib/text-style.mjs`), tamaño numérico de una unidad, negrita, cursiva, subrayado, color, alineación e interlineado. La fuente del lienzo y la del PNG/JPG es el mismo archivo TTF. Negrita y cursiva son sintéticas porque cada familia es un solo archivo: en pantalla `font-weight` / `font-style`, y en el raster un segundo pase desplazado o un cizallado. Inter no entra en el documento.
4. Imágenes: reemplazar (JPG, PNG, WebP), mover, escala proporcional, rotar, voltear, opacidad y recorte visual del recuadro de origen.
5. Formas: rectángulo, círculo (un rectángulo con `shape: "ellipse"`), línea y el resto de vectores ya compatibles. Relleno, contorno y grosor.
6. Objetos: selección múltiple, duplicar, copiar y pegar, borrar con deshacer, agrupar, bloquear, orden, alinear, distribuir y guías opcionales.
7. Fondo de color libre. Los fondos de catálogo se quedan porque su pintura ya estaba completa.
8. Páginas: añadir, duplicar, borrar, reordenar y navegar, con deshacer, en las piezas que ya podían crecer. Documento, pizarra, vídeo y sitio no ganan un botón de página nueva. El tope sigue siendo 8, con el aviso «Esta versión guarda hasta 8 páginas.» La última página no se borra.
9. Cada cambio de documento pasa por la pila de deshacer y por el guardado del navegador. «Abrir en Work» deja de ser solo un aviso: la Fase 4 crea la copia o la conversión.

Móvil (ancho menor de 800 px): el lienzo queda en el centro, el riel se fija abajo y el panel y el inspector son capas por encima. Al estrechar la ventana se cierran para no tapar la pieza.

Capturas del mismo caso, antes de esta distribución y después. El contenido del CV ya era el de la Fase 1 en las dos:

- `antes-editor-cv.png`, `despues-editor-cv.png` (1366×900, CV Ejecutivo Navy)
- `antes-editor-movil.png`, `despues-editor-movil.png` (390×844)
- `despues-editor-portada.png` (1366×900, Portada Estrategia)

En el escritorio, cerrar panel e inspector pasa el ancho útil de la portada de 522 px a 949 px. En el móvil el lienzo queda entre la barra superior y la barra de zoom, con el riel abajo, y la página no se ensancha.

### Qué no hace la Fase 2

- No hay fototeca ni gráficos calculados con datos. «Fotos» sigue siendo la subida de esta pieza. «Gráficos» inserta formas, no series.
- Vídeo sigue siendo un fotograma. El sitio no se publica. La pizarra sigue siendo finita.
- El tope de 8 páginas, 48 capas, 2048 px y 2000 caracteres no sube.
- Las plantillas no son un calco píxel a píxel de los PNG históricos.
- El guardado fiable, el paquete y el PDF llegan en la Fase 3. El puente con Work llega en la Fase 4. Las dos están más abajo, en esta misma rama.

## 9. Fase 3 — guardado, paquete y PDF

1. El guardado escribe primero `orvupi-studio-projects-next` y después la clave principal. Si el navegador se corta en medio, la siguiente apertura adopta la copia completa. «Guardado» solo aparece cuando el JSON quedó escrito y la imagen subida también. Si IndexedDB rechaza la imagen, el estado dice que no quedó guardada.
2. El diseño 41 no borra el primero. Con 40 proyectos, uno nuevo se aparta en `orvupi-studio-recovery` y el aviso lo dice. Actualizar uno de los 40 sigue pudiendo guardarse. Abrir el recuperado lo intenta de nuevo; si la lista sigue llena, no pisa a nadie.
3. Otra pestaña con una revisión anterior no pisa el diseño. El aviso ofrece «Guardar como copia». La revisión es un contador en `meta` (0 si el archivo antiguo no la tenía). No cambia textos ni capas. La clave vieja `orvupi-studio-draft` no se borra.
4. Importar un archivo con más de 8 páginas, 48 capas, 2000 caracteres o un lienzo fuera de 64–2048 px lanza un error y no devuelve un documento recortado. En el editor, la capa 49 y la página 9 se rechazan con un texto. Un texto que se pasa de 2000 caracteres al escribir se corta y el estado lo dice.
5. El paquete `orvupi-design` versión 1 lleva el documento y los píxeles de las imágenes subidas. No lleva los TTF. El aviso dice que Anton, Bangers, Archivo Black, Silkscreen, Audiowide, Barlow Condensed y Saira ExtraCondensed viajan con la aplicación y que otro programa puede sustituirlas. Importar el paquete crea un proyecto nuevo y restaura las imágenes. El JSON suelto de «Exportar JSON» sigue sin los bytes de imagen y lo dice.
6. El PDF junta las páginas elegidas. Cada página es el mismo raster que el PNG, a 96 ppp, en DeviceRGB, sin sangrado, y el texto deja de ser editable. No se etiqueta como 300 ppp ni como cuatricromía. 794×1123 px se describe como un A4 a 96 ppp. El proyecto editable no se borra. El archivo puede ser grande porque el raster no va comprimido.

## 10. Fase 4 — Studio y Work

Qué convierte:

| Ruta | Qué se conserva | Qué no |
| --- | --- | --- |
| Guardar el diseño en Work | Todas las capas, páginas, textos, formas e imágenes. El mismo editor. | La biblioteca local no es una nube. No hay vuelta automática desde un derivado. |
| Convertir a documento | Textos en orden de lectura: título si el tamaño es de 48 px o más, si no párrafo. Imágenes subidas con bytes. | La posición absoluta. Recorte, volteo y rotación. Formas y líneas. No hay tablas en el modelo de Studio. No se pega una captura de la página. Fuentes de Studio a Arial; Silkscreen a Courier New. |
| Convertir a presentación | Posición, tamaño, rotación, volteo y grupos, a escala sobre 960×540. | El bloqueo, las guías, la cuadrícula y un fondo de catálogo (entra como color). A partir del elemento 61 de una página, el resto no entra. Un lienzo que no es 16:9 deja márgenes. La misma sustitución de fuentes. |

Una diapositiva de Work mide 960×540. Un deck de 1920×1080 entra a escala 0.5. Un CV de 794×1123 no es 16:9 y la vista previa lo dice.

El id de Work es un UUID. El id de Studio (`proj_…`) sigue dentro del paquete. Si la copia de Work tiene una revisión más nueva, se guarda otro archivo en vez de pisarlo.

## 11. Qué queda fuera

- Fase 5 (P2) se entrega en la rama `cursor/studio-fase5-p2-722e` y el informe `STUDIO-MANUAL-FASE5.md`: fototeca CC0 local, gráficos/tablas con datos, escenas de vídeo sin MP4/audio, HTML de sitio sin publicar, pizarra ampliable con comentarios e historial local, IA opcional sin modelo. Colaboración remota y hosting siguen fuera.
- El PDF no conserva texto vectorial ni una marca de 300 ppp.
- El paquete no incrusta las fuentes.
- El módulo Dibujos de Work no recibe el diseño.
- El bundle ya publicado en `web/v2/work/` es anterior a la redirección del diseño nativo. En esta rama el código fuente de Work sí asigna `/studio/#/work/<uuid>`. El servidor estático de esta comprobación responde 404 en `/work/document/d/…/edit` porque no reescribe la ruta a `index.html`. La biblioteca sí lista el documento, y los bytes leídos de esa biblioteca contienen el texto convertido.
- No hay sincronización entre dispositivos.

Los proyectos ya guardados no se reescriben en su contenido. Al volver a guardarlos se añade el contador de revisión. Quien abra un diseño antiguo ve lo que guardó.

## 12. Pruebas

- `test/studio-fase1.test.ts` y `test/studio-p0.test.ts`: la apertura de las 106 y los dos casos de la sección 2.1.
- `test/studio-fase2.test.ts`: ajuste real, fragmentos de texto, negrita en el raster, círculo, volteo, distribución y páginas.
- `test/studio-fase3.test.ts`: el proyecto 41 conserva el primero, el conflicto no pisa, la recuperación de la clave intermedia, el rechazo sin recorte, el paquete con píxeles, el PDF a 96 ppp y la lista de pérdidas de la conversión.
- `apps/work/tests/unit/studio-bridge.test.ts`: la ruta del diseño nativo, `parseOrvdoc` / `parseSlides`, y un DOCX y un PPTX que contienen el texto de origen.
- Playwright de Studio en escritorio y en 390 px, más una pasada manual en Chrome: estado «Guardado», menú de paquete y PDF, diálogo de Work, archivo real en `orvupi-work`, tope de 48 capas y el lienzo en 390 px sin ensanchar la página.
- `npm test`: la suite del repositorio. El borrador del tablero lista `test/studio-fase3.test.ts` tras `node dist/lab/tools/build-pages.js`, sin `--publish`.

Muestras locales, fuera del repositorio: `/opt/cursor/artifacts/studio-fase3/` (paquete, PDF, DOCX, PPTX y capturas).

## 13. Autorización

No fusionar. No desplegar. No borrar datos de usuarios.

Meme IA: pedir el OK de quien encarga el producto antes de cualquier publicación. La rama revisable es `cursor/studio-fase0-fase1-08f9`. El PR abierto sigue sin fusionarse.
