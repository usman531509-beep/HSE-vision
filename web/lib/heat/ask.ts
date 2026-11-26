/* "Ask IonHSE" for heat: every answer is built from the same engine scores the page shows,
   as a one-line headline plus rows, so the page can lay it out instead of printing a paragraph. */
import type { Tone } from '@/lib/data';
import { adviseDay, ADVISE_FROM } from './advice';
import { DAYS, wbgtSensors } from './data';
import { ACT_FROM, scoreDay, type LiveReadings } from './engine';
import { refId } from './refs';
import { fmtHour, fmtWbgt, forecastWbgt, workRest } from './wbgt';

export interface AnswerRow { label: string; sub?: string; value: string; tone?: Tone }
export interface HeatAnswer { q: string; headline: string; rows: AnswerRow[]; source: string }

const TOMORROW = 1;
const tone = (score: number): Tone => (score >= ACT_FROM ? 'act' : score >= ADVISE_FROM ? 'watch' : 'low');

function jobsTomorrow(live: LiveReadings): HeatAnswer {
  const advice = adviseDay(TOMORROW, live);
  return {
    q: 'Which jobs should move tomorrow?',
    headline: advice.length ? `${advice.length} jobs need a change` : `None. Every job scores below ${ADVISE_FROM}.`,
    rows: advice.map((a) => ({
      label: a.title,
      sub: [refId(a.job.ref), a.to?.label ?? `Keep · ${a.rest} rest`].filter(Boolean).join(' · '),
      value: a.to ? `${a.from.score} → ${a.to.score}` : String(a.from.score),
      tone: tone(a.to?.score ?? a.from.score),
    })),
    source: 'Heat briefing',
  };
}

function liveNow(live: LiveReadings): HeatAnswer {
  const s = wbgtSensors[0];
  const v = live[s.id];
  const q = `Is it safe at ${s.spot} now?`;
  if (v === undefined) return { q, headline: `${s.id} has not reported yet.`, rows: [], source: s.id };
  return {
    q,
    headline: workRest(v).label,
    rows: wbgtSensors.filter((x) => live[x.id] !== undefined).map((x) => ({ label: x.id, sub: x.spot, value: `${fmtWbgt(live[x.id])} °C`, tone: workRest(live[x.id]).tone })),
    source: 'Live sensors · ACGIH',
  };
}

function peakTomorrow(live: LiveReadings): HeatAnswer {
  const hours = Array.from({ length: 24 }, (_, i) => 24 + i);
  const peak = hours.reduce((m, h) => (forecastWbgt(h) > forecastWbgt(m) ? h : m));
  const worst = scoreDay(TOMORROW, live)
    .map((row) => row.reduce((m, c) => (c.score > m.score ? c : m)))
    .filter((c) => c.score >= ACT_FROM)
    .sort((a, b) => b.score - a.score);
  return {
    q: `When is the heat peak ${DAYS[TOMORROW].label.toLowerCase()}?`,
    headline: `${fmtHour(peak)} · ${fmtWbgt(forecastWbgt(peak))} °C WBGT outdoors`,
    rows: worst.map((c) => ({ label: c.area.zone, sub: `Shift ${c.shift.id}`, value: String(c.score), tone: 'act' })),
    source: 'Forecast · heat-risk engine',
  };
}

export const HEAT_QUESTIONS: ((live: LiveReadings) => HeatAnswer)[] = [jobsTomorrow, liveNow, peakTomorrow];
