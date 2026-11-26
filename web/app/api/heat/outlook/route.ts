import { unstable_rethrow } from 'next/navigation';
import { connection } from 'next/server';
import { fetchSiteWeather } from '@/lib/heat/outlook/open-meteo';

const UNAVAILABLE = 'The live weather forecast is unavailable right now. Try again in a moment.';

/** Live 7-day site weather for the heat outlook. Runs at request time, never at build; the fetch itself is cached. */
export async function GET(): Promise<Response> {
  // A failed fetch during the build would be baked into the deploy; keep this route dynamic.
  await connection();
  try {
    return Response.json(await fetchSiteWeather());
  } catch (err) {
    unstable_rethrow(err);
    console.error('[heat outlook] forecast fetch failed:', err);
    return Response.json({ error: UNAVAILABLE }, { status: 502 });
  }
}
