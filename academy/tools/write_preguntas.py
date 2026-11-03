import json
def q(p, ops, ok):
    return {"pregunta":p,"opciones":[{"texto":t,"correcta":i==ok,"porque":w} for i,(t,w) in enumerate(ops)]}
def act(enun, cats, items, tipo="clasificar"):
    return {"tipo":tipo,"enunciado":enun,"categorias":cats,"items":[{"texto":t,"categoria":c,"porque":w} for t,c,w in items]}
U={}; A={}; M={}; P={}
U["OA-001"]=q("Ana compra una criptomoneda en una plataforma y la deja allí. ¿Quién guarda las claves?",[
 ("Ana, porque el saldo está a su nombre","Ver un saldo a tu nombre no implica tener las claves; la plataforma las guarda."),
 ("La plataforma","Correcto: mientras el saldo esté en la plataforma, ella controla las claves y Ana depende de ella."),
 ("Nadie: en una blockchain no hay claves","Toda dirección se controla con una clave privada.")],1)
A["OA-001"]=act("Clasifica cada situación inventada según quién mantiene el registro.",["Lo anota un banco o una plataforma","Lo anota la red"],[
 ("Pagar un café con tarjeta","Lo anota un banco o una plataforma","El banco registra el cargo y puede revisarlo."),
 ("Enviar una criptomoneda desde tu wallet a otra dirección","Lo anota la red","La red incluye la transacción firmada en un bloque."),
 ("Ver el saldo de una criptomoneda comprada y dejada en una plataforma","Lo anota un banco o una plataforma","El saldo es un apunte interno de la plataforma hasta que retiras."),
 ("Retirar desde una plataforma a tu propia wallet","Lo anota la red","La retirada es una transacción en la red hacia tu dirección.")])
U["OA-002"]=q("«Nuestro token está en blockchain, así que no puedes perder dinero». ¿Qué parte se sostiene?",[
 ("Las dos partes","Estar en una cadena no protege del valor ni del engaño."),
 ("Solo que está registrado en una blockchain","Correcto: la cadena registra movimientos; no garantiza el valor ni la honradez."),
 ("Ninguna: los tokens no están en blockchains","Los tokens sí se registran en una blockchain.")],1)
A["OA-002"]=act("¿Qué aporta la cadena y qué no?",["Lo garantiza el registro","No lo garantiza el registro"],[
 ("Que un bloque antiguo no se pueda cambiar sin rehacer los siguientes","Lo garantiza el registro","Cada bloque incluye el hash del anterior."),
 ("Que un token valga algo","No lo garantiza el registro","El precio depende de quién quiera comprarlo."),
 ("Que cualquiera pueda comprobar una transacción","Lo garantiza el registro","El registro es público y verificable."),
 ("Que quien promociona un proyecto diga la verdad","No lo garantiza el registro","La cadena no comprueba afirmaciones externas.")])
U["OA-003"]=q("¿Qué dato puedes compartir para que te envíen fondos?",[
 ("La frase de recuperación","Con ella se reconstruyen todas tus claves."),
 ("La clave privada","Permite mover tus fondos."),
 ("La dirección","Correcto: la dirección es pública y sirve para recibir.")],2)
A["OA-003"]=act("Clasifica cada dato inventado sin escribir ningún secreto real.",["Secreto","Público"],[
 ("Las 12 palabras que mostró la wallet al crearla","Secreto","Es la frase de recuperación: reconstruye las claves."),
 ("La cadena que empieza por 0x y que pegas en un formulario de cobro","Público","Es una dirección: sirve para recibir."),
 ("La clave privada exportada desde la configuración","Secreto","Permite firmar desde esa dirección."),
 ("El hash de una transacción que ya hiciste","Público","Solo identifica una operación pública.")])
U["OA-004"]=q("Tu wallet dice «enviado». ¿Qué te confirma que la red lo incluyó?",[
 ("El mensaje de la wallet","La wallet sabe que firmaste y envió la transacción, no si se incluyó."),
 ("El estado en un explorador de bloques","Correcto: el explorador muestra si está en un bloque y su resultado."),
 ("Que el destinatario te dé las gracias","No es una comprobación del estado de la red.")],1)
A["OA-004"]=act("Ordena los pasos de un envío inventado.",["Paso 1","Paso 2","Paso 3","Paso 4"],[
 ("Preparas el envío: dirección, red e importe","Paso 1","Primero se define qué se quiere hacer."),
 ("Firmas con tu wallet","Paso 2","La firma autoriza la transacción."),
 ("Los nodos la reciben y la incluyen en un bloque","Paso 3","La red la valida y la añade al registro."),
 ("Compruebas el estado en un explorador","Paso 4","Solo después se puede ver el resultado en la cadena.")],tipo="ordenar")
U["OA-005"]=q("¿Quién decide las reglas de Bitcoin?",[
 ("Los mineros, porque crean los bloques","Proponen bloques, pero los nodos rechazan los que rompen las reglas."),
 ("Los nodos que comprueban cada bloque, con el software que eligen ejecutar","Correcto: las reglas las aplican los nodos que validan."),
 ("Una empresa llamada Bitcoin","No hay una empresa que controle la red.")],1)
A["OA-005"]=act("Separa lo correcto de la confusión en la frase «los mineros deciden las reglas porque crean los bloques».",["Correcto","Confusión"],[
 ("Los mineros proponen bloques","Correcto","Es su función en la prueba de trabajo."),
 ("Si un bloque rompe las reglas, los nodos lo aceptan igualmente","Confusión","Los nodos lo rechazan."),
 ("El suministro máximo es de 21 millones","Correcto","Está fijado en las reglas que comprueban los nodos."),
 ("Proponer un bloque equivale a cambiar las reglas","Confusión","Proponer y decidir las reglas son cosas distintas.")])
U["OA-006"]=q("Cambias un token por otro en Ethereum. ¿En qué se paga la comisión?",[
 ("En el token que entregas","La comisión de red se paga en ETH."),
 ("En ETH, la moneda nativa","Correcto: la red cobra el gas en su moneda nativa."),
 ("No hay comisión al cambiar tokens","Toda transacción en Ethereum paga gas.")],1)
A["OA-006"]=act("¿Qué interviene en cada situación inventada?",["Solo la red y la moneda nativa","Un contrato además de la red"],[
 ("Enviar ETH a un amigo","Solo la red y la moneda nativa","Es una transferencia de la moneda nativa."),
 ("Cambiar un token por otro en un AMM","Un contrato además de la red","El cambio lo ejecuta un contrato."),
 ("Enviar un token ERC-20","Un contrato además de la red","Los saldos del token los guarda su contrato."),
 ("Pagar la comisión de una transacción","Solo la red y la moneda nativa","El gas se paga en ETH a la red.")])
U["OA-007"]=q("¿Qué diferencia una moneda nativa de un token?",[
 ("El token se crea sobre una red existente; la nativa es la de la propia red","Correcto: la moneda nativa paga las comisiones de su red."),
 ("Los tokens siempre valen menos","El precio no define qué es cada cosa."),
 ("Las monedas nativas no se pueden enviar","Se envían igual que los tokens.")],0)
A["OA-007"]=act("Clasifica cada descripción ficticia.",["Moneda nativa","Token común","Stablecoin"],[
 ("Se usa para pagar las comisiones de su red","Moneda nativa","Es la definición de moneda nativa."),
 ("Un emisor dice mantener reservas para que valga un euro","Stablecoin","Busca seguir una moneda de curso."),
 ("Creado por un proyecto para votar en su aplicación","Token común","Es un token sin referencia a una moneda."),
 ("Su emisor puede congelar saldos de direcciones concretas","Stablecoin","Muchas stablecoins con emisor incluyen esta capacidad.")])
U["OA-008"]=q("Una plataforma ofrece retirar USDC por varias redes. ¿Qué compruebas?",[
 ("Solo el importe","Si la red no coincide, el importe no basta."),
 ("Que la red elegida sea la misma en la que tu wallet espera recibir","Correcto: origen y destino deben estar en la misma red."),
 ("Que el símbolo sea USDC","El símbolo es igual en todas las redes.")],1)
A["OA-008"]=act("¿Coinciden origen y destino en estas transferencias ficticias?",["Compatible","Incompatible"],[
 ("Retiras USDC por Solana a una wallet de Solana","Compatible","Misma red en los dos extremos."),
 ("Pegas una dirección que empieza por 0x en un envío por Solana","Incompatible","El formato 0x es de redes tipo Ethereum."),
 ("Envías ETH por una capa 2 a un depósito que solo acepta la red principal","Incompatible","La plataforma no verá el depósito en la red que espera."),
 ("Depositas SOL desde una wallet de Solana a una dirección de Solana de tu plataforma","Compatible","La red y el activo coinciden.")])
U["OA-009"]=q("En autocustodia pierdes la frase de recuperación y el móvil. ¿Quién puede devolverte el acceso?",[
 ("La empresa de la wallet","No tiene tus claves."),
 ("Nadie","Correcto: sin la frase, nadie puede reconstruir las claves."),
 ("La red, si demuestras tu identidad","La red no conoce identidades.")],1)
A["OA-009"]=act("Dos personas inventadas: Lía usa una plataforma (custodia) y Bruno su propia wallet (autocustodia). ¿A quién afecta cada problema?",["A Lía (custodia)","A Bruno (autocustodia)"],[
 ("La empresa suspende las retiradas","A Lía (custodia)","Su saldo depende de la plataforma."),
 ("Pierde el papel con la frase de recuperación","A Bruno (autocustodia)","Solo él guarda la clave."),
 ("Un tercero sufre un ataque y pierde fondos de clientes","A Lía (custodia)","Los fondos los guardaba el tercero."),
 ("Firma una transacción maliciosa sin leerla","A Bruno (autocustodia)","Él firma directamente cada operación.")])
U["OA-010"]=q("Una web pide tu frase de recuperación para «sincronizar» la wallet. ¿Qué haces?",[
 ("La escribo, porque la web parece oficial","Ninguna web legítima la necesita."),
 ("No la doy y abro la wallet oficial por mi cuenta","Correcto: la frase solo se usa para restaurar en tu dispositivo."),
 ("Solo escribo la mitad de las palabras","Con parte de la frase se reduce mucho la dificultad de adivinarla.")],1)
A["OA-010"]=act("Elige qué responder a estas peticiones inventadas.",["No lo doy","Se puede compartir"],[
 ("«Soporte» te escribe primero y pide tus 12 palabras","No lo doy","Ningún soporte las pide."),
 ("Un amigo te pide tu dirección para devolverte un pago","Se puede compartir","La dirección es pública."),
 ("Una app promete recuperar fondos si le das la frase","No lo doy","Es un cebo habitual."),
 ("Un formulario pide la clave privada para «verificar la cuenta»","No lo doy","La clave privada mueve tus fondos.")])
U["OA-011"]=q("Aparece en tu wallet un token que no compraste con un enlace para «reclamar». ¿Qué es más prudente?",[
 ("Abrir el enlace y conectar la wallet","Puede pedirte una firma que entregue tus tokens."),
 ("Ignorarlo y no interactuar con él","Correcto: los airdrops no pedidos son un cebo común."),
 ("Enviarlo a otra dirección para limpiarlo","Interactuar con él puede pedir firmas o costar comisiones.")],1)
A["OA-011"]=act("Mensajes ficticios: ¿cuál es la pista principal?",["Urgencia","Regalo inesperado","Remitente o enlace parecido","Petición fuera de lugar"],[
 ("«Tu cuenta se cerrará en 24 horas si no verificas»","Urgencia","Te empuja a actuar sin pensar."),
 ("«Has ganado 500 tokens: conéctate para reclamarlos»","Regalo inesperado","No participaste en nada."),
 ("Un enlace a un dominio con una letra cambiada","Remitente o enlace parecido","Imita la web oficial."),
 ("Un «moderador» te escribe por privado y pide compartir pantalla","Petición fuera de lugar","El soporte real no inicia así.")])
U["OA-012"]=q("¿Qué segundo factor resiste mejor el phishing?",[
 ("SMS","Puede interceptarse o desviarse con un duplicado de SIM."),
 ("Un código de app que dictas por teléfono","Si lo dictas, el atacante lo usa."),
 ("Una llave física o passkey","Correcto: solo responde al dominio real.")],2)
A["OA-012"]=act("Configuración de una persona ficticia: ¿qué capa falla?",["Contraseña","Segundo factor","Dispositivo","Correo"],[
 ("Usa la misma contraseña en cinco servicios","Contraseña","Una filtración abre las demás."),
 ("Solo tiene 2FA por SMS en su plataforma","Segundo factor","Es el tipo más débil."),
 ("Instaló una extensión de navegador desde un enlace de un chat","Dispositivo","Puede ser software malicioso."),
 ("Su correo no tiene segundo factor","Correo","El correo recupera las demás cuentas.")])
U["OA-013"]=q("Buscas un hash y el explorador no encuentra nada. ¿Qué compruebas primero?",[
 ("Que estás en el explorador de la red correcta","Correcto: cada red tiene sus exploradores."),
 ("Que el envío se perdió para siempre","No se puede concluir sin mirar en la red correcta."),
 ("Que el explorador está roto","Es menos probable que una red equivocada.")],0)
A["OA-013"]=act("Ficha simulada: ¿este dato permite concluir algo por sí solo?",["Se puede leer directamente","Necesita contexto"],[
 ("Estado: correcta","Se puede leer directamente","Indica que la ejecución se completó."),
 ("Hora: 23:30 UTC","Necesita contexto","Hay que convertirla a tu zona."),
 ("Destino: un contrato","Necesita contexto","Los tokens pueden ir a otra cuenta; mira las transferencias."),
 ("Etiqueta «token verificado» del explorador","Necesita contexto","Es una interpretación del explorador.")])
U["OA-014"]=q("Una transacción en Ethereum falla. ¿Qué pasa con la comisión?",[
 ("Se devuelve entera","La red hizo trabajo y lo cobra."),
 ("Se cobra igualmente","Correcto: la comisión se paga aunque falle."),
 ("Se cobra el doble","No hay recargo por fallar.")],1)
A["OA-014"]=act("Pantalla de un envío inventado: ¿qué es cada cifra?",["Importe","Comisión de red","Comisión de la plataforma"],[
 ("0,5 SOL que recibirá el destino","Importe","Es lo que llega."),
 ("0,000005 SOL por la firma","Comisión de red","Es la comisión base de Solana."),
 ("1 USDC fijo por retirar","Comisión de la plataforma","La fija la plataforma, no la red."),
 ("Propina de prioridad","Comisión de red","Es una comisión opcional de la red.")])
U["OA-015"]=q("Una dApp pide aprobar un permiso ilimitado sobre tu USDC. ¿Qué significa?",[
 ("Que la dApp ve tu saldo","Eso lo hace conectar."),
 ("Que el contrato podrá mover todo tu USDC hasta que lo revoques","Correcto: el permiso sigue vigente."),
 ("Que pierdes el USDC al instante","No se mueve nada hasta que el contrato lo use.")],1)
A["OA-015"]=act("¿Qué hace cada acción?",["No mueve fondos","Puede mover fondos o autorizar a otro"],[
 ("Conectar la wallet a una web","No mueve fondos","Solo comparte tu dirección."),
 ("Aprobar un permiso sobre un token","Puede mover fondos o autorizar a otro","Autoriza a otra dirección a gastar."),
 ("Firmar un mensaje de inicio de sesión","No mueve fondos","Demuestra que controlas la dirección."),
 ("Firmar un permiso fuera de la cadena","Puede mover fondos o autorizar a otro","Parece un mensaje, pero concede permisos.")])
U["OA-016"]=q("Un puente bloquea tu activo en la red A y te da una representación en la red B. ¿De qué depende su respaldo?",[
 ("Solo de la red B","El respaldo está en el contrato de la red A."),
 ("Del contrato del puente en la red A y de quién valida los mensajes","Correcto: si se vacía ese contrato, la representación pierde respaldo."),
 ("De nada: es el mismo activo","Es una representación, no el original.")],1)
A["OA-016"]=act("Movimiento inventado entre dos redes: ¿de qué depende cada riesgo?",["Red de origen","Puente","Red de destino"],[
 ("Un ataque vacía el contrato donde se bloqueó el activo","Puente","Ese contrato es del puente."),
 ("La red de destino deja de producir bloques","Red de destino","Ahí está tu representación."),
 ("Un grupo de firmantes valida los mensajes entre redes","Puente","Es un supuesto de confianza del puente."),
 ("Las comisiones suben en la red donde bloqueas","Red de origen","Pagas la operación de bloqueo en esa red.")])
U["OA-017"]=q("La web de una dApp cae, pero su contrato sigue en la cadena. ¿Qué ocurre?",[
 ("Los fondos desaparecen","El contrato y sus fondos siguen en la cadena."),
 ("El contrato sigue funcionando y se puede usar por otra vía","Correcto: solo la interfaz dejó de estar disponible."),
 ("El contrato se borra automáticamente","Los contratos no dependen de la web.")],1)
A["OA-017"]=act("Aplicación inventada: ¿dónde ocurre cada fallo?",["Interfaz","Proveedor","Contrato"],[
 ("Alguien cambia el código de la web para pedir firmas a otro contrato","Interfaz","La web prepara las transacciones."),
 ("Los saldos tardan en cargarse porque el servicio de lectura está saturado","Proveedor","Conecta la web con la red."),
 ("Un error en el código permite retirar más de lo depositado","Contrato","Es la lógica en la cadena."),
 ("El administrador puede pausar retiradas","Contrato","Es una función administrativa del contrato.")])
U["OA-018"]=q("Dos pools tienen el mismo precio, pero uno es diez veces más grande. ¿Dónde mueve más el precio una compra igual?",[
 ("En la grande","Más profundidad significa menos movimiento."),
 ("En la pequeña","Correcto: con menos liquidez, cada unidad retirada encarece más la siguiente."),
 ("Igual en las dos","La profundidad cambia el efecto.")],1)
A["OA-018"]=act("Pools ficticios con el mismo precio: ¿qué describe cada frase?",["Pool pequeño","Pool grande"],[
 ("Comprar 100 tokens cuesta unos 111","Pool pequeño","Con 1 000 y 1 000, el producto constante sube el precio."),
 ("Comprar 100 tokens cuesta algo más de 101","Pool grande","Con 10 000 y 10 000, el efecto es menor."),
 ("Unas pocas ventas desploman el precio","Pool pequeño","Hay poca profundidad."),
 ("El deslizamiento de una operación pequeña es bajo","Pool grande","Hay más liquidez.")])
U["OA-019"]=q("¿Qué es una liquidación en un préstamo DeFi?",[
 ("La devolución normal del préstamo","Esa es la amortización."),
 ("La venta de tu garantía cuando su valor cae por debajo del umbral","Correcto: otros la compran con descuento para cubrir la deuda."),
 ("Un premio por pedir prestado","No es un premio.")],1)
A["OA-019"]=act("Frases inventadas: ¿describen el mecanismo o esconden un riesgo?",["Describe el mecanismo","Esconde un riesgo"],[
 ("Depositas más valor del que pides prestado","Describe el mecanismo","Es un préstamo colateralizado."),
 ("«Rendimiento fijo garantizado del 2 % diario»","Esconde un riesgo","Sin fuente explicable, no es sostenible."),
 ("Las recompensas de staking se pagan en la moneda bloqueada","Describe el mecanismo","Así funcionan en prueba de participación."),
 ("«Puedes retirar al instante siempre»","Esconde un riesgo","Muchos sistemas tienen plazos de retirada.")])
U["OA-020"]=q("«El suministro total es de 1 000 millones». ¿Qué tipo de afirmación es?",[
 ("Hecho comprobable","Correcto: se puede contrastar en la cadena con fecha."),
 ("Hipótesis","No depende del futuro."),
 ("Promoción","Es un dato, no un intento de convencer.")],0)
A["OA-020"]=act("Anuncio ficticio: clasifica cada frase.",["Hecho comprobable","Hipótesis","Promoción"],[
 ("«El contrato tiene la emisión revocada»","Hecho comprobable","Se lee en la cadena."),
 ("«Con la versión 2 el uso se multiplicará»","Hipótesis","Depende de algo futuro."),
 ("«Es la oportunidad del año, solo hoy»","Promoción","Busca una reacción."),
 ("«Hay 4 200 cuentas con saldo según el explorador a fecha de hoy»","Hecho comprobable","Se puede repetir la lectura con fecha.")])
U["OA-021"]=q("Dos tokens se llaman «USD Coin» y usan el mismo logotipo. ¿Qué los distingue?",[
 ("El nombre","El nombre lo elige quien crea el token."),
 ("La dirección del mint","Correcto: cada mint es único."),
 ("Nada: son el mismo token","Pueden ser tokens distintos.")],1)
U["OA-022"]=q("Una copia tiene la emisión y la congelación revocadas. ¿Qué puedes concluir?",[
 ("Que es segura","Revocado no es una garantía."),
 ("Que esos permisos no están asignados en esa lectura","Correcto: describe la cuenta, no la legitimidad."),
 ("Que es la versión oficial","La dirección sigue siendo otra.")],1)
U["OA-023"]=q("La muestra de cuentas de un token no llegó (HTTP 429). ¿Qué anotas?",[
 ("Cero cuentas","No es un cero."),
 ("Consulta fallida: dato no disponible","Correcto: se pidió y no hubo respuesta usable."),
 ("Bien repartido","No se sabe cómo está repartido.")],1)
U["OA-024"]=q("¿Qué debe incluir una lectura guardada?",[
 ("Solo los datos que salieron bien","Lo que faltó también es información."),
 ("Fuente, fecha con zona horaria, dato y lo que no se pudo comprobar","Correcto: así otra persona puede repetirla."),
 ("Una recomendación de compra","Una lectura no es una recomendación.")],1)
A["OA-024"]=act("¿En qué fase de una lectura va cada paso?",["Antes de leer","Durante la lectura","Al guardar"],[
 ("Conseguir la dirección del mint en una fuente de confianza","Antes de leer","Sin dirección correcta, todo lo demás falla."),
 ("Leer permisos, suministro y reparto","Durante la lectura","Son los datos de la ficha."),
 ("Anotar lo que no llegó como «Dato no disponible»","Al guardar","Los huecos forman parte de la lectura."),
 ("Escribir fecha, hora y zona horaria","Al guardar","Permite comparar después.")])
# modulos
M["1"]=[
 q("¿Qué controla quien tiene la clave privada?",[("Los fondos de esa dirección","Correcto."),("Toda la red","Solo su dirección."),("Las reglas","Las aplican los nodos.")],0),
 q("¿Qué incluye cada bloque para enlazarse al anterior?",[("Su hash","Correcto: la huella del bloque anterior."),("Su precio","No hay precio en el bloque."),("Un nombre","No se enlazan por nombre.")],0),
 q("¿Qué hace la prueba de participación?",[("Exige bloquear monedas como garantía","Correcto."),("Exige resolver un cálculo costoso","Eso es prueba de trabajo."),("Elimina las comisiones","No las elimina.")],0),
 q("¿Puede revertirse un envío confirmado en la cadena?",[("No por regla general","Correcto: no hay a quién reclamar."),("Sí, llamando a la red","No hay servicio de atención."),("Sí, en 24 horas","No existe ese plazo.")],0),
 q("¿Qué hace un nodo?",[("Comprueba reglas y guarda el registro","Correcto."),("Custodia tus claves","Eso lo hace la wallet."),("Fija los precios","No fija precios.")],0),
 q("Tu wallet dice «enviado». ¿Dónde compruebas el resultado?",[("En un explorador de bloques","Correcto."),("En la propia wallet, sin más","Solo sabe que firmaste."),("En un chat del proyecto","No es una fuente de la cadena.")],0)]
M["2"]=[
 q("¿En qué se paga la comisión de red?",[("En la moneda nativa","Correcto."),("En cualquier token","Las comisiones van en la nativa."),("En euros","No.")],0),
 q("¿Qué es un token?",[("Un activo creado sobre una red existente","Correcto."),("La moneda de la red","Esa es la nativa."),("Una red nueva","No.")],0),
 q("¿Qué busca una moneda estable?",[("Seguir el valor de una referencia","Correcto."),("Subir de precio","No es su objetivo."),("Pagar comisiones en todas las redes","No.")],0),
 q("Pegas una dirección 0x en un envío por Solana. ¿Qué pasa?",[("Es incompatible","Correcto: formatos distintos."),("Llega igual","No."),("Se convierte sola","No.")],0),
 q("¿Qué añade un puente?",[("Sus propios supuestos de confianza","Correcto."),("Seguridad gratuita","No."),("Nada","Añade riesgos.")],0),
 q("¿Por qué existen las capas 2?",[("Para abaratar procesando fuera y publicando un resumen","Correcto."),("Para eliminar la red principal","No."),("Para ocultar transacciones","No es su objetivo.")],0)]
M["3"]=[
 q("¿Quién puede pedirte la frase de recuperación?",[("Nadie legítimo","Correcto."),("El soporte técnico","Nunca."),("La red","No.")],0),
 q("¿Dónde guardar la frase?",[("Fuera de línea, en un lugar seguro","Correcto."),("En una foto en la nube","Quien entre en la cuenta la verá."),("En un correo a ti mismo","No.")],0),
 q("Señal típica de phishing:",[("Urgencia y regalo inesperado","Correcto."),("Un mensaje que no pide nada","No es la señal."),("Una web que escribes tú","No.")],0),
 q("2FA más resistente al phishing:",[("Llave física o passkey","Correcto."),("SMS","Es el más débil."),("Ninguno","Sí hay diferencias.")],0),
 q("En autocustodia, si pierdes la frase:",[("Nadie puede recuperar el acceso","Correcto."),("La empresa de la wallet la repone","No la tiene."),("La red la reenvía","No.")],0),
 q("Ante un mensaje dudoso:",[("Abre el servicio por el camino que ya conoces","Correcto."),("Pulsa el enlace para comprobarlo","Es lo que busca el atacante."),("Responde con tus datos","No.")],0)]
M["4"]=[
 q("¿Se paga comisión si la transacción falla?",[("Sí","Correcto."),("No","Se cobra."),("Solo en Bitcoin","No.")],0),
 q("¿Por qué sube la comisión?",[("Por la demanda de espacio en los bloques","Correcto."),("Por el importe enviado","En Bitcoin depende del tamaño en bytes, no del importe."),("Por la hora","Indirectamente, solo si hay más demanda.")],0),
 q("¿Qué hace conectar la wallet a una web?",[("Muestra tu dirección","Correcto."),("Mueve tus fondos","No."),("Da permiso ilimitado","No.")],0),
 q("¿Qué autoriza un approve?",[("Que otra dirección gaste hasta un límite de un token","Correcto."),("Ver tu saldo","No."),("Nada","Autoriza gasto.")],0),
 q("¿Cómo se quita un permiso?",[("Revocándolo con otra transacción","Correcto."),("Desconectando la web","No basta."),("Borrando la app","No.")],0),
 q("Hora de un explorador en UTC 23:30 en noviembre. En Madrid es:",[("00:30 del día siguiente","Correcto: UTC+1."),("23:30","Hay que convertir."),("22:30","Al revés.")],0)]
M["5"]=[
 q("¿Qué parte de una dApp vive en la cadena?",[("El contrato","Correcto."),("La web","No."),("El proveedor","No.")],0),
 q("¿Qué fija el precio en un AMM?",[("La proporción entre sus saldos","Correcto."),("Un libro de órdenes","No en un AMM."),("El equipo","No.")],0),
 q("Deslizamiento es:",[("La diferencia entre el precio mostrado y el obtenido","Correcto."),("Una comisión fija","No."),("Un tipo de token","No.")],0),
 q("Cantidades virtuales en una curva:",[("Cantidades de la fórmula que no son fondos depositados","Correcto."),("Fondos reales","Esas son las reales."),("Un error","No.")],0),
 q("¿Qué provoca una liquidación?",[("Que la garantía caiga bajo el umbral","Correcto."),("Pagar a tiempo","No."),("El staking","No.")],0),
 q("Ante un rendimiento, la pregunta clave es:",[("¿Quién lo paga y por qué?","Correcto."),("¿Es alto?","No basta."),("¿Lo recomiendan famosos?","Es una señal de promoción.")],0)]
M["6"]=[
 q("¿Qué identifica a un token en Solana?",[("La dirección del mint","Correcto."),("El nombre","No."),("El logotipo","No.")],0),
 q("Emisión activa en una moneda estable:",[("Es la forma normal de crear unidades","Correcto."),("Es una acusación","No."),("Es imposible","No.")],0),
 q("Una muestra de cuentas es:",[("Una parte de las cuentas, no un censo","Correcto."),("La lista completa","No."),("La lista de personas","Una cuenta no es una persona.")],0),
 q("HTTP 429 al pedir un dato:",[("Consulta fallida","Correcto."),("Ausente comprobado","No: no hubo respuesta usable."),("Cero","No.")],0),
 q("«Afirmación sobre el futuro» es:",[("Hipótesis","Correcto."),("Hecho comprobable","No."),("Dato de la cadena","No.")],0),
 q("¿Qué debe llevar una lectura guardada?",[("Fecha con zona, fuente y huecos","Correcto."),("Solo el precio","No."),("Una recomendación","No.")],0)]
# rotate correct answers so they are not always first
import random
rnd=random.Random(7)
for k,l in M.items():
    for x in l:
        o=x["opciones"]; c=o[0]; rest=o[1:]; pos=rnd.randrange(3); x["opciones"]=rest[:pos]+[c]+rest[pos:]
P["P1"]={"titulo":"Mensajes sospechosos","unidad":"OA-011","enunciado":"Seis mensajes inventados. Decide si cada uno es sospechoso o normal. Ninguno usa marcas ni personas reales.","actividad":act("¿Sospechoso o normal?",["Sospechoso","Normal"],[
 ("«Soporte de tu wallet: valida tus 12 palabras en este formulario antes de las 18:00»","Sospechoso","Pide la frase y mete prisa."),
 ("Tu app oficial muestra una actualización disponible en la tienda de aplicaciones","Normal","Llega por un canal que ya usabas."),
 ("Un perfil con el avatar del proyecto, pero otro nombre de usuario, anuncia un airdrop","Sospechoso","Perfil copiado y regalo inesperado."),
 ("Un amigo te pide por voz tu dirección para devolverte dinero","Normal","La dirección es pública."),
 ("«Envía 1 y te devolvemos 2 en una hora»","Sospechoso","Promesa de multiplicar."),
 ("Un enlace a un dominio con una letra cambiada respecto al oficial","Sospechoso","Imita la web real.")])}
P["P2"]={"titulo":"Revisar un envío","unidad":"OA-014","enunciado":"La pantalla de un envío inventado. Revisa cada dato y decide si es correcto o hay que parar. No se envía nada.","actividad":act("¿Correcto o hay que parar?",["Correcto","Hay que parar"],[
 ("Red: Solana, igual que la de la wallet de destino","Correcto","Origen y destino coinciden."),
 ("Dirección de destino que empieza por 0x","Hay que parar","Formato de otra red."),
 ("Importe: 0,5 SOL, el acordado","Correcto","Coincide con lo previsto."),
 ("Comisión de retirada de la plataforma: el 50 % del importe","Hay que parar","Desproporcionada: revisa antes."),
 ("Dirección copiada de un mensaje privado de alguien que dice ser el destinatario","Hay que parar","Confírmala por otro canal."),
 ("Resumen final que muestra el total a debitar","Correcto","Es la pantalla que hay que leer antes de firmar.")])}
P["P3"]={"titulo":"Leer un permiso","unidad":"OA-015","enunciado":"Una petición de permiso inventada. Lee cada campo y decide qué te dice.","actividad":act("¿Qué indica cada campo?",["Información útil","Señal para no firmar"],[
 ("Token: USDC en la red que esperabas","Información útil","Sabes qué token se ve afectado."),
 ("Cantidad: ilimitada","Señal para no firmar","Puedes fijar un límite igual a lo que vas a usar."),
 ("Spender: una dirección que no coincide con la del contrato oficial","Señal para no firmar","Una web falsa pide permiso para su propio contrato."),
 ("Web a la que llegaste escribiendo tú la dirección","Información útil","Reduce el riesgo de suplantación."),
 ("Mensaje «firma ahora o pierdes la recompensa»","Señal para no firmar","Urgencia."),
 ("La wallet muestra que es una aprobación, no un envío","Información útil","Sabes qué tipo de acción es.")])}
P["P4"]={"titulo":"Lectura fechada","unidad":"OA-024","enunciado":"Notas inventadas de una lectura de un token. Decide si cada una está bien registrada o le falta algo para poder compararla después.","actividad":act("¿Bien registrada o incompleta?",["Bien registrada","Incompleta"],[
 ("Suministro leído del mint el 03-11-2026 a las 10:40 (hora de Madrid)","Bien registrada","Dice qué, de dónde y cuándo."),
 ("«El token es de USD Coin» porque así se llama","Incompleta","El nombre no identifica: falta la dirección completa del mint."),
 ("Autoridad de congelación: Dato no disponible (la consulta falló)","Bien registrada","Separa un hueco de un «no tiene»."),
 ("Liquidez: 0","Incompleta","Si no se leyó, no es cero: hay que decir que falta y por qué."),
 ("Reparto: muestra de 20 cuentas; la mayor es una cuenta técnica de la curva","Bien registrada","Indica el tamaño de la muestra y qué cuenta es."),
 ("Captura sin fecha de una web del proyecto","Incompleta","Sin fecha ni fuente no se puede comparar después.")])}
for k,v in A.items(): assert all(i["categoria"] in v["categorias"] for i in v["items"]),k
json.dump({"version":1,"actualizado":"2026-11-03","aprobado_modulo":5,"unidades":U,"actividades":A,"modulos":M,"practicas":P},open('academy/content/preguntas.json','w'),ensure_ascii=False,indent=1)
print(len(U),len(A),sum(len(v) for v in M.values()),len(P))
