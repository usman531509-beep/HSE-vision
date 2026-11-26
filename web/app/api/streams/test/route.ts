import { testStream } from '@/lib/server/live';
import { parseStreamUrl, problem, readJson } from '@/lib/server/validate';
import { handler } from '@/lib/server/route';

/** "Test connection" in Camera setup: connects to a stream address once and reports what came back. */
export const POST = handler(async (request: Request) => {
  const body = await readJson(request);
  const parsed = parseStreamUrl(typeof body === 'object' && body !== null ? (body as { url?: unknown }).url : undefined);
  if (!parsed.ok) return problem(400, parsed.error);
  if (!parsed.value) return problem(400, 'Enter a stream address to test.');
  const result = await testStream(parsed.value);
  return result.ok ? Response.json(result) : problem(422, result.error);
}, { write: true });
