import { connection } from 'next/server';
import { listEvents } from '@/lib/server/camera-db';
import { handler } from '@/lib/server/route';

/** Stored events of every analysed video. The page re-reads these after a change that re-runs the rules. */
export const GET = handler(async () => {
  await connection();
  return Response.json(listEvents());
});
