# Dominio principal: orvupi.com

Desde el 16-10-2026 `orvupi.com` es el dominio principal de ORVUPI.

## Ya hecho en el código (rama `orvupi-limpieza`)

- `<link rel="canonical">`, `og:url`, `og:image` y `twitter:image` de todas las páginas apuntan a `https://orvupi.com/…`.
- `sitemap.xml`, la línea `Sitemap:` de `robots.txt` y el campo `Canonical:` de `security.txt` (y `.well-known/security.txt`) usan `orvupi.com`.
- CSP (`_headers` y `<meta>`): no hace falta tocarla. Todas las directivas usan `'self'` (más los RPC públicos en `connect-src`), así que la misma política vale en `orvupi.com` y en `stubxai.com` sin listar ningún dominio propio.
- Los textos visibles que dicen «stubxai.com» (por ejemplo «Generado en stubxai.com» en los informes) y el origen de descarga del álbum (`web/v2/tools/album.mjs`) se cambian cuando `orvupi.com` sirva la web.

## Pendiente, fuera del código (requiere OK expreso)

1. Añadir `orvupi.com` (y `www.orvupi.com`) como dominio personalizado del proyecto de Cloudflare Pages `stubxai` y comprobar el certificado.
2. Activar la redirección de `stubxai.com` a `orvupi.com`.

## La redirección (preparada, sin activar)

Cloudflare Pages no admite reglas por host en `_redirects` (solo rutas relativas), así que la redirección se hace con una regla de zona. Por eso no está en `_redirects` y no se activa con ningún despliegue.

- Archivo listo: `web/v2/tools/redireccion-stubxai-a-orvupi.json` (`tools/` no se despliega). Lleva `"enabled": false`.
- Cómo aplicarla: Cloudflare → zona `stubxai.com` → Rules → Redirect Rules → crear regla con esa expresión y ese destino (301, conserva ruta y consulta). La alternativa equivalente es una Bulk Redirect `stubxai.com` → `https://orvupi.com` con «Preserve path suffix» y «Preserve query string».
- Comprobación después de activarla: `curl -sI https://stubxai.com/verify/?x=1` debe dar `301` con `location: https://orvupi.com/verify/?x=1`.
- Marcha atrás: desactivar la regla.
