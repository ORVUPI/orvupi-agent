# Referencias al nombre anterior del proyecto

Desde el 16-10-2026 el proyecto se llama **ORVUPI** y el perfil de X es
[@creadorORVUPI](https://x.com/creadorORVUPI). El nombre anterior ya no aparece
en el código, la web ni la documentación, con estas excepciones deliberadas:

| Dónde | Por qué se queda |
| --- | --- |
| Dominio `stubxai.com` | Es el dominio publicado; no se cambia. |
| `web/v2/shared/legacy-names.js` | Constantes de migración: nombre de la base de datos, prefijo de esquema y campo antiguos del cuaderno. |
| `web/v2/assets/shell.js` | Prefijo antiguo de las claves de `localStorage`/`sessionStorage`, que se migran solas a `orvupi-*` (se copian solo si la clave nueva no existe, se verifican y después se borra la antigua). |
| `logs/` y la etiqueta `pre-orvupi-2026-10-16` | Historial firmado: la cadena anterior se conserva intacta en esa etiqueta (ver `LOGS.md`, «Cambio de cadena del 16-10-2026»). |
| Etiqueta publicada `v0.1.0` | Su mensaje es anterior al cambio; las notas en `docs/releases/v0.1.0` ya usan ORVUPI. |

Comprobación:

```sh
git grep -n -i -I stubx -- ':!logs' | grep -v -i 'stubxai\.com'
```

Solo debe listar los dos archivos de migración.
