/* Contract between the sensor gateway (server) and the page (client). */
export const TICK_MS = 2000;
export const HISTORY_LEN = 12;
/** Missed ticks before a feed counts as lost. */
export const STALE_TICKS = 3;

export const STREAM_URL = '/api/heat/stream';
export const SPIKE_URL = '/api/heat/spike';

export interface Snapshot { at: string; values: Record<string, number> }
export interface History { at: string[]; values: Record<string, number[]> }
