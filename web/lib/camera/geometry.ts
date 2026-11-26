import type { Point, TrackBox, Tracks } from './types';

/** Every clip is encoded at this size; boxes and zones are stored in these pixels. */
export const FRAME = { w: 1280, h: 720 } as const;

/** Ray casting: is the point inside the polygon? */
export function insidePolygon(p: Point, poly: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a.y > p.y) !== (b.y > p.y) && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

/** Where a person stands: bottom centre of their box. Zones are drawn on the floor, so feet decide entry. */
export function footPoint(b: TrackBox): Point {
  return { x: b[1] + b[3] / 2, y: b[2] + b[4] };
}

/** Index of the last sample at or before t. */
function sampleAt(tracks: Tracks, t: number): number {
  let lo = 0, hi = tracks.frames.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (tracks.frames[mid][0] <= t) lo = mid; else hi = mid - 1;
  }
  return lo;
}

/** Boxes at time t, blended between the two nearest samples so they glide with the video. */
export function boxesAt(tracks: Tracks, t: number): TrackBox[] {
  const i = sampleAt(tracks, t);
  const [t0, a] = tracks.frames[i];
  const next = tracks.frames[i + 1];
  if (!next || t <= t0) return a;
  const [t1, b] = next;
  const k = Math.min(1, (t - t0) / (t1 - t0));
  const later = new Map(b.map((x) => [x[0], x]));
  return a.map((x) => {
    const y = later.get(x[0]);
    if (!y) return x;
    const mix = (n: number) => x[n] + (y[n] - x[n]) * k;
    return [x[0], mix(1), mix(2), mix(3), mix(4), x[5]];
  });
}

/** The box of one track nearest to time t, for evidence thumbnails. */
export function boxOf(tracks: Tracks, trackId: number, t: number): TrackBox | undefined {
  return tracks.frames[sampleAt(tracks, t)][1].find((b) => b[0] === trackId);
}

export const fmtTime = (s: number): string => {
  const whole = Math.max(0, Math.floor(s));
  return `${String(Math.floor(whole / 60)).padStart(2, '0')}:${String(whole % 60).padStart(2, '0')}`;
};
