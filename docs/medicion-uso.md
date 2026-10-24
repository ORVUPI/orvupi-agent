# Medición de uso

Decisión del 2026-10-09. Vale para la web, para Verify y para Lab.

## Decisión

**No medimos el uso en el cliente.** No hay baliza, no hay cookie y no hay script de un tercero.

Este proyecto no guarda la IP. Cloudflare, como alojamiento, recibe la IP de cada visita y la trata según su propia política (registros del servidor que este proyecto no consulta ni exporta).

Cloudflare Web Analytics debe estar apagado en el panel de la zona. Este repositorio no lo inserta y el HTML servido el 2026-10-10 no lleva la baliza.

Tampoco hay un contador agregado en el servidor. Cualquier petición de «suma uno» llega a quien aloje la página (hoy, Cloudflare) con la dirección IP de quien visita, aunque el programa no la escriba en una base de datos. Eso ya es un dato personal en el registro del alojamiento. Por eso no se añade.

## Qué sí se puede mirar

Solo tres cifras que GitHub ya enseña en la página pública del repositorio, sin que esta web las pida:

- estrellas
- forks
- watchers (suscriptores públicos)

No son visitas a orvupi.com. No identifican a quien abre la web. No se descargan con la API de tráfico de GitHub (clones, vistas, referentes): esa API no es pública y se acerca más a un registro de visitas.

Nadie tiene que ejecutar un script para verlas. Están en `https://github.com/ORVUPI/orvupi-agent`.

## Qué queda fuera

| Opción | Por qué no |
| --- | --- |
| Cloudflare Web Analytics | Cloudflare Web Analytics debe estar apagado en el panel de la zona. Este repositorio no lo inserta y el HTML servido el 2026-10-10 no lleva la baliza. |
| Contador propio, aunque no guarde la IP | La petición sigue llevando la IP al alojamiento. |
| Cookie o `localStorage` para contar sesiones | Identifica el navegador. El idioma y el progreso de Lab, si se usan, se quedan en el navegador y no se envían. |
| Script en la página que pregunte a GitHub | Enviaría la IP del visitante a GitHub. |

## Datos que se quedan en el navegador o salen a terceros

En el navegador: el idioma y el progreso de Lab (localStorage); el borrador de Studio (localStorage), si Studio está publicado; y las fichas y notas del cuaderno (IndexedDB), si el cuaderno está publicado. Nada de eso se envía a este sitio y se puede borrar con Borrar. Verify en directo y el cuaderno, si están publicados, consultan desde tu navegador un servicio público de Solana (por defecto api.mainnet-beta.solana.com), que recibe la dirección consultada y tu IP.

In the browser: language and Lab progress (localStorage); the Studio draft (localStorage), if Studio is published; and notebook cards and notes (IndexedDB), if the notebook is published. None of it is sent to this site and it can be removed with Clear. Live Verify and the notebook, if published, query a public Solana service from your browser (by default api.mainnet-beta.solana.com), which receives the address and your IP.

## Cómo se comprueba

`src/metrics-policy.ts` fija la decisión en código. `npm test` recorre el HTML, el CSS y el JavaScript de `web/v2/`, `web/current/` y `site-drafts/` y falla si aparece una baliza, una cookie o un contador. No añade ninguna medición.

## English

Decision of 2026-10-09. It applies to the website, to Verify, and to Lab.

**There is no client-side measurement.** No beacon, no cookie, and no third-party script.

This project does not store the IP address. Cloudflare, as the host, receives each visitor's IP and processes it under its own policy (server logs that this project does not query or export).

Cloudflare Web Analytics must be off in the zone dashboard. This repository does not insert it, and the HTML served on 2026-10-10 does not contain the beacon.

There is also no aggregated server counter. Any “add one” request reaches the host (today, Cloudflare) with the visitor’s IP address, even if the program never writes that address down. That is already personal data in the host’s log. So it is not added.

The only figures that may be looked at are the three GitHub already shows on the public repository page, without this website asking for them: stars, forks, and watchers. They are not visits to orvupi.com. They do not identify who opens the website. The GitHub traffic API (clones, views, referrers) is not used: it is not public and it is closer to a visit log. No script has to run. The figures are on `https://github.com/ORVUPI/orvupi-agent`.

Cloudflare Web Analytics must be off in the zone dashboard. This repository does not insert it, and the HTML served on 2026-10-10 does not contain the beacon. A first-party counter is refused because the request still carries the IP to the host. A cookie or a storage key used to count sessions would identify the browser. Language and Lab progress, when used, stay in the browser and are not sent. A page script that called GitHub would send the visitor’s IP to GitHub.

`src/metrics-policy.ts` records the decision. `npm test` walks the HTML, CSS, and JavaScript under `web/v2/`, `web/current/`, and `site-drafts/` and fails if a beacon, a cookie, or a counter shows up. It does not add any measurement.
