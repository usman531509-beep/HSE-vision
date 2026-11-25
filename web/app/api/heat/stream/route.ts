import { TICK_MS } from '@/lib/heat/feed';
import { history, snapshot } from '@/lib/heat/gateway';

/** Server-Sent Events feed of WBGT readings: one `history` backfill, then a `reading` every tick. */
export async function GET(request: Request): Promise<Response> {
  const encoder = new TextEncoder();
  let timer: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const stop = (): void => clearInterval(timer);
      const send = (event: string, data: unknown): void => {
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch (err) {
          // The client went away between ticks; stop producing instead of throwing every 2 s.
          stop();
          console.warn('[heat/stream] closed while sending:', err instanceof Error ? err.message : err);
        }
      };
      send('history', history(Date.now()));
      timer = setInterval(() => send('reading', snapshot(Date.now())), TICK_MS);
      request.signal.addEventListener('abort', stop);
    },
    cancel() {
      clearInterval(timer);
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive' },
  });
}
