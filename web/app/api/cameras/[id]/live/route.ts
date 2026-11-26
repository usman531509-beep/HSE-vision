import { connection } from 'next/server';
import { getCamera } from '@/lib/server/camera-db';
import { streamStatus } from '@/lib/server/live';
import { problem } from '@/lib/server/validate';
import { handler } from '@/lib/server/route';

/** Live analysis status for one camera: connected or not, people in view now, clips sent. */
export const GET = handler(async (_request: Request, ctx: RouteContext<'/api/cameras/[id]/live'>) => {
  await connection();
  const { id } = await ctx.params;
  if (!getCamera(id)) return problem(404, `Camera ${id} does not exist.`);
  return Response.json(await streamStatus(id));
});
