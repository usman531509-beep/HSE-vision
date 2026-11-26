'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowUp } from 'lucide-react';
import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { SWAP } from '../../../motion';
import { cx } from '../../../ui';
import { MicButton, VoicePanel } from './voice/panel';

/** The field grows with the question up to this height, then scrolls. px. */
const FIELD = { min: 24, max: 112 } as const;
/** Questions are short; the counter fades in near the limit so it never nags. */
const LIMIT = 240;
const COUNT_FROM = 180;
/** How long each example question stays in the empty field, ms. */
const EXAMPLE_MS = 3200;
/** Each face of the button crossfades through a blur, so Send turning into Stop reads as one control changing state. */
const face = 'absolute inset-0 grid place-items-center transition-[opacity,filter] duration-200 ease-out';

function SendButton({ busy, ready, onSend, onStop }: { busy: boolean; ready: boolean; onSend: () => void; onStop: () => void }) {
  return (
    <button
      type="button"
      aria-label={busy ? 'Stop the reply' : 'Send question'}
      disabled={!(busy || ready)}
      onClick={busy ? onStop : onSend}
      className={cx(
        'relative size-8 flex-none rounded-full transition-[background-color,color,transform] duration-150 ease-out active:scale-95',
        'focus-visible:ring-2 focus-visible:ring-ink/30 focus-visible:ring-offset-2 focus-visible:outline-none',
        // Fills in once there is something to send, so it says "ready" before it is pressed.
        busy || ready ? 'bg-ink text-paper hover:bg-accent-2' : 'bg-sunk text-soft',
      )}
    >
      <span aria-hidden="true" className={cx(face, busy ? 'opacity-0 blur-[2px]' : 'opacity-100 blur-0')}>
        <ArrowUp strokeWidth={2.25} className="size-4" />
      </span>
      <span aria-hidden="true" className={cx(face, busy ? 'opacity-100 blur-0' : 'opacity-0 blur-[2px]')}>
        <span className="size-2.5 rounded-[2px] bg-current" />
      </span>
    </button>
  );
}

/** Example questions cycling through the empty field, crossfading through a blur. */
function Examples({ items, busy }: { items: string[]; busy: boolean }) {
  const still = useReducedMotion() ?? false;
  const [i, setI] = useState(0);
  useEffect(() => {
    if (still || busy) return;
    const t = window.setInterval(() => setI((n) => (n + 1) % items.length), EXAMPLE_MS);
    return () => window.clearInterval(t);
  }, [still, busy, items.length]);
  const text = busy ? 'Replying… Esc to stop' : `Ask: ${items[i]}`;
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 truncate text-[14px] leading-6 text-soft">
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span key={text} {...SWAP} className="block truncate">{text}</motion.span>
      </AnimatePresence>
    </span>
  );
}

/**
 * Question field: Enter sends, Shift+Enter adds a line, Esc stops a reply.
 * `context` is what Shade answers from, shown as pills so the source is never a mystery.
 */
export function Composer({ busy, onSend, onStop, examples, context }: {
  busy: boolean; onSend: (q: string) => void; onStop: () => void; examples: string[]; context: ReactNode;
}) {
  const [value, setValue] = useState('');
  const [voice, setVoice] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  const hint = useId();

  // Grow with the text: shrink to the minimum first so scrollHeight reports the real content height.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = `${FIELD.min}px`;
    el.style.height = `${Math.min(Math.max(el.scrollHeight, FIELD.min), FIELD.max)}px`;
  }, [value]);

  function send(): void {
    if (!value.trim() || busy) return;
    onSend(value);
    setValue('');
  }
  function onKey(e: KeyboardEvent<HTMLTextAreaElement>): void {
    if (e.key === 'Escape' && busy) { e.preventDefault(); onStop(); return; }
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); }
  }

  function heard(text: string): void {
    setVoice(false);
    if (text) onSend(text.slice(0, LIMIT));
    // Back to typing, so a follow-up is one keystroke away.
    requestAnimationFrame(() => ref.current?.focus());
  }

  const left = LIMIT - value.length;
  return (
    <div
      className={cx(
        '@container flex cursor-text flex-col gap-2 rounded-[18px] bg-paper px-4 pt-3 pb-2.5 ring-1 ring-line',
        'shadow-[0_1px_2px_rgb(0_0_0/0.04)] transition-[box-shadow] duration-200 ease-out',
        'focus-within:shadow-[0_1px_2px_rgb(0_0_0/0.04),0_8px_24px_-12px_rgb(0_0_0/0.18)] focus-within:ring-ink/25',
      )}
      onClick={() => ref.current?.focus()}
    >
      {voice ? <VoicePanel script={examples[0] ?? ''} onDone={heard} onCancel={() => setVoice(false)} /> : (
      <>
      <div className="relative">
        {value ? null : <Examples items={examples} busy={busy} />}
        <textarea
          ref={ref}
          rows={1}
          value={value}
          maxLength={LIMIT}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKey}
          aria-label="Ask Shade about heat risk"
          aria-describedby={hint}
          className="block w-full resize-none bg-transparent text-[14px] leading-6 text-ink caret-watch outline-none"
          style={{ height: FIELD.min }}
        />
      </div>
      <div className="flex items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">{context}</div>
        <AnimatePresence initial={false}>
          {value.length >= COUNT_FROM ? (
            <motion.span key="count" {...SWAP} className={cx('text-[11.5px] tabular-nums', left < 20 ? 'text-act-ink' : 'text-soft')} aria-live="polite">
              {left}
            </motion.span>
          ) : null}
        </AnimatePresence>
        {/* Only where the toolbar has room; screen readers always get it through aria-describedby. */}
        <span id={hint} className="hidden text-[11.5px] whitespace-nowrap text-soft @lg:inline">
          <kbd className="rounded-[4px] bg-sunk px-1 py-px font-sans text-[11px] text-ink-2">↵</kbd> send · <kbd className="rounded-[4px] bg-sunk px-1 py-px font-sans text-[11px] text-ink-2">⇧ ↵</kbd> new line
        </span>
        {busy || value ? null : <MicButton onClick={() => setVoice(true)} />}
        <SendButton busy={busy} ready={Boolean(value.trim())} onSend={send} onStop={onStop} />
      </div>
      </>
      )}
    </div>
  );
}

/** A small pill naming one source Shade answers from. */
export function ContextPill({ children }: { children: ReactNode }) {
  return <span className="inline-flex h-6 flex-none items-center gap-1.5 rounded-full bg-sunk px-2.5 text-[11.5px] whitespace-nowrap text-ink-2">{children}</span>;
}
