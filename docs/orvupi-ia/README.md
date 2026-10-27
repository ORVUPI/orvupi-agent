# ARQIVEN — Fase 0

Auditoría y diseño técnico del encargo 1.0 (27 de octubre de 2026). Propietario: Cristian Pardo Camacho.

El paquete de encargo llama al trabajo «ORVUPI IA». La marca visible del producto es **ARQIVEN**. ORVUPI sigue siendo el sitio y el ecosistema (Work, Studio, la cabecera). Esta carpeta conserva el nombre del paquete; no es el nombre de la interfaz.

Esta entrega no conecta un modelo propio, no entrena pesos y no despliega orvupi.com. La ruta `/arqiven/` ya está en el árbol de `web/v2/` para el siguiente despliegue que autorice el propietario. El gasto de esta corrida es 0 €. El criterio punto por punto está en [CRITERIOS.md](CRITERIOS.md).

| Documento | Contenido |
| --- | --- |
| [AUDITORIA.md](AUDITORIA.md) | Mapa actual, barra del sitio, trazas, riesgos y pendientes. |
| [ARQUITECTURA.md](ARQUITECTURA.md) | Núcleo común con Work y Studio, ruta `/arqiven/` e identificadores Arqiven-N. |
| [PLAN-IMPLEMENTACION.md](PLAN-IMPLEMENTACION.md) | Primera implementación en rama, flags, reversión y ficha del experimento. |
| [PAQUETE.md](PAQUETE.md) | SHA256 del paquete y SHA del HEAD auditado. |
| [prototipo/](prototipo/README.md) | Esqueleto visual apagado por defecto. Muestra la barra del sitio con el ítem ARQIVEN y el logotipo oficial. No es el producto. |
| [CRITERIOS.md](CRITERIOS.md) | Criterios A–E del paquete, con evidencia. Nada marcado comprobado sin prueba. |
| [assets/arqiven-logo-oficial.png](assets/arqiven-logo-oficial.png) | Hoja oficial 1254×1254. SHA256 `f0b8294692096b5d81151e1702e22fdfbe686a535e8cd834c72323af0000812b`. La copia pública es `web/v2/assets/arqiven/logo-oficial.png` y conserva esos bytes. |

No existe `AGENTS.md` en este repositorio. Las normas usadas son `README.md`, `CONTRIBUTING.md` y `docs/ORVUPI.md`.
