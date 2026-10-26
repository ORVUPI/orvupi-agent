/**
 * Biblioteca local de Studio (fotos y elementos).
 * Escenas SVG geométricas originales, CC0, sin stock y sin mascota.
 * No son archivos de la biblioteca del editor (`photos/catalog.json`).
 */

const PHOTO_TOPICS = [
  { id: "papel", es: "Papel", en: "Paper", n: 28 },
  { id: "agua", es: "Agua", en: "Water", n: 26 },
  { id: "campo", es: "Campo", en: "Field", n: 24 },
  { id: "azul", es: "Azul", en: "Blue", n: 24 },
  { id: "flores", es: "Flores", en: "Flowers", n: 26 },
  { id: "textura", es: "Textura", en: "Texture", n: 22 },
  { id: "arquitectura", es: "Arquitectura", en: "Architecture", n: 22 },
  { id: "minimal", es: "Minimal", en: "Minimal", n: 20 },
];

const ELEMENT_TOPICS = [
  { id: "flecha", es: "Flecha", en: "Arrow", n: 18 },
  { id: "flechas", es: "Flechas", en: "Arrows", n: 14 },
  { id: "circulo", es: "Círculo", en: "Circle", n: 16 },
  { id: "formas", es: "Formas", en: "Shapes", n: 18 },
  { id: "lineas", es: "Líneas", en: "Lines", n: 16 },
  { id: "marcos", es: "Marcos", en: "Frames", n: 14 },
  { id: "ondas", es: "Ondas", en: "Waves", n: 12 },
  { id: "stickers", es: "Pegatinas", en: "Stickers", n: 16 },
];

const PHOTO_NAMES = {
  papel: [["Papel rayado", "Ruled paper"], ["Papel de cuaderno", "Notebook paper"], ["Papel kraft", "Kraft paper"], ["Papel roto", "Torn paper"], ["Papel milimetrado", "Graph paper"], ["Hoja de papel", "Sheet of paper"], ["Papel a rayas", "Striped paper"], ["Papel suave", "Soft paper"]],
  agua: [["Agua en calma", "Still water"], ["Olas suaves", "Soft waves"], ["Agua clara", "Clear water"], ["Reflejo azul", "Blue reflection"], ["Espuma", "Foam"], ["Gotas", "Drops"]],
  campo: [["Campo abierto", "Open field"], ["Horizonte verde", "Green horizon"], ["Pradera", "Meadow"], ["Campo al sol", "Sunny field"], ["Colina", "Hill"], ["Trigal", "Wheat field"]],
  azul: [["Azul profundo", "Deep blue"], ["Azul claro", "Light blue"], ["Degradado azul", "Blue gradient"], ["Azul noche", "Night blue"], ["Azul hielo", "Ice blue"], ["Azul suave", "Soft blue"]],
  flores: [["Flor blanca", "White flower"], ["Pétalos", "Petals"], ["Ramo suave", "Soft bouquet"], ["Dalia", "Dahlia"], ["Flor rosa", "Pink flower"], ["Botánica", "Botanical"]],
  textura: [["Textura de lino", "Linen texture"], ["Textura de mármol", "Marble texture"], ["Pliegues", "Folds"], ["Yeso", "Plaster"], ["Tela", "Cloth"], ["Grano fino", "Fine grain"]],
  arquitectura: [["Fachada", "Facade"], ["Ventanas", "Windows"], ["Arco", "Arch"], ["Hormigón", "Concrete"], ["Escalera", "Stair"], ["Vidrio", "Glass"]],
  minimal: [["Minimal claro", "Light minimal"], ["Sombra suave", "Soft shadow"], ["Objeto quieto", "Still object"], ["Plano crema", "Cream plane"], ["Centro vacío", "Empty center"], ["Bloque suave", "Soft block"]],
};

const ELEMENT_NAMES = {
  flecha: [["Flecha", "Arrow"], ["Flecha curva", "Curved arrow"], ["Flecha fina", "Thin arrow"], ["Flecha ancha", "Wide arrow"]],
  flechas: [["Par de flechas", "Arrow pair"], ["Flechas opuestas", "Opposite arrows"], ["Flechas en arco", "Arc arrows"], ["Flechas cruzadas", "Crossed arrows"]],
  circulo: [["Círculo", "Circle"], ["Anillo", "Ring"], ["Círculo doble", "Double circle"], ["Punto", "Dot"]],
  formas: [["Forma orgánica", "Organic shape"], ["Triángulo", "Triangle"], ["Rombo", "Diamond"], ["Blob", "Blob"]],
  lineas: [["Línea", "Line"], ["Trazo", "Stroke"], ["Divisor", "Divider"], ["Trazo libre", "Loose stroke"]],
  marcos: [["Marco", "Frame"], ["Esquina", "Corner"], ["Marco redondo", "Rounded frame"], ["Recuadro", "Box"]],
  ondas: [["Onda", "Wave"], ["Cinta", "Ribbon"], ["Onda doble", "Double wave"], ["Espiral suave", "Soft spiral"]],
  stickers: [["Estrella", "Star"], ["Etiqueta", "Label"], ["Destello", "Spark"], ["Sello", "Seal"]],
};

const RATIOS = [[3, 4], [1, 1], [4, 5], [5, 4], [2, 3], [3, 2], [4, 3], [5, 7]];

function rngOf(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedOf(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rect(x, y, w, h, fill, extra = {}) {
  return { t: "rect", x: round(x), y: round(y), width: round(w), height: round(h), fill, ...extra };
}

function circ(cx, cy, r, fill, extra = {}) {
  return { t: "circle", cx: round(cx), cy: round(cy), r: round(r), fill, ...extra };
}

function ell(cx, cy, rx, ry, fill, extra = {}) {
  return { t: "ellipse", cx: round(cx), cy: round(cy), rx: round(rx), ry: round(ry), fill, ...extra };
}

function path(d, extra = {}) {
  return { t: "path", d, ...extra };
}

function line(x1, y1, x2, y2, stroke, sw = 2, extra = {}) {
  return {
    t: "line",
    x1: round(x1),
    y1: round(y1),
    x2: round(x2),
    y2: round(y2),
    stroke,
    "stroke-width": sw,
    "stroke-linecap": "round",
    ...extra,
  };
}

function round(n) {
  return Math.round(n * 10) / 10;
}

function pick(rng, list) {
  return list[Math.floor(rng() * list.length)];
}

function scene(w, h, nodes) {
  return { w, h, nodes };
}

function sizeFor(index) {
  const [a, b] = RATIOS[index % RATIOS.length];
  const width = 360;
  return { w: width, h: Math.round(width * b / a) };
}

function wash(nodes, w, h, from, to) {
  nodes.push(rect(0, 0, w, h, from));
  nodes.push(rect(0, h * 0.45, w, h * 0.55, to, { opacity: 0.85 }));
}

function paperScene(w, h, rng, variant) {
  const nodes = [];
  const cream = pick(rng, ["#f6f1e7", "#fbf7f0", "#f3eee4", "#fffdf8"]);
  if (variant === 0) {
    nodes.push(rect(0, 0, w, h, cream));
    nodes.push(rect(w * 0.12, 0, 2, h, "#e7b7b2"));
    for (let y = h * 0.08; y < h; y += h * 0.055) nodes.push(line(w * 0.08, y, w * 0.94, y, "#e4d9c8", 1.4));
    for (let i = 0; i < 6; i += 1) nodes.push(circ(w * 0.06, h * (0.12 + i * 0.14), 7, "#efe8dc"));
  } else if (variant === 1) {
    nodes.push(rect(0, 0, w, h, "#f7f4ea"));
    for (let x = 16; x < w; x += 22) nodes.push(line(x, 0, x, h, "#e3ecdf", 1));
    for (let y = 16; y < h; y += 22) nodes.push(line(0, y, w, y, "#e3ecdf", 1));
  } else if (variant === 2) {
    nodes.push(rect(0, 0, w, h, "#e7d3b0"));
    let d = `M0 ${round(h * 0.16)}`;
    for (let x = 0; x <= w; x += 20) d += ` L${x} ${round(h * 0.1 + rng() * h * 0.1)}`;
    d += ` L${w} ${h} L0 ${h} Z`;
    nodes.push(path(d, { fill: "#f7f1e6" }));
    nodes.push(rect(w * 0.08, h * 0.28, w * 0.84, h * 0.08, "#f0d2cf", { opacity: 0.9 }));
  } else if (variant === 3) {
    nodes.push(rect(0, 0, w, h, "#f4d5d2"));
    nodes.push(rect(w * 0.08, h * 0.12, w * 0.84, h * 0.76, "#fffdf8"));
    let d = `M${round(w * 0.08)} ${round(h * 0.55)}`;
    for (let x = w * 0.08; x <= w * 0.92; x += 16) d += ` L${round(x)} ${round(h * 0.5 + rng() * 18)}`;
    d += ` L${round(w * 0.92)} ${round(h * 0.88)} L${round(w * 0.08)} ${round(h * 0.88)} Z`;
    nodes.push(path(d, { fill: "#f7e7df" }));
  } else if (variant === 4) {
    nodes.push(rect(0, 0, w, h, "#f3efe6"));
    for (let i = 0; i < 26; i += 1) {
      nodes.push(circ(rng() * w, rng() * h, 1.2 + rng() * 2.4, "#e7dcc8", { opacity: 0.45 + rng() * 0.4 }));
    }
    nodes.push(ell(w * 0.7, h * 0.35, w * 0.28, h * 0.18, "#ffffff", { opacity: 0.35 }));
  } else if (variant === 5) {
    const stripes = ["#d7efe4", "#f7fbf6", "#cfe6f2", "#f4f1c8"];
    const band = w / 7;
    nodes.push(rect(0, 0, w, h, "#f7fbf8"));
    for (let i = 0; i < 7; i += 1) nodes.push(rect(i * band, 0, band + 0.5, h, stripes[i % stripes.length]));
  } else if (variant === 6) {
    nodes.push(rect(0, 0, w, h, "#efe6d4"));
    nodes.push(rect(18, 18, w - 36, h - 36, "#fbf7f0"));
    for (let y = 48; y < h - 30; y += 28) nodes.push(line(36, y, w - 36, y, "#e6dccb", 1.2));
  } else {
    nodes.push(rect(0, 0, w, h, "#f7f3ea"));
    nodes.push(path(`M0 ${round(h * 0.72)} C ${round(w * 0.3)} ${round(h * 0.6)}, ${round(w * 0.55)} ${round(h * 0.9)}, ${w} ${round(h * 0.66)} L${w} ${h} L0 ${h} Z`, { fill: "#e7d3c4" }));
    nodes.push(rect(w * 0.62, 0, w * 0.38, h * 0.22, "#f0b6c0"));
  }
  return scene(w, h, nodes);
}

function waterScene(w, h, rng, variant) {
  const nodes = [];
  const top = pick(rng, ["#d7eef8", "#c5e4f5", "#e7f6fb", "#b7d4ea"]);
  const deep = pick(rng, ["#3d7ea6", "#2f6f97", "#4e9bb8", "#1f4e89"]);
  wash(nodes, w, h, top, deep);
  if (variant % 3 === 0) {
    for (let i = 0; i < 5; i += 1) {
      const y = h * (0.42 + i * 0.1);
      let d = `M0 ${round(y)}`;
      for (let x = 0; x <= w; x += 24) d += ` Q ${x + 12} ${round(y + Math.sin(i + x / 80) * 10)}, ${Math.min(w, x + 24)} ${round(y)}`;
      d += ` L${w} ${h} L0 ${h} Z`;
      nodes.push(path(d, { fill: i % 2 ? "#ffffff" : "#9fd0ea", opacity: 0.28 }));
    }
  } else if (variant % 3 === 1) {
    for (let i = 0; i < 4; i += 1) {
      nodes.push(ell(w * 0.5, h * (0.35 + i * 0.12), w * (0.22 + i * 0.12), 10 + i * 4, "none", { stroke: "#ffffff", "stroke-width": 2, opacity: 0.45 }));
    }
    for (let i = 0; i < 8; i += 1) nodes.push(circ(rng() * w, rng() * h, 3 + rng() * 8, "#ffffff", { opacity: 0.35 }));
  } else {
    nodes.push(rect(0, h * 0.62, w, h * 0.38, "#f4fbff", { opacity: 0.35 }));
    for (let i = 0; i < 10; i += 1) nodes.push(circ(rng() * w, h * 0.2 + rng() * h * 0.5, 2 + rng() * 5, "#ffffff", { opacity: 0.5 }));
    nodes.push(ell(w * 0.3, h * 0.28, 28, 16, "#ffffff", { opacity: 0.55 }));
  }
  return scene(w, h, nodes);
}

function fieldScene(w, h, rng, variant) {
  const nodes = [];
  const sky = pick(rng, ["#d9ecf8", "#e7f3ea", "#f3efe2", "#d5e6f6"]);
  nodes.push(rect(0, 0, w, h, sky));
  nodes.push(circ(w * (0.72 + rng() * 0.1), h * 0.18, 28 + rng() * 10, "#f6e27a"));
  const hill = pick(rng, ["#7ea86a", "#6e9a62", "#8fb56a", "#5f8f56"]);
  nodes.push(path(`M0 ${round(h * 0.62)} Q ${round(w * 0.35)} ${round(h * 0.4)} ${round(w * 0.7)} ${round(h * 0.58)} T ${w} ${round(h * 0.5)} L${w} ${h} L0 ${h} Z`, { fill: hill }));
  nodes.push(path(`M0 ${round(h * 0.78)} Q ${round(w * 0.4)} ${round(h * 0.66)} ${w} ${round(h * 0.8)} L${w} ${h} L0 ${h} Z`, { fill: variant % 2 ? "#c6b15a" : "#4f7d45" }));
  if (variant % 2 === 0) {
    for (let i = 0; i < 14; i += 1) {
      const x = rng() * w;
      const y = h * 0.72 + rng() * h * 0.2;
      nodes.push(line(x, y, x + 2, y - 16 - rng() * 18, "#f4e7a2", 2));
    }
  } else {
    for (let i = 0; i < 10; i += 1) nodes.push(circ(rng() * w, h * 0.7 + rng() * h * 0.22, 3, pick(rng, ["#f2f6ea", "#e7b3c4", "#f6e27a"])));
  }
  return scene(w, h, nodes);
}

function blueScene(w, h, rng, variant) {
  const nodes = [];
  const colors = [
    ["#dbeafe", "#93c5fd"],
    ["#1e3a5f", "#0f2744"],
    ["#e0f2fe", "#7dd3fc"],
    ["#312e81", "#6366f1"],
    ["#cffafe", "#67e8f9"],
    ["#0f172a", "#1e293b"],
  ];
  const [a, b] = colors[variant % colors.length];
  wash(nodes, w, h, a, b);
  if (variant % 2 === 0) {
    for (let i = 0; i < 6; i += 1) {
      nodes.push(circ(rng() * w, rng() * h, 30 + rng() * 70, "#ffffff", { opacity: 0.08 + rng() * 0.12 }));
    }
  } else {
    nodes.push(rect(w * 0.12, h * 0.18, w * 0.76, h * 0.28, "#ffffff", { opacity: 0.14, rx: 18 }));
    nodes.push(rect(w * 0.2, h * 0.54, w * 0.5, h * 0.16, "#ffffff", { opacity: 0.1, rx: 14 }));
  }
  return scene(w, h, nodes);
}

function flowerScene(w, h, rng, variant) {
  const nodes = [];
  const bg = pick(rng, ["#e7f0e4", "#f4efe6", "#f7eef2", "#e9eef6"]);
  nodes.push(rect(0, 0, w, h, bg));
  const cx = w * (0.42 + rng() * 0.16);
  const cy = h * (0.42 + rng() * 0.1);
  const petals = 10 + (variant % 5) * 2;
  const fill = pick(rng, ["#f7f4ef", "#f6d5df", "#f3e7c8", "#f7fbf8", "#e7d4f2"]);
  const len = Math.min(w, h) * (0.16 + (variant % 3) * 0.03);
  for (let i = 0; i < petals; i += 1) {
    const angle = (i / petals) * 360 + variant * 3;
    nodes.push(ell(cx, cy - len * 0.45, len * 0.28, len, fill, { transform: `rotate(${round(angle)} ${round(cx)} ${round(cy)})`, opacity: 0.92 }));
  }
  nodes.push(circ(cx, cy, len * 0.34, "#fffdf8"));
  nodes.push(circ(cx, cy, len * 0.14, "#e6c36a"));
  if (variant % 2 === 1) {
    nodes.push(line(cx, cy + len * 0.2, cx, h * 0.92, "#7d8f72", 3));
    nodes.push(ell(cx + 18, cy + len, 16, 8, "#8eae86", { transform: `rotate(30 ${round(cx + 18)} ${round(cy + len)})` }));
  }
  return scene(w, h, nodes);
}

function textureScene(w, h, rng, variant) {
  const nodes = [];
  if (variant % 4 === 0) {
    nodes.push(rect(0, 0, w, h, "#e7e1d6"));
    for (let i = 0; i < 7; i += 1) {
      const y = h * (0.1 + i * 0.12);
      nodes.push(path(`M0 ${round(y)} C ${round(w * 0.3)} ${round(y - 24)}, ${round(w * 0.6)} ${round(y + 28)}, ${w} ${round(y - 6)}`, {
        fill: "none",
        stroke: i % 2 ? "#f7f4ef" : "#cfc4b4",
        "stroke-width": 18 + (i % 3) * 6,
        opacity: 0.55,
      }));
    }
  } else if (variant % 4 === 1) {
    nodes.push(rect(0, 0, w, h, "#f4f1ec"));
    for (let i = 0; i < 5; i += 1) {
      nodes.push(path(`M${round(rng() * w)} 0 C ${round(rng() * w)} ${round(h * 0.4)}, ${round(rng() * w)} ${round(h * 0.6)}, ${round(rng() * w)} ${h}`, {
        fill: "none",
        stroke: pick(rng, ["#d9d3cb", "#c5d0d4", "#e6d3c4"]),
        "stroke-width": 10,
        opacity: 0.8,
      }));
    }
  } else if (variant % 4 === 2) {
    nodes.push(rect(0, 0, w, h, "#ece7df"));
    for (let i = 0; i < 30; i += 1) nodes.push(circ(rng() * w, rng() * h, 1 + rng() * 3, "#d5cfc4", { opacity: 0.5 }));
    nodes.push(ell(w * 0.5, h * 0.45, w * 0.28, h * 0.18, "#f7f4ef", { opacity: 0.45 }));
  } else {
    nodes.push(rect(0, 0, w, h, "#f6f3ee"));
    for (let y = 8; y < h; y += 10) nodes.push(line(0, y, w, y, "#e4ddd2", 1));
    for (let x = 8; x < w; x += 10) nodes.push(line(x, 0, x, h, "#e4ddd2", 1));
  }
  return scene(w, h, nodes);
}

function archScene(w, h, rng, variant) {
  const nodes = [];
  const wall = pick(rng, ["#e7e4df", "#d9e2ea", "#ece7e1", "#cfd6dc"]);
  nodes.push(rect(0, 0, w, h, wall));
  if (variant % 3 === 0) {
    const cols = 3 + (variant % 2);
    const rows = 4 + (variant % 3);
    const gap = 10;
    const cw = (w - gap * (cols + 1)) / cols;
    const ch = (h * 0.72 - gap * (rows + 1)) / rows;
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        const lit = rng() > 0.72;
        nodes.push(rect(gap + c * (cw + gap), h * 0.12 + r * (ch + gap), cw, ch, lit ? "#f6e7b2" : "#f7f5f2", { rx: 2 }));
      }
    }
  } else if (variant % 3 === 1) {
    nodes.push(rect(w * 0.18, h * 0.28, w * 0.64, h * 0.62, "#f7f4ef"));
    nodes.push(path(`M${round(w * 0.18)} ${round(h * 0.4)} Q ${round(w * 0.5)} ${round(h * 0.08)} ${round(w * 0.82)} ${round(h * 0.4)}`, { fill: "#f7f4ef" }));
    nodes.push(rect(w * 0.42, h * 0.58, w * 0.16, h * 0.32, "#d7c3a4"));
  } else {
    for (let i = 0; i < 6; i += 1) {
      const bw = w * (0.7 - i * 0.08);
      nodes.push(rect((w - bw) / 2, h * 0.15 + i * h * 0.12, bw, h * 0.08, i % 2 ? "#f7f4ef" : "#d5dbe2", { rx: 4 }));
    }
  }
  return scene(w, h, nodes);
}

function minimalScene(w, h, rng, variant) {
  const nodes = [];
  const bg = pick(rng, ["#f6f3ee", "#eef2f4", "#f7f1ea", "#eceaf2"]);
  nodes.push(rect(0, 0, w, h, bg));
  const ink = pick(rng, ["#d9cfc2", "#c5d0d6", "#e4d3c4", "#d5d0e4"]);
  if (variant % 3 === 0) {
    nodes.push(ell(w * 0.5, h * 0.58, w * 0.22, h * 0.1, "#000000", { opacity: 0.06 }));
    nodes.push(ell(w * 0.5, h * 0.48, w * 0.18, h * 0.14, ink));
  } else if (variant % 3 === 1) {
    nodes.push(rect(w * 0.28, h * 0.3, w * 0.44, h * 0.28, ink, { rx: 80 }));
    nodes.push(rect(w * 0.38, h * 0.58, w * 0.24, h * 0.05, "#e7d8c4", { rx: 8 }));
  } else {
    nodes.push(path(`M${round(w * 0.5)} ${round(h * 0.22)} C ${round(w * 0.78)} ${round(h * 0.4)}, ${round(w * 0.7)} ${round(h * 0.72)}, ${round(w * 0.5)} ${round(h * 0.78)} C ${round(w * 0.3)} ${round(h * 0.72)}, ${round(w * 0.22)} ${round(h * 0.4)}, ${round(w * 0.5)} ${round(h * 0.22)} Z`, { fill: "#8eae86" }));
    nodes.push(line(w * 0.5, h * 0.34, w * 0.5, h * 0.7, "#f7f4ef", 2));
  }
  return scene(w, h, nodes);
}

const PHOTO_PAINT = {
  papel: paperScene,
  agua: waterScene,
  campo: fieldScene,
  azul: blueScene,
  flores: flowerScene,
  textura: textureScene,
  arquitectura: archScene,
  minimal: minimalScene,
};

function arrowNodes(variant, color) {
  const nodes = [];
  if (variant % 4 === 0) {
    nodes.push(path("M28 100 H150", { fill: "none", stroke: color, "stroke-width": 10, "stroke-linecap": "round" }));
    nodes.push(path("M132 72 L168 100 L132 128", { fill: "none", stroke: color, "stroke-width": 10, "stroke-linecap": "round", "stroke-linejoin": "round" }));
  } else if (variant % 4 === 1) {
    nodes.push(path("M40 140 C 70 60, 120 60, 150 110", { fill: "none", stroke: color, "stroke-width": 10, "stroke-linecap": "round" }));
    nodes.push(path("M132 86 L168 112 L124 122", { fill: "none", stroke: color, "stroke-width": 10, "stroke-linecap": "round", "stroke-linejoin": "round" }));
  } else if (variant % 4 === 2) {
    nodes.push(path("M36 100 H150", { fill: "none", stroke: color, "stroke-width": 16, "stroke-linecap": "round" }));
    nodes.push(path("M124 64 L176 100 L124 136 Z", { fill: color }));
  } else {
    nodes.push(path("M46 130 L100 46 L154 130", { fill: "none", stroke: color, "stroke-width": 10, "stroke-linecap": "round", "stroke-linejoin": "round" }));
    nodes.push(line(100, 58, 100, 160, color, 10));
  }
  return nodes;
}

function elementScene(topic, index) {
  const color = ["#102032", "#6d28d9", "#0f766e", "#db2777", "#b45309", "#1d4ed8"][index % 6];
  const soft = ["#8B3DFF", "#FF3070", "#102032", "#0f766e", "#d97706", "#2563eb"][index % 6];
  const nodes = [];
  if (topic === "flecha") nodes.push(...arrowNodes(index, color));
  else if (topic === "flechas") {
    nodes.push(...arrowNodes(index, color).map((node) => ({ ...node, transform: "translate(0, -18)" })));
    nodes.push(...arrowNodes(index + 1, soft).map((node) => ({ ...node, transform: "translate(0, 28) scale(0.82)" })));
  } else if (topic === "circulo") {
    nodes.push(circ(100, 100, 58 - (index % 3) * 6, "none", { stroke: color, "stroke-width": 8 }));
    if (index % 2 === 0) nodes.push(circ(100, 100, 24, soft));
    else nodes.push(circ(100, 100, 40, "none", { stroke: soft, "stroke-width": 6 }));
    if (index % 3 === 0) nodes.push(circ(100, 100, 8, color));
  } else if (topic === "formas") {
    const kind = index % 4;
    if (kind === 0) nodes.push(path("M100 36 C 150 40, 172 90, 150 140 C 130 176, 70 176, 50 140 C 28 96, 54 40, 100 36 Z", { fill: soft }));
    else if (kind === 1) nodes.push(path("M100 40 L160 160 H40 Z", { fill: color }));
    else if (kind === 2) nodes.push(rect(52, 52, 96, 96, soft, { transform: "rotate(45 100 100)", rx: 8 }));
    else nodes.push(ell(100, 108, 62, 40, color), ell(78, 88, 22, 16, soft), ell(124, 90, 18, 14, "#f6f1e7"));
  } else if (topic === "lineas") {
    const sw = 4 + (index % 4) * 2;
    if (index % 3 === 0) {
      nodes.push(line(36, 100, 164, 100, color, sw));
      nodes.push(line(36, 78, 120, 78, soft, 4));
    } else if (index % 3 === 1) {
      nodes.push(path("M32 120 C 60 40, 100 160, 168 70", { fill: "none", stroke: color, "stroke-width": sw, "stroke-linecap": "round" }));
    } else {
      for (let i = 0; i < 4; i += 1) nodes.push(line(40, 60 + i * 24, 160 - (i % 2) * 30, 60 + i * 24, i % 2 ? soft : color, 4));
    }
  } else if (topic === "marcos") {
    nodes.push(rect(40, 40, 120, 120, "none", { stroke: color, "stroke-width": 8, rx: index % 2 ? 28 : 8 }));
    if (index % 3 === 1) nodes.push(rect(58, 58, 84, 84, "none", { stroke: soft, "stroke-width": 4, rx: 16 }));
    if (index % 3 === 2) {
      nodes.push(path("M40 70 V40 H70", { fill: "none", stroke: soft, "stroke-width": 8, "stroke-linecap": "round" }));
      nodes.push(path("M160 130 V160 H130", { fill: "none", stroke: soft, "stroke-width": 8, "stroke-linecap": "round" }));
    }
  } else if (topic === "ondas") {
    for (let i = 0; i < 3; i += 1) {
      nodes.push(path(`M24 ${70 + i * 22} C 60 ${40 + i * 18}, 100 ${110 + i * 10}, 176 ${68 + i * 20}`, {
        fill: "none",
        stroke: i === 1 ? soft : color,
        "stroke-width": 7,
        "stroke-linecap": "round",
      }));
    }
  } else {
    const kind = index % 4;
    if (kind === 0) nodes.push(path("M100 28 L118 78 H170 L128 108 L146 160 L100 128 L54 160 L72 108 L30 78 H82 Z", { fill: soft }));
    else if (kind === 1) nodes.push(rect(46, 58, 108, 84, color, { rx: 18 }), rect(46, 58, 108, 28, soft, { rx: 12 }));
    else if (kind === 2) nodes.push(path("M100 36 L112 88 H168 L122 118 L140 170 L100 140 L60 170 L78 118 L32 88 H88 Z", { fill: "none", stroke: color, "stroke-width": 8, "stroke-linejoin": "round" }));
    else nodes.push(circ(100, 100, 62, soft), circ(100, 100, 40, "#fffdf8"), circ(100, 100, 16, color));
  }
  return scene(200, 200, nodes);
}

let photoCache = null;
let elementCache = null;

export function photoTopics() {
  return PHOTO_TOPICS;
}

export function elementTopics() {
  return ELEMENT_TOPICS;
}

export function browsePhotos() {
  if (photoCache) return photoCache;
  const items = [];
  for (const topic of PHOTO_TOPICS) {
    for (let i = 0; i < topic.n; i += 1) {
      const id = `lib-${topic.id}-${String(i + 1).padStart(2, "0")}`;
      const { w, h } = sizeFor(i + topic.id.length);
      const rng = rngOf(seedOf(id));
      const names = PHOTO_NAMES[topic.id];
      const [es, en] = names[i % names.length];
      items.push({
        id,
        kind: "foto",
        topic: topic.id,
        es: `${es} ${i + 1}`,
        en: `${en} ${i + 1}`,
        tags: [topic.id, topic.es.toLowerCase(), topic.en.toLowerCase(), es.toLowerCase()],
        premium: i % 9 === 0,
        scene: PHOTO_PAINT[topic.id](w, h, rng, i),
      });
    }
  }
  photoCache = items;
  return items;
}

export function browseElements() {
  if (elementCache) return elementCache;
  const items = [];
  for (const topic of ELEMENT_TOPICS) {
    for (let i = 0; i < topic.n; i += 1) {
      const id = `gfx-${topic.id}-${String(i + 1).padStart(2, "0")}`;
      const names = ELEMENT_NAMES[topic.id];
      const [es, en] = names[i % names.length];
      items.push({
        id,
        kind: "elemento",
        topic: topic.id,
        es: `${es} ${i + 1}`,
        en: `${en} ${i + 1}`,
        tags: [topic.id, topic.es.toLowerCase(), topic.en.toLowerCase(), "elemento", "graphic"],
        premium: i % 8 === 0,
        scene: elementScene(topic.id, i),
      });
    }
  }
  elementCache = items;
  return items;
}

export function browseAsset(id) {
  return browsePhotos().find((item) => item.id === id) || browseElements().find((item) => item.id === id) || null;
}

export function filterBrowse(items, { query = "", topic = "", price = "" } = {}) {
  const q = String(query || "").trim().toLowerCase();
  return items.filter((item) => {
    if (topic && item.topic !== topic) return false;
    if (price === "pro" && !item.premium) return false;
    if (price === "gratis" && item.premium) return false;
    if (!q) return true;
    const blob = `${item.es} ${item.en} ${item.topic} ${(item.tags || []).join(" ")}`.toLowerCase();
    return blob.includes(q);
  });
}

export function emptyFolderScene() {
  return scene(220, 180, [
    rect(28, 78, 164, 86, "#5b4dff", { rx: 12 }),
    path("M28 96 V78 H92 L108 96 H192", { fill: "#7a6bff" }),
    rect(36, 70, 148, 78, "#3f36e0", { rx: 10 }),
    rect(70, 36, 80, 58, "#f7f4ef", { rx: 8 }),
    path("M110 48 L116 62 H132 L120 70 L124 84 L110 76 L96 84 L100 70 L88 62 H104 Z", { fill: "#f0c84a" }),
    rect(46, 28, 8, 18, "#ff5a7a", { transform: "rotate(-20 50 37)", rx: 2 }),
    rect(150, 24, 8, 16, "#35c48a", { transform: "rotate(18 154 32)", rx: 2 }),
    rect(168, 48, 7, 14, "#7aa2ff", { transform: "rotate(30 171 55)", rx: 2 }),
    circ(40, 48, 4, "#f0c84a"),
    circ(176, 78, 3, "#ff8ab0"),
  ]);
}
