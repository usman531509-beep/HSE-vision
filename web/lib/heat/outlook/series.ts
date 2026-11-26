/* The live site weather the outlook predicts from. One schema checks it on both sides of the API:
   the server checks what it builds from Open-Meteo, the browser checks the app's own route. */
import { z } from 'zod';

export const weatherSeries = z
  .object({
    /** Site-local date of the first hour, YYYY-MM-DD. */
    start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    /** Hourly air temperature (°C) and relative humidity (%), from 00:00 on `start`. */
    temp: z.array(z.number()),
    rh: z.array(z.number()),
    place: z.string(),
    /** When the forecast was fetched, ISO time. */
    issued: z.string(),
  })
  .refine((s) => s.temp.length === s.rh.length && s.temp.length >= 24, 'Temperature and humidity must cover the same whole days');

export type WeatherSeries = z.infer<typeof weatherSeries>;
