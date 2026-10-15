# Seguridad de ORVUPI

## Cómo reportar

Escribe a **orvupi.hq@gmail.com**.

Incluye la versión (`package.json`, hoy `0.1.0`), qué archivo o workflow afecta, y los pasos para reproducirlo. No abras un informe público con el detalle mientras no hayamos respondido.

No hay programa de recompensas. No hay pago por informes. No envíes claves, frases semilla ni material secreto: no los queremos y no debemos recibirlos. Nadie de ORVUPI te pedirá ese material.

## Alcance

Dentro de alcance:

- Este repositorio (identificador técnico conservado: `@stubx/agents`): código del agente, tests, política de límites, kill-switch y workflows de GitHub Actions.
- Un cambio que permita firmar, custodiar, enviar transacciones o escribir en la red.
- Secretos o material de clave colados en el árbol o en la historia de git.

Fuera de alcance:

- Los tokens, las plataformas de emisión o intercambio y el comportamiento de terceros.
- La web, la cuenta social u otros repositorios, salvo que el fallo esté en este código.
- Pedir que el agente mueva activos o firme. No puede, y no vamos a añadir esa capacidad.

## Qué esperamos

Leemos el correo. No prometemos un plazo. Si el informe es válido lo corregimos en público, sin llamar al resultado «verificado» más allá de lo que demuestre el parche y la CI de esta versión.

## English

Report issues to orvupi.hq@gmail.com. There is no bug bounty and no payment. Do not send keys or seed phrases. In scope: this repository's agent, tests, limits, kill-switch, and GitHub Actions. Out of scope: token programs, issuance or trading platforms, third parties, and requests to make the agent sign or send transactions.
