# Matriz CoinMarketCap ↔ ORVUPI Sonar

Comparación del 1 de noviembre de 2026, después de la capa `/api/sonar` y las pantallas de mercado. Las capturas están en `docs/verify/capturas-cmc/`. La prueba con Chromium headless (1920, 1440, 1366, tablet 1024×768 y 768×1024, iPhone 390×844, Android 412×915) quedó en 34/34 comprobaciones, sin errores de consola y sin scroll horizontal de página. Datos reales de CoinGecko, GeckoTerminal, Alternative.me, PatternPlus y Binance. `/verify/` sigue abriendo la lectura on-chain.

| Área | CoinMarketCap | ORVUPI Sonar | Estado |
| --- | --- | --- | --- |
| Ranking | Listado con precio, variaciones, capitalización, volumen, supply y sparkline | Tabla y fila móvil, orden, páginas de 50, 100 o 250 hasta cubrir el ranking, sparkline y estrella | Completo |
| Barra de mercado | Cap., volumen, dominancias, índices propios | Cap., volumen, BTC/ETH, activos, mercados, gas ETH, comisión BTC | Completo |
| Fear & Greed | Índice de su marca | Alternative.me, atribución junto al valor | Completo |
| Índice altcoin | Método propio | PatternPlus, con método y «Data: PatternPlus» | Completo |
| CMC20 / CMC100 | Índices de marca | No hay fuente libre equivalente | No viable |
| Activos | Ficha con precio, supplies, enlaces y contratos | `/sonar/crypto/<slug>` con resumen, estadísticas, acerca de, conversor y contratos enlazados a la ficha on-chain | Completo |
| Gráficos | Velas, línea, periodos y comparar | Periodos 1 h, 24 h, 7 d, 30 d, 90 d, 1 a, YTD y Todo; línea, velas, SMA 20, RSI 14 y comparar con BTC o ETH | Completo |
| Histórico diario | OHLCV | Tabla con OHLC. El volumen solo si la misma fuente lo trae ese día | Parcial |
| Exchanges | CEX, DEX y derivados | Ranking y ficha. CEX/DEX donde CoinGecko publica `centralized`. Derivados con interés abierto | Completo |
| Reservas de exchanges | Seguimiento propio | Sin fuente gratuita fiable | No viable |
| Categorías | Directorio y filtro del ranking | Directorio, pills y `/sonar/categories/<id>` | Completo |
| Filtros | Cap., volumen, cambio, categoría, red | Categoría en la fuente; precio, volumen, cambio y supply sobre lo cargado. Antigüedad y «verificado» no vienen en el ranking gratuito | Parcial |
| Buscador | Monedas, exchanges, categorías | Panel previo y resultados agrupados, más pools DEX | Completo |
| Ganadores y perdedores | Listas propias | Páginas de 250 sobre el ranking, con un tope por petición para no tumbar la fuente. La nota dice sobre cuántas monedas se calculó. Volumen mínimo 50 000 USD | Completo |
| Tendencia | Tráfico propio | Búsquedas de CoinGecko y pools de GeckoTerminal, con el criterio escrito | Completo |
| Nuevas | Fecha de alta propia | Pools DEX recientes. Sin fecha de alta de CoinGecko (el listado nuevo es de pago y no hay KV) | Parcial |
| Watchlist | Varias listas en la cuenta | Varias listas en el navegador, exportar, importar y compartir por URL. Sin cuentas | Completo |
| Portfolio | Operaciones y P&L en la cuenta | Compra, venta, transferencia, depósito y retirada; P&L, precio medio, reparto e histórico con precios reales. Sin cuentas | Completo |
| Calendario | Tipos propios, incluidos AMA y airdrops | Eventos que publica PatternPlus | Parcial |
| Unlocks | Calendario de desbloqueos | Tabla PatternPlus y bloque cuando la ficha tiene datos | Completo |
| Noticias | Titulares propios | Pestaña oculta: los términos de los medios no autorizan el titular | Pendiente |
| Serie de cap. total | Gráfico histórico | Cifra actual sí. La serie no está en la fuente gratuita y no hay almacén propio | No viable |
| Liquidaciones, ETF, funding, APY | Productos o datos de pago | Ocultos | No viable |
| Mercados de predicción | Pestaña propia | Fuera de alcance | Fuera de alcance |
| Cuentas y login | Sesión | No hay cuentas | Fuera de alcance |
| ORVUPI IA | — | Resume solo datos cargados o leídos de la API, con fuente y hora | Parcial |
| SEO | URLs de activo | Functions con título, canonical, hreflang y 404 real. Sitemap `/sitemap-sonar.xml` | Completo |
| Verify on-chain | — | DEX, Tracer, mapa, alertas y ficha siguen en `/verify/` y en «Más» | Completo |

La matriz de fuentes on-chain del 31 de octubre sigue debajo.

# Matriz de fuentes de ORVUPI Sonar

La herramienta se llama ORVUPI Sonar. El subtítulo es «Sonar · verify on-chain». La ruta principal nueva es `/sonar/` (alias de la misma app). `/verify/` sigue respondiendo para no romper enlaces.

Comprobado el 31 de octubre de 2026 con documentación pública y, donde se indica, una lectura puntual sin clave. Coste de operación: 0. Nada de esto es una redistribución de la base completa del proveedor.

| Módulo | Fuente | Permiso y coste | Cobertura | Límites | Estado | Modo |
| --- | --- | --- | --- | --- | --- | --- |
| Ficha Solana, SPL, Token-2022, curva, muestra de cuentas | `solana-rpc.publicnode.com` para la cuenta. Suministro y cuentas grandes: endpoint público de Solana Vibe Station (`public.rpc.solanavibestation.com` y las regiones `atl1` y `ams1`), sin clave | PublicNode documenta que las llamadas indexadas piden un token personal; no se llama. Vibe Station publica el RPC sin autenticación y con límite de ritmo. No es infraestructura de producción | Cuenta, mint, suministro, hasta 20 cuentas grandes, curva si la PDA existe | Timeout 8 s. Un hueco de 1,2 s entre llamadas al mismo host de Vibe Station | Viable con límites | Cálculo propio sobre RPC |
| Actividad Solana y grafo | `getSignaturesForAddress` en PublicNode. Si la lista viene vacía, el mismo método en Vibe Station. `getTransaction` en lotes de 3, repartidos entre los tres hosts públicos de Vibe Station. `api.mainnet-beta.solana.com` responde 403 a cualquier `Origin` del navegador, así que Sonar no lo llama desde la página | Igual. El 31-10-2026 PublicNode devolvió `[]` para la wallet del proyecto y Vibe Station devolvió sus 7 firmas, con CORS `*` | Solo transferencias de la muestra en las que entra la dirección. La cuenta de token se enseña con su owner. Una arista no es el mismo dueño | 16 nodos, profundidad 1 en la vista, hasta 12 firmas | Viable con límites | Cálculo propio |
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
