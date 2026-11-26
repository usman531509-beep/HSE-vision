/* Resolves a planned job's reference to its title in the existing registers, so titles have one source. */
import { actions, permitRequests, permits, schedule } from '@/lib/data';

const TITLES: Record<string, string> = Object.fromEntries([
  ...permits.map((p) => [p.id, p.work]),
  ...permitRequests.map((p) => [p.id, p.work.replace(/\.$/, '')]),
  ...actions.map((a) => [a[0], a[1]]),
  ...schedule.map((s) => [s[1], s[1]]),
]);

export function refTitle(ref: string): string {
  const title = TITLES[ref];
  if (!title) throw new Error(`HeatShield job points at unknown register entry "${ref}"`);
  return title;
}

/** Shown next to the title; inspections are referenced by name, so they carry no id. */
export const refId = (ref: string): string | undefined => (/^[A-Z]+-\d+$/.test(ref) ? ref : undefined);
