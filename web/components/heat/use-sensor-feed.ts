'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { HISTORY_LEN, SPIKE_URL, STALE_TICKS, STREAM_URL, TICK_MS, type History, type Snapshot } from '@/lib/heat/feed';
import type { LiveReadings } from '@/lib/heat/engine';

export type FeedStatus = 'connecting' | 'live' | 'lost';

export interface SensorFeed {
  status: FeedStatus;
  /** Demo-clock time of the latest reading. */
  at: string;
  series: Record<string, number[]>;
  latest: LiveReadings;
  /** Real time the latest message arrived, for "updated Xs ago". */
  receivedMs: number;
  spike: (sensorId: string) => Promise<void>;
  error: string | null;
}

function parse<T>(e: Event): T {
  return JSON.parse((e as MessageEvent<string>).data) as T;
}

/** Subscribes to the WBGT gateway over Server-Sent Events. EventSource reconnects on its own. */
export function useSensorFeed(): SensorFeed {
  const [status, setStatus] = useState<FeedStatus>('connecting');
  const [at, setAt] = useState('');
  const [series, setSeries] = useState<Record<string, number[]>>({});
  const [receivedMs, setReceivedMs] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const es = new EventSource(STREAM_URL);
    const onFail = (where: string, err: unknown): void => {
      console.error(`[heat feed] ${where}:`, err);
      setStatus('lost');
    };
    es.addEventListener('history', (e) => {
      try {
        const h = parse<History>(e);
        setSeries(h.values);
        setAt(h.at[h.at.length - 1] ?? '');
        setReceivedMs(Date.now());
        setStatus('live');
      } catch (err) { onFail('bad history message', err); }
    });
    es.addEventListener('reading', (e) => {
      try {
        const snap = parse<Snapshot>(e);
        setSeries((prev) => Object.fromEntries(Object.entries(snap.values).map(([id, v]) => [id, [...(prev[id] ?? []), v].slice(-HISTORY_LEN)])));
        setAt(snap.at);
        setReceivedMs(Date.now());
        setStatus('live');
      } catch (err) { onFail('bad reading message', err); }
    });
    es.onerror = () => setStatus('lost');
    return () => es.close();
  }, []);

  // A connection can stay open yet go quiet; mark it lost after a few missed ticks.
  useEffect(() => {
    const t = setInterval(() => {
      setStatus((s) => (s === 'live' && Date.now() - receivedMs > TICK_MS * STALE_TICKS ? 'lost' : s));
    }, TICK_MS);
    return () => clearInterval(t);
  }, [receivedMs]);

  const latest = useMemo<LiveReadings>(
    () => Object.fromEntries(Object.entries(series).filter(([, v]) => v.length).map(([id, v]) => [id, v[v.length - 1]])),
    [series],
  );

  const spike = useCallback(async (sensorId: string): Promise<void> => {
    setError(null);
    try {
      const res = await fetch(SPIKE_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sensor: sensorId }) });
      if (!res.ok) throw new Error(`Gateway answered ${res.status}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reach the sensor gateway');
    }
  }, []);

  return { status, at, series, latest, receivedMs, spike, error };
}
