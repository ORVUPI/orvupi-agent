# Arquitectura

ORVUPI Work 0.1.0 corre entero en el navegador. El diagrama de esta fase:

```
Persona
  → interfaz React (shell, Docs, ajustes)
  → StorageService
       → metadatos en IndexedDB
       → bytes en OPFS, o en IndexedDB si OPFS no responde
  → exportación a un archivo que la persona descarga
```

No hay cuenta, ni red de documentos, ni worker que envíe el contenido fuera del origen.

## Módulos

| Carpeta | Responsabilidad |
| --- | --- |
| `src/app` | Estado del espacio, navegación, órdenes |
| `src/ui` | Design system, barras, diálogos, panel de IA |
| `src/views` | Pantallas: inicio, docs, archivos mínimos, ajustes, fases posteriores |
| `src/docs` | Modelo, editor TipTap, cola de guardado, importación y exportación |
| `src/storage` | OPFS, IndexedDB, copia y restauración |
| `src/security` | CSP, límites, nombres, SHA-256, DOMPurify |
| `src/i18n` | Español e inglés, mismas claves |
| `src/ai` | Detección de capacidades y proveedor vacío |
| `src/styles` | Tokens visuales |

`DocsEditor` y `pdf-lib` se cargan bajo demanda. El service worker solo existe en la build de producción.

## Documentos

El archivo propio es JSON:

```json
{ "format": "orvupi-doc", "version": 1, "id": "uuid", "name": "Informe", "content": {} }
```

`content` es el documento de TipTap. Importar `.orvdoc` o JSON compatible crea un id nuevo. TXT, Markdown y HTML se convierten después de sanear el HTML. Un PDF se guarda en bruto y no se abre en el editor. Otras extensiones permitidas se guardan como archivo, no como documento editable.

La primera línea cambia el nombre solo si el documento sigue llamándose «Sin título» o «Untitled».

## Almacenamiento

`createBrowserStorage` prueba OPFS y, si la sonda falla, usa blobs de IndexedDB. El controlador que ve la interfaz es el mismo. En Node, los tests usan memoria y `fake-indexeddb`.

La copia `orvupi-workspace` versión 1 incluye metadatos, ajustes y bytes en base64. Se valida completa antes de la primera escritura.

## Guardado

`createSaveQueue` espera 400 ms y serializa las escrituras. `SaveController` incrementa un testigo en cada cambio. Al terminar, el estado visible pasa a «Guardado» solo si ese testigo sigue siendo el último. Si la escritura falla, el estado sigue en «Cambios pendientes».

## Fases que esta build no implementa

Sheets, Slides, el visor y las herramientas PDF, carpetas y etiquetas, el modelo local y las automatizaciones tienen pantalla propia. Dicen qué fase las trae. No hay datos de ejemplo que finjan un resultado.

Las decisiones y las alternativas rechazadas están en `ARCHITECTURE_DECISION_RECORD.md`.
