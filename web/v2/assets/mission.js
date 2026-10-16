"use strict";
(() => {
const STUBX_LAB = {"mission":{"id":"mision-01","version":"1.1.0","updated":"2026-10-09","cardDate":"2026-10-08","title":{"es":"Cómo detectar un token clon en 5 pasos","en":"How to spot a clone token in 5 steps"},"intro":{"es":"Cinco preguntas cortas con las fichas del 2026-10-08. Si no aciertas, puedes volver a intentar. El progreso se queda en este navegador.","en":"Five short questions using the 2026-10-08 cards. If you miss, you can try again. Progress stays in this browser."},"closing":{"es":"Has separado la dirección oficial, una copia y un dato que no se pudo leer. No es un certificado. No hace falta una cuenta ni tener TOKEN A para leerlo.","en":"You separated the official address, a copy, and a fact that could not be read. This is not a certificate. No account is required, and holding TOKEN A is not required to read it."},"steps":[{"id":"direccion","kind":"check","glossary":["direccion","registro"],"cards":["TNWwnzecb37272ZoySDE6D2UcmqNnU12EqtycNSpump","DjEjb6bxQ3Hjej9CzUAVeRqyt7k1tevHgcS37t41PUhQ","Hhq4ffySVX3UQqSowjhP1Lwa8YuJDf7iH2hYWvVHTuEf"],"fields":["name","mint","inRegistry"],"prompt":{"es":"¿Cuál es la dirección del TOKEN A oficial?","en":"Which address is the official TOKEN A?"},"guide":{"es":"La dirección del mint identifica ese token. El nombre se puede copiar; la dirección, no.","en":"The mint address identifies that token. A name can be copied; the address cannot."},"options":[{"id":"oficial","label":{"es":"TNWwnzecb37272ZoySDE6D2UcmqNnU12EqtycNSpump","en":"TNWwnzecb37272ZoySDE6D2UcmqNnU12EqtycNSpump"},"mint":"TNWwnzecb37272ZoySDE6D2UcmqNnU12EqtycNSpump"},{"id":"clon-dj","label":{"es":"DjEjb6bxQ3Hjej9CzUAVeRqyt7k1tevHgcS37t41PUhQ","en":"DjEjb6bxQ3Hjej9CzUAVeRqyt7k1tevHgcS37t41PUhQ"},"mint":"DjEjb6bxQ3Hjej9CzUAVeRqyt7k1tevHgcS37t41PUhQ"},{"id":"clon-hh","label":{"es":"Hhq4ffySVX3UQqSowjhP1Lwa8YuJDf7iH2hYWvVHTuEf","en":"Hhq4ffySVX3UQqSowjhP1Lwa8YuJDf7iH2hYWvVHTuEf"},"mint":"Hhq4ffySVX3UQqSowjhP1Lwa8YuJDf7iH2hYWvVHTuEf"}],"correct":"oficial","whyRight":{"es":"Solo esta dirección está en el registro del 2026-10-08. Las otras se llaman parecido y la ficha indica que se parecen a TOKEN A pero no son la CA oficial. Eso no dice quién las creó ni con qué intención.","en":"Only this address is in the 2026-10-08 registry. The others have a similar name and the card indicates that they look like TOKEN A but they are not the official CA. That does not say who created them or why."},"whyWrong":{"clon-dj":{"es":"Se llama Comunidad TOKEN A, pero no está en el registro. El nombre no sustituye a la dirección.","en":"It is named Comunidad TOKEN A, but it is not in the registry. The name does not stand in for the address."},"clon-hh":{"es":"Se llama Comunidad TOKEN A · Creador. El nombre coincide y la dirección es otra.","en":"It is named Comunidad TOKEN A · Creador. The name matches and the address is different."}}},{"id":"emision","kind":"check","glossary":["autoridad-emision","autoridad-congelacion"],"cards":["DjEjb6bxQ3Hjej9CzUAVeRqyt7k1tevHgcS37t41PUhQ","TNWwnzecb37272ZoySDE6D2UcmqNnU12EqtycNSpump"],"fields":["name","mint","mintAuthority","freezeAuthority"],"prompt":{"es":"Las dos fichas tienen el permiso cerrado. ¿Qué es cierto?","en":"Both cards show a closed permission. What is true?"},"guide":{"es":"Permiso cerrado = nadie puede crear más monedas de ese token. Las copias también pueden tenerlo.","en":"Closed permission = nobody can create more coins of that token. Copies can have it too."},"options":[{"id":"coincide","label":{"es":"Es la oficial, porque el permiso coincide.","en":"It is the official one, because the permission matches."}},{"id":"solo-permiso","label":{"es":"El permiso está cerrado. Eso no identifica la dirección.","en":"The permission is closed. That does not identify the address."}},{"id":"no-leido","label":{"es":"No se leyó, y por eso pone «cerrado».","en":"It was not read, so it says “closed”."}}],"correct":"solo-permiso","whyRight":{"es":"En la ficha del 2026-10-08, crear más tokens y congelar cuentas figuran cerrados en la oficial y en las copias. USDC los tiene abiertos. Cerrado no identifica la dirección.","en":"On the 2026-10-08 card, creating more tokens and freezing accounts are closed on the official one and on the copies. USDC has them open. Closed does not identify the address."},"whyWrong":{"coincide":{"es":"Dos direcciones distintas pueden tener el mismo permiso. Esta no es la del registro.","en":"Two different addresses can have the same permission. This one is not the registry address."},"no-leido":{"es":"En esta ficha el permiso sí se leyó. Si no se hubiera leído, no se rellenaría como cerrado.","en":"On this card the permission was read. If it had not been read, it would not be filled in as closed."}}},{"id":"desconocido","kind":"check","glossary":["desconocido","ficha","censo"],"cards":["Hhq4ffySVX3UQqSowjhP1Lwa8YuJDf7iH2hYWvVHTuEf"],"fields":["name","holders","metadata"],"prompt":{"es":"Si un dato dice «no disponible», ¿qué haces?","en":"If a fact says “unavailable”, what do you do?"},"guide":{"es":"No disponible quiere decir que esa lectura no dejó un dato. No es un cero y no borra el resto de la ficha.","en":"Unavailable means that reading left no fact. It is not a zero and it does not erase the rest of the card."},"options":[{"id":"prueba-y-cero","label":{"es":"Lo cuento como cero.","en":"I count it as zero."}},{"id":"sigue-desconocido","label":{"es":"Sigue sin saberse. No es un cero.","en":"It stays unknown. It is not a zero."}},{"id":"anula-ficha","label":{"es":"Tiro la ficha entera.","en":"I throw out the whole card."}}],"correct":"sigue-desconocido","whyRight":{"es":"En las fichas que siguen fechadas el 2026-10-08 la muestra de cuentas con tokens está no disponible. Eso no es un cero ni anula lo que sí se leyó. La ficha oficial del 2026-10-09 lee la curva, la creadora y la cuenta personal (publicada en el registro oficial), y eso no es un censo.","en":"On the cards that stay dated 2026-10-08 the token account sample is unavailable. That is not a zero and it does not erase what was read. The official card from 2026-10-09 reads the curve, the creator, and the personal account (listed in the official registry), and that is not a census."},"whyWrong":{"prueba-y-cero":{"es":"Un hueco no es un dato leído. No se rellena con cero.","en":"A gap is not a fact that was read. It is not filled in with zero."},"anula-ficha":{"es":"Falta lo que la ficha nombra. El resto, si se leyó, sigue constando.","en":"What the card names is missing. The rest, if it was read, still stands."}}},{"id":"curva","kind":"check","glossary":["curva-pump","reserva-real","suplantacion"],"cards":["3Zi6p6wzYZYKyuHdBhsDfb2pRR7XTfTfLKkXL7rwpump","TNWwnzecb37272ZoySDE6D2UcmqNnU12EqtycNSpump"],"fields":["name","impersonation","curveProgress"],"prompt":{"es":"Una copia marca 0,00. ¿Eso prueba la intención de alguien?","en":"A copy shows 0.00. Does that prove someone’s intent?"},"guide":{"es":"El 0,00 es un cálculo de la curva en la ficha. No dice lo que alguien quiso hacer.","en":"0.00 is a curve calculation on the card. It does not say what someone meant to do."},"options":[{"id":"no-leida","label":{"es":"No se leyó, y prueba la intención.","en":"It was not read, and it proves intent."}},{"id":"senal-sin-intencion","label":{"es":"Es una señal. No atribuye intención.","en":"It is a signal. It does not attribute intent."}},{"id":"virtual-retirable","label":{"es":"La cantidad virtual de la curva (Pump.fun lo llama ‘reserves’) se puede retirar.","en":"The virtual curve amount (Pump.fun calls these ‘reserves’) can be withdrawn."}}],"correct":"senal-sin-intencion","whyRight":{"es":"En los tres clones, el 0,00 sale porque la cantidad real de la curva coincide con la inicial documentada. La señal de copia no atribuye intención. El número está en Detalles.","en":"On the three clones, 0.00 appears because the real curve amount matches the documented initial amount. The copy signal does not attribute intent. The number is in Details."},"whyWrong":{"no-leida":{"es":"El cálculo sí se hizo. Un dato no leído no se rellena con cero, y la ficha no afirma la intención de nadie.","en":"The calculation was made. An unread fact is not filled in with zero, and the card does not assert anyone’s intent."},"virtual-retirable":{"es":"La cantidad virtual de la curva no es la cantidad que se puede retirar.","en":"The virtual curve amount is not the balance that can be withdrawn."}}},{"id":"caso-nuevo","kind":"comprehension","glossary":["direccion","autoridad-emision"],"cards":[],"fields":[],"prompt":{"es":"Nombre igual, otra dirección. ¿Qué miras primero?","en":"Same name, different address. What do you check first?"},"guide":{"es":"Caso imaginario, no es una ficha real. El nombre puede repetirse; la dirección distingue un token de otro.","en":"An imagined case, not a real card. A name can be repeated; the address tells one token from another."},"options":[{"id":"fiarse-del-nombre","label":{"es":"El nombre.","en":"The name."}},{"id":"comparar-direccion","label":{"es":"La dirección.","en":"The address."}},{"id":"revocada-es-registro","label":{"es":"Si el permiso está cerrado, ya es la oficial.","en":"If the permission is closed, it is already the official one."}}],"correct":"comparar-direccion","whyRight":{"es":"Primero se compara la dirección. Un permiso cerrado no identifica el token, y un dato no leído no se convierte en un hecho.","en":"The address is compared first. A closed permission does not identify the token, and an unread fact does not become a fact."},"whyWrong":{"fiarse-del-nombre":{"es":"El nombre, aunque lleve «oficial», no es la dirección.","en":"The name, even if it says “official”, is not the address."},"revocada-es-registro":{"es":"Un permiso cerrado describe ese permiso. Si la dirección es otra, no es la oficial.","en":"A closed permission describes that permission. If the address is different, it is not the official one."}}}]},"lessons":[{"id":"leccion-permisos","version":"1.0.0","updated":"2026-10-11","cardDate":"2026-10-09","title":{"es":"Permisos: emisión y congelación","en":"Permissions: mint and freeze"},"intro":{"es":"Dos fichas del 2026-10-09. USDC es una moneda estable: un token pensado para seguir una moneda de curso. TOKEN A es un meme: no tiene esa función. Un permiso describe la cuenta, no acusa a nadie.","en":"Two cards from 2026-10-09. USDC is a stablecoin: a token meant to follow a currency. TOKEN A is a meme: it does not have that role. A permission describes the account. It does not accuse anyone."},"closing":{"es":"Has separado un permiso activo de una acusación, y un permiso cerrado de una garantía. No es un certificado y no dice qué hacer con el token.","en":"You separated an active permission from an accusation, and a closed permission from a guarantee. This is not a certificate and it does not say what to do with the token."},"entender":["permisos"],"steps":[{"id":"contexto","kind":"check","glossary":["autoridad-emision","autoridad-congelacion","moneda-estable"],"cards":["EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v","TNWwnzecb37272ZoySDE6D2UcmqNnU12EqtycNSpump"],"fields":["name","mint","mintAuthority","freezeAuthority"],"prompt":{"es":"USDC tiene la emisión activa. ¿Eso acusa al proyecto?","en":"USDC has an active mint permission. Does that accuse the project?"},"guide":{"es":"Emisión: crear más tokens. Congelación: bloquear cuentas. USDC los tiene activos. TOKEN A, el 2026-10-09, los tiene cerrados.","en":"Mint permission: create more tokens. Freeze permission: block accounts. USDC has both active. On 2026-10-09, TOKEN A has both closed."},"options":[{"id":"acusa","label":{"es":"Sí. Un permiso activo es una acusación.","en":"Yes. An active permission is an accusation."}},{"id":"contexto","label":{"es":"No. En una moneda estable y en un meme no se lee igual.","en":"No. A stablecoin and a meme are not read the same way."}},{"id":"tambien-stubx","label":{"es":"Sí, porque TOKEN A también lo tiene activo.","en":"Yes, because TOKEN A has it active too."}}],"correct":"contexto","whyRight":{"es":"En la ficha del 2026-10-09, USDC tiene la emisión activa en BJE5MMbqXjVwjAF7oxwPYXnTXDyspzZyt4vwenNw5ruG y la congelación activa en 7dGbd2QZcCKcTndnHcTL8q7SMVXAkp688NTQYwrRCrar. TOKEN A las tiene cerradas. En una moneda estable, emisión activa puede ser la forma de crear unidades. En un meme, el mismo permiso deja crecer el suministro. La ficha no acusa.","en":"On the 2026-10-09 card, USDC has mint permission active at BJE5MMbqXjVwjAF7oxwPYXnTXDyspzZyt4vwenNw5ruG and freeze permission active at 7dGbd2QZcCKcTndnHcTL8q7SMVXAkp688NTQYwrRCrar. TOKEN A has both closed. On a stablecoin, an active mint permission can be how new units are created. On a meme, the same permission lets the supply grow. The card does not accuse."},"whyWrong":{"acusa":{"es":"El permiso dice que alguien puede crear más tokens. No dice que el proyecto engañe.","en":"The permission says someone can create more tokens. It does not say the project is deceiving anyone."},"tambien-stubx":{"es":"En esa ficha TOKEN A los tiene cerrados. USDC los tiene activos. No es el mismo caso.","en":"On that card TOKEN A has them closed. USDC has them active. It is not the same case."}}},{"id":"cerrado","kind":"check","glossary":["autoridad-emision","autoridad-congelacion"],"cards":["TNWwnzecb37272ZoySDE6D2UcmqNnU12EqtycNSpump","EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"],"fields":["name","mint","mintAuthority","freezeAuthority"],"prompt":{"es":"TOKEN A tiene los dos permisos cerrados. ¿Eso lo hace seguro?","en":"TOKEN A has both permissions closed. Does that make it safe?"},"guide":{"es":"Cerrado: ese permiso no está asignado en esta lectura. No demuestra que el proyecto sea legítimo.","en":"Closed: that permission is not assigned in this reading. It does not show the project is legitimate."},"options":[{"id":"seguro","label":{"es":"Sí. Cerrado quiere decir que es seguro.","en":"Yes. Closed means it is safe."}},{"id":"solo-permiso","label":{"es":"No. Solo dice que esos permisos no están asignados.","en":"No. It only says those permissions are not assigned."}},{"id":"no-leido","label":{"es":"No se leyó, y por eso pone cerrado.","en":"It was not read, so it says closed."}}],"correct":"solo-permiso","whyRight":{"es":"El 2026-10-09 los dos figuran revocados y leídos en la cadena. Revocado no es una garantía. USDC los tiene activos y la ficha tampoco lo acusa. Una copia puede tenerlos cerrados igual.","en":"On 2026-10-09 both are revoked and read on-chain. Revoked is not a guarantee. USDC has them active and the card does not accuse it either. A copy can have them closed too."},"whyWrong":{"seguro":{"es":"Cerrado describe ese permiso. No dice que el token sea seguro ni qué hacer con él.","en":"Closed describes that permission. It does not say the token is safe or what to do with it."},"no-leido":{"es":"En esta ficha el permiso sí se leyó. Si no se hubiera leído, no se rellenaría como cerrado.","en":"On this card the permission was read. If it had not been read, it would not be filled in as closed."}}}]},{"id":"leccion-reparto","version":"1.0.0","updated":"2026-10-11","cardDate":"2026-10-09","title":{"es":"Reparto: cuentas, no personas","en":"Distribution: accounts, not people"},"intro":{"es":"Ficha de TOKEN A del 2026-10-09. La curva tiene el 98,6122 %. La creadora, el 0,5272 %. La cuenta personal (publicada en el registro oficial), el 0,8604 %. Una cuenta técnica es la de un programa. Un pool es la cuenta de un intercambio: tampoco es la cuenta de una persona. En esta ficha la curva no está completa, así que este saldo es la curva, no un pool.","en":"TOKEN A card from 2026-10-09. The curve holds 98.6122%. The creator holds 0.5272%. The personal account (listed in the official registry) holds 0.8604%. A technical account belongs to a program. A pool is an exchange account: it is not a person's account either. On this card the curve is not complete, so this balance is the curve, not a pool."},"closing":{"es":"Has separado la cuenta de la curva, la de la creadora y la cuenta personal (publicada en el registro oficial). Ninguna dirección de esta ficha es el nombre de una persona. No es un certificado.","en":"You separated the curve account, the creator account, and the personal account (listed in the official registry). No address on this card is a person's name. This is not a certificate."},"entender":["distribucion"],"steps":[{"id":"curva","kind":"check","glossary":["cuenta-tecnica","curva-pump","titular"],"cards":["TNWwnzecb37272ZoySDE6D2UcmqNnU12EqtycNSpump"],"fields":["name","mint","holders","curvePresent"],"prompt":{"es":"El 98,6122 % está en la cuenta de la curva. ¿Es de una persona?","en":"98.6122% is on the curve account. Does it belong to a person?"},"guide":{"es":"La cuenta de la curva es del programa. No es la cuenta de una persona. Un pool tampoco lo sería: es la cuenta del intercambio.","en":"The curve account belongs to the program. It is not a person's account. A pool would not be one either: it is the exchange account."},"options":[{"id":"persona","label":{"es":"Sí. Quien tiene más tokens es una persona.","en":"Yes. Whoever holds the most tokens is a person."}},{"id":"tecnica","label":{"es":"No. Es la cuenta de la curva, no la de una persona.","en":"No. It is the curve account, not a person's account."}},{"id":"pool","label":{"es":"Es un pool, porque el porcentaje es alto.","en":"It is a pool, because the percentage is high."}}],"correct":"tecnica","whyRight":{"es":"La ficha del 2026-10-09 lee 98,6122 % en la cuenta de la curva 3shQFExQ3rpFL6GaXPRQNTMYazVHmTvRfuazfv62toAE. La etiqueta dice que es un saldo leído, no un censo. complete es falso: sigue en la curva. Un pool también sería una cuenta del programa, no la de una persona, pero esta lectura no lo muestra.","en":"The 2026-10-09 card reads 98.6122% on the curve account 3shQFExQ3rpFL6GaXPRQNTMYazVHmTvRfuazfv62toAE. The label says it is a balance that was read, not a census. complete is false: it is still on the curve. A pool would also be a program account, not a person's account, but this reading does not show one."},"whyWrong":{"persona":{"es":"Un saldo alto no convierte la cuenta en una persona. Esta dirección es la de la curva.","en":"A large balance does not turn the account into a person. This address is the curve account."},"pool":{"es":"El porcentaje no dice que sea un pool. En esta ficha complete es falso: el saldo es de la curva.","en":"The percentage does not say it is a pool. On this card complete is false: the balance belongs to the curve."}}},{"id":"tres-cuentas","kind":"check","glossary":["censo","titular","cuenta-tecnica"],"cards":["TNWwnzecb37272ZoySDE6D2UcmqNnU12EqtycNSpump"],"fields":["name","mint","holders"],"prompt":{"es":"La ficha lee tres cuentas. ¿Eso es un censo de personas?","en":"The card reads three accounts. Is that a census of people?"},"guide":{"es":"Un censo sería todas las cuentas. Aquí hay tres saldos leídos. El resto del suministro es 0,0000 %. Una dirección no es el nombre de una persona.","en":"A census would be every account. Here there are three balances that were read. The rest of the supply is 0.0000%. An address is not a person's name."},"options":[{"id":"si-censo","label":{"es":"Sí. Tres cuentas son todas las personas.","en":"Yes. Three accounts are every person."}},{"id":"no-censo","label":{"es":"No. No es un censo, y una dirección no es una persona.","en":"No. It is not a census, and an address is not a person."}},{"id":"nada-leido","label":{"es":"El 0,0000 % significa que no se leyó nada.","en":"0.0000% means nothing was read."}}],"correct":"no-censo","whyRight":{"es":"Se leyeron la curva (98,6122 %, 3shQFExQ3rpFL6GaXPRQNTMYazVHmTvRfuazfv62toAE), la creadora (0,5272 %, 77RKUqMprQHDSkhFBpC1REU1kE9aM1uw189orHo7wypD) y la cuenta personal (publicada en el registro oficial) (0,8604 %, 2fS12sTD4TNEEE9MoCEt19brV41UjGdAnaNaxWcmiWvX). El resto del suministro es 0,0000 %. La ficha dice que no es un censo. Una dirección no nombra a una persona.","en":"The curve (98.6122%, 3shQFExQ3rpFL6GaXPRQNTMYazVHmTvRfuazfv62toAE), the creator (0.5272%, 77RKUqMprQHDSkhFBpC1REU1kE9aM1uw189orHo7wypD), and the personal account (listed in the official registry) (0.8604%, 2fS12sTD4TNEEE9MoCEt19brV41UjGdAnaNaxWcmiWvX) were read. The rest of the supply is 0.0000%. The card says it is not a census. An address does not name a person."},"whyWrong":{"si-censo":{"es":"Tres cuentas leídas no son la lista de todas, y la de la curva no es una persona.","en":"Three accounts that were read are not the list of every account, and the curve account is not a person."},"nada-leido":{"es":"0,0000 % es el resto del suministro, no un hueco. Las tres cuentas sí se leyeron.","en":"0.0000% is the rest of the supply, not a gap. The three accounts were read."}}}]},{"id":"leccion-huecos","version":"1.0.0","updated":"2026-10-11","cardDate":"2026-10-09","title":{"es":"Cuando falta un dato","en":"When a fact is missing"},"intro":{"es":"Tres huecos distintos, con fichas del 2026-10-09. Consulta fallida: se pidió y no hubo respuesta usable. Ausente comprobado: se pidió y el dato no está. No consultado: esta lectura no lo pidió. Ninguno de los tres es un cero.","en":"Three different gaps, using cards from 2026-10-09. Failed query: it was asked for and there was no usable answer. Confirmed absent: it was asked for and the fact is not there. Not queried: this reading did not ask for it. None of the three is a zero."},"closing":{"es":"Has separado una consulta que falló, un dato que no está y un dato que no se pidió. Ninguno se rellena con cero. No es un certificado.","en":"You separated a query that failed, a fact that is not there, and a fact that was not asked for. None of them is filled in with zero. This is not a certificate."},"entender":["distribucion","metadatos"],"steps":[{"id":"fallo","kind":"check","glossary":["consulta-fallida","desconocido"],"cards":["EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"],"fields":["name","mint","holders"],"prompt":{"es":"USDC pidió las cuentas grandes y recibió HTTP 429. ¿Qué es?","en":"USDC asked for the largest accounts and got HTTP 429. What is that?"},"guide":{"es":"HTTP 429 es una consulta fallida: el servicio no dejó una respuesta usable. No es un cero ni una ausencia.","en":"HTTP 429 is a failed query: the service left no usable answer. It is not a zero and it is not an absence."},"options":[{"id":"cero","label":{"es":"Lo cuento como cero.","en":"I count it as zero."}},{"id":"fallo","label":{"es":"Es una consulta fallida. No es un cero.","en":"It is a failed query. It is not a zero."}},{"id":"ausente","label":{"es":"Quedó comprobado que no hay cuentas.","en":"It was confirmed that there are no accounts."}}],"correct":"fallo","whyRight":{"es":"El 2026-10-09, getTokenLargestAccounts sobre USDC respondió HTTP 429 a las 16:42:45 UTC. El estado es no disponible. No se rellena con cero ni se dice que las cuentas no existan.","en":"On 2026-10-09, getTokenLargestAccounts for USDC returned HTTP 429 at 16:42:45 UTC. The status is unavailable. It is not filled in with zero, and it does not say the accounts do not exist."},"whyWrong":{"cero":{"es":"Una consulta sin respuesta no es un dato leído. No se rellena con cero.","en":"A query with no answer is not a fact that was read. It is not filled in with zero."},"ausente":{"es":"Ausente comprobado es otra cosa: la consulta respondió y el dato no está. Aquí el servicio no respondió usable.","en":"Confirmed absent is different: the query answered and the fact is not there. Here the service left no usable answer."}}},{"id":"ausente","kind":"check","glossary":["ausente-comprobado","metadatos-mutables"],"cards":["TNWwnzecb37272ZoySDE6D2UcmqNnU12EqtycNSpump"],"fields":["name","mint","metadata"],"prompt":{"es":"En TOKEN A se buscó la cuenta Metaplex y no está. ¿Qué es?","en":"On TOKEN A the Metaplex account was looked up and it is not there. What is that?"},"guide":{"es":"Metaplex es un registro de nombre y símbolo. Se consultó y la cuenta no está: ausente comprobado. No es un fallo.","en":"Metaplex is a name and symbol record. It was queried and the account is not there: confirmed absent. It is not a failure."},"options":[{"id":"fallo","label":{"es":"La consulta falló.","en":"The query failed."}},{"id":"ausente","label":{"es":"Se comprobó que no existe. No es un fallo.","en":"It was confirmed that it does not exist. It is not a failure."}},{"id":"no-pedido","label":{"es":"Esta lectura no lo pidió.","en":"This reading did not ask for it."}}],"correct":"ausente","whyRight":{"es":"El 2026-10-09 la consulta respondió y el valor está vacío: no hay cuenta de metadatos de Metaplex. La consulta respondió. El dato no está. No es un HTTP 429.","en":"On 2026-10-09 the query was answered and the value is empty: there is no Metaplex metadata account. The query answered. The fact is not there. It is not an HTTP 429."},"whyWrong":{"fallo":{"es":"La consulta sí respondió. El fallo es cuando no hay respuesta usable.","en":"The query did answer. A failure is when there is no usable answer."},"no-pedido":{"es":"Sí se pidió: hay una lectura de esa cuenta, con hora y slot. No pedido es cuando esta lectura ni siquiera lo consulta.","en":"It was asked for: there is a reading of that account, with a time and a slot. Not queried is when this reading does not even ask."}}},{"id":"no-pedido","kind":"check","glossary":["no-consultado","censo","desconocido"],"cards":["TNWwnzecb37272ZoySDE6D2UcmqNnU12EqtycNSpump"],"fields":["name","mint","holders"],"prompt":{"es":"TOKEN A no pidió el ranking de cuentas grandes. ¿Qué haces?","en":"TOKEN A did not ask for the largest-account ranking. What do you do?"},"guide":{"es":"No consultado: esta lectura no pidió ese dato. No es un HTTP 429 ni un cero.","en":"Not queried: this reading did not ask for that fact. It is not an HTTP 429 and it is not a zero."},"options":[{"id":"cero","label":{"es":"Lo pongo a cero.","en":"I set it to zero."}},{"id":"fallo","label":{"es":"Lo trato como una consulta fallida.","en":"I treat it as a failed query."}},{"id":"no-pedido","label":{"es":"Sigue sin pedirse. No es un fallo ni un cero.","en":"It stays unasked. It is not a failure and it is not a zero."}}],"correct":"no-pedido","whyRight":{"es":"La muestra del 2026-10-09 lee la curva, la creadora y la cuenta personal con getMultipleAccounts. No sustituye a getTokenLargestAccounts. El máximo fuera de la muestra no se calcula: la fuente está vacía. Eso no es el HTTP 429 de USDC.","en":"The 2026-10-09 sample reads the curve, the creator, and the personal account with getMultipleAccounts. It does not replace getTokenLargestAccounts. The maximum outside the sample is not calculated: the source is empty. That is not the USDC HTTP 429."},"whyWrong":{"cero":{"es":"No haberlo pedido no es un cero. El 0,0000 % de esta ficha es el resto del suministro, otro dato.","en":"Not asking for it is not a zero. The 0.0000% on this card is the rest of the supply, a different fact."},"fallo":{"es":"USDC sí pidió el ranking y recibió HTTP 429. TOKEN A, en esta ficha, no hizo esa petición.","en":"USDC did ask for the ranking and got HTTP 429. TOKEN A, on this card, did not make that request."}}}]}],"entender":[{"id":"permisos","href":"/aprender/#guia-permisos","es":"Permisos","en":"Permissions","explain":{"es":"Permisos: el de emisión permite crear más tokens. El de congelación permite bloquear cuentas. Ninguno de los dos dice si el proyecto es legítimo.","en":"Permissions: the mint permission can create more tokens. The freeze permission can block accounts. Neither one says the project is legitimate."}},{"id":"suministro","href":"/aprender/#autoridad-emision","es":"Suministro","en":"Supply","explain":{"es":"Suministro: es la cantidad total de tokens en esta lectura, con los decimales de este token.","en":"Supply: it is the total number of tokens in this reading, using this token's decimals."}},{"id":"metadatos","href":"/aprender/#metadatos-mutables","es":"Metadatos","en":"Metadata","explain":{"es":"Metadatos: si se pueden cambiar, puede que mañana el nombre o el símbolo ya no sean los de esta lectura.","en":"Metadata: if they can change, the name or symbol in this reading may not be tomorrow's."}},{"id":"distribucion","href":"/aprender/#censo","es":"Distribución (guía Censo)","en":"Distribution (Census guide)","explain":{"es":"Distribución: una muestra de cuentas no es un censo de quién tiene los tokens.","en":"Distribution: a sample of accounts is not a census of who holds the tokens."}},{"id":"curva","href":"/aprender/#curva-pump","es":"Curva","en":"Curve","explain":{"es":"Curva: si el token no se creó en Pump.fun, este dato no aplica. Si se creó y no hay cuenta, esta lectura no la encontró.","en":"Curve: if the token was not created on Pump.fun, this fact does not apply. If it was and there is no account, this reading did not find it."}}],"cards":{"TNWwnzecb37272ZoySDE6D2UcmqNnU12EqtycNSpump":{"mint":"TNWwnzecb37272ZoySDE6D2UcmqNnU12EqtycNSpump","role":"registro","roleNote":{"es":"Mint del registro curado. Ficha releída el 2026-10-09: saldos de la curva, de la creadora y de la cuenta personal publicada. No es un censo. La ficha del 2026-10-08 se conserva.","en":"Curated registry mint. Card reread on 2026-10-09: balances of the curve, the creator, and the published personal account. It is not a census. The 2026-10-08 card is kept."},"id":"a9e7f8d9d16fa3113f669afbcb4966123279efed3efa0769a864be484f43d9eb","createdAt":"2026-10-09T17:06:59.737Z","partial":true,"referenceSlot":454936120,"name":"TOKEN A","nameStatus":"verificado","symbol":"TOKEN A","inRegistry":true,"inRegistryStatus":"verificado","mintAuthority":{"state":"revocada","status":"verificado"},"freezeAuthority":{"state":"revocada","status":"verificado"},"metadataReading":"no_mutables_en_fuentes","metadataLevel":"ok","holdersStatus":"verificado","holdersNote":"Saldos leídos de la curva, de la creadora y de la cuenta personal publicada (2fS12sTD4TNEEE9MoCEt19brV41UjGdAnaNaxWcmiWvX). El resto respecto al suministro es 0.0000 %. No es un censo de cuentas con tokens.","impersonation":false,"authenticityLevel":"ok","signals":["mint en el registro"],"statement":"El mint coincide con el registro curado (stubx). Que esté en el registro no es una auditoría.","statementStatus":"verificado","curvePresent":true,"curvePresentStatus":"verificado","curveProgress":"1.74","curveProgressStatus":"inferido","curveProgressNote":"Porcentaje inferido con la cantidad real inicial pública de la curva clásica (Pump.fun lo llama ‘reserves’) (793100000000000). Truncado a 2 decimales hacia cero.","curveModuleNote":"Cuenta con el discriminador público de BondingCurve.","rulesVersion":"0.1.0","statement_en":"The mint matches the curated registry (stubx). Being in the registry is not an audit.","holdersNote_en":"Balances read from the curve, from the creator, and from the published personal account (2fS12sTD4TNEEE9MoCEt19brV41UjGdAnaNaxWcmiWvX). The rest of the supply is 0.0000 %. It is not a census of token accounts.","curveProgressNote_en":"Percentage inferred from the public initial real curve amount of the classic curve (Pump.fun calls these ‘reserves’) (793100000000000). Truncated to 2 decimals toward zero.","curveModuleNote_en":"Account with the public BondingCurve discriminator.","signals_en":["mint in the registry"]},"Hhq4ffySVX3UQqSowjhP1Lwa8YuJDf7iH2hYWvVHTuEf":{"mint":"Hhq4ffySVX3UQqSowjhP1Lwa8YuJDf7iH2hYWvVHTuEf","role":"clon","roleNote":{"es":"Clon conocido en los ejemplos del 2026-10-08. La ficha marca posible suplantación y no atribuye intención.","en":"Known clone in the 2026-10-08 examples. The card marks possible impersonation and does not attribute intent."},"id":"2c5de795c4aab2014c94dd6ed2fbda4564256b5e00c6fe929f1b7392639393b0","createdAt":"2026-10-08T07:41:49.581Z","partial":true,"referenceSlot":454480545,"name":"Comunidad TOKEN A · Creador","nameStatus":"verificado","symbol":"COMUNIDAD","inRegistry":false,"inRegistryStatus":"verificado","mintAuthority":{"state":"revocada","status":"verificado"},"freezeAuthority":{"state":"revocada","status":"verificado"},"metadataReading":"no_mutables_en_fuentes","metadataLevel":"ok","holdersStatus":"no_disponible","holdersNote":"Sin respuesta utilizable. No se interpreta como autoridad revocada, como inmutabilidad ni como cantidad cero.","impersonation":true,"authenticityLevel":"riesgo","signals":["nombre «Comunidad TOKEN A · Creador» incluye TOKEN A/TOKEN A","enlace «https://stubxai.com/canales» coincide con un enlace u host del registro"],"statement":"Posible suplantación: el nombre, el símbolo, la imagen o un enlace coinciden con un token del registro curado, pero el mint es otro. La coincidencia no atribuye intención.","statementStatus":"inferido","curvePresent":true,"curvePresentStatus":"verificado","curveProgress":"0.00","curveProgressStatus":"inferido","curveProgressNote":"Porcentaje inferido con la cantidad real inicial pública de la curva clásica (Pump.fun lo llama ‘reserves’) (793100000000000). Truncado a 2 decimales hacia cero.","curveModuleNote":"Cuenta con el discriminador público de BondingCurve.","rulesVersion":"0.1.0","statement_en":"Possible impersonation: the name, symbol, image, or a link matches a token in the curated registry, but the mint is different. The match does not attribute intent.","holdersNote_en":"No usable response. It is not interpreted as a revoked authority, as immutability, or as a zero balance.","curveProgressNote_en":"Percentage inferred from the public initial real curve amount of the classic curve (Pump.fun calls these ‘reserves’) (793100000000000). Truncated to 2 decimals toward zero.","curveModuleNote_en":"Account with the public BondingCurve discriminator.","signals_en":["name “Comunidad TOKEN A · Creador” includes TOKEN A","link “https://stubxai.com/canales” matches a link or host in the registry"]},"DjEjb6bxQ3Hjej9CzUAVeRqyt7k1tevHgcS37t41PUhQ":{"mint":"DjEjb6bxQ3Hjej9CzUAVeRqyt7k1tevHgcS37t41PUhQ","role":"clon","roleNote":{"es":"Clon conocido en los ejemplos del 2026-10-08. La ficha marca posible suplantación y no atribuye intención.","en":"Known clone in the 2026-10-08 examples. The card marks possible impersonation and does not attribute intent."},"id":"e19ccb6b9ab284a1349b1c0bd7472c1cbb1f3eb9808c37c752c85418b4239a32","createdAt":"2026-10-08T07:42:08.413Z","partial":true,"referenceSlot":454480614,"name":"Comunidad TOKEN A","nameStatus":"verificado","symbol":"COMUNIDAD","inRegistry":false,"inRegistryStatus":"verificado","mintAuthority":{"state":"revocada","status":"verificado"},"freezeAuthority":{"state":"revocada","status":"verificado"},"metadataReading":"no_mutables_en_fuentes","metadataLevel":"ok","holdersStatus":"no_disponible","holdersNote":"Sin respuesta utilizable. No se interpreta como autoridad revocada, como inmutabilidad ni como cantidad cero.","impersonation":true,"authenticityLevel":"riesgo","signals":["nombre «Comunidad TOKEN A» incluye TOKEN A/TOKEN A","enlace «https://stubxai.com/canales» coincide con un enlace u host del registro"],"statement":"Posible suplantación: el nombre, el símbolo, la imagen o un enlace coinciden con un token del registro curado, pero el mint es otro. La coincidencia no atribuye intención.","statementStatus":"inferido","curvePresent":true,"curvePresentStatus":"verificado","curveProgress":"0.00","curveProgressStatus":"inferido","curveProgressNote":"Porcentaje inferido con la cantidad real inicial pública de la curva clásica (Pump.fun lo llama ‘reserves’) (793100000000000). Truncado a 2 decimales hacia cero.","curveModuleNote":"Cuenta con el discriminador público de BondingCurve.","rulesVersion":"0.1.0","statement_en":"Possible impersonation: the name, symbol, image, or a link matches a token in the curated registry, but the mint is different. The match does not attribute intent.","holdersNote_en":"No usable response. It is not interpreted as a revoked authority, as immutability, or as a zero balance.","curveProgressNote_en":"Percentage inferred from the public initial real curve amount of the classic curve (Pump.fun calls these ‘reserves’) (793100000000000). Truncated to 2 decimals toward zero.","curveModuleNote_en":"Account with the public BondingCurve discriminator.","signals_en":["name “Comunidad TOKEN A” includes TOKEN A","link “https://stubxai.com/canales” matches a link or host in the registry"]},"3Zi6p6wzYZYKyuHdBhsDfb2pRR7XTfTfLKkXL7rwpump":{"mint":"3Zi6p6wzYZYKyuHdBhsDfb2pRR7XTfTfLKkXL7rwpump","role":"clon","roleNote":{"es":"Clon conocido en los ejemplos del 2026-10-08. La ficha marca posible suplantación y no atribuye intención.","en":"Known clone in the 2026-10-08 examples. The card marks possible impersonation and does not attribute intent."},"id":"6da15234e08bd8507731922297162664cf9c16690397d4fbe2777a8f6c32d44c","createdAt":"2026-10-08T07:42:27.686Z","partial":true,"referenceSlot":454480685,"name":"Comunidad TOKEN A","nameStatus":"verificado","symbol":"COMUNIDAD","inRegistry":false,"inRegistryStatus":"verificado","mintAuthority":{"state":"revocada","status":"verificado"},"freezeAuthority":{"state":"revocada","status":"verificado"},"metadataReading":"no_mutables_en_fuentes","metadataLevel":"ok","holdersStatus":"no_disponible","holdersNote":"Sin respuesta utilizable. No se interpreta como autoridad revocada, como inmutabilidad ni como cantidad cero.","impersonation":true,"authenticityLevel":"riesgo","signals":["nombre «Comunidad TOKEN A» incluye TOKEN A/TOKEN A","enlace «https://stubxai.com/canales» coincide con un enlace u host del registro"],"statement":"Posible suplantación: el nombre, el símbolo, la imagen o un enlace coinciden con un token del registro curado, pero el mint es otro. La coincidencia no atribuye intención.","statementStatus":"inferido","curvePresent":true,"curvePresentStatus":"verificado","curveProgress":"0.00","curveProgressStatus":"inferido","curveProgressNote":"Porcentaje inferido con la cantidad real inicial pública de la curva clásica (Pump.fun lo llama ‘reserves’) (793100000000000). Truncado a 2 decimales hacia cero.","curveModuleNote":"Cuenta con el discriminador público de BondingCurve.","rulesVersion":"0.1.0","statement_en":"Possible impersonation: the name, symbol, image, or a link matches a token in the curated registry, but the mint is different. The match does not attribute intent.","holdersNote_en":"No usable response. It is not interpreted as a revoked authority, as immutability, or as a zero balance.","curveProgressNote_en":"Percentage inferred from the public initial real curve amount of the classic curve (Pump.fun calls these ‘reserves’) (793100000000000). Truncated to 2 decimals toward zero.","curveModuleNote_en":"Account with the public BondingCurve discriminator.","signals_en":["name “Comunidad TOKEN A” includes TOKEN A","link “https://stubxai.com/canales” matches a link or host in the registry"]},"ERYyyaE2Y2GuKB28YbC2w1nCuQ5ENQ89LR44kicvpump":{"mint":"ERYyyaE2Y2GuKB28YbC2w1nCuQ5ENQ89LR44kicvpump","role":"clon","roleNote":{"es":"Ejemplo añadido el 2026-10-09. Se llama TOKEN A y no es el mint del registro. No es una lista completa.","en":"Example added on 2026-10-09. It is named TOKEN A and it is not the registry mint. This is not a complete list."},"id":"efa9c02fbf4a0873c703d200f107c5951109174f0a15a2fcf898eeb5b735206b","createdAt":"2026-10-09T16:16:12.461Z","partial":true,"referenceSlot":454922187,"name":"TOKEN A","nameStatus":"verificado","symbol":"TOKEN A","inRegistry":false,"inRegistryStatus":"verificado","mintAuthority":{"state":"revocada","status":"verificado"},"freezeAuthority":{"state":"revocada","status":"verificado"},"metadataReading":"no_mutables_en_fuentes","metadataLevel":"ok","holdersStatus":"verificado","holdersNote":"Saldos leídos de la curva y de la creadora. El resto respecto al suministro es 0.0006 %. No es un censo de cuentas con tokens.","impersonation":true,"authenticityLevel":"riesgo","signals":["nombre «TOKEN A» incluye TOKEN A/TOKEN A","símbolo «TOKEN A» incluye TOKEN A/TOKEN A","enlace «https://.superb-horse-9036f5.netlify.app» coincide con un enlace u host del registro"],"statement":"Posible suplantación: el nombre, el símbolo, la imagen o un enlace coinciden con un token del registro curado, pero el mint es otro. La coincidencia no atribuye intención.","statementStatus":"inferido","curvePresent":true,"curvePresentStatus":"verificado","curveProgress":"0.00","curveProgressStatus":"inferido","curveProgressNote":"Porcentaje inferido con la cantidad real inicial pública de la curva clásica (Pump.fun lo llama ‘reserves’) (793100000000000). Truncado a 2 decimales hacia cero.","curveModuleNote":"Cuenta con el discriminador público de BondingCurve.","rulesVersion":"0.1.0","statement_en":"Possible impersonation: the name, symbol, image, or a link matches a token in the curated registry, but the mint is different. The match does not attribute intent.","holdersNote_en":"Balances read from the curve and from the creator. The rest of the supply is 0.0006 %. It is not a census of token accounts.","curveProgressNote_en":"Percentage inferred from the public initial real curve amount of the classic curve (Pump.fun calls these ‘reserves’) (793100000000000). Truncated to 2 decimals toward zero.","curveModuleNote_en":"Account with the public BondingCurve discriminator.","signals_en":["name “TOKEN A” includes TOKEN A","symbol “TOKEN A” includes TOKEN A","link “https://.superb-horse-9036f5.netlify.app” matches a link or host in the registry"]},"FMNb4CR8ksibmgY7Ztei6BWcZXi3WHcVeJhYb9TNpump":{"mint":"FMNb4CR8ksibmgY7Ztei6BWcZXi3WHcVeJhYb9TNpump","role":"clon","roleNote":{"es":"Ejemplo añadido el 2026-10-09. Se llama TOKEN A y no es el mint del registro. No es una lista completa.","en":"Example added on 2026-10-09. It is named TOKEN A and it is not the registry mint. This is not a complete list."},"id":"d0fdaab557d36d442f688e25a71bbc54b3d61b5fffa2bf26c2a02ba1eb7a9c86","createdAt":"2026-10-09T16:16:39.440Z","partial":true,"referenceSlot":454922310,"name":"TOKEN A","nameStatus":"verificado","symbol":"TOKEN A","inRegistry":false,"inRegistryStatus":"verificado","mintAuthority":{"state":"revocada","status":"verificado"},"freezeAuthority":{"state":"revocada","status":"verificado"},"metadataReading":"no_mutables_en_fuentes","metadataLevel":"ok","holdersStatus":"verificado","holdersNote":"Saldos leídos de la curva y de la creadora. El resto respecto al suministro es 0.0000 %. No es un censo de cuentas con tokens.","impersonation":true,"authenticityLevel":"riesgo","signals":["nombre «TOKEN A» incluye TOKEN A/TOKEN A","símbolo «TOKEN A» incluye TOKEN A/TOKEN A","enlace «https://superb-horse-9036f5.netlify.app» coincide con un enlace u host del registro"],"statement":"Posible suplantación: el nombre, el símbolo, la imagen o un enlace coinciden con un token del registro curado, pero el mint es otro. La coincidencia no atribuye intención.","statementStatus":"inferido","curvePresent":true,"curvePresentStatus":"verificado","curveProgress":"0.00","curveProgressStatus":"inferido","curveProgressNote":"Porcentaje inferido con la cantidad real inicial pública de la curva clásica (Pump.fun lo llama ‘reserves’) (793100000000000). Truncado a 2 decimales hacia cero.","curveModuleNote":"Cuenta con el discriminador público de BondingCurve.","rulesVersion":"0.1.0","statement_en":"Possible impersonation: the name, symbol, image, or a link matches a token in the curated registry, but the mint is different. The match does not attribute intent.","holdersNote_en":"Balances read from the curve and from the creator. The rest of the supply is 0.0000 %. It is not a census of token accounts.","curveProgressNote_en":"Percentage inferred from the public initial real curve amount of the classic curve (Pump.fun calls these ‘reserves’) (793100000000000). Truncated to 2 decimals toward zero.","curveModuleNote_en":"Account with the public BondingCurve discriminator.","signals_en":["name “TOKEN A” includes TOKEN A","symbol “TOKEN A” includes TOKEN A","link “https://superb-horse-9036f5.netlify.app” matches a link or host in the registry"]},"EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v":{"mint":"EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v","role":"contraste","roleNote":{"es":"USDC, contraste. Bytes del mint el 2026-10-09 18:42 Europe/Madrid: 7.442.271.613,512366. getTokenSupply en ese minuto no coincidió, así que no hay porcentajes. No es TOKEN A y no está presentado como clon. La ficha del 2026-10-08 conserva la cifra de aquel día.","en":"USDC, a contrast. Mint bytes on 2026-10-09 18:42 Europe/Madrid: 7,442,271,613.512366. getTokenSupply did not match in that minute, so there are no percentages. It is not TOKEN A and is not presented as a clone. The 2026-10-08 card keeps that day's figure."},"id":"80671753ebbcdee3317b7b2bbf7ef14eba21f8a58e437bcfdab42da02b15d7a2","createdAt":"2026-10-09T16:42:39.825Z","partial":true,"referenceSlot":454929422,"name":"USD Coin","nameStatus":"verificado","symbol":"USDC","inRegistry":false,"inRegistryStatus":"verificado","mintAuthority":{"state":"activa","status":"verificado"},"freezeAuthority":{"state":"activa","status":"verificado"},"metadataReading":"mutables","metadataLevel":"atención","holdersStatus":"no_disponible","holdersNote":"Sin respuesta utilizable. No se interpreta como autoridad revocada, como inmutabilidad ni como cantidad cero.","impersonation":false,"authenticityLevel":"ok","signals":[],"statement":"Este mint no está en el registro curado. Que no esté no significa que sea falso ni que sea una copia.","statementStatus":"verificado","curvePresent":false,"curvePresentStatus":"verificado","curveProgress":null,"curveProgressStatus":"no_aplica","curveProgressNote":"No hay curva. No se rellena con cero.","curveModuleNote":"La dirección derivada tiene una cuenta cuyo propietario no es el programa de Pump.fun. No es una curva y no se rellenan con cero las cantidades de la curva.","rulesVersion":"0.1.0","statement_en":"This mint is not in the curated registry. That does not mean it is fake or a copy.","holdersNote_en":"No usable response. It is not interpreted as a revoked authority, as immutability, or as a zero balance.","curveProgressNote_en":"There is no curve. It is not filled with zero.","curveModuleNote_en":"The derived address has an account whose owner is not the Pump.fun program. It is not a curve, and the curve amounts are not filled in with zero.","signals_en":[]}},"glossary":[{"id":"direccion","term":{"es":"Dirección del mint","en":"Mint address"},"means":{"es":"Es la dirección de la cuenta del token. Identifica ese mint en la red de la ficha. El nombre y el símbolo son textos aparte.","en":"It is the address of the token’s mint account. It identifies that mint on the network named in the card. The name and the symbol are separate text."},"example":{"es":"En las fichas del 2026-10-08, TNWwnzecb37272ZoySDE6D2UcmqNnU12EqtycNSpump y DjEjb6bxQ3Hjej9CzUAVeRqyt7k1tevHgcS37t41PUhQ son direcciones distintas aunque los nombres se parezcan.","en":"On the 2026-10-08 cards, TNWwnzecb37272ZoySDE6D2UcmqNnU12EqtycNSpump and DjEjb6bxQ3Hjej9CzUAVeRqyt7k1tevHgcS37t41PUhQ are different addresses even if the names look alike."},"doesNotConclude":{"es":"No dice quién es una persona, ni si conviene hacer nada con el token. Dos nombres iguales no son la misma dirección.","en":"It does not name a person, and it does not say that any action with the token is advisable. Two equal names are not the same address."}},{"id":"registro","term":{"es":"Registro curado","en":"Curated registry"},"means":{"es":"Lista local que Verify compara con el mint, el nombre, el símbolo, la imagen y algunos enlaces. Hoy incluye TOKEN A. Que un mint no esté no significa que sea falso.","en":"A local list Verify compares with the mint, name, symbol, image, and some links. Today it includes TOKEN A. A mint that is not on the list is not necessarily fake."},"example":{"es":"USDC, en la ficha del 2026-10-08, no está en el registro. La propia ficha dice que eso no significa que sea falso ni una copia.","en":"USDC, on the 2026-10-08 card, is not in the registry. The card itself says that does not mean it is false or a copy."},"doesNotConclude":{"es":"Estar en el registro no es una auditoría ni una garantía. No estar tampoco es una acusación.","en":"Being in the registry is not an audit or a guarantee. Being absent is not an accusation either."}},{"id":"autoridad-emision","term":{"es":"Autoridad de emisión","en":"Mint authority"},"means":{"es":"Permiso para aumentar el suministro de ese mint. Si la ficha dice revocada y el campo se leyó en la cadena, la opción leída está en 0. Si dice activa, el permiso sigue asignado a una dirección.","en":"Permission to increase the supply of that mint. If the card says revoked and the field was read on-chain, the field that was read is empty (no authority set). If it says active, the permission is still assigned to an address."},"example":{"es":"En la tanda del 2026-10-08, el mint del registro y los clones la tienen revocada. USDC la tiene activa.","en":"In the 2026-10-08 batch, the registry mint and the clones have it revoked. USDC has it active."},"doesNotConclude":{"es":"Revocada no identifica el mint, no demuestra que el proyecto sea legítimo y no dice nada de la demanda ni de la liquidez. Un campo no disponible no se rellena como revocada.","en":"Revoked does not identify the mint, does not show that the project is legitimate, and says nothing about demand or liquidity. An unavailable field is not filled in as revoked."}},{"id":"autoridad-congelacion","term":{"es":"Autoridad de congelación","en":"Freeze authority"},"means":{"es":"Permiso para congelar cuentas de ese token. Revocada quita ese permiso concreto en la lectura. Activa significa que sigue asignado.","en":"Permission to freeze accounts of that token. “Revoked” means that specific permission was removed at the time of reading. Active means it is still assigned."},"example":{"es":"En la misma tanda, el mint del registro la tiene revocada y USDC la tiene activa, asignada a una dirección que la ficha muestra.","en":"In the same batch, the registry mint has it revoked and USDC has it active, assigned to an address the card shows."},"doesNotConclude":{"es":"No es una garantía ni una prueba de identidad. Que no haya este permiso no impide otras limitaciones del token.","en":"It is not a guarantee or proof of identity. The absence of this permission does not rule out other restrictions on the token."}},{"id":"metadatos-mutables","term":{"es":"Metadatos mutables","en":"Mutable metadata"},"means":{"es":"Si hay una autoridad de actualización o is_mutable es verdadero, el nombre, el símbolo o la imagen pueden cambiar. «No mutables en las fuentes leídas» describe esas fuentes en esa fecha.","en":"If there is an update authority or is_mutable is true, the name, symbol, or image can change. “Not mutable in the sources read” describes those sources on that date."},"example":{"es":"El mint del registro, el 2026-10-08, queda como no mutable en las fuentes leídas. USDC tiene is_mutable verdadero en Metaplex.","en":"The registry mint, on 2026-10-08, is recorded as not mutable in the sources read. USDC has is_mutable true in Metaplex."},"doesNotConclude":{"es":"Que no se puedan cambiar en esa lectura no demuestra legitimidad. Que se puedan cambiar no es, por sí solo, una suplantación.","en":"That they cannot be changed in that reading does not show legitimacy. That they can be changed is not, by itself, impersonation."}},{"id":"desconocido","term":{"es":"Desconocido y no disponible","en":"Unknown and unavailable"},"means":{"es":"No disponible significa que esa llamada no dejó un dato utilizable. Desconocido es lo que no se leyó. Ninguno de los dos es un valor comprobado.","en":"Unavailable means that call did not leave a usable fact. Unknown is what was not read. Neither one is a value read on-chain."},"example":{"es":"En las cinco fichas del 2026-10-08, getTokenLargestAccounts respondió HTTP 429. La muestra de cuentas con tokens queda en no disponible. No es concentración cero.","en":"On all five cards from 2026-10-08, getTokenLargestAccounts returned HTTP 429. The token account sample stays unavailable. It is not zero concentration."},"doesNotConclude":{"es":"No se convierte en cero, en autoridad revocada ni en metadatos inmutables. Una ficha parcial tampoco anula los campos que sí se leyeron en la cadena.","en":"It does not become zero, a revoked authority, or immutable metadata. A partial card also does not cancel the fields that were read on-chain."}},{"id":"curva-pump","term":{"es":"Curva de Pump.fun","en":"Pump.fun curve"},"means":{"es":"Si la cuenta derivada es del programa de la curva, Verify lee sus campos públicos. El avance clásico es un cálculo inferido, no un campo de la cuenta. Si no hay curva, no se rellenan con cero las cantidades de la curva (Pump.fun lo llama ‘reserves’).","en":"If the derived account belongs to the curve program, Verify reads its public fields. Classic progress is an inferred calculation, not a field of the account. If there is no curve, the curve amounts (Pump.fun calls these ‘reserves’) are not filled in with zero."},"example":{"es":"El 2026-10-08 el mint del registro tiene avance inferido 1,74. Los clones tienen 0,00 inferido porque la cantidad real de la curva coincide con la inicial documentada. USDC no es una curva: el avance queda en no aplica.","en":"On 2026-10-08 the registry mint has inferred progress 1.74. The clones have inferred 0.00 because the real curve amount matches the documented initial amount. USDC is not a curve: progress stays not applicable."},"doesNotConclude":{"es":"El avance no dice qué hacer. 0,00 inferido no significa que faltara la cuenta. Esta misión no simula un intercambio.","en":"Progress does not say what to do. Inferred 0.00 does not mean the account was missing. This mission does not simulate a swap."}},{"id":"reserva-real","term":{"es":"Cantidad real de la curva","en":"Real curve amount"},"means":{"es":"Campo real_token_reserves o real_quote_reserves de la cuenta de la curva, en unidades mínimas. Es distinto de la cantidad virtual de la curva.","en":"The real_token_reserves or real_quote_reserves field of the curve account, in base units. It is different from the virtual curve amount."},"example":{"es":"En los clones del 2026-10-08, la cantidad real de tokens de la curva coincide con 793100000000000, la inicial documentada de la curva clásica. Por eso el avance inferido es 0,00.","en":"On the 2026-10-08 clones, the real curve amount of tokens matches 793100000000000, the documented initial amount of the classic curve. That is why inferred progress is 0.00."},"doesNotConclude":{"es":"No es una auditoría de fondos ni un saldo que esta página calcule como retirable. Si el campo no está, no se inventa un cero.","en":"It is not an audit of funds, and this page does not compute it as a withdrawable balance. If the field is absent, a zero is not invented."}},{"id":"reserva-virtual","term":{"es":"Cantidad virtual de la curva","en":"Virtual curve amount"},"means":{"es":"Campo virtual_token_reserves o virtual_quote_reserves. La ficha lo separa de la cantidad real de la curva. En la curva clásica, y con la quote por defecto, la cantidad quote va en lamports.","en":"The virtual_token_reserves or virtual_quote_reserves field. The card keeps it apart from the real curve amount. On the classic curve, and with the default quote, the quote amount is in lamports."},"example":{"es":"La ficha del mint del registro, el 2026-10-08, muestra la cantidad virtual y la cantidad real de tokens de la curva como números distintos, cada una con su estado.","en":"The registry mint card, on 2026-10-08, shows the virtual and the real curve amounts of tokens as different numbers, each with its own status."},"doesNotConclude":{"es":"La cantidad virtual de la curva no es una cantidad retirable. Sumarla con la real no crea una única cantidad disponible.","en":"The virtual curve amount is not the withdrawable balance. Adding it to the real curve amount does not create one available pool."}},{"id":"suplantacion","term":{"es":"Posible suplantación","en":"Possible impersonation"},"means":{"es":"Señal de Verify: el nombre, el símbolo, la imagen o un enlace coinciden con el registro curado y el mint es otro. La coincidencia no atribuye intención.","en":"A Verify signal: the name, symbol, image, or a link matches the curated registry and the mint is a different one. The match does not attribute intent."},"example":{"es":"Las fichas de Hhq4ffySVX3UQqSowjhP1Lwa8YuJDf7iH2hYWvVHTuEf, DjEjb6bxQ3Hjej9CzUAVeRqyt7k1tevHgcS37t41PUhQ y 3Zi6p6wzYZYKyuHdBhsDfb2pRR7XTfTfLKkXL7rwpump, del 2026-10-08, llevan esa señal. USDC no.","en":"The 2026-10-08 cards for Hhq4ffySVX3UQqSowjhP1Lwa8YuJDf7iH2hYWvVHTuEf, DjEjb6bxQ3Hjej9CzUAVeRqyt7k1tevHgcS37t41PUhQ, and 3Zi6p6wzYZYKyuHdBhsDfb2pRR7XTfTfLKkXL7rwpump carry that signal. USDC does not."},"doesNotConclude":{"es":"No es una sentencia ni una prueba de lo que alguien quiso hacer. Un nombre parecido, por sí solo, tampoco sustituye a leer la dirección.","en":"It is not a verdict or proof of what someone meant to do. A similar name, by itself, also does not replace reading the address."}},{"id":"titular","term":{"es":"Titular y persona","en":"Account owner and person"},"means":{"es":"Una dirección guardada en una cuenta, como el creator de la curva, es un campo público. No identifica a una persona ni a un titular jurídico.","en":"An address stored on an account, such as the curve creator, is a public field. It does not identify a person or a legal owner."},"example":{"es":"La ficha del mint del registro anota el creator de la curva y dice que esa pubkey no identifica a una persona.","en":"The registry mint card records the curve creator and says that pubkey does not identify a person."},"doesNotConclude":{"es":"No se puede pasar de una dirección a un nombre de persona con esta misión. No pide datos personales.","en":"This mission cannot turn an address into a person's name. It does not ask for personal data."}},{"id":"holder","term":{"es":"‘Holder’ (término del sector)","en":"‘Holder’ (industry term)"},"means":{"es":"‘Holder’ (término del sector): cuenta que tiene tokens. No implica derechos ni comunidad de inversores.","en":"‘Holder’ (industry term): an account that holds tokens. It implies no rights and no investor community."},"example":{"es":"Cuenta que tiene tokens.","en":"An account that holds tokens."},"doesNotConclude":{"es":"No implica derechos ni comunidad de inversores.","en":"It implies no rights and no investor community."}},{"id":"ficha","term":{"es":"Ficha","en":"Card"},"means":{"es":"Una ficha es la lectura fechada de una dirección. No se actualiza sola y no es una auditoría.","en":"A card is the dated reading of an address. It does not update itself and it is not an audit."},"example":{"es":"Las fichas de esta misión llevan fecha 2026-10-08 o, si se releyeron, 2026-10-09.","en":"The cards in this mission are dated 2026-10-08 or, if they were read again, 2026-10-09."},"doesNotConclude":{"es":"Una ficha no dice qué hacer con el token ni quién es una persona.","en":"A card does not say what to do with the token or who a person is."}},{"id":"censo","term":{"es":"Censo","en":"Census"},"means":{"es":"Un censo sería la lista de todas las cuentas. Estas fichas no lo son: leen algunas cuentas y no rellenan el resto con un cero.","en":"A census would be the list of every account. These cards are not that: they read some accounts and do not fill the rest in with a zero."},"example":{"es":"La ficha oficial del 2026-10-09 lee la curva, la creadora y la cuenta personal publicada, y dice que eso no es un censo.","en":"The official card from 2026-10-09 reads the curve, the creator, and the published personal account, and it says that is not a census."},"doesNotConclude":{"es":"Que no sea un censo no convierte el dato que falta en un cero.","en":"Not being a census does not turn the missing fact into a zero."}},{"id":"comision","term":{"es":"Comisión","en":"Fee"},"means":{"es":"Regla de un conector sobre un intercambio. Esta misión no calcula comisiones ni intercambios.","en":"A fee rule set by a connector (for example a DEX or an aggregator) on a swap. This mission does not calculate fees or swaps."},"example":{"es":"Las fichas usadas aquí leen campos públicos de la curva. No incluyen un cálculo de comisión, y esta página no lo añade.","en":"The cards used here read public curve fields. They do not include a fee calculation, and this page does not add one."},"doesNotConclude":{"es":"Una comisión no identifica el mint, no convierte la cantidad virtual de la curva en un saldo retirable y no es un resultado prometido.","en":"A fee does not identify the mint, does not turn the virtual curve amount into a withdrawable balance, and is not a promised result."}},{"id":"moneda-estable","term":{"es":"Moneda estable","en":"Stablecoin"},"means":{"es":"Un token pensado para seguir una moneda de curso. En estas fichas, USDC es el ejemplo. TOKEN A es un meme: no tiene esa función.","en":"A token meant to follow a currency. On these cards, USDC is the example. TOKEN A is a meme: it does not have that role."},"example":{"es":"El 2026-10-09, USDC tiene la emisión y la congelación activas. TOKEN A las tiene cerradas. El mismo permiso no se lee igual en los dos.","en":"On 2026-10-09, USDC has mint and freeze permissions active. TOKEN A has them closed. The same permission is not read the same way on both."},"doesNotConclude":{"es":"No dice qué hacer con el token. Un permiso activo en USDC no es una acusación, y uno cerrado en TOKEN A no es una garantía.","en":"It does not say what to do with the token. An active permission on USDC is not an accusation, and a closed one on TOKEN A is not a guarantee."}},{"id":"cuenta-tecnica","term":{"es":"Cuenta técnica y pool","en":"Technical account and pool"},"means":{"es":"Una cuenta técnica es la de un programa, como la curva. Un pool es la cuenta donde un programa de intercambio guarda tokens. Ninguna de las dos es la cuenta de una persona.","en":"A technical account belongs to a program, such as the curve. A pool is the account where an exchange program holds tokens. Neither one is a person's account."},"example":{"es":"En TOKEN A, el 2026-10-09, 3shQFExQ3rpFL6GaXPRQNTMYazVHmTvRfuazfv62toAE es la cuenta de la curva, con el 98,6122 %. complete es falso: no es un pool.","en":"On TOKEN A, on 2026-10-09, 3shQFExQ3rpFL6GaXPRQNTMYazVHmTvRfuazfv62toAE is the curve account, with 98.6122%. complete is false: it is not a pool."},"doesNotConclude":{"es":"Un saldo alto no convierte esa cuenta en una persona. Que no sea un pool no dice qué hacer con el token.","en":"A large balance does not turn that account into a person. Not being a pool does not say what to do with the token."}},{"id":"consulta-fallida","term":{"es":"Consulta fallida","en":"Failed query"},"means":{"es":"Se pidió el dato y el servicio no dejó una respuesta usable. No es un cero y no es una ausencia.","en":"The fact was asked for and the service left no usable answer. It is not a zero and it is not an absence."},"example":{"es":"USDC, el 2026-10-09, pidió getTokenLargestAccounts y recibió HTTP 429. La muestra queda no disponible.","en":"USDC, on 2026-10-09, asked for getTokenLargestAccounts and got HTTP 429. The sample stays unavailable."},"doesNotConclude":{"es":"No se rellena con cero ni se dice que no existan cuentas.","en":"It is not filled in with zero, and it does not say that accounts do not exist."}},{"id":"ausente-comprobado","term":{"es":"Ausente comprobado","en":"Confirmed absent"},"means":{"es":"Se pidió el dato, la respuesta llegó y el dato no está. No es un fallo del servicio.","en":"The fact was asked for, the answer arrived, and the fact is not there. It is not a service failure."},"example":{"es":"En TOKEN A, el 2026-10-09, la cuenta de metadatos de Metaplex se consultó. La consulta respondió y el valor está vacío: no hay esa cuenta.","en":"On TOKEN A, on 2026-10-09, the Metaplex metadata account was queried. The query was answered and the value is empty: that account is not there."},"doesNotConclude":{"es":"No es un HTTP 429 ni un dato que esta lectura olvidó pedir.","en":"It is not an HTTP 429, and it is not a fact this reading forgot to ask for."}},{"id":"no-consultado","term":{"es":"No consultado","en":"Not queried"},"means":{"es":"Esta lectura no pidió ese dato. No es un fallo ni una ausencia.","en":"This reading did not ask for that fact. It is not a failure and it is not an absence."},"example":{"es":"La ficha de TOKEN A del 2026-10-09 lee tres cuentas y no pide el ranking de getTokenLargestAccounts. El máximo fuera de la muestra no se calcula.","en":"The TOKEN A card from 2026-10-09 reads three accounts and does not ask for the getTokenLargestAccounts ranking. The maximum outside the sample is not calculated."},"doesNotConclude":{"es":"No se convierte en cero ni en la consulta fallida de otra ficha.","en":"It does not become zero, and it does not become the failed query on another card."}}],"cardDate":"2026-10-08"};
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
  holders: { es: "Muestra de cuentas con STUBX", en: "Token account sample" },
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
