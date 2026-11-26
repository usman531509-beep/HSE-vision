/* The voice's light, as a mound of ASCII rising from the card's bottom edge: louder is taller and denser,
   and it breathes and drifts on its own so silence still looks alive. */

/** Sparse to dense: a cell's character says how deep inside the mound it sits. */
const RAMP = " .,:;-=+*xo#%&8@W";
/** Glyph cell, px. A small mono size keeps the texture fine next to 14 px text. */
export const CELL = { w: 6.6, h: 11.5, font: 10.5 } as const;
/** Share of the card the mound may fill at full voice. */
const REACH = 0.7;
/** Quiet floor and breath, so the mound never flattens to nothing between words. */
const FLOOR = 0.16;
const BREATH = 0.04;
/** Chance per cell per frame of a random glyph: the shimmer of live light. */
const GLITTER = 0.06;

export interface MoundShape {
  /** Column centre of the mound, 0–1 across the card; particles leave from here. */
  centre: number;
  /** y of the mound's top at a given x, px. */
  topAt: (x: number) => number;
}

/** Mound height 0–1 at u (0–1 across), time t (s) and voice level 0–1: a main hill and a smaller one that wanders. */
function height(u: number, t: number, level: number, centre: number): number {
  const amp = FLOOR + level * (1 - FLOOR) + BREATH * Math.sin(t * 2.1);
  const main = Math.exp(-(((u - centre) / 0.26) ** 2));
  const side = 0.5 * Math.exp(-(((u - centre - 0.16 * Math.sin(t * 0.7)) / 0.13) ** 2));
  const ripple = 0.06 * Math.sin(u * 37 + t * 3.3) * Math.sin(u * 11 - t * 1.7);
  return Math.max(0, amp * (main + side) + ripple * amp);
}

export function drawMound(
  ctx: CanvasRenderingContext2D, w: number, h: number, t: number, level: number, mono: string, ink: string,
): MoundShape {
  const centre = 0.5 + 0.08 * Math.sin(t * 0.37);
  const cols = Math.ceil(w / CELL.w);
  const rows = Math.floor((h * REACH) / CELL.h);
  const fill = (x: number): number => height(x / w, t, level, centre) * rows;

  ctx.save();
  ctx.font = `${CELL.font}px ${mono}`;
  ctx.textBaseline = 'bottom';
  ctx.fillStyle = ink;
  for (let c = 0; c < cols; c++) {
    const x = c * CELL.w;
    const filled = fill(x + CELL.w / 2);
    for (let r = 0; r < Math.ceil(filled); r++) {
      const depth = Math.min(1, (filled - r) / 2.4);
      const glyph = Math.random() < GLITTER
        ? RAMP[1 + Math.floor(Math.random() * (RAMP.length - 1))]
        : RAMP[Math.max(1, Math.round(depth * (RAMP.length - 1)))];
      ctx.globalAlpha = 0.18 + 0.72 * depth;
      ctx.fillText(glyph, x, h - r * CELL.h);
    }
  }
  ctx.restore();
  return { centre, topAt: (x) => h - fill(x) * CELL.h };
}
