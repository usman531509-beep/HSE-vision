import { createCamera } from '@/lib/server/camera-db';
import { handler } from '@/lib/server/route';

/** Adds a camera with default settings; the user names it in Camera setup. */
export const POST = handler(async () => {
  return Response.json(createCamera(), { status: 201 });
}, { write: true });
