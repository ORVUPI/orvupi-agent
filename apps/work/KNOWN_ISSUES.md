# Problemas conocidos

Esta es una alfa. Los puntos siguientes están abiertos a propósito o porque el navegador no da más de sí.

1. El visor PDF no edita ni muestra páginas. Un PDF se guarda y se descarga. La vista previa lo dice.
2. La cuadrícula tiene 1000 filas y 32 columnas (A–AF). Ordenar mueve filas y no reescribe las referencias. El filtro solo oculta filas. No hay formato de moneda ni gráficos. La regla del documento no arrastra márgenes. Las diapositivas no tienen transiciones ni PPTX. Un guardado hecho con la 0.2.0 no conserva los objetos nuevos. Formularios no envía nada fuera del dispositivo. Dibujos no exportan un formato de dibujo ajeno. Notas no sincronizan entre aparatos.
3. El PDF exportado usa Helvetica, Times no está, y cualquier carácter fuera de WinAnsi pasa a `?`. No se anuncia paridad con un procesador de textos.
4. DOCX (0.8.2): se importan y exportan estilos, imágenes (también flotantes), listas, tablas, cuadros de texto y formas, notas al pie y finales, secciones con columnas y orientación, y comentarios con respuestas. Límites: una sección horizontal no se gira en pantalla (lleva una etiqueta y se exporta girada); una sección a varias columnas no se parte entre hojas; el texto de una forma es texto sin formato; los desplazamientos verticales relativos a la página o al margen se ponen a 0; los objetos de un grupo se colocan de forma aproximada (uno junto a otro); la imagen flotante solo usa el desplazamiento horizontal. Una imagen pegada desde otra web solo como enlace no se puede descargar (la política de seguridad no deja conectar con otros dominios); hay que usar «Copiar imagen». El PPTX importa solo el texto. El XLSX propio guarda fórmulas sencillas, números y texto; no es un libro de Excel completo.
5. La IA no descarga un modelo. Las acciones no modifican el documento.
6. No hay cifrado local con contraseña. Quien abra el perfil del navegador puede leer los archivos.
7. Si OPFS falta, como en algunos modos privados, los bytes van a IndexedDB. El indicador de ajustes muestra el controlador real (`opfs` o `indexeddb`).
8. Una copia se valida antes de escribir. Si el disco falla a mitad de una escritura ya aceptada, el espacio puede quedar a medias. El caso de formato inválido no escribe nada.
9. `frame-ancestors` depende de que el alojamiento sirva `public/_headers` o una cabecera equivalente. Un servidor estático que ignore `_headers` no aplica esa directiva. `X-Frame-Options` tiene la misma dependencia.
10. El job de CI de esta app cubre Chromium. Firefox, Safari y Edge quedan por recorrer.
11. `glob`, transitivo de Workbox, está marcado como deprecado en npm. No hay aviso de vulnerabilidad en `npm audit`.
12. El panel de IA cabe en una columna de 300 px. En pantallas de menos de 960 px ocupa hasta el 46 % inferior y puede tapar parte del papel hasta que se cierra.
