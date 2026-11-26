'use client';

import { ClipboardCheck, CloudSun, Map as MapIcon, MessageCircleQuestion, type LucideIcon } from 'lucide-react';
import { Card, cx } from '../../../ui';

interface Shortcut { href: string; label: string; icon: LucideIcon; badge?: number }

/** Quick tiles to the page's other sections. The one waiting on a decision is filled, like the current nav item. */
export function Shortcuts({ pending }: { pending: number }) {
  const items: Shortcut[] = [
    { href: '#risk-map', label: 'Risk map', icon: MapIcon },
    { href: '#briefing', label: 'Briefing', icon: ClipboardCheck, badge: pending },
    { href: '#forecast', label: 'Forecast', icon: CloudSun },
    { href: '#ask', label: 'Ask Shade', icon: MessageCircleQuestion },
  ];
  return (
    <Card title="Go to" sub="Other sections on this page">
      <div className="grid flex-1 grid-cols-2 gap-2">
        {items.map(({ href, label, icon: I, badge }) => {
          const hot = Boolean(badge);
          return (
            <a
              key={href}
              href={href}
              aria-label={badge ? `${label}, ${badge} to decide` : label}
              className={cx(
                'relative flex min-h-[84px] flex-col items-center justify-center gap-2 rounded-md text-[12.5px] font-medium transition-colors duration-150 ease-out',
                hot ? 'bg-ink text-paper hover:bg-accent-2' : 'bg-sunk text-ink hover:bg-line',
              )}
            >
              <I aria-hidden="true" strokeWidth={1.75} className={cx('size-[22px]', hot ? 'text-lime' : 'text-ink-2')} />
              {label}
              {badge ? <span className="absolute top-2 right-2 grid h-5 min-w-5 place-items-center rounded-[5px] bg-lime px-1.5 text-[10.5px] font-semibold text-lime-ink tabular-nums">{badge}</span> : null}
            </a>
          );
        })}
      </div>
    </Card>
  );
}
