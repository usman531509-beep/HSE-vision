'use client';

import { useEffect, useMemo, useState } from 'react';
import { OUTLOOK_API } from '@/lib/heat/outlook/config';
import { predictWeek, type DayOutlook } from '@/lib/heat/outlook/predict';
import { weatherSeries, type WeatherSeries } from '@/lib/heat/outlook/series';

export type LiveState = { state: 'loading' } | { state: 'ready'; series: WeatherSeries } | { state: 'error'; message: string };

export interface Outlook {
  live: LiveState;
  retry: () => void;
  /** The predicted week, once the forecast has loaded. */
  days: DayOutlook[] | null;
}

const FALLBACK_ERROR = 'The live forecast could not be loaded.';

async function loadLive(signal: AbortSignal): Promise<WeatherSeries> {
  const res = await fetch(OUTLOOK_API, { signal });
  const body: unknown = await res.json();
  if (!res.ok) {
    const message = typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string' ? body.error : FALLBACK_ERROR;
    throw new Error(message);
  }
  return weatherSeries.parse(body);
}

/** The site's live 7-day forecast, predicted per day and area. Fetched once on mount; `retry` fetches again after a failure. */
export function useOutlook(): Outlook {
  const [live, setLive] = useState<LiveState>({ state: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const ctl = new AbortController();
    setLive({ state: 'loading' });
    loadLive(ctl.signal)
      .then((series) => setLive({ state: 'ready', series }))
      .catch((err: unknown) => {
        if (ctl.signal.aborted) return;
        console.error('Heat outlook: live forecast failed', err);
        setLive({ state: 'error', message: err instanceof Error ? err.message : FALLBACK_ERROR });
      });
    return () => ctl.abort();
  }, [attempt]);

  const series = live.state === 'ready' ? live.series : null;
  const days = useMemo(() => (series ? predictWeek(series) : null), [series]);
  return { live, retry: () => setAttempt((n) => n + 1), days };
}
