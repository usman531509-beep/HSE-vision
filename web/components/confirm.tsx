'use client';

/* The app's one confirmation dialog, mounted once at the root. Screens call `await confirm({...})`.
   A native <dialog> opened with showModal() traps focus and closes on Escape; clicking outside also closes it. */
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { btn } from './ui';

export interface ConfirmOptions {
  title: string;
  body: ReactNode;
  confirmLabel?: string;
  /** Red confirm button, for actions that delete something. */
  danger?: boolean;
  /** Only an OK button: explains why an action cannot happen yet. */
  notice?: boolean;
}

type Ask = (o: ConfirmOptions) => Promise<boolean>;
const Ctx = createContext<Ask | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [req, setReq] = useState<(ConfirmOptions & { resolve: (ok: boolean) => void }) | null>(null);
  const ref = useRef<HTMLDialogElement>(null);

  const ask = useCallback<Ask>((o) => new Promise((resolve) => setReq({ ...o, resolve })), []);
  const close = useCallback((ok: boolean) => {
    req?.resolve(ok);
    ref.current?.close();
    setReq(null);
  }, [req]);

  useEffect(() => {
    const d = ref.current;
    if (req && d && !d.open) d.showModal();
  }, [req]);

  return (
    <Ctx.Provider value={ask}>
      {children}
      <dialog
        ref={ref}
        aria-labelledby="confirm-title"
        aria-describedby="confirm-body"
        onCancel={(e) => { e.preventDefault(); close(false); }}
        // The dialog box fills the element, so a click on the element itself is a click on the backdrop.
        onClick={(e) => { if (e.target === e.currentTarget) close(false); }}
        className="m-auto w-[min(440px,calc(100vw-2rem))] rounded-lg bg-paper p-0 text-ink shadow-[0_24px_60px_-20px_rgb(0_0_0/0.45)] backdrop:bg-ink/40"
      >
        {req ? (
          <div className="flex flex-col gap-3 p-5">
            <h2 id="confirm-title" className="text-[16px] font-medium tracking-[-0.01em]">{req.title}</h2>
            <div id="confirm-body" className="text-[13.5px] leading-[1.5] text-ink-2">{req.body}</div>
            <div className="mt-2 flex justify-end gap-2">
              {req.notice ? (
                <button type="button" autoFocus className={btn('dark', 'sm')} onClick={() => close(false)}>OK</button>
              ) : (
                <>
                  {/* Cancel takes focus, so Enter never deletes by accident. */}
                  <button type="button" autoFocus className={btn('light', 'sm')} onClick={() => close(false)}>Cancel</button>
                  <button type="button" className={btn(req.danger ? 'danger' : 'dark', 'sm')} onClick={() => close(true)}>{req.confirmLabel ?? 'Confirm'}</button>
                </>
              )}
            </div>
          </div>
        ) : null}
      </dialog>
    </Ctx.Provider>
  );
}

export function useConfirm(): Ask {
  const v = useContext(Ctx);
  if (!v) throw new Error('useConfirm must be used inside <ConfirmProvider>');
  return v;
}
