'use client';

import { useEffect, useState } from 'react';
import type { Tone } from '@/lib/data';

export type ToneColors = Record<Tone | 'ink' | 'muted' | 'line', string>;
const NAMES = ['act', 'watch', 'low', 'off', 'ink', 'muted', 'line'] as const;

/**
 * Design-token colours as literal strings, read from the CSS custom properties once mounted.
 * For libraries that draw SVG through attributes, where `var(--color-…)` does not resolve.
 */
export function useToneColors(): ToneColors | null {
  const [colors, setColors] = useState<ToneColors | null>(null);
  useEffect(() => {
    const css = getComputedStyle(document.documentElement);
    const read = (n: (typeof NAMES)[number]): string => {
      const v = css.getPropertyValue(`--color-${n}`).trim();
      if (!v) throw new Error(`Design token --color-${n} is missing`);
      return v;
    };
    const c = Object.fromEntries(NAMES.map((n) => [n, read(n)])) as Omit<ToneColors, 'info'>;
    setColors({ ...c, info: c.off });
  }, []);
  return colors;
}
