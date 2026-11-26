/* 7-day heat prediction: hourly weather to WBGT, then each area's peak and risk score per day.
   Uses the same WBGT maths and scoring as the shift grid, so the outlook and the rest of the page agree. */
import { areas, type HeatArea } from '../data';
import { dayLabel } from '../dates';
import { scoreFrom } from '../engine';
import { roundWbgt, wbgtFromWeather, WORK_REST, workRest, type WorkRest } from '../wbgt';
import { CONFIDENT_DAYS } from './config';
import type { WeatherSeries } from './series';

const HOURS = 24;
const RELATIVE = ['Today', 'Tomorrow'] as const;
/** First WBGT that needs a work-rest cycle, and the stop-work line (the ACGIH bands). */
const CONTROL_FROM = WORK_REST[1].min;
const STOP_FROM = WORK_REST[WORK_REST.length - 1].min;

export interface AreaOutlook { area: HeatArea; wbgt: number; score: number; band: WorkRest }

export interface DayOutlook {
  index: number;
  date: string;
  /** 'Today' or 'Tomorrow' for the first two days. */
  relative?: string;
  /** False from day CONFIDENT_DAYS on, where weather forecasts lose skill. */
  confident: boolean;
  /** Every area at its peak, highest risk first. */
  areas: AreaOutlook[];
  /** The area that runs hottest; the day's hours are read there, as the worst case on site. */
  hottest: AreaOutlook;
  peakHour: number;
  /** Work-rest band per hour at the hottest area. */
  hours: WorkRest[];
  controlHours: number;
  stopHours: number;
  /** First and last hour the hottest area needs heat controls; undefined on a day that never does. */
  hotFrom?: number;
  hotTo?: number;
}

function predictDay(series: WeatherSeries, d: number): DayOutlook {
  const site = Array.from({ length: HOURS }, (_, h) => wbgtFromWeather(series.temp[d * HOURS + h], series.rh[d * HOURS + h]));
  const peakHour = site.indexOf(Math.max(...site));
  const ranked = areas
    .map((area): AreaOutlook => {
      const wbgt = roundWbgt(site[peakHour] + area.offset);
      // Jobs are only planned two days out, so the score uses each area's routine work.
      return { area, wbgt, band: workRest(wbgt), score: scoreFrom(area, wbgt).score };
    })
    .sort((a, b) => b.score - a.score);
  const hottest = ranked.reduce((m, a) => (a.wbgt > m.wbgt ? a : m));
  const at = site.map((w) => roundWbgt(w + hottest.area.offset));
  const hot = at.flatMap((w, h) => (w >= CONTROL_FROM ? [h] : []));
  return {
    index: d,
    date: dayLabel(series.start, d),
    relative: RELATIVE[d],
    confident: d < CONFIDENT_DAYS,
    areas: ranked,
    hottest,
    peakHour,
    hours: at.map(workRest),
    controlHours: hot.length,
    stopHours: at.filter((w) => w >= STOP_FROM).length,
    hotFrom: hot[0],
    hotTo: hot.at(-1),
  };
}

export function predictWeek(series: WeatherSeries): DayOutlook[] {
  return Array.from({ length: Math.floor(series.temp.length / HOURS) }, (_, d) => predictDay(series, d));
}

export interface WeekSummary { hottest: DayOutlook; controlDays: number; stopHours: number; topScore: number }

export function summarise(days: DayOutlook[]): WeekSummary {
  return {
    hottest: days.reduce((m, d) => (d.hottest.wbgt > m.hottest.wbgt ? d : m)),
    controlDays: days.filter((d) => d.controlHours > 0).length,
    stopHours: days.reduce((n, d) => n + d.stopHours, 0),
    topScore: Math.max(...days.map((d) => d.areas[0].score)),
  };
}
