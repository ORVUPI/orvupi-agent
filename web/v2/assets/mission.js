"use strict";
(() => {
const STUBX_LAB = {"mission":{"id":"mision-01","version":"2.0.0","updated":"2026-10-16","cardDate":"2026-10-16","title":{"es":"Cómo detectar un token clon en 5 pasos","en":"How to spot a clone token in 5 steps"},"intro":{"es":"Cinco preguntas cortas con las fichas del 2026-10-16: USDC y tres copias que se llaman igual. Si no aciertas, puedes volver a intentar. El progreso se queda en este navegador.","en":"Five short questions using the 2026-10-16 cards: USDC and three copies with the same name. If you miss, you can try again. Progress stays in this browser."},"closing":{"es":"Has separado la dirección de referencia, una copia y un dato que no se pudo leer. No es un certificado. No hace falta una cuenta ni tener ningún token para leerlo.","en":"You separated the reference address, a copy, and a fact that could not be read. This is not a certificate. No account is required, and holding any token is not required to read it."},"steps":[{"id":"direccion","kind":"check","glossary":["direccion","registro"],"cards":["EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v","5vJmAfBjsS6wEHcgQGNm69P3fbyPmUU1dVfE5j1rraVZ","H5b7sHTqr7WJqL9X4io8VeTBfePSyv85wEBnKNaZKV9R"],"fields":["name","mint","inRegistry"],"prompt":{"es":"Las tres se llaman «USD Coin». ¿Cuál es la dirección de USDC?","en":"All three are named “USD Coin”. Which one is the USDC address?"},"guide":{"es":"La dirección del mint identifica ese token. El nombre se puede copiar; la dirección, no.","en":"The mint address identifies that token. A name can be copied; the address cannot."},"options":[{"id":"oficial","label":{"es":"EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v","en":"EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"},"mint":"EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"},{"id":"clon-dj","label":{"es":"5vJmAfBjsS6wEHcgQGNm69P3fbyPmUU1dVfE5j1rraVZ","en":"5vJmAfBjsS6wEHcgQGNm69P3fbyPmUU1dVfE5j1rraVZ"},"mint":"5vJmAfBjsS6wEHcgQGNm69P3fbyPmUU1dVfE5j1rraVZ"},{"id":"clon-hh","label":{"es":"H5b7sHTqr7WJqL9X4io8VeTBfePSyv85wEBnKNaZKV9R","en":"H5b7sHTqr7WJqL9X4io8VeTBfePSyv85wEBnKNaZKV9R"},"mint":"H5b7sHTqr7WJqL9X4io8VeTBfePSyv85wEBnKNaZKV9R"}],"correct":"oficial","whyRight":{"es":"Solo esta dirección está en el registro del 2026-10-16. Las otras se llaman igual y la ficha indica que se parecen a USDC pero no son su mint. Eso no dice quién las creó ni con qué intención.","en":"Only this address is in the 2026-10-16 registry. The others have the same name and the card indicates that they look like USDC but are not its mint. That does not say who created them or why."},"whyWrong":{"clon-dj":{"es":"Se llama «USD Coin», pero no está en el registro. El nombre no sustituye a la dirección.","en":"It is named “USD Coin”, but it is not in the registry. The name does not stand in for the address."},"clon-hh":{"es":"Nombre y símbolo coinciden con USDC y la dirección es otra.","en":"The name and symbol match USDC and the address is different."}}},{"id":"emision","kind":"check","glossary":["autoridad-emision","autoridad-congelacion"],"cards":["5vJmAfBjsS6wEHcgQGNm69P3fbyPmUU1dVfE5j1rraVZ","EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"],"fields":["name","mint","mintAuthority","freezeAuthority"],"prompt":{"es":"La copia tiene los permisos cerrados y USDC, abiertos. ¿Qué es cierto?","en":"The copy has its permissions closed and USDC has them open. What is true?"},"guide":{"es":"Permiso cerrado = nadie puede crear más unidades ni congelar cuentas. Las copias también pueden tenerlo.","en":"Closed permission = nobody can create more units or freeze accounts. Copies can have it too."},"options":[{"id":"coincide","label":{"es":"La copia es la buena, porque tiene los permisos cerrados.","en":"The copy is the real one, because its permissions are closed."}},{"id":"solo-permiso","label":{"es":"Los permisos describen la cuenta. No identifican la dirección.","en":"Permissions describe the account. They do not identify the address."}},{"id":"no-leido","label":{"es":"No se leyó, y por eso pone «cerrado».","en":"It was not read, so it says “closed”."}}],"correct":"solo-permiso","whyRight":{"es":"En la ficha del 2026-10-16, la copia 5vJm… tiene emisión y congelación revocadas. USDC las tiene activas: BJE5MMbqXjVwjAF7oxwPYXnTXDyspzZyt4vwenNw5ruG y 7dGbd2QZcCKcTndnHcTL8q7SMVXAkp688NTQYwrRCrar. Un permiso no identifica la dirección.","en":"On the 2026-10-16 card, the 5vJm… copy has mint and freeze revoked. USDC has them active: BJE5MMbqXjVwjAF7oxwPYXnTXDyspzZyt4vwenNw5ruG and 7dGbd2QZcCKcTndnHcTL8q7SMVXAkp688NTQYwrRCrar. A permission does not identify the address."},"whyWrong":{"coincide":{"es":"Dos direcciones distintas pueden tener permisos distintos. La del registro es la de USDC.","en":"Two different addresses can have different permissions. The registry address is USDC's."},"no-leido":{"es":"En esta ficha el permiso sí se leyó. Si no se hubiera leído, no se rellenaría como cerrado.","en":"On this card the permission was read. If it had not been read, it would not be filled in as closed."}}},{"id":"desconocido","kind":"check","glossary":["desconocido","ficha","censo"],"cards":["4XRbnGgay2XpqJ1F5jGPQ9pRh1JSX12RPCPJASMJU5JW"],"fields":["name","holders","metadata"],"prompt":{"es":"Si un dato dice «no disponible», ¿qué haces?","en":"If a fact says “unavailable”, what do you do?"},"guide":{"es":"No disponible quiere decir que esa lectura no dejó un dato. No es un cero y no borra el resto de la ficha.","en":"Unavailable means that reading left no fact. It is not a zero and it does not erase the rest of the card."},"options":[{"id":"prueba-y-cero","label":{"es":"Lo cuento como cero.","en":"I count it as zero."}},{"id":"sigue-desconocido","label":{"es":"Sigue sin saberse. No es un cero.","en":"It stays unknown. It is not a zero."}},{"id":"anula-ficha","label":{"es":"Tiro la ficha entera.","en":"I throw out the whole card."}}],"correct":"sigue-desconocido","whyRight":{"es":"En las fichas del 2026-10-16 la muestra de cuentas con tokens está no disponible: el servicio respondió HTTP 429. Eso no es un cero ni anula lo que sí se leyó (nombre, permisos, suministro).","en":"On the 2026-10-16 cards the token account sample is unavailable: the service returned HTTP 429. That is not a zero and it does not erase what was read (name, permissions, supply)."},"whyWrong":{"prueba-y-cero":{"es":"Un hueco no es un dato leído. No se rellena con cero.","en":"A gap is not a fact that was read. It is not filled in with zero."},"anula-ficha":{"es":"Falta lo que la ficha nombra. El resto, si se leyó, sigue constando.","en":"What the card names is missing. The rest, if it was read, still stands."}}},{"id":"suplantacion","kind":"check","glossary":["suplantacion","direccion"],"cards":["H5b7sHTqr7WJqL9X4io8VeTBfePSyv85wEBnKNaZKV9R","EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"],"fields":["name","impersonation"],"prompt":{"es":"Una copia marca «posible suplantación». ¿Eso prueba la intención de alguien?","en":"A copy shows “possible impersonation”. Does that prove someone’s intent?"},"guide":{"es":"La señal sale porque el nombre o el símbolo coinciden con un token del registro y la dirección es otra. No dice lo que alguien quiso hacer.","en":"The signal appears because the name or symbol matches a registry token and the address is different. It does not say what someone meant to do."},"options":[{"id":"no-leida","label":{"es":"Sí: prueba que es una estafa.","en":"Yes: it proves it is a scam."}},{"id":"senal-sin-intencion","label":{"es":"Es una señal. No atribuye intención.","en":"It is a signal. It does not attribute intent."}},{"id":"virtual-retirable","label":{"es":"No significa nada, porque el nombre es igual.","en":"It means nothing, because the name is the same."}}],"correct":"senal-sin-intencion","whyRight":{"es":"En H5b7… el nombre «USD Coin» y el símbolo «USDC» coinciden con USDC, y el mint es otro. La ficha lo marca como señal para comparar y no atribuye intención.","en":"On H5b7… the name “USD Coin” and the symbol “USDC” match USDC, and the mint is different. The card marks it as a signal to compare and does not attribute intent."},"whyWrong":{"no-leida":{"es":"La ficha no afirma la intención de nadie. Es una coincidencia que conviene comprobar.","en":"The card does not assert anyone’s intent. It is a match worth checking."},"virtual-retirable":{"es":"Justo porque el nombre es igual hay que mirar la dirección: esa es la señal.","en":"Precisely because the name is the same, you need to check the address: that is the signal."}}},{"id":"caso-nuevo","kind":"comprehension","glossary":["direccion","autoridad-emision"],"cards":[],"fields":[],"prompt":{"es":"Nombre igual, otra dirección. ¿Qué miras primero?","en":"Same name, different address. What do you check first?"},"guide":{"es":"Caso imaginario, no es una ficha real. El nombre puede repetirse; la dirección distingue un token de otro.","en":"An imagined case, not a real card. A name can be repeated; the address tells one token from another."},"options":[{"id":"fiarse-del-nombre","label":{"es":"El nombre.","en":"The name."}},{"id":"comparar-direccion","label":{"es":"La dirección.","en":"The address."}},{"id":"revocada-es-registro","label":{"es":"Si el permiso está cerrado, ya es la buena.","en":"If the permission is closed, it is already the real one."}}],"correct":"comparar-direccion","whyRight":{"es":"Primero se compara la dirección. Un permiso cerrado no identifica el token, y un dato no leído no se convierte en un hecho.","en":"The address is compared first. A closed permission does not identify the token, and an unread fact does not become a fact."},"whyWrong":{"fiarse-del-nombre":{"es":"El nombre, aunque lleve «oficial», no es la dirección.","en":"The name, even if it says “official”, is not the address."},"revocada-es-registro":{"es":"Un permiso cerrado describe ese permiso. Si la dirección es otra, no es la del registro.","en":"A closed permission describes that permission. If the address is different, it is not the registry one."}}}]},"lessons":[{"id":"leccion-permisos","version":"2.0.0","updated":"2026-10-16","cardDate":"2026-10-16","title":{"es":"Permisos: emisión y congelación","en":"Permissions: mint and freeze"},"intro":{"es":"Dos fichas del 2026-10-16. USDC es una moneda estable: un token pensado para seguir una moneda de curso. La copia 5vJm… solo se llama igual. Un permiso describe la cuenta, no acusa a nadie.","en":"Two cards from 2026-10-16. USDC is a stablecoin: a token meant to follow a currency. The 5vJm… copy only has the same name. A permission describes the account. It does not accuse anyone."},"closing":{"es":"Has separado un permiso activo de una acusación, y un permiso cerrado de una garantía. No es un certificado y no dice qué hacer con el token.","en":"You separated an active permission from an accusation, and a closed permission from a guarantee. This is not a certificate and it does not say what to do with the token."},"entender":["permisos"],"steps":[{"id":"contexto","kind":"check","glossary":["autoridad-emision","autoridad-congelacion","moneda-estable"],"cards":["EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v","5vJmAfBjsS6wEHcgQGNm69P3fbyPmUU1dVfE5j1rraVZ"],"fields":["name","mint","mintAuthority","freezeAuthority"],"prompt":{"es":"USDC tiene la emisión activa. ¿Eso acusa al proyecto?","en":"USDC has an active mint permission. Does that accuse the project?"},"guide":{"es":"Emisión: crear más tokens. Congelación: bloquear cuentas. USDC los tiene activos. La copia 5vJm…, el 2026-10-16, los tiene cerrados.","en":"Mint permission: create more tokens. Freeze permission: block accounts. USDC has both active. On 2026-10-16, the 5vJm… copy has both closed."},"options":[{"id":"acusa","label":{"es":"Sí. Un permiso activo es una acusación.","en":"Yes. An active permission is an accusation."}},{"id":"contexto","label":{"es":"No. En una moneda estable y en un meme no se lee igual.","en":"No. A stablecoin and a meme are not read the same way."}},{"id":"tambien-copia","label":{"es":"Sí, y la copia es más fiable porque los tiene cerrados.","en":"Yes, and the copy is more reliable because it has them closed."}}],"correct":"contexto","whyRight":{"es":"En la ficha del 2026-10-16, USDC tiene la emisión activa en BJE5MMbqXjVwjAF7oxwPYXnTXDyspzZyt4vwenNw5ruG y la congelación activa en 7dGbd2QZcCKcTndnHcTL8q7SMVXAkp688NTQYwrRCrar. En una moneda estable, la emisión activa es la forma de crear unidades. Un permiso no es una acusación.","en":"On the 2026-10-16 card, USDC has the mint permission active at BJE5MMbqXjVwjAF7oxwPYXnTXDyspzZyt4vwenNw5ruG and the freeze permission active at 7dGbd2QZcCKcTndnHcTL8q7SMVXAkp688NTQYwrRCrar. For a stablecoin, an active mint is how units are created. A permission is not an accusation."},"whyWrong":{"acusa":{"es":"El permiso dice que alguien puede crear más tokens. No dice que el proyecto engañe.","en":"The permission says someone can create more tokens. It does not say the project is deceiving anyone."},"tambien-copia":{"es":"Tener los permisos cerrados no hace fiable a una copia: la dirección sigue sin ser la de USDC.","en":"Having closed permissions does not make a copy reliable: the address is still not USDC's."}}},{"id":"cerrado","kind":"check","glossary":["autoridad-emision","autoridad-congelacion"],"cards":["5vJmAfBjsS6wEHcgQGNm69P3fbyPmUU1dVfE5j1rraVZ","EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"],"fields":["name","mint","mintAuthority","freezeAuthority"],"prompt":{"es":"La copia 5vJm… tiene los dos permisos cerrados. ¿Eso la hace segura?","en":"The 5vJm… copy has both permissions closed. Does that make it safe?"},"guide":{"es":"Cerrado: ese permiso no está asignado en esta lectura. No demuestra que el proyecto sea legítimo.","en":"Closed: that permission is not assigned in this reading. It does not show the project is legitimate."},"options":[{"id":"seguro","label":{"es":"Sí. Cerrado quiere decir que es seguro.","en":"Yes. Closed means it is safe."}},{"id":"solo-permiso","label":{"es":"No. Solo dice que esos permisos no están asignados.","en":"No. It only says those permissions are not assigned."}},{"id":"no-leido","label":{"es":"No se leyó, y por eso pone cerrado.","en":"It was not read, so it says closed."}}],"correct":"solo-permiso","whyRight":{"es":"El 2026-10-16 los dos figuran revocados y leídos en la cadena. Revocado no es una garantía, y esta dirección no es la de USDC. USDC los tiene activos y la ficha tampoco lo acusa.","en":"On 2026-10-16 both are revoked and read on-chain. Revoked is not a guarantee, and this address is not USDC's. USDC has them active and the card does not accuse it either."},"whyWrong":{"seguro":{"es":"Cerrado describe ese permiso. No dice que el token sea seguro ni qué hacer con él.","en":"Closed describes that permission. It does not say the token is safe or what to do with it."},"no-leido":{"es":"En esta ficha el permiso sí se leyó. Si no se hubiera leído, no se rellenaría como cerrado.","en":"On this card the permission was read. If it had not been read, it would not be filled in as closed."}}}]},{"id":"leccion-reparto","version":"2.0.0","updated":"2026-10-16","cardDate":"2026-10-16","title":{"es":"Reparto: suministro y cuentas","en":"Distribution: supply and accounts"},"intro":{"es":"Fichas del 2026-10-16. Mismo nombre no quiere decir mismo suministro. Y cuando la muestra de cuentas no llega, no se sabe cómo está repartido: no es un cero.","en":"Cards from 2026-10-16. The same name does not mean the same supply. And when the account sample does not arrive, the distribution is unknown: it is not a zero."},"closing":{"es":"Has separado el suministro de un token de su nombre, y una muestra que no llegó de una concentración cero. No es un censo ni dice qué hacer con el token.","en":"You separated a token's supply from its name, and a sample that did not arrive from zero concentration. It is not a census and it does not say what to do with the token."},"entender":["distribucion"],"steps":[{"id":"curva","kind":"check","glossary":["titular","censo"],"cards":["4XRbnGgay2XpqJ1F5jGPQ9pRh1JSX12RPCPJASMJU5JW","EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"],"fields":["name","mint"],"prompt":{"es":"La copia 4XRb… y USDC se llaman igual. ¿Tienen el mismo suministro?","en":"The 4XRb… copy and USDC have the same name. Do they have the same supply?"},"guide":{"es":"El suministro es cuántos tokens hay. Se lee del mint de cada dirección, no del nombre.","en":"Supply is how many tokens exist. It is read from each address's mint, not from the name."},"options":[{"id":"persona","label":{"es":"Sí. Mismo nombre, mismo token.","en":"Yes. Same name, same token."}},{"id":"tecnica","label":{"es":"No. Cada dirección tiene su propio suministro.","en":"No. Each address has its own supply."}},{"id":"pool","label":{"es":"No se puede leer el suministro.","en":"The supply cannot be read."}}],"correct":"tecnica","whyRight":{"es":"El 2026-10-16, USDC tiene 7.902.630.871,234262 tokens con 6 decimales. La copia 4XRb… tiene 1.029.314.281,190085282 con 9 decimales. Son tokens distintos aunque se llamen igual.","en":"On 2026-10-16, USDC has 7,902,630,871.234262 tokens with 6 decimals. The 4XRb… copy has 1,029,314,281.190085282 with 9 decimals. They are different tokens even though they share a name."},"whyWrong":{"persona":{"es":"El nombre lo elige quien crea el token. El suministro sale de la dirección.","en":"The name is chosen by whoever creates the token. The supply comes from the address."},"pool":{"es":"El suministro sí se leyó: está en los bytes del mint de cada ficha.","en":"The supply was read: it is in the mint bytes of each card."}}},{"id":"tres-cuentas","kind":"check","glossary":["censo","desconocido"],"cards":["H5b7sHTqr7WJqL9X4io8VeTBfePSyv85wEBnKNaZKV9R"],"fields":["name","mint","holders"],"prompt":{"es":"La muestra de cuentas de H5b7… no llegó. ¿Quiere decir que nadie tiene tokens?","en":"The account sample for H5b7… did not arrive. Does it mean nobody holds tokens?"},"guide":{"es":"Sin muestra no se sabe cómo está repartido. No es un cero ni una concentración baja.","en":"Without a sample the distribution is unknown. It is not a zero or low concentration."},"options":[{"id":"si-censo","label":{"es":"Sí. Nadie tiene tokens.","en":"Yes. Nobody holds tokens."}},{"id":"no-censo","label":{"es":"No. El reparto sigue sin saberse.","en":"No. The distribution is still unknown."}},{"id":"nada-leido","label":{"es":"Está bien repartido, porque no sale nada.","en":"It is well distributed, because nothing shows up."}}],"correct":"no-censo","whyRight":{"es":"El 2026-10-16, getTokenLargestAccounts respondió HTTP 429 para H5b7…. El suministro (100.000.000 tokens) sí se leyó; el reparto queda no disponible.","en":"On 2026-10-16, getTokenLargestAccounts returned HTTP 429 for H5b7…. The supply (100,000,000 tokens) was read; the distribution stays unavailable."},"whyWrong":{"si-censo":{"es":"Una muestra que no llegó no es un recuento.","en":"A sample that did not arrive is not a count."},"nada-leido":{"es":"Que no salga nada no dice cómo está repartido.","en":"Nothing showing up does not say how it is distributed."}}}]},{"id":"leccion-huecos","version":"2.0.0","updated":"2026-10-16","cardDate":"2026-10-16","title":{"es":"Cuando falta un dato","en":"When a fact is missing"},"intro":{"es":"Tres huecos distintos, con fichas del 2026-10-16. Consulta fallida: se pidió y no hubo respuesta usable. Ausente comprobado: se pidió y el dato no está. No consultado: esta lectura no lo pidió. Ninguno de los tres es un cero.","en":"Three different gaps, using cards from 2026-10-16. Failed query: it was asked for and there was no usable answer. Confirmed absent: it was asked for and the fact is not there. Not queried: this reading did not ask for it. None of the three is a zero."},"closing":{"es":"Has separado una consulta que falló, un dato que no está y un dato que no se pidió. Ninguno se rellena con cero. No es un certificado.","en":"You separated a query that failed, a fact that is not there, and a fact that was not asked for. None of them is filled in with zero. This is not a certificate."},"entender":["distribucion","metadatos"],"steps":[{"id":"fallo","kind":"check","glossary":["consulta-fallida","desconocido"],"cards":["EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"],"fields":["name","mint","holders"],"prompt":{"es":"USDC pidió las cuentas grandes y recibió HTTP 429. ¿Qué es?","en":"USDC asked for the largest accounts and got HTTP 429. What is that?"},"guide":{"es":"HTTP 429 es una consulta fallida: el servicio no dejó una respuesta usable. No es un cero ni una ausencia.","en":"HTTP 429 is a failed query: the service left no usable answer. It is not a zero and it is not an absence."},"options":[{"id":"cero","label":{"es":"Lo cuento como cero.","en":"I count it as zero."}},{"id":"fallo","label":{"es":"Es una consulta fallida. No es un cero.","en":"It is a failed query. It is not a zero."}},{"id":"ausente","label":{"es":"Quedó comprobado que no hay cuentas.","en":"It was confirmed that there are no accounts."}}],"correct":"fallo","whyRight":{"es":"El 2026-10-16, getTokenLargestAccounts sobre USDC respondió HTTP 429. El estado es no disponible. No se rellena con cero ni se dice que las cuentas no existan.","en":"On 2026-10-16, getTokenLargestAccounts for USDC returned HTTP 429. The status is unavailable. It is not filled in with zero, and it does not say the accounts do not exist."},"whyWrong":{"cero":{"es":"Una consulta sin respuesta no es un dato leído. No se rellena con cero.","en":"A query with no answer is not a fact that was read. It is not filled in with zero."},"ausente":{"es":"Ausente comprobado es otra cosa: la consulta respondió y el dato no está. Aquí el servicio no respondió usable.","en":"Confirmed absent is different: the query answered and the fact is not there. Here the service left no usable answer."}}},{"id":"ausente","kind":"check","glossary":["ausente-comprobado","metadatos-mutables"],"cards":["EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"],"fields":["name","mint","metadata"],"prompt":{"es":"En USDC se leyó la cuenta de metadatos y el enlace (URI) está vacío. ¿Qué es?","en":"On USDC the metadata account was read and the link (URI) is empty. What is that?"},"guide":{"es":"Se consultó y el enlace no está: ausente comprobado. No es un fallo.","en":"It was queried and the link is not there: confirmed absent. It is not a failure."},"options":[{"id":"fallo","label":{"es":"La consulta falló.","en":"The query failed."}},{"id":"ausente","label":{"es":"Se comprobó que no existe. No es un fallo.","en":"It was confirmed that it does not exist. It is not a failure."}},{"id":"no-pedido","label":{"es":"Esta lectura no lo pidió.","en":"This reading did not ask for it."}}],"correct":"ausente","whyRight":{"es":"El 2026-10-16 la cuenta de metadatos de USDC respondió y el campo URI está vacío. La consulta respondió. El dato no está. No es un HTTP 429.","en":"On 2026-10-16 USDC's metadata account answered and the URI field is empty. The query answered. The fact is not there. It is not an HTTP 429."},"whyWrong":{"fallo":{"es":"La consulta sí respondió. El fallo es cuando no hay respuesta usable.","en":"The query did answer. A failure is when there is no usable answer."},"no-pedido":{"es":"Sí se pidió: hay una lectura de esa cuenta, con hora y slot. No pedido es cuando esta lectura ni siquiera lo consulta.","en":"It was asked for: there is a reading of that account, with a time and a slot. Not queried is when this reading does not even ask."}}},{"id":"no-pedido","kind":"check","glossary":["no-consultado","censo","desconocido"],"cards":["EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"],"fields":["name","mint","holders"],"prompt":{"es":"Sin URI, la lectura de USDC no pidió el JSON de metadatos. ¿Qué haces?","en":"Without a URI, the USDC reading did not ask for the metadata JSON. What do you do?"},"guide":{"es":"No consultado: esta lectura no pidió ese dato porque no había dónde. No es un HTTP 429 ni un cero.","en":"Not queried: this reading did not ask for that fact because there was nowhere to ask. It is not an HTTP 429 and it is not a zero."},"options":[{"id":"cero","label":{"es":"Lo pongo a cero.","en":"I set it to zero."}},{"id":"fallo","label":{"es":"Lo trato como una consulta fallida.","en":"I treat it as a failed query."}},{"id":"no-pedido","label":{"es":"Sigue sin pedirse. No es un fallo ni un cero.","en":"It stays unasked. It is not a failure and it is not a zero."}}],"correct":"no-pedido","whyRight":{"es":"La ficha del 2026-10-16 deja el nombre del JSON como «no aplica»: sin URI no hay JSON que pedir. Eso no es el HTTP 429 de la muestra de cuentas.","en":"The 2026-10-16 card leaves the JSON name as “not applicable”: without a URI there is no JSON to fetch. That is not the HTTP 429 of the account sample."},"whyWrong":{"cero":{"es":"No haberlo pedido no es un cero ni un nombre vacío: simplemente no hay JSON leído.","en":"Not asking for it is not a zero or an empty name: there is simply no JSON read."},"fallo":{"es":"Se pidió la muestra de cuentas y recibió HTTP 429: eso sí es una consulta fallida. El JSON no se pidió porque no había URI.","en":"The account sample was asked for and got HTTP 429: that is a failed query. The JSON was not asked for because there was no URI."}}}]}],"entender":[{"id":"permisos","href":"/aprender/#guia-permisos","es":"Permisos","en":"Permissions","explain":{"es":"Permisos: el de emisión permite crear más tokens. El de congelación permite bloquear cuentas. Ninguno de los dos dice si el proyecto es legítimo.","en":"Permissions: the mint permission can create more tokens. The freeze permission can block accounts. Neither one says the project is legitimate."}},{"id":"suministro","href":"/aprender/#autoridad-emision","es":"Suministro","en":"Supply","explain":{"es":"Suministro: es la cantidad total de tokens en esta lectura, con los decimales de este token.","en":"Supply: it is the total number of tokens in this reading, using this token's decimals."}},{"id":"metadatos","href":"/aprender/#metadatos-mutables","es":"Metadatos","en":"Metadata","explain":{"es":"Metadatos: si se pueden cambiar, puede que mañana el nombre o el símbolo ya no sean los de esta lectura.","en":"Metadata: if they can change, the name or symbol in this reading may not be tomorrow's."}},{"id":"distribucion","href":"/aprender/#censo","es":"Distribución (guía Censo)","en":"Distribution (Census guide)","explain":{"es":"Distribución: una muestra de cuentas no es un censo de quién tiene los tokens.","en":"Distribution: a sample of accounts is not a census of who holds the tokens."}},{"id":"curva","href":"/aprender/#curva-pump","es":"Curva","en":"Curve","explain":{"es":"Curva: si el token no se creó en Pump.fun, este dato no aplica. Si se creó y no hay cuenta, esta lectura no la encontró.","en":"Curve: if the token was not created on Pump.fun, this fact does not apply. If it was and there is no account, this reading did not find it."}}],"cards":{"EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v":{"mint":"EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v","role":"registro","roleNote":{"es":"USDC (Circle) en Solana: el token de referencia del registro curado. Se usa como ejemplo neutro; no es ORVUPI, que aún no tiene contrato.","en":"USDC (Circle) on Solana: the reference token in the curated registry. It is a neutral example; it is not ORVUPI, which does not have a contract yet."},"id":"4922df1c2465a462c2bcdd235e72c13d055bb1f949d8e270f867d66f1e283008","createdAt":"2026-10-16T18:45:41.055Z","partial":true,"referenceSlot":457742099,"name":"USD Coin","nameStatus":"verificado","symbol":"USDC","inRegistry":true,"inRegistryStatus":"verificado","mintAuthority":{"state":"activa","status":"verificado"},"freezeAuthority":{"state":"activa","status":"verificado"},"metadataReading":"mutables","metadataLevel":"atención","holdersStatus":"no_disponible","holdersNote":"Sin respuesta utilizable. No se interpreta como autoridad revocada, como inmutabilidad ni como cantidad cero.","impersonation":false,"authenticityLevel":"ok","signals":["mint en el registro"],"statement":"El mint coincide con el registro curado (usdc). Que esté en el registro no es una auditoría.","statementStatus":"verificado","curvePresent":false,"curvePresentStatus":"verificado","curveProgress":null,"curveProgressStatus":"no_aplica","curveProgressNote":"No hay curva. No se rellena con cero.","curveModuleNote":"La dirección derivada tiene una cuenta cuyo propietario no es el programa de Pump.fun. No es una curva y no se rellenan con cero las cantidades de la curva.","rulesVersion":"0.1.0","statement_en":null,"holdersNote_en":"No usable response. It is not interpreted as a revoked authority, as immutability, or as a zero balance.","curveProgressNote_en":"There is no curve. It is not filled with zero.","curveModuleNote_en":"The derived address has an account whose owner is not the Pump.fun program. It is not a curve, and the curve amounts are not filled in with zero.","signals_en":["mint in the registry"]},"4XRbnGgay2XpqJ1F5jGPQ9pRh1JSX12RPCPJASMJU5JW":{"mint":"4XRbnGgay2XpqJ1F5jGPQ9pRh1JSX12RPCPJASMJU5JW","role":"clon","roleNote":{"es":"Copia conocida del 2026-10-16: se llama «USD Coin» (USDC) y no es el mint de USDC. La ficha marca posible suplantación y no atribuye intención.","en":"Known copy from 2026-10-16: it is named “USD Coin” (USDC) and it is not the USDC mint. The card marks possible impersonation and does not attribute intent."},"id":"a641ac2e0f9b884e4202b24e727dff06f2f28919209a3bc9b830104e47163c2c","createdAt":"2026-10-16T18:45:52.334Z","partial":true,"referenceSlot":457742150,"name":"USD Coin","nameStatus":"verificado","symbol":"USDC","inRegistry":false,"inRegistryStatus":"verificado","mintAuthority":{"state":"revocada","status":"verificado"},"freezeAuthority":{"state":"revocada","status":"verificado"},"metadataReading":"mutables","metadataLevel":"atención","holdersStatus":"no_disponible","holdersNote":"Sin respuesta utilizable. No se interpreta como autoridad revocada, como inmutabilidad ni como cantidad cero.","impersonation":true,"authenticityLevel":"riesgo","signals":["nombre «USD Coin» incluye USD Coin/USDC","símbolo «USDC» incluye USD Coin/USDC"],"statement":"Posible suplantación: el nombre, el símbolo, la imagen o un enlace coinciden con un token del registro curado, pero el mint es otro. La coincidencia no atribuye intención.","statementStatus":"inferido","curvePresent":false,"curvePresentStatus":"verificado","curveProgress":null,"curveProgressStatus":"no_aplica","curveProgressNote":"No hay curva. No se rellena con cero.","curveModuleNote":"No hay cuenta en la PDA. El módulo de otros mercados no está en esta versión. La ausencia no se rellena con una cantidad de cero.","rulesVersion":"0.1.0","statement_en":"Possible impersonation: the name, symbol, image, or a link matches a token in the curated registry, but the mint is different. The match does not attribute intent.","holdersNote_en":"No usable response. It is not interpreted as a revoked authority, as immutability, or as a zero balance.","curveProgressNote_en":"There is no curve. It is not filled with zero.","curveModuleNote_en":null,"signals_en":["nombre «USD Coin» incluye USD Coin/USDC","símbolo «USDC» incluye USD Coin/USDC"]},"5vJmAfBjsS6wEHcgQGNm69P3fbyPmUU1dVfE5j1rraVZ":{"mint":"5vJmAfBjsS6wEHcgQGNm69P3fbyPmUU1dVfE5j1rraVZ","role":"clon","roleNote":{"es":"Copia conocida del 2026-10-16: se llama «USD Coin» (USDC) y no es el mint de USDC. La ficha marca posible suplantación y no atribuye intención.","en":"Known copy from 2026-10-16: it is named “USD Coin” (USDC) and it is not the USDC mint. The card marks possible impersonation and does not attribute intent."},"id":"afec253bbf23b769d4535e75539d3f8b09192fe5e36a67ad00df3fddcab72263","createdAt":"2026-10-16T18:46:00.686Z","partial":true,"referenceSlot":457742189,"name":"USD Coin","nameStatus":"verificado","symbol":"USDC","inRegistry":false,"inRegistryStatus":"verificado","mintAuthority":{"state":"revocada","status":"verificado"},"freezeAuthority":{"state":"revocada","status":"verificado"},"metadataReading":"no_mutables_en_fuentes","metadataLevel":"ok","holdersStatus":"no_disponible","holdersNote":"Sin respuesta utilizable. No se interpreta como autoridad revocada, como inmutabilidad ni como cantidad cero.","impersonation":true,"authenticityLevel":"riesgo","signals":["nombre «USD Coin» incluye USD Coin/USDC","símbolo «USDC» incluye USD Coin/USDC"],"statement":"Posible suplantación: el nombre, el símbolo, la imagen o un enlace coinciden con un token del registro curado, pero el mint es otro. La coincidencia no atribuye intención.","statementStatus":"inferido","curvePresent":false,"curvePresentStatus":"verificado","curveProgress":null,"curveProgressStatus":"no_aplica","curveProgressNote":"No hay curva. No se rellena con cero.","curveModuleNote":"No hay cuenta en la PDA. El módulo de otros mercados no está en esta versión. La ausencia no se rellena con una cantidad de cero.","rulesVersion":"0.1.0","statement_en":"Possible impersonation: the name, symbol, image, or a link matches a token in the curated registry, but the mint is different. The match does not attribute intent.","holdersNote_en":"No usable response. It is not interpreted as a revoked authority, as immutability, or as a zero balance.","curveProgressNote_en":"There is no curve. It is not filled with zero.","curveModuleNote_en":null,"signals_en":["nombre «USD Coin» incluye USD Coin/USDC","símbolo «USDC» incluye USD Coin/USDC"]},"H5b7sHTqr7WJqL9X4io8VeTBfePSyv85wEBnKNaZKV9R":{"mint":"H5b7sHTqr7WJqL9X4io8VeTBfePSyv85wEBnKNaZKV9R","role":"clon","roleNote":{"es":"Copia conocida del 2026-10-16: se llama «USD Coin» (USDC) y no es el mint de USDC. La ficha marca posible suplantación y no atribuye intención.","en":"Known copy from 2026-10-16: it is named “USD Coin” (USDC) and it is not the USDC mint. The card marks possible impersonation and does not attribute intent."},"id":"5b661102b6ec5241904eebf786813cfbf17bc49ea7b3a2ec08184c580b81a0ed","createdAt":"2026-10-16T18:46:08.985Z","partial":true,"referenceSlot":457742229,"name":"USD Coin","nameStatus":"verificado","symbol":"USDC","inRegistry":false,"inRegistryStatus":"verificado","mintAuthority":{"state":"revocada","status":"verificado"},"freezeAuthority":{"state":"activa","status":"verificado"},"metadataReading":"no_mutables_en_fuentes","metadataLevel":"ok","holdersStatus":"no_disponible","holdersNote":"Sin respuesta utilizable. No se interpreta como autoridad revocada, como inmutabilidad ni como cantidad cero.","impersonation":true,"authenticityLevel":"riesgo","signals":["nombre «USD Coin» incluye USD Coin/USDC","símbolo «USDC» incluye USD Coin/USDC"],"statement":"Posible suplantación: el nombre, el símbolo, la imagen o un enlace coinciden con un token del registro curado, pero el mint es otro. La coincidencia no atribuye intención.","statementStatus":"inferido","curvePresent":false,"curvePresentStatus":"verificado","curveProgress":null,"curveProgressStatus":"no_aplica","curveProgressNote":"No hay curva. No se rellena con cero.","curveModuleNote":"No hay cuenta en la PDA. El módulo de otros mercados no está en esta versión. La ausencia no se rellena con una cantidad de cero.","rulesVersion":"0.1.0","statement_en":"Possible impersonation: the name, symbol, image, or a link matches a token in the curated registry, but the mint is different. The match does not attribute intent.","holdersNote_en":"No usable response. It is not interpreted as a revoked authority, as immutability, or as a zero balance.","curveProgressNote_en":"There is no curve. It is not filled with zero.","curveModuleNote_en":null,"signals_en":["nombre «USD Coin» incluye USD Coin/USDC","símbolo «USDC» incluye USD Coin/USDC"]},"Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB":{"mint":"Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB","role":"contraste","roleNote":{"es":"USDT en Solana, contraste: otro token conocido, con emisión y congelación activas. No se presenta como copia de USDC.","en":"USDT on Solana, a contrast: another known token, with active mint and freeze permissions. It is not presented as a copy of USDC."},"id":"47f903a397a460485f0c5c21a5169d9b411a04825d5deba818a2a67c8e23ec18","createdAt":"2026-10-16T18:46:30.731Z","partial":true,"referenceSlot":457742328,"name":"USDT","nameStatus":"verificado","symbol":"USDT","inRegistry":false,"inRegistryStatus":"verificado","mintAuthority":{"state":"activa","status":"verificado"},"freezeAuthority":{"state":"activa","status":"verificado"},"metadataReading":"mutables","metadataLevel":"atención","holdersStatus":"no_disponible","holdersNote":"Sin respuesta utilizable. No se interpreta como autoridad revocada, como inmutabilidad ni como cantidad cero.","impersonation":false,"authenticityLevel":"ok","signals":[],"statement":"Este mint no está en el registro curado. Que no esté no significa que sea falso ni que sea una copia.","statementStatus":"verificado","curvePresent":false,"curvePresentStatus":"verificado","curveProgress":null,"curveProgressStatus":"no_aplica","curveProgressNote":"No hay curva. No se rellena con cero.","curveModuleNote":"No hay cuenta en la PDA. El módulo de otros mercados no está en esta versión. La ausencia no se rellena con una cantidad de cero.","rulesVersion":"0.1.0","statement_en":"This mint is not in the curated registry. That does not mean it is fake or a copy.","holdersNote_en":"No usable response. It is not interpreted as a revoked authority, as immutability, or as a zero balance.","curveProgressNote_en":"There is no curve. It is not filled with zero.","curveModuleNote_en":null,"signals_en":[]}},"glossary":[{"id":"direccion","term":{"es":"Dirección del mint","en":"Mint address"},"means":{"es":"Es la dirección de la cuenta del token. Identifica ese mint en la red de la ficha. El nombre y el símbolo son textos aparte.","en":"It is the address of the token’s mint account. It identifies that mint on the network named in the card. The name and the symbol are separate text."},"example":{"es":"En las fichas del 2026-10-16, EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v (USDC) y 5vJmAfBjsS6wEHcgQGNm69P3fbyPmUU1dVfE5j1rraVZ son direcciones distintas aunque las dos se llamen «USD Coin».","en":"On the 2026-10-16 cards, EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v (USDC) and 5vJmAfBjsS6wEHcgQGNm69P3fbyPmUU1dVfE5j1rraVZ are different addresses even though both are named “USD Coin”."},"doesNotConclude":{"es":"No dice quién es una persona, ni si conviene hacer nada con el token. Dos nombres iguales no son la misma dirección.","en":"It does not name a person, and it does not say that any action with the token is advisable. Two equal names are not the same address."}},{"id":"registro","term":{"es":"Registro curado","en":"Curated registry"},"means":{"es":"Lista local que Verify compara con el mint, el nombre, el símbolo, la imagen y algunos enlaces. En los ejemplos incluye USDC. ORVUPI aún no tiene contrato y no está. Que un mint no esté no significa que sea falso.","en":"A local list Verify compares with the mint, name, symbol, image, and some links. In the examples it includes USDC. ORVUPI does not have a contract yet and is not on it. A mint that is not on the list is not necessarily fake."},"example":{"es":"USDT, en la ficha del 2026-10-16, no está en el registro. La propia ficha dice que eso no significa que sea falso ni una copia.","en":"USDT, on the 2026-10-16 card, is not in the registry. The card itself says that does not mean it is false or a copy."},"doesNotConclude":{"es":"Estar en el registro no es una auditoría ni una garantía. No estar tampoco es una acusación.","en":"Being in the registry is not an audit or a guarantee. Being absent is not an accusation either."}},{"id":"autoridad-emision","term":{"es":"Autoridad de emisión","en":"Mint authority"},"means":{"es":"Permiso para aumentar el suministro de ese mint. Si la ficha dice revocada y el campo se leyó en la cadena, la opción leída está en 0. Si dice activa, el permiso sigue asignado a una dirección.","en":"Permission to increase the supply of that mint. If the card says revoked and the field was read on-chain, the field that was read is empty (no authority set). If it says active, the permission is still assigned to an address."},"example":{"es":"En la tanda del 2026-10-16, las tres copias «USD Coin» la tienen revocada. USDC y USDT la tienen activa.","en":"In the 2026-10-16 batch, the three “USD Coin” copies have it revoked. USDC and USDT have it active."},"doesNotConclude":{"es":"Revocada no identifica el mint, no demuestra que el proyecto sea legítimo y no dice nada de la demanda ni de la liquidez. Un campo no disponible no se rellena como revocada.","en":"Revoked does not identify the mint, does not show that the project is legitimate, and says nothing about demand or liquidity. An unavailable field is not filled in as revoked."}},{"id":"autoridad-congelacion","term":{"es":"Autoridad de congelación","en":"Freeze authority"},"means":{"es":"Permiso para congelar cuentas de ese token. Revocada quita ese permiso concreto en la lectura. Activa significa que sigue asignado.","en":"Permission to freeze accounts of that token. “Revoked” means that specific permission was removed at the time of reading. Active means it is still assigned."},"example":{"es":"En la misma tanda, el mint del registro la tiene revocada y USDC la tiene activa, asignada a una dirección que la ficha muestra.","en":"In the same batch, the registry mint has it revoked and USDC has it active, assigned to an address the card shows."},"doesNotConclude":{"es":"No es una garantía ni una prueba de identidad. Que no haya este permiso no impide otras limitaciones del token.","en":"It is not a guarantee or proof of identity. The absence of this permission does not rule out other restrictions on the token."}},{"id":"metadatos-mutables","term":{"es":"Metadatos mutables","en":"Mutable metadata"},"means":{"es":"Si hay una autoridad de actualización o is_mutable es verdadero, el nombre, el símbolo o la imagen pueden cambiar. «No mutables en las fuentes leídas» describe esas fuentes en esa fecha.","en":"If there is an update authority or is_mutable is true, the name, symbol, or image can change. “Not mutable in the sources read” describes those sources on that date."},"example":{"es":"El 2026-10-16, la copia 5vJmAfBjsS6wEHcgQGNm69P3fbyPmUU1dVfE5j1rraVZ queda como no mutable en las fuentes leídas. USDC tiene is_mutable verdadero en Metaplex.","en":"On 2026-10-16, the 5vJmAfBjsS6wEHcgQGNm69P3fbyPmUU1dVfE5j1rraVZ copy is recorded as not mutable in the sources read. USDC has is_mutable true in Metaplex."},"doesNotConclude":{"es":"Que no se puedan cambiar en esa lectura no demuestra legitimidad. Que se puedan cambiar no es, por sí solo, una suplantación.","en":"That they cannot be changed in that reading does not show legitimacy. That they can be changed is not, by itself, impersonation."}},{"id":"desconocido","term":{"es":"Desconocido y no disponible","en":"Unknown and unavailable"},"means":{"es":"No disponible significa que esa llamada no dejó un dato utilizable. Desconocido es lo que no se leyó. Ninguno de los dos es un valor comprobado.","en":"Unavailable means that call did not leave a usable fact. Unknown is what was not read. Neither one is a value read on-chain."},"example":{"es":"En las cinco fichas del 2026-10-16, getTokenLargestAccounts respondió HTTP 429. La muestra de cuentas con tokens queda en no disponible. No es concentración cero.","en":"On all five cards from 2026-10-16, getTokenLargestAccounts returned HTTP 429. The token account sample stays unavailable. It is not zero concentration."},"doesNotConclude":{"es":"No se convierte en cero, en autoridad revocada ni en metadatos inmutables. Una ficha parcial tampoco anula los campos que sí se leyeron en la cadena.","en":"It does not become zero, a revoked authority, or immutable metadata. A partial card also does not cancel the fields that were read on-chain."}},{"id":"curva-pump","term":{"es":"Curva de Pump.fun","en":"Pump.fun curve"},"means":{"es":"Si la cuenta derivada es del programa de la curva, Verify lee sus campos públicos. El avance clásico es un cálculo inferido, no un campo de la cuenta. Si no hay curva, no se rellenan con cero las cantidades de la curva (Pump.fun lo llama ‘reserves’).","en":"If the derived account belongs to the curve program, Verify reads its public fields. Classic progress is an inferred calculation, not a field of the account. If there is no curve, the curve amounts (Pump.fun calls these ‘reserves’) are not filled in with zero."},"example":{"es":"Ninguna ficha del 2026-10-16 es una curva de Pump.fun: en USDC, USDT y las copias el avance queda en no aplica. En un token que sí esté en la curva, el avance se infiere de la cantidad real que queda.","en":"None of the 2026-10-16 cards is a Pump.fun curve: on USDC, USDT, and the copies, progress stays not applicable. On a token that is on the curve, progress is inferred from the real amount left."},"doesNotConclude":{"es":"El avance no dice qué hacer. 0,00 inferido no significa que faltara la cuenta. Esta misión no simula un intercambio.","en":"Progress does not say what to do. Inferred 0.00 does not mean the account was missing. This mission does not simulate a swap."}},{"id":"reserva-real","term":{"es":"Cantidad real de la curva","en":"Real curve amount"},"means":{"es":"Campo real_token_reserves o real_quote_reserves de la cuenta de la curva, en unidades mínimas. Es distinto de la cantidad virtual de la curva.","en":"The real_token_reserves or real_quote_reserves field of the curve account, in base units. It is different from the virtual curve amount."},"example":{"es":"En la curva clásica, la cantidad real inicial documentada es 793100000000000. Si una ficha lee exactamente esa cifra, el avance inferido es 0,00: no se ha vendido nada de la curva.","en":"On the classic curve, the documented initial real amount is 793100000000000. If a card reads exactly that figure, inferred progress is 0.00: nothing has been sold from the curve."},"doesNotConclude":{"es":"No es una auditoría de fondos ni un saldo que esta página calcule como retirable. Si el campo no está, no se inventa un cero.","en":"It is not an audit of funds, and this page does not compute it as a withdrawable balance. If the field is absent, a zero is not invented."}},{"id":"reserva-virtual","term":{"es":"Cantidad virtual de la curva","en":"Virtual curve amount"},"means":{"es":"Campo virtual_token_reserves o virtual_quote_reserves. La ficha lo separa de la cantidad real de la curva. En la curva clásica, y con la quote por defecto, la cantidad quote va en lamports.","en":"The virtual_token_reserves or virtual_quote_reserves field. The card keeps it apart from the real curve amount. On the classic curve, and with the default quote, the quote amount is in lamports."},"example":{"es":"En una ficha de un token en la curva, la cantidad virtual y la cantidad real de tokens salen como números distintos, cada una con su estado. La virtual sirve para el precio; no se puede retirar.","en":"On a card for a token on the curve, the virtual and the real amounts of tokens appear as different numbers, each with its own status. The virtual one is used for the price; it cannot be withdrawn."},"doesNotConclude":{"es":"La cantidad virtual de la curva no es una cantidad retirable. Sumarla con la real no crea una única cantidad disponible.","en":"The virtual curve amount is not the withdrawable balance. Adding it to the real curve amount does not create one available pool."}},{"id":"suplantacion","term":{"es":"Posible suplantación","en":"Possible impersonation"},"means":{"es":"Señal de Verify: el nombre, el símbolo, la imagen o un enlace coinciden con el registro curado y el mint es otro. La coincidencia no atribuye intención.","en":"A Verify signal: the name, symbol, image, or a link matches the curated registry and the mint is a different one. The match does not attribute intent."},"example":{"es":"Las fichas de 4XRbnGgay2XpqJ1F5jGPQ9pRh1JSX12RPCPJASMJU5JW, 5vJmAfBjsS6wEHcgQGNm69P3fbyPmUU1dVfE5j1rraVZ y H5b7sHTqr7WJqL9X4io8VeTBfePSyv85wEBnKNaZKV9R, del 2026-10-16, llevan esa señal: se llaman «USD Coin» y no son el mint de USDC. USDC y USDT no.","en":"The 2026-10-16 cards for 4XRbnGgay2XpqJ1F5jGPQ9pRh1JSX12RPCPJASMJU5JW, 5vJmAfBjsS6wEHcgQGNm69P3fbyPmUU1dVfE5j1rraVZ, and H5b7sHTqr7WJqL9X4io8VeTBfePSyv85wEBnKNaZKV9R carry that signal: they are named “USD Coin” and are not the USDC mint. USDC and USDT do not."},"doesNotConclude":{"es":"No es una sentencia ni una prueba de lo que alguien quiso hacer. Un nombre parecido, por sí solo, tampoco sustituye a leer la dirección.","en":"It is not a verdict or proof of what someone meant to do. A similar name, by itself, also does not replace reading the address."}},{"id":"titular","term":{"es":"Titular y persona","en":"Account owner and person"},"means":{"es":"Una dirección guardada en una cuenta, como el creator de la curva, es un campo público. No identifica a una persona ni a un titular jurídico.","en":"An address stored on an account, such as the curve creator, is a public field. It does not identify a person or a legal owner."},"example":{"es":"La ficha del mint del registro anota el creator de la curva y dice que esa pubkey no identifica a una persona.","en":"The registry mint card records the curve creator and says that pubkey does not identify a person."},"doesNotConclude":{"es":"No se puede pasar de una dirección a un nombre de persona con esta misión. No pide datos personales.","en":"This mission cannot turn an address into a person's name. It does not ask for personal data."}},{"id":"holder","term":{"es":"‘Holder’ (término del sector)","en":"‘Holder’ (industry term)"},"means":{"es":"‘Holder’ (término del sector): cuenta que tiene tokens. No implica derechos ni comunidad de inversores.","en":"‘Holder’ (industry term): an account that holds tokens. It implies no rights and no investor community."},"example":{"es":"Cuenta que tiene tokens.","en":"An account that holds tokens."},"doesNotConclude":{"es":"No implica derechos ni comunidad de inversores.","en":"It implies no rights and no investor community."}},{"id":"ficha","term":{"es":"Ficha","en":"Card"},"means":{"es":"Una ficha es la lectura fechada de una dirección. No se actualiza sola y no es una auditoría.","en":"A card is the dated reading of an address. It does not update itself and it is not an audit."},"example":{"es":"Las fichas de esta misión llevan fecha 2026-10-16.","en":"The cards in this mission are dated 2026-10-16."},"doesNotConclude":{"es":"Una ficha no dice qué hacer con el token ni quién es una persona.","en":"A card does not say what to do with the token or who a person is."}},{"id":"censo","term":{"es":"Censo","en":"Census"},"means":{"es":"Un censo sería la lista de todas las cuentas. Estas fichas no lo son: leen algunas cuentas y no rellenan el resto con un cero.","en":"A census would be the list of every account. These cards are not that: they read some accounts and do not fill the rest in with a zero."},"example":{"es":"Ninguna ficha del 2026-10-16 trae la muestra de cuentas: el servicio respondió HTTP 429. Aunque la trajera, serían como mucho 20 cuentas: no es un censo.","en":"No 2026-10-16 card has the account sample: the service returned HTTP 429. Even if it had, it would be at most 20 accounts: it is not a census."},"doesNotConclude":{"es":"Que no sea un censo no convierte el dato que falta en un cero.","en":"Not being a census does not turn the missing fact into a zero."}},{"id":"comision","term":{"es":"Comisión","en":"Fee"},"means":{"es":"Regla de un conector sobre un intercambio. Esta misión no calcula comisiones ni intercambios.","en":"A fee rule set by a connector (for example a DEX or an aggregator) on a swap. This mission does not calculate fees or swaps."},"example":{"es":"Las fichas usadas aquí leen campos públicos de la curva. No incluyen un cálculo de comisión, y esta página no lo añade.","en":"The cards used here read public curve fields. They do not include a fee calculation, and this page does not add one."},"doesNotConclude":{"es":"Una comisión no identifica el mint, no convierte la cantidad virtual de la curva en un saldo retirable y no es un resultado prometido.","en":"A fee does not identify the mint, does not turn the virtual curve amount into a withdrawable balance, and is not a promised result."}},{"id":"moneda-estable","term":{"es":"Moneda estable","en":"Stablecoin"},"means":{"es":"Un token pensado para seguir una moneda de curso. En estas fichas, USDC y USDT son los ejemplos.","en":"A token meant to follow a currency. On these cards, USDC and USDT are the examples."},"example":{"es":"El 2026-10-16, USDC tiene la emisión y la congelación activas. La copia 5vJm… que se llama «USD Coin» las tiene cerradas. El mismo permiso no se lee igual en los dos.","en":"On 2026-10-16, USDC has mint and freeze permissions active. The 5vJm… copy named “USD Coin” has them closed. The same permission is not read the same way on both."},"doesNotConclude":{"es":"No dice qué hacer con el token. Un permiso activo en USDC no es una acusación, y uno cerrado en una copia no es una garantía.","en":"It does not say what to do with the token. An active permission on USDC is not an accusation, and a closed one on a copy is not a guarantee."}},{"id":"cuenta-tecnica","term":{"es":"Cuenta técnica y pool","en":"Technical account and pool"},"means":{"es":"Una cuenta técnica es la de un programa, como la curva. Un pool es la cuenta donde un programa de intercambio guarda tokens. Ninguna de las dos es la cuenta de una persona.","en":"A technical account belongs to a program, such as the curve. A pool is the account where an exchange program holds tokens. Neither one is a person's account."},"example":{"es":"En un token que aún está en una curva de lanzamiento, la cuenta con más tokens suele ser la de la curva: es del programa, no de una persona. Si la curva se completó, el saldo grande puede estar en un pool.","en":"On a token that is still on a launch curve, the account with the most tokens is usually the curve account: it belongs to the program, not a person. If the curve was completed, the large balance may be in a pool."},"doesNotConclude":{"es":"Un saldo alto no convierte esa cuenta en una persona. Que no sea un pool no dice qué hacer con el token.","en":"A large balance does not turn that account into a person. Not being a pool does not say what to do with the token."}},{"id":"consulta-fallida","term":{"es":"Consulta fallida","en":"Failed query"},"means":{"es":"Se pidió el dato y el servicio no dejó una respuesta usable. No es un cero y no es una ausencia.","en":"The fact was asked for and the service left no usable answer. It is not a zero and it is not an absence."},"example":{"es":"USDC, el 2026-10-16, pidió getTokenLargestAccounts y recibió HTTP 429. La muestra queda no disponible.","en":"USDC, on 2026-10-16, asked for getTokenLargestAccounts and got HTTP 429. The sample stays unavailable."},"doesNotConclude":{"es":"No se rellena con cero ni se dice que no existan cuentas.","en":"It is not filled in with zero, and it does not say that accounts do not exist."}},{"id":"ausente-comprobado","term":{"es":"Ausente comprobado","en":"Confirmed absent"},"means":{"es":"Se pidió el dato, la respuesta llegó y el dato no está. No es un fallo del servicio.","en":"The fact was asked for, the answer arrived, and the fact is not there. It is not a service failure."},"example":{"es":"En USDC, el 2026-10-16, la cuenta de metadatos se consultó. La consulta respondió y el enlace (URI) está vacío: ese dato no está.","en":"On USDC, on 2026-10-16, the metadata account was queried. The query was answered and the link (URI) is empty: that fact is not there."},"doesNotConclude":{"es":"No es un HTTP 429 ni un dato que esta lectura olvidó pedir.","en":"It is not an HTTP 429, and it is not a fact this reading forgot to ask for."}},{"id":"no-consultado","term":{"es":"No consultado","en":"Not queried"},"means":{"es":"Esta lectura no pidió ese dato. No es un fallo ni una ausencia.","en":"This reading did not ask for that fact. It is not a failure and it is not an absence."},"example":{"es":"La ficha de USDC del 2026-10-16 no tiene URI, así que no pide el JSON de metadatos. El nombre del JSON queda en «no aplica».","en":"The USDC card from 2026-10-16 has no URI, so it does not ask for the metadata JSON. The JSON name stays “not applicable”."},"doesNotConclude":{"es":"No se convierte en cero ni en la consulta fallida de otra ficha.","en":"It does not become zero, and it does not become the failed query on another card."}}],"cardDate":"2026-10-16"};
const STORAGE_KEY = "stubx-lab-mision-01";
function lessonStorageKey(id) {
    if (id === "mision-01")
        return STORAGE_KEY;
    return `stubx-lab-${id}`;
}
const LANG_KEY = "stubx-lab-lang";
const PROGRESS_ECONOMIC_VALUE = 0;
const PROGRESS_IS_CERTIFICATE = false;
function record(value) {
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
        return value;
    }
    return null;
}
function initialProgress(mission, lang) {
    return {
        version: 1,
        missionId: mission.id,
        missionVersion: mission.version,
        lang,
        solved: [],
        attempts: {},
        completed: false,
    };
}
function resetProgress(mission, lang) {
    return initialProgress(mission, lang);
}
function withLang(progress, lang) {
    return { ...progress, lang };
}
function currentStep(mission, progress) {
    for (const step of mission.steps) {
        if (!progress.solved.includes(step.id)) {
            return step;
        }
    }
    return null;
}
function checkCount(mission) {
    return mission.steps.filter((step) => step.kind === "check").length;
}
function parseProgress(raw, mission) {
    const row = record(raw);
    if (!row) {
        return null;
    }
    if (row.version !== 1 || row.missionId !== mission.id || row.missionVersion !== mission.version) {
        return null;
    }
    if (row.lang !== "es" && row.lang !== "en") {
        return null;
    }
    if (!Array.isArray(row.solved) || typeof row.completed !== "boolean") {
        return null;
    }
    const ids = mission.steps.map((step) => step.id);
    const solved = [];
    for (let i = 0; i < row.solved.length; i += 1) {
        if (row.solved[i] !== ids[i]) {
            return null;
        }
        const id = ids[i];
        if (!id) {
            return null;
        }
        solved.push(id);
    }
    if (row.completed !== (solved.length === mission.steps.length)) {
        return null;
    }
    const attemptsRaw = record(row.attempts);
    if (!attemptsRaw) {
        return null;
    }
    const attempts = {};
    for (const [key, value] of Object.entries(attemptsRaw)) {
        if (!ids.includes(key)) {
            return null;
        }
        if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
            return null;
        }
        attempts[key] = value;
    }
    return {
        version: 1,
        missionId: mission.id,
        missionVersion: mission.version,
        lang: row.lang,
        solved,
        attempts,
        completed: row.completed,
    };
}
function answer(mission, progress, stepId, optionId) {
    if (progress.completed) {
        return { applied: false, code: "ya_completa", correct: false, explanation: null, progress };
    }
    const step = currentStep(mission, progress);
    if (!step || step.id !== stepId) {
        return { applied: false, code: "paso_no_actual", correct: false, explanation: null, progress };
    }
    const option = step.options.find((item) => item.id === optionId);
    if (!option) {
        return { applied: false, code: "opcion_desconocida", correct: false, explanation: null, progress };
    }
    if (optionId === step.correct) {
        const solved = [...progress.solved, step.id];
        const completed = solved.length === mission.steps.length;
        const explanation = step.whyRight;
        return {
            applied: true,
            code: "correcto",
            correct: true,
            explanation,
            progress: { ...progress, solved, completed },
        };
    }
    const explanation = step.whyWrong[optionId];
    if (!explanation) {
        return { applied: false, code: "opcion_desconocida", correct: false, explanation: null, progress };
    }
    const prev = progress.attempts[step.id] ?? 0;
    return {
        applied: true,
        code: "incorrecto",
        correct: false,
        explanation,
        progress: {
            ...progress,
            attempts: { ...progress.attempts, [step.id]: prev + 1 },
        },
    };
}
function findEntry(id) {
  var entries = STUBX_LAB.glossary;
  for (var i = 0; i < entries.length; i += 1) {
    if (entries[i].id === id) return entries[i];
  }
  return null;
}

function textOf(value, lang) {
  if (!value) return lang === "en" ? "unknown" : "desconocido";
  return value[lang] || value.es;
}

var STATUS_LABEL = {
  verificado: { es: "leído en la cadena", en: "read on-chain" },
  inferido: { es: "inferido", en: "inferred" },
  no_disponible: { es: "no disponible", en: "unavailable" },
  no_aplica: { es: "no aplica", en: "not applicable" },
  desconocido: { es: "desconocido", en: "unknown" },
};

var FIELD_LABEL = {
  name: { es: "Nombre on-chain", en: "On-chain name" },
  mint: { es: "Dirección del mint", en: "Mint address" },
  inRegistry: { es: "En el registro curado", en: "In the curated registry" },
  statement: { es: "Lectura de autenticidad", en: "Authenticity statement" },
  mintAuthority: { es: "Autoridad de emisión", en: "Mint authority" },
  freezeAuthority: { es: "Autoridad de congelación", en: "Freeze authority" },
  metadata: { es: "Metadatos", en: "Metadata" },
  holders: { es: "Muestra de cuentas con el token", en: "Token account sample" },
  impersonation: { es: "Señal de suplantación", en: "Impersonation signal" },
  curvePresent: { es: "Cuenta de curva", en: "Curve account" },
  curveProgress: { es: "Avance de la curva clásica", en: "Classic curve progress" },
};

var META_LABEL = {
  no_mutables_en_fuentes: { es: "No mutables en las fuentes leídas", en: "Not mutable in the sources read" },
  mutables: { es: "Mutables", en: "Mutable" },
  desconocido: { es: "Desconocido", en: "Unknown" },
};

function statusLabel(status, lang) {
  return textOf(STATUS_LABEL[status] || STATUS_LABEL.desconocido, lang);
}

function factText(status, value, lang) {
  if (status !== "verificado" && status !== "inferido") return statusLabel(status, lang);
  if (!value) return statusLabel(status, lang);
  return value + " · " + statusLabel(status, lang);
}

function yesNo(value, lang) {
  if (lang === "en") return value ? "yes" : "no";
  return value ? "sí" : "no";
}

function authorityWord(state, lang) {
  if (lang !== "en") return state;
  if (state === "revocada") return "revoked";
  if (state === "activa") return "active";
  return state;
}

function noteFor(card, key, lang) {
  if (lang === "en" && card[key + "_en"]) return card[key + "_en"];
  return card[key];
}

function fieldText(card, key, lang) {
  if (key === "name") return { value: factText(card.nameStatus, card.name, lang), note: null };
  if (key === "mint") return { value: card.mint, note: null };
  if (key === "inRegistry") {
    var registry = card.inRegistry === null ? null : yesNo(card.inRegistry, lang);
    return { value: factText(card.inRegistryStatus, registry, lang), note: null };
  }
  if (key === "statement") {
    var statement = lang === "en" && card.statement_en ? card.statement_en : card.statement;
    return { value: factText(card.statementStatus, statement, lang), note: null };
  }
  if (key === "mintAuthority") return { value: factText(card.mintAuthority.status, authorityWord(card.mintAuthority.state, lang), lang), note: null };
  if (key === "freezeAuthority") return { value: factText(card.freezeAuthority.status, authorityWord(card.freezeAuthority.state, lang), lang), note: null };
  if (key === "metadata") return { value: textOf(META_LABEL[card.metadataReading], lang), note: null };
  if (key === "holders") return { value: factText(card.holdersStatus, null, lang), note: noteFor(card, "holdersNote", lang) };
  if (key === "impersonation") {
    if (card.impersonation === null) return { value: statusLabel("desconocido", lang), note: null };
    var level = levelWord(card.authenticityLevel, lang);
    if (card.impersonation) {
      var copyLabel = lang === "en" ? "Possible impersonation" : "Posible suplantación";
      return { value: copyLabel + (level ? " · " + level : ""), note: null };
    }
    if (card.inRegistry === true) {
      var registryLabel = lang === "en" ? "In the registry" : "En el registro";
      return { value: registryLabel + (level ? " · " + level : ""), note: null };
    }
    return { value: lang === "en" ? "No such signal" : "Sin esa señal", note: null };
  }
  if (key === "curvePresent") {
    var present = card.curvePresent === null ? null : yesNo(card.curvePresent, lang);
    return { value: factText(card.curvePresentStatus, present, lang), note: noteFor(card, "curveModuleNote", lang) };
  }
  if (key === "curveProgress") {
    var progress = card.curveProgress ? (lang === "en" ? card.curveProgress + "%" : card.curveProgress + " %") : null;
    return { value: factText(card.curveProgressStatus, progress, lang), note: noteFor(card, "curveProgressNote", lang) };
  }
  return { value: statusLabel("desconocido", lang), note: null };
}

function levelWord(level, lang) {
  if (level === "atención") return lang === "en" ? "attention" : "atención";
  if (level === "riesgo") return lang === "en" ? "risk" : "riesgo";
  if (level === "ok") return "ok";
  return level || "";
}

function el(tag, attrs) {
  var node = document.createElement(tag);
  if (!attrs) return node;
  Object.keys(attrs).forEach(function (key) {
    if (attrs[key] != null) node.setAttribute(key, String(attrs[key]));
  });
  return node;
}

var REGISTRY_MARK = {
  es: "(publicada en el registro oficial)",
  en: "(listed in the official registry)",
};

function fillLinked(node, text) {
  var marker = text.indexOf(REGISTRY_MARK.en) !== -1 ? REGISTRY_MARK.en : REGISTRY_MARK.es;
  if (text.indexOf(marker) === -1) {
    node.textContent = text;
    return;
  }
  node.replaceChildren();
  text.split(marker).forEach(function (chunk, index, chunks) {
    if (chunk) node.append(document.createTextNode(chunk));
    if (index < chunks.length - 1) {
      var anchor = el("a", { href: "/security/" });
      anchor.textContent = marker;
      node.append(anchor);
    }
  });
}

function entenderItems(mission) {
  var ids = mission.entender;
  if (!ids || !ids.length) return [];
  var catalog = STUBX_LAB.entender || [];
  var items = [];
  ids.forEach(function (id) {
    for (var i = 0; i < catalog.length; i += 1) {
      if (catalog[i].id === id) items.push(catalog[i]);
    }
  });
  return items;
}

function entenderGuide(item, lang) {
  var paragraph = el("p");
  paragraph.dataset.tema = item.id;
  paragraph.textContent = (item.explain && item.explain[lang]) || "";
  var guide = el("a", { href: item.href });
  guide.dataset.guia = item.href;
  guide.textContent = item[lang] || item.es;
  return { paragraph: paragraph, guide: guide };
}

function entenderNav(mission, lang) {
  var items = entenderItems(mission);
  if (!items.length) return null;
  var nav = el("nav", { class: "entender-resultado" });
  var titleText = lang === "en" ? "Understand this result" : "Entender este resultado";
  nav.setAttribute("aria-label", titleText);
  if (items.length === 1) {
    var only = entenderGuide(items[0], lang);
    var link = el("a", { class: "abrir-entender", href: items[0].href });
    link.textContent = titleText;
    nav.append(link, only.paragraph);
    return nav;
  }
  var panel = el("div", { class: "explicacion-resultado" });
  panel.hidden = true;
  panel.tabIndex = -1;
  items.forEach(function (item) {
    var parts = entenderGuide(item, lang);
    panel.append(parts.paragraph, parts.guide);
  });
  var button = el("button", { type: "button", class: "abrir-entender" });
  button.textContent = titleText;
  button.setAttribute("aria-expanded", "false");
  button.addEventListener("click", function () {
    panel.hidden = false;
    button.setAttribute("aria-expanded", "true");
    panel.focus();
  });
  nav.append(button, panel);
  return nav;
}

function bootLab() {
  var missionRoot = document.getElementById("mision-app");
  if (missionRoot && STUBX_LAB.mission) mountQuiz(missionRoot, STUBX_LAB.mission, STORAGE_KEY);
  var lessons = STUBX_LAB.lessons || [];
  for (var n = 0; n < lessons.length; n += 1) {
    var lesson = lessons[n];
    var node = document.querySelector('[data-leccion="' + lesson.id + '"]');
    if (node) mountQuiz(node, lesson, lessonStorageKey(lesson.id));
  }
}

function mountQuiz(root, mission, storageKey) {
  var lang = document.documentElement.getAttribute("data-lang") === "en" ? "en" : "es";
  var stored = null;
  try {
    stored = JSON.parse(localStorage.getItem(storageKey) || "null");
  } catch (error) {
    stored = null;
  }
  var progress = parseProgress(stored, mission) || initialProgress(mission, lang);
  progress = withLang(progress, lang);
  var banner = null;
  var focusBanner = false;
  var focusStep = false;
  var saveError = false;
  var reviewId = null;

  function liveStep() {
    return currentStep(mission, progress);
  }

  function save() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(progress));
      saveError = false;
    } catch (error) {
      saveError = true;
    }
  }

  function openHelp(id) {
    var entry = findEntry(id);
    var dialog = document.getElementById("ayuda");
    var anchor = document.getElementById("termino-" + id);
    if (!entry || !dialog || typeof dialog.showModal !== "function") {
      if (anchor) anchor.scrollIntoView();
      return;
    }
    var title = document.getElementById("ayuda-titulo");
    var body = document.getElementById("ayuda-cuerpo");
    var closeBtn = document.getElementById("ayuda-cerrar");
    if (!title || !body) return;
    title.textContent = entry.term[lang];
    body.replaceChildren();
    ["means", "example", "doesNotConclude"].forEach(function (key) {
      var paragraph = el("p");
      paragraph.textContent = entry[key][lang];
      body.append(paragraph);
    });
    var stay = el("p");
    stay.textContent = lang === "en"
      ? "Opening help does not change local progress."
      : "Abrir la ayuda no cambia el progreso local.";
    body.append(stay);
    var more = el("p");
    var link = el("a", { href: "/aprender/?from=lab#" + id });
    link.textContent = lang === "en"
      ? "Open this term in the library. Lab progress stays in this browser."
      : "Abrir este término en la biblioteca. El progreso de Lab se queda en este navegador.";
    more.append(link);
    body.append(more);
    if (closeBtn) closeBtn.textContent = lang === "en" ? "Close" : "Cerrar";
    dialog.returnFocus = document.activeElement;
    dialog.showModal();
  }

  var dialogNode = document.getElementById("ayuda");
  if (dialogNode) {
    dialogNode.addEventListener("close", function () {
      var back = dialogNode.returnFocus;
      if (back && back.focus) back.focus();
    });
  }

  function cardNode(card, fields) {
    var article = el("article", { class: "ficha" });
    var heading = el("h3");
    heading.textContent = card.name || card.mint;
    var role = el("p", { class: "rol" });
    role.textContent = card.roleNote[lang];
    var mint = el("p");
    var code = el("code", { class: "mint" });
    code.textContent = card.mint;
    mint.append(code);
    var list = el("dl");
    fields.forEach(function (key) {
      var item = fieldText(card, key, lang);
      var term = el("dt");
      term.textContent = textOf(FIELD_LABEL[key], lang);
      var detail = el("dd");
      detail.textContent = item.value;
      if (item.note) {
        var note = el("p", { class: "muted" });
        note.textContent = item.note;
        detail.append(note);
      }
      list.append(term, detail);
    });
    article.append(heading, role, mint, list);
    return article;
  }

  function helpButtons(step) {
    if (!step.glossary.length) return null;
    var wrap = el("div", { class: "glosario-paso" });
    step.glossary.forEach(function (id) {
      var entry = findEntry(id);
      if (!entry) return;
      var button = el("button", { type: "button", class: "secondary" });
      button.textContent = lang === "en"
        ? "What does “" + entry.term[lang] + "” mean?"
        : "¿Qué significa «" + entry.term[lang] + "»?";
      button.addEventListener("click", function () { openHelp(id); });
      wrap.append(button);
    });
    return wrap;
  }

  function restartButton() {
    var button = el("button", { type: "button", class: "primary" });
    button.textContent = lang === "en" ? "Start again" : "Empezar de nuevo";
    button.addEventListener("click", function () {
      progress = resetProgress(mission, lang);
      banner = null;
      reviewId = null;
      focusStep = true;
      save();
      render();
    });
    return button;
  }

  function coverHeight() {
    var header = document.querySelector("header.site");
    if (!header) return 0;
    var pos = window.getComputedStyle(header).position;
    if (pos !== "fixed" && pos !== "sticky") return 0;
    return Math.ceil(header.getBoundingClientRect().height);
  }

  function resetButton() {
    var button = el("button", { type: "button", class: "secondary" });
    button.textContent = lang === "en" ? "Delete local progress" : "Borrar progreso local";
    button.addEventListener("click", function () {
      var question = mission.id.indexOf("leccion-") === 0
        ? (lang === "en"
          ? "Delete the local progress of this lesson in this browser?"
          : "¿Borrar el progreso local de esta lección en este navegador?")
        : (lang === "en"
          ? "Delete the local progress of this mission in this browser?"
          : "¿Borrar el progreso local de esta misión en este navegador?");
      if (!window.confirm(question)) return;
      progress = resetProgress(mission, lang);
      banner = null;
      reviewId = null;
      save();
      render();
    });
    return button;
  }

  function render() {
    root.replaceChildren();
    var understand = entenderNav(mission, lang);
    if (understand) root.append(understand);
    var total = mission.steps.length;
    var nav = el("ol", { class: "pasos" });
    mission.steps.forEach(function (step, index) {
      var item = el("li");
      var button = el("button", { type: "button", class: "secondary" });
      var solved = progress.solved.indexOf(step.id) !== -1;
      var active = liveStep();
      var isLive = Boolean(active && active.id === step.id);
      var showing = reviewId ? reviewId === step.id : isLive;
      var label = String(index + 1);
      button.textContent = label;
      if (!solved && !isLive) button.disabled = true;
      if (showing) button.setAttribute("aria-current", "step");
      button.addEventListener("click", function () {
        reviewId = solved && !isLive ? step.id : null;
        banner = null;
        render();
      });
      item.append(button);
      nav.append(item);
    });
    if (progress.completed) {
      var resultButton = el("button", { type: "button" });
      resultButton.textContent = lang === "en" ? "Result" : "Resultado";
      if (reviewId === null) resultButton.setAttribute("aria-current", "step");
      resultButton.addEventListener("click", function () {
        reviewId = null;
        banner = null;
        render();
      });
      var resultItem = el("li");
      resultItem.append(resultButton);
      nav.append(resultItem);
    }
    root.append(nav);

    if (saveError) {
      var warn = el("p", { class: "nota" });
      warn.textContent = lang === "en"
        ? "This browser did not store the progress. It will disappear when the page closes."
        : "Este navegador no guardó el progreso. Se pierde al cerrar la página.";
      root.append(warn);
    }

    if (banner) {
      var feedback = el("div", { class: banner.correct ? "feedback encaja" : "feedback no-encaja", role: "status", tabindex: "-1" });
      var feedbackTitle = el("h2");
      feedbackTitle.textContent = banner.correct
        ? (lang === "en" ? "That answer fits" : "Esa respuesta encaja")
        : (lang === "en" ? "That answer does not fit" : "Esa respuesta no encaja");
      var feedbackBody = el("p");
      fillLinked(feedbackBody, banner.explanation[lang]);
      var again = el("p");
      again.textContent = banner.correct
        ? (lang === "en" ? "When you have read it, press Next step. There is no score and no penalty." : "Cuando lo hayas leído, pulsa Siguiente paso. No hay puntuación ni penalización.")
        : (lang === "en" ? "You can choose another answer. There is no penalty." : "Puedes elegir otra respuesta. No hay penalización.");
      feedback.append(feedbackTitle, feedbackBody, again);
      if (banner.correct) {
        var next = el("button", { type: "button", class: "primary siguiente" });
        next.textContent = lang === "en" ? "Next step" : "Siguiente paso";
        next.addEventListener("click", function () {
          reviewId = null;
          banner = null;
          focusStep = true;
          render();
        });
        feedback.append(next);
      }
      root.append(feedback);
    }

    var showingResult = progress.completed && reviewId === null;
    if (showingResult) {
      var done = el("section");
      var doneTitle = el("h2");
      doneTitle.textContent = lang === "en" ? "Result" : "Resultado";
      done.append(doneTitle);
      mission.steps.forEach(function (step, index) {
        var block = el("article", { class: "ficha" });
        var name = el("h3");
        name.textContent = (step.kind === "check" ? (index + 1) + ". " : "") + step.prompt[lang];
        var line = el("p");
        fillLinked(line, step.whyRight[lang]);
        block.append(name, line);
        done.append(block);
      });
      var close = el("p");
      fillLinked(close, mission.closing[lang]);
      var dated = el("p");
      var cardDate = mission.cardDate || STUBX_LAB.cardDate;
      dated.textContent = lang === "en"
        ? "The cards are from " + cardDate + ". Unknown is not the same as checked."
        : "Las fichas son del " + cardDate + ". Lo desconocido no es lo mismo que lo comprobado.";
      done.setAttribute("data-live-step", "resultado");
      done.append(close, dated, restartButton(), resetButton());
      root.append(done);
    } else {
      var stepId = reviewId || (liveStep() ? liveStep().id : mission.steps[0].id);
      var step = null;
      for (var i = 0; i < mission.steps.length; i += 1) {
        if (mission.steps[i].id === stepId) step = mission.steps[i];
      }
      if (!step) return;
      var section = el("section", { "data-live-step": step.id });
      var heading = el("h2");
      var position = mission.steps.indexOf(step);
      heading.textContent = lang === "en"
        ? "Step " + (position + 1) + " of " + total
        : "Paso " + (position + 1) + " de " + total;
      var guide = el("p", { class: "apoyo" });
      guide.textContent = step.guide[lang];
      section.append(heading, guide);
      var words = helpButtons(step);
      if (words) section.append(words);
      if (step.cards.length > 0) {
        var fold = el("details", { class: "tecnico" });
        var summary = el("summary");
        summary.textContent = lang === "en" ? "Details" : "Detalles";
        fold.append(summary);
        step.cards.forEach(function (mint) {
          var card = STUBX_LAB.cards[mint];
          if (card) fold.append(cardNode(card, step.fields));
        });
        section.append(fold);
      }
      var prompt = el("h3");
      prompt.textContent = step.prompt[lang];
      section.append(prompt);
      var solved = progress.solved.indexOf(step.id) !== -1;
      var waiting = Boolean(banner && banner.correct && banner.stepId === step.id);
      if (solved && !waiting) {
        var lesson = el("p");
        fillLinked(lesson, step.whyRight[lang]);
        var locked = el("p", { class: "muted" });
        locked.textContent = lang === "en"
          ? "This check is already done. To try it again, delete the local progress."
          : "Esta comprobación ya está hecha. Para repetirla, borra el progreso local.";
        section.append(lesson, locked);
      } else if (!solved) {
        var options = el("div", { class: "opciones", role: "group" });
        var questionId = "pregunta-" + mission.id;
        options.setAttribute("aria-labelledby", questionId);
        prompt.id = questionId;
        step.options.forEach(function (option) {
          var button = el("button", { type: "button" });
          button.textContent = option.label[lang];
          button.addEventListener("click", function () {
            var grade = answer(mission, progress, step.id, option.id);
            if (!grade.applied) return;
            progress = grade.progress;
            banner = { correct: grade.correct, explanation: grade.explanation, stepId: step.id };
            focusBanner = true;
            if (grade.correct) reviewId = step.id;
            save();
            render();
          });
          options.append(button);
        });
        section.append(options);
      }
      section.append(resetButton());
      root.append(section);
    }

    if (focusBanner) {
      var region = root.querySelector(".feedback");
      if (region) {
        region.style.scrollMarginTop = coverHeight() + "px";
        region.scrollIntoView({ block: "start" });
        region.focus({ preventScroll: true });
      }
      focusBanner = false;
    }
    if (focusStep) {
      var live = root.querySelector("[data-live-step]");
      if (live) {
        live.style.scrollMarginTop = coverHeight() + "px";
        live.scrollIntoView({ block: "start" });
        var heading = live.querySelector("h2");
        if (heading) {
          heading.setAttribute("tabindex", "-1");
          heading.focus({ preventScroll: true });
        }
      }
      focusStep = false;
    }
  }

  document.addEventListener("stubx-lang", function (event) {
    lang = event.detail === "en" ? "en" : "es";
    progress = withLang(progress, lang);
    save();
    render();
  });

  save();
  render();
}
bootLab();
})();
