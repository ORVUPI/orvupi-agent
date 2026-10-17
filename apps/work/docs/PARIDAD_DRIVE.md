# Matriz de paridad con Drive, Docs, Sheets y Slides

Revisión del 17 de octubre de 2026. La referencia es la ayuda oficial de Google, consultada ese día. Las capturas públicas de esas páginas sirvieron solo para entender la disposición (lista, cuadrícula, migas, barra de fórmula). No se copian marcas, iconos, textos ni colores de Google. La interfaz sigue la paleta ORVUPI.

Leyenda de estado:

- **Hecha**: el gesto existe en esta alfa y se queda en el dispositivo.
- **Parcial**: el gesto existe con un límite escrito.
- **Fuera**: hace falta cuenta, red, servidor o una licencia que este proyecto no acepta.

Prioridad: Alta es lo que una persona usa cada día en local. Media es cómodo y ya cabe en el modelo. Baja es colaboración, nube o un editor de presentación completo.

## Archivos

Referencias: [organizar](https://support.google.com/drive/answer/2375091), [buscar](https://support.google.com/drive/answer/2375114), [lista y cuadrícula](https://support.google.com/drive/answer/2375177), [subir](https://support.google.com/drive/answer/2424368), [abrir y vista previa](https://support.google.com/drive/answer/2423485), [vistas Recientes, Destacados y Papelera](https://support.google.com/drive/answer/12169158).

| Función | Prioridad | Estado | Notas de esta alfa |
| --- | --- | --- | --- |
| Carpetas y subcarpetas | Alta | Hecha | `folderId`. No se puede meter una carpeta dentro de sí misma ni de un descendiente. |
| Mover | Alta | Hecha | Arrastrar sobre una carpeta o sobre la miga «Raíz». |
| Renombrar | Alta | Hecha | Nombre saneado, máximo 180 caracteres. |
| Duplicar | Alta | Hecha | Copia carpeta, etiquetas y color. No copia el destacado. |
| Papelera y restaurar | Alta | Hecha | Borrado lógico. Restaurar una carpeta restaura lo que hay dentro. |
| Destacados | Alta | Hecha | Vista propia. |
| Recientes | Alta | Hecha | Por fecha de actualización. |
| Búsqueda por nombre y etiqueta | Alta | Hecha | El cuadro de la barra superior filtra la vista actual. |
| Filtro por tipo | Alta | Hecha | Carpeta, documento, hoja, diapositivas, PDF y otros. |
| Filtro por fecha | Alta | Parcial | Hoy, 7 días y 30 días. No hay un calendario de intervalo. |
| Vista lista y cuadrícula | Alta | Hecha | |
| Ordenar | Alta | Hecha | Nombre, modificación, creación, tamaño y tipo. Las carpetas van primero, salvo cuando se ordena por tipo. |
| Etiquetas | Alta | Hecha | Hasta 6, de 24 caracteres. Se escriben separadas por comas. |
| Color de etiqueta | Alta | Hecha | Seis colores de la paleta, con nombre accesible. El color es el borde, no el único texto. |
| Arrastrar y soltar entre carpetas | Alta | Hecha | Tipo `application/x-orvupi-id`. |
| Subir archivos locales | Alta | Parcial | Soltar en la carpeta abierta. Extensiones de la lista permitida, máximo 20 MB. CSV y XLSX se convierten en hoja. |
| Vista previa | Alta | Parcial | Imagen, texto de un documento, texto y CSV. Un PDF se descarga; no hay visor. |
| Compartir, permisos y enlace | Baja | Fuera | No hay cuentas ni red. |
| Cuota de nube y sincronización | Baja | Fuera | El espacio es el del navegador. |
| Actividad de otras personas | Baja | Fuera | |
| Atajos a otro archivo | Media | Fuera | Un archivo vive en una sola carpeta. |
| Versiones de un archivo binario | Media | Fuera | El historial de esta alfa es el del documento, no el de un PDF. |

## Documentos

Referencias: [títulos e índice](https://support.google.com/docs/answer/116338), [recuento](https://support.google.com/docs/answer/39003), [atajos](https://support.google.com/docs/answer/179738), [encabezado y pie](https://support.google.com/docs/answer/86629).

| Función | Prioridad | Estado | Notas de esta alfa |
| --- | --- | --- | --- |
| Encabezados H1–H3 y párrafo | Alta | Hecha | Estilos del editor. |
| Negrita, cursiva, subrayado y tachado | Alta | Hecha | |
| Fuentes y tamaños | Alta | Parcial | Inter, Georgia y Courier New. 14, 16, 20 y 28 px. |
| Color de texto y resaltado | Alta | Parcial | Cinco colores de texto y cuatro resaltados de la paleta. |
| Alineación | Alta | Hecha | Izquierda, centro, derecha y justificado. |
| Interlineado | Alta | Parcial | 1,2, 1,5 y 2. |
| Listas y lista de tareas | Alta | Hecha | Viñetas, numerada y casillas. |
| Tablas | Alta | Parcial | Insertar y editar. La exportación DOCX las aplana a texto. |
| Imágenes | Alta | Parcial | PNG, JPEG, GIF o WebP, hasta 2 MB, como data URL. DOCX no las incluye. |
| Enlaces | Alta | Hecha | Solo `http`, `https` y `mailto`. |
| Comentarios locales | Alta | Parcial | Hasta 40, guardados en el documento. No se asignan a una persona. |
| Historial de versiones | Alta | Parcial | Instantánea manual, últimas 20. No es un diff carácter a carácter. |
| Buscar y reemplazar | Alta | Hecha | También Ctrl o Cmd + F. El reemplazo total se detiene a las 200 coincidencias. |
| Contador de palabras | Alta | Hecha | Palabras y caracteres del texto visible, bajo el papel. |
| Índice | Media | Parcial | Inserta una lista con los títulos actuales. No se actualiza sola. |
| Encabezado y pie | Media | Parcial | Un texto de hasta 240 caracteres para todo el documento. Sin número de página automático ni primera página distinta. |
| Salto de página | Media | Hecha | En el papel, en el PDF y en el DOCX. |
| Modo impresión | Media | Hecha | El diálogo de impresión del navegador. |
| Atajos | Alta | Parcial | Los del editor (negrita, listas, deshacer) más buscar, cierre y el diálogo de atajos. No es el mapa completo de Docs. |
| Exportar DOCX | Media | Parcial | `docx` 9.12.0, MIT. Sin imágenes. No se promete que Word lo abra igual. |
| Exportar PDF, HTML, TXT y `.orvdoc` | Alta | Hecha | El PDF sigue en WinAnsi. |
| Comentarios asignados y sugerencias | Baja | Fuera | Hace falta identidad. |
| Tiempo real y cursor de otra persona | Baja | Fuera | |
| Notas al pie y secciones | Baja | Fuera | |
| Corrector ortográfico en la nube | Baja | Fuera | |

## Hojas

Referencias: [AVERAGE](https://support.google.com/docs/answer/3093615), [inmovilizar filas](https://support.google.com/docs/answer/9060449), [IMPORTRANGE](https://support.google.com/docs/answer/3093340). SUM, MIN, MAX, COUNT e IF se nombran en la misma familia de funciones. HyperFormula 3.5.0 (GPL-3.0-only) y Handsontable 18.1.2 (licencia comercial) siguen fuera.

| Función | Prioridad | Estado | Notas de esta alfa |
| --- | --- | --- | --- |
| Cuadrícula | Alta | Parcial | 50 filas y columnas A–L. No es infinita. |
| SUMA / SUM | Alta | Hecha | Rangos `A1:A10` y listas. |
| PROMEDIO / AVERAGE | Alta | Hecha | El texto no numérico no cuenta. Vacío da `#DIV/0!`. |
| MIN y MAX | Alta | Hecha | |
| CONTAR / COUNT | Alta | Hecha | Cuenta números, como COUNT. No es COUNTA. |
| SI / IF | Alta | Hecha | Tres argumentos. Comparaciones `>`, `<`, `>=`, `<=`, `=`, `<>`. |
| Aritmética | Alta | Hecha | `+`, `-`, `*`, `/`. Un ciclo visible es `#CICLO!`. |
| Formato de celda | Media | Parcial | El valor mostrado es el texto o el resultado. No hay moneda, porcentaje ni color por celda. |
| Ordenar | Alta | Parcial | La columna seleccionada, ascendente. La fila inmovilizada se queda. Las celdas vacías van al final. Las referencias no se reescriben. |
| Filtrar | Alta | Parcial | Oculta filas cuya vista no contiene el texto. No escribe el archivo. |
| Varias hojas | Alta | Parcial | Hasta 12 pestañas. No hay referencias entre hojas. |
| Inmovilizar la primera fila | Alta | Parcial | Una fila, no columnas ni varias filas. |
| Importar y exportar CSV | Alta | Hecha | PapaParse 5.7.0, MIT. El CSV exportado lleva valores mostrados, no las fórmulas. |
| Importar y exportar XLSX | Media | Parcial | ZIP propio, método store, más inflate para archivos de Excel. Lee y escribe fórmulas sencillas, números y texto. No es un XLSX completo. |
| Gráficos, tablas dinámicas, validación | Baja | Fuera | |
| IMPORTRANGE y funciones de red | Baja | Fuera | [IMPORTRANGE](https://support.google.com/docs/answer/3093340) necesita otra hoja en la red. |
| Colaboración | Baja | Fuera | |

## Diapositivas

Referencia: [presentar](https://support.google.com/docs/answer/1696787).

| Función | Prioridad | Estado | Notas de esta alfa |
| --- | --- | --- | --- |
| Varias diapositivas con título y texto | Media | Hecha | Hasta 30. Título 180 caracteres, cuerpo 4 000. |
| Presentar en local | Media | Parcial | Escenario a pantalla de la app, anterior y siguiente. Sin láser, notas del presentador ni cronómetro. |
| Temas, diseños, imágenes y transiciones | Baja | Fuera | |
| Exportar PPTX o PDF de diapositivas | Baja | Fuera | |
| Publicar en la web | Baja | Fuera | |

## Qué no se afirma

Esta matriz no dice que ORVUPI Work sustituya a Drive, Docs, Sheets o Slides. Dice qué gesto local existe hoy, con qué límite, y qué queda fuera porque exigiría un servidor, una cuenta o una licencia que el proyecto rechaza.
