/* Each heard word, built from the mound's light: its dots fly up from the mound and land on the word's place
   in the line, then the dots give way to crisp text. The flying itself is the shared pixel engine. */
import { clamp01, drawDot, launch, measure, sampleText, type Dot, type Flight } from '../pixels';
import type { MoundShape } from './mound';

/** The line the words build along, px from the card's top-left. Matches the composer's text inset. */
export const LINE = { x: 16, y: 14, size: 15 } as const;
/** From the mound to the line is a long way: a slower, wider pour than a reply's words. */
const FLIGHT: Flight = { min: 620, spread: 320, stagger: 140 };
/** Rise above the straight path, px, so dots arc up out of the mound. */
const LIFT = 18;
/** Dots to text, ms. */
const SETTLE = 260;
/** Fade at the left edge when the line scrolls, px. */
const EDGE = 28;

interface Word { text: string; x: number; dots: Dot[]; landed: number }

export class Swarm {
  private words: Word[] = [];
  private cursor: number = LINE.x;
  private scroll = 0;
  private readonly font: string;

  constructor(family: string, private still: boolean) {
    this.font = `${LINE.size}px ${family}`;
  }

  /** Places a word at the end of the line and launches its dots from the mound. */
  add(text: string, mound: MoundShape, width: number, now: number): void {
    const word: Word = { text, x: this.cursor, dots: [], landed: now };
    this.cursor += measure(`${text} `, this.font);
    this.words.push(word);
    if (this.still) return;
    const from = (): [number, number] => {
      const sx = width * (mound.centre + (Math.random() - 0.5) * 0.3);
      return [sx, mound.topAt(sx)];
    };
    const { dots, landed } = launch(sampleText(text, this.font, LINE.size), [word.x, LINE.y], from, now, FLIGHT, LIFT);
    word.dots = dots;
    word.landed = landed;
  }

  /** `limit` is the x where the line must stop, left of the timer. */
  draw(ctx: CanvasRenderingContext2D, limit: number, now: number, ink: string): void {
    // Keep the newest word in view: the line slides left once it reaches the timer.
    const target = Math.max(0, this.cursor - limit);
    this.scroll += (target - this.scroll) * (this.still ? 1 : 0.12);
    ctx.save();
    ctx.translate(-this.scroll, 0);
    ctx.fillStyle = ink;
    ctx.strokeStyle = ink;
    ctx.font = this.font;
    ctx.textBaseline = 'top';
    for (const word of this.words) {
      const edge = clamp01((word.x - this.scroll - LINE.x + EDGE) / EDGE);
      const settle = clamp01((now - word.landed) / SETTLE);
      if (settle > 0) {
        ctx.globalAlpha = settle * edge;
        ctx.fillText(word.text, word.x + 1, LINE.y + 1);
      }
      if (settle >= 1) { word.dots = []; continue; }
      for (const d of word.dots) drawDot(ctx, d, now, (1 - settle) * edge);
    }
    ctx.restore();
  }
}
