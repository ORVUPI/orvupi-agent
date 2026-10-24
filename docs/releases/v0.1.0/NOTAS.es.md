# ORVUPI 0.1.0

Fecha de estas notas: 2026-10-10. El número del paquete `@orvupi/agents` es `0.1.0`. El tag `v0.1.0` está descrito en [TAG.md](TAG.md) y no está creado.

Esto no es una auditoría ni un consejo de inversión. Cripto de alto riesgo · Puedes perderlo todo · No es consejo de inversión.

## Qué puedes hacer hoy, en este repositorio

Cuatro piezas, todas de lectura o de aprendizaje. Ninguna pide una cartera, una semilla ni un pago.

1. **El agente** (`src/`). Lista cerrada de acciones. No tiene claves, no firma, no custodia y no envía transacciones. No llama a la red principal.
2. **Verify**. Comprueba datos públicos de un mint y deja una ficha con fecha y fuente. En la web, Verify universal está desplegado (merge `2434636`): `/verify` lee en el navegador, solo lectura, cualquier mint SPL o Token-2022, y también compara con las fichas fechadas.
3. **Lab**. Una misión corta para practicar la diferencia entre el nombre de un token y su dirección. El progreso se queda en el navegador.
4. **La web v2**. Las mismas páginas, en español y en inglés, con la misma navegación. La web v2 se desplegó en orvupi.com el 2026-10-09, fuera de estas notas. Estas notas no la despliegan ni la cambian.

## Verify

- Carpeta `verify/`. El comando lee datos públicos si alguien lo ejecuta a propósito. Métodos de lectura en lista cerrada. Si un dato no llega, la ficha lo deja en no disponible: no inventa un cero ni una autoridad revocada.
- Ejemplos fechados en `verify/examples/2026-10-08/` y `verify/examples/2026-10-09/`. La ficha del mint del proyecto anterior está releída el 2026-10-09.
- En `web/v2/verify/` se pega una dirección. Verify universal, desplegado (merge `2434636`), la lee en el navegador, solo lectura, si es un mint SPL o Token-2022, y también la compara con las fichas fechadas. Si la dirección no es válida, la página lo dice. La lista de fichas no es un censo.

Una ficha no dice si un token es bueno, seguro o una buena compra.

## Lab

- Misión 1 en `lab/` y en `web/v2/lab/`: cinco pasos, preguntas cortas, botón para seguir (no avanza solo) y opción de empezar de nuevo.
- Glosario y tres guías: identificar el token, interpretar permisos y comprender la curva. El inglés de esa biblioteca está escrito y pendiente de revisión humana. Si una frase no coincide, manda el español.
- Los puntos son progreso local. No valen dinero y no son un certificado.

## Web v2

- Vive en `web/v2/`. Portada, Verify, Lab, tablero, metodología, seguridad, riesgos, legal, pruebas, estado, reparto, canales, marca, versiones, aprender y el archivo de posts.
- El cambio de idioma está en la cabecera. El pie legal es el mismo en todas las páginas de `web/v2/`. La web v2 se desplegó en orvupi.com el 2026-10-09, fuera de estas notas. Estas notas no la despliegan ni la cambian.
- `web/v2/` es la web publicada en orvupi.com desde el 2026-10-09 (merge `ed1c7759`). `web/current/` es la copia anterior, para volver atrás.
- Studio está desplegado (PR #20 y #26) y se indexa. Verify universal está desplegado (merge `2434636`). El cuaderno está en orvupi.com/cuaderno desde el 2026-10-10 (PR #24).
- En orvupi.com, además: el tablero en /tablero (PR #27); Contribuir en /contribuir desde el 2026-10-10 (PR #28, anotado en #32), sin cuenta y sin datos guardados en la página; el ejemplo educativo fijo en /comparar desde el 2026-10-10 (PR #29, anotado en #32), sin leer una dirección. En main, el logo de Studio acepta JPG, PNG y WebP y queda en 16 MP (PR #30). En iPhone, guardar usa compartir o una pestaña, con aviso en los dos idiomas y revocación a los 60 segundos (PR #33). La lectura de la curva está en orvupi.com/pares desde el 2026-10-10 (PR #31) y el tablero la da por publicada. La medición de uso no está en el cliente (PR #23).

## Indexación

Hecho el 2026-10-09:

- `web/v2/robots.txt` deja rastrear el sitio y señala `https://orvupi.com/sitemap.xml`. Pide a los rastreadores de entrenamiento de IA nombrados en ese archivo que no usen el contenido.
- `web/v2/sitemap.xml` enumera las URLs públicas, con fecha `lastmod`.
- Las páginas públicas de `web/v2/` no llevan `noindex`. Sí lo llevan, con `X-Robots-Tag`, el service worker de Lab, los JSON, el manifiesto y la página 404.
- `web/v2/` es la web publicada en orvupi.com desde el 2026-10-09 (merge `ed1c7759`). `web/current/` es la copia anterior, para volver atrás. La web v2 se desplegó en orvupi.com el 2026-10-09, fuera de estas notas. Estas notas no la despliegan ni la cambian.

## Lo que esta versión no hace

- No crea el tag.
- No fusiona nada por sí sola y no despliega.
- No conecta carteras.
- Este repositorio no inserta medición de visitas ni cookies. Cloudflare Web Analytics debe estar apagado en el panel de la zona (sin baliza en el HTML servido el 2026-10-10).

El detalle de cada cambio fechado está en [CHANGELOG.md](../../../CHANGELOG.md).
