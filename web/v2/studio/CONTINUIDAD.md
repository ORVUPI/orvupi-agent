# Continuidad de Studio

25 de octubre de 2026. Fases 0–4 en main (`1f99143`). Esta pasada es Fase 5 (P2) en rama aislada.

## Qué se hizo

Studio es una aplicación propia en `/studio/`, con la marca ORVUPI (`#FF3070`, `#FFF8EC`, `#102032` y tipografías OFL). El cromo de la página (cabecera de navegación y pie) se oculta; el idioma sigue visible. Las plantillas genéricas son neutras (sin pulpo). El álbum de memes conserva la mascota.

El catálogo cubre meme, redes, currículum, presentación, documento, vídeo (escenas locales), flyer, cartel, folleto, logo, invitación, infografía, pizarra y sitio. Cada pieza se edita en este navegador.

Ampliaciones de la Fase 5 (local, sin APIs de pago):

- Fotos: biblioteca geométrica CC0 en `photos/` con búsqueda y licencia visible. Subidas propias aparte.
- Gráficos de barras, líneas y tarta con series editables; tablas con celdas editables. Entran en el raster PNG/JPG/PDF.
- Vídeo: tira de escenas con duración en segundos. Sin audio y sin exportación MP4 (haría falta un codificador pesado en el navegador). La descarga sigue siendo PNG o PDF de fotogramas.
- Sitio: descarga HTML responsive. No hay publicación ni alojamiento de sitios de usuarios.
- Pizarra: ampliar lienzo, comentarios locales e historial de hasta 20 instantáneas en este navegador. Sin colaboración remota (exigiría identidad y almacenamiento de pago).
- IA opcional desacoplada: el editor no descarga ningún modelo. Solo frases locales listas.

Siguen disponibles el paquete `orvupi-design`, el PDF a 96 ppp y el puente local con Work.

## Limitaciones honestas

| Capacidad | Estado |
|---|---|
| Fototeca de pago / Unsplash de pago | Ausente a propósito |
| Exportación MP4 / audio | Ausente; documentado en la UI |
| Publicar un sitio en un dominio | Ausente; solo descarga HTML |
| Colaboración en tiempo real | Ausente; coste remoto no cubierto |
| Modelo de IA descargable | No requerido; panel opcional sin pesos |
| PDF vectorial / 300 ppp / CMYK | Ausente (Fase 3: raster 96 ppp) |
| Sincronización entre dispositivos | Ausente |

## Cómo verlo en local

```bash
cd web/v2
python3 -m http.server 4173 --bind 127.0.0.1
```

Abrir `http://127.0.0.1:4173/studio/`.

## Pruebas

- `npm test` (incluye `test/studio-fase1.test.ts` … `test/studio-fase5.test.ts`).
- Playwright: `studio-vista`, `studio-rapido`, `studio-guardar`, `studio-placa`, `studio-categorias`.

## Fuera de esta pasada

Sin merge ni despliegue desde esta rama salvo autorización expresa. Sin contratar APIs de pago ni infra remota «ilimitada gratis».
