/* RCA input loading. Perception and IoT deliver data as files (pilot: JSON), so RCA reads a file,
   validates it against RcaInputSchema and refuses anything malformed before any analysis runs. */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import type { Incident } from '@/lib/data';
import { RcaInputSchema, type RcaInput } from './schema';

/** Mock cases ship with the module. Resolved from the app root, which is the working directory for both `next` and `vitest`. */
export const MOCK_DIR = path.join(process.cwd(), 'lib', 'reasoning', 'rca', 'mock');

export class RcaInputError extends Error {}

export function parseRcaInput(raw: unknown, origin = 'input'): RcaInput {
  const r = RcaInputSchema.safeParse(raw);
  if (!r.success) throw new RcaInputError(`${origin} is not a valid RCA input:\n${r.error.issues.map((i) => `  ${i.path.join('.') || '(root)'}: ${i.message}`).join('\n')}`);
  return r.data;
}

export async function loadRcaInput(file: string): Promise<RcaInput> {
  let raw: unknown;
  try {
    raw = JSON.parse(await readFile(file, 'utf8'));
  } catch (err) {
    throw new RcaInputError(`Could not read ${file}: ${err instanceof Error ? err.message : String(err)}`);
  }
  return parseRcaInput(raw, path.basename(file));
}

/** Names of the bundled mock cases, e.g. "gas-leak-confirmed". */
export async function listMockCases(): Promise<string[]> {
  return (await readdir(MOCK_DIR)).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5)).sort();
}

export function loadMockCase(name: string): Promise<RcaInput> {
  if (!/^[a-z0-9-]+$/.test(name)) throw new RcaInputError(`Invalid mock case name "${name}"`);
  return loadRcaInput(path.join(MOCK_DIR, `${name}.json`));
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Adapter for the incidents the dashboard already shows (lib/data.ts), so RCA can run on them with no sensor data.
    The app's Incident has no year, timezone or injury field: the pilot year and site offset are assumed, injury is left as "none". */
export function fromAppIncident(inc: Incident, opts: { year?: number; utcOffset?: string } = {}): RcaInput {
  const [day, mon] = inc.date.split(' ');
  const month = MONTHS.indexOf(mon) + 1;
  if (!month) throw new RcaInputError(`Unrecognised date "${inc.date}" on ${inc.id}`);
  const occurred_at = `${opts.year ?? 2026}-${String(month).padStart(2, '0')}-${day.padStart(2, '0')}T${inc.time}:00${opts.utcOffset ?? '+05:00'}`;
  return parseRcaInput(
    {
      incident: {
        id: inc.id, kind: 'other', occurred_at, location: { zone: inc.zone }, title: inc.title, description: inc.what, source: inc.source,
        reported_severity: inc.sev === 'High' || inc.sev === 'Medium' || inc.sev === 'Low' ? inc.sev : undefined,
      },
      sensors: [],
    },
    inc.id,
  );
}
