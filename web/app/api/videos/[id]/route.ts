import { rm } from 'node:fs/promises';
import { uploadDir } from '@/lib/server/analysis';
import { deleteVideo, getVideo } from '@/lib/server/camera-db';
import { problem } from '@/lib/server/validate';
import { handler } from '@/lib/server/route';

/** Deletes a video, its review decisions and, for uploads, its files. Refused while analysis is running. */
export const DELETE = handler(async (_request: Request, ctx: RouteContext<'/api/videos/[id]'>) => {
  const { id } = await ctx.params;
  const video = getVideo(id);
  if (!video) return problem(404, 'That video does not exist.');
  if (video.status === 'uploaded' || video.status === 'processing') return problem(409, 'This video is still being analysed. Wait until it finishes, then delete it.');
  deleteVideo(id);
  // Sample clips live in public/ and are kept; only uploads have a folder of their own.
  await rm(uploadDir(id), { recursive: true, force: true }).catch((err: unknown) => console.error('[camera] could not remove upload files:', err));
  return new Response(null, { status: 204 });
}, { write: true });
