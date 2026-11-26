/* Live site weather from Open-Meteo (free, no key). Server-side only: one cached fetch serves every viewer,
   and the browser only ever talks to the app's own route. */
import { cacheLife } from 'next/cache';
import { z } from 'zod';
import { OUTLOOK_DAYS, SITE_LOCATION } from './config';
import { weatherSeries, type WeatherSeries } from './series';

const ENDPOINT = 'https://api.open-meteo.com/v1/forecast';
/** Give up on a slow reply rather than hold the request open. */
const TIMEOUT_MS = 8000;

const reply = z.object({
  hourly: z.object({
    time: z.array(z.string()).min(OUTLOOK_DAYS * 24),
    temperature_2m: z.array(z.number()),
    relative_humidity_2m: z.array(z.number()),
  }),
});

/** Cached for hours: Open-Meteo refreshes its models about hourly, and a heat outlook does not need it faster. */
export async function fetchSiteWeather(): Promise<WeatherSeries> {
  'use cache';
  cacheLife('hours');
  const query = new URLSearchParams({
    latitude: String(SITE_LOCATION.lat),
    longitude: String(SITE_LOCATION.lon),
    hourly: 'temperature_2m,relative_humidity_2m',
    forecast_days: String(OUTLOOK_DAYS),
    timezone: SITE_LOCATION.timeZone,
  });
  const res = await fetch(`${ENDPOINT}?${query}`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`Open-Meteo answered ${res.status}`);
  const { hourly } = reply.parse(await res.json());
  return weatherSeries.parse({
    start: hourly.time[0].slice(0, 10),
    temp: hourly.temperature_2m,
    rh: hourly.relative_humidity_2m,
    place: SITE_LOCATION.place,
    issued: new Date().toISOString(),
  });
}
