import { deleteZone, renameZone } from '@/lib/server/camera-db';
import { parseZoneName, problem, readJson } from '@/lib/server/validate';
import { handler } from '@/lib/server/route';

/** Renames an area. */
export const PUT = handler(async (request: Request, ctx: RouteContext<'/api/zones/[id]'>) => {
  const { id } = await ctx.params;
  const parsed = parseZoneName(await readJson(request));
  if (!parsed.ok) return problem(400, parsed.error);
  const zone = renameZone(id, parsed.value);
  return zone ? Response.json(zone) : problem(404, 'That area does not exist.');
}, { write: true });

/** Deletes an area and the review decisions on its entries. */
export const DELETE = handler(async (_request: Request, ctx: RouteContext<'/api/zones/[id]'>) => {
  const { id } = await ctx.params;
  return deleteZone(id) ? new Response(null, { status: 204 }) : problem(404, 'That area does not exist.');
}, { write: true });
