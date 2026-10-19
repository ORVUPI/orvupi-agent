import type { ShapeKind, SlideAnim, SlideLayout, SlideTheme, SlideTransition } from "./model";

export type Tx = (es: string, en: string) => string;

const LAYOUTS: Record<SlideLayout, [string, string]> = {
  title: ["Diapositiva de título", "Title slide"],
  section: ["Encabezado de sección", "Section header"],
  "title-body": ["Título y cuerpo", "Title and body"],
  two: ["Título y dos columnas", "Title and two columns"],
  "title-only": ["Solo título", "Title only"],
  "one-column": ["Una columna de texto", "One column text"],
  "main-point": ["Punto principal", "Main point"],
  "section-desc": ["Encabezado de sección y descripción", "Section title and description"],
  caption: ["Leyenda", "Caption"],
  "big-number": ["Número grande", "Big number"],
  blank: ["En blanco", "Blank"],
};

const THEME_NAMES: Record<SlideTheme, [string, string]> = {
  sencillo: ["Sencillo claro", "Simple light"], oscuro: ["Sencillo oscuro", "Simple dark"], papel: ["Papel ORVUPI", "ORVUPI paper"], tinta: ["Tinta", "Ink"],
  bosque: ["Bosque", "Forest"], rosa: ["Rosa", "Rose"], coral: ["Coral", "Coral"], menta: ["Menta", "Mint"], medianoche: ["Medianoche", "Midnight"], pulpo: ["Pulpo", "Octopus"],
};

const SHAPE_NAMES: Record<ShapeKind, [string, string]> = {
  rect: ["Rectángulo", "Rectangle"], round: ["Rectángulo redondeado", "Rounded rectangle"], ellipse: ["Elipse", "Oval"], triangle: ["Triángulo", "Triangle"],
  "right-triangle": ["Triángulo rectángulo", "Right triangle"], diamond: ["Rombo", "Diamond"], pentagon: ["Pentágono", "Pentagon"], hexagon: ["Hexágono", "Hexagon"],
  octagon: ["Octógono", "Octagon"], star: ["Estrella", "Star"], heart: ["Corazón", "Heart"], plus: ["Más", "Plus"], cloud: ["Nube", "Cloud"], callout: ["Llamada", "Callout"],
  "arrow-right": ["Flecha a la derecha", "Right arrow"], "arrow-left": ["Flecha a la izquierda", "Left arrow"], "arrow-up": ["Flecha hacia arriba", "Up arrow"],
  "arrow-down": ["Flecha hacia abajo", "Down arrow"], chevron: ["Galón", "Chevron"],
};

const TRANSITIONS: Record<SlideTransition, [string, string]> = {
  none: ["Ninguna", "None"], dissolve: ["Disolver", "Dissolve"], fade: ["Desvanecer", "Fade"], "slide-right": ["Deslizar desde la derecha", "Slide from right"],
  "slide-left": ["Deslizar desde la izquierda", "Slide from left"], flip: ["Voltear", "Flip"], cube: ["Cubo", "Cube"], gallery: ["Galería", "Gallery"], slide: ["Deslizar", "Slide"],
};

const ANIMS: Record<SlideAnim, [string, string]> = {
  appear: ["Aparecer", "Appear"], fade: ["Aparecer gradualmente", "Fade in"], "fly-left": ["Entrar desde la izquierda", "Fly in from left"], "fly-right": ["Entrar desde la derecha", "Fly in from right"],
  "fly-bottom": ["Entrar desde abajo", "Fly in from bottom"], zoom: ["Acercar", "Zoom in"], spin: ["Girar", "Spin"], pop: ["Aparecer de golpe", "Pop"],
};

const pick = (tx: Tx, pair: [string, string]) => tx(pair[0], pair[1]);
export const layoutName = (tx: Tx, v: SlideLayout) => pick(tx, LAYOUTS[v]);
export const themeName = (tx: Tx, v: SlideTheme) => pick(tx, THEME_NAMES[v]);
export const shapeName = (tx: Tx, v: ShapeKind) => pick(tx, SHAPE_NAMES[v]);
export const transitionName = (tx: Tx, v: SlideTransition) => pick(tx, TRANSITIONS[v]);
export const animName = (tx: Tx, v: SlideAnim) => pick(tx, ANIMS[v]);
