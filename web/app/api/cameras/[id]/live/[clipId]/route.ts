import { getCamera } from '@/lib/server/camera-db';
import { importClip } from '@/lib/server/live';
import { problem } from '@/lib/server/validate';
import { handler } from '@/lib/server/route';

/** Called by the vision service when a live clip is ready. The clip is imported from the upload folder and kept
    only if it produced events. */
export const POST = handler(async (_request: Request, ctx: RouteContext<'/api/cameras/[id]/live/[clipId]'>) => {
  const { id, clipId } = await ctx.params;
  if (!getCamera(id)) return problem(404, `Camera ${id} does not exist.`);
  const outcome = await importClip(id, clipId);
  return outcome === 'missing' ? problem(404, 'That clip does not exist.') : Response.json({ outcome });
}, { write: true });
