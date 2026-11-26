import { connection } from 'next/server';
import { syncAnalysis } from '@/lib/server/analysis';
import { problem } from '@/lib/server/validate';
import { handler } from '@/lib/server/route';

/** Current state of a video; while it is processing this also pulls progress from the vision service. */
export const GET = handler(async (_request: Request, ctx: RouteContext<'/api/videos/[id]/status'>) => {
  await connection();
  const { id } = await ctx.params;
  const video = await syncAnalysis(id);
  return video ? Response.json(video) : problem(404, 'That video does not exist.');
});
