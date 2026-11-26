import { connection } from 'next/server';
import { listAll } from '@/lib/server/camera-db';
import { handler } from '@/lib/server/route';

/** Everything the camera pages need in one call: cameras, zones, videos with tracks, and review decisions. */
export const GET = handler(async () => {
  // The SQLite driver is synchronous, so mark this as request-time or it would be frozen at build.
  await connection();
  return Response.json(listAll());
});
