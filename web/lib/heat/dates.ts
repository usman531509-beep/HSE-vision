/* Day labels for the heat module. Formatted by hand, not with Intl, so the server and the browser always print
   the same text (no hydration mismatch) and a viewer's own time zone can never shift a date. */

const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

/** 'Wed 25 Nov' for the day `offset` days after `start` (YYYY-MM-DD). */
export function dayLabel(start: string, offset = 0): string {
  const d = new Date(`${start}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) throw new Error(`Not a date: ${start}`);
  d.setUTCDate(d.getUTCDate() + offset);
  return `${WEEKDAY[d.getUTCDay()]} ${d.getUTCDate()} ${MONTH[d.getUTCMonth()]}`;
}
