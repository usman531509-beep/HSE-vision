import { Sun } from 'lucide-react';
import { cx } from '../../../ui';

const SIZE = { sm: ['size-7 rounded-[8px]', 'size-4'], md: ['size-10 rounded-[10px]', 'size-5'] } as const;

/** Shade's mark: a sun on the dark tile, in the same dark-and-lime pair as the logo. */
export function AgentAvatar({ size = 'md' }: { size?: keyof typeof SIZE }) {
  const [tile, icon] = SIZE[size];
  return (
    <span aria-hidden="true" className={cx('grid flex-none place-items-center bg-ink text-lime', tile)}>
      <Sun strokeWidth={2} className={icon} />
    </span>
  );
}
