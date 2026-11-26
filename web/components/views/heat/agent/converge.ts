'use client';

import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react';
import { clamp01, drawDot, flightEnd, launch, sampleText, type Dot, type Flight, type Point } from './pixels';

/** A reply's words are close by: a quick converge, so streaming still feels fast. */
const FLIGHT: Flight = { min: 320, spread: 160, stagger: 220 };
/** Dots start this far to the left of their letter, px, with some vertical spread, so the text sweeps in from the left. */
const SCATTER = { min: 18, spread: 30, rise: 16 } as const;
/** Room around the text for the scattered dots, px: the canvas overhangs the paragraph by this much. */
export const OVERHANG = 48;
/** The real text wipes in behind the dots: starting as the first ones land, ending with the last. */
export const LAND = { delay: FLIGHT.min, duration: flightEnd(FLIGHT) - FLIGHT.min } as const;
/** Dots fade out after landing, ms. */
const SETTLE = 220;

interface Word { dots: Dot[]; landed: number }

/** Behind the letter, a little above or below: pixels stream in from the left like the text being written. */
function scattered([tx, ty]: Point): Point {
  return [tx - SCATTER.min - Math.random() * SCATTER.spread, ty + (Math.random() - 0.5) * 2 * SCATTER.rise];
}

/**
 * Pixels converge into each newly shown word of `box` (spans marked `data-w`). Draws on `canvas`, which overhangs
 * the box by OVERHANG; runs only while dots are moving. `still` (reduced motion) skips the effect.
 */
export function useConverge(box: RefObject<HTMLElement | null>, canvas: RefObject<HTMLCanvasElement | null>, shown: number, still: boolean): void {
  const words = useRef<Word[]>([]);
  const done = useRef(0);
  const raf = useRef(0);
  const color = useRef('');

  useLayoutEffect(() => {
    const host = box.current, el = canvas.current;
    if (!host || !el || still) { done.current = shown; return; }
    const now = performance.now();
    for (let i = done.current; i < shown; i++) {
      const span = host.querySelector<HTMLElement>(`[data-w="${i}"]`);
      if (!span?.textContent) continue;
      const css = getComputedStyle(span);
      const size = parseFloat(css.fontSize);
      color.current = css.color;
      // The glyph's em box sits centred in the line box; the sampler draws one px in from the corner.
      const at: Point = [span.offsetLeft + OVERHANG - 1, span.offsetTop + (span.offsetHeight - size) / 2 + OVERHANG - 1];
      const spots = sampleText(span.textContent, `${css.fontWeight} ${css.fontSize} ${css.fontFamily}`, size);
      words.current.push(launch(spots, at, scattered, now, FLIGHT));
    }
    done.current = shown;
    if (raf.current || !words.current.length) return;

    const ctx = el.getContext('2d');
    if (!ctx) throw new Error('Shade: 2D canvas is not available');
    const frame = (t: number): void => {
      const dpr = window.devicePixelRatio || 1;
      const w = host.offsetWidth + OVERHANG * 2, h = host.offsetHeight + OVERHANG * 2;
      if (el.width !== Math.round(w * dpr) || el.height !== Math.round(h * dpr)) {
        el.width = Math.round(w * dpr);
        el.height = Math.round(h * dpr);
        el.style.width = `${w}px`;
        el.style.height = `${h}px`;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = color.current;
      ctx.strokeStyle = color.current;
      words.current = words.current.filter((word) => t < word.landed + SETTLE);
      for (const word of words.current) {
        const fade = 1 - clamp01((t - word.landed) / SETTLE);
        for (const d of word.dots) drawDot(ctx, d, t, fade);
      }
      raf.current = words.current.length ? requestAnimationFrame(frame) : 0;
    };
    raf.current = requestAnimationFrame(frame);
  }, [box, canvas, shown, still]);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);
}
