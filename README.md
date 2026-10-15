# ORVUPI

ORVUPI combina una comunidad creativa, un pulpo rosa como identidad y herramientas para aprender, crear contenido y consultar datos públicos de tokens.

Este repositorio conserva y desarrolla las herramientas existentes del proyecto. El agente no tiene claves: no firma, no custodia, no intercambia activos ni envía transacciones.

> Prototipo. Cripto de alto riesgo · Puedes perderlo todo · No es consejo de inversión.

## Canales oficiales

- Web: https://stubxai.com/
- X: https://x.com/ORVUPI
- Telegram: https://t.me/orvupi
- TikTok: https://www.tiktok.com/@orvupi
- Farcaster: https://farcaster.xyz/stubxai
- Contacto: orvupi.hq@gmail.com
- Repositorio: https://github.com/stubxai/stubx-agent

Algunas direcciones e identificadores técnicos conservan nombres anteriores para mantener la continuidad de los servicios. La marca actual es ORVUPI. La transición y los elementos históricos se explican en [docs/ORVUPI.md](docs/ORVUPI.md).

## Herramientas que conservamos

| Herramienta | Función |
| --- | --- |
| [Verify](https://stubxai.com/verify/) | Consulta de datos públicos de tokens. |
| [Lab](https://stubxai.com/lab/) y [Aprender](https://stubxai.com/aprender/) | Misiones, glosario y guías educativas. |
| [Cuaderno](https://stubxai.com/cuaderno/) | Fichas y notas guardadas en el navegador. |
| [Studio](https://stubxai.com/studio/) | Creación de contenido visual. |
| [Comparar](https://stubxai.com/comparar/) y [Pares](https://stubxai.com/pares/) | Ejemplos educativos y lectura de datos públicos. |
| [Tablero](https://stubxai.com/tablero/) | Estado de funcionalidades y evidencias. |

Una consulta puede fallar o quedar incompleta. Un dato ausente no se sustituye por un cero ni por un resultado inventado. Estas herramientas no garantizan que un token sea seguro ni constituyen una recomendación de inversión.

## Estado del token ORVUPI

A fecha de esta transición, no se ha publicado en este repositorio una dirección verificada de token ORVUPI.

Las direcciones, metadatos y ejemplos del proyecto anterior que se conservan en los archivos históricos no identifican un token ORVUPI. No implican una migración automática de saldos ni una equivalencia entre tokens. La dirección histórica se documenta por separado en [docs/ORVUPI.md](docs/ORVUPI.md).

## Desarrollo

Requiere Node.js 22 o superior; `.nvmrc` conserva la versión del proyecto.

```bash
npm ci
npm run typecheck
npm test
npm run ppm:print
npm run drill:killswitch
npm run logs:verify
```

El identificador interno `@stubx/agents`, los esquemas de datos y algunas claves de almacenamiento se conservan por compatibilidad. El cambio de marca no amplía los permisos del agente. El componente de consulta [`verify/`](verify/README.md) está separado del agente: si se ejecuta a propósito, consulta datos públicos; el agente de `src/` no contacta ningún RPC.

Las pruebas demuestran únicamente lo que comprueban en la versión ejecutada. Un resultado correcto no equivale a una auditoría. Este documento no afirma haber ejecutado las comprobaciones anteriores.

## Documentación y evidencias

- [Guía de transición ORVUPI](docs/ORVUPI.md)
- [Contribuir](CONTRIBUTING.md)
- [Seguridad](SECURITY.md)
- [Límites](LIMITS.md)
- [Kill-switch](KILL-SWITCH.md)
- [Log público](LOGS.md)
- [Modelo de amenazas](THREAT-MODEL.md)
- [Historial de cambios](CHANGELOG.md)
- [README histórico anterior](docs/history/README.pre-orvupi.2026-10-15.md)

El README histórico conserva las declaraciones y referencias de su versión de origen; no es la descripción actual de ORVUPI. Las pruebas de procedencia, los registros sellados y los datos históricos no se reescriben con el cambio de marca. La revisión de cualquier estado de seguridad debe hacerse contra sus evidencias y fechas.

Licencia MIT. Se conservan los avisos de autoría y la [licencia](LICENSE) del código existente.

## English

ORVUPI combines community, creative content and educational tools. This repository preserves the existing tools while adopting the ORVUPI identity. The agent holds no keys and cannot sign, custody assets or send transactions.

Prototype. High-risk crypto · You could lose everything · Not investment advice. No verified ORVUPI token address has been published in this repository. Legacy token addresses and historical examples must not be presented as an ORVUPI token. Technical identifiers and historical records are retained for compatibility and traceability; see [the transition guide](docs/ORVUPI.md). A passing test is not an audit.
