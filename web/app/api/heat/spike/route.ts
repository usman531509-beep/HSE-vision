import { triggerSpike } from '@/lib/heat/gateway';

/** Demo control: push a hot spot onto one sensor so the engine's response can be watched live. */
export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Body must be JSON: { "sensor": "WB-01" }' }, { status: 400 });
  }
  const sensor = typeof body === 'object' && body !== null && 'sensor' in body ? (body as { sensor: unknown }).sensor : undefined;
  if (typeof sensor !== 'string' || !triggerSpike(sensor)) {
    return Response.json({ error: 'Unknown sensor id' }, { status: 404 });
  }
  return Response.json({ ok: true, sensor }, { status: 202 });
}
