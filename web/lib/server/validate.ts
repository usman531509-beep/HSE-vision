/* Checks request bodies before they reach the database. Each parser returns the clean value or an error message. */
import { CONFIRM_OPTIONS, STREAM, ZONE_LIMITS } from '../camera/constants';
import { FRAME } from '../camera/geometry';
import { GEARS } from '../camera/labels';
import type { Camera, Gear, Point, Review } from '../camera/types';

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };
const fail = (error: string): Parsed<never> => ({ ok: false, error });
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

export function parseCamera(id: string, body: unknown): Parsed<Camera> {
  if (!isObject(body)) return fail('Send the camera as a JSON object.');
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const area = typeof body.area === 'string' ? body.area.trim() : '';
  if (!name || name.length > 60) return fail('Camera name must be 1 to 60 characters.');
  if (area.length > 60) return fail('Area must be at most 60 characters.');
  const gear = Array.isArray(body.requiredGear) ? body.requiredGear : null;
  if (!gear || !gear.every((g): g is Gear => GEARS.includes(g as Gear))) return fail(`Gear must be a list of: ${GEARS.join(', ')}.`);
  const confirmFrames = Number(body.confirmFrames);
  if (!CONFIRM_OPTIONS.some(([f]) => f === confirmFrames)) return fail('Unsupported confirmation time.');
  const stream = parseStreamUrl(body.streamUrl ?? '');
  if (!stream.ok) return stream;
  return { ok: true, value: { id, name, area, requiredGear: [...new Set(gear)], confirmFrames, streamUrl: stream.value } };
}

/** A live stream address, or empty for "not connected". */
export function parseStreamUrl(raw: unknown): Parsed<string> {
  const url = typeof raw === 'string' ? raw.trim() : '';
  if (!url) return { ok: true, value: '' };
  return url.length <= STREAM.maxLength && STREAM.pattern.test(url) ? { ok: true, value: url } : fail(STREAM.problem);
}

export function parseZoneName(body: unknown): Parsed<string> {
  const name = isObject(body) && typeof body.name === 'string' ? body.name.trim() : '';
  return name && name.length <= ZONE_LIMITS.maxName ? { ok: true, value: name } : fail(`Area name must be 1 to ${ZONE_LIMITS.maxName} characters.`);
}

export function parseZone(body: unknown): Parsed<{ name: string; points: Point[] }> {
  if (!isObject(body)) return fail('Send the area as a JSON object.');
  const named = parseZoneName(body);
  if (!named.ok) return named;
  const name = named.value;
  const raw = Array.isArray(body.points) ? body.points : [];
  if (raw.length < ZONE_LIMITS.minPoints || raw.length > ZONE_LIMITS.maxPoints) return fail(`An area needs ${ZONE_LIMITS.minPoints} to ${ZONE_LIMITS.maxPoints} corners.`);
  const points: Point[] = [];
  for (const p of raw) {
    const x = isObject(p) ? Number(p.x) : NaN, y = isObject(p) ? Number(p.y) : NaN;
    if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || y < 0 || x > FRAME.w || y > FRAME.h) return fail('Every corner must be inside the camera picture.');
    points.push({ x: Math.round(x), y: Math.round(y) });
  }
  return { ok: true, value: { name, points } };
}

const REVIEWS: Review[] = ['needs_review', 'confirmed', 'false_alarm'];
export function parseReview(body: unknown): Parsed<Review> {
  const r = isObject(body) ? body.review : undefined;
  return REVIEWS.includes(r as Review) ? { ok: true, value: r as Review } : fail(`Review must be one of: ${REVIEWS.join(', ')}.`);
}

/** JSON error response used by every camera route. */
export const problem = (status: number, error: string) => Response.json({ error }, { status });

/** Reads a JSON body; a malformed one becomes undefined so the parser reports it. */
export async function readJson(request: Request): Promise<unknown> {
  try { return await request.json(); } catch { return undefined; }
}
