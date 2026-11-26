import { connection } from 'next/server';
import { liveFeed } from '@/lib/server/live';
import { problem } from '@/lib/server/validate';
import { handler } from '@/lib/server/route';

/** The camera's live picture with person boxes, as an MJPEG stream an <img> can show. Proxied so the vision
    service never has to be reachable from the browser. */
export const GET = handler(async (request: Request, ctx: RouteContext<'/api/cameras/[id]/live/feed'>) => {
  await connection();
  const { id } = await ctx.params;
  const feed = await liveFeed(id, request.signal);
  if (!feed) return problem(404, 'Live view is not available for this camera right now.');
  return new Response(feed.body, { headers: { 'Content-Type': feed.headers.get('content-type') ?? 'multipart/x-mixed-replace; boundary=frame', 'Cache-Control': 'no-store' } });
});
