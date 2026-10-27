# Paquete y revisión auditada

Fecha de la comprobación: 27 de octubre de 2026. Los hashes se calcularon en esta corrida con `sha256sum` sobre los archivos del encargo. No se reescribió el historial y no se movió `main`.

## HEAD auditado

| Campo | Valor |
| --- | --- |
| Repositorio | https://github.com/ORVUPI/orvupi-agent |
| Rama de partida | `main` |
| HEAD | `707fef7c32aee3ed7a0dd9751995c690f27d56ef` |
| Asunto | Studio: abrir cada plantilla en su propio diseño (#131) |
| Commit de referencia del encargo | `6f4f882b35121e00e8d51d8d0f4c6ea855ca08de` |
| Relación | El commit de referencia es ancestro de HEAD. Hay 5 commits posteriores. No se ha retrocedido el repositorio. |

Commits posteriores al de referencia, ninguno de los cuales reescribe el motor de IA:

1. `9d7f950` Studio: quitar flash Riesgos al abrir (#130)
2. `9344900` Work: visor PDF, descargas Docs y favicon pulpo oficial (#132)
3. `3440127` Work: zoom del PDF quieto y pestaña con el avatar oficial (#133)
4. `d5aa2b2` log: entrada diaria 2026-10-27
5. `707fef7` Studio: abrir cada plantilla en su propio diseño (#131)

`git diff --stat 6f4f882..707fef7` sobre `apps/work/src/ai` y `web/v2/studio/lib` no muestra cambios en el motor, el chat de Studio ni el puente de archivos. Lo que sí cambia en Work es el visor PDF, las descargas de Docs y el icono de pestaña (`App.tsx`, `workspace.tsx`). La duplicación de `AiStudio` ya estaba en el commit de referencia y sigue en HEAD.

## Hashes del paquete

Los cinco archivos de contenido coinciden con `04_MANIFIESTO`. El manifiesto no incluye su propio hash; el archivo recibido también se midió.

| Archivo del encargo | Bytes | SHA256 | ¿Coincide con el manifiesto? |
| --- | ---: | --- | --- |
| `00_LEEME_PRIMERO.md` | 2437 | `4b6b061688d50b8e89b81300782b908ddc132a6f9169d6c5552785d32e70d8e2` | sí |
| `01_INSTRUCCIONES_DE_EJECUCION.md` | 18089 | `6a3781df5641054a34677895e805734cbb995fd89f2d0b26d8bd40b4f93af123` | sí |
| `02_PLAN_DE_ENTRENAMIENTO.md` | 17172 | `09cd9f06a67e95d38f2033fe9b87581d449f1446cfec94d47b0fc5efeab5a96f` | sí |
| `03_CRITERIOS_DE_ACEPTACION.md` | 4882 | `94c513199df5db93f8974dbc64f7fa0bc581c2b26911831d0198d380e076c0c4` | sí |
| `ORVUPI_IA_Maqueta_v02.html` | 53713 | `ecb9dd6f489d4748970913f854aef5d5971507d2fb7d24c7804b3c33900d3ba9` | sí |
| `04_MANIFIESTO.json` (el archivo en sí) | 1052 | `347be4c21e3f0c6a8b634b3b05cf91c33b5996182b00ddc5cd0fe64f421e7bb5` | no figura en el manifiesto |

La maqueta es una referencia visual. Sus respuestas son ejemplos fijos. No se ha copiado a `web/v2/` y no se presenta como producto.

El paquete nombra el producto «ORVUPI IA». El propietario, el 27 de octubre de 2026, fija la marca visible en ARQIVEN y la familia de modelos en Arqiven-N. Esa decisión no cambia estos hashes: cambia el nombre que usan el informe, la arquitectura y el esqueleto. El id de experimento del paquete no se adopta; el reservado es `arqiven-1-experimental`, con ficha «Arqiven-1 experimental».

## Logotipo oficial

El propietario confirmó la hoja adjunta como logotipo de ARQIVEN. Se guardó tal cual, sin recomprimir.

| Campo | Valor |
| --- | --- |
| Ruta en esta fase | `docs/orvupi-ia/assets/arqiven-logo-oficial.png` |
| Ruta pública prevista | `web/v2/assets/arqiven/logo-oficial.png`, solo cuando se autorice `/arqiven/` |
| Píxeles | 1254 × 1254 |
| Bytes | 1 681 304 |
| SHA256 | `f0b8294692096b5d81151e1702e22fdfbe686a535e8cd834c72323af0000812b` |

No hay copia en `web/v2/`. Las tres variantes y las cajas medidas están en [ARQUITECTURA.md](ARQUITECTURA.md).
