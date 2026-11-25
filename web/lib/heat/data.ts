/* HeatShield: sample inputs for the heat-risk engine (pilot preview).
   Areas reuse the zone names in ../data.ts; jobs point at existing permits, actions and inspections by id. */

export type ShiftId = 'A' | 'B' | 'C';
export type DayIndex = 0 | 1;
export type Workload = 'Light' | 'Moderate' | 'Heavy';
export type JobKind = 'Hot work' | 'Confined space' | 'Outdoor';

export interface Shift { id: ShiftId; start: number; label: string }
export interface HeatArea {
  zone: string;
  setting: 'Indoor' | 'Outdoor';
  /** °C WBGT above the site forecast, learned from sensor history (process heat, sun on steel). */
  offset: number;
  /** Exposure from routine work in the area, 0–100. */
  routine: number;
  /** Heat-related incidents and near misses in the area last summer. */
  heatEvents: number;
}
export interface Job { ref: string; area: string; day: DayIndex; shift: ShiftId; start: string; workload: Workload; kind?: JobKind }
export interface WbgtSensor { id: string; area: string; spot: string; bias: number; phase: number }

export const SHIFT_HOURS = 8;
export const SHIFTS: Shift[] = [
  { id: 'A', start: 6, label: '06–14' },
  { id: 'B', start: 14, label: '14–22' },
  { id: 'C', start: 22, label: '22–06' },
];
export const DAYS: { label: string; date: string }[] = [
  { label: 'Today', date: 'Wed 25 Nov' },
  { label: 'Tomorrow', date: 'Thu 26 Nov' },
];

/** The prototype's clock: every screen reads as 18:42 on day 0, during Shift B. */
export const NOW = { day: 0 as DayIndex, hour: 18, minute: 42 };
export const FORECAST_ISSUED = '05:00';
export const BRIEFING_SENT = '06:30';

/** Hourly site forecast for 48 h from 00:00 today. */
export const forecast: { temp: number[]; rh: number[] } = {
  temp: [
    21, 20.5, 20, 19.5, 19.5, 19.5, 20, 21.5, 23.5, 25.5, 27.5, 29, 30, 31, 31, 30.5, 29.5, 28, 26.5, 25.5, 24.5, 23.5, 22.5, 22,
    21.5, 21, 20.5, 20, 20, 20, 21, 23, 25.5, 28, 30.5, 32.5, 33.5, 34.5, 34.5, 34, 33, 31, 29, 27.5, 26, 25, 24, 23,
  ],
  rh: [
    72, 74, 76, 78, 78, 78, 76, 70, 62, 55, 48, 44, 41, 39, 39, 41, 45, 50, 56, 60, 63, 66, 68, 70,
    72, 74, 76, 78, 78, 78, 75, 68, 60, 52, 46, 43, 41, 40, 40, 41, 44, 49, 55, 59, 62, 65, 67, 69,
  ],
};

export const areas: HeatArea[] = [
  { zone: 'Line 2 · Molders', setting: 'Indoor', offset: 2.5, routine: 60, heatEvents: 4 },
  { zone: 'Zone 4 · Packing', setting: 'Indoor', offset: 1.5, routine: 50, heatEvents: 3 },
  { zone: 'Press 3', setting: 'Indoor', offset: 1.0, routine: 50, heatEvents: 1 },
  { zone: 'Compressor', setting: 'Indoor', offset: 2.0, routine: 25, heatEvents: 2 },
  { zone: 'Tank B', setting: 'Outdoor', offset: 1.5, routine: 20, heatEvents: 2 },
  { zone: 'Dock 1', setting: 'Outdoor', offset: 1.0, routine: 50, heatEvents: 3 },
];

/** Planned work, read from the permit schedule, actions and inspections. */
export const jobs: Job[] = [
  { ref: 'PTW-1182', area: 'Line 2 · Molders', day: 0, shift: 'B', start: '17:50', workload: 'Moderate' },
  { ref: 'PTW-1185', area: 'Compressor', day: 0, shift: 'B', start: '15:30', workload: 'Heavy', kind: 'Hot work' },
  { ref: 'PTW-1187', area: 'Tank B', day: 0, shift: 'B', start: '18:10', workload: 'Moderate', kind: 'Confined space' },
  { ref: 'PTW-1191', area: 'Compressor', day: 1, shift: 'A', start: '10:00', workload: 'Heavy', kind: 'Hot work' },
  { ref: 'Chemical store and eyewash', area: 'Tank B', day: 1, shift: 'A', start: '09:00', workload: 'Light' },
  { ref: 'CA-109', area: 'Dock 1', day: 1, shift: 'B', start: '14:30', workload: 'Moderate', kind: 'Outdoor' },
  { ref: 'CA-119', area: 'Press 3', day: 1, shift: 'B', start: '15:00', workload: 'Moderate' },
];

/** Pilot week 3: three WBGT sensors in one hot zone (Line 2 and the packing line it feeds). */
export const wbgtSensors: WbgtSensor[] = [
  { id: 'WB-01', area: 'Line 2 · Molders', spot: 'Molder 1 aisle', bias: 0.3, phase: 0.4 },
  { id: 'WB-02', area: 'Line 2 · Molders', spot: 'Molder 3 aisle', bias: -0.2, phase: 2.1 },
  { id: 'WB-03', area: 'Zone 4 · Packing', spot: 'Station 4B', bias: 0.1, phase: 4.3 },
];

/** Pilot week 2 back-test against last summer (sample figures). */
export const backtest = { flagged: 11, total: 13, season: 'May–Sep 2026' };
