# Auditoría de ORVUPI Sonar

El nombre de la herramienta es ORVUPI Sonar, con el subtítulo «Sonar · verify on-chain». `/sonar/` aliasa la misma app y `/verify/` se mantiene. El motivo es el pulpo rosa emitiendo ondas que llegan a otras redes.

Fecha: 31 de octubre de 2026. Material usado: instrucciones del repositorio, la grabación descrita en el análisis de vídeo (16 fotogramas, sin probar cada botón), la revisión de Cristian en dos partes con capturas (solo observación, con su cuenta) y documentación pública de proveedores. No se entró en Arkham, Dune, DeFiLlama ni Bubblemaps para copiar la interfaz ni sus datos.

## Qué se vio y qué no

| Tramo | Visto | No demostrado | En ORVUPI |
| --- | --- | --- | --- |
| Cabecera y portada | Menú horizontal, buscador con `/`, tarjetas y tabla de transferencias con paginador `1 / N` | Que esas cifras sean una API reutilizable | Menú propio: Explorar, DEX, Tracer, Visualizer, Alertas, Etiquetas y Más (Paneles, Transfers, Mercado). Sin Predictions, sin Trade y sin landing de API |
| Buscador | Modal, atajos, grupos Best matches, entidades, tokens, pools, direcciones, y grupos que aquí no existen | Un índice global de entidades | Grupos reales solo con la dirección tecleada, búsquedas locales y pools descargados. Polymarket, Predictions y Twitter: no soportado |
| Ficha | Rejilla de dos columnas, pestañas, chips, selector de redes, copiar y enlace | Etiquetas de dueño | La ficha usa la lectura real. Sin nombres de persona |
| Tracer | En Arkham es de pago y la grabación no completa un rastreo | Expansión ilimitada | Gratis, con profundidad 2, 16 nodos y 6 transacciones |
| Visualizer | Grafo, panel de transferencias, zoom | Clasificación CEX/persona | Grafo de la muestra descargada. Pellizco, pan y rueda. Sin tipos inventados |
| DEX y leaderboard | Tablas densas y podio de PnL | Una fuente gratuita de PnL por trader | Screener con la página 1 de GeckoTerminal. Leaderboard: no soportado |
| Alertas y etiquetas | Formulario y vacío | Entrega por Telegram o correo | Reglas locales. Entrega continua: próximamente. La única etiqueta con evidencia es el contrato ORVUPI |
| Paneles y mercado | Cuadrículas y gráficos | Que las cifras de la captura se puedan republicar | Velas solo si la fuente las entrega. DeFiLlama no se consulta |

## Identidad

La composición (cabecera compacta, buscador, tarjetas, tablas, chips, paginador) sigue la referencia. El color, la tipografía y el pulpo son de ORVUPI: crema `#fff8ec`, tinta `#102032`, rosa `#ff3070`. No se usa la paleta azul y negra ni el logotipo de la referencia.

## Tamaños

Escritorio (desde 1024 px): menú superior y rejilla de dos columnas. Por debajo de 1024 px: barra inferior, como una app. Por debajo de 768 px: las tablas pasan a tarjetas. Entre 768 y 1023 px la tabla se desplaza dentro de su tarjeta. Gráfico y grafo: `touch-action: none`, pellizco y arrastre. Áreas táctiles de 44 px, `viewport-fit=cover` y `env(safe-area-inset-*)`. En horizontal bajo 500 px de alto, el gráfico se acorta. No hay scroll horizontal de la página.

Chrome y Edge comparten motor. Firefox usa el mismo CSS y los eventos de puntero; se comprobó en Firefox a 1440 px. Safari iOS usa el mismo CSS (`viewport-fit=cover`, safe areas y pointer events). En esta máquina WebKit no arrancó: faltan librerías del sistema. Las capturas del PR están en Chromium a 1440, 1024, 768 y 390 px, y en Firefox a 1440 px. En todas, el desbordamiento horizontal medido fue 0.

## Lectura que ya existía

Siguen `/verify/`, Solana, Base, Ethereum y BNB, SPL y Token-2022, la curva y el Cuaderno. El almacén nuevo (`orvupi.verify.*.v1`) no toca las claves del Cuaderno. No hay migración que recuperar.
