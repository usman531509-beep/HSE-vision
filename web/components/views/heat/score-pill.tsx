import { TINT } from '../../figures';
import { cx, lvl, TEXT } from '../../ui';

/** A risk score as a tinted tile with a short caption: the one visual unit the heat page uses for "how risky, when". */
export function ScorePill({ score, caption, muted }: { score: number; caption: string; muted?: boolean }) {
  const l = lvl(score);
  return (
    <span className={cx('inline-flex min-w-[92px] flex-col rounded-md px-2.5 py-1.5', muted ? 'bg-sunk' : TINT[l])}>
      <b className={cx('text-[18px] leading-none font-medium tabular-nums', !muted && TEXT[l])}>{score}</b>
      <span className="mt-1 text-[11.5px] whitespace-nowrap text-ink-2">{caption}</span>
    </span>
  );
}
