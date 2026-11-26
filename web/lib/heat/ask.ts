/* Shade, the heat-risk agent: mock answers built from the same engine scores the page shows,
   as a one-line headline plus rows, so the page can lay them out instead of printing a paragraph. */
import type { Tone } from '@/lib/data';
import { adviseDay, ADVISE_FROM } from './advice';
import { areas, DAYS, wbgtSensors } from './data';
import { ACT_FROM, scoreDay, WEIGHTS, type LiveReadings } from './engine';
import { refId } from './refs';
import { fmtHour, fmtWbgt, forecastWbgt, peakHour, workRest } from './wbgt';

export interface AnswerRow { label: string; sub?: string; value: string; tone?: Tone }
export interface HeatAnswer { headline: string; rows: AnswerRow[]; source: string }
/** One thing Shade knows how to answer. `keys` are the words that point a typed question at it. */
export interface Intent { id: string; q: string; keys: string[]; answer: (live: LiveReadings, area?: string) => HeatAnswer }

const TOMORROW = 1;
const tone = (score: number): Tone => (score >= ACT_FROM ? 'act' : score >= ADVISE_FROM ? 'watch' : 'low');
const pct = (w: number): string => `${Math.round(w * 100)}%`;

const jobsTomorrow: Intent = {
  id: 'jobs', q: 'Which jobs should move tomorrow?', keys: ['job', 'jobs', 'move', 'change', 'reschedule', 'briefing', 'permit', 'shift'],
  answer: (live) => {
    const advice = adviseDay(TOMORROW, live);
    return {
      headline: advice.length ? `${advice.length} jobs need a change. Moving them takes each out of the peak.` : `None. Every job scores below ${ADVISE_FROM}.`,
      rows: advice.map((a) => ({
        label: a.title,
        sub: [refId(a.job.ref), a.to?.label ?? `Keep · ${a.rest} rest`].filter(Boolean).join(' · '),
        value: a.to ? `${a.from.score} → ${a.to.score}` : String(a.from.score),
        tone: tone(a.to?.score ?? a.from.score),
      })),
      source: 'Heat briefing',
    };
  },
};

const safeNow: Intent = {
  id: 'now', q: 'Is it safe at Molder 1 aisle now?', keys: ['safe', 'now', 'right', 'sensor', 'sensors', 'molder', 'reading', 'live', 'current'],
  answer: (live) => {
    const read = wbgtSensors.filter((x) => live[x.id] !== undefined);
    if (!read.length) return { headline: 'The sensors have not reported yet. Ask again in a few seconds.', rows: [], source: 'Live sensors' };
    const hot = read.reduce((m, x) => (live[x.id] > live[m.id] ? x : m));
    return {
      headline: `${workRest(live[hot.id]).label} at ${hot.spot}, the hottest spot right now.`,
      rows: read.map((x) => ({ label: x.id, sub: x.spot, value: `${fmtWbgt(live[x.id])} °C`, tone: workRest(live[x.id]).tone })),
      source: 'Live sensors · ACGIH',
    };
  },
};

const peak: Intent = {
  id: 'peak', q: 'When is the heat peak tomorrow?', keys: ['peak', 'hottest', 'when', 'forecast', 'tomorrow', 'hour', 'time'],
  answer: (live) => {
    const h = peakHour(TOMORROW);
    const worst = scoreDay(TOMORROW, live)
      .map((row) => row.reduce((m, c) => (c.score > m.score ? c : m)))
      .filter((c) => c.score >= ACT_FROM)
      .sort((a, b) => b.score - a.score);
    return {
      headline: `${fmtHour(h)} ${DAYS[TOMORROW].label.toLowerCase()}, at ${fmtWbgt(forecastWbgt(h))} °C WBGT outdoors. These areas reach Act:`,
      rows: worst.map((c) => ({ label: c.area.zone, sub: `Shift ${c.shift.id}`, value: String(c.score), tone: 'act' })),
      source: 'Forecast · heat-risk engine',
    };
  },
};

const why: Intent = {
  id: 'why', q: 'Why is Compressor at Act tomorrow?', keys: ['why', 'score', 'scored', 'reason', 'explain', 'act', 'risk', 'high'],
  answer: (live, area) => {
    const cells = scoreDay(TOMORROW, live).flat();
    const pick = area ? cells.filter((c) => c.area.zone === area) : cells;
    const c = pick.reduce((m, x) => (x.score > m.score ? x : m));
    return {
      headline: `${c.area.zone} scores ${c.score} on shift ${c.shift.id}. Most of it is heat: ${fmtWbgt(c.wbgt)} °C WBGT at its peak.`,
      rows: [
        { label: 'Heat', sub: pct(WEIGHTS.heat), value: `+${Math.round(c.parts.heat * WEIGHTS.heat)}`, tone: tone(c.parts.heat) },
        { label: 'Planned work', sub: pct(WEIGHTS.work), value: `+${Math.round(c.parts.work * WEIGHTS.work)}`, tone: tone(c.parts.work) },
        { label: 'Past incidents', sub: `${c.area.heatEvents} last summer`, value: `+${Math.round(c.parts.history * WEIGHTS.history)}`, tone: tone(c.parts.history) },
      ],
      source: 'Heat-risk engine',
    };
  },
};

const crews: Intent = {
  id: 'crews', q: 'What should crews do this hour?', keys: ['crew', 'crews', 'workers', 'rest', 'break', 'water', 'shade', 'do', 'should'],
  answer: (live) => {
    const read = wbgtSensors.filter((x) => live[x.id] !== undefined);
    return {
      headline: 'Work-rest per spot for moderate work. Rest in shade and drink a cup of water every 15 to 20 minutes.',
      rows: read.map((x) => {
        const b = workRest(live[x.id]);
        return { label: x.spot, sub: x.id, value: b.work ? `${b.work} min work` : 'Stop', tone: b.tone };
      }),
      source: 'Live sensors · ACGIH',
    };
  },
};

export const INTENTS: Intent[] = [jobsTomorrow, safeNow, peak, why, crews];

/** What Shade says when it cannot place a question. */
export const FALLBACK: HeatAnswer = {
  headline: 'I answer questions about heat on this site: sensors now, the forecast peak, scores and which jobs to move. Try one of the questions below.',
  rows: [],
  source: 'Shade',
};

/**
 * Picks the intent whose keywords a typed question hits most, plus an area if one is named.
 * Mock matching for the pilot preview; the real agent would call a model with the same data.
 */
export function matchQuestion(text: string): { intent: Intent | null; area?: string } {
  const words: string[] = text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  const area = areas.find((a) => a.zone.toLowerCase().split(/[^a-z0-9]+/).some((w) => w.length > 2 && words.includes(w)))?.zone;
  const ranked = INTENTS.map((i) => ({ i, hits: i.keys.filter((k) => words.includes(k)).length })).sort((a, b) => b.hits - a.hits);
  if (ranked[0].hits > 0) return { intent: ranked[0].i, area };
  // A bare area name ("Press 3?") is a question about its score.
  return area ? { intent: why, area } : { intent: null };
}
