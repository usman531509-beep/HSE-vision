import { describe, expect, it } from 'vitest';
import { dayLabel } from '../dates';
import { scoreFrom } from '../engine';
import { wbgtFromWeather, workRest } from '../wbgt';
import { predictWeek, summarise } from './predict';
import { weatherSeries, type WeatherSeries } from './series';

/** A day with flat weather, so every hour has the same WBGT. */
const flat = (temp: number, rh: number, days = 1): WeatherSeries => ({
  start: '2026-06-01', temp: Array(24 * days).fill(temp), rh: Array(24 * days).fill(rh), place: 'Test', issued: '2026-06-01T05:00:00Z',
});

describe('dayLabel', () => {
  it('formats a day and steps across month ends', () => {
    expect(dayLabel('2026-11-25')).toBe('Wed 25 Nov');
    expect(dayLabel('2026-11-30', 1)).toBe('Tue 1 Dec');
  });
  it('rejects a bad date', () => {
    expect(() => dayLabel('not-a-date')).toThrow();
  });
});

describe('weatherSeries', () => {
  it('accepts a full day and rejects mismatched or partial data', () => {
    expect(weatherSeries.safeParse(flat(25, 50)).success).toBe(true);
    expect(weatherSeries.safeParse({ ...flat(25, 50), rh: [50] }).success).toBe(false);
    expect(weatherSeries.safeParse({ ...flat(25, 50), start: '25/11/2026' }).success).toBe(false);
  });
});

describe('predictWeek', () => {
  it('labels days from the start date and marks later days less certain', () => {
    const days = predictWeek(flat(25, 50, 7));
    expect(days.map((d) => d.date)).toEqual(['Mon 1 Jun', 'Tue 2 Jun', 'Wed 3 Jun', 'Thu 4 Jun', 'Fri 5 Jun', 'Sat 6 Jun', 'Sun 7 Jun']);
    expect(days.map((d) => d.relative)).toEqual(['Today', 'Tomorrow', undefined, undefined, undefined, undefined, undefined]);
    expect(days.map((d) => d.confident)).toEqual([true, true, true, false, false, false, false]);
  });

  it('finds no heat controls on a mild day', () => {
    const [d] = predictWeek(flat(20, 50));
    expect(d.controlHours).toBe(0);
    expect(d.stopHours).toBe(0);
    expect(d.hotFrom).toBeUndefined();
  });

  it('needs controls all day, and stop-work, on a very hot day', () => {
    const [d] = predictWeek(flat(38, 50));
    expect(d.controlHours).toBe(24);
    expect(d.stopHours).toBe(24);
    expect([d.hotFrom, d.hotTo]).toEqual([0, 23]);
  });

  it('scores areas the same way as the shift grid', () => {
    const [d] = predictWeek(flat(30, 40));
    const top = d.areas[0];
    expect(top.wbgt).toBeCloseTo(wbgtFromWeather(30, 40) + top.area.offset, 1);
    for (const a of d.areas) expect(a.score).toBe(scoreFrom(a.area, a.wbgt).score);
    expect(d.areas.map((a) => a.score)).toEqual([...d.areas.map((a) => a.score)].sort((x, y) => y - x));
  });

  it('judges the band on the rounded number it shows', () => {
    for (const a of predictWeek(flat(30, 40))[0].areas) expect(a.band).toBe(workRest(a.wbgt));
    for (const a of predictWeek(flat(30, 40))[0].areas) expect(Number(a.wbgt.toFixed(1))).toBe(a.wbgt);
  });

  it('summarises the hottest day and the totals', () => {
    const series = flat(20, 50, 2);
    series.temp.fill(38, 24);
    const s = summarise(predictWeek(series));
    expect(s.hottest.index).toBe(1);
    expect(s.controlDays).toBe(1);
    expect(s.stopHours).toBe(24);
  });
});
