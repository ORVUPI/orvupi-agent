# Auditoría funcional 0.5.0

Comparación de ORVUPI Work con la ayuda oficial de Google. Cada fila es una función de menú, barra, menú contextual o panel. El aspecto y el atajo van en «para qué sirve».

Fuentes: [menús de Docs](https://support.google.com/docs/answer/7068618), [fórmulas de Sheets](https://support.google.com/docs/answer/46973), [menús de Slides](https://support.google.com/docs/answer/2763168), [Forms](https://support.google.com/docs/answer/2839737), [Drive](https://support.google.com/drive/answer/2424368), [Drawings](https://support.google.com/docs/answer/179740) y [Keep](https://support.google.com/keep/answer/2887916).

Estados: `funciona`, `roto`, `falta`, `fuera de alcance` (hace falta red o una cuenta). No hay botones muertos: lo que exige red no se muestra.

Cobertura de la auditoría = `funciona` / (`funciona` + `roto` + `falta`). Lo que queda fuera de alcance no entra en el denominador.

Recuento: 132 filas. `funciona` 107, `roto` 0, `falta` 12, `fuera de alcance` 13. Cobertura **89,9 %** (107 / 119).

| herramienta | menú | función | para qué sirve | estado en ORVUPI | test |
| --- | --- | --- | --- | --- | --- |
| Drive | Nuevo | Carpeta | Crea una carpeta en la vista actual. Botón «Nueva carpeta». | funciona | work.spec |
| Drive | Nuevo | Documento, hoja, presentación, formulario, dibujo y nota | Abre el editor en otra pestaña. Menú «Nuevo». | funciona | work.spec, suite-050 |
| Drive | Nuevo | Subir archivo | Elige un archivo local y lo guarda. Botón «Subir archivo». | funciona | — |
| Drive | Nuevo | Subir carpeta | Lee un directorio con `webkitdirectory`. Botón «Subir carpeta». | funciona | — |
| Drive | Barra | Buscar | Filtra por nombre. Campo de búsqueda. Atajo `/`. | funciona | — |
| Drive | Ver | Lista y cuadrícula | Cambia la presentación. Botones con estado pulsado. | funciona | — |
| Drive | Ver | Ordenar por columnas | Nombre, modificado y tamaño. Cabeceras de la tabla. | funciona | suite-050 |
| Drive | Ver | Ordenar por creado y tipo | Selector «Ordenar». | funciona | — |
| Drive | Ver | Detalles | Panel con tipo, vista previa, tamaño y color. Botón «Detalles». | funciona | suite-050 |
| Drive | Panel | Actividad | Creado y modificado en este dispositivo. Título «Actividad». | funciona | suite-050 |
| Drive | Panel | Versiones | «Guardar versión» duplica el archivo. «Restaurar» copia esos bytes. | funciona | suite-050 |
| Drive | Contextual | Mover a | Lista de carpetas y la raíz. Llama a `moveFile`. | funciona | suite-050 |
| Drive | Contextual | Acceso directo | Otro registro que apunta al mismo contenido. | funciona | suite-050 |
| Drive | Contextual | Descargar | Descarga el archivo. | funciona | — |
| Drive | Contextual | Descargar carpeta | ZIP local de los archivos de la carpeta. | funciona | suite-050 |
| Drive | Barra | Almacenamiento | Medidor y texto «en este navegador». | funciona | suite-050 |
| Drive | Contextual | Destacar, renombrar, etiquetas, duplicar, papelera | Acciones locales del menú contextual. | funciona | — |
| Drive | Compartir | Compartir, enlace y permisos | Exigen una cuenta. No hay botón. | fuera de alcance | — |
| Drive | Vista previa | Vista previa de Office en la nube | El visor de Google necesita red. | fuera de alcance | — |
| Docs | Archivo | Imprimir | Abre el cuadro de impresión. Ctrl+P. | funciona | docs-commands |
| Docs | Archivo | Exportar ORVDOC, HTML, PDF y DOCX | Descarga el archivo real. Menú «Exportar». | funciona | work.spec |
| Docs | Archivo | Cerrar | Cierra la pestaña del editor. | funciona | work.spec |
| Docs | Editar | Deshacer y rehacer | Vuelven atrás o adelante. Ctrl+Z y Ctrl+Y. | funciona | docs-commands |
| Docs | Editar | Buscar y reemplazar | Diálogo sobre el texto. Ctrl+F. | funciona | docs-commands |
| Docs | Ver | Regla | Muestra u oculta la regla. | funciona | docs-commands |
| Docs | Ver | Zoom | 50, 75, 100, 125 y 150 %. | funciona | docs-commands |
| Docs | Ver | Modo edición y visualización | La visualización deja el texto sin editar. | funciona | docs-commands |
| Docs | Insertar | Imagen | Elige una imagen local. | funciona | docs-commands |
| Docs | Insertar | Enlace | Diálogo de URL. Ctrl+K. | funciona | docs-commands |
| Docs | Insertar | Tabla | Rejilla hasta 20×20. | funciona | docs-commands |
| Docs | Insertar | Salto de página | Inserta un salto. | funciona | docs-commands |
| Docs | Insertar | Comentario | Nota local, no un hilo en la red. | funciona | docs-commands |
| Docs | Formato | Negrita, cursiva, subrayado y tachado | Marcas sobre la selección. Ctrl+B/I/U y Alt+Mayús+5. | funciona | docs-commands |
| Docs | Formato | Color de texto y resaltado | Rejillas de color y color propio. | funciona | docs-commands |
| Docs | Formato | Fuente y tamaño | Familias del sistema y OFL. Tamaño 1–400. | funciona | docs-commands |
| Docs | Formato | Alineación | Izquierda, centro, derecha y justificar. Ctrl+Mayús+L/E/R/J. | funciona | docs-commands |
| Docs | Formato | Estilos de párrafo | Normal, título, subtítulo y título 3. | funciona | docs-commands |
| Docs | Formato | Interlineado y sangría | Cambian el bloque. | funciona | docs-commands |
| Docs | Formato | Listas y checklist | Viñetas, números y tareas. | funciona | docs-commands |
| Docs | Formato | Borrar formato | Quita marcas y nodos. | funciona | docs-commands |
| Docs | Formato | Copiar formato | Pincel que repite las marcas. | funciona | docs-commands |
| Docs | Tabla | Filas, columnas, combinar, separar, borde y fondo | Menú contextual de la celda. | funciona | docs-commands |
| Docs | Tabla | Ancho de columna | Arrastre del borde. | funciona | docs-commands |
| Docs | Herramientas | Versiones | Guarda y restaura dentro del documento. | funciona | docs-commands |
| Docs | Herramientas | Ortografía del navegador | El corrector es el del navegador, se puede apagar. | funciona | docs-commands |
| Docs | Ayuda | Atajos | Diálogo con la lista. Ctrl+/. | funciona | docs-commands |
| Docs | Extensiones | Complementos | No hay tienda. La entrada es una nota, no un botón. | fuera de alcance | docs-commands |
| Docs | Archivo | Compartir y enviar por correo | Exigen cuenta. No están en el menú. | fuera de alcance | — |
| Docs | Herramientas | Traducir, diccionario y voz | Servicios de red. No están en el menú. | fuera de alcance | — |
| Docs | Insertar | Gráfico, dibujo, marca de agua y ecuaciones | No hay esas inserciones en Docs. | falta | — |
| Docs | Insertar | Encabezado, pie y números de página | El documento no tiene esas zonas editables. | falta | — |
| Docs | Formato | Columnas y letras capitales | No están en el menú. | falta | — |
| Sheets | Archivo | CSV y XLSX | Descargan la cuadrícula. | funciona | — |
| Sheets | Archivo | Imprimir | Abre el cuadro de impresión. | funciona | — |
| Sheets | Editar | Borrar celda | Vacía la celda activa. | funciona | — |
| Sheets | Editar | Copiar y pegar | Llevan valor y formato. Menú Editar. | funciona | suite-050 |
| Sheets | Editar | Buscar y reemplazar | Diálogo sobre las celdas. Ctrl+F. | funciona | suite-050 |
| Sheets | Ver | Inmovilizar filas y columnas | Fija las filas o columnas hasta la celda activa. | funciona | suite-050 |
| Sheets | Ver | Quitar inmovilización | Vuelve a cero. | funciona | — |
| Sheets | Insertar | Fila y columna | Insertan y desplazan las referencias. | funciona | suite-050 |
| Sheets | Insertar | Eliminar fila y columna | Quitan la banda y ajustan las fórmulas. | funciona | — |
| Sheets | Insertar | Hoja | Añade una pestaña, hasta 12. | funciona | suite-050 |
| Sheets | Insertar | Gráfico de barras, líneas y circular | Chart.js, licencia MIT, empaquetado. | funciona | suite-050 |
| Sheets | Formato | Número, moneda, porcentaje, fecha y general | Cambian cómo se ve el valor. | funciona | suite-050 |
| Sheets | Formato | Negrita y colores | Negrita, tinta y fondo de la celda. Ctrl+B. | funciona | suite-050 |
| Sheets | Formato | Bordes, ajustar texto y alineación | Borde, salto de línea y alineación. | funciona | suite-050 |
| Sheets | Formato | Combinar y separar | Une el rango o la celda con la de la derecha. | funciona | suite-050 |
| Sheets | Formato | Ordenar | Ascendente y descendente, con la fila fija quieta. | funciona | suite-050 |
| Sheets | Herramientas | Filtrar | Campo que oculta filas. | funciona | suite-050 |
| Sheets | Herramientas | Formato condicional | Pinta la columna si el valor es mayor que el umbral. | funciona | suite-050 |
| Sheets | Herramientas | Validación | Desplegable de opciones separadas por comas. | funciona | suite-050 |
| Sheets | Herramientas | Autorrellenar | Continúa números y desplaza referencias. El cuadro verde de la celda activa se arrastra; el menú rellena tres celdas hacia abajo. | funciona | suite-050 |
| Sheets | Fórmulas | SUMA, PROMEDIO, MIN, MAX, CONTAR y SI | Nombres en español y en inglés. | funciona | formulas.test, work.spec |
| Sheets | Fórmulas | Y, O, NO y SI.ERROR | Lógica. | funciona | formulas.test |
| Sheets | Fórmulas | BUSCARV, BUSCARH, INDICE y COINCIDIR | Búsqueda en un rango. | funciona | formulas.test |
| Sheets | Fórmulas | CONTAR.SI, SUMAR.SI y PROMEDIO.SI | Agregan con un criterio. | funciona | formulas.test |
| Sheets | Fórmulas | Texto | CONCATENAR, IZQUIERDA, DERECHA, EXTRAE, LARGO, MAYUSC, MINUSC, NOMPROPIO, ESPACIOS, SUSTITUIR, HALLAR, REPETIR, VALOR y TEXTO. | funciona | formulas.test |
| Sheets | Fórmulas | Fechas | HOY, AHORA, FECHA, AÑO, MES, DIA, HORA, MINUTO y SEGUNDO. | funciona | formulas.test |
| Sheets | Fórmulas | Matemáticas | ABS, RAIZ, POTENCIA, ENTERO, REDONDEAR, REDONDEAR.MAS, REDONDEAR.MENOS, RESIDUO, PRODUCTO, SIGNO, TRUNCAR, EXP, LN, LOG, LOG10, PI, SENO, COSENO, TAN, ALEATORIO, ALEATORIO.ENTRE, MEDIANA, K.ESIMO.MAYOR y K.ESIMO.MENOR. | funciona | formulas.test |
| Sheets | Fórmulas | Información | ESBLANCO, ESNUMERO, ESTEXTO, ESERROR, CONTARA y CONTAR.BLANCO. | funciona | formulas.test |
| Sheets | Fórmulas | Otra hoja | `Hoja2!A1` y `'Hoja 2'!A1`. | funciona | formulas.test, suite-050 |
| Sheets | Ayuda | Atajos | Diálogo, no un aviso vacío. | funciona | — |
| Sheets | Archivo | Compartir y publicar | Exigen cuenta. No están en el menú. | fuera de alcance | — |
| Sheets | Datos | Tablas dinámicas, macros y QUERY | No están. | falta | — |
| Sheets | Insertar | Imagen dentro de la celda, comentario y nota | No están. | falta | — |
| Sheets | Formato | Formato condicional con escala de color | Solo hay una regla «mayor que». | falta | — |
| Sheets | Herramientas | Validación de casilla, fecha e intervalo | Solo hay desplegable. | falta | — |
| Slides | Archivo | Presentar | Pantalla de presentación. Flechas y Escape. | funciona | — |
| Slides | Archivo | Exportar PDF | PDF con pdf-lib. | funciona | suite-050 |
| Slides | Editar | Quitar objeto | Borra el objeto seleccionado, no el título ni el cuerpo fijos. | funciona | — |
| Slides | Ver | Presentar | La misma presentación. | funciona | — |
| Slides | Insertar | Cuadro de texto, rectángulo, elipse, imagen y línea | Objetos en el lienzo. | funciona | suite-050 |
| Slides | Formato | Temas | Papel, tinta, bosque y rosa. | funciona | — |
| Slides | Formato | Negrita y cursiva | El mismo criterio visual que Docs, sobre el cuadro de texto. | funciona | suite-050 |
| Slides | Formato | Fondo | Alterna el color de fondo de la diapositiva. | funciona | — |
| Slides | Formato | Transición | Fundido o deslizar al presentar. | funciona | — |
| Slides | Formato | Diseños | En blanco, título, título y texto, dos columnas. | funciona | — |
| Slides | Herramientas | Alinear y distribuir | Centra el objeto o reparte los objetos. | funciona | suite-050 |
| Slides | Herramientas | Orden de capas | Traer al frente y enviar atrás. | funciona | — |
| Slides | Panel | Notas del orador | Área de texto bajo las herramientas. | funciona | suite-050 |
| Slides | Ayuda | Atajos | Muestra la lista de atajos. | funciona | — |
| Slides | Archivo | Compartir y publicar en la web | Exigen cuenta. No están. | fuera de alcance | — |
| Slides | Insertar | Audio, vídeo y enlaces a YouTube | Exigen red. No están. | fuera de alcance | — |
| Slides | Formato | Animaciones por objeto | No hay animación de cada objeto. | falta | — |
| Slides | Ver | Cuadrícula y patrón | No hay esas vistas. | falta | — |
| Forms | Ver | Editar, responder, vista previa y respuestas | Cuatro modos. | funciona | suite-050 |
| Forms | Insertar | Pregunta | Añade una pregunta. | funciona | — |
| Forms | Formato | Obligatoria | Marca la primera pregunta que no es una sección. También hay casilla en cada tarjeta. | funciona | — |
| Forms | Preguntas | Corta, párrafo, opción, casillas, desplegable, escala, fecha, hora, cuadrícula y sección | El tipo se elige en «Tipo». | funciona | suite-050 |
| Forms | Respuestas | Resumen y gráfico | Cuenta las opciones y dibuja barras con Chart.js. | funciona | suite-050 |
| Forms | Respuestas | Exportar a una hoja | Crea una hoja local y la abre. | funciona | suite-050 |
| Forms | Ayuda | Descripción | Muestra el texto de ayuda. | funciona | — |
| Forms | Enviar | Publicar un enlace | Exige una cuenta. No está. | fuera de alcance | — |
| Forms | Respuestas | Destinatarios y notificaciones | Exigen correo. No están. | fuera de alcance | — |
| Forms | Preguntas | Subida de archivos y vídeo | No están. | falta | — |
| Drawings | Archivo | Descargar | Guarda el `.ordraw`. | funciona | — |
| Drawings | Editar | Quitar objeto | Borra la selección. | funciona | — |
| Drawings | Ver | Volver al lienzo | Quita la selección. | funciona | — |
| Drawings | Insertar | Texto, rectángulo, elipse, imagen y línea | Barra y menú. | funciona | suite-050 |
| Drawings | Formato | Relleno | Avanza el color de la forma. | funciona | — |
| Drawings | Herramientas | Centrar y orden de capas | Alinea el objeto y cambia su capa. | funciona | suite-050 |
| Drawings | Ayuda | Ayuda | Muestra el texto del lienzo. | funciona | — |
| Drawings | Archivo | Compartir | Exige cuenta. No está. | fuera de alcance | — |
| Drawings | Insertar | WordArt y diagramas | No están. | falta | — |
| Notas | Tarjeta | Crear, texto, lista y color | Nota local con checks y paleta. | funciona | suite-tools |
| Notas | Tarjeta | Fijar | Separa fijadas y el resto. | funciona | — |
| Notas | Tarjeta | Etiqueta | Campo «Etiqueta» en la nota. | funciona | suite-050 |
| Notas | Tarjeta | Archivar y ver archivadas | Oculta la nota hasta que se piden las archivadas. | funciona | suite-050 |
| Notas | Tarjeta | Copiar | Guarda otra nota con el mismo texto. | funciona | suite-050 |
| Notas | Recordatorios | Fecha y lugar | Exigen cuenta o red. No hay botón. | fuera de alcance | — |
| Notas | Colaborar | Colaboradores | Exigen cuenta. No hay botón. | fuera de alcance | — |
| Notas | Buscar | Buscar dentro de las notas | El muro no tiene buscador propio. | falta | — |
