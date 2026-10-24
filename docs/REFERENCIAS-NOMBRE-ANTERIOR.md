# Lo que no es la web pública

La web pública es [orvupi.com](https://orvupi.com/). Este repositorio no publica otro host de la marca en la web ni en la documentación de producto.

El detector de suplantación conserva el host retirado en estos archivos. No es un canal oficial y no se enlaza desde la web:

- `verify/test/fixtures/registry-demo.json`
- `verify/test/fixtures/name-impersonation.json`
- `verify/test/layouts.ts`
- `verify/test/security.test.ts`
- `web/v2/studio/blocklist.json` (Studio rechaza ese host en un meme; no lo muestra como canal)
- `test/studio.test.ts` (comprueba esa lista)

La migración de datos locales del navegador usa un prefijo antiguo, que no es un dominio ni un enlace: `web/v2/shared/legacy-names.js` y `web/v2/assets/shell.js`.

`logs/` y la etiqueta `pre-orvupi-2026-10-16` conservan el historial firmado. La etiqueta publicada `v0.1.0` es anterior al cambio de presentación; las notas en `docs/releases/v0.1.0` nombran orvupi.com.
