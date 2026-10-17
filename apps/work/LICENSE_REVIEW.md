# Revisión de licencias

Revisión del 17 de octubre de 2026 contra el registro npm y los `package.json` instalados en `apps/work`. Solo entran licencias permisivas en el código que se entrega al navegador. La aplicación se publica con la licencia MIT del repositorio.

Leyenda de obligaciones: «atribución» significa conservar el aviso de copyright y el texto de la licencia. Ninguna de las dependencias elegidas prohíbe el uso comercial.

## Dependencias de ejecución

### Vite 8.3.4

- Repositorio: https://github.com/vitejs/vite
- Licencia: MIT
- Uso comercial: sí
- Obligaciones: atribución
- Modificación y redistribución: sí, conservando el aviso
- Límites de marca: el nombre Vite y el logo no se usan como marca de ORVUPI Work

### React 19.3.1 y React DOM 19.3.1

- Repositorio: https://github.com/react/react
- Licencia: MIT
- Uso comercial: sí
- Obligaciones: atribución
- Modificación y redistribución: sí
- Límites de marca: React es marca de Meta. Esta interfaz no se presenta como un producto de Meta

### TipTap 3.32.0

Paquetes directos: `@tiptap/core`, `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-image`, `@tiptap/extension-link`, `@tiptap/extension-placeholder`, `@tiptap/extension-table`, `@tiptap/extension-text-align`, `@tiptap/extension-text-style`. `@tiptap/pm` 3.32.0 llega como dependencia transitiva.

- Repositorio: https://github.com/ueberdosis/tiptap
- Licencia: MIT
- Uso comercial: sí
- Obligaciones: atribución
- Modificación y redistribución: sí
- Límites de marca: no se usa el nombre TipTap como nombre del producto

### ProseMirror, transitivo y empaquetado

Versiones resueltas: `prosemirror-model` 1.25.12, `prosemirror-state` 1.4.4, `prosemirror-view` 1.42.6, `prosemirror-transform` 1.12.2. El resto de paquetes `prosemirror-*` que trae TipTap están en el mismo árbol y declaran MIT.

- Repositorio: https://github.com/prosemirror/prosemirror
- Licencia: MIT
- Uso comercial: sí
- Obligaciones: atribución
- Modificación y redistribución: sí
- Límites de marca: ninguno adicional para este uso

### pdf-lib 1.17.1

- Repositorio: https://github.com/Hopding/pdf-lib
- Licencia: MIT
- Uso comercial: sí
- Obligaciones: atribución
- Modificación y redistribución: sí
- Límites de marca: ninguno. Se carga solo al exportar un PDF

### DOMPurify 3.4.17

- Repositorio: https://github.com/cure53/DOMPurify
- Licencia dual: MPL-2.0 OR Apache-2.0
- Elección de este proyecto: Apache-2.0
- Uso comercial: sí
- Obligaciones bajo Apache-2.0: conservar copyright, licencia y avisos de NOTICE si se redistribuye el código modificado
- Modificación y redistribución: sí
- Límites de marca: ninguno. No se distribuye una versión modificada de DOMPurify

### idb 8.0.4

- Repositorio: https://github.com/jakearchibald/idb
- Licencia: ISC
- Uso comercial: sí
- Obligaciones: conservar el aviso de copyright
- Modificación y redistribución: sí
- Límites de marca: ninguno

### @fontsource/inter 5.3.0

- Repositorio del empaquetado: https://github.com/fontsource/font-files
- Licencia del paquete y de la fuente: SIL Open Font License 1.1
- Copyright de la fuente: 2016 The Inter Project Authors, https://github.com/rsms/inter
- Uso comercial: sí, también dentro de software de pago
- Obligaciones: la fuente no puede venderse sola. El nombre reservado «Inter» no puede usarse en una versión modificada de la fuente. Esta entrega no modifica los archivos de la fuente
- Modificación de la fuente: solo si la derivada sigue bajo OFL y no usa el nombre reservado
- Redistribución: sí, con la licencia. Copia en `licenses/Inter-OFL-1.1.txt`
- Límites de marca: no renombrar la fuente ni afirmar que ORVUPI es autora de Inter

### Workbox 7.4.1, transitivo y empaquetado

`vite-plugin-pwa` genera el service worker con `workbox-build`. El worker resultante forma parte de `dist/`.

- Repositorio: https://github.com/googlechrome/workbox
- Licencia: MIT
- Uso comercial: sí
- Obligaciones: atribución
- Modificación y redistribución: sí
- Límites de marca: Workbox no es una marca de ORVUPI

## Dependencias de desarrollo

No se sirven al usuario. Se listan porque participan en la build y en las pruebas.

| Paquete | Versión | Licencia | Repositorio |
| --- | --- | --- | --- |
| TypeScript | 7.0.2 | Apache-2.0 | https://github.com/microsoft/TypeScript |
| `@vitejs/plugin-react` | 6.1.2 | MIT | https://github.com/vitejs/vite-plugin-react |
| `vite-plugin-pwa` | 2.0.0 | MIT | https://github.com/vite-pwa/vite-plugin-pwa |
| Vitest | 5.0.5 | MIT | https://github.com/vitest-dev/vitest |
| jsdom | 27.4.0 | MIT | https://github.com/jsdom/jsdom |
| fake-indexeddb | 6.2.6 | Apache-2.0 | https://github.com/dumbmatter/fakeIndexedDB |
| Playwright | 1.64.1 | Apache-2.0 | https://github.com/microsoft/playwright |
| `@axe-core/playwright` | 4.14.0 | MPL-2.0 | https://github.com/dequelabs/axe-core-npm |

`@axe-core/playwright` y axe-core son copyleft débil (MPL-2.0) y solo se usan en las pruebas. No entran en `dist/`. Si en el futuro se modificaran archivos de axe y se redistribuyeran, esos archivos tendrían que seguir bajo MPL-2.0. Hoy no se modifican ni se publican.

jsdom 30 pide Node `^22.22.2`. El entorno fijado es Node 22.14.0, así que se usa jsdom 27.4.0.

## Investigadas y no instaladas

| Paquete | Versión vista | Licencia | Decisión |
| --- | --- | --- | --- |
| `pdfjs-dist` | 6.4.299 | Apache-2.0 | Reservado para el visor de la fase 4 |
| `@mlc-ai/web-llm` | 0.2.86 | Apache-2.0 | Reservado para la fase 6 |
| `@huggingface/transformers` | 4.3.1 | Apache-2.0 | Reservado para la fase 6 |
| HyperFormula | 3.5.0 | GPL-3.0-only | Rechazada |
| Handsontable | 18.1.2 | Licencia comercial propia | Rechazada |
| `xlsx` | 0.18.5 (2022-03-24) | Apache-2.0 en npm, sin versiones nuevas | No se añade |
| `@fortune-sheet/react` | 1.0.4 | MIT | Demasiado pesada para esta fase |
| `@univerjs/core` | 1.0.4 | Apache-2.0 | Demasiado pesada para esta fase |
| formulajs | 1.0.8 | MIT | Candidata de la fase 5 |
| PapaParse | 5.7.0 | MIT | Candidata de la fase 5 |
| ExcelJS | 4.4.0 | MIT | Candidata de la fase 5 |

## Identidad visual

El avatar es el pulpo rosa que ya está en `web/v2/assets/orvupi/avatar.png`. Se copió y se redujo a los iconos de `apps/work/public`. `web/v2` no se modificó. No es una dependencia de terceros. La fuente de titulares es la pila del sistema `"Arial Rounded MT Bold", "Trebuchet MS", system-ui`. No se descarga una webfont para los títulos y no se usa Google Fonts.

## npm audit

`npm audit` en `apps/work` el 17 de octubre de 2026: 0 vulnerabilidades (64 dependencias de producción, 472 de desarrollo). `glob@11.1.0`, transitivo de Workbox, aparece como deprecado en el registro. No se parchea a mano porque el árbol lo fija `vite-plugin-pwa`.
