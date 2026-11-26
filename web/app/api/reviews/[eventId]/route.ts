import { setReview } from '@/lib/server/camera-db';
import { parseReview, problem, readJson } from '@/lib/server/validate';
import { handler } from '@/lib/server/route';

/** Records a person's decision on an event: confirmed, false alarm, or back to needs review. */
export const PUT = handler(async (request: Request, ctx: RouteContext<'/api/reviews/[eventId]'>) => {
  const { eventId } = await ctx.params;
  const parsed = parseReview(await readJson(request));
  if (!parsed.ok) return problem(400, parsed.error);
  setReview(eventId, parsed.value);
  return Response.json({ eventId, review: parsed.value });
}, { write: true });
