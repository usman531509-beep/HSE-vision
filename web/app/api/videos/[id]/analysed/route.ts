import { syncAnalysis } from '@/lib/server/analysis';
import { problem } from '@/lib/server/validate';
import { handler } from '@/lib/server/route';

/** Called by the vision service when a job ends. It carries no results: the app pulls them from the service
    itself, so a stray or forged call can do no more than trigger a status check. */
export const POST = handler(async (_request: Request, ctx: RouteContext<'/api/videos/[id]/analysed'>) => {
  const { id } = await ctx.params;
  return (await syncAnalysis(id)) ? new Response(null, { status: 204 }) : problem(404, 'That video does not exist.');
}, { write: true });
