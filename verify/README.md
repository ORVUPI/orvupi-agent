# ORVUPI Verify

Componente **aparte** del agente de este repositorio. El agente sigue sin contactar la red principal ni ningún RPC, sin claves y sin firmar. Verify, si se ejecuta a propósito, solo **lee** datos públicos de `mainnet-beta` y escribe una ficha. No firma, no envía transacciones, no abre wallets y no custodia claves.

No es consejo de inversión ni una garantía. ORVUPI Verify es la identidad actual de la herramienta. La CLI conserva textos heredados en algunas salidas; esta actualización de documentación no cambia el código ni los datos que consulta.

> ORVUPI Verify muestra datos on-chain públicos. No es consejo de inversión ni garantiza que un token sea seguro.

El registro curado y los ejemplos fechados (2026-10-16) usan USDC como referencia neutra y copias reales que se llaman «USD Coin». No son un registro de ORVUPI: ORVUPI todavía no tiene contrato. Véase [la guía de transición](../docs/ORVUPI.md).

No hay puntuación de compra o venta ni lenguaje de precio. Los hallazgos son informativos: `ok`, `atención` o `riesgo`, cada uno con su motivo.

## Qué lee

Dado un mint SPL o Token-2022:

- autoridad de emisión y de congelación (activa, revocada o no decodificable);
- metadatos on-chain (extensión TokenMetadata y, si existe, la cuenta Metaplex) y si se pueden actualizar;
- suministro y decimales, en unidades mínimas;
- URI y el JSON público (nombre, símbolo, imagen, web, redes);
- si hay cuenta de curva de Pump.fun en la PDA derivada, y sus campos públicos;
- una muestra de como máximo 20 cuentas grandes y el porcentaje sobre el suministro verificado;
- comparación local con `verify/registry/canonical.json` (registro de ejemplo con USDC; no contiene una dirección de ORVUPI).

Cada campo lleva método, cuenta, slot u hora UTC. Una consulta nueva crea otro `id` (sha256 del cuerpo canónico). La ficha no se actualiza sola.

Que un mint no esté en el registro no significa que sea falso. Que el nombre, la imagen o un enlace coincidan con el registro y el mint sea otro es una señal de posible suplantación: no atribuye intención.

## Cómo ejecutarlo

Hace falta Node.js 22. No añade dependencias.

```bash
npm ci
npm run verify -- <mint>
npm run verify -- <mint> --format md
npm run verify -- <mint> --format html --out directorio
```

Sin `--format` y sin `--out`, escribe JSON por la salida estándar. Con `--out` y sin `--format`, escribe `<mint>.json`, `<mint>.md` y `<mint>.html`.

`RPC_URL` sustituye el endpoint por defecto (`https://solana-rpc.publicnode.com`). `RPC_FALLBACK_URL` sustituye el servicio de respaldo (`https://api.mainnet-beta.solana.com` en `verify/policy/limits.json`). Tiene que ser `https`. Esta versión rechaza un host que contenga `devnet` o `testnet`. Si la URL lleva usuario, contraseña o query, la ficha solo guarda el origen. Un HTTP 403, un 429 o un tiempo agotado del primero pasa al segundo. Un error sobre la cuenta no pasa.

La página `web/v2/verify/` usa el mismo lector en el navegador, sin backend: solo lectura, con esos dos orígenes en `connect-src` y en ningún otro dominio. No guarda la dirección consultada. `VERIFY_SMOKE=1` lanza un humo opcional contra mainnet; la CI no lo activa.

Límites en `verify/policy/limits.json`: timeout 8 s, 2 reintentos, retroceso exponencial, pausa mínima de 400 ms entre peticiones. Métodos permitidos, y solo estos: `getAccountInfo`, `getMultipleAccounts`, `getTokenSupply`, `getTokenLargestAccounts`, `getSlot`. Cualquier otro se rechaza. No hay telemetría ni datos personales: no se envían cookies, ni se guarda la IP de quien ejecuta el comando.

`npm run verify:scan` recorre `verify/` (salvo `test/` y `examples/`) y sale con error si aparece un marcador de firma, de envío o de clave.

## Cómo reproducir cada dato

Sustituye `MINT` y usa el mismo `commitment: confirmed`. El slot y la hora de la ficha dicen qué estado se leyó. Si los slots no coinciden, no es una instantánea atómica.

Cuenta del mint:

```bash
curl https://api.mainnet-beta.solana.com \
  -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"getAccountInfo","params":["MINT",{"encoding":"base64","commitment":"confirmed"}]}'
```

Sobre esos bytes, en little-endian:

| Offset | Campo |
| --- | --- |
| 0 | `u32` de la autoridad de emisión: `0` revocada, `1` activa. Otro valor no se trata como revocada. |
| 4 | 32 bytes de esa autoridad, solo si el tag es `1`. |
| 36 | `u64` de suministro en unidades mínimas. |
| 44 | decimales (`u8`). |
| 45 | inicializado: tiene que ser `1`. |
| 46 | `u32` de la autoridad de congelación, igual que la de emisión. |
| 82–164 | relleno a cero en Token-2022. |
| 165 | tipo de cuenta. `1` es mint. |
| 166 en adelante | TLV: `u16` tipo, `u16` longitud, valor. |

`getTokenSupply` tiene que devolver el mismo `amount` y los mismos decimales. Se ignora `uiAmount`. Si no cuadra, no hay porcentajes.

El suministro mostrado con decimales es la división entera de las unidades mínimas. No se usa coma flotante.

Extensiones que se decodifican: `TransferFeeConfig` (1), `MintCloseAuthority` (3), `DefaultAccountState` (6), `NonTransferable` (9), `PermanentDelegate` (12), `TransferHook` (14), `MetadataPointer` (18) y `TokenMetadata` (19). Cualquier otra sale como no soportada. Si el TLV no se puede separar, no se afirma qué falta.

TokenMetadata (tipo 19): autoridad de actualización (32 bytes; todos a cero = no hay), nombre, símbolo y URI como cadenas Borsh. La ficha usa esa URI antes que la de Metaplex.

Metaplex, solo si la cuenta existe. PDA con semillas `metadata`, el programa `metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s` y el mint. El byte 0 tiene que ser `4`. Siguen la autoridad de actualización, el mint, y las cadenas Borsh de nombre, símbolo y URI. `is_mutable` se lee después de la comisión y de los creadores. `false` no demuestra que el proyecto sea legítimo.

El JSON de la URI no se pide en el host que elija el creador. Solo se descarga un CID por las pasarelas `gateway.pinata.cloud`, `dweb.link`, `w3s.link` e `ipfs.io`, o un id de Arweave por `arweave.net`. Si la URI ya es una de esas pasarelas, se prueba esa primero. Un 429 pasa a la siguiente. Las redirecciones se siguen a mano, con tope de 3, y se rechazan si el destino no es https o cae en una IP privada (también `100.64.0.0/10`, `198.18.0.0/15`, `fc00::/7`, `fe80::/10`, NAT64 `64:ff9b::/96` e IPv4 mapeada). La conexión usa las IP que acaban de pasar esa comprobación: primero las IPv4 y después el resto, en ese orden. Cada intento fija `family` (4 o 6) y `autoSelectFamily: false`. El `lookup` no vuelve a resolver el nombre y llama al callback en la siguiente vuelta, para que el `error` del socket y el de la petición ya tengan listener cuando la conexión falla. Una IPv6 sin ruta (`2001:db8::1`) devuelve `ENETUNREACH` dentro de ese listener; el proceso no se cierra. Si el socket falla, se prueba la siguiente IP. Toda la descarga, reintentos incluidos, tiene un tope con `AbortSignal.timeout`. Node 22.14 no exporta `undici` y no se añade como dependencia. Riesgo que queda: una de esas IP públicas puede ser la del atacante, TLS sigue validando el certificado, y un `fetch` de prueba no usa ese fijado. La CLI se ejecuta a mano, no en la web ni en la CI; no la lances en un servidor con servicios internos https sin autenticar. El sha256 de la imagen es del cuerpo descargado, con tope de bytes y de tiempo en la política.

Si `getTokenLargestAccounts` responde 429, la ficha lee el saldo de la ATA de la curva, el de la creadora si la curva la trae, y el de las cuentas publicadas en `verify/registry/canonical.json` para ese mint. La cuenta `2fS12sTD4TNEEE9MoCEt19brV41UjGdAnaNaxWcmiWvX` está en `verify/registry/canonical.json`, en esta rama. La misma dirección está publicada como cuenta personal del creador en `token.json` de la rama `feat/web-v2` (PR #15); ese archivo no forma parte de este árbol. El saldo se lee en el momento; no se copia una cifra antigua. Si esa cuenta no decodifica, la nota dice que no apareció en esa lectura. Eso no es un censo. El endpoint público `api.mainnet-beta.solana.com` se anota solo como origen; cualquier otra RPC queda como `rpc-configurada`, para no escribir una clave que vaya en la ruta.

Curva de Pump.fun. PDA con semillas `bonding-curve` y el mint, programa `6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P`. Si no hay cuenta, el módulo de otros mercados no está disponible y no se rellena ninguna reserva con cero. Si la hay, el discriminador público es `17b7f83760d8ac60` y el orden del IDL público es:

| Offset | Campo |
| --- | --- |
| 8 | `virtual_token_reserves` (`u64`) |
| 16 | `virtual_quote_reserves` (`u64`) |
| 24 | `real_token_reserves` (`u64`) |
| 32 | `real_quote_reserves` (`u64`) |
| 40 | `token_total_supply` (`u64`) |
| 48 | `complete` (`bool`) |
| 49 | `creator` (32 bytes) |
| 81 | `is_mayhem_mode` (`bool`), si el byte existe |
| 82 | `is_cashback_coin` (`bool`), si el byte existe |
| 83 | `quote_mint` (32 bytes), si caben |

`11111111111111111111111111111111` son 32 bytes a cero. El IDL público usa esa pubkey por defecto cuando la quote es SOL; la reserva quote va en lamports. El avance solo se calcula si el suministro de la cuenta es `1000000000000000` y la reserva real de tokens no pasa de `793100000000000`: `(793100000000000 − reserva real) / 793100000000000`, truncado a 2 decimales hacia cero. Es un valor inferido, no un campo de la cuenta. Si `complete` es verdadero, esta versión no lee el pool posterior.

Muestra de holders: `getTokenLargestAccounts` (como máximo 20) y `getMultipleAccounts` para el propietario. El porcentaje usa el suministro verificado como denominador y trunca a 4 decimales hacia cero. La cuenta asociada de la PDA de la curva se etiqueta como reserva técnica. No es un censo ni un recuento de personas. Si la RPC responde 429, el campo queda en no disponible: no se interpreta como concentración cero.

Registro: comparación en local de nombre, símbolo, CID o URL de imagen, host web y enlace de X con `verify/registry/canonical.json`. No hay otra llamada de red para decidirlo.

## Fichas de ejemplo

Generadas contra la RPC pública el 2026-10-08 y guardadas en [`examples/2026-10-08/`](examples/2026-10-08/). La nota de esa carpeta dice qué no se pudo leer. No son una foto permanente de la cadena.

## Pruebas

`npm test` incluye las pruebas de `verify/test/`, sin red, con fixtures en `verify/test/fixtures/`. Cubren, entre otros, mint revocada, freeze activa, metadatos mutables, nombre o imagen que se parecen a un token curado o se llaman como ORVUPI sin serlo, 429, una cuenta que no es un mint, una cuenta ausente, suministro que no cuadra, una extensión no soportada y texto que hay que escapar en HTML.

Para regenerar los fixtures de laboratorio (no son respuestas de mainnet):

```bash
npm run build
node dist/verify/tools/emit-lab-fixtures.js
```
