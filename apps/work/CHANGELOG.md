# Registro de cambios

## 0.9.4 — 2026-10-19

Docs: un DOCX importado se ve como el original, sin cortes ni desplazadores.

- Tablas al ancho real del documento: los anchos de columna (tblGrid) se escalan al ancho útil de la hoja si lo superan, y el visor encaja cualquier tabla más ancha que la hoja en proporción (también en el móvil, con la letra algo menor). Ya no hay desplazador horizontal dentro de tablas o imágenes ni columnas cortadas («Prevención básica», «Ejemplo…»).
- Márgenes exactos del documento (p. ej. 0,7" en Carta): la hoja tiene el mismo ancho útil que en Word; se guarda y se exporta a DOCX igual. Elegir un margen en «Configurar página» lo sustituye.
- Las viñetas de las listas dentro de celdas ya no se pierden (antes los párrafos numerados de una celda salían como texto suelto).
- Bordes, color de fondo, márgenes interiores y alineación vertical de cada celda como en el original: las tablas de imágenes sin bordes ya no salen con bordes negros.
- Imágenes a su tamaño real (EMU → px), limitadas al ancho útil sin deformarse; en una celda, al ancho de la celda.
- Símbolos: w:sym y texto en Symbol/Wingdings (•, ▪, ✓, ➢, ≤, ±, →…) pasan al carácter Unicode real; «·» se conserva.
- Las fuentes que el navegador no tiene (Aptos, Calibri, Play, Cambria…) se muestran con su equivalente (Arial, Georgia, Times New Roman…) en lugar de caer en una serif.
- La hoja vuelve a quedar centrada al cambiar el zoom (p. ej. 75 %): se mide de nuevo al cambiar el zoom en lugar de esperar al ResizeObserver.
- Prueba nueva docx-094 (Chromium, Firefox y WebKit, escritorio y móvil): nada más ancho que la hoja, ningún desplazador ni celda recortada, todas las viñetas y símbolos y el mismo texto que el original; con ORVUPI_DOCX se repite con un documento real.

## 0.9.2 — 2026-10-19

ORVUPI AI automática, fluida y fiable en español; plantillas mejor ordenadas.

- Modo automático: «Preparar ORVUPI AI» elige solo cómo ejecutar la IA en este dispositivo. Tras cargar cada opción hace una prueba real y corta; si da «!!!!» o nada, pasa a la siguiente (GPU → LFM2 con GPU sin fp16 → CPU (WASM) → SmolLM2). Si una respuesta degenera dos veces con la GPU, cambia sola de modo y repite. Recuerda en el dispositivo qué funcionó y qué falló. Ya no hay mensajes que pidan cambiar de modelo o de GPU; si nada funciona, un aviso amable. Los modelos se pueden elegir a mano en «Opciones avanzadas».
- Causa de «!!!!» con WebGPU: con pesos q4f16 algunas GPU desbordan las activaciones en fp16, los logits salen NaN y el modelo solo emite el token 0, que en Qwen es «!». La prueba inicial lo detecta y se usa una variante sin fp16 (LFM2 q4) o la CPU.
- Preparar sin atascos: si compilar y probar un modelo tarda más de 150 s («Preparando el modelo…» del 1.5B) se pasa a la siguiente opción; un fallo al crear la sesión reinicia el worker; los modelos grandes ya no se eligen solos. Botón Cancelar también durante la descarga.
- Fluidez: el modelo sigue en un Web Worker; la vista previa se repinta como mucho ~8 veces por segundo (antes se re-analizaba todo el texto en cada token y la web iba a tirones al reescribir); WASM deja un núcleo libre a la página; las peticiones van en cola; «Liberar memoria» y liberación tras 15 min sin uso; si ya funcionó y está descargado, se prepara sola al abrir el panel.
- Fases visibles: Preparando IA → Analizando documento → Generando respuesta → Aplicando formato → Creando documento (DOCX/PDF) → Documento listo, con Cancelar.
- Español de verdad: el contenido sale del propio texto (frases más representativas con TextRank, términos clave) y el modelo solo redacta; cada viñeta se compara con su frase original (palabras nuevas, cifras, negaciones, cobertura) y lo que no se apoya en el texto se sustituye por la frase original. Funciona igual con textos largos.
- Funciones: Resumir (ideas principales + términos clave), Explicar, Reescribir y Traducir (por párrafos, comprobando sentido e idioma), Esquema (secciones y subsecciones), Generar preguntas (con su respuesta), Analizar (datos, legibilidad Fernández Huerta, temas, estructura y sugerencias; sin descargar nada), Preguntar sobre el documento, Generar contenido y una caja «Pide lo que quieras» que entiende peticiones como «Resume este documento y créame un DOCX».
- Resultado: Insertar en el documento, Reemplazar selección, Añadir debajo, Copiar, Crear documento nuevo, Exportar DOCX (con encabezado, pie y número de página) y PDF. El formato admite títulos, negrita, cursiva, listas, numeración, tablas y saltos de página.
- Plantillas: cada categoría (Personal, Estudios, Empresas, Gestión…) es una sección con su título separado de las tarjetas y de la categoría anterior; una tarjeta sola ya no ocupa todo el ancho; en el móvil, una columna.

## 0.9.1 — 2026-10-19

Docs: lo que ves al soltar una imagen es lo que queda.

- Redimensionar por un lado (arriba, abajo, izquierda o derecha) ya no vuelve al tamaño original al soltar, en todos los modos («En línea», «Ajustar texto», «Detrás», «Delante»). Los lados conservan la proporción, como las esquinas; con Mayús se estira libremente y esa proporción se guarda.
- Mover desde el modo por defecto («En línea»): si se arrastra a un lado o a una zona de la página sin otro hueco entre párrafos, la imagen pasa a «Delante» y queda exactamente donde se suelta, sin mover el texto (ya no vuelve atrás ni salta a la esquina; se puede cambiar a «Ajustar texto» o «Detrás» en ⋯). Soltarla junto a otro párrafo la sigue recolocando entre párrafos con la línea de inserción.
- Se puede bajar la imagen hasta el final de la hoja también en un documento corto (antes el límite era poco más que el texto escrito). En el móvil (documento continuo) el límite es todo el lienzo y el documento crece para incluir las imágenes «Detrás»/«Delante».

## 0.9.0 — 2026-10-19

Presentaciones: la estructura y las funciones de Google Slides, con la identidad ORVUPI (crema, rosa y tinta, bordes redondeados, el pulpo y el botón rosa «Presentar»).

- Barra superior como Slides: pulpo, título editable, destacar, estado de guardado, menús completos (Archivo, Editar, Ver, Insertar, Formato, Diapositiva, Organizar, Herramientas, Ayuda), comentarios y «Presentar» con su menú (desde el principio, vista del presentador).
- Barra de herramientas: buscar en los menús, nueva diapositiva con menú de diseños, deshacer/rehacer, imprimir, copiar formato, zoom/Ajustar, seleccionar, cuadro de texto, imagen, formas (19), líneas y flechas, comentario, Fondo, Diseño, Tema y Transición; con un objeto seleccionado cambia a sus herramientas (fuente, − / tamaño / + de 1 en 1 y lista 1–96, negrita, cursiva, subrayado, tachado, color, resaltado, alineación, interlineado, listas, relleno, borde, grosor, trazo, puntas, recortar, enlace, opciones de formato y animar). Se puede contraer.
- Diapositivas de 16:9 (10 × 5,625 in) con 11 diseños reales y marcadores «Haz clic para añadir un título / subtítulo / texto»; 10 temas con vista previa; tira de miniaturas reales que se reordenan arrastrando; vista de cuadrícula; reglas en cm; notas del orador debajo con altura ajustable.
- Objetos: texto con formato, formas, líneas y flechas, imágenes (subir, pegar, por URL, recortar, transparencia), tablas, gráficos (barras, columnas, líneas, circular), diagramas y vídeo (YouTube o archivo). Seleccionar, mover, cambiar tamaño (8 tiradores), girar, guías inteligentes, selección por recuadro, agrupar, ordenar, alinear, distribuir, voltear, copiar/cortar/pegar entre diapositivas, deshacer y combinaciones de teclas de Slides. Funciona con ratón y con el dedo.
- Presentar a pantalla completa con transiciones (disolver, atenuar, deslizar, voltear, cubo, galería), animaciones al hacer clic, puntero láser, pantalla negra/blanca, saltar a una diapositiva y diapositivas omitidas; vista del presentador en otra ventana con siguiente diapositiva, notas y cronómetro.
- Exportar a PDF (con texto seleccionable), PNG, PowerPoint (.pptx real con texto editable, formas, líneas, imágenes, tablas, notas, transiciones y enlaces), texto y .orvslides; importar .pptx de verdad (formas, texto con formato, imágenes, tablas, fondos, notas). Historial de versiones con restaurar. Comentarios con respuestas y resolver. Imprimir una diapositiva por página.
- Seguridad: la CSP permite solo lo necesario para vídeo de YouTube (youtube-nocookie) e imágenes por URL.

## 0.8.9 — 2026-10-19

Docs: tamaño de letra como Google Docs, sin saltos y sin hueco en la barra.

- Ya no hay espacio en blanco entre la fuente («Arial») y − / +: el selector de fuente mide lo que su nombre y los controles van seguidos, en el escritorio y en el móvil.
- − y + bajan o suben 1 pt en cada pulsación (de 1 a 400), en una palabra, en varias, en una parte de un párrafo, en varios párrafos y en los títulos (H1–H6). Con tamaños mezclados cada trozo se mueve 1 desde el suyo. En un título sin tamaño propio se parte de su tamaño real (H1 = 26, H2 = 18…) y se aplica una marca explícita.
- La caja del número muestra el tamaño real de la selección (también en títulos) y acepta un número escrito con Intro. Salir de la caja sin cambiar el número ya no toca el texto.
- La lista de tamaños va del 1 al 96, todos los números en orden y sin saltos, se puede desplazar, se abre en el tamaño actual y lo resalta.
- Móvil: el texto se muestra algo más grande que en la hoja (16 px = 11 pt); los títulos y los tamaños elegidos se escalan igual, así que cada punto que se sube o se baja se nota (antes 12 pt se veía igual que 11).
## 0.8.8 — 2026-10-19

ORVUPI AI: resultados limpios y entregados como documento.

- Entrada limpia: antes de enviar el texto al modelo se quitan imágenes (markdown y HTML), data URLs, `blob:`, URLs largas (se quedan en el dominio), marcado HTML, bloques base64 y rachas de símbolos. Los textos largos siguen yendo por partes.
- Salida controlada: se detecta la salida degenerada («![](![](!!!!…», rachas del mismo carácter, bucles de palabras, pocas letras) y se corta la generación en cuanto aparece; se reintenta una vez con más penalización de repetición y `no_repeat_ngram_size`, y si vuelve a fallar se muestra un mensaje claro (en WebGPU recomienda el modelo sin GPU, porque «!!!!» es el síntoma de NaN en fp16) en lugar de la basura.
- El resultado se muestra con formato (títulos, listas, negrita, cursiva) como vista previa.
- Cada función (resumir, explicar, preguntar, reescribir, traducir, esquema) entrega el resultado como documento: al terminar se crea en Mi unidad un documento de ORVUPI Work con formato, titulado con la función y el nombre del origen, y se abre. Botones: Copiar, Abrir el documento, Insertar en el documento (dentro de Docs, con formato), Descargar PDF y Descargar Word (.docx).
## 0.8.6 — 2026-10-19

Imágenes en Docs (pegadas, insertadas o importadas), sin fallos al moverlas ni al cambiarles el tamaño.

- Una imagen pegada o insertada nunca sale de los márgenes: su ancho se limita al ancho útil de la página.
- Redimensionar sin parpadeo: la paginación se congela durante el arrastre (antes recolocaba la imagen entre páginas en cada movimiento), el tamaño se aplica en requestAnimationFrame y sin transacciones hasta soltar. Las esquinas mantienen la proporción (Mayús la libera) con un cambio continuo; los lados cambian una dimensión. Nunca más ancha que la página. Ya no hay etiqueta de píxeles durante el arrastre.
- Mover con el ratón o con el dedo (con la imagen seleccionada) desde el centro: «En línea» la recoloca entre párrafos con línea de inserción; «Ajustar texto», «Detrás» y «Delante» se mueven libremente por todo el documento (se anclan al párrafo de destino) y siempre dentro de la página. Desplazamiento automático cerca de los bordes.
- El marco, los tiradores y el botón ⋯ se recortan por el área del documento: al hacer scroll ya no flotan sobre la barra de herramientas y desaparecen si la imagen sale de la vista. El ⋯ se coloca en la parte visible de la imagen.
- Menú ⋯ (0.8.5+): sin cambios de uso.

## 0.8.5 — 2026-10-18

ORVUPI AI: la descarga del modelo ya no falla con «network error» en el móvil.

- Causa: el modelo de ~480 MB se pedía en una sola petición; en el móvil la conexión se corta a mitad (Chrome lo notifica como «network error») y se perdía todo. Además, la Cache API rechaza entradas de cientos de MB, así que ni siquiera una descarga completa quedaba guardada. La CSP y CORS no eran el problema (los redireccionamientos de Hugging Face a `*.hf.co` ya estaban permitidos).
- Descarga por partes de 8 MB (peticiones Range) con hasta 6 reintentos por parte, espera progresiva, detección de conexiones colgadas y espera automática si el teléfono se queda sin conexión. Reanudable: lo descargado queda en el almacenamiento privado del navegador (OPFS) y continúa donde se quedó.
- Los modelos se guardan en OPFS en lugar de la Cache API; «Borrar modelos descargados» limpia ambos.
- En el móvil se recomienda por defecto el modelo más ligero (SmolLM2 135M, WASM, ~137 MB). Los demás siguen disponibles.
- Errores claros con la causa real: sin conexión, cortes repetidos, error del servidor, dominio bloqueado (bloqueador/VPN), falta de espacio, falta de memoria o fallo de la GPU.
- Privacidad sin cambios: solo se descargan los archivos públicos del modelo; el texto nunca sale del dispositivo.

## 0.8.4 — 2026-10-18

ORVUPI AI deja de ser una simulación: un modelo de lenguaje real, gratis, que se ejecuta dentro del navegador.

- Modelo local con transformers.js en un Web Worker: WebGPU cuando hay (q4f16) y WASM/CPU si no (q8). Modelos: Qwen2.5 0.5B Instruct (recomendado), Qwen2.5 1.5B Instruct (mejor calidad, equipos con ≥ 8 GB) y SmolLM2 135M (muy ligero). Se descarga solo al pulsar «Descargar», con barra de progreso, y queda en la caché del navegador; botón para borrarla.
- Origen del texto: el documento abierto (todas las pestañas), la selección, cualquier archivo de Work (documento, hoja como CSV, presentación, nota) o texto pegado.
- Acciones: Resumir, Explicar, Preguntar (chat), Reescribir, Traducir y Esquema; textos largos se trocean y se combinan. Resultado en directo con Detener, Copiar e Insertar en el documento.
- Botón ✨ ORVUPI AI dentro de Docs y guía de uso en el propio panel.
- Privacidad: el documento nunca sale del navegador; la red solo descarga el modelo (Hugging Face) y el motor WASM (jsDelivr). Si el dispositivo no puede ejecutarlo se dice claramente.

## 0.8.3 — 2026-10-18

Documentos grandes y cuatro arreglos de Docs pedidos desde producción, más pestañas del documento como en Google Docs.

- Documentos grandes: el límite por archivo pasa a 1 GB (imágenes sueltas 64 MB) y lo que manda es la cuota real del navegador (`navigator.storage.estimate`, con `persist()`). Las imágenes se guardan aparte como binarios en OPFS/IndexedDB (`orv-asset:`), no como base64 dentro del documento; se muestran reducidas (lado máx. 2000 px) pero se exportan originales. Barra de progreso al importar. Si no cabe: «No hay espacio: el archivo ocupa X y el navegador solo deja Y libres…». Probado con DOCX de 30, 100 y 250 MB.
- Tamaño de letra: − y + funcionan con selección y con el cursor dentro de una palabra, con los pasos de Google Docs (8…96) y el número se puede escribir.
- La hoja se centra en todo el ancho como en Google Docs, con el panel de pestañas abierto o cerrado y con zoom; la regla queda alineada.
- Imágenes: marco con 8 tiradores (esquinas mantienen proporción, lados no; Mayús lo invierte), ratón y táctil, tamaño en vivo, límite al ancho de página y barra flotante (en línea, ajustar texto, detrás, delante, tamaño original, eliminar). El tamaño se guarda y se exporta.
- Pestañas del documento: añadir, subpestañas anidadas con contraer/expandir, menú ⋮ y clic derecho (añadir subpestaña, eliminar con confirmación y deshacer, duplicar, cambiar nombre, emoji, copiar enlace #tab=, ocultar esquema, mover arriba/abajo, mover a / sacar del grupo), arrastrar y soltar (pulsación larga en táctil), esquema de títulos, teclado, cajón lateral en móvil. Se guardan y se exportan a DOCX/PDF como secciones con título y salto de página.

## 0.8.2 — 2026-10-18

Docs y la importación de DOCX dan otro paso hacia un procesador de textos completo. Todo se edita, se guarda y se exporta a DOCX y PDF.

- Cuadros de texto y formas (rectángulo, rectángulo redondeado, elipse). Se importan de DOCX (wps, grupos wpg y VML), se insertan desde Insertar, se escribe dentro y tienen ajuste de texto y desplazamiento.
- Notas al pie y notas finales con numeración automática. Las notas al pie salen al pie de su hoja en la vista paginada y las finales al final (i, ii, iii…). Un clic en el número abre la nota para editarla o borrarla.
- Secciones: columnas (w:cols), orientación y márgenes propios, y saltos de sección (página siguiente o continuo). Formato → Sección: columnas y orientación.
- Comentarios en el margen, como en Google Docs: alineados con el texto, con respuestas, resolver y reabrir. Se importan de comments.xml (con respuestas y resueltos) y se exportan a DOCX.
- Imágenes flotantes con ajuste cuadrado, arriba y abajo, detrás del texto o delante, y desplazamiento horizontal.
- La vista paginada parte párrafos y tablas más altos que una hoja, sin dejar una línea sola a cada lado, y repite la fila de encabezado de la tabla si está marcada (Formato → Fila de encabezado).
- Insertar tabla: cuadrícula de hasta 15 × 15 con ratón, toque o teclado (flechas e Intro) que indica «filas × columnas», y «Insertar tabla personalizada» con filas y columnas exactas (de 1 a 15, validado). En el teléfono, desde el botón de tabla de la barra inferior.

## 0.8.1 — 2026-10-18

Corrige lo que se veía mal al subir un documento de Word y al pegar imágenes en Docs.

- Importar DOCX ya no se queda solo con el texto. Lee los estilos de párrafo y de carácter: la negrita, cursiva, subrayado, tachado, color, tamaño, fuente y resaltado de cada tramo (también una palabra en negrita dentro de una línea), los títulos con su tamaño, la alineación, el interlineado y el espacio antes y después, las listas con viñetas y numeradas (con niveles), las tablas con celdas combinadas y fondo, los enlaces, el encabezado, el pie, el número de página, el tamaño, la orientación y los márgenes de la página.
- Las imágenes del DOCX (word/media, en línea, flotantes y VML) entran con su tamaño y su alineación, y se guardan dentro del documento local.
- Los saltos de página del DOCX (y «salto de página antes») se respetan.
- Vista paginada en el ordenador y la tablet: el documento se reparte en hojas separadas con el fondo entre ellas, como en un procesador de textos. Cada hoja muestra encabezado, pie y número de página. En el teléfono sigue el modo continuo, con el salto marcado.
- Pegar imágenes: una captura de pantalla (Ctrl+V / Cmd+V), «Copiar imagen» desde el navegador y HTML con imágenes incrustadas. También desde Editar → Pegar y arrastrando un archivo. Si una imagen es grande se reduce para que quepa en el almacenamiento local. Si solo llega el enlace a una imagen de otra web, se explica cómo pegarla.
- Exportar a DOCX conserva negrita y estilos por tramo, imágenes con su tamaño, alineación, espaciado, listas reales, tablas, saltos de página y la configuración de página. El PDF respeta el tamaño de las imágenes, la alineación y el estilo de cada tramo.
- Corregido: un documento que ya tenía saltos de página no abría el editor («The editor view is not available»).
- El selector de «Subir archivo» de Drive ya ofrece .docx y .pptx.

## 0.8.0 — 2026-10-17

Alfa de desarrollo. No es una versión de producción. Sigue en la vista previa.

- Fase 1 de Docs y Drive. La matriz pública está en `ANALISIS_WORKSPACE.md`.
- En Docs, subíndice y superíndice se guardan en el documento. Editar tiene seleccionar todo, cortar, copiar, pegar y pegar sin formato, con el portapapeles del navegador. Si el navegador lo niega, se dice.
- El esquema lleva a cada título. El índice insertado se rehace con los títulos y también salta. La nota al pie guarda el texto y lo lista bajo la hoja.
- Buscar tiene anterior. Archivo → Hacer una copia abre la copia en otra pestaña.
- Drive encuentra una palabra del texto del documento, no solo el nombre. Hojas, diapositivas y formularios siguen buscándose por el nombre.
- Un archivo de 0.1 a 0.7.0 sigue abriendo: la versión del archivo sigue en 1.
- En el teléfono, el asa de selección de Hojas queda en la esquina de la celda, también en la fila fijada. En el inicio, la fila de iconos cabe entera y no se desplaza de lado. Las capturas de las pruebas usan `ORVUPI_SCREENSHOTS` o una carpeta que se pueda escribir.
- La pantalla de archivos sigue la disposición de un administrador de archivos: lugares y herramientas en la columna, barra de vista sobre la lista, cuadrícula con icono propio, menú de acciones en cada archivo y panel de detalles. En el teléfono ese panel es una hoja. La marca sigue siendo ORVUPI.
- Docs guarda un gráfico, un dibujo y una ecuación que se editan, una marca de agua con texto propio, el número de cada página y un DOCX con negrita, tabla, encabezado y pie. También importa DOCX.
- Hojas guarda el filtro y vistas con nombre, rangos con nombre, validación por fórmula, dispersión, área y medidor. Drive busca en el texto de hojas, diapositivas, formularios, dibujos y notas.
- Presentaciones: vista del presentador con las notas al lado y puntero. Importa el texto de un PPTX.
- Formularios saltan a una sección según la respuesta y guardan el archivo o el vídeo local si cabe.
- Dibujos descarga PNG y SVG. Notas guardan una foto, un audio o un boceto.
- La caché sigue en red primero. Precargar el paquete entero tapaba la barra con el aviso de nueva versión, así que no se hace. El icono de la pestaña no entra en esa caché. El cuadro de autorrelleno queda a la izquierda del asa, para que el arrastre continúe el número.

## 0.7.0 — 2026-10-17

Alfa de desarrollo. No es una versión de producción.

- En el teléfono, una pulsación larga selecciona el texto de Docs con las asas y el menú del navegador. La barra inferior no se come el gesto y el menú de tabla ya no cancela el toque.
- En una tabla de Docs y en Hojas se arrastra el dedo, o el asa, para marcar un rango. «Combinar celdas» está en la barra y en Formato.
- En el escritorio, cada control de la barra y de Archivo, Editar, Ver, Insertar, Formato, Herramientas, Extensiones y Ayuda se pulsa con el ratón y cambia lo que se ve: estilos del título 1 al 6, caracteres, fecha, línea horizontal, configurar página y el recuento.
- Insertar una tabla, un gráfico o un dibujo añade el objeto. Ya no sustituye a la imagen que estaba seleccionada.
- En el teléfono la hoja solo pinta las filas que caben en pantalla, así que la rejilla no monta las mil filas.
- La pasada queda en `docs/AUDITORIA_FUNCIONAL.md`. Un archivo de 0.1 a 0.6.3 sigue abriendo: la versión del archivo sigue en 1.

## 0.6.3 — 2026-10-17

Alfa de desarrollo. No es una versión de producción.

- Docs entra en el modo de teléfono con un ancho de hasta 840 px o con un puntero grueso, sin mirar el ancho del papel. A 460 y 480 px se ven el menú ⋮ y la barra inferior, y no las reglas de escritorio.
- La meta viewport fija el ancho al dispositivo.
- El service worker usa la red primero para la página y los archivos, toma el control en cuanto hay una versión nueva y muestra «Nueva versión» para recargar. La caché anterior se descarta.
- Ayuda muestra el número de versión, para comprobar qué carga el teléfono.
- El subrayado es una sola línea continua bajo la palabra. Negrita, cursiva, subrayado y tachado no cambian la fuente a monoespacio ni el color a morado, y no parten la palabra en una marca por letra. El corrector sigue en su línea ondulada.
- El contador dice «1 palabra» en singular, en un texto pequeño y sin negrita. En el teléfono la hoja llega hasta la barra inferior y el texto tiene margen a los lados.
- Un archivo de 0.1 a 0.6.2 sigue abriendo: la versión del archivo sigue en 1.

## 0.6.2 — 2026-10-17

Alfa de desarrollo. No es una versión de producción.

- En el inicio el botón «Nuevo» es un icono y el contenido tiene sitio abajo, así que no tapa la descripción de «Nueva hoja». La cabecera ocupa menos de una quinta parte de la pantalla.
- Los filtros siguen en una fila y, si no caben, se desvanecen y hay una flecha para seguir.
- En Docs, la barra inferior empieza por negrita, cursiva, subrayado y alineación. El icono de tabla no queda partido por la flecha.
- En Hojas, «Fórmula o valor» es un marcador de una sola línea.
- Un archivo de 0.1 a 0.6.1 sigue abriendo: la versión del archivo sigue en 1.

## 0.6.1 — 2026-10-17

Alfa de desarrollo. No es una versión de producción.

- En el teléfono, Docs muestra el título entero, cambia los menús por un botón ⋮ y deja la hoja a 16 px de ancho de pantalla, sin encoger el A4. La barra inferior lleva fuente, tamaño, color, listas, tabla y más.
- Dentro de un editor se ocultan la barra de Drive, la navegación inferior y el botón «Nuevo». En Hojas, los menús y el formato caben en una fila y una hoja, y la rejilla ocupa la mayor parte de la pantalla.
- El inicio tiene la búsqueda a todo el ancho, los filtros en una sola fila y sitio abajo para que «Nuevo» no tape la lista.
- Si el enlace no corresponde a un archivo de este dispositivo, Docs, Hojas, Presentaciones, Formularios, Dibujos y Notas muestran la misma tarjeta: «Este archivo no está en este dispositivo» y «Volver a Drive».
- Un archivo de 0.1 a 0.6.0 sigue abriendo: la versión del archivo sigue en 1.

## 0.6.0 — 2026-10-17

Alfa de desarrollo. No es una versión de producción.

- En el móvil la hoja de Docs se ajusta al ancho, la regla vertical se oculta, la barra se desplaza en horizontal y hay una barra de formato abajo. Los menús se abren en una hoja inferior. El teclado deja sitio al cursor.
- Hojas, presentaciones, formularios, dibujos, notas y Drive caben en 360, 390, 412, 460 y 768 px. En el teléfono hay navegación inferior y el botón «Nuevo».
- La auditoría pasa a 119 de 119 (100 %). Entran gráfico, dibujo, marca de agua, ecuación, encabezado, pie, número de página, columnas y letra capital en Docs; escala de color, casilla, fecha, intervalo, imagen, nota, tabla dinámica, macro y CONSULTA en Hojas; animación, cuadrícula y patrón en Presentaciones; archivo y vídeo en Formularios; texto decorado y diagrama en Dibujos; búsqueda en Notas. Son subconjuntos locales: no hay SQL, hilos de comentarios ni subida a un servidor.
- Un archivo de 0.1 a 0.5.0 sigue abriendo: los campos nuevos son opcionales y la versión del archivo sigue en 1.

## 0.5.0 — 2026-10-17

Alfa de desarrollo. No es una versión de producción.

- Auditoría funcional contra la ayuda de Google en `docs/AUDITORIA_FUNCIONAL.md`: Drive, Docs, Sheets, Slides, Forms, Drawings y Notas. Cobertura 107 de 119 (89,9 %). Lo que necesita red o cuenta no aparece en los menús.
- Hojas: formato de número, moneda, porcentaje y fecha; negrita y colores; bordes; combinar celdas; ajustar texto; alineación; inmovilizar filas y columnas; insertar y eliminar filas y columnas; ordenar y filtrar; formato condicional «mayor que»; validación con desplegable; gráficos de barras, líneas y circular con Chart.js 4.5.1 (MIT); autorrelleno arrastrando el cuadro de la celda; copiar y pegar con formato; buscar y reemplazar; más de cien funciones (SUMA, SI, BUSCARV, CONTAR.SI, SUMAR.SI, CONCATENAR, HOY, REDONDEAR y sus nombres en inglés) y referencias a otra hoja.
- Diapositivas: cuadros de texto con negrita y cursiva, formas, líneas, imágenes, alinear y distribuir, orden de capas, fondo, diseños, transiciones de fundido y deslizar, notas del orador y PDF.
- Archivos: detalles, actividad local, versiones, mover a, accesos directos, descarga de carpeta en ZIP y uso de almacenamiento. Compartir no está.
- Formularios: opción, casillas, desplegable, escala, fecha, hora y cuadrícula; obligatoria; secciones; vista previa; respuestas con resumen y gráfico; exportar a una hoja.
- Dibujos: línea, centrar y orden de capas, y descarga del `.ordraw`. Notas: etiqueta, archivar y copiar.
- Un archivo de 0.1 a 0.4.1 sigue abriendo: los campos nuevos son opcionales y la versión del archivo sigue en 1.

## 0.4.1 — 2026-10-17

Alfa de desarrollo. No es una versión de producción.

- En la página real del editor (`/document/d/<id>/edit`) la barra y los menús conservan la selección: el `mousedown` no le quita el foco a TipTap.
- Insertar tabla abre una rejilla de hasta 20×20. El clic derecho en una celda inserta o elimina filas, columnas y la tabla, combina y separa celdas, y cambia el borde y el fondo. Las columnas se arrastran.
- La fuente aplica Arial, Times New Roman, Georgia, Verdana, Courier New, Comic Sans MS y, con licencia OFL, Roboto, Inter, Lora, Merriweather y Montserrat. El control muestra la fuente de la selección.
- El tamaño baja y sube de uno en uno, acepta un número del 1 al 400 y ofrece la lista 8, 9, 10, 11, 12, 14, 18, 24, 30, 36, 48, 60, 72 y 96.
- Negrita, cursiva, subrayado y tachado se aplican, quedan activos y responden a Ctrl+B, Ctrl+I, Ctrl+U y Alt+Mayús+5. El color del texto y el resaltado abren una cuadrícula y un color personalizado.
- La alineación ofrece izquierda, centro, derecha y justificar, marca la opción activa y responde a Ctrl+Mayús+L, E, R y J.
- Estilo, interlineado, listas, sangría, borrar formato, enlace, imagen, comentario, imprimir, zoom, copiar formato, deshacer y rehacer ejecutan su acción.

## 0.4.0 — 2026-10-17

Alfa de desarrollo. No es una versión de producción.

- Docs ocupa la ventana, como el editor de referencia de 2024–2026: fondo `#f9fbfd`, título de 18 px, menú de 14 px, barra en una píldora `#edf2fa`, hoja A4 de 794×1123 px con margen de 96 px (2,54 cm), reglas en centímetros y panel de pestañas con el esquema de títulos.
- La barra aplica zoom, estilo, fuente, tamaño en puntos, negrita, cursiva, subrayado, color, resaltado, enlace, imagen, comentario, alineación, interlineado, listas, sangría y borrar formato. Los menús muestran el atajo (Ctrl+B, Ctrl+I, Ctrl+U, Ctrl+Z, Ctrl+Y, Ctrl+F, Ctrl+K).
- El icono es el de ORVUPI. La píldora de la derecha exporta en este dispositivo. No hay videollamada ni cambio de plan.
- Hojas muestra `fx` junto al cuadro de nombre. Encabezados grises y pestaña activa con franja verde de la paleta. Archivos usa buscador `#edf2fa` y lista de 48 px.
- Abrir o crear un documento, hoja, presentación, formulario, dibujo o nota abre otra pestaña del navegador. La URL es `/document/d/<id>/edit`, `/spreadsheets/d/<id>/edit`, `/presentation/d/<id>/edit`, `/forms/d/<id>/edit`, `/drawings/d/<id>/edit` o `/notes/d/<id>/edit`. El título es «nombre - ORVUPI Docs» (o la herramienta que corresponda) y cada una tiene su favicon. En Drive, el doble clic abre la pestaña. Un cambio en una pestaña avisa a las demás.
- Cloudflare Pages reenvía cualquier ruta a `index.html` (`public/_redirects`).
- Los archivos de 0.1, 0.2 y 0.3 siguen abriendo.

## 0.3.0 — 2026-10-17

Alfa de desarrollo. No es una versión de producción.

- La disposición de archivos sigue la estructura de Drive: buscador grande, chips Tipo y Modificado, chip Personas desactivado, botón Nuevo, columna con Inicio, Mi unidad, Recientes, Destacados, Papelera y barra de almacenamiento local.
- Lista con Nombre, Modificado y Tamaño, cuadrícula, migas, clic derecho, selección múltiple y panel de detalles. Inicio muestra sugeridos de este dispositivo.
- Atajos de archivos: `/`, Ctrl o Cmd + `/`, Alt+C y luego F, D, S o P, Alt+V y luego L o D.
- Docs, Hojas y Diapositivas tienen la fila Archivo, Editar, Ver, Insertar, Formato, Herramientas y Ayuda, estrella y título editable.
- Docs centra la página y muestra una regla.
- Hojas: barra de fórmulas, encabezados, pestañas al pie y cuadrícula virtual de 1000 filas por columnas A–AF. Un archivo de 50×12 de la 0.2.0 sigue abriendo.
- Diapositivas: miniaturas, cuatro temas y objetos movibles. Título y cuerpo se mantienen en el JSON.
- Iconos de Lucide 1.59.0 (ISC). El análisis está en `docs/ANALISIS_DRIVE_UI.md`.
- Formularios, Dibujos y Notas locales, con la disposición de esas herramientas: tarjetas de preguntas, lienzo y muro de notas. Los archivos antiguos de Docs, Hojas y Diapositivas siguen abriendo.

## 0.2.0 — 2026-10-17

Alfa de desarrollo. No es una versión de producción.

- El typecheck incluye los tipos de Node 22.19.7, así que `npm run build` ve `process` y `Buffer` en la configuración y en las pruebas.
- Archivos: carpetas anidadas, mover, renombrar, duplicar, papelera con restaurar, destacados, recientes, búsqueda, filtros, lista o cuadrícula, orden, etiquetas, color, arrastrar y soltar, subida y vista previa.
- Docs: estilos, fuentes, color, resaltado, interlineado, lista de tareas, índice, comentarios locales, historial manual, encabezado, pie, salto de página, impresión y exportación DOCX.
- Hojas: cuadrícula 50×12, SUMA, PROMEDIO, MIN, MAX, CONTAR, SI, orden, filtro, pestañas, fila inmovilizada, CSV y XLSX sencillo.
- Diapositivas de título y texto, con presentación local.
- Matriz de paridad en `docs/PARIDAD_DRIVE.md`.

## 0.1.0 — 2026-10-17

Alfa de desarrollo. No es una versión de producción.

- Aplicación Vite y React en `apps/work`, con barra lateral, barra superior, design system y paleta de comandos.
- Almacenamiento local: OPFS para bytes, IndexedDB para metadatos, y blobs de IndexedDB cuando OPFS no responde.
- Copia y restauración `orvupi-workspace` versión 1.
- PWA: manifiesto, iconos del pulpo y service worker solo en la build.
- ORVUPI Docs: TipTap, autoguardado con indicador veraz, exportación PDF, HTML, TXT y `.orvdoc`.
- Interfaz en español e inglés.
- CSP, saneado de HTML y revisión de licencias.
- Pruebas de unidad, integración, Playwright y axe.
