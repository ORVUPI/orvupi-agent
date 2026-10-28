# Preparación del experimento, coste 0

Esto no entrena. No alquila GPU, no descarga un checkpoint y no instala nanochat ni PyTorch.

La configuración de partida es la del plan 02: `initialize_from: random`, semilla 42, 8 capas, oculto 384, 6 cabezas, contexto 512, vocabulario 8192. El id reservado sigue siendo `arqiven-1-experimental`. Esta carpeta no lo publica en `capabilities()`.

`comprobar.mjs` imprime el número de parámetros de esa red, con embeddings de token y de posición, cuatro matrices de atención, MLP de expansión 4 y dos normalizaciones por capa. La cabeza de lenguaje va atada a los embeddings. No hay sesgos. El tamaño de cabeza es 384/6 y no suma parámetros. La cifra que tiene que salir es 17504640.

```bash
node docs/orvupi-ia/entrenamiento/comprobar.mjs
```

Si se le pasa una ruta de checkpoint, sale con código 2 y no lee el archivo. El paso de un batch (lectura, tokenización, forward, loss, backward) no está en este esqueleto: hace falta un sí aparte y no forma parte de esta entrega. Autorizado 0, gastado 0, reservado 0.
