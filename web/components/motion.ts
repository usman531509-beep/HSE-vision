/* Motion presets for the `motion` library. Values match the CSS tokens, so animated and CSS transitions feel the same. */

/** Same curve as --ease-out in globals.css (motion needs it as numbers). */
export const EASE_OUT = [0.16, 1, 0.3, 1] as const;

/** Things arrive softly from a 2 px blur and a 4 px drop, and leave faster than they came. */
export const ENTER = {
  initial: { opacity: 0, y: 4, filter: 'blur(2px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  exit: { opacity: 0, filter: 'blur(2px)', transition: { duration: 0.12, ease: EASE_OUT } },
  transition: { duration: 0.2, ease: EASE_OUT },
} as const;

/** Text that swaps in place (a status label) crossfades through a blur, with no movement. */
export const SWAP = {
  initial: { opacity: 0, filter: 'blur(2px)' },
  animate: { opacity: 1, filter: 'blur(0px)' },
  exit: { opacity: 0, filter: 'blur(2px)' },
  transition: { duration: 0.15, ease: EASE_OUT },
} as const;

/** Delay between list rows entering one after another, seconds. */
export const STAGGER = 0.05;
