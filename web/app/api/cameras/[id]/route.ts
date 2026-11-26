import { cameraUsage, countCameras, deleteCamera, getCamera, updateCamera } from '@/lib/server/camera-db';
import { parseCamera, problem, readJson } from '@/lib/server/validate';
import { handler } from '@/lib/server/route';

/** Saves a camera's name, area and rules. */
export const PUT = handler(async (request: Request, ctx: RouteContext<'/api/cameras/[id]'>) => {
  const { id } = await ctx.params;
  const parsed = parseCamera(id, await readJson(request));
  if (!parsed.ok) return problem(400, parsed.error);
  const saved = updateCamera(parsed.value);
  return saved ? Response.json(saved) : problem(404, `Camera ${id} does not exist.`);
}, { write: true });

/** Deletes an empty camera. Refused while it still has videos or restricted areas, or if it is the last camera. */
export const DELETE = handler(async (_request: Request, ctx: RouteContext<'/api/cameras/[id]'>) => {
  const { id } = await ctx.params;
  if (!getCamera(id)) return problem(404, `Camera ${id} does not exist.`);
  if (countCameras() <= 1) return problem(409, 'Keep at least one camera. Add another camera before deleting this one.');
  const { videos, zones } = cameraUsage(id);
  if (videos || zones) {
    const parts = [videos && `${videos} ${videos === 1 ? 'video' : 'videos'}`, zones && `${zones} restricted ${zones === 1 ? 'area' : 'areas'}`].filter(Boolean);
    return problem(409, `${id} still has ${parts.join(' and ')}. Delete ${videos + zones === 1 ? 'it' : 'them'} first.`);
  }
  deleteCamera(id);
  return new Response(null, { status: 204 });
}, { write: true });
