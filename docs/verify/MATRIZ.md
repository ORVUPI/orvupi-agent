# Matriz de fuentes de ORVUPI Sonar

La herramienta se llama ORVUPI Sonar. El subtítulo es «Sonar · verify on-chain». La ruta principal nueva es `/sonar/` (alias de la misma app). `/verify/` sigue respondiendo para no romper enlaces.

Comprobado el 31 de octubre de 2026 con documentación pública y, donde se indica, una lectura puntual sin clave. Coste de operación: 0. Nada de esto es una redistribución de la base completa del proveedor.

| Módulo | Fuente | Permiso y coste | Cobertura | Límites | Estado | Modo |
| --- | --- | --- | --- | --- | --- | --- |
| Ficha Solana, SPL, Token-2022, curva, muestra de cuentas | RPC público `solana-rpc.publicnode.com` y `api.mainnet-beta.solana.com` | Documentación oficial. No es infraestructura de producción | Cuenta, mint, suministro, hasta 20 cuentas grandes, curva si la PDA existe | Timeout 8 s. Actividad: 12 firmas y 6 transacciones | Viable con límites | Cálculo propio sobre RPC |
| Actividad Solana y grafo | Los mismos RPC, `getSignaturesForAddress` y `getTransaction` | Igual | Solo la muestra descargada. Una arista no es el mismo dueño | 16 nodos, profundidad 2 | Viable con límites | Cálculo propio |
| EVM: Ethereum, Base, BNB, Arbitrum, Polygon, Optimism, Avalanche | RPC públicos (PublicNode, `mainnet.base.org`) | Lectura JSON-RPC sin clave | Código, saldo nativo, nombre, símbolo, decimales y suministro si el contrato responde | Sin índice de transferencias | Viable con límites para la ficha. Transferencias: no soportado | RPC |
| Bitcoin | `mempool.space` API REST | Documentación pública. Hay límite de ritmo; el abuso puede bloquear | Saldo en sats si vienen ambos acumulados, y hasta 6 transacciones (primer input y primer output, no el neto) | Muestra corta | Viable con límites | API sin clave |
| Tron | `api.trongrid.io` sin clave | Respondió en la prueba del 31-10-2026. El plan con clave queda fuera | Saldo en sun y hasta 6 transacciones confirmadas | Si pide clave, el estado pasa a requiere atención | Viable con límites | API sin clave |
| Velas de un pool | GeckoTerminal `.../ohlcv/{minute\|hour\|day}` | API pública, atribución, sin clave. Caché de cerca de 1 minuto | 1m, 5m, 15m, 1h, 4h y 1D. Hasta 200 velas. Volumen solo si la fila lo trae | Polling 30 s del gráfico visible. Huecos no se rellenan. Duplicados se descartan, no se promedian | Viable con límites | API autorizada en sus términos públicos de uso keyless, con atribución |
| OHLC de Bitcoin | CoinGecko `/coins/bitcoin/ohlc` y `simple/price` | API keyless. Atribución. No está pensada como producción de alto tráfico | `days=1` devuelve el tamaño que fija CoinGecko (el paso se mide; no se renombra a 1m). El OHLC no trae volumen por vela | Una serie visible, polling 30 s | Viable con límites | API keyless |
| Liquidez y volumen de un par | DEX Screener `token-pairs/v1` | Términos de API (18-08-2023): no construir un producto cuyo fin principal compita con DEX Screener ni revender la API. Ya se usaba por token | Hasta 8 pares. Cifra actual, no velas | La API documentada no tiene OHLCV | Viable con límites para el par consultado. Velas: no soportado | API ya integrada |
| TVL y el resto de DeFiLlama | API pública de DeFiLlama | Términos del 24-06-2025, cláusula 8: no republicar ni usar los datos con fin competitivo sin permiso | No se llama | — | Requiere permiso | Desactivado |
| Screener global y traders | GeckoTerminal `trending_pools` página 1 | Igual que las velas | Una página, no el mercado entero. Sin tenedores ni traders | No hay leaderboard de PnL | Muestra: viable con límites. Leaderboard: no soportado | API |
| Entidades, etiquetas de dueño, PnL, futuros, opciones, alertas enviadas | — | Arkham y Bubblemaps son de pago o no permiten reutilizar su base | — | — | No soportado o próximamente (alertas locales sí, envío no) | No hay datos |
| Redes del selector que no están cableadas | Flare, Dogecoin, Zcash, HyperEVM, Hypercore, Robinhood Chain | Sin fuente gratuita comprobada en esta entrega | — | Aparecen como no soportado y no se consultan | No soportado | — |

Cada cifra en pantalla lleva red, proveedor, hora y alcance, y uno de estos estados: comprobado, requiere atención, sin datos, no soportado. Un fallo no se enseña como cero. No hay puntuación de riesgo ni modo de demostración con cifras falsas.

El único contrato nombrado como ORVUPI es `Bj6orFgn4UegmXtQ4WHcBsHSjjfgruHcScCSeauW1TyU`, leído de `orvupi-contract.json`. La dirección pública usada al abrir Tracer es `GKpccLJwKArptzt9j897njXUx9RsV5NKL3Egu7bfMA6Q`. No se le atribuye una persona.

## Cadena de respaldo (31-10-2026)

| Dato | Orden real | No se usa |
| --- | --- | --- |
| Precios y velas | CoinGecko OHLC, luego un pool de GeckoTerminal, luego klines públicas de `data-api.binance.vision` y, si falla, `api.binance.com` | Coinbase Exchange: los Market Data Terms no confirman permiso para mostrarlo. Kraken: los términos globales del 28-10-2026 no permiten poner su contenido a disposición de terceros. El archivo histórico `data.binance.vision` es CC BY-NC-SA y no se descarga |
| Pools | GeckoTerminal `trending_pools`, luego búsqueda de DEX Screener y, si hace falta, `token-profiles/latest/v1` | OHLCV no documentado de DEX Screener |
| Transferencias | Operaciones del pool, transacciones recientes de `eth.blockscout.com` sin clave, y para Bitcoin `mempool.space` con respaldo `blockstream.info`. Tron sigue en `api.trongrid.io`. Los RPC de EVM rotan un segundo endpoint público | Tronscan: la API exige clave. `api.blockscout.com` exige clave. Las instancias de Base, Arbitrum y Polygon respondieron con un desafío y no se llaman |
| Mercado global | CoinGecko `/global`. Si no responde, el panel usa la muestra de los ocho primeros ya leída y lo dice la fuente | DeFiLlama, por la cláusula 8 |

Reintentos con espera creciente, tiempo límite de 8 s y caché local de la última respuesta real (memoria, localStorage e IndexedDB). La hora en pantalla es la del navegador. «Sin datos» con botón de reintentar solo si toda la cadena falla.

## Gráficos

Librería: TradingView Lightweight Charts 5.0.9, Apache-2.0, archivo `web/v2/assets/vendor/lightweight-charts-5.0.9.mjs` y su licencia al lado. Ejes, crosshair, tooltip con la vela real, zoom y pellizco. Si la fuente no responde, el recuadro dice «sin datos» y no se dibuja una serie.
