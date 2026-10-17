# Análisis de la interfaz de Drive y de sus editores

Fecha: 17 de octubre de 2026. Este documento describe la estructura, los componentes, los flujos, los atajos y los menús de Google Drive, Docs, Sheets y Slides, y qué parte de esa estructura adopta ORVUPI Work 0.4.0.

La fuente es la ayuda oficial de Google, consultada ese día, más la disposición pública de esas pantallas (barra, navegación izquierda, lista, cuadrícula, lienzo). Las capturas públicas se usaron solo como referencia de colocación. No se copian logotipos, iconos, nombres de producto, la tipografía Product Sans, los cuatro colores de marca ni el triángulo. Los iconos de esta app son Lucide 1.59.0 (ISC). La paleta y la tipografía son las de ORVUPI.

## Fuentes

Archivos:

- Organizar carpetas: https://support.google.com/drive/answer/2375091
- Buscar y filtros: https://support.google.com/drive/answer/2375114
- Lista y cuadrícula: https://support.google.com/drive/answer/2375177
- Subir: https://support.google.com/drive/answer/2424368
- Abrir y vista previa: https://support.google.com/drive/answer/2423485
- Navegación con lector de pantalla: https://support.google.com/drive/answer/12169158
- Atajos: https://support.google.com/drive/answer/2563044

Documentos:

- Menús y atajos: https://support.google.com/docs/answer/179738
- Regla: https://support.google.com/docs/answer/6367684
- Títulos e índice: https://support.google.com/docs/answer/116338
- Recuento de palabras: https://support.google.com/docs/answer/39003
- Encabezado y pie: https://support.google.com/docs/answer/86629

Hojas:

- Barra de fórmulas: https://support.google.com/docs/answer/46977
- Atajos: https://support.google.com/docs/answer/181110
- Inmovilizar: https://support.google.com/docs/answer/9060449
- Formato y tema: https://support.google.com/docs/answer/46973
- AVERAGE: https://support.google.com/docs/answer/3093615
- IMPORTRANGE, fuera de alcance: https://support.google.com/docs/answer/3093340

Diapositivas:

- Tira de miniaturas: https://support.google.com/docs/answer/1694830
- Presentar: https://support.google.com/docs/answer/1696787

## Disposición de Drive

La pantalla de archivos se lee en cuatro zonas.

1. Barra superior. A la izquierda, el botón de crear. En el centro, un buscador ancho. Debajo o dentro del buscador, chips de filtro: tipo, personas, modificado y, en cuentas de trabajo, etiquetas. A la derecha, iconos de vista, detalles y ajustes.
2. Columna izquierda. Inicio, Mi unidad, Ordenadores, Compartidos conmigo, Recientes, Destacados, Spam, Papelera y una barra de almacenamiento. El botón «Nuevo» abre carpeta, subida de archivo, subida de carpeta y los editores.
3. Zona central. En una carpeta, migas de pan. Debajo, los archivos. La lista tiene columnas Nombre, Propietario, Modificado y Tamaño. La cuadrícula usa tarjetas. Inicio muestra sugeridos.
4. Panel derecho. Detalles y actividad del elemento seleccionado. Se puede cerrar.

ORVUPI Work copia esa rejilla y le cambia la marca:

| Zona de Drive | En ORVUPI Work |
| --- | --- |
| Buscador grande | Campo de búsqueda de la barra superior, a todo el ancho libre |
| Chip Tipo | Chip Tipo, con carpeta, documento, hoja, presentación, PDF y otros |
| Chip Personas | Visible y desactivado. El título explica que no hay cuentas |
| Chip Modificado | Hoy, 7 días, 30 días o cualquier fecha |
| + Nuevo | Botón rosa «Nuevo»: carpeta, Documento, Hoja, Presentación, más subir archivo y subir carpeta |
| Inicio | Inicio, con acciones rápidas y una fila Sugeridos |
| Mi unidad | Entrada «Mi unidad» y la vista de carpetas |
| Recientes, Destacados, Papelera | Tres entradas propias |
| Almacenamiento | Botón al pie de la columna, con barra del uso local y enlace a Ajustes |
| Migas | En la carpeta abierta, desde Raíz |
| Lista | Tabla Nombre, Modificado, Tamaño, con casilla |
| Cuadrícula | Tarjetas |
| Clic derecho | Menú contextual: abrir, detalles, destacar, renombrar, etiquetas, duplicar, descargar, papelera |
| Selección múltiple | Casillas y, si hay selección, barra de acciones |
| Detalles | Panel derecho con vista previa, actividad, tamaño, etiquetas y color |
| Sugeridos | En Inicio, destacados y luego recientes de este dispositivo. No hay un modelo en la nube |

Diferencia deliberada: en Drive un clic selecciona y un doble clic abre. Aquí un clic en el nombre abre, y la casilla selecciona. Así el teclado y el lector llegan al archivo en un solo paso, y la prueba de extremo a extremo sigue pudiendo abrir con un clic.

## Componentes de archivos

- `Sidebar` con acción (Nuevo y subidas), navegación y pie de almacenamiento.
- `Topbar` con título o nombre editable, estrella si hay un archivo abierto, buscador y chips.
- `FilesScreen` elige lista o cuadrícula, pinta migas y escucha el evento `ow-drive`.
- `ContextMenu` para el clic derecho.
- Barra `ow-actionbar` cuando hay una o más casillas marcadas. Mayús amplía el rango.
- Panel `ow-details`: imagen, texto de documento, CSV o texto plano. Un PDF dice que se descarga.
- Medidor `role="meter"` con el tamaño de los archivos no borrados frente a `navigator.storage.estimate`. Si el navegador no da cuota, la barra muestra un tramo corto y el texto sigue siendo el uso real.

Inicio no es una carpeta. Es un tablero: cuatro acciones (documento, hoja, presentación, PDF) y hasta ocho sugeridos. El texto bajo Sugeridos dice que salen de lo abierto y lo marcado en este dispositivo.

## Flujos de archivos

Crear. «Nuevo» elige carpeta, documento, hoja o presentación. La carpeta nace dentro de la carpeta abierta. El documento, la hoja y la presentación también, si hay `folderId`.

Subir. Un archivo suelto entra por el selector o al soltarlo en la vista. Una carpeta usa `webkitdirectory` y recrea los directorios hasta 40 archivos. CSV y XLSX se convierten en hoja. El resto de extensiones permitidas se guardan tal cual, con un máximo de 20 MB.

Abrir. Un documento abre Docs, una hoja abre Sheets, una presentación abre Slides, una carpeta cambia las migas. PDF y otros archivos abren el panel de detalles o la descarga.

Mover. Se arrastra sobre una carpeta o sobre la miga Raíz. Un ciclo (una carpeta dentro de sí misma o de un hijo) se rechaza.

Seleccionar. La casilla marca. Mayús marca el tramo entre el último clic y este. La barra permite destacar, mover a la papelera (o restaurar, si la vista es la papelera) y limpiar la selección.

Papelera. Restaurar una carpeta restaura lo que hay dentro. Vaciar pide confirmación.

Buscar. El cuadro filtra la vista actual por nombre y etiqueta. `/` lleva el foco al cuadro si no se está escribiendo en un campo.

## Atajos de Drive

La ayuda de Drive (https://support.google.com/drive/answer/2563044) documenta, en Windows, acordes con Alt y, en Mac, con Control. ORVUPI Work usa Alt para los acordes de creación y de vista, y Ctrl o Cmd para la lista de atajos. No se pulsa una letra suelta mientras se escribe.

| Gesto en Drive | En ORVUPI Work |
| --- | --- |
| `/` busca | `/` enfoca `#ow-search` |
| `Ctrl` o `Cmd` + `/` abre la lista de atajos | Igual. El diálogo junta los atajos de archivos y los del editor |
| Alt+C y luego F | Carpeta nueva |
| Alt+C y luego T (documento) | Alt+C y luego D. T ya es la letra de otra acción en algunos mapas; D es «documento» en la interfaz en español |
| Alt+C y luego S | Hoja |
| Alt+C y luego P | Presentación |
| Alt+V y luego L | Lista o cuadrícula |
| Alt+V y luego D | Abre o cierra detalles |
| Alt+G y luego N, I o D | No se replica. La columna izquierda ya tiene Inicio, Mi unidad y Papelera como botones |

Los acordes no disparan si el foco está en un campo, un área de texto o el editor.

## Menús de los editores

Docs, Sheets y Slides comparten la misma fila, según la ayuda de Docs (https://support.google.com/docs/answer/179738): Archivo, Editar, Ver, Insertar, Formato, Herramientas y Ayuda. Debajo va la barra de herramientas. Arriba, el título se edita y una estrella marca el archivo.

ORVUPI Work pone esa fila en los tres editores (`MenuBar`, `role="menubar"`). La estrella está en la barra superior siempre que hay un documento, una hoja o una presentación abierta. En Docs el título editable es el de la barra superior. En Hojas y Diapositivas el título editable es el campo «Nombre del archivo» del propio editor, porque esos formatos no pasan por la sesión de Docs.

### Docs

| Menú | Acciones de esta versión |
| --- | --- |
| Archivo | Imprimir, cerrar |
| Editar | Deshacer, rehacer, buscar y reemplazar |
| Ver | Mostrar u ocultar la regla |
| Insertar | Tabla, enlace, salto de página, comentario |
| Formato | Negrita, título 1, lista, checklist |
| Herramientas | Versiones |
| Ayuda | Atajos |

La barra de debajo conserva estilos, fuentes, tamaños, color, resaltado, alineación, interlineado, imagen, índice, encabezado y pie. El lienzo es una página centrada, de hasta 816 px, sobre un fondo de papel (`#f3e6d4`). La regla es una tira de marcas cada 40 px, decorativa (`aria-hidden`). No es la regla interactiva de Docs, que arrastra márgenes.

### Hojas

La ayuda de la barra de fórmulas (https://support.google.com/docs/answer/46977) describe un recuadro con la referencia (A1) y un campo con el valor o la fórmula. Debajo, encabezados de columna (A, B, C…) y de fila (1, 2, 3…). Las pestañas viven al pie. La cuadrícula de esta versión tiene 1000 filas y columnas A–AF (32). Solo se montan las filas y columnas visibles, con un margen. La primera fila puede quedarse fija. Las flechas mueven la celda activa si el foco no está en un campo.

| Menú | Acciones |
| --- | --- |
| Archivo | Exportar CSV y XLSX |
| Editar | Borrar la celda activa |
| Ver | Inmovilizar o soltar la primera fila |
| Insertar | Añadir hoja, hasta 12 |
| Formato | Ordenar la columna activa |
| Herramientas | Llevar el foco al filtro |
| Ayuda | El límite de la cuadrícula |

El filtro sigue siendo de vista: no reescribe el archivo. Ordenar no reescribe referencias. Al guardar, solo se escriben las celdas usadas; al abrir, se rellena de nuevo hasta 1000×32. Un archivo de la 0.2.0, de 50×12, sigue abriendo.

### Diapositivas

La tira de la izquierda (https://support.google.com/docs/answer/1694830) es una miniatura por diapositiva. El centro es el lienzo 16:9 (816×459). A la derecha, el tema y el texto del objeto seleccionado.

| Menú | Acciones |
| --- | --- |
| Archivo | Presentar |
| Editar | Quitar el objeto seleccionado, salvo el título y el cuerpo |
| Ver | Presentar |
| Insertar | Cuadro de texto, rectángulo, elipse, imagen |
| Formato | Temas Papel, Tinta, Bosque y Rosa |
| Herramientas | El texto de ayuda de la presentación |
| Ayuda | Atajos de la app |

Los objetos se arrastran. Una imagen entra como data URL, hasta 2 MB. Hay como mucho 24 objetos y 30 diapositivas. El título y el cuerpo siguen en el JSON para que un lector de la 0.2.0, que solo mire esos dos campos, no se rompa. Un guardado de la 0.2.0 que no conozca `items` perdería las formas: es el límite de leer un archivo nuevo con una build vieja.

Presentar ocupa el escenario. Flechas, espacio y los botones cambian de diapositiva. Escape sale.

## Qué no se copia

- Logotipo, wordmark, iconos de producto y el triángulo.
- Product Sans y cualquier webfont de Google. Los títulos usan Arial Rounded MT Bold o Trebuchet MS. El texto usa Inter (OFL).
- Los cuatro colores de marca. El acento es el rosa ORVUPI `#ff3070` como relleno, con texto `#102032`. El verde de éxito es `#0b5d36`, el de la barra de uso es `#007960`.
- Personas como filtro real, compartir, permisos, comentarios asignados, cursores en tiempo real, cuota de nube e IMPORTRANGE.
- Sugeridos por un modelo remoto. Los de Inicio son una ordenación local.

## Aspecto de cada herramienta

La ayuda oficial describe la función. La disposición pública de cada herramienta, vista el 17 de octubre de 2026, describe el aspecto: qué ocupa el centro, qué va en una tarjeta y qué color identifica la herramienta. ORVUPI Work toma esa estructura y la pinta con su paleta. El violeta de Formularios es `#5b2a86`, el azul de Dibujos es `#1d4e89` y el ámbar de Notas es `#7a4a00`. Ninguno es un color de marca de Google.

### Docs

Referencia: https://support.google.com/docs/answer/179738 y la regla en https://support.google.com/docs/answer/6367684.

El documento se lee como una página blanca centrada sobre un escritorio. Encima, el título y la estrella. Debajo, la fila de menús y una barra de iconos. La regla cruza el ancho de la página.

En ORVUPI Work la página mide hasta 816 px, el escritorio es `#f3e6d4` y la regla es una tira de marcas. El icono de la sección usa `#1d4e89`.

### Sheets

Referencia: https://support.google.com/docs/answer/46977.

La cuadrícula ocupa casi toda la ventana. Arriba, el recuadro del nombre de la celda y la fórmula en una sola línea. Las letras de columna y los números de fila enmarcan las celdas. La pestaña activa se distingue al pie.

En ORVUPI Work la cuadrícula visible crece con la ventana, la celda elegida marca su columna en verde claro y la pestaña activa es `#0b5d36` con texto `#fff8ec`.

### Slides

Referencia: https://support.google.com/docs/answer/1694830.

A la izquierda, una tira de miniaturas numeradas. En el centro, el lienzo sobre un fondo neutro. Presentar queda a mano.

ORVUPI Work usa esa misma columna, el lienzo 16:9 y el botón Presentar. El icono de la sección es `#9a3412`.

### Forms

Referencias: crear un formulario https://support.google.com/docs/answer/2839737 y los tipos de pregunta https://support.google.com/docs/answer/7322334.

La pantalla de preguntas es una pila de tarjetas. La primera lleva el título y la descripción, sobre una banda de color. Cada pregunta es otra tarjeta con el enunciado, el tipo y, si hace falta, las opciones. Un interruptor marca la pregunta como obligatoria. Otra vista lista las respuestas. Rellenar el formulario es una pantalla distinta de editarlo.

ORVUPI Work replica esa pila. La banda es violeta `#5b2a86`. Las tarjetas son blancas con una franja izquierda del mismo violeta. Los tipos locales son respuesta corta, párrafo, varias opciones y casillas. Las respuestas viven en el mismo archivo, hasta 200. No hay envío a una cuenta ni hoja enlazada.

### Drawings

Referencia: https://support.google.com/docs/answer/1726905.

Un dibujo es un lienzo en blanco con una barra de herramientas para texto, formas e imagen. Los objetos se seleccionan y se mueven. No hay páginas.

ORVUPI Work centra un lienzo de 960×640 sobre el mismo escritorio que Docs. La barra inserta cuadro de texto, rectángulo, elipse e imagen. Se arrastran. El archivo es `orvupi-drawing` versión 1, hasta 40 objetos.

### Keep

Referencia: https://support.google.com/keep/answer/2888248.

Keep no es una lista de archivos. Es un muro de tarjetas. Arriba, «Tomar una nota». Las fijadas van primero. Cada tarjeta tiene color, título y un texto o una lista de casillas.

ORVUPI Work hace ese muro en columnas. «Tomar una nota» crea una tarjeta. Fijar, el color de una lista cerrada y la lista de casillas se guardan en `orvupi-note` versión 1. El color oscuro usa texto crema. El verde y el ámbar usan texto oscuro de la paleta para seguir en AA.

## Medidas de Docs en 0.4.0

La URL de referencia devolvió 403, así que no hay captura de esa página. La tabla compara lo pedido en la descripción de esa pantalla con lo que pinta esta versión. El gris de las superficies es el de la referencia. El azul de marca no se usa: la píldora activa y los marcadores de la regla salen de `#1d4e89` y `#d9e6f7`, que ya estaban en la paleta de documentos.

| Pieza | Pedido | ORVUPI Work 0.4.0 |
| --- | --- | --- |
| Fondo | `#f9fbfd` | `#f9fbfd` |
| Título | 18 px, editable | 18 px, `line-height` 24 px |
| Menú | 14 px, en línea | 14 px, color `#444746` |
| Barra | píldora `#edf2fa`, iconos 20 px | altura 40 px, radio 24 px, iconos 20 px, color `#444746` (contraste 8,4:1) |
| Hoja | A4, margen 2,54 cm | 794×1123 px a 96 ppp; margen 96 px |
| Reglas | cm y marcadores | marcas cada milímetro; números en el área útil; marcador `#1d4e89` |
| Panel | pestañas y esquema en cursiva | 256 px; píldora `#d9e6f7`; cursiva `#5f6368` |
| Derecha | comentarios, compartir, avatar | comentarios, píldora Exportar, avatar «O» sobre `#1d4e89` |
| Plan superior y videollamada | sustituir o quitar | quitados |

## Contraste

Texto `#102032` sobre `#fff8ec`, `#ffffff` o `#fff0f5`. Texto apagado `#465365` sobre blanco. El chip Personas desactivado mantiene ese texto apagado, sin bajar la opacidad. La barra de acciones usa texto `#fff8ec` sobre `#102032`. El tema Tinta invierte esas dos tintas. El tema Bosque usa `#0b5d36` sobre `#e5f6ee`. Las líneas de la cuadrícula (`#c5ced6`) no son texto.
