/** Visual HSE mark: a hard hat over a watching eye-dot. Helmet uses currentColor, the dot the lime accent. */
export function LogoMark({ className, dot = '#e4f47a' }: { className?: string; dot?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      {/* helmet shell with a ridge slot */}
      <path d="M6.2 15.2a9.8 9.8 0 0 1 19.6 0z" fill="currentColor" />
      <rect x="14.7" y="5.2" width="2.6" height="5.6" rx="1.3" fill="var(--logo-cut, #141414)" />
      {/* brim */}
      <rect x="3" y="15.2" width="26" height="2.6" rx="1.3" fill="currentColor" />
      {/* face line */}
      <path d="M9.2 19.6a7.4 7.4 0 0 0 13.6 0" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      {/* the eye */}
      <circle cx="16" cy="21.6" r="2.5" fill={dot} />
    </svg>
  );
}

/** Tile + wordmark, as used in the sidebar and the mobile top bar. `compact` keeps only the tile (collapsed sidebar). */
export function Logo({ compact }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className="grid size-9 place-items-center rounded-[9px] bg-ink text-paper [--logo-cut:#141414]">
        <LogoMark className="size-[26px]" />
      </span>
      <span className={compact ? 'sr-only' : 'text-[17px] leading-none tracking-[-0.02em] text-ink'}>
        <b className="font-bold">Visual</b> <span className="font-normal">HSE</span>
      </span>
    </span>
  );
}
