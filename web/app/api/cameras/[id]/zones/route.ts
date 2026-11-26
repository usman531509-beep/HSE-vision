import { randomUUID } from 'node:crypto';
import { createZone, getCamera } from '@/lib/server/camera-db';
import { parseZone, problem, readJson } from '@/lib/server/validate';
import { handler } from '@/lib/server/route';

/** Saves a restricted area drawn on this camera's picture. */
export const POST = handler(async (request: Request, ctx: RouteContext<'/api/cameras/[id]/zones'>) => {
  const { id } = await ctx.params;
  if (!getCamera(id)) return problem(404, `Camera ${id} does not exist.`);
  const parsed = parseZone(await readJson(request));
  if (!parsed.ok) return problem(400, parsed.error);
  return Response.json(createZone({ id: `z-${randomUUID().slice(0, 8)}`, cameraId: id, ...parsed.value }), { status: 201 });
}, { write: true });
