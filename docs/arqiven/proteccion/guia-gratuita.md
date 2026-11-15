# Qué protege sin pagar, y qué no

Fecha: 15 de noviembre de 2026.
Estado: guía, pendiente del propietario.
No es un dictamen. No presenta solicitudes, no paga tasas y no publica un sello.

El registro de marca sí cuesta. Las cifras de abajo salen de las páginas oficiales consultadas ese día. Hay que volver a abrirlas antes de pagar: una tasa cambia, y esta guía no se actualiza sola. El pago y el envío del formulario los tiene que hacer el propietario. Este repositorio no lo hace.

## Lo que sí protege, y es gratis

Ninguna de estas vías otorga en exclusiva el nombre ARQIVEN en España o en la Unión Europea. Sirven para guardar una prueba de que un texto, un logotipo o un commit existían en una fecha.

### Historial git con fecha

La rama `cursor/arqiven-ollama-local-8c6d`, de la que sale este trabajo, tiene commits con fecha de autor. Ejemplos leídos con `git log` el 15 de noviembre de 2026 (hora en UTC):

| Commit | Fecha de autor | Asunto |
| --- | --- | --- |
| `1525556d` | 2026-11-15T18:10:56Z | ARQIVEN: modo local con Ollama en 127.0.0.1 |
| `e228b9fe` | 2026-11-15T18:32:28Z | ARQIVEN: verificador, RAG por proyecto y banco de 100 casos |
| `f38b9cbc` | 2026-11-15T19:02:34Z | ARQIVEN: el chat usa la canalización de mitigado2 |

`git log --format='%G?'` marca esos commits con `N`: no llevan firma. Una fecha de autor sin firma se puede reescribir en un clon. Ayuda como relato del repositorio; pesa más si la rama queda en el remoto y, más adelante, si los commits van firmados y la rama por defecto no admite reescritura.

Qué puede hacer el propietario, sin coste de una oficina:

- Activar la firma de commits (SSH o GPG) en su máquina y firmar a partir de ahora.
- Conservar el remoto de GitHub. El historial alojado es otra copia fechada.
- No reescribir la historia de lo que ya quiera usar como prueba.

### Sello de tiempo gratuito (OpenTimestamps)

OpenTimestamps ancla el hash de un archivo en un calendario público, apoyado en Bitcoin. No sube el documento: sube el hash. Es gratis. No registra una marca y no sustituye a la OEPM ni a la EUIPO.

Sitio: https://opentimestamps.org/

Pasos, para cuando él quiera ejecutarlos. Aquí no se han ejecutado, porque el sello se publica en calendarios públicos:

1. Instalar el cliente desde esa web.
2. Sellar el logotipo y un paquete de los documentos, por ejemplo:

```text
ots stamp web/v2/assets/arqiven/logo-oficial.png
ots stamp docs/arqiven/conocimiento/indice.json
```

3. Guardar el `.ots` junto a una copia del archivo. Meses después, `ots verify` completa la prueba con la cabecera de bloque.
4. El hash del logotipo, medido en esta copia el 15 de noviembre de 2026, es `f0b8294692096b5d81151e1702e22fdfbe686a535e8cd834c72323af0000812b`. Si el archivo cambia, el sello anterior no cubre el archivo nuevo.

Un sello demuestra que ese hash existía, no que ORVUPI sea el autor frente a cualquier tercero, ni que el nombre esté libre.

### El símbolo ™ y los avisos

Se puede escribir ARQIVEN™ y ORVUPI™ sin registro. La política está en `propuesta-licencia-marca.md`. La licencia del código de ARQIVEN ya es «© 2026 ORVUPI. Todos los derechos reservados.» (`LICENSE-ARQIVEN.md`). Conviene que la web y la app, cuando se toque esa interfaz, muestren el mismo aviso en el pie y en Ajustes.

El pie actual de `web/v2/legal/index.html` ya dice «© 2026 ORVUPI. Nombre, pulpo y recursos visuales: todos los derechos reservados. Código original: licencia MIT.»

### Vigilancia del nombre, a mano

Antes de pagar un registro, y después de vez en cuando:

- Buscador de la OEPM: https://www.oepm.es/es/signos-distintivos/
- eSearch plus de la EUIPO: https://euipo.europa.eu/eSearch/
- TMview: https://www.tmdn.org/tmview/

Buscar ARQIVEN, ORVUPI y variantes cercanas en las clases de software y de servicios de IA. Anotar fecha, clase y titular. Esto no vigila solo: hay que repetir la búsqueda. Un servicio de vigilancia de pago no entra en esta guía.

También mirar el nombre en el registro de dominios y en las tiendas de aplicaciones. Un dominio parecido no se impide con un sello de tiempo.

## Lo que no es gratis

El derecho exclusivo sobre el nombre, oponible a terceros en un territorio, sale del registro. Hay que pagar la tasa a la oficina, con el OK del propietario. Un agente de la propiedad industrial, si lo contrata, cobra aparte: esa minuta no está en las tablas oficiales y aquí no se pide.

### España, OEPM

Cuadro oficial «Tasas y precios públicos de la Oficina Española de Patentes y Marcas, O.A. Desde el 1 de abril de 2026»:

- PDF: https://www.oepm.es/export/sites/portal/comun/documentos_relacionados/PDF/TASAS_y_PRECIOS_PUBLICOS.pdf
- Página de tasas de marcas: https://www.oepm.es/es/tasas-y-precios-publicos/tasas-de-marcas-y-nombres-comerciales/
- Sede para presentar, cuando él decida: https://www.oepm.es/

Solicitud de marca o nombre comercial, cifras de ese PDF:

| Concepto | Clave y trámite no electrónico | Clave y trámite electrónico |
| --- | --- | --- |
| 1.ª clase | MT01, 150,45 € | ME01, 127,88 € |
| 2.ª clase y cada sucesiva | 97,48 € | 82,84 € |

Renovación de marca o nombre comercial, sin recargo, en el mismo PDF: papel MT11, 174,18 € la primera clase y 116,95 € cada clase siguiente; electrónico ME04, 148,06 € y 99,39 €. La marca nacional dura diez años y se renueva.

El PDF separa otras claves (división, prioridad, nulidad). No se copian todas: el día del pago se usa la fila que corresponda. Las marcas colectivas y de garantía tienen tasas más altas (ME02, 255,74 € la primera clase por vía electrónica) y no son el caso de ARQIVEN.

La clase de Niza cambia el alcance, no solo el precio. Elegirla es parte de la solicitud. No se elige aquí.

### Unión Europea, EUIPO

Página oficial de tasas, leída el 15 de noviembre de 2026:

https://www.euipo.europa.eu/en/trade-marks/before-applying/fees-payments

Esa página dice:

- La tasa básica en línea es 850 € y cubre 1 clase de productos o servicios.
- La 2.ª clase son 50 €.
- De la 3.ª en adelante, 150 € por cada clase.
- La marca de la Unión Europea vale 10 años y se puede renovar.
- La tasa no se devuelve, salvo que se retire la solicitud antes o el mismo día en que la EUIPO recibió el pago. El detalle está en las directrices que enlaza esa página.

La solicitud electrónica se hace en el User Area de la EUIPO, no por correo electrónico. FAQ: https://www.euipo.europa.eu/en/help-centre/tm/faq-registration

Una marca de la UE y una marca española son registros distintos. Pedir las dos es pagar las dos. No se recomienda una combinación en esta guía.

### Lo que el registro no hace

- No protege la idea de un asistente, ni el código (eso es copyright y, si se quiere, patente; la patente no es gratuita y no se estudia aquí).
- No impide que exista un modelo llamado de otra forma.
- No sale adelante solo con pagar: la oficina examina y terceros pueden oponerse. Esas fases pueden tener más tasas. Hay que leerlas en el mismo PDF o en la calculadora de la EUIPO el día del trámite.
- No conviene pagarlo a una carta que no sea de la OEPM o de la EUIPO. Ambas avisan de facturas engañosas. La página de la EUIPO citada dice que la oficina no envía facturas pidiendo un pago directo por servicios.

## Orden sensato, todavía sin gasto

1. Dejar fechados el logotipo y los documentos (git y, si el propietario quiere, OpenTimestamps).
2. Buscar el nombre en OEPM, EUIPO y TMview, y guardar la captura con fecha.
3. Decidir titular (persona o sociedad) y clases. Ese dato no está en el repo.
4. Solo entonces, y con su OK, presentar y pagar en la sede oficial.
