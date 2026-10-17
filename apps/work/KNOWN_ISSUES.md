# Problemas conocidos

Esta es una alfa. Los puntos siguientes están abiertos a propósito o porque el navegador no da más de sí.

1. Sheets, Slides y el visor PDF no editan. La pantalla lo dice. No es un fallo de un editor a medias.
2. El gestor de archivos no tiene carpetas, etiquetas ni favoritos en la interfaz. El modelo ya reserva esos campos para que una copia futura los transporte.
3. El PDF exportado usa Helvetica, Times no está, y cualquier carácter fuera de WinAnsi pasa a `?`. No se anuncia paridad con un procesador de textos.
4. No hay importación DOCX, XLSX ni PPTX. No se afirma esa compatibilidad.
5. La IA no descarga un modelo. Las acciones no modifican el documento.
6. No hay cifrado local con contraseña. Quien abra el perfil del navegador puede leer los archivos.
7. Si OPFS falta, como en algunos modos privados, los bytes van a IndexedDB. El indicador de ajustes muestra el controlador real (`opfs` o `indexeddb`).
8. Una copia se valida antes de escribir. Si el disco falla a mitad de una escritura ya aceptada, el espacio puede quedar a medias. El caso de formato inválido no escribe nada.
9. `frame-ancestors` depende de que el alojamiento sirva `public/_headers` o una cabecera equivalente. Un servidor estático que ignore `_headers` no aplica esa directiva. `X-Frame-Options` tiene la misma dependencia.
10. El job de CI de esta app cubre Chromium. Firefox, Safari y Edge quedan por recorrer.
11. `glob`, transitivo de Workbox, está marcado como deprecado en npm. No hay aviso de vulnerabilidad en `npm audit`.
12. El panel de IA cabe en una columna de 300 px. En pantallas de menos de 960 px ocupa hasta el 46 % inferior y puede tapar parte del papel hasta que se cierra.
