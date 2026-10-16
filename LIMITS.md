# Límites del agente ORVUPI (v1)

Política en lenguaje llano. La copia máquina es [`policy/limits.json`](policy/limits.json) (`id`: `stubx-agent-limits`, `version`: `1.0.0`). Un test falla si el markdown, el JSON y el código no coinciden.

Esto es un prototipo. ORVUPI todavía no tiene contrato. Los riesgos se explican en https://stubxai.com/risks/. El agente no tiene claves.

Estos límites están aplicados en este repositorio y cubiertos por tests. La casilla pública del PPM se marcó el 05-10-2026 con una ejecución pública de la CI en verde (https://github.com/ORVUPI/orvupi-agent/actions/runs/37278171372, commit a960380), incluidos los 20 tests de límites, y el OK legal. Marcada no significa auditada: un test en verde demuestra lo que ese test comprueba, en esa versión del código. Si una CI posterior falla en estos tests, se desmarca y se explica.

## Límites

### No firma

<!-- limit:no-sign -->

El agente no firma mensajes ni transacciones.

- Código: `src/allowlist.ts`, `src/orchestrator.ts`, `src/forbidden-scan.ts`
- Test: `test/limits.test.ts` (`no-sign`)

### No custodia

<!-- limit:no-custody -->

El agente no custodia activos ni claves.

- Código: `src/allowlist.ts`, `src/orchestrator.ts`
- Test: `test/limits.test.ts` (`no-custody`)

### No intercambia

<!-- limit:no-trade -->

El agente no intercambia tokens ni opera en un mercado.

- Código: `src/allowlist.ts`, `src/orchestrator.ts`
- Test: `test/limits.test.ts` (`no-trade`)

### No envía transacciones

<!-- limit:no-send -->

El agente no envía transacciones.

- Código: `src/allowlist.ts`, `src/orchestrator.ts`, `src/forbidden-scan.ts`
- Test: `test/limits.test.ts` (`no-send`)

### No usa la red principal

<!-- limit:no-mainnet -->

El agente no contacta la red principal ni escribe en ella.

- Código: `src/guard.ts`, `src/orchestrator.ts`
- Test: `test/limits.test.ts` (`no-mainnet`)
- El guard `MAINNET_FORBIDDEN` también rechaza testnet y cualquier RPC remoto. Tests: `test/guard.test.ts`.

### No pide activos

<!-- limit:no-solicit-funds -->

El agente no pide SOL ni otros activos a nadie.

- Código: `src/draft.ts`, `src/orchestrator.ts`
- Test: `test/limits.test.ts` (`no-solicit-funds`)

### No inventa direcciones ni huellas

<!-- limit:no-invented-addresses -->

El agente no inventa direcciones ni huellas: solo puede citar el mint público de este repositorio.

- Código: `src/draft.ts`, `src/public-mint.ts`, `src/orchestrator.ts`
- Test: `test/limits.test.ts` (`no-invented-addresses`)
- Mint público: `TNWwnzecb37272ZoySDE6D2UcmqNnU12EqtycNSpump` (debe coincidir con `state/public-mint.json`).

### No promete resultados

<!-- limit:no-outcome-promises -->

El agente no promete resultados, ganancias ni ausencia de riesgo.

- Código: `src/draft.ts`, `src/orchestrator.ts`
- Test: `test/limits.test.ts` (`no-outcome-promises`)

### No publica con el kill-switch activado

<!-- limit:no-publish-while-killed -->

El agente no prepara un borrador social si el kill-switch está activado.

- Código: `src/orchestrator.ts`, `src/kill-switch.ts`
- Test: `test/limits.test.ts` (`no-publish-while-killed`)

### No guarda secretos

<!-- limit:no-store-secrets -->

El agente no almacena secretos ni material de clave.

- Código: `src/draft.ts`, `src/forbidden-scan.ts`, `src/orchestrator.ts`
- Test: `test/limits.test.ts` (`no-store-secrets`)

## Lo que el kill-switch no puede hacer

El interruptor solo afecta a las acciones de este paquete. No tiene efecto on-chain.

<!-- cannot:pause-holder-transfers -->

No puede pausar transferencias de holders.

<!-- cannot:freeze-accounts -->

No puede congelar cuentas.

<!-- cannot:seize-balances -->

No puede confiscar saldos.

<!-- cannot:stop-solana -->

No puede apagar Solana.

## Escáner de APIs prohibidas

`test/forbidden-api.test.ts` recorre `src/`, `scripts/`, `policy/` y `state/`. Falla si aparece una API de firma, de envío, de clave o un endpoint de escritura de la red principal (por ejemplo `Keypair`, `signTransaction`, `sendTransaction`, `secretKey`, `bs58` o `mainnet-beta`).

El mismo test apunta el escáner a `test/fixtures/forbidden-sample.js`. Ese archivo no forma parte del agente: solo demuestra que el escáner sí detecta esas APIs. Si el escáner dejara de verlas, el test falla.

No hay dependencias de ejecución. El test también falla si `package.json` declara una librería de wallet.

## English

This is a prototype. ORVUPI does not have a contract yet. Risks are explained at https://stubxai.com/risks/. The agent holds no keys.

Limits v1 are deny-by-default. The agent does not sign, custody, exchange, send transactions, contact mainnet, ask anyone for assets, invent addresses or hashes, promise outcomes, draft a social note while the kill-switch is engaged, or store secrets. The kill-switch cannot pause holder transfers, freeze accounts, seize balances, or stop Solana. `npm test` is the check. The public PPM box for limits was marked on 2026-10-05 with a green public CI run and legal sign-off; marked does not mean audited, and a later failing run unmarks it.
