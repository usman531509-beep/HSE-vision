/* Camera module storage: one SQLite file (Node's built-in driver), created and seeded on first use.
   Server-only: imported by the route handlers under app/api. */
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { DEMO } from '../camera/demo';
import type { Camera, Gear, Point, Processing, Review, Tracks, Video, Zone } from '../camera/types';

export const DATA_DIR = process.env.CAMERA_DATA_DIR ?? path.join(process.cwd(), 'data');
export const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS cameras (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, area TEXT NOT NULL DEFAULT '',
  required_gear TEXT NOT NULL DEFAULT '[]', confirm_frames INTEGER NOT NULL, sort INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS zones (
  id TEXT PRIMARY KEY, camera_id TEXT NOT NULL REFERENCES cameras(id), name TEXT NOT NULL, points TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS videos (
  id TEXT PRIMARY KEY, camera_id TEXT NOT NULL REFERENCES cameras(id), file_name TEXT NOT NULL,
  src TEXT NOT NULL DEFAULT '', poster TEXT, sprite TEXT, recorded_at TEXT NOT NULL,
  duration_s REAL NOT NULL DEFAULT 0, fps REAL NOT NULL DEFAULT 25, status TEXT NOT NULL,
  progress INTEGER NOT NULL DEFAULT 0, error TEXT, tracks TEXT, credit TEXT, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS reviews (
  event_id TEXT PRIMARY KEY, review TEXT NOT NULL, updated_at TEXT NOT NULL
);`;

/* Storage modes:
   - local: a database file on this server's disk. Changes and uploads are kept.
   - read-only preview: the sample data in memory, nothing saved, no uploads. Used on Vercel, whose file
     system is read-only and not shared between requests, and as a fallback whenever the disk cannot be written.
   CAMERA_STORAGE=local or =readonly overrides the automatic choice. */
const WANT_READ_ONLY = process.env.CAMERA_STORAGE ? process.env.CAMERA_STORAGE === 'readonly' : process.env.VERCEL === '1';

// One connection per server process; dev hot reloads reuse it instead of opening a new one each time.
const holder = globalThis as unknown as { cameraDb?: { conn: DatabaseSync; readOnly: boolean } };

function open(): { conn: DatabaseSync; readOnly: boolean } {
  if (holder.cameraDb) return holder.cameraDb;
  let conn: DatabaseSync;
  let readOnly = WANT_READ_ONLY;
  try {
    if (readOnly) throw new Error('read-only preview requested');
    mkdirSync(UPLOAD_DIR, { recursive: true });
    conn = new DatabaseSync(path.join(DATA_DIR, 'camera.db'));
    conn.exec('PRAGMA foreign_keys = ON;' + SCHEMA);
  } catch (err) {
    if (!readOnly) console.error(`[camera] cannot use ${DATA_DIR}; running as a read-only preview:`, err);
    readOnly = true;
    conn = new DatabaseSync(':memory:');
    conn.exec('PRAGMA foreign_keys = ON;' + SCHEMA);
  }
  const { n } = conn.prepare('SELECT COUNT(*) AS n FROM cameras').get() as { n: number };
  if (n === 0) seed(conn);
  holder.cameraDb = { conn, readOnly };
  return holder.cameraDb;
}

const db = (): DatabaseSync => open().conn;

/** True when nothing can be saved (see storage modes above). */
export const isReadOnly = (): boolean => open().readOnly;

function seed(conn: DatabaseSync): void {
  const now = new Date().toISOString();
  inTransaction(conn, () => {
    DEMO.cameras.forEach((c, i) => conn.prepare('INSERT INTO cameras VALUES (?,?,?,?,?,?)').run(c.id, c.name, c.area, JSON.stringify(c.requiredGear), c.confirmFrames, i));
    DEMO.zones.forEach((z) => conn.prepare('INSERT INTO zones VALUES (?,?,?,?)').run(z.id, z.cameraId, z.name, JSON.stringify(z.points)));
    DEMO.videos.forEach((v) => conn.prepare(
      `INSERT INTO videos (id, camera_id, file_name, src, poster, sprite, recorded_at, duration_s, fps, status, progress, tracks, credit, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    ).run(v.id, v.cameraId, v.fileName, v.src, v.poster ?? null, v.sprite ?? null, v.recordedAt, v.durationS, v.fps, v.status, 0, JSON.stringify(v.tracks), v.credit ?? null, now));
  });
}

/* ---------- row mapping ---------- */
type Row = Record<string, string | number | null>;
const str = (v: Row[string]) => (v === null ? undefined : String(v));

const toCamera = (r: Row): Camera => ({
  id: String(r.id), name: String(r.name), area: String(r.area),
  requiredGear: JSON.parse(String(r.required_gear)) as Gear[], confirmFrames: Number(r.confirm_frames),
});
const toZone = (r: Row): Zone => ({ id: String(r.id), cameraId: String(r.camera_id), name: String(r.name), points: JSON.parse(String(r.points)) as Point[] });
const toVideo = (r: Row): Video => ({
  id: String(r.id), cameraId: String(r.camera_id), fileName: String(r.file_name), src: String(r.src),
  poster: str(r.poster), sprite: str(r.sprite), recordedAt: String(r.recorded_at),
  durationS: Number(r.duration_s), fps: Number(r.fps), status: String(r.status) as Processing, progress: Number(r.progress),
  error: str(r.error), tracks: r.tracks ? (JSON.parse(String(r.tracks)) as Tracks) : undefined, credit: str(r.credit),
});

/* ---------- reads ---------- */
export function listAll(): { cameras: Camera[]; zones: Zone[]; videos: Video[]; reviews: Record<string, Review>; readOnly: boolean } {
  const conn = db();
  const reviews: Record<string, Review> = {};
  for (const r of conn.prepare('SELECT event_id, review FROM reviews').all() as Row[]) reviews[String(r.event_id)] = String(r.review) as Review;
  return {
    cameras: (conn.prepare('SELECT * FROM cameras ORDER BY sort').all() as Row[]).map(toCamera),
    zones: (conn.prepare('SELECT * FROM zones ORDER BY rowid').all() as Row[]).map(toZone),
    videos: (conn.prepare('SELECT * FROM videos ORDER BY created_at, rowid').all() as Row[]).map(toVideo),
    reviews,
    readOnly: isReadOnly(),
  };
}

export function getCamera(id: string): Camera | undefined {
  const r = db().prepare('SELECT * FROM cameras WHERE id = ?').get(id) as Row | undefined;
  return r ? toCamera(r) : undefined;
}

export function getVideo(id: string): Video | undefined {
  const r = db().prepare('SELECT * FROM videos WHERE id = ?').get(id) as Row | undefined;
  return r ? toVideo(r) : undefined;
}

/* ---------- writes ---------- */
export function createCamera(): Camera {
  const conn = db();
  const ids = new Set((conn.prepare('SELECT id FROM cameras').all() as Row[]).map((r) => String(r.id)));
  let n = 20;
  while (ids.has(`CAM ${n}`)) n++;
  const { sort } = conn.prepare('SELECT COALESCE(MAX(sort), -1) + 1 AS sort FROM cameras').get() as { sort: number };
  const cam: Camera = { id: `CAM ${n}`, name: `New camera ${ids.size + 1}`, area: '', requiredGear: [], confirmFrames: 12 };
  conn.prepare('INSERT INTO cameras VALUES (?,?,?,?,?,?)').run(cam.id, cam.name, cam.area, '[]', cam.confirmFrames, sort);
  return cam;
}

export function updateCamera(c: Camera): Camera | undefined {
  const res = db().prepare('UPDATE cameras SET name = ?, area = ?, required_gear = ?, confirm_frames = ? WHERE id = ?')
    .run(c.name, c.area, JSON.stringify(c.requiredGear), c.confirmFrames, c.id);
  return res.changes ? c : undefined;
}

export function createZone(z: Zone): Zone {
  db().prepare('INSERT INTO zones VALUES (?,?,?,?)').run(z.id, z.cameraId, z.name, JSON.stringify(z.points));
  return z;
}

export function renameZone(id: string, name: string): Zone | undefined {
  db().prepare('UPDATE zones SET name = ? WHERE id = ?').run(name, id);
  const r = db().prepare('SELECT * FROM zones WHERE id = ?').get(id) as Row | undefined;
  return r ? toZone(r) : undefined;
}

/** Deletes an area and the review decisions on its entries (event ids look like video:zone:<zoneId>:…). */
export function deleteZone(id: string): boolean {
  const conn = db();
  return inTransaction(conn, () => {
    conn.prepare("DELETE FROM reviews WHERE event_id LIKE '%:zone:' || ? || ':%'").run(id);
    return conn.prepare('DELETE FROM zones WHERE id = ?').run(id).changes > 0;
  });
}

/** What still belongs to a camera; it can only be deleted once both are zero. */
export function cameraUsage(id: string): { videos: number; zones: number } {
  const conn = db();
  const count = (table: string) => (conn.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE camera_id = ?`).get(id) as { n: number }).n;
  return { videos: count('videos'), zones: count('zones') };
}

export function countCameras(): number {
  return (db().prepare('SELECT COUNT(*) AS n FROM cameras').get() as { n: number }).n;
}

export function deleteCamera(id: string): boolean {
  return db().prepare('DELETE FROM cameras WHERE id = ?').run(id).changes > 0;
}

/** Deletes a video row and the review decisions on its events (event ids start with the video id). */
export function deleteVideo(id: string): boolean {
  const conn = db();
  return inTransaction(conn, () => {
    conn.prepare("DELETE FROM reviews WHERE event_id LIKE ? || ':%'").run(id);
    return conn.prepare('DELETE FROM videos WHERE id = ?').run(id).changes > 0;
  });
}

function inTransaction<T>(conn: DatabaseSync, work: () => T): T {
  conn.exec('BEGIN');
  try {
    const out = work();
    conn.exec('COMMIT');
    return out;
  } catch (err) {
    conn.exec('ROLLBACK');
    throw err;
  }
}

export function insertVideo(v: Video): Video {
  db().prepare(
    `INSERT INTO videos (id, camera_id, file_name, src, recorded_at, duration_s, fps, status, progress, error, created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
  ).run(v.id, v.cameraId, v.fileName, v.src, v.recordedAt, v.durationS, v.fps, v.status, v.progress ?? 0, v.error ?? null, new Date().toISOString());
  return v;
}

/** Fields the analysis can change on a video. */
export type VideoPatch = Partial<Pick<Video, 'src' | 'poster' | 'sprite' | 'durationS' | 'fps' | 'status' | 'progress' | 'error' | 'tracks'>>;
const COLUMN: Record<keyof VideoPatch, string> = {
  src: 'src', poster: 'poster', sprite: 'sprite', durationS: 'duration_s', fps: 'fps', status: 'status', progress: 'progress', error: 'error', tracks: 'tracks',
};

export function updateVideo(id: string, patch: VideoPatch): Video | undefined {
  const keys = Object.keys(patch) as (keyof VideoPatch)[];
  if (keys.length) {
    const values = keys.map((k) => (k === 'tracks' ? JSON.stringify(patch.tracks) : (patch[k] ?? null))) as (string | number | null)[];
    db().prepare(`UPDATE videos SET ${keys.map((k) => `${COLUMN[k]} = ?`).join(', ')} WHERE id = ?`).run(...values, id);
  }
  return getVideo(id);
}

export function setReview(eventId: string, review: Review): void {
  if (review === 'needs_review') {
    db().prepare('DELETE FROM reviews WHERE event_id = ?').run(eventId);
    return;
  }
  db().prepare('INSERT INTO reviews VALUES (?,?,?) ON CONFLICT(event_id) DO UPDATE SET review = excluded.review, updated_at = excluded.updated_at')
    .run(eventId, review, new Date().toISOString());
}
