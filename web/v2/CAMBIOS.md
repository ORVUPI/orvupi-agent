# Cambios de la web v2

Vista previa del 2026-10-09. No está publicada en stubxai.com. La copia recuperable de producción (despliegue `8f5a214b`) está en `web/current/`.

## Mapa

| Producción (una sola página larga o un HTML suelto) | Vista previa |
| --- | --- |
| `/` (`index.html`) | `/` Portada. Acción principal: Analizar token → `/verify`. |
| Anclas `#wallets`, `#transparencia`, `#reparto`, `#estado`, `#ppm` de `token.json` | Siguen en `/` con el mismo `id`. El detalle largo está en `/tokenomics` y `/status`. |
| Ancla `#verificar` | `/verify` Demo con las fichas del commit `86df576` (2026-10-09). La ficha oficial nombra la cuenta personal `2fS12sTD4TNEEE9MoCEt19brV41UjGdAnaNaxWcmiWvX` y el resto 0,0000 %. |
| No existía | `/lab` Misión de cinco pasos de la PR 14. |
| No existía | `/tablero` Registro de construcción del 2026-10-09. |
| No existía | `/avances` Alias: el tablero no se duplica. |
| Ancla `#metodologia` | `/methodology` |
| `canales.html` y ancla `#canales` | `/security` Contrato, canales, aviso de clones del 2026-10-05 más ERYyy, FMNb y dos ejemplos EVM del 2026-10-09. |
| `riesgos.html` y ancla `#riesgos` | `/risks` Aviso largo, con la frase MiCA. |
| Avisos legales repartidos en el pie y en riesgos | `/legal` Misma frase MiCA, privacidad y contacto. El aviso largo se repite aquí. |
| `pruebas.html` y ancla `#pruebas` | `/proofs` Siete pruebas fechadas, cada una con el bloque «Cómo repetirlo tú» (comandos, `ots info`, blockstream y OpenTimestamps). |
| `archivo.html` y `docs.html` | Los 18 posts se sirven en `/archivo`. `/docs` redirige ahí (301). `/proofs#archivo` enlaza esa URL. |
| Ancla `#estado` | `/status` PPM: 3 de 4 marcadas; wallet no aplica. Fecha 2026-10-05. |
| Ancla `#reparto` | `/tokenomics` Suministro a 2026-10-03 14:19 (Madrid). |
| Ancla de comunidad, dentro de canales | `/community` Los mismos canales. Sin Discord. |
| `marca.html` | `/marca` Personaje, logo 3D y logo on-chain. |
| Ancla `#versiones` | `/build` Hecho con fecha y objetivos. No es el tablero. |
| No existía | `/aprender` Glosario y tres guías de la PR 14. |
| No existía | `/studio`, `/cuaderno`, `/contribuir` Huecos. «No construido · 2026-10-09». |
| `404.html` | `404.html` |
| `token.json` | `token.json` Ya no es copia byte a byte: el 2026-10-11 se quitaron el pie repetido y la nota de imagen. SHA-256 `07087701f8d6310715945c32001e7a11d00c04dea3b1deae47d1666ab7a93585`. |

`_redirects` lleva primero la regla de Netlify `superb-horse-9036f5.netlify.app` → `https://stubxai.com/:splat` (301). Cloudflare Pages la ignora. `www.stubxai.com` ya lo sirve Cloudflare Pages; Netlify solo redirige ese hostname antiguo. El resto: `canales` → `/security/`, `riesgos` → `/risks/`, `pruebas` → `/proofs/`, `marca` → `/marca/`, `docs` → `/archivo`. No hay regla que vuelva a poner la extensión en `/archivo`: Pages ya quita esa extensión, y la pareja sería un bucle. Las páginas que son `index.html` se enlazan con barra final, que es la URL que Pages sirve. `/assets/*` lleva `Cache-Control: public, max-age=0, must-revalidate`, igual que el HTML de producción.

## Qué se movió o se unió

- Canales, contrato y aviso de clones pasan a `/security`. `/community` no repite el aviso legal: enlaza.
- Riesgos y la frase MiCA del art. 7.1.e viven en `/risks` y en `/legal`. La portada solo deja el resumen y el enlace. El pie repite la frase MiCA en las dos lenguas.
- El archivo de posts no se ha reescrito en el cuerpo. Los 18 posts salen de la copia de origen no publicada del 2026-10-03 11:21 (Madrid). La huella SHA-256 `654f8b25a72bae9d80c83ba3b3aa16ef16a1a531c450fce17d1d806342706897` es la de esa copia, como dice `/proofs`, no la de `archivo.html`. En el archivo servido solo cambian el canónico y `og:url`, de `https://stubxai.com/archivo.html` a `https://stubxai.com/archivo`, para que coincidan con la URL que Pages sirve.
- Verify, Lab y el tablero entran en el mismo cascarón (ver `modules/README.md`). No son enlaces a otra web.
- Cuaderno y contribuciones no se simulan. Studio es el editor en `/studio/`.

## Textos

Las direcciones, los canales y los avisos dicen lo mismo en español y en inglés. El inglés de la frase MiCA es traducción de la frase española publicada; no es otro instrumento. El inglés de la biblioteca de Lab sigue pendiente de revisión humana: si no coincide, manda el español.

| Dónde | Antes (producción, 2026-10-05) | Ahora |
| --- | --- | --- |
| Portada, titular | «Un meme que pide pruebas.» | «Contrasta la dirección antes de creer el nombre.» |
| Portada, acción principal | «Ver las pruebas» hacia `#pruebas` | «Analizar token» hacia `/verify`, con la fecha de las fichas. |
| Portada, riesgos | Una línea y un enlace al ensayo de la misma página | Dos frases y enlace a `/risks`. El ensayo no se ha acortado allí. |
| Versiones | «Cerrar la revisión de la PPM» seguía en objetivos aunque el texto ya decía que el 2026-10-05 estaban marcadas Logs, Límites y Kill-switch, y wallet no aplica | Ese punto pasa a «Hecho», con los mismos hechos y la misma fecha. El resto de objetivos no cambia. |
| Verify, Lab, tablero | No estaban en la web | Interfaz real de la PR 14, regenerada desde `lab/` y `site-drafts/` (commit `0cb1633`, 2026-10-09), más lectura en vivo y solo lectura de cualquier mint SPL o Token-2022. Las fichas siguen siendo la del 2026-10-09 (commit `86df576`): oficial con la cuenta personal publicada, ERYyy, FMNb, USDC, más las del 2026-10-08 y dos ejemplos 0x. El aviso de Guardar está en web/v2/shared/aviso-guardar.js. `snapshot.json` marca `inBranch` y `liveNetwork`. La PR 14 se fusionó en main el 2026-10-09 y la web no se ha desplegado. Los enlaces del tablero a las PR 13 y 14 llevan la fecha (2026-10-08 y 2026-10-09). |
| Studio | No estaba | Ficha en la portada, mismo estilo que Verify y Lab, con enlace a `/studio/`. El editor crea una imagen en el navegador, sin cuenta. El nombre del token empieza en STUBX y se puede cambiar. El logo elegido se queda en el navegador. Si el nombre no es STUBX, la mascota no se usa ni se puede elegir. La imagen no lleva banda, marca ni comentario. |
| Cuaderno, contribuir | No estaban | «No construido · 2026-10-09». Sin controles. |

No se han inventado cifras. Suministro, PPM, pruebas y avisos conservan la fecha de la fuente que ya estaba publicada. Esta vista previa no ha vuelto a consultar GitHub ni la red.

CA oficial, sin traducir: `TNWwnzecb37272ZoySDE6D2UcmqNnU12EqtycNSpump`.

Canales, sin traducir: `@stubxai`, `github.com/stubxai/stubx-agent`, `stubxai.hq@gmail.com`, `t.me/stubxai`, Farcaster `stubxai`, TikTok `@stubxai`. No hay Discord. `github.com/stubx` no es este proyecto.

Esta copia se ha generado con `STUBX_PUBLISH=1` y `--publish` a la vez, así que el HTML no lleva el rótulo «Borrador del repositorio. No publicado en stubxai.com.». El `noindex` sigue. El rótulo vuelve si el generador corre sin esas dos condiciones. Las páginas no llevan un nombre de persona. El inglés del pie se queda en «could», como decidió Legal.

`token.json` ya no es la copia byte a byte de producción: el 2026-10-11 se quitaron el pie repetido y la nota de imagen. SHA-256 del archivo `07087701f8d6310715945c32001e7a11d00c04dea3b1deae47d1666ab7a93585`. Su `securityNotice` sigue siendo el del 2026-10-05. La lista ampliada de clones está en `/security`, no dentro de ese archivo.

## Cómo se deshace

1. No desplegar `web/v2/`. stubxai.com sigue siendo el HTML que está en producción.
2. La copia para recuperar ese HTML es `web/current/`.
3. Cerrar o revertir esta pull request deja `main` como estaba. No hay cambio de DNS, de Pages ni de la rama `feat/lab-mision-1`.
