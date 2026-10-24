# Dominio principal: orvupi.com

Desde el 16-10-2026 `orvupi.com` es el dominio público de ORVUPI. La web, el sitemap, `robots.txt` y `security.txt` usan ese origen.

## En el código

- `<link rel="canonical">`, `og:url`, `og:image` y `twitter:image` de las páginas apuntan a `https://orvupi.com/…`.
- `sitemap.xml`, la línea `Sitemap:` de `robots.txt` y el campo `Canonical:` de `security.txt` (y `.well-known/security.txt`) usan `orvupi.com`.
- CSP (`_headers` y `<meta>`): las directivas usan `'self'` (más los RPC públicos en `connect-src`). No hace falta nombrar el dominio propio.
- Los textos visibles de la web y la documentación pública nombran `orvupi.com`.

## Alojamiento

El alojamiento público es Cloudflare Pages en `orvupi.com` (y `www.orvupi.com`, si el certificado lo cubre). No se crea otra copia del sitio.

La vista de Netlify `superb-horse-9036f5.netlify.app` no se vuelve a publicar como web. `web/v2/_redirects` la envía con 301 a `https://orvupi.com` conservando la ruta (`https://superb-horse-9036f5.netlify.app/*` → `https://orvupi.com/:splat`). Esa regla solo la aplica Netlify; Cloudflare Pages ignora reglas con dominio absoluto.
