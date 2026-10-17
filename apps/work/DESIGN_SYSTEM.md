# Design system

La identidad sale de `web/v2/assets/orvupi.css`. El fondo es crema, el texto es noche y el rosa es un relleno, no un color de texto pequeño. Los títulos usan `"Arial Rounded MT Bold", "Trebuchet MS", system-ui`. El cuerpo usa Inter, empaquetada en local, y `system-ui` como reserva. No hay peticiones a Google Fonts.

## Color

| Token | Valor | Uso |
| --- | --- | --- |
| `--bg` | `#fff8ec` | Fondo |
| `--bg-elev` | `#fffdf7` | Panel de IA |
| `--text` | `#102032` | Texto y líneas |
| `--muted` | `#465365` | Texto secundario |
| `--accent` | `#ff3070` | Relleno primario y sección activa |
| `--ok` / `--ok-bg` | `#0b5d36` / `#e5f6ee` | Guardado |
| `--attention` / `--attention-bg` | `#7a4a00` / `#fff4e0` | Cambios pendientes |
| `--danger` | `#a3123f` | Error y acciones destructivas |
| `--gem` | `#007960` | Foco |
| `--surface` | `#ffffff` | Tarjetas y papel |
| `--surface-2` | `#fff0f5` | Resalte suave |
| `--radius` | `24px` | Tarjetas |

Contraste calculado con la fórmula WCAG:

| Par | Ratio |
| --- | --- |
| `#102032` sobre `#fff8ec` | 15.6:1 |
| `#102032` sobre `#ffffff` | 16.5:1 |
| `#465365` sobre `#fff8ec` | 7.4:1 |
| `#102032` sobre `#ff3070` | 4.6:1 |
| `#0b5d36` sobre `#e5f6ee` | 7.1:1 |
| `#7a4a00` sobre `#fff4e0` | 6.9:1 |
| `#fff8ec` sobre `#102032` | 15.6:1 |

El rosa con texto noche supera AA para texto normal (4.5:1). El rosa no se usa como color de texto pequeño. El foco visible es un anillo de 3 px en `#007960`.

## Color de herramienta

| Herramienta | Color |
| --- | --- |
| Docs | `#1d4e89` |
| Sheets | `#0b5d36` |
| Slides | `#9a3412` |
| PDF | `#a3123f` |
| Archivos | `#5b2a86` |
| IA | `#8a245c` |

## Componentes

Implementados en `src/ui/kit.tsx`, `src/ui/overlay.tsx`, `src/ui/chrome.tsx`, `src/ui/AiPanel.tsx` y `src/ui/CommandPalette.tsx`:

Button, IconButton, Input, Search, Select, Dropdown, Modal, Tooltip (`data-tooltip`), Sidebar, Topbar, Card, ContextMenu, Tabs, Toast, Dialog, FilePicker, Progress, EmptyState, ErrorState, panel de IA y paleta de comandos.

Los botones de icono del editor llevan un SVG con `aria-hidden` y el nombre accesible en `aria-label`, para que el nombre coincida con lo que la persona puede percibir y axe no marque texto visible suelto.

## Composición

A partir de 961 px la pantalla es una fila: barra lateral de 248 px, columna principal flexible y panel de IA de 300 px. Por debajo de 960 px la barra lateral es un cajón y el panel de IA es una hoja inferior de como máximo 46 vh. La impresión oculta las cromas y deja el papel.

## Movimiento

El progreso usa una animación corta. `prefers-reduced-motion: reduce` la anula.
