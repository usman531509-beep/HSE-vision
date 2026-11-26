/* Camera module storage: one SQLite file (Node's built-in driver), created and seeded on first use.
   Server-only: imported by the route handlers under app/api. */
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { DEMO } from '../camera/demo';
import { buildEvents } from '../camera/rules';
import type { Camera, DetectedEvent, EventType, Gear, GearCheck, Point, Processing, Review, Tracks, Video, Zone } from '../camera/types';

export const DATA_DIR = process.env.CAMERA_DATA_DIR ?? path.join(process.cwd(), 'data');
export const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS cameras (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, area TEXT NOT NULL DEFAULT '',
  required_gear TEXT NOT NULL DEFAULT '[]', confirm_frames INTEGER NOT NULL, sort INTEGER NOT NULL,
  stream_url TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS zones (
  id TEXT PRIMARY KEY, camera_id TEXT NOT NULL REFERENCES cameras(id), name TEXT NOT NULL, points TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS videos (
  id TEXT PRIMARY KEY, camera_id TEXT NOT NULL REFERENCES cameras(id), file_name TEXT NOT NULL,
  src TEXT NOT NULL DEFAULT '', poster TEXT, sprite TEXT, recorded_at TEXT NOT NULL,
  duration_s REAL NOT NULL DEFAULT 0, fps REAL NOT NULL DEFAULT 25, status TEXT NOT NULL,
  progress INTEGER NOT NULL DEFAULT 0, error TEXT, tracks TEXT, credit TEXT, created_at TEXT NOT NULL, gear TEXT
);
CREATE TABLE IF NOT EXISTS reviews (
  event_id TEXT PRIMARY KEY, review TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY, camera_id TEXT NOT NULL, video_id TEXT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  type TEXT NOT NULL, description TEXT NOT NULL, t REAL NOT NULL, frame INTEGER NOT NULL, confidence REAL NOT NULL,
  track_id INTEGER NOT NULL, zone_id TEXT, gear TEXT
);
CREATE INDEX IF NOT EXISTS events_by_video ON events(video_id);`;

/* Storage modes:
   - local: a database file on this server's disk. Changes and uploads are kept.
   - read-only preview: the sample data in memory, nothing saved, no uploads. Used on Vercel, whose file
     system is read-only and not shared between requests, and as a fallback whenever the disk cannot be written.
   CAMERA_STORAGE=local or =readonly overrides the automatic choice. */
const WANT_READ_ONLY = process.env.CAMERA_STORAGE ? process.env.CAMERA_STORAGE === 'readonly' : process.env.VERCEL === '1';

// One connection per server process; dev hot reloads reuse it instead of opening a new one each time.
// Rename the key whenever the stored shape changes, or a running dev server would hand back the old object.
const holder = globalThis as unknown as { cameraStoreV5?: { conn: DatabaseSync; readOnly: boolean } };

function open(): { conn: DatabaseSync; readOnly: boolean } {
  if (holder.cameraStoreV5) return holder.cameraStoreV5;
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
  else upgrade(conn);
  // Events are derived data: rebuilding them on start keeps them in step after any rules-code change.
  refreshEvents(conn, {});
  holder.cameraStoreV5 = { conn, readOnly };
  return holder.cameraStoreV5;
}

/** Brings a database made by an older version up to date. */
function upgrade(conn: DatabaseSync): void {
  const has = (table: string, col: string) => (conn.prepare(`PRAGMA table_info(${table})`).all() as Row[]).some((c) => c.name === col);
  inTransaction(conn, () => {
    // Gear checks: fill in the sample videos' hand-checked results.
    if (!has('videos', 'gear')) {
      conn.exec('ALTER TABLE videos ADD COLUMN gear TEXT');
      for (const v of DEMO.videos) conn.prepare('UPDATE videos SET gear = ? WHERE id = ?').run(JSON.stringify(v.gear), v.id);
    }
    if (!has('cameras', 'stream_url')) conn.exec("ALTER TABLE cameras ADD COLUMN stream_url TEXT NOT NULL DEFAULT ''");
  });
}

const db = (): DatabaseSync => open().conn;

/** True when nothing can be saved (see storage modes above). */
export const isReadOnly = (): boolean => open().readOnly;

function seed(conn: DatabaseSync): void {
  const now = new Date().toISOString();
  inTransaction(conn, () => {
    DEMO.cameras.forEach((c, i) => insertCamera(conn, c, i));
    DEMO.zones.forEach((z) => conn.prepare('INSERT INTO zones VALUES (?,?,?,?)').run(z.id, z.cameraId, z.name, JSON.stringify(z.points)));
    DEMO.videos.forEach((v) => conn.prepare(
      `INSERT INTO videos (id, camera_id, file_name, src, poster, sprite, recorded_at, duration_s, fps, status, progress, tracks, gear, credit, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    ).run(v.id, v.cameraId, v.fileName, v.src, v.poster ?? null, v.sprite ?? null, v.recordedAt, v.durationS, v.fps, v.status, 0,
      JSON.stringify(v.tracks), JSON.stringify(v.gear), v.credit ?? null, now));
  });
}

/* ---------- row mapping ---------- */
type Row = Record<string, string | number | null>;
const str = (v: Row[string]) => (v === null ? undefined : String(v));

const toCamera = (r: Row): Camera => ({
  id: String(r.id), name: String(r.name), area: String(r.area),
  requiredGear: JSON.parse(String(r.required_gear)) as Gear[], confirmFrames: Number(r.confirm_frames), streamUrl: String(r.stream_url ?? ''),
});
const toZone = (r: Row): Zone => ({ id: String(r.id), cameraId: String(r.camera_id), name: String(r.name), points: JSON.parse(String(r.points)) as Point[] });
const toVideo = (r: Row): Video => ({
  id: String(r.id), cameraId: String(r.camera_id), fileName: String(r.file_name), src: String(r.src),
  poster: str(r.poster), sprite: str(r.sprite), recordedAt: String(r.recorded_at),
  durationS: Number(r.duration_s), fps: Number(r.fps), status: String(r.status) as Processing, progress: Number(r.progress),
  error: str(r.error), tracks: r.tracks ? (JSON.parse(String(r.tracks)) as Tracks) : undefined,
  gear: r.gear ? (JSON.parse(String(r.gear)) as GearCheck) : undefined, credit: str(r.credit),
});
const toEvent = (r: Row): DetectedEvent => ({
  id: String(r.id), cameraId: String(r.camera_id), videoId: String(r.video_id), type: String(r.type) as EventType,
  description: String(r.description), t: Number(r.t), frame: Number(r.frame), confidence: Number(r.confidence),
  trackId: Number(r.track_id), zoneId: str(r.zone_id), gear: str(r.gear) as Gear | undefined,
});

/* ---------- events ---------- */
/** Re-runs the rules for the completed videos in scope and replaces their stored events.
    Review decisions live in their own table under the same deterministic event ids, so they survive a re-run.
    Must not be called inside another transaction. */
function refreshEvents(conn: DatabaseSync, scope: { cameraId?: string; videoId?: string }): void {
  const cameras = new Map((conn.prepare('SELECT * FROM cameras').all() as Row[]).map((r) => [String(r.id), toCamera(r)]));
  const zones = (conn.prepare('SELECT * FROM zones').all() as Row[]).map(toZone);
  const where = scope.videoId ? 'id = ?' : scope.cameraId ? 'camera_id = ?' : '1 = 1';
  const args = [scope.videoId ?? scope.cameraId].filter((a): a is string => a !== undefined);
  const videos = (conn.prepare(`SELECT * FROM videos WHERE status = 'completed' AND ${where}`).all(...args) as Row[]).map(toVideo);
  const insert = conn.prepare('INSERT INTO events VALUES (?,?,?,?,?,?,?,?,?,?,?)');
  inTransaction(conn, () => {
    for (const v of videos) {
      conn.prepare('DELETE FROM events WHERE video_id = ?').run(v.id);
      const camera = cameras.get(v.cameraId);
      if (!camera) continue;
      for (const e of buildEvents(v, camera, zones)) {
        insert.run(e.id, e.cameraId, e.videoId, e.type, e.description, e.t, e.frame, e.confidence, e.trackId, e.zoneId ?? null, e.gear ?? null);
      }
    }
  });
}

/* ---------- reads ---------- */
/** How many events a video has; live clips without any are not kept. */
export function countEvents(videoId: string): number {
  return (db().prepare('SELECT COUNT(*) AS n FROM events WHERE video_id = ?').get(videoId) as { n: number }).n;
}

export function listEvents(): DetectedEvent[] {
  return (db().prepare('SELECT * FROM events ORDER BY video_id, t').all() as Row[]).map(toEvent);
}

export function listAll(): { cameras: Camera[]; zones: Zone[]; videos: Video[]; events: DetectedEvent[]; reviews: Record<string, Review>; readOnly: boolean } {
  const conn = db();
  const reviews: Record<string, Review> = {};
  for (const r of conn.prepare('SELECT event_id, review FROM reviews').all() as Row[]) reviews[String(r.event_id)] = String(r.review) as Review;
  return {
    cameras: (conn.prepare('SELECT * FROM cameras ORDER BY sort').all() as Row[]).map(toCamera),
    zones: (conn.prepare('SELECT * FROM zones ORDER BY rowid').all() as Row[]).map(toZone),
    videos: (conn.prepare('SELECT * FROM videos ORDER BY created_at, rowid').all() as Row[]).map(toVideo),
    events: listEvents(),
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
  const cam: Camera = { id: `CAM ${n}`, name: `New camera ${ids.size + 1}`, area: '', requiredGear: [], confirmFrames: 12, streamUrl: '' };
  insertCamera(conn, cam, sort);
  return cam;
}

function insertCamera(conn: DatabaseSync, c: Camera, sort: number): void {
  conn.prepare('INSERT INTO cameras (id, name, area, required_gear, confirm_frames, sort, stream_url) VALUES (?,?,?,?,?,?,?)')
    .run(c.id, c.name, c.area, JSON.stringify(c.requiredGear), c.confirmFrames, sort, c.streamUrl);
}

export function updateCamera(c: Camera): Camera | undefined {
  const res = db().prepare('UPDATE cameras SET name = ?, area = ?, required_gear = ?, confirm_frames = ?, stream_url = ? WHERE id = ?')
    .run(c.name, c.area, JSON.stringify(c.requiredGear), c.confirmFrames, c.streamUrl, c.id);
  if (!res.changes) return undefined;
  refreshEvents(db(), { cameraId: c.id });
  return c;
}

export function createZone(z: Zone): Zone {
  db().prepare('INSERT INTO zones VALUES (?,?,?,?)').run(z.id, z.cameraId, z.name, JSON.stringify(z.points));
  refreshEvents(db(), { cameraId: z.cameraId });
  return z;
}

export function renameZone(id: string, name: string): Zone | undefined {
  db().prepare('UPDATE zones SET name = ? WHERE id = ?').run(name, id);
  const r = db().prepare('SELECT * FROM zones WHERE id = ?').get(id) as Row | undefined;
  if (!r) return undefined;
  const zone = toZone(r);
  // Event descriptions name the area, so they are rebuilt with the new name.
  refreshEvents(db(), { cameraId: zone.cameraId });
  return zone;
}

/** Deletes an area and the review decisions on its entries (event ids look like video:zone:<zoneId>:…). */
export function deleteZone(id: string): boolean {
  const conn = db();
  const zone = conn.prepare('SELECT camera_id FROM zones WHERE id = ?').get(id) as Row | undefined;
  if (!zone) return false;
  inTransaction(conn, () => {
    conn.prepare("DELETE FROM reviews WHERE event_id LIKE '%:zone:' || ? || ':%'").run(id);
    conn.prepare('DELETE FROM zones WHERE id = ?').run(id);
  });
  refreshEvents(conn, { cameraId: String(zone.camera_id) });
  return true;
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

/** Deletes a video row, its events (by cascade) and the review decisions on them (event ids start with the video id). */
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
export type VideoPatch = Partial<Pick<Video, 'src' | 'poster' | 'sprite' | 'durationS' | 'fps' | 'status' | 'progress' | 'error' | 'tracks' | 'gear'>>;
const COLUMN: Record<keyof VideoPatch, string> = {
  src: 'src', poster: 'poster', sprite: 'sprite', durationS: 'duration_s', fps: 'fps', status: 'status', progress: 'progress', error: 'error', tracks: 'tracks', gear: 'gear',
};

export function updateVideo(id: string, patch: VideoPatch): Video | undefined {
  const keys = Object.keys(patch) as (keyof VideoPatch)[];
  if (keys.length) {
    const values = keys.map((k) => (k === 'tracks' || k === 'gear' ? JSON.stringify(patch[k]) : (patch[k] ?? null))) as (string | number | null)[];
    db().prepare(`UPDATE videos SET ${keys.map((k) => `${COLUMN[k]} = ?`).join(', ')} WHERE id = ?`).run(...values, id);
  }
  // Analysis just finished: create its events now, whether or not anyone has the page open.
  if (patch.status === 'completed') refreshEvents(db(), { videoId: id });
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
