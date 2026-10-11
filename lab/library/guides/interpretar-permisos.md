# Interpretar permisos

## Español

Un permiso no es una garantía. La autoridad de emisión, si está activa, puede aumentar el suministro de ese mint. Si la ficha la marca revocada y el campo se leyó en la cadena, ese permiso concreto figura en 0 en esa lectura.

La autoridad de congelación es otro permiso: congelar cuentas de ese token. Revocada lo quita en esa lectura. Activa lo deja asignado a la dirección que muestra la ficha.

En la tanda del 2026-10-08, el mint del registro y los clones tienen las dos autoridades revocadas. USDC las tiene activas. El mismo permiso en dos direcciones no las convierte en el mismo mint. Un permiso revocado tampoco demuestra que el proyecto sea legítimo, ni dice nada de la demanda o de la liquidez.

Los metadatos mutables son otra pieza. Si hay autoridad de actualización o `is_mutable` es verdadero, el nombre, el símbolo o la imagen pueden cambiar. «No mutables en las fuentes leídas» solo cubre esas fuentes y esa fecha. USDC, el mismo día, tiene metadatos mutables y no por eso es un clon de STUBX.

Si un campo está en no disponible, no se rellena como revocada ni como inmutable. Lo desconocido no es lo mismo que lo comprobado.

Un ejemplo hipotético, no leído de la cadena: un token con la emisión revocada puede seguir sin liquidez o sin demanda. El permiso no predice ninguna de las dos cosas.

## English

A permission is not a guarantee. Mint authority, if active, can increase the supply of that mint. If the card marks it revoked and the field was read on-chain, that specific permission is recorded as empty (none) in that reading.

Freeze authority is a different permission: freezing accounts of that token. Revoked removes it in that reading. Active leaves it assigned to the address the card shows.

In the 2026-10-08 batch, the registry mint and the clones have both authorities revoked. USDC has them active. The same permission on two addresses does not make them the same mint. A revoked permission also does not show that the project is legitimate, and it says nothing about demand or liquidity.

Mutable metadata is a separate piece. If there is an update authority or `is_mutable` is true, the name, the symbol, or the image can change. “Not mutable in the sources read” covers only those sources and that date. USDC, on the same day, has mutable metadata and is not thereby a clone of STUBX.

If a field is unavailable, it is not filled in as revoked or as immutable. Unknown is not the same as checked.

A hypothetical example, not read from the chain: a token with mint authority revoked can still have no liquidity and no demand. The permission predicts neither.
