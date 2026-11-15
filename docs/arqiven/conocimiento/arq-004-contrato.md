# Contrato oficial

- id: arq-004
- fecha: 2026-11-15
- estado: revisado: pendiente de Cristian
- origen: web/v2/shared/orvupi-contract.json; web/v2/shared/orvupi-contract.js; web/v2/shared/ia/cards.mjs; README.md; docs/ORVUPI.md

## Fragmento: la única dirección

El único contrato oficial de ORVUPI está en Solana y es Bj6orFgn4UegmXtQ4WHcBsHSjjfgruHcScCSeauW1TyU. Cualquier otra dirección no es ORVUPI. La red en el módulo de la web es `solana`. La nota del JSON dice que se creó el 17 de octubre de 2026 y que la dirección la aprobó el creador. No se documenta aquí ningún contrato anterior.

Origen: `web/v2/shared/orvupi-contract.json`, `web/v2/shared/orvupi-contract.js` y `web/v2/shared/ia/cards.mjs` (ficha `contract`).

## Fragmento: qué hace el código con otra dirección

Si la salida nombra una dirección distinta, la comprobación posterior la bloquea. La ficha en español dice que cualquier otra dirección no es ORVUPI. La página de token del sitio publica esa misma cadena.

Origen: `web/v2/shared/ia/guard.mjs` y `web/v2/shared/ia/cards.mjs`.

## Fragmento: frase que el README todavía no ha alineado

`README.md` y `docs/ORVUPI.md` (actualizado el 15 de octubre de 2026) dicen que no hay una dirección de token ORVUPI verificada publicada en este repositorio. La web y las fichas de ARQIVEN sí publican la dirección de arriba. Hasta que Cristian reescriba el README, la fuente que usa la aplicación es el módulo `orvupi-contract` y la ficha. Este documento no promete precio, rendimiento ni liquidez.

Origen: `README.md`, `docs/ORVUPI.md`, `web/v2/shared/orvupi-contract.json`.

## Fragmento: lo que no se pide

ORVUPI no pide la frase de recuperación ni escribe primero por mensaje privado. Esa frase está en el índice que construye `scripts/build-arqiven-index.mjs` para la ficha del token. No se copia aquí una segunda dirección.

Origen: `scripts/build-arqiven-index.mjs` (texto de la ficha de token).
