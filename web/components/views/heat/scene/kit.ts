/* Small Three.js kit for the HeatShield scene: design-token colours, shared geometry and DOM labels. */
import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import type { Tone } from '@/lib/data';
import { TEXT } from '../../../ui';

/** Hex design tokens from globals.css, read at runtime so the scene follows the theme. */
export type TokenName = 'act' | 'watch' | 'low' | 'paper' | 'line-2' | 'track' | 'sage' | 'ink' | 'teal' | 'sunk' | 'lime';
const FALLBACK = '#8a8f8b';

export function token(name: TokenName): THREE.Color {
  const v = getComputedStyle(document.documentElement).getPropertyValue(`--color-${name}`).trim();
  return new THREE.Color(v || FALLBACK);
}

/** Luminance of a light. Sunlit white reaches ~3 in linear HDR, so lights sit above it and bloom keys off this. */
export const GLOW_LUM = 5;

/** A token colour boosted to luminance `lum`, whatever its hue, so teal and red lights glow equally. */
export function glowColor(name: TokenName, lum = GLOW_LUM): THREE.Color {
  const c = token(name);
  const l = 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
  return c.multiplyScalar(lum / Math.max(l, 0.01));
}

/** A texture drawn with the 2D canvas API, in sRGB. Used for the sky, glows and tiling surface patterns. */
export function canvasTexture(size: number, draw: (g: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  if (!g) throw new Error('2D canvas is not available for scene textures');
  draw(g);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export const TONE_TOKEN: Record<Tone, TokenName> = { act: 'act', watch: 'watch', low: 'low', off: 'line-2', info: 'line-2' };

export const GEO = {
  box: new THREE.BoxGeometry(1, 1, 1),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 24),
  ball: new THREE.SphereGeometry(1, 32, 20),
  core: new THREE.IcosahedronGeometry(1, 1),
  ring: new THREE.RingGeometry(0.85, 1, 48),
  torus: new THREE.TorusGeometry(1, 0.018, 8, 96),
};

export function disposeGeometries(): void {
  Object.values(GEO).forEach((g) => g.dispose());
}

export interface Label { obj: CSS2DObject; el: HTMLElement; set: (main: string, sub?: string, tone?: Tone) => void }

/** A DOM label pinned in 3D. Small on purpose: the scene carries the meaning, labels only name things. */
export function label(main: string, sub?: string, href?: string): Label {
  const el = document.createElement(href ? 'a' : 'div');
  if (href) (el as HTMLAnchorElement).href = href;
  el.className = 'pointer-events-auto flex items-baseline gap-1.5 rounded-[6px] bg-paper/90 px-2 py-0.5 text-[11.5px] leading-tight whitespace-nowrap text-ink shadow-[0_1px_2px_rgb(0_0_0/0.08)] ring-1 ring-line backdrop-blur tabular-nums' + (href ? ' hover:bg-paper hover:ring-ink' : '');
  const b = document.createElement('b');
  const s = document.createElement('span');
  s.className = 'text-muted';
  el.append(b, s);
  const set = (m: string, sb?: string, tone?: Tone): void => {
    b.textContent = m;
    b.className = 'font-semibold ' + (tone ? TEXT[tone] : '');
    s.textContent = sb ?? '';
    s.hidden = !sb;
  };
  set(main, sub);
  return { obj: new CSS2DObject(el), el, set };
}
