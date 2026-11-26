/* Words built from flying pixels, shared by the voice composer and Shade's streaming replies:
   a word's shape is sampled into dots, each dot flies in along a curve with a short trail, and lands on its letter. */

export type Point = [number, number];
/** Flight timing, ms: dots leave a little apart so a word pours in rather than jumps. */
export interface Flight { min: number; spread: number; stagger: number }
export interface Dot { sx: number; sy: number; cx: number; cy: number; tx: number; ty: number; t0: number; dur: number }

/** Sampling grid, px, and the most dots one word gets: enough to read as the word, few enough to stay smooth. */
const STEP = 2;
const MAX_DOTS = 110;
/** Rendered dot, px, and how long its trail reaches back (share of the flight). */
const DOT = 1.6;
const TRAIL = 0.06;
/** Random extra wait per dot, ms, so a word never launches in lockstep. */
const JITTER = 60;

const easeOut = (t: number): number => 1 - (1 - t) ** 3;
const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));
/** Point on a quadratic curve, so dots arc in instead of flying straight. */
const bez = (a: number, c: number, b: number, t: number): number => (1 - t) ** 2 * a + 2 * (1 - t) * t * c + t * t * b;

let probe: CanvasRenderingContext2D | null = null;
function probeCtx(): CanvasRenderingContext2D {
  probe ??= document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  if (!probe) throw new Error('Shade: 2D canvas is not available');
  return probe;
}

export function measure(text: string, font: string): number {
  const ctx = probeCtx();
  ctx.font = font;
  return ctx.measureText(text).width;
}

/** Latest a dot launched now can land, ms. */
export const flightEnd = (f: Flight): number => f.stagger + JITTER + f.min + f.spread;

/** Draws the word off-screen and reads its pixels back: every lit sample is a landing spot, relative to the word's top-left. */
export function sampleText(text: string, font: string, size: number): Point[] {
  const ctx = probeCtx();
  ctx.font = font;
  const w = Math.ceil(ctx.measureText(text).width) + 2;
  const h = Math.ceil(size * 1.3);
  ctx.canvas.width = w;
  ctx.canvas.height = h;
  ctx.font = font; // resizing the canvas resets its state
  ctx.textBaseline = 'top';
  ctx.fillText(text, 1, 1);
  const px = ctx.getImageData(0, 0, w, h).data;
  const spots: Point[] = [];
  for (let y = 0; y < h; y += STEP) for (let x = 0; x < w; x += STEP) if (px[(y * w + x) * 4 + 3] > 120) spots.push([x, y]);
  const keep = Math.max(1, Math.ceil(spots.length / MAX_DOTS));
  // Left to right, so a word's dots launch in reading order and it builds the way it is read.
  return spots.filter((_, i) => i % keep === 0).sort((a, b) => a[0] - b[0]);
}

/**
 * Launches one dot per spot towards `at` + spot, from wherever `from` says. `lift` bends the curve upward, px.
 * Returns the dots and when the last one lands.
 */
export function launch(spots: Point[], at: Point, from: (target: Point) => Point, now: number, flight: Flight, lift = 0): { dots: Dot[]; landed: number } {
  const dots = spots.map(([x, y], i): Dot => {
    const tx = at[0] + x, ty = at[1] + y;
    const [sx, sy] = from([tx, ty]);
    return {
      sx, sy, tx, ty,
      cx: sx + (tx - sx) * 0.25, cy: ty + (sy - ty) * 0.15 - lift,
      t0: now + (i / spots.length) * flight.stagger + Math.random() * JITTER,
      dur: flight.min + Math.random() * flight.spread,
    };
  });
  return { dots, landed: dots.length ? Math.max(...dots.map((d) => d.t0 + d.dur)) : now };
}

/** One dot at time `now`, with a faint trail so motion reads as a streak of light. Uses the context's current colour. */
export function drawDot(ctx: CanvasRenderingContext2D, d: Dot, now: number, alpha: number): void {
  const p = clamp01((now - d.t0) / d.dur);
  if (p <= 0) return;
  const e = easeOut(p), back = easeOut(Math.max(0, p - TRAIL));
  const x = bez(d.sx, d.cx, d.tx, e), y = bez(d.sy, d.cy, d.ty, e);
  if (p < 1) {
    ctx.globalAlpha = 0.3 * alpha;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(bez(d.sx, d.cx, d.tx, back), bez(d.sy, d.cy, d.ty, back));
    ctx.lineTo(x, y);
    ctx.stroke();
  }
  ctx.globalAlpha = alpha;
  ctx.fillRect(x - DOT / 2, y - DOT / 2, DOT, DOT);
}

export { clamp01 };
