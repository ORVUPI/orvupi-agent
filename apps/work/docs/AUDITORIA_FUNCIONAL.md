# Auditoría funcional 0.6.3

Comparación de ORVUPI Work con la ayuda oficial de Google. Cada fila es una función de menú, barra, menú contextual o panel. El aspecto y el atajo van en «para qué sirve». La columna «móvil» dice si esa función cabe en un teléfono.

Fuentes: [menús de Docs](https://support.google.com/docs/answer/7068618), [fórmulas de Sheets](https://support.google.com/docs/answer/46973), [menús de Slides](https://support.google.com/docs/answer/2763168), [Forms](https://support.google.com/docs/answer/2839737), [Drive](https://support.google.com/drive/answer/2424368), [Drawings](https://support.google.com/docs/answer/179740) y [Keep](https://support.google.com/keep/answer/2887916).

Estados: `funciona`, `roto`, `falta`, `fuera de alcance` (hace falta red o una cuenta). No hay botones muertos: lo que exige red no se muestra. En el móvil, `encaja` significa que la pantalla no se desborda a 360, 390, 412, 460 ni 768 px y el control se puede pulsar. `no aplica` acompaña a lo que no tiene botón.

Cobertura de la auditoría = `funciona` / (`funciona` + `roto` + `falta`). Lo que queda fuera de alcance no entra en el denominador.

Recuento: 132 filas. `funciona` 119, `roto` 0, `falta` 0, `fuera de alcance` 13. Cobertura **100 %** (119 / 119).

En 0.6.1 el teléfono no encoge la página de Docs: el texto queda a 16 px, los menús salen de un botón ⋮ y la rejilla de Hojas muestra al menos doce filas en 412×915. En 0.6.2 la cabecera de Drive cabe en menos de una quinta parte, «Nuevo» no tapa la tarjeta de la hoja y la fórmula es una sola línea. En 0.6.3 el modo de teléfono se activa hasta 840 px o con un puntero grueso, y Ayuda muestra la versión que cargó el dispositivo.

| herramienta | menú | función | para qué sirve | estado en ORVUPI | móvil | test |
| --- | --- | --- | --- | --- | --- | --- |
| Drive | Nuevo | Carpeta | Crea una carpeta en la vista actual. Botón «Nueva carpeta». | funciona | encaja | work.spec |
| Drive | Nuevo | Documento, hoja, presentación, formulario, dibujo y nota | Abre el editor en otra pestaña. Menú «Nuevo». | funciona | encaja | work.spec, suite-050 |
| Drive | Nuevo | Subir archivo | Elige un archivo local y lo guarda. Botón «Subir archivo». | funciona | encaja | — |
| Drive | Nuevo | Subir carpeta | Lee un directorio con `webkitdirectory`. Botón «Subir carpeta». | funciona | encaja | — |
| Drive | Barra | Buscar | Filtra por nombre. Campo de búsqueda. Atajo `/`. | funciona | encaja | — |
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
| Docs | Archivo | Imprimir | Abre el cuadro de impresión. Ctrl+P. | funciona | encaja | docs-commands |
| Docs | Archivo | Exportar ORVDOC, HTML, PDF y DOCX | Descarga el archivo real. Menú «Exportar». | funciona | encaja | work.spec |
| Docs | Archivo | Cerrar | Cierra la pestaña del editor. | funciona | encaja | work.spec |
| Docs | Editar | Deshacer y rehacer | Vuelven atrás o adelante. Ctrl+Z y Ctrl+Y. | funciona | encaja | docs-commands |
| Docs | Editar | Buscar y reemplazar | Diálogo sobre el texto. Ctrl+F. | funciona | encaja | docs-commands |
| Docs | Ver | Regla | Muestra u oculta la regla. | funciona | encaja | docs-commands |
| Docs | Ver | Zoom | 50, 75, 100, 125 y 150 %. | funciona | encaja | docs-commands |
| Docs | Ver | Modo edición y visualización | La visualización deja el texto sin editar. | funciona | encaja | docs-commands |
| Docs | Insertar | Imagen | Elige una imagen local. | funciona | encaja | docs-commands |
| Docs | Insertar | Enlace | Diálogo de URL. Ctrl+K. | funciona | encaja | docs-commands |
| Docs | Insertar | Tabla | Rejilla hasta 20×20. | funciona | encaja | docs-commands |
| Docs | Insertar | Salto de página | Inserta un salto. | funciona | encaja | docs-commands |
| Docs | Insertar | Comentario | Nota local, no un hilo en la red. | funciona | encaja | docs-commands |
| Docs | Formato | Negrita, cursiva, subrayado y tachado | Marcas sobre la selección. Ctrl+B/I/U y Alt+Mayús+5. | funciona | encaja | docs-commands |
| Docs | Formato | Color de texto y resaltado | Rejillas de color y color propio. | funciona | encaja | docs-commands |
| Docs | Formato | Fuente y tamaño | Familias del sistema y OFL. Tamaño 1–400. | funciona | encaja | docs-commands |
| Docs | Formato | Alineación | Izquierda, centro, derecha y justificar. Ctrl+Mayús+L/E/R/J. | funciona | encaja | docs-commands |
| Docs | Formato | Estilos de párrafo | Normal, título, subtítulo y título 3. | funciona | encaja | docs-commands |
| Docs | Formato | Interlineado y sangría | Cambian el bloque. | funciona | encaja | docs-commands |
| Docs | Formato | Listas y checklist | Viñetas, números y tareas. | funciona | encaja | docs-commands |
| Docs | Formato | Borrar formato | Quita marcas y nodos. | funciona | encaja | docs-commands |
| Docs | Formato | Copiar formato | Pincel que repite las marcas. | funciona | encaja | docs-commands |
| Docs | Tabla | Filas, columnas, combinar, separar, borde y fondo | Menú contextual de la celda. | funciona | encaja | docs-commands |
| Docs | Tabla | Ancho de columna | Arrastre del borde. | funciona | encaja | docs-commands |
| Docs | Herramientas | Versiones | Guarda y restaura dentro del documento. | funciona | encaja | docs-commands |
| Docs | Herramientas | Ortografía del navegador | El corrector es el del navegador, se puede apagar. | funciona | encaja | docs-commands |
| Docs | Ayuda | Atajos | Diálogo con la lista. Ctrl+/. | funciona | encaja | docs-commands |
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
| Sheets | Formato | Combinar y separar | Une el rango o la celda con la de la derecha. | funciona | encaja | suite-050 |
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
