# Ficha ORVUPI Verify

> ORVUPI Verify muestra datos on-chain públicos. No garantiza que un token sea seguro.

- Id: `a641ac2e0f9b884e4202b24e727dff06f2f28919209a3bc9b830104e47163c2c`
- Reglas: `0.1.0`
- Red: `mainnet-beta`
- RPC: `https://solana-rpc.publicnode.com`
- Mint: `4XRbnGgay2XpqJ1F5jGPQ9pRh1JSX12RPCPJASMJU5JW`
- Creada (UTC): 2026-10-16T18:45:52.334Z
- Slot de referencia: 457742150
- Parcial: sí
- Mint soportado: sí

Esta exportación no se actualiza sola. Una consulta nueva crea otro id.

## Hallazgos

- **ok** · Autoridad de emisión revocada. La opción del mint está en 0. Eso quita ese permiso concreto. No es una auditoría ni una recomendación. Que no haya autoridad de congelación reduce ese permiso concreto; no demuestra que el proyecto sea legítimo.
- **ok** · Autoridad de congelación revocada. La opción del mint está en 0. Eso quita ese permiso concreto. No es una auditoría ni una recomendación. Que no haya autoridad de congelación reduce ese permiso concreto; no demuestra que el proyecto sea legítimo.
- **atención** · Metadatos mutables. Hay una autoridad de actualización o is_mutable es verdadero. El nombre, el símbolo o la imagen pueden cambiar.
- **riesgo** · Posible suplantación. Posible suplantación: el nombre, el símbolo, la imagen o un enlace coinciden con un token del registro curado, pero el mint es otro. La coincidencia no atribuye intención.
- **atención** · Muestra de cuentas con tokens no disponible. No hubo lista de cuentas. No se interpreta como concentración cero.

## Identidad

### Programa propietario

TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA. Estado: verificado. Fuente: getAccountInfo · cuenta 4XRbnGgay2XpqJ1F5jGPQ9pRh1JSX12RPCPJASMJU5JW · slot 457742152 · 2026-10-16T18:45:52.735Z · Cuenta del mint, encoding base64, decodificada en local..

### Estándar

spl-token. Estado: verificado. Fuente: getAccountInfo · cuenta 4XRbnGgay2XpqJ1F5jGPQ9pRh1JSX12RPCPJASMJU5JW · slot 457742152 · 2026-10-16T18:45:52.735Z · Cuenta del mint, encoding base64, decodificada en local..

### Decimales

9 decimales. Estado: verificado. Fuente: getAccountInfo · cuenta 4XRbnGgay2XpqJ1F5jGPQ9pRh1JSX12RPCPJASMJU5JW · slot 457742152 · 2026-10-16T18:45:52.735Z · Cuenta del mint, encoding base64, decodificada en local.. Nota: Suministro leído de los bytes del mint (u64 little-endian en el offset 36). Coincide con getTokenSupply (amount, no uiAmount).

### Suministro (unidades mínimas)

1029314281190085282 unidades mínimas. Estado: verificado. Fuente: getAccountInfo · cuenta 4XRbnGgay2XpqJ1F5jGPQ9pRh1JSX12RPCPJASMJU5JW · slot 457742152 · 2026-10-16T18:45:52.735Z · Cuenta del mint, encoding base64, decodificada en local.. Nota: Suministro leído de los bytes del mint (u64 little-endian en el offset 36). Coincide con getTokenSupply (amount, no uiAmount).

### Suministro

1029314281.190085282 tokens. Estado: verificado. Fuente: getAccountInfo · cuenta 4XRbnGgay2XpqJ1F5jGPQ9pRh1JSX12RPCPJASMJU5JW · slot 457742152 · 2026-10-16T18:45:52.735Z · Cuenta del mint, encoding base64, decodificada en local.. Nota: Calculado con enteros a partir de las unidades mínimas. No se usa uiAmount.

### Nombre on-chain

USD Coin. Estado: verificado. Fuente: getAccountInfo · cuenta ETqX9ZhnoKKHKrzx5KEoV88QbXJ5y91aQ6Fg1TXmmNet · slot 457742153 · 2026-10-16T18:45:53.136Z · PDA Metaplex: semillas metadata, programa de metadatos y mint..

### Símbolo on-chain

USDC. Estado: verificado. Fuente: getAccountInfo · cuenta ETqX9ZhnoKKHKrzx5KEoV88QbXJ5y91aQ6Fg1TXmmNet · slot 457742153 · 2026-10-16T18:45:53.136Z · PDA Metaplex: semillas metadata, programa de metadatos y mint..

### URI

https://node1.irys.xyz/7e0WxcoM7pmTcVif_n-kowbUAy0sAUcmWY-lbe-rWEk. Estado: verificado. Fuente: getAccountInfo · cuenta ETqX9ZhnoKKHKrzx5KEoV88QbXJ5y91aQ6Fg1TXmmNet · slot 457742153 · 2026-10-16T18:45:53.136Z · PDA Metaplex: semillas metadata, programa de metadatos y mint..

### Nombre en el JSON

—. Estado: no_disponible. Fuente: GET · slot — · 2026-10-16T18:45:57.635Z · No se descarga la URI del creador. Solo entran pasarelas IPFS o Arweave de la lista blanca.. Nota: Sin respuesta utilizable. No se interpreta como autoridad revocada, como inmutabilidad ni como cantidad cero.

### Símbolo en el JSON

—. Estado: no_disponible. Fuente: GET · slot — · 2026-10-16T18:45:57.635Z · No se descarga la URI del creador. Solo entran pasarelas IPFS o Arweave de la lista blanca.. Nota: Sin respuesta utilizable. No se interpreta como autoridad revocada, como inmutabilidad ni como cantidad cero.

### Imagen

—. Estado: no_disponible. Fuente: GET · slot — · 2026-10-16T18:45:57.635Z · No se descarga la URI del creador. Solo entran pasarelas IPFS o Arweave de la lista blanca.. Nota: Sin respuesta utilizable. No se interpreta como autoridad revocada, como inmutabilidad ni como cantidad cero.

### sha256 de la imagen

—. Estado: no_disponible. Nota: El JSON no trae imagen o no se pudo leer.

### Web

—. Estado: no_disponible. Fuente: GET · slot — · 2026-10-16T18:45:57.635Z · No se descarga la URI del creador. Solo entran pasarelas IPFS o Arweave de la lista blanca.. Nota: Sin respuesta utilizable. No se interpreta como autoridad revocada, como inmutabilidad ni como cantidad cero.

### Red social

—. Estado: no_disponible. Fuente: GET · slot — · 2026-10-16T18:45:57.635Z · No se descarga la URI del creador. Solo entran pasarelas IPFS o Arweave de la lista blanca.. Nota: Sin respuesta utilizable. No se interpreta como autoridad revocada, como inmutabilidad ni como cantidad cero.

### Telegram

—. Estado: no_disponible. Fuente: GET · slot — · 2026-10-16T18:45:57.635Z · No se descarga la URI del creador. Solo entran pasarelas IPFS o Arweave de la lista blanca.. Nota: Sin respuesta utilizable. No se interpreta como autoridad revocada, como inmutabilidad ni como cantidad cero.

### Descripción (texto del JSON, no de Verify)

—. Estado: no_disponible. Fuente: GET · slot — · 2026-10-16T18:45:57.635Z · No se descarga la URI del creador. Solo entran pasarelas IPFS o Arweave de la lista blanca.. Nota: Sin respuesta utilizable. No se interpreta como autoridad revocada, como inmutabilidad ni como cantidad cero.


## Permisos

### Autoridad de emisión

{&quot;state&quot;:&quot;revocada&quot;,&quot;address&quot;:null}. Estado: verificado. Fuente: getAccountInfo · cuenta 4XRbnGgay2XpqJ1F5jGPQ9pRh1JSX12RPCPJASMJU5JW · slot 457742152 · 2026-10-16T18:45:52.735Z · Cuenta del mint, encoding base64, decodificada en local.. Nota: COption: 0 revocada, 1 activa. Otro valor no se trata como revocada.

### Autoridad de congelación

{&quot;state&quot;:&quot;revocada&quot;,&quot;address&quot;:null}. Estado: verificado. Fuente: getAccountInfo · cuenta 4XRbnGgay2XpqJ1F5jGPQ9pRh1JSX12RPCPJASMJU5JW · slot 457742152 · 2026-10-16T18:45:52.735Z · Cuenta del mint, encoding base64, decodificada en local.. Nota: COption: 0 revocada, 1 activa. Otro valor no se trata como revocada.

### Update authority (Metaplex)

5APo1VNSS4Nkof5NctXvh8yF53vGrTX5kUku8LnDoFzt. Estado: verificado. Fuente: getAccountInfo · cuenta ETqX9ZhnoKKHKrzx5KEoV88QbXJ5y91aQ6Fg1TXmmNet · slot 457742153 · 2026-10-16T18:45:53.136Z · PDA Metaplex: semillas metadata, programa de metadatos y mint..

### Metadatos Metaplex mutables

true. Estado: verificado. Fuente: getAccountInfo · cuenta ETqX9ZhnoKKHKrzx5KEoV88QbXJ5y91aQ6Fg1TXmmNet · slot 457742153 · 2026-10-16T18:45:53.136Z · PDA Metaplex: semillas metadata, programa de metadatos y mint.. Nota: Campo is_mutable de Metaplex. false no demuestra que el proyecto sea legítimo.

### Update authority (Token-2022)

—. Estado: no_aplica. Fuente: getAccountInfo · cuenta 4XRbnGgay2XpqJ1F5jGPQ9pRh1JSX12RPCPJASMJU5JW · slot 457742152 · 2026-10-16T18:45:52.735Z · Cuenta del mint, encoding base64, decodificada en local.. Nota: El mint no trae la extensión TokenMetadata.

### Extensiones

[]. Estado: verificado. Fuente: getAccountInfo · cuenta 4XRbnGgay2XpqJ1F5jGPQ9pRh1JSX12RPCPJASMJU5JW · slot 457742152 · 2026-10-16T18:45:52.735Z · Cuenta del mint, encoding base64, decodificada en local.. Nota: TLV a partir del byte 166 (relleno hasta 165, tipo de cuenta en 165). Una extensión que no sale en la lista no está en la cuenta.


## Distribución

### Denominador

1029314281190085282 unidades mínimas. Estado: verificado. Fuente: getAccountInfo · cuenta 4XRbnGgay2XpqJ1F5jGPQ9pRh1JSX12RPCPJASMJU5JW · slot 457742152 · 2026-10-16T18:45:52.735Z · Cuenta del mint, encoding base64, decodificada en local.. Nota: Denominador común de los porcentajes.

### Muestra de mayores cuentas

—. Estado: no_disponible. Fuente: getTokenLargestAccounts · cuenta 4XRbnGgay2XpqJ1F5jGPQ9pRh1JSX12RPCPJASMJU5JW · slot — · 2026-10-16T18:45:57.589Z · HTTP 429. Nota: Sin respuesta utilizable. No se interpreta como autoridad revocada, como inmutabilidad ni como cantidad cero.

### Mayor cuenta sin etiqueta técnica

—. Estado: no_disponible. Nota: Sin respuesta utilizable. No se interpreta como autoridad revocada, como inmutabilidad ni como cantidad cero.


## Mercado

### Módulo

no_disponible. Estado: verificado. Fuente: getAccountInfo · cuenta 8chzqRLtJsuec2JuhbHJRGKuxuvrGtb3myonyGD8PYaB · slot 457742155 · 2026-10-16T18:45:53.536Z · PDA derivada con las semillas bonding-curve y el mint, programa Pump.fun.. Nota: No hay cuenta en la PDA. El módulo de otros mercados no está en esta versión. La ausencia no se rellena con una cantidad de cero.

### PDA de la curva

8chzqRLtJsuec2JuhbHJRGKuxuvrGtb3myonyGD8PYaB. Estado: verificado. Fuente: getAccountInfo · cuenta 8chzqRLtJsuec2JuhbHJRGKuxuvrGtb3myonyGD8PYaB · slot 457742155 · 2026-10-16T18:45:53.536Z · PDA derivada con las semillas bonding-curve y el mint, programa Pump.fun.. Nota: PDA derivada. La cuenta no existe en el estado consultado.

### Cuenta de curva presente

false. Estado: verificado. Fuente: getAccountInfo · cuenta 8chzqRLtJsuec2JuhbHJRGKuxuvrGtb3myonyGD8PYaB · slot 457742155 · 2026-10-16T18:45:53.536Z · PDA derivada con las semillas bonding-curve y el mint, programa Pump.fun..

### complete

—. Estado: no_aplica. Fuente: getAccountInfo · cuenta 8chzqRLtJsuec2JuhbHJRGKuxuvrGtb3myonyGD8PYaB · slot 457742155 · 2026-10-16T18:45:53.536Z · PDA derivada con las semillas bonding-curve y el mint, programa Pump.fun.. Nota: No hay curva.

### Reserva virtual de tokens

—. Estado: no_aplica. Nota: No hay curva.

### Reserva virtual quote

—. Estado: no_aplica. Nota: No hay curva.

### Reserva real de tokens

—. Estado: no_aplica. Nota: No hay curva.

### Reserva real quote

—. Estado: no_aplica. Nota: No hay curva.

### Suministro en la cuenta de la curva

—. Estado: no_aplica. Nota: No hay curva.

### Creator de la cuenta

—. Estado: no_aplica. Nota: No hay curva.

### Mint quote

—. Estado: no_aplica. Nota: No hay curva.

### Avance de la curva clásica

—. Estado: no_aplica. Nota: No hay curva. No se rellena con cero.


## Autenticidad

### En el registro curado

false. Estado: verificado. Fuente: local · slot — · 2026-10-16T18:45:52.334Z · Registro curado verify/registry/canonical.json. Nota: Comparación local. No consulta una red para decidir el registro.

### Id del registro

—. Estado: no_aplica. Fuente: local · slot — · 2026-10-16T18:45:52.334Z · Registro curado..

### Señales

[&quot;nombre «USD Coin» incluye USD Coin/USDC&quot;,&quot;símbolo «USDC» incluye USD Coin/USDC&quot;]. Estado: verificado. Fuente: local · slot — · 2026-10-16T18:45:52.334Z · Nombre, símbolo, imagen y enlaces frente al registro..

### Lectura

Posible suplantación: el nombre, el símbolo, la imagen o un enlace coinciden con un token del registro curado, pero el mint es otro. La coincidencia no atribuye intención.. Estado: inferido. Fuente: local · slot — · 2026-10-16T18:45:52.334Z · Regla de autenticidad de rulesVersion..


## Limitaciones

- No es una auditoría ni una recomendación. Que no haya autoridad de congelación reduce ese permiso concreto; no demuestra que el proyecto sea legítimo.
- La muestra de cuentas con tokens tiene como máximo 20. No es un censo ni un recuento de personas. Una cuenta puede ser un custodio.
- Si los slots de las consultas no coinciden, no es una instantánea atómica.
- ORVUPI Verify no firma, no envía transacciones y no custodia claves.
- Cada consulta nueva produce un id nuevo. Esta ficha no se actualiza sola.
- Slots observados: 457742150, 457742152, 457742153, 457742155, 457742159.
- No hay cuenta de curva de Pump.fun en la PDA derivada. El módulo de otros mercados no está disponible. La ausencia no se anota como cantidad 0.
- getTokenLargestAccounts: HTTP 429
- contenido de la URI: No se descarga la URI del creador. Solo entran pasarelas IPFS o Arweave de la lista blanca.

## Cómo reproducir un campo

Cada campo de arriba lleva método, cuenta, slot y hora. Para repetir una lectura de cuenta:

```
curl https://solana-rpc.publicnode.com -H 'content-type: application/json' -d '{"jsonrpc":"2.0","id":1,"method":"getAccountInfo","params":["4XRbnGgay2XpqJ1F5jGPQ9pRh1JSX12RPCPJASMJU5JW",{"encoding":"base64","commitment":"confirmed"}]}'
```

El detalle de offsets y de la curva está en `verify/README.md`.
