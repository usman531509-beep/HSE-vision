/* Shared building blocks: icons, status words, cell bars, cards, KPI strip, tables. */
import type { ReactNode } from 'react';
import type { CheckState, Sev, Tone } from '@/lib/data';

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(' ');
}

const ICON = {
  grid: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  alert: 'M12 3l10 18H2L12 3zM12 10v4M12 17.5v.5',
  lock: 'M7 11V7a5 5 0 0 1 10 0v4M5 11h14v10H5z',
  checkSq: 'M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9',
  list: 'M4 6h16M4 12h16M4 18h10',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z',
  cap: 'M2 9l10-5 10 5-10 5L2 9zM6 11v5c3 2 9 2 12 0v-5',
  bars: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  factory: 'M3 21h18M5 21V9l5 3V9l5 3V5h4v16',
  clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2',
  bell: 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0',
  search: 'M11 3.5a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15zM20.5 20.5l-4.2-4.2',
  send: 'M5 12h14M13 6l6 6-6 6',
  menu: 'M4 7h16M4 12h16M4 17h16',
  plus: 'M12 5v14M5 12h14',
  check: 'M5 12l5 5L20 7',
  x: 'M6 6l12 12M18 6L6 18',
  thermo: 'M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z',
  activity: 'M22 12h-4l-3 9L9 3l-3 9H2',
  refresh: 'M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5',
  download: 'M12 4v11M7 10l5 5 5-5M5 20h14',
  file: 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M9 13h6M9 17h4',
  camera: 'M4 8h3l2-3h6l2 3h3v11H4zM12 10.5a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
} as const;
export type IconName = keyof typeof ICON;

export function Icon({ name, className, stroke = 1.6 }: { name: IconName; className?: string; stroke?: number }) {
  return (
    <span className={cx('inline-flex flex-none', className ?? 'size-[18px]')} aria-hidden="true">
      <svg viewBox="0 0 24 24" className="size-full fill-none stroke-current" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
        <path d={ICON[name]} />
      </svg>
    </span>
  );
}

export const SEV: Record<Sev, Tone> = { High: 'act', Medium: 'watch', Low: 'low', Off: 'off', Info: 'info' };
export const lvl = (score: number): Tone => (score >= 70 ? 'act' : score >= 40 ? 'watch' : 'low');
export const lvlName = (score: number) => (score >= 70 ? 'Act' : score >= 40 ? 'Watch' : 'Low');

/** Text colour for a level word. */
export const TEXT: Record<Tone, string> = { act: 'text-act-ink', watch: 'text-watch-ink', low: 'text-low', off: 'text-off-ink', info: 'text-off-ink' };
/** Solid fill for a level. */
export const FILL: Record<Tone, string> = { act: 'bg-act', watch: 'bg-watch', low: 'bg-low', off: 'bg-off', info: 'bg-off' };

/** Status: a coloured word with a 6px dot, never colour alone. */
export function Chip({ tone, children }: { tone: Tone; children: ReactNode }) {
  const pill: Record<Tone, string> = {
    act: 'bg-act-bg text-act-ink before:bg-act',
    watch: 'bg-watch-bg text-watch-ink before:bg-watch',
    low: 'bg-lime text-lime-ink before:bg-lime-ink/60',
    off: 'bg-paper text-off-ink ring-1 ring-line-2 before:bg-off',
    info: 'bg-paper text-off-ink ring-1 ring-line-2 before:bg-off',
  };
  return (
    <span className={cx('inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[11.5px] font-medium before:size-1.5 before:rounded-full', pill[tone])}>
      {children}
    </span>
  );
}

export function Dot({ tone, className }: { tone: Tone; className?: string }) {
  return <span className={cx('inline-block size-[7px] flex-none rounded-full', FILL[tone], className)} aria-hidden="true" />;
}

export function Sq({ tone }: { tone: Tone | 'accent' }) {
  return <i className={cx('inline-block size-2.5 flex-none rounded-full', tone === 'accent' ? 'bg-accent' : FILL[tone])} />;
}

/** Progress as cells: n of total switched on. */
export function Cells({ n, total, tone = 'low', className }: { n: number; total: number; tone?: Tone; className?: string }) {
  return (
    <div className={cx('grid gap-[3px]', className)} style={{ gridTemplateColumns: `repeat(${total},1fr)` }} aria-hidden="true">
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={cx('h-2 rounded-full', i < n ? FILL[tone] : 'bg-track')} />
      ))}
    </div>
  );
}

/** A number with a muted, smaller unit. */
export function Num({ value, unit, className }: { value: ReactNode; unit?: string; className?: string }) {
  return (
    <div className={cx('font-normal leading-none tracking-[-0.035em] tabular-nums', className)}>
      {value}
      {unit ? <span className="ml-1 text-[0.42em] font-normal tracking-normal text-soft">{unit}</span> : null}
    </div>
  );
}

export const meta = 'text-[12.5px] text-muted';
/** White, rounded, softly lifted surface used by every card. */
export const card = 'flex min-w-0 scroll-mt-24 flex-col gap-4 rounded-lg bg-paper/90 p-5 shadow-[0_1px_2px_rgb(0_0_0/0.04),0_10px_30px_-14px_rgb(0_0_0/0.10)] ring-1 ring-white/70 backdrop-blur max-compact:p-4';
export const eyebrow = 'text-[12.5px] font-medium text-muted';

export function PageHead({ title, desc, tools, aside }: { title: string; desc: string; tools?: ReactNode; aside?: ReactNode }) {
  return (
    <header className="mt-8 mb-6 flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
      <div className="flex flex-col gap-5">
        <div>
          <h1 className="text-[34px] leading-[1.1] font-normal tracking-[-0.03em] max-compact:text-[28px]">{title}</h1>
          <p className="mt-2 max-w-[620px] text-sm text-muted">{desc}</p>
        </div>
        {tools ? <div className="flex flex-wrap items-center gap-2">{tools}</div> : null}
      </div>
      {aside}
    </header>
  );
}

export function Card({ title, sub, extra, className, note, children, id }: {
  title: ReactNode; sub?: ReactNode; extra?: ReactNode; className?: string; note?: boolean; children: ReactNode; id?: string;
}) {
  return (
    <section id={id} className={cx(card, note && 'bg-sage/90!', className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-[15px] font-medium tracking-[-0.01em]">{title}</h2>
          {sub ? <div className="mt-0.5 text-[12.5px] text-muted">{sub}</div> : null}
        </div>
        {extra}
      </div>
      {children}
    </section>
  );
}

export function Panel({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-4">{children}</div>;
}

/** KPI strip: [label, value, unit, note, labelExtra?, after?] — big light numbers on separate cards. */
export type KpiItem = [string, ReactNode, string, ReactNode, ReactNode?, ReactNode?];
export function Kpis({ items }: { items: KpiItem[] }) {
  return (
    <div className="grid grid-cols-4 gap-4 max-nav:grid-cols-2 max-compact:grid-cols-1">
      {items.map(([label, value, unit, note, labelExtra, after], i) => (
        <div key={label} className={cx(card, 'gap-0', i === 0 && 'bg-sage/90')}>
          <div className="flex items-center justify-between gap-2 text-[13px] text-ink-2">{label}{labelExtra}</div>
          <Num value={value} unit={unit} className="mt-5 text-[44px]" />
          <div className={cx(meta, 'mt-2')}>{note}</div>
          {after}
        </div>
      ))}
    </div>
  );
}

export function CheckRow({ state, label }: { state: CheckState; label: string }) {
  const name = state === 'ok' || state === 1 ? 'ok' : state === 'no' || state === 0 ? 'no' : 'wait';
  const icon: IconName = name === 'ok' ? 'check' : name === 'no' ? 'x' : 'clock';
  const color = name === 'ok' ? 'text-low' : name === 'no' ? 'text-act' : 'text-watch';
  const sr = name === 'ok' ? 'Done: ' : name === 'no' ? 'Failed: ' : 'Waiting: ';
  return (
    <div className="flex items-center gap-2 text-[13px] text-ink-2">
      <Icon name={icon} className={cx('size-4', color)} stroke={name === 'wait' ? 2 : 2.4} />
      <span><span className="sr-only">{sr}</span>{label}</span>
    </div>
  );
}

export function Foot({ left, right }: { left: ReactNode; right?: ReactNode }) {
  return (
    <footer className="flex flex-wrap justify-between gap-x-6 gap-y-2 px-0.5 pt-1 text-xs text-soft">
      <span>{left}</span>
      {right ? <span>{right}</span> : null}
    </footer>
  );
}

export function Legend({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap gap-3.5 text-[12.5px] text-muted [&>span]:inline-flex [&>span]:items-center [&>span]:gap-1.5">{children}</div>;
}

/* ---------- buttons, filters ---------- */
const btnBase = 'inline-flex items-center justify-center gap-[7px] whitespace-nowrap rounded-full border border-transparent font-medium transition-colors duration-150 ease-out [&>span]:size-4';
export function btn(kind: 'dark' | 'light' | 'ok', size: 'md' | 'sm' = 'md') {
  return cx(
    btnBase,
    size === 'sm' ? 'h-8 px-3.5 text-[12.5px]' : 'h-11 px-5 text-[13px]',
    kind === 'dark' && 'bg-accent text-paper hover:bg-accent-2',
    kind === 'light' && 'bg-paper text-ink shadow-[0_1px_2px_rgb(0_0_0/0.05)] ring-1 ring-line hover:bg-sunk',
    kind === 'ok' && 'bg-lime text-lime-ink',
  );
}
export const link = 'text-[13px] font-medium text-ink underline decoration-line-2 underline-offset-4 hover:decoration-ink';

/** Segmented control (range, standard tabs). */
export const segWrap = 'inline-flex gap-0.5 rounded-full bg-paper/90 p-1 ring-1 ring-white/70 backdrop-blur';
export const segBtn =
  'h-9 whitespace-nowrap rounded-full px-4 text-[12.5px] text-ink-2 hover:bg-sunk aria-pressed:bg-ink aria-pressed:text-paper aria-pressed:hover:bg-ink aria-selected:bg-ink aria-selected:text-paper aria-selected:hover:bg-ink';

/** Filter chips. */
export function Filters<T extends string>({ label, options, value, onChange }: {
  label: string; options: (T | [T, string])[]; value: T; onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label={label}>
      {options.map((o) => {
        const [v, text] = Array.isArray(o) ? o : [o, o];
        return (
          <button
            key={v}
            type="button"
            aria-pressed={value === v}
            onClick={() => onChange(v)}
            className="h-8 rounded-full bg-paper px-3.5 text-[12.5px] font-medium text-ink-2 ring-1 ring-line hover:bg-sunk aria-pressed:bg-ink aria-pressed:text-paper aria-pressed:ring-ink"
          >
            {text}
          </button>
        );
      })}
    </div>
  );
}

/* ---------- lists ---------- */
export const list = 'flex flex-col';
export const rowBase = 'w-full min-h-[56px] items-center gap-3 rounded-md border-t border-line px-3 py-2.5 text-left transition-colors duration-150 ease-out first:border-t-0';
export const row = 'flex ' + rowBase;
export const rowBtn = 'hover:bg-sunk aria-pressed:border-transparent aria-pressed:bg-sunk';
export const rowMain = 'min-w-0 flex-1 [&>b]:block [&>b]:text-[13.5px] [&>b]:font-medium [&>.meta]:mt-px [&>.meta]:block';
export const rowSide = 'flex flex-none flex-col items-end gap-[3px] text-right';
export function Ico({ name, tone }: { name: IconName; tone?: Tone }) {
  const c = tone === 'act' ? 'bg-act-bg text-act' : tone === 'watch' ? 'bg-watch-bg text-watch-ink' : tone === 'low' ? 'bg-lime text-lime-ink' : 'bg-sage text-ink';
  return <span className={cx('grid size-9 flex-none place-items-center rounded-full', c)}><Icon name={name} className="size-[17px]" /></span>;
}

/** Key/value line. */
export function KV({ k, v, vClass }: { k: ReactNode; v: ReactNode; vClass?: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-line py-2 text-[13px] last:border-b-0">
      <span className="text-muted">{k}</span>
      <b className={cx('text-right font-medium tabular-nums', vClass)}>{v}</b>
    </div>
  );
}

export const tile = 'rounded-md bg-sunk px-4 py-3.5';

/* ---------- tables: hairline rows, one divider system ---------- */
export function Table({ head, children, className }: { head?: string[]; children: ReactNode; className?: string }) {
  return (
    <div className="overflow-x-auto">
      <table
        className={cx(
          'w-full border-collapse text-[13px]',
          '[&_th]:whitespace-nowrap [&_th]:border-b [&_th]:border-line [&_th]:px-3 [&_th]:pt-1 [&_th]:pb-3 [&_th]:text-left [&_th]:text-[12px] [&_th]:font-normal [&_th]:text-muted',
          '[&_td]:border-b [&_td]:border-line [&_td]:px-3 [&_td]:py-3.5 [&_td]:align-middle [&_td]:text-ink-2 [&_td]:tabular-nums',
          '[&_tr:last-child_td]:border-b-0 [&_tbody_tr:hover_td]:bg-sunk [&_td:first-child]:rounded-l-md [&_td:last-child]:rounded-r-md',
          '[&_td:first-child]:font-medium [&_td:first-child]:text-ink',
          '[&_tr.warn_td]:bg-act-bg/45',
          className,
        )}
      >
        {head ? (
          <thead>
            <tr>{head.map((h) => <th key={h}>{h}</th>)}</tr>
          </thead>
        ) : null}
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
