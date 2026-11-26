import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { uploadDir } from '@/lib/server/analysis';
import { getVideo } from '@/lib/server/camera-db';
import { problem } from '@/lib/server/validate';
import { handler } from '@/lib/server/route';

/** Files the vision service writes for each upload. */
const FILES = {
  video: ['video.mp4', 'video/mp4'],
  poster: ['poster.jpg', 'image/jpeg'],
  sprite: ['sprite.jpg', 'image/jpeg'],
} as const;
type Kind = keyof typeof FILES;

/** Serves an analysed upload. Video supports Range requests, which the browser needs to seek. */
export const GET = handler(async (request: Request, ctx: RouteContext<'/api/videos/[id]/file'>) => {
  const { id } = await ctx.params;
  const kind = new URL(request.url).searchParams.get('kind') as Kind | null;
  if (!kind || !(kind in FILES)) return problem(400, 'Ask for kind=video, poster or sprite.');
  if (!getVideo(id)) return problem(404, 'That video does not exist.');

  const [name, type] = FILES[kind];
  const file = path.join(uploadDir(id), name);
  let size: number;
  try {
    size = (await stat(file)).size;
  } catch {
    return problem(404, 'That file is not ready yet.');
  }

  const headers = { 'Content-Type': type, 'Accept-Ranges': 'bytes', 'Cache-Control': 'private, max-age=3600' };
  const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get('range') ?? '');
  if (!range) {
    return new Response(Readable.toWeb(createReadStream(file)) as ReadableStream, { headers: { ...headers, 'Content-Length': String(size) } });
  }
  // "bytes=start-end", "bytes=start-" or "bytes=-suffixLength".
  const start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
  const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
  if (start > end || start >= size) {
    return new Response(null, { status: 416, headers: { ...headers, 'Content-Range': `bytes */${size}` } });
  }
  return new Response(Readable.toWeb(createReadStream(file, { start, end })) as ReadableStream, {
    status: 206,
    headers: { ...headers, 'Content-Length': String(end - start + 1), 'Content-Range': `bytes ${start}-${end}/${size}` },
  });
});
