# Análisis funcional de Workspace — ORVUPI Work 0.8.0

Matriz de las funciones públicas de Drive, Docs, Sheets, Slides, Forms, Drawings y Keep, comparada con ORVUPI Work. No es una paridad con Google: dice qué existe aquí, qué está a medias y qué no se va a simular.

Fuentes: [menús de Docs](https://support.google.com/docs/answer/7068618), [atajos de Docs](https://support.google.com/docs/answer/179738), [fórmulas de Sheets](https://support.google.com/docs/answer/46973), [menús de Sheets](https://support.google.com/docs/answer/170164), [menús de Slides](https://support.google.com/docs/answer/2763168), [Forms](https://support.google.com/docs/answer/2839737), [Drive](https://support.google.com/drive/answer/2424368), [Drawings](https://support.google.com/docs/answer/179740) y [Keep](https://support.google.com/keep/answer/2887916).

Columnas: función, si existe en ORVUPI Work (`sí`, `parcial`, `no`), prioridad y estado (`hecho`, `fase 1`, `pendiente`, `fuera`). `fuera` es una función que pide cuenta o red: no hay botón. `parcial` cuenta en el denominador.

Cobertura = filas `sí` / (filas `sí` + `parcial` + `no`).

Recuento de esta fase: 152 filas. `sí` 109, `parcial` 10, `no` 33. Cobertura **71,7 %** (109 / 152). La fase 1 marca 10 filas de Docs y Drive que antes no estaban. Hojas, presentaciones, formularios, dibujos y notas quedan para las fases siguientes, igual que lo que sigue en `parcial` o `pendiente`.

| herramienta | función | en ORVUPI Work | prioridad | estado |
| --- | --- | --- | --- | --- |
| Drive | Nueva carpeta | sí | alta | hecho |
| Drive | Nuevo documento, hoja, presentación, formulario, dibujo y nota, cada uno en su pestaña | sí | alta | hecho |
| Drive | Subir archivo | sí | alta | hecho |
| Drive | Subir carpeta | sí | alta | hecho |
| Drive | Importar HTML, TXT, CSV y XLSX al editor que corresponde | sí | alta | hecho |
| Drive | Importar DOCX | no | media | pendiente |
| Drive | Importar PPTX | no | media | pendiente |
| Drive | Vista de lista y de cuadrícula | sí | media | hecho |
| Drive | Ordenar por nombre, modificado, tamaño, creado y tipo | sí | media | hecho |
| Drive | Panel de detalles y actividad en este dispositivo | sí | media | hecho |
| Drive | Versiones locales: guardar y restaurar bytes | sí | alta | hecho |
| Drive | Mover, acceso directo, color, etiquetas, destacar, renombrar y duplicar | sí | alta | hecho |
| Drive | Papelera, restaurar y vaciar | sí | alta | hecho |
| Drive | Descargar archivo y ZIP de carpeta | sí | alta | hecho |
| Drive | Medidor de almacenamiento de este navegador | sí | media | hecho |
| Drive | Buscar por nombre y etiqueta, atajo / | sí | alta | hecho |
| Drive | Buscar dentro del texto guardado de un documento | sí | alta | fase 1 |
| Drive | Buscar dentro de hojas, diapositivas, formularios y dibujos | no | media | pendiente |
| Drive | Copia de seguridad del espacio y restauración | sí | alta | hecho |
| Drive | Plantillas de documento | sí | media | hecho |
| Drive | Sin conexión después de la primera carga | parcial | alta | pendiente |
| Drive | Compartir, enlace y permisos | no | baja | fuera |
| Drive | Comentarios de un archivo entre cuentas | no | baja | fuera |
| Drive | Vista previa de Office en la nube | no | baja | fuera |
| Drive | Solicitudes de acceso y prioridad de Workspace | no | baja | fuera |
| Docs | Imprimir | sí | alta | hecho |
| Docs | Configurar página: A4 o carta, orientación y margen | sí | alta | hecho |
| Docs | Exportar ORVDOC, HTML, TXT y PDF | sí | alta | hecho |
| Docs | Exportar DOCX | parcial | media | pendiente |
| Docs | Hacer una copia y abrirla en otra pestaña | sí | alta | fase 1 |
| Docs | Cerrar la pestaña | sí | alta | hecho |
| Docs | Deshacer y rehacer | sí | alta | hecho |
| Docs | Seleccionar todo | sí | alta | fase 1 |
| Docs | Cortar, copiar y pegar con el portapapeles | sí | alta | fase 1 |
| Docs | Pegar sin formato | sí | alta | fase 1 |
| Docs | Buscar, siguiente, anterior, reemplazar y reemplazar todo | sí | alta | fase 1 |
| Docs | Regla horizontal y vertical | sí | media | hecho |
| Docs | Zoom 50–150 % | sí | media | hecho |
| Docs | Modo edición y visualización | sí | media | hecho |
| Docs | Imagen local | sí | alta | hecho |
| Docs | Enlace | sí | alta | hecho |
| Docs | Tabla, filas, columnas, combinar, separar, borde, fondo y ancho | sí | alta | hecho |
| Docs | Salto de página y línea horizontal | sí | media | hecho |
| Docs | Nota local en el documento | sí | media | hecho |
| Docs | Hilo de comentarios entre cuentas | no | baja | fuera |
| Docs | Sugerencias de edición de otra persona | no | baja | fuera |
| Docs | Caracteres especiales y fecha de hoy | sí | media | hecho |
| Docs | Índice que se rehace con los títulos y salta a ellos | sí | alta | fase 1 |
| Docs | Esquema o pestaña que lleva el cursor al título | sí | alta | fase 1 |
| Docs | Nota al pie con el texto guardado bajo la hoja | sí | alta | fase 1 |
| Docs | Encabezado y pie de una sola franja | parcial | media | pendiente |
| Docs | Número de página | parcial | media | pendiente |
| Docs | Gráfico, dibujo, marca de agua y ecuación como objeto editable | parcial | media | pendiente |
| Docs | Negrita, cursiva, subrayado y tachado | sí | alta | hecho |
| Docs | Subíndice y superíndice | sí | alta | fase 1 |
| Docs | Color de texto, resaltado y color propio | sí | alta | hecho |
| Docs | Fuente y tamaño | sí | alta | hecho |
| Docs | Alineación, interlineado y sangría | sí | alta | hecho |
| Docs | Texto normal y títulos 1 a 6 | sí | alta | hecho |
| Docs | Listas, lista numerada y checklist | sí | alta | hecho |
| Docs | Borrar formato y copiar formato | sí | media | hecho |
| Docs | Columnas y letra capital | sí | baja | hecho |
| Docs | Ortografía del navegador, se puede apagar | sí | media | hecho |
| Docs | Recuento de palabras y caracteres | sí | media | hecho |
| Docs | Versiones dentro del documento | sí | alta | hecho |
| Docs | Atajos de teclado | sí | media | hecho |
| Docs | Selección de texto con el dedo | sí | alta | hecho |
| Docs | Arrastrar un rango de celdas con el dedo o el asa | sí | alta | hecho |
| Docs | Compartir y enviar por correo | no | baja | fuera |
| Docs | Traducir, diccionario y dictado | no | baja | fuera |
| Docs | Complementos y tienda | no | baja | fuera |
| Docs | Comparar documentos y control de cambios de otra cuenta | no | baja | fuera |
| Sheets | Exportar CSV y XLSX | sí | alta | hecho |
| Sheets | Importar CSV y XLSX | sí | alta | hecho |
| Sheets | Imprimir | sí | media | hecho |
| Sheets | Borrar, copiar y pegar valor y formato | sí | alta | hecho |
| Sheets | Buscar y reemplazar | sí | alta | hecho |
| Sheets | Inmovilizar y quitar la inmovilización | sí | media | hecho |
| Sheets | Insertar y eliminar fila y columna | sí | alta | hecho |
| Sheets | Añadir hoja, hasta 12 | sí | media | hecho |
| Sheets | Gráfico de barras, líneas y circular | sí | alta | hecho |
| Sheets | Gráfico de dispersión, área, mapa o medidor | no | baja | pendiente |
| Sheets | Número, moneda, porcentaje, fecha y general | sí | alta | hecho |
| Sheets | Negrita, tinta, fondo, bordes, ajuste y alineación | sí | alta | hecho |
| Sheets | Combinar y separar, también con el dedo | sí | alta | hecho |
| Sheets | Ordenar y dejar quieta la fila fija | sí | media | hecho |
| Sheets | Filtro de filas | parcial | media | pendiente |
| Sheets | Vistas de filtro con nombre | no | baja | pendiente |
| Sheets | Formato condicional por umbral | sí | alta | hecho |
| Sheets | Escala de color | sí | media | hecho |
| Sheets | Validación: lista, casilla, fecha e intervalo | sí | alta | hecho |
| Sheets | Validación con fórmula propia | no | baja | pendiente |
| Sheets | Autorrelleno | sí | alta | hecho |
| Sheets | SUMA, PROMEDIO, MIN, MAX, CONTAR y SI, en español y en inglés | sí | alta | hecho |
| Sheets | Y, O, NO y SI.ERROR | sí | alta | hecho |
| Sheets | BUSCARV, BUSCARH, INDICE y COINCIDIR | sí | alta | hecho |
| Sheets | CONTAR.SI, SUMAR.SI y PROMEDIO.SI | sí | alta | hecho |
| Sheets | Texto: CONCATENAR, IZQUIERDA, DERECHA, EXTRAE, LARGO, MAYUSC, MINUSC, NOMPROPIO, ESPACIOS, SUSTITUIR, HALLAR, REPETIR, VALOR y TEXTO | sí | media | hecho |
| Sheets | Fechas: HOY, AHORA, FECHA, AÑO, MES, DIA, HORA, MINUTO y SEGUNDO | sí | media | hecho |
| Sheets | Matemáticas: ABS, RAIZ, POTENCIA, ENTERO, REDONDEAR y familia, RESIDUO, PRODUCTO, SIGNO, TRUNCAR, EXP, LN, LOG, PI, SENO, COSENO, TAN, ALEATORIO y K.ESIMO | sí | media | hecho |
| Sheets | Información: ESBLANCO, ESNUMERO, ESTEXTO, ESERROR, CONTARA y CONTAR.BLANCO | sí | media | hecho |
| Sheets | Referencia a otra hoja | sí | alta | hecho |
| Sheets | Rangos con nombre | no | media | pendiente |
| Sheets | Tabla dinámica que cuenta valores, sin constructor | parcial | media | pendiente |
| Sheets | Macro que repite el estilo de la celda | parcial | baja | pendiente |
| Sheets | CONSULTA o QUERY como unión de texto, no como SQL | parcial | baja | pendiente |
| Sheets | IMPORTRANGE, GOOGLEFINANCE y SPARKLINE | no | baja | fuera |
| Sheets | Imagen en la celda y nota de celda | sí | media | hecho |
| Sheets | Comentarios entre cuentas y rangos protegidos | no | baja | fuera |
| Sheets | Atajos | sí | media | hecho |
| Sheets | Compartir y publicar en la web | no | baja | fuera |
| Slides | Presentar, flechas y Escape | sí | alta | hecho |
| Slides | Vista de presentador con las notas al lado de la diapositiva | no | media | pendiente |
| Slides | Puntero láser | no | baja | pendiente |
| Slides | Exportar PDF | sí | alta | hecho |
| Slides | Importar PPTX | no | media | pendiente |
| Slides | Quitar objeto | sí | alta | hecho |
| Slides | Cuadro de texto, rectángulo, elipse, imagen y línea | sí | alta | hecho |
| Slides | Temas, fondo y diseños | sí | media | hecho |
| Slides | Negrita y cursiva | sí | media | hecho |
| Slides | Transición de fundido o deslizar | sí | alta | hecho |
| Slides | Animación de entrada del objeto | sí | media | hecho |
| Slides | Alinear, distribuir y orden de capas | sí | media | hecho |
| Slides | Notas del orador en la edición | sí | media | hecho |
| Slides | Cuadrícula y patrón | sí | baja | hecho |
| Slides | Audio, vídeo y enlaces de red | no | baja | fuera |
| Slides | Compartir y publicar en la web | no | baja | fuera |
| Slides | Atajos | sí | media | hecho |
| Forms | Editar, responder, vista previa y respuestas | sí | alta | hecho |
| Forms | Añadir pregunta y marcarla obligatoria | sí | alta | hecho |
| Forms | Respuesta corta, párrafo, opción, casillas, desplegable, escala, fecha, hora, cuadrícula y sección | sí | alta | hecho |
| Forms | Lógica que salta a una sección según la respuesta | no | alta | pendiente |
| Forms | Resumen de respuestas y gráfico | sí | alta | hecho |
| Forms | Exportar respuestas a una hoja local | sí | alta | hecho |
| Forms | Subida: se guarda el nombre del archivo, y vídeo local | parcial | media | pendiente |
| Forms | Publicar un enlace | no | baja | fuera |
| Forms | Destinatarios y notificaciones | no | baja | fuera |
| Forms | Descripción de ayuda | sí | baja | hecho |
| Drawings | Descargar el dibujo | sí | alta | hecho |
| Drawings | Quitar objeto y volver al lienzo | sí | media | hecho |
| Drawings | Texto, rectángulo, elipse, imagen y línea | sí | alta | hecho |
| Drawings | Relleno, centrar y orden de capas | sí | media | hecho |
| Drawings | Texto decorado y diagrama de dos rectángulos | sí | baja | hecho |
| Drawings | Exportar PNG o SVG del lienzo | no | media | pendiente |
| Drawings | Compartir | no | baja | fuera |
| Drawings | Texto de ayuda | sí | baja | hecho |
| Keep | Crear nota, texto, lista y color | sí | alta | hecho |
| Keep | Fijar, etiqueta, archivar y copiar | sí | alta | hecho |
| Keep | Buscar por título, texto, etiqueta y casillas | sí | alta | hecho |
| Keep | Recordatorio por fecha o lugar | no | baja | fuera |
| Keep | Colaboradores | no | baja | fuera |
| Keep | Foto, audio o dibujo dentro de la nota | no | media | pendiente |
