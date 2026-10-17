# Arquitectura

ORVUPI Work 0.3.0 corre entero en el navegador. El diagrama de esta fase:

```
Persona
  → interfaz React (shell, Docs, archivos, hojas, diapositivas, ajustes)
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
| `src/views` | Inicio, biblioteca, ajustes y la pantalla del PDF |
| `src/docs` | Modelo, editor TipTap, cola de guardado, importación y exportación |
| `src/files` | Carpetas, filtros, lista, cuadrícula, selección y detalles |
| `src/sheets` | Cuadrícula virtual de 1000×32, fórmulas, CSV y XLSX |
| `src/slides` | Miniaturas, temas, objetos y presentación local |
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

`content` es el documento de TipTap. El mismo JSON puede llevar `header`, `footer`, `comments` y `versions`. Un archivo de la 0.1.0, sin esos campos, sigue abriéndose. Importar `.orvdoc` o JSON compatible crea un id nuevo. TXT, Markdown y HTML se convierten después de sanear el HTML. Un PDF se guarda en bruto y no se abre en el editor. CSV y XLSX se convierten en `orvupi-sheet` versión 1. Otras extensiones permitidas se guardan como archivo.

Una hoja guarda el texto de cada celda usada. Al abrir se rellena hasta 1000 filas y 32 columnas. Lo que empieza por `=` se evalúa al mostrar, y solo en las celdas visibles. Una presentación es `orvupi-slides` versión 1, con `theme` e `items`. Si esos campos faltan, se reconstruyen desde el título y el cuerpo.

La primera línea cambia el nombre solo si el documento sigue llamándose «Sin título» o «Untitled».

## Almacenamiento

`createBrowserStorage` prueba OPFS y, si la sonda falla, usa blobs de IndexedDB. El controlador que ve la interfaz es el mismo. En Node, los tests usan memoria y `fake-indexeddb`.

La copia `orvupi-workspace` versión 1 incluye metadatos, ajustes y bytes en base64. Se valida completa antes de la primera escritura.

## Guardado

`createSaveQueue` espera 400 ms y serializa las escrituras. `SaveController` incrementa un testigo en cada cambio. Al terminar, el estado visible pasa a «Guardado» solo si ese testigo sigue siendo el último. Si la escritura falla, el estado sigue en «Cambios pendientes».

## Límites de esta build

El visor PDF, el modelo local y las automatizaciones siguen sin editor. La cuadrícula es de 50 por 12. El detalle de cada función está en `docs/PARIDAD_DRIVE.md`.

Las decisiones y las alternativas rechazadas están en `ARCHITECTURE_DECISION_RECORD.md`.
