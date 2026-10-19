import type { ShapeKind } from "./model";

/** Trazado SVG de cada forma en una caja de 100 × 100 (se estira a la caja del objeto). */
export function shapePath(shape: ShapeKind): string {
  switch (shape) {
    case "rect": return "M0 0H100V100H0Z";
    case "round": return "M14 0H86Q100 0 100 14V86Q100 100 86 100H14Q0 100 0 86V14Q0 0 14 0Z";
    case "ellipse": return "M50 0A50 50 0 1 1 50 100A50 50 0 1 1 50 0Z";
    case "triangle": return "M50 0L100 100H0Z";
    case "right-triangle": return "M0 0L100 100H0Z";
    case "diamond": return "M50 0L100 50L50 100L0 50Z";
    case "pentagon": return "M50 0L100 38L81 100H19L0 38Z";
    case "hexagon": return "M25 0H75L100 50L75 100H25L0 50Z";
    case "octagon": return "M29 0H71L100 29V71L71 100H29L0 71V29Z";
    case "star": return "M50 0L61 35H98L68 57L79 92L50 70L21 92L32 57L2 35H39Z";
    case "heart": return "M50 96C20 74 0 56 0 32C0 14 13 2 28 2C38 2 46 8 50 17C54 8 62 2 72 2C87 2 100 14 100 32C100 56 80 74 50 96Z";
    case "plus": return "M35 0H65V35H100V65H65V100H35V65H0V35H35Z";
    case "cloud": return "M25 90C10 90 0 80 0 66C0 54 9 45 20 44C20 28 32 16 47 16C58 16 67 22 72 31C75 30 78 29 81 29C92 29 100 38 100 50C100 51 100 52 100 53C100 73 92 90 76 90Z";
    case "callout": return "M0 0H100V72H45L22 100L28 72H0Z";
    case "arrow-right": return "M0 30H62V0L100 50L62 100V70H0Z";
    case "arrow-left": return "M100 30H38V0L0 50L38 100V70H100Z";
    case "arrow-up": return "M30 100V38H0L50 0L100 38H70V100Z";
    case "arrow-down": return "M30 0V62H0L50 100L100 62H70V0Z";
    case "chevron": return "M0 0H70L100 50L70 100H0L30 50Z";
    default: return "M0 0H100V100H0Z";
  }
}
