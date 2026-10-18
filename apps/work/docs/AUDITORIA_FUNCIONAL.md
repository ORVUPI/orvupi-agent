# Auditoría funcional 0.8.0

Comparación de ORVUPI Work con la ayuda oficial de Google. Cada fila es una función de menú, barra, menú contextual o panel. El aspecto y el atajo van en «para qué sirve». La columna «móvil» dice si esa función cabe en un teléfono.

Fuentes: [menús de Docs](https://support.google.com/docs/answer/7068618), [fórmulas de Sheets](https://support.google.com/docs/answer/46973), [menús de Slides](https://support.google.com/docs/answer/2763168), [Forms](https://support.google.com/docs/answer/2839737), [Drive](https://support.google.com/drive/answer/2424368), [Drawings](https://support.google.com/docs/answer/179740) y [Keep](https://support.google.com/keep/answer/2887916).

Estados: `funciona`, `roto`, `falta`, `fuera de alcance` (hace falta red o una cuenta). No hay botones muertos: lo que exige red no se muestra. En el móvil, `encaja` significa que la pantalla no se desborda a 360, 390, 412, 460 ni 768 px y el control se puede pulsar. `no aplica` acompaña a lo que no tiene botón.

Cobertura de la auditoría = `funciona` / (`funciona` + `roto` + `falta`). Lo que queda fuera de alcance no entra en el denominador.

Recuento de esta tabla: 145 filas. `funciona` 132, `roto` 0, `falta` 0, `fuera de alcance` 13. Cobertura de lo que tiene botón **100 %** (132 / 132). La matriz más amplia, con lo que Google documenta y aquí no está, está en `ANALISIS_WORKSPACE.md`: 152 filas, cobertura **86,2 %** (131 / 152). No es paridad con Google.

En 0.6.1 el teléfono no encoge la página de Docs: el texto queda a 16 px, los menús salen de un botón ⋮ y la rejilla de Hojas muestra al menos doce filas en 412×915. En 0.6.2 la cabecera de Drive cabe en menos de una quinta parte, «Nuevo» no tapa la tarjeta de la hoja y la fórmula es una sola línea. En 0.6.3 el modo de teléfono se activa hasta 840 px o con un puntero grueso, y Ayuda muestra la versión que cargó el dispositivo. En 0.7.0 cada control de Docs se pulsó con el ratón sobre texto seleccionado. La tabla de esa pasada está al final.

| herramienta | menú | función | para qué sirve | estado en ORVUPI | móvil | test |
| --- | --- | --- | --- | --- | --- | --- |
| Drive | Nuevo | Carpeta | Crea una carpeta en la vista actual. Botón «Nueva carpeta». | funciona | encaja | work.spec |
| Drive | Nuevo | Documento, hoja, presentación, formulario, dibujo y nota | Abre el editor en otra pestaña. Menú «Nuevo». | funciona | encaja | work.spec, suite-050 |
| Drive | Nuevo | Subir archivo | Elige un archivo local y lo guarda. Botón «Subir archivo». | funciona | encaja | — |
| Drive | Nuevo | Subir carpeta | Lee un directorio con `webkitdirectory`. Botón «Subir carpeta». | funciona | encaja | — |
| Drive | Barra | Buscar | Filtra por nombre, etiqueta y, en los documentos, por el texto guardado. Campo de búsqueda. Atajo `/`. | funciona | encaja | fase-080 |
| Drive | Ver | Lista y cuadrícula | Cambia la presentación. Botones con estado pulsado. | funciona | encaja | — |
| Drive | Ver | Ordenar por columnas | Nombre, modificado y tamaño. Cabeceras de la tabla. | funciona | encaja | suite-050 |
| Drive | Ver | Ordenar por creado y tipo | Selector «Ordenar». | funciona | encaja | — |
| Drive | Ver | Detalles | Panel con tipo, vista previa, tamaño y color. Botón «Detalles». | funciona | encaja | suite-050 |
| Drive | Panel | Actividad | Creado y modificado en este dispositivo. Título «Actividad». | funciona | encaja | suite-050 |
| Drive | Panel | Versiones | «Guardar versión» duplica el archivo. «Restaurar» copia esos bytes. | funciona | encaja | suite-050 |
| Drive | Contextual | Mover a | Lista de carpetas y la raíz. Llama a `moveFile`. | funciona | encaja | suite-050 |
| Drive | Contextual | Acceso directo | Otro registro que apunta al mismo contenido. | funciona | encaja | suite-050 |
| Drive | Contextual | Descargar | Descarga el archivo. | funciona | encaja | — |
| Drive | Contextual | Descargar carpeta | ZIP local de los archivos de la carpeta. | funciona | encaja | suite-050 |
| Drive | Barra | Almacenamiento | Medidor y texto «en este navegador». | funciona | encaja | suite-050 |
| Drive | Contextual | Destacar, renombrar, etiquetas, duplicar, papelera | Acciones locales del menú contextual. | funciona | encaja | — |
| Drive | Compartir | Compartir, enlace y permisos | Exigen una cuenta. No hay botón. | fuera de alcance | no aplica | — |
| Drive | Vista previa | Vista previa de Office en la nube | El visor de Google necesita red. | fuera de alcance | no aplica | — |
| Docs | Archivo | Imprimir | Abre el cuadro de impresión. Ctrl+P. | funciona | encaja | docs-070 |
| Docs | Archivo | Configurar página | Cambia el papel (A4 o carta), la orientación y el margen. | funciona | encaja | docs-070 |
| Docs | Archivo | Exportar ORVDOC, HTML, PDF y DOCX | Descarga el archivo real. Menú «Exportar». | funciona | encaja | work.spec |
| Docs | Archivo | Cerrar | Cierra la pestaña del editor. | funciona | encaja | work.spec |
| Docs | Archivo | Hacer una copia | Duplica el documento y abre la copia en otra pestaña. | funciona | encaja | fase-080 |
| Docs | Editar | Deshacer y rehacer | Vuelven atrás o adelante. Ctrl+Z y Ctrl+Y. | funciona | encaja | docs-070 |
| Docs | Editar | Buscar y reemplazar | Sustituye el texto encontrado. Ctrl+F. Anterior no da la vuelta. | funciona | encaja | docs-070, fase-080 |
| Docs | Editar | Seleccionar todo, cortar, copiar y pegar | Usan la selección y el portapapeles del navegador. Si el navegador lo niega, se dice. | funciona | encaja | fase-080 |
| Docs | Editar | Pegar sin formato | Inserta el texto plano, sin las marcas del HTML. | funciona | encaja | fase-080 |
| Docs | Ver | Regla | Muestra u oculta la regla. | funciona | encaja | docs-070 |
| Docs | Ver | Zoom | 50, 75, 100, 125 y 150 %. | funciona | encaja | docs-070 |
| Docs | Ver | Modo edición y visualización | La visualización deja el texto sin editar. | funciona | encaja | docs-070 |
| Docs | Insertar | Imagen | Elige una imagen local. | funciona | encaja | docs-070 |
| Docs | Insertar | Enlace | Diálogo de URL. Ctrl+K. | funciona | encaja | docs-070 |
| Docs | Insertar | Tabla | Rejilla hasta 20×20. | funciona | encaja | docs-070 |
| Docs | Insertar | Salto de página | Inserta un salto. | funciona | encaja | docs-070 |
| Docs | Insertar | Comentario | Nota local, no un hilo en la red. | funciona | encaja | docs-070 |
| Docs | Insertar | Caracteres especiales | Inserta el símbolo elegido, por ejemplo €. | funciona | encaja | docs-070 |
| Docs | Insertar | Fecha | Inserta la fecha de hoy como AAAA-MM-DD. | funciona | encaja | docs-070 |
| Docs | Insertar | Línea horizontal | Inserta una línea de separación. | funciona | encaja | docs-070 |
| Docs | Insertar | Índice | Inserta un índice que se rehace con los títulos y salta a ellos. | funciona | encaja | fase-080 |
| Docs | Insertar | Nota al pie | Guarda el texto y lo lista bajo la hoja. | funciona | encaja | fase-080 |
| Docs | Ver | Esquema | Cada título del esquema lleva el cursor a ese título. | funciona | encaja | fase-080 |
| Docs | Formato | Negrita, cursiva, subrayado y tachado | Marcas sobre la selección. Ctrl+B/I/U y Alt+Mayús+5. | funciona | encaja | docs-070 |
| Docs | Formato | Subíndice y superíndice | Marcas que se guardan en el documento. | funciona | encaja | fase-080 |
| Docs | Formato | Color de texto y resaltado | Rejillas de color y color propio. | funciona | encaja | docs-070 |
| Docs | Formato | Fuente y tamaño | Familias del sistema y OFL. Tamaño 1–400. El + y el − cambian un punto. | funciona | encaja | docs-070 |
| Docs | Formato | Alineación | Izquierda, centro, derecha y justificar. Ctrl+Mayús+L/E/R/J. | funciona | encaja | docs-070 |
| Docs | Formato | Estilos de párrafo | Texto normal y títulos 1 a 6. | funciona | encaja | docs-070 |
| Docs | Formato | Interlineado y sangría | Cambian el bloque. | funciona | encaja | docs-070 |
| Docs | Formato | Listas y checklist | Viñetas, números y tareas. | funciona | encaja | docs-070 |
| Docs | Formato | Borrar formato | Quita marcas y nodos. | funciona | encaja | docs-070 |
| Docs | Formato | Copiar formato | Pincel que repite las marcas. | funciona | encaja | docs-070 |
| Docs | Tabla | Filas, columnas, combinar, separar, borde y fondo | Menú contextual con el botón derecho. En el teléfono el dedo o el asa marcan el rango y «Combinar celdas» está en la barra. | funciona | encaja | docs-070 |
| Docs | Móvil | Selección de texto | Pulsación larga, asas y menú nativo. La barra no tapa el texto ni cancela el gesto. | funciona | encaja | docs-070 |
| Docs | Tabla | Ancho de columna | Arrastre del borde. | funciona | encaja | docs-commands |
| Docs | Herramientas | Versiones | Guarda y restaura dentro del documento. | funciona | encaja | docs-070 |
| Docs | Herramientas | Recuento de palabras | Abre el diálogo con las palabras y los caracteres. | funciona | encaja | docs-070 |
| Docs | Herramientas | Ortografía del navegador | El corrector es el del navegador, se puede apagar. | funciona | encaja | docs-070 |
| Docs | Ayuda | Atajos | Diálogo con la lista. Ctrl+/. | funciona | encaja | docs-070 |
| Docs | Extensiones | Complementos | No hay tienda. La entrada es una nota, no un botón. | fuera de alcance | no aplica | docs-commands |
| Docs | Archivo | Compartir y enviar por correo | Exigen cuenta. No están en el menú. | fuera de alcance | no aplica | — |
| Docs | Herramientas | Traducir, diccionario y voz | Servicios de red. No están en el menú. | fuera de alcance | no aplica | — |
| Docs | Insertar | Gráfico, dibujo, marca de agua y ecuaciones | Insertan una imagen de barras, un boceto, el texto «ORVUPI» en diagonal o la ecuación centrada E = mc². | funciona | encaja | mobile-060 |
| Docs | Insertar | Encabezado, pie y números de página | El menú enfoca el encabezado o el pie. El número muestra «1». | funciona | encaja | mobile-060 |
| Docs | Formato | Columnas y letra capital | El texto pasa a dos o tres columnas y la primera letra crece. | funciona | encaja | mobile-060 |
| Sheets | Archivo | CSV y XLSX | Descargan la cuadrícula. | funciona | encaja | — |
| Sheets | Archivo | Imprimir | Abre el cuadro de impresión. | funciona | encaja | — |
| Sheets | Editar | Borrar celda | Vacía la celda activa. | funciona | encaja | — |
| Sheets | Editar | Copiar y pegar | Llevan valor y formato. Menú Editar. | funciona | encaja | suite-050 |
| Sheets | Editar | Buscar y reemplazar | Diálogo sobre las celdas. Ctrl+F. | funciona | encaja | suite-050 |
| Sheets | Ver | Inmovilizar filas y columnas | Fija las filas o columnas hasta la celda activa. | funciona | encaja | suite-050 |
| Sheets | Ver | Quitar inmovilización | Vuelve a cero. | funciona | encaja | — |
| Sheets | Insertar | Fila y columna | Insertan y desplazan las referencias. | funciona | encaja | suite-050 |
| Sheets | Insertar | Eliminar fila y columna | Quitan la banda y ajustan las fórmulas. | funciona | encaja | — |
| Sheets | Insertar | Hoja | Añade una pestaña, hasta 12. | funciona | encaja | suite-050 |
| Sheets | Insertar | Gráfico de barras, líneas y circular | Chart.js, licencia MIT, empaquetado. | funciona | encaja | suite-050 |
| Sheets | Formato | Número, moneda, porcentaje, fecha y general | Cambian cómo se ve el valor. | funciona | encaja | suite-050 |
| Sheets | Formato | Negrita y colores | Negrita, tinta y fondo de la celda. Ctrl+B. | funciona | encaja | suite-050 |
| Sheets | Formato | Bordes, ajustar texto y alineación | Borde, salto de línea y alineación. | funciona | encaja | suite-050 |
| Sheets | Formato | Combinar y separar | En el teléfono el dedo o el asa marcan el rango y «Combinar celdas» lo une. En el escritorio sigue el menú Formato. | funciona | encaja | docs-070 |
| Sheets | Formato | Ordenar | Ascendente y descendente, con la fila fija quieta. | funciona | encaja | suite-050 |
| Sheets | Herramientas | Filtrar | Campo que oculta filas. | funciona | encaja | suite-050 |
| Sheets | Herramientas | Formato condicional | Pinta la columna si el valor es mayor que el umbral. | funciona | encaja | suite-050 |
| Sheets | Herramientas | Validación | Desplegable de opciones separadas por comas. | funciona | encaja | suite-050 |
| Sheets | Herramientas | Autorrellenar | Continúa números y desplaza referencias. El cuadro verde de la celda activa se arrastra; el menú rellena tres celdas hacia abajo. | funciona | encaja | suite-050 |
| Sheets | Fórmulas | SUMA, PROMEDIO, MIN, MAX, CONTAR y SI | Nombres en español y en inglés. | funciona | encaja | formulas.test, work.spec |
| Sheets | Fórmulas | Y, O, NO y SI.ERROR | Lógica. | funciona | encaja | formulas.test |
| Sheets | Fórmulas | BUSCARV, BUSCARH, INDICE y COINCIDIR | Búsqueda en un rango. | funciona | encaja | formulas.test |
| Sheets | Fórmulas | CONTAR.SI, SUMAR.SI y PROMEDIO.SI | Agregan con un criterio. | funciona | encaja | formulas.test |
| Sheets | Fórmulas | Texto | CONCATENAR, IZQUIERDA, DERECHA, EXTRAE, LARGO, MAYUSC, MINUSC, NOMPROPIO, ESPACIOS, SUSTITUIR, HALLAR, REPETIR, VALOR y TEXTO. | funciona | encaja | formulas.test |
| Sheets | Fórmulas | Fechas | HOY, AHORA, FECHA, AÑO, MES, DIA, HORA, MINUTO y SEGUNDO. | funciona | encaja | formulas.test |
| Sheets | Fórmulas | Matemáticas | ABS, RAIZ, POTENCIA, ENTERO, REDONDEAR, REDONDEAR.MAS, REDONDEAR.MENOS, RESIDUO, PRODUCTO, SIGNO, TRUNCAR, EXP, LN, LOG, LOG10, PI, SENO, COSENO, TAN, ALEATORIO, ALEATORIO.ENTRE, MEDIANA, K.ESIMO.MAYOR y K.ESIMO.MENOR. | funciona | encaja | formulas.test |
| Sheets | Fórmulas | Información | ESBLANCO, ESNUMERO, ESTEXTO, ESERROR, CONTARA y CONTAR.BLANCO. | funciona | encaja | formulas.test |
| Sheets | Fórmulas | Otra hoja | `Hoja2!A1` y `'Hoja 2'!A1`. | funciona | encaja | formulas.test, suite-050 |
| Sheets | Ayuda | Atajos | Diálogo, no un aviso vacío. | funciona | encaja | — |
| Sheets | Archivo | Compartir y publicar | Exigen cuenta. No están en el menú. | fuera de alcance | no aplica | — |
| Sheets | Herramientas | Tablas dinámicas, macros y CONSULTA | La dinámica cuenta valores únicos en otra hoja. La macro repite el estilo de la celda. CONSULTA y QUERY unen el texto del rango. No es el SQL de Google ni un constructor de tablas dinámicas. | funciona | encaja | mobile-060, formulas.test |
| Sheets | Insertar | Imagen en la celda y nota | La imagen local cabe en la celda. La nota se lee al señalarla. No hay un hilo de comentarios. | funciona | encaja | mobile-060 |
| Sheets | Formato | Escala de color | El color va del crema al verde según el número de la columna. El texto cambia para seguir leyéndose. | funciona | encaja | mobile-060 |
| Sheets | Herramientas | Casilla, fecha e intervalo | La celda ofrece una casilla, un calendario o un número entre un mínimo y un máximo. | funciona | encaja | mobile-060 |
| Slides | Archivo | Presentar | Pantalla de presentación. Flechas y Escape. | funciona | encaja | — |
| Slides | Archivo | Exportar PDF | PDF con pdf-lib. | funciona | encaja | suite-050 |
| Slides | Editar | Quitar objeto | Borra el objeto seleccionado, no el título ni el cuerpo fijos. | funciona | encaja | — |
| Slides | Ver | Presentar | La misma presentación. | funciona | encaja | — |
| Slides | Insertar | Cuadro de texto, rectángulo, elipse, imagen y línea | Objetos en el lienzo. | funciona | encaja | suite-050 |
| Slides | Formato | Temas | Papel, tinta, bosque y rosa. | funciona | encaja | — |
| Slides | Formato | Negrita y cursiva | El mismo criterio visual que Docs, sobre el cuadro de texto. | funciona | encaja | suite-050 |
| Slides | Formato | Fondo | Alterna el color de fondo de la diapositiva. | funciona | encaja | — |
| Slides | Formato | Transición | Fundido o deslizar al presentar. | funciona | encaja | — |
| Slides | Formato | Diseños | En blanco, título, título y texto, dos columnas. | funciona | encaja | — |
| Slides | Herramientas | Alinear y distribuir | Centra el objeto o reparte los objetos. | funciona | encaja | suite-050 |
| Slides | Herramientas | Orden de capas | Traer al frente y enviar atrás. | funciona | encaja | — |
| Slides | Panel | Notas del orador | Área de texto bajo las herramientas. | funciona | encaja | suite-050 |
| Slides | Ayuda | Atajos | Muestra la lista de atajos. | funciona | encaja | — |
| Slides | Archivo | Compartir y publicar en la web | Exigen cuenta. No están. | fuera de alcance | no aplica | — |
| Slides | Insertar | Audio, vídeo y enlaces a YouTube | Exigen red. No están. | fuera de alcance | no aplica | — |
| Slides | Formato | Animación del objeto | El objeto seleccionado entra con fundido o con un salto al presentar. | funciona | encaja | mobile-060 |
| Slides | Ver | Cuadrícula y patrón | La cuadrícula lista las diapositivas. El patrón escribe un texto fijo en el lienzo. | funciona | encaja | mobile-060 |
| Forms | Ver | Editar, responder, vista previa y respuestas | Cuatro modos. | funciona | encaja | suite-050 |
| Forms | Insertar | Pregunta | Añade una pregunta. | funciona | encaja | — |
| Forms | Formato | Obligatoria | Marca la primera pregunta que no es una sección. También hay casilla en cada tarjeta. | funciona | encaja | — |
| Forms | Preguntas | Corta, párrafo, opción, casillas, desplegable, escala, fecha, hora, cuadrícula y sección | El tipo se elige en «Tipo». | funciona | encaja | suite-050 |
| Forms | Respuestas | Resumen y gráfico | Cuenta las opciones y dibuja barras con Chart.js. | funciona | encaja | suite-050 |
| Forms | Respuestas | Exportar a una hoja | Crea una hoja local y la abre. | funciona | encaja | suite-050 |
| Forms | Ayuda | Descripción | Muestra el texto de ayuda. | funciona | encaja | — |
| Forms | Enviar | Publicar un enlace | Exige una cuenta. No está. | fuera de alcance | no aplica | — |
| Forms | Respuestas | Destinatarios y notificaciones | Exigen correo. No están. | fuera de alcance | no aplica | — |
| Forms | Preguntas | Subida de archivo y vídeo | La respuesta guarda el nombre del archivo local. El vídeo acepta `video/*`. No se sube a un servidor. | funciona | encaja | mobile-060 |
| Drawings | Archivo | Descargar | Guarda el `.ordraw`. | funciona | encaja | — |
| Drawings | Editar | Quitar objeto | Borra la selección. | funciona | encaja | — |
| Drawings | Ver | Volver al lienzo | Quita la selección. | funciona | encaja | — |
| Drawings | Insertar | Texto, rectángulo, elipse, imagen y línea | Barra y menú. | funciona | encaja | suite-050 |
| Drawings | Formato | Relleno | Avanza el color de la forma. | funciona | encaja | — |
| Drawings | Herramientas | Centrar y orden de capas | Alinea el objeto y cambia su capa. | funciona | encaja | suite-050 |
| Drawings | Ayuda | Ayuda | Muestra el texto del lienzo. | funciona | encaja | — |
| Drawings | Archivo | Compartir | Exige cuenta. No está. | fuera de alcance | no aplica | — |
| Drawings | Insertar | Texto decorado y diagrama | Inserta «ORVUPI» grande y dos rectángulos unidos por una línea. | funciona | encaja | mobile-060 |
| Notas | Tarjeta | Crear, texto, lista y color | Nota local con checks y paleta. | funciona | encaja | suite-tools |
| Notas | Tarjeta | Fijar | Separa fijadas y el resto. | funciona | encaja | — |
| Notas | Tarjeta | Etiqueta | Campo «Etiqueta» en la nota. | funciona | encaja | suite-050 |
| Notas | Tarjeta | Archivar y ver archivadas | Oculta la nota hasta que se piden las archivadas. | funciona | encaja | suite-050 |
| Notas | Tarjeta | Copiar | Guarda otra nota con el mismo texto. | funciona | encaja | suite-050 |
| Notas | Recordatorios | Fecha y lugar | Exigen cuenta o red. No hay botón. | fuera de alcance | no aplica | — |
| Notas | Colaborar | Colaboradores | Exigen cuenta. No hay botón. | fuera de alcance | no aplica | — |
| Notas | Buscar | Buscar dentro de las notas | Filtra por título, texto, etiqueta y casillas. | funciona | encaja | mobile-060 |

## Pasada de interacción 0.7.0

Cada fila se pulsó con el ratón, el teclado o el dedo. El resultado es el cambio visible en el DOM. `probado` significa que `docs-070` hizo ese gesto y comprobó el resultado. No es una paridad con Google: es la lista de lo que esta versión hace de verdad.

| control | dónde | resultado visible | estado | test |
| --- | --- | --- | --- | --- |
| Buscar | Barra | Se abre el campo de búsqueda. | probado | docs-070 |
| Deshacer y rehacer | Barra y Editar | El texto vuelve y se rehace. | probado | docs-070 |
| Imprimir | Barra y Archivo | Se llama a la impresión. | probado | docs-070 |
| Ortografía | Barra | `spellcheck` pasa a falso y otra vez a verdadero. | probado | docs-070 |
| Copiar formato | Barra | La negrita del segundo tramo pasa al primero. | probado | docs-070 |
| Zoom | Barra y Ver | La hoja pasa a 150 % y luego a 75 %. | probado | docs-070 |
| Estilo H1–H6 y texto normal | Barra y Formato | El párrafo pasa a `h1`…`h6` y vuelve a `p`. | probado | docs-070 |
| Fuente | Barra | El texto queda en Georgia. | probado | docs-070 |
| Tamaño − y + | Barra | El tamaño baja a 10 pt y sube a 12 pt. | probado | docs-070 |
| Negrita, cursiva, subrayado y tachado | Barra | `strong`, `em`, `.ow-ul` y `s`. | probado | docs-070 |
| Color del texto | Barra | El color pasa a `#cc0000`. | probado | docs-070 |
| Resaltado | Barra | El fondo pasa a `#fff4b8`. | probado | docs-070 |
| Enlace | Barra e Insertar | El texto queda en un enlace. | probado | docs-070 |
| Comentario | Barra e Insertar | Aparece la nota. | probado | docs-070 |
| Imagen | Barra e Insertar | Aparece la imagen. | probado | docs-070 |
| Alineación | Barra | El párrafo queda centrado, a la derecha, justificado y a la izquierda. | probado | docs-070 |
| Interlineado | Barra | El bloque queda a 2. | probado | docs-070 |
| Lista, lista numerada y checklist | Barra y Formato | `ul`, `ol` y la lista de tareas. | probado | docs-070 |
| Sangría − y + | Barra | `data-indent` sube y baja. | probado | docs-070 |
| Borrar formato | Barra y Formato | Desaparecen la negrita y el título. | probado | docs-070 |
| Modo | Barra y Ver | `contenteditable` pasa a falso y vuelve a verdadero. | probado | docs-070 |
| Ocultar y mostrar menús | Barra | La barra desaparece y vuelve. | probado | docs-070 |
| Configurar página | Archivo | Carta, horizontal y margen estrecho: 1056 px de ancho y 48 px de margen. | probado | docs-070 |
| Exportar TXT | Archivo | Se descarga un `.txt`. | probado | docs-070 |
| Buscar y reemplazar | Editar | «alfa» pasa a «beta». | probado | docs-070 |
| Regla | Ver | La regla se oculta. | probado | docs-070 |
| Tabla 4×5 | Insertar | 4 filas y 5 celdas en la primera. | probado | docs-070 |
| Fila y columna | Tabla, clic derecho | Crece y mengua la cuadrícula. | probado | docs-070 |
| Combinar y separar | Tabla, clic derecho | `colspan` aparece y desaparece. | probado | docs-070 |
| Borde y fondo | Tabla, clic derecho | El borde y el fondo de la celda cambian. | probado | docs-070 |
| Salto de página | Insertar | Aparece `hr.ow-page-break`. | probado | docs-070 |
| Línea horizontal | Insertar | Aparece otra `hr`. | probado | docs-070 |
| Fecha | Insertar | Aparece la fecha AAAA-MM-DD. | probado | docs-070 |
| Caracteres especiales | Insertar | Aparece €. | probado | docs-070 |
| Encabezado, pie y número | Insertar | El encabezado, el pie y el «1». | probado | docs-070 |
| Gráfico, dibujo, ecuación y marca de agua | Insertar | Imagen, E = mc² y el texto ORVUPI. | probado | docs-070 |
| Columnas y letra capital | Formato | La hoja pasa a dos columnas y crece la primera letra. | probado | docs-070 |
| Recuento de palabras | Herramientas | El diálogo muestra «1 palabra». | probado | docs-070 |
| Versiones | Herramientas | Aparece «Restaurar esta versión». | probado | docs-070 |
| Atajos | Ayuda | Se lee el atajo de tachado. | probado | docs-070 |
| Extensiones | Extensiones | La nota dice que no hay extensiones. | probado | docs-070 |
| Selección de texto | Docs, teléfono | `user-select` es `text`, el toque largo no se cancela y el dedo selecciona la palabra. La barra queda debajo. | probado | docs-070 |
| Combinar celdas | Tabla de Docs, teléfono | El dedo marca dos celdas y la barra las une. El asa también marca el rango. | probado | docs-070 |
| Combinar celdas | Hojas, teléfono | El dedo marca A1:B1, el asa marca otro rango y «Combinar celdas» deja una celda de dos columnas. | probado | docs-070 |

## Pasada 0.8.0

La fase 1 se ejecutó con el ratón, el teclado y el dedo. Cada archivo nuevo se abre en su propia pestaña. La copia de un documento también. Lo que no se puede hacer de verdad (compartir, traducir, diccionario, voz, extensiones) no tiene botón.

Playwright, una pasada completa el 18 de octubre de 2026: 100 pruebas, 98 pasaron y 2 se saltaron. Vitest: 38 pasaron.

| proyecto | resultado |
| --- | --- |
| Chromium, Firefox y WebKit en 1920×1080, 1366×768, 820×1180, 1180×820 y 390×844 | `fase-080` pasó. En el escritorio y el portátil el clic es de ratón. En tableta y teléfono el gesto es un toque, salvo Firefox, que no tiene pantalla táctil y usa clic. |
| Chromium y WebKit en 360×740 | `fase-080` pasó. |
| Firefox en 360×740 y en 390×844 | `fase-080` pasó. El icono de la pestaña no entra en la caché del service worker. |
| iPhone 14 (WebKit, viewport 390×664) | La rejilla de Hojas ocupa al menos el 65 % del alto. Columnas y letra capital se aplican. |
| Pixel 7 y el proyecto Chromium de 1360×900 | Pasaron, incluida la hoja en el teléfono. |

En el documento, axe (`wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`) no marcó incumplimientos al terminar el recorrido. Lighthouse 12.8.2, Chrome headless, contra la vista previa de inicio en este equipo (formulario móvil): rendimiento **78**, accesibilidad **100**, contraste **100**. Primera pintura 3,5 s, LCP 4,2 s, bloqueo total 30 ms, salto de diseño 0. Esos tiempos son de esta máquina, no de un teléfono en la calle.

| control | resultado visible | estado |
| --- | --- | --- |
| Buscar en Drive el texto guardado del documento | «claveunica080» muestra el archivo y un texto que no está lo oculta. | probado |
| Hacer una copia | Otra pestaña, otra URL, el mismo texto. | probado |
| Índice y esquema | El botón del índice y, en escritorio, el del esquema mueven el cursor al título. En tableta y teléfono el esquema está oculto: el salto se hace con el índice. | probado |
| Subíndice y superíndice | `sub` y `sup` sobre «fase», guardados en el documento. | probado |
| Nota al pie | El superíndice «1» y la lista con «nota de pie 080». | probado |
| Buscar anterior | «Z» sustituye al primer «uno», no al segundo. | probado |
| Seleccionar todo, copiar, pegar y pegar sin formato | El portapapeles queda en «fase». El pegado con formato deja `strong` y el pegado sin formato añade el texto plano. Si el navegador niega el portapapeles, se muestra el aviso. | probado |
| Cortar | En Chromium desaparece el tramo cortado. En los otros, o se corta o se avisa. | probado |

Docs guarda gráfico, dibujo y ecuación editables, marca de agua, número de página y DOCX con encabezado y pie, e importa DOCX. Hojas guarda filtro, vistas, rangos con nombre, validación por fórmula y gráficos de dispersión, área y medidor. Presentaciones tienen vista de presentador e importan el texto de un PPTX. Formularios saltan de sección y guardan un archivo o un vídeo local. Dibujos descargan PNG y SVG. Notas guardan foto, audio o boceto. Drive busca en el texto de esos archivos. Cobertura de la matriz: **86,2 %** (131 / 152). Sigue en parcial la apertura sin red tras la primera carga: la caché es red primero. Las 20 filas en `no` piden cuenta o red y no tienen botón.

Tres correcciones de la pasada 0.7.0, comprobadas el 18 de octubre de 2026 sin repetir la suite entera:

| corrección | comprobación |
| --- | --- |
| El asa de Hojas cae en la esquina de la celda, también en la fila fijada (A1). | El centro del asa queda a 2 px o menos de la esquina inferior derecha. Pasó en `docs-070` (Chromium) y en «la hoja responde» de `mobile-060` (Chromium a 412 px, Pixel 7 e iPhone 14). El arrastre del asa hasta B2 sigue combinando el rango. |
| En el inicio, el último icono de la barra cabe y la fila no se desplaza de lado. | «ORVUPI AI» queda dentro del ancho y `scrollWidth` de `.ow-top-actions` no supera al ancho visible. Pasó en Pixel 7, iPhone 14 y en 360, 390, 412, 460 y 768. |
| Las capturas no dependen de una carpeta fija. | `ORVUPI_SCREENSHOTS` elige la ruta. Si no está, se usa `/opt/cursor/artifacts/screenshots` cuando se puede escribir; si no, una carpeta temporal. |

La pantalla de archivos adopta la disposición de un administrador de archivos, con la marca de ORVUPI. Comprobado el 18 de octubre de 2026, sin repetir la suite entera ni Lighthouse.

| comprobación | resultado |
| --- | --- |
| Escritorio 1366×768 | La columna separa Lugares y Herramientas. El buscador queda entre el título y los iconos. El panel de detalles mide 320 px y Actividad se ve. La página no se desplaza de lado. axe (AA) no marcó incumplimientos con el panel abierto. |
| Teléfono 390×844 y 360×740, con toque | Modificado y tamaño quedan ocultos. El panel es una hoja fija. En 390 su borde inferior queda en 716 px y el botón Nuevo empieza en 724 px. En 360, 612 y 620. Actividad se ve. ORVUPI AI cabe (derecha 382 de 390, y 352 de 360). axe (AA) no marcó incumplimientos. |
| Playwright | Pasaron `work.spec`, «Drive muestra almacenamiento…» y «el inicio y Drive» en Chromium, más el inicio en Pixel 7 e iPhone 14. «No hay desbordamiento» pasó en Chromium (360, 390, 412, 460 y 768) y se saltó en Pixel 7, que ya usa su propio ancho. |
