# Propuesta de portada ORVUPI

8 de noviembre de 2026. Propuesta original para que Cristian la autorice. No está aplicada a `web/v2` ni a orvupi.com.

La página navegable es `docs/propuesta-portada/index.html`. Se abre en el navegador desde esa carpeta: el logotipo, el símbolo y el avatar van en `marca/` junto al HTML. Los enlaces «Abrir» salen de la propuesta y entran en el producto actual.

El pulido lo hizo este agente. Opus no estaba disponible.

## Qué es

Una portada de empresa, no una campaña. El logotipo empresarial (símbolo rosa y palabra ORVUPI en azul marino) firma la cabecera. El avatar 3D tiene una escena propia, a la derecha en escritorio y debajo de las acciones en pantallas estrechas. Las herramientas se alcanzan por nombre, sin imitar su interfaz.

La maqueta v03 del paquete se usó solo como referencia de encargo. No se copió su composición, su paleta ni sus vistas falsas de las aplicaciones. Tampoco se copiaron las webs visitadas.

## Estructura

1. Aviso de que esto es una propuesta y no cambia orvupi.com.
2. Cabecera: logotipo, Herramientas, Comunidad, Proyecto, Token, idioma y «Abrir Work».
3. Portada: frase, dos acciones, escena del personaje e índice de cinco herramientas.
4. Fichas de Work, Studio, Sonar, Academy, ARQIVEN y Verify, con estado y enlace real.
5. Primeros pasos y tres tareas de Academy.
6. Tres puertas: comunidad, cultura y herramientas.
7. Construcción: Novedades y Tablero, sin cifras inventadas.
8. Token: la dirección ya publicada, con la contradicción del README a la vista, y el enlace a Riesgos.
9. Mapa de rutas, redirecciones e idiomas.
10. Pie con los mismos destinos.

## Distribución

El papel es `#f4f1eb`. La tinta es `#0d1628`, tomada del wordmark del logotipo. El fucsia del logo, `#de1862`, se queda en la imagen y en la regla de tres píxeles bajo el título. El texto rosa usa `#b81452` (contraste 5,71:1 sobre el papel): el fucsia plano del logo se queda en 4,22:1 y no sirve para letra pequeña.

La portada es un índice. A la izquierda, el título y las dos acciones. A la derecha, el retrato completo. Debajo, una lista numerada con el uso y el enlace de cada herramienta. En menos de 900 px de ancho el retrato pasa debajo de las acciones, para que la cara no compita con los botones y el menú quepa.

Tipografía de títulos: Palatino o Georgia, las que tenga el sistema. Interfaz: la sans del sistema. No se cargan fuentes externas.

## Navegación

Cuatro grupos, no once enlaces en fila.

- Herramientas: Work, Studio, Sonar, Academy, ARQIVEN. Verify cuelga de Sonar, porque es la entrada de verificación y no el ranking.
- Comunidad: comunidad, cultura y contribuir.
- Proyecto: qué es ORVUPI, novedades, tablero, visión, metodología, marca y seguridad. Riesgos y legal están en el menú estrecho y en el pie, no como aviso en la portada.
- Token: su sección, no un botón de compra.

En escritorio los grupos son desplegables. Se cierran con Escape y al abrir uno se cierra el otro. Por debajo de 900 px hay un botón Menú que pasa a Cerrar, con los mismos grupos. Escape devuelve el foco al botón. El salto al contenido es el primer tab.

«Abrir Work» no abre un editor. Entra en el inicio de Work.

El idioma de esta propuesta es español. El control ES enlaza las cinco URL vigentes (`/`, `/en/`, `/pt-br/`, `/ja/`, `/ko/`). No traduce la maqueta.

## Componentes

Cabecera opaca, para que al desplazarse el título no se transparente encima del logotipo. Botón de tinta para la acción principal y botón de línea para la secundaria. Fichas con nombre, estado escrito (no solo un color) y enlace. El estado «Sin modelo propio» usa un círculo hueco; el resto, un punto lleno, y en los dos casos la frase es la que informa. Índice numerado. Tres puertas con borde superior. Lista de rutas. Pie en tinta.

La escena reserva la proporción 1:1 del PNG. El movimiento, si se activa, solo anima la sombra del marco. No recorta tentáculos ni cara. Empieza en imagen fija. Con movimiento reducido sigue fija hasta que la persona pulsa «Movimiento suave». Pausar, salir de la pestaña o dejar de ver la escena detienen la sombra. «Imagen fija» apaga la intención. No hay vídeo y ningún botón de la portada depende de él.

## Integración de las herramientas

| Herramienta | Dónde queda en la propuesta | Qué no cambia |
| --- | --- | --- |
| Work | Índice 01 y ficha. Enlace a `/work/`. | Documentos, formatos, papelera y datos locales. |
| Studio | Índice 02 y ficha. Enlace a `/studio/`. | Catálogo, editor, plantillas neutras y exportaciones. |
| Sonar | Índice 03 y ficha. Enlace a `/sonar/`. | Interfaz oscura, cifras y fuentes. Aquí no se pintan precios. |
| Verify | Línea de Sonar y ficha propia. Enlace a `/verify/`. | Sigue siendo la verificación, no el ranking. |
| Academy | Índice 04, ficha y tres tareas. | Artículos, rutas, prácticas, glosario, progreso y cuaderno. |
| Redirecciones | Mapa: `/aprender/`, `/lab/`, `/pares/`, `/cuaderno/`, `/comparar/`. | Siguen hacia Academy. |
| ARQIVEN | Índice 05 y ficha. | Se dice que no hay modelo propio y que Proyectos sigue pendiente. |
| Token | Sección propia. Dirección `Bj6orFgn4UegmXtQ4WHcBsHSjjfgruHcScCSeauW1TyU`. | No se certifica on-chain. El README sigue en contradicción. |
| Comunidad, memes, contribuir, novedades, tablero, visión, metodología, marca, seguridad, riesgos, legal | Menú, puertas, construcción o pie. | Textos y destinos actuales. |
| Idiomas | Control ES hacia las cinco URL. | La web publicada sigue en cinco idiomas. |

## Autorrevisión

Hecha el 8 de noviembre de 2026 en Chrome 156, headless, sobre Linux. No es un dispositivo físico ni Safari, Firefox o Edge.

| Comprobación | Resultado |
| --- | --- |
| Escritorio 1440×900 y 1024×800 | Sin desbordamiento. En 1024 la cabecera completa cabe: logotipo, cuatro grupos, ES y Abrir Work. |
| Tablet 768×1024 | La portada se apila: texto, botones y después el retrato. Las fichas van de dos en dos. Sin desbordamiento. |
| Móvil 390×844 y 320×700 | Botones a ancho completo. Menú abre, dice Cerrar y lista los destinos. Sin desbordamiento. |
| Ancla «Ver herramientas» | El título queda por debajo de la cabecera (medido: el título a 254 px y la cabecera termina a 73 px). |
| Teclado | El primer tab es «Saltar al contenido». Enter en Herramientas abre el grupo. Escape lo cierra y devuelve el foco. |
| Movimiento reducido | La escena arranca fija y lo dice. Activarla es voluntario. Pausar la apaga. |
| Contraste | Tinta sobre papel 16:1. Texto secundario `#3a4658` sobre papel 8,5:1. Blanco sobre tinta 18:1. Rosa de texto `#b81452` sobre papel 5,7:1. |
| Marca | Logotipo de cabecera sin deformar. Símbolo fucsia en la entradilla. Avatar con un rizo, ojos azules, rosa coral y ventosas claras. No se usa la variante de emblema o brazalete. |
| Imágenes | Las cuatro cargan. El PNG del avatar pesa unos 2 MB: en una integración futura haría falta una copia de pantalla más ligera, sin cambiar el dibujo. |

Corregido en esta pasada: la cabecera era translúcida y el título se leía a través del logotipo; en 768 px el retrato y los botones de la escena se apretaban en dos columnas; el fucsia del logo no daba contraste para letra pequeña; el estado de ARQIVEN parecía el mismo punto que «disponible».

## Qué aprendí de cada referencia

Visita del 8 de noviembre de 2026. Escritorio a 1440×900 y, donde se indica, móvil a 390×844, con Chrome 156 headless. No acepté condiciones ni me suscribí a nada.

### SHIB — shib.io

La captura de escritorio no llegó a generarse: el navegador headless no cerró la página. Sí se leyó el HTML (HTTP 200): cabecera con ecosistema, Shibarium, DappStore, conectar cartera, tokens, comunidad, noticias y desarrolladores; bloques por público (gobiernos, empresas, personas); contadores de red; y tres verbos, ganar, participar y construir.

Se aprovecha la separación por tarea, no por eslogan. En ORVUPI son herramientas, comunidad y proyecto. Se descartan la cartera en la cabecera, los contadores que no podemos demostrar y la pared de promociones.

### FLOKI — floki.com

Visto en escritorio y en móvil. Cápsula negra, una frase, dos botones y, debajo, logos de medios. En móvil la imagen ocupa la pantalla y el botón principal va a todo el ancho, encima de la ilustración.

Se aprovecha la frase única y el par de acciones. El botón de móvil a todo el ancho está en la propuesta, pero sobre el papel, no sobre el retrato: en Floki el texto compite con el barco. Se descartan «comprar» como acción principal, la tira de medios y la página interminable de productos financieros.

### BONK — bonkcoin.com

En escritorio la primera pantalla era una ventana de boletín sobre un titular y un personaje a la derecha. No la cerré ni envié datos. El texto de la página, leído aparte, separa el logotipo del personaje y lista productos con un enlace cada uno, más una cinta de logos.

Se aprovecha eso: logotipo estable en la cabecera y avatar en su escena. Se descartan el boletín al entrar, la cinta de logos y los productos financieros. No hay vídeo propio, así que la escena es la imagen fija.

### SNEK — snek.com

En escritorio había un acuerdo de entrada. No lo confirmé. Detrás, el texto público abre con tres puertas: comunidad, cultura y marca.

Se aprovechan las puertas, con los nombres de ORVUPI: comunidad, cultura y herramientas. Se descartan el muro de condiciones, los contadores sin fuente propia y el catálogo de objetos.

### PEPE — pepe.vip

Visto en escritorio. Una frase, el personaje a un lado y una navegación que es el índice de la página: inicio, acerca de, cómo comprar, tokenomics, hoja de ruta. Debajo, el cómo comprar son pasos numerados.

Se aprovechan la frase corta y los pasos numerados. Los de ORVUPI son elegir, abrir y aprender. Se descartan comprar, los botones de exchanges y el verde único como sistema visual.

### Dogecoin — dogecoin.com

Visto en escritorio y en móvil. El personaje ocupa el centro. La navegación usa etiquetas de humor. Más abajo hay tres pasos y una capa de ayuda (Dogepedia y preguntas). En móvil no hay una acción principal: hay un aviso de cartera y el personaje.

Se aprovecha la ayuda por tareas, aquí Academy al lado de los tres pasos. Se descarta exigir una cartera para funciones que viven en el navegador, y se evita que el personaje tape la acción, como pasa en su móvil.

### Solana — solana.com

El headless se quedó en la verificación del navegador. El contenido sí se leyó: un titular de categoría, cifras con fuente, crónica de cambios y papeles distintos (quien construye, quien crea, quien valida).

Se aprovecha la crónica con fecha, que en ORVUPI ya son Novedades y Tablero. Se descartan las cifras de red y el tono de mercado de capitales. Esta propuesta no inventa métricas.

### Ethereum — ethereum.org

Visto en escritorio y en móvil. La navegación son verbos: aprender, usar, construir, participar. Hay mucho blanco entre la ilustración y el titular. En móvil quedan el logo, buscar, el menú, el titular y un solo botón a todo el ancho.

Se aprovechan el aire antes del titular, el menú por grupos y el botón ancho en móvil. Se descarta un buscador que aquí no buscaría nada, y la ilustración no sustituye al logotipo.

### Phantom — phantom.app

Visto en escritorio y en móvil. Cabecera clara, grupos en una pastilla y un solo botón de descarga. El titular vive en un recuadro oscuro. En móvil el aviso de cookies tapa el botón del recuadro.

Se aprovecha un solo botón de cabecera, que aquí es Abrir Work, y el recuadro del personaje separado del papel de la página. Se descarta cualquier aviso que tape ese botón. La cabecera de la propuesta no lleva boletín ni cookies.

### Kraken — kraken.com

Visto en escritorio. Cabecera corta con líneas de producto, una frase, una acción y tres datos con una leyenda debajo. El producto denso va en una banda oscura, aparte de la entrada simple.

Se aprovecha esa separación: la portada es el índice y Sonar, Work o Studio conservan su densidad dentro. Se descartan el formulario de alta, el volumen en dólares y cualquier dato sin fecha y sin fuente.

### Uniswap — uniswap.org

Visto en escritorio y en móvil. La herramienta está en la primera pantalla. La navegación nombra zonas del producto. Hay un solo acento rosa para el paso siguiente. En móvil el botón de la cabecera sigue visible junto al menú.

Se aprovecha que el índice de herramientas esté en la primera pantalla, no varias secciones más abajo. Se descarta dibujar un widget falso de intercambio o de las aplicaciones: las fichas explican y el enlace abre la herramienta real.

### Coinbase — coinbase.com

Bloqueada. Escritorio y lectura devolvieron la verificación de Cloudflare. No describo su diseño.

### Binance — binance.com/en

Bloqueada. La petición respondió 202 sin cuerpo y la captura no se escribió. No describo su estructura.

## Qué queda pendiente

- Autorización de Cristian antes de tocar la web publicada.
- Coinbase y Binance, si se quieren ver de verdad, necesitan un navegador que supere su control anti-bot.
- La captura visual de SHIB y de Solana no salió; de esas dos solo hay lectura de contenido.
- Safari, Firefox, Edge y dispositivos reales no se probaron. Lo de arriba es emulación de tamaño en Chrome.
- Traducir esta propuesta a los otros cuatro idiomas no forma parte de ella: los idiomas siguen en el producto.
- El README aún contradice la página del token. No se corrige aquí.
- No hay clip aprobado del personaje. La sombra del marco es solo un ensayo de movimiento.

## Cómo se revierte

No hay cambio en `web/v2`, en datos locales ni en servicios. Quitar la propuesta es borrar `docs/propuesta-portada/` o no fusionar la rama. No hace falta migrar IndexedDB ni borrar datos de ningún navegador.
