'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { voiceDraft, voiceKpis, voiceLog, voiceTranscript } from '@/lib/data';
import { btn, Card, Chip, cx, eyebrow, Foot, Icon, Kpis, link, list, meta, PageHead, Panel, row, rowMain, SEV, Table } from '../ui';

type Phase = 'idle' | 'recording' | 'done';

export function VoiceView() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [lang, setLang] = useState<'Urdu' | 'English'>('Urdu');
  const [lines, setLines] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  // While recording, reveal the transcript one line at a time, then settle on "done".
  useEffect(() => {
    if (phase !== 'recording') return;
    timer.current = setInterval(() => {
      setLines((n) => {
        if (n >= voiceTranscript.length) {
          setPhase('done');
          return n;
        }
        return n + 1;
      });
    }, 850);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [phase]);

  const start = () => { setLines(0); setPhase('recording'); };
  const stop = () => { setPhase(lines > 0 ? 'done' : 'idle'); };
  const reset = () => { setPhase('idle'); setLines(0); };
  const recording = phase === 'recording';
  const hasDraft = phase === 'done';

  return (
    <>
      <PageHead
        title="Voice reporting"
        desc="Speak a hazard or near-miss in Urdu or English. The copilot transcribes it, pulls out the details, and drafts a report for a person to approve."
        tools={<span className={meta}>Hands-free · works on a radio or a phone</span>}
      />
      <Panel>
        <Kpis items={voiceKpis} />

        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-4 max-nav:grid-cols-1">
          {/* Record + live transcript */}
          <Card
            tour="record"
            title="Record a report"
            sub="Press to talk. Release when you are done."
            extra={
              <div className={cx('inline-flex gap-0.5 rounded-[8px] bg-paper p-1 ring-1 ring-line', recording && 'pointer-events-none opacity-50')} role="group" aria-label="Language">
                {(['Urdu', 'English'] as const).map((l) => (
                  <button key={l} type="button" aria-pressed={lang === l} onClick={() => setLang(l)}
                    className="h-8 rounded-[7px] px-3 text-[12.5px] font-medium text-ink-2 hover:bg-sunk aria-pressed:bg-ink aria-pressed:text-paper">
                    {l}
                  </button>
                ))}
              </div>
            }
          >
            <div className="flex flex-col items-center gap-5 py-3">
              <button
                type="button"
                onClick={recording ? stop : start}
                aria-pressed={recording}
                className={cx(
                  'relative grid size-[108px] place-items-center rounded-full ring-1 transition-colors duration-200',
                  recording ? 'bg-act text-paper ring-act' : 'bg-accent text-paper ring-accent hover:bg-accent-2',
                )}
              >
                {recording && <span className="absolute inset-0 animate-ping rounded-full bg-act/40 motion-reduce:hidden" aria-hidden="true" />}
                <Icon name="mic" className="relative size-10" stroke={1.6} />
              </button>

              {/* Waveform: calm bars idle, lively while recording */}
              <div className="flex h-9 items-center gap-1" aria-hidden="true">
                {Array.from({ length: 23 }, (_, i) => (
                  <span
                    key={i}
                    className={cx('w-[3px] rounded-full', recording ? 'bg-accent motion-reduce:animate-none animate-pulse' : 'bg-track')}
                    style={{
                      height: recording ? `${8 + Math.round(26 * Math.abs(Math.sin(i * 1.3)))}px` : '8px',
                      animationDelay: `${(i % 7) * 90}ms`,
                    }}
                  />
                ))}
              </div>

              <div className="text-center text-[13px]">
                {recording ? <span className="font-medium text-act-ink">Listening… {lang}</span>
                  : hasDraft ? <span className="font-medium text-low">Transcribed · ready for review</span>
                  : <span className={meta}>Tap the mic to start a report</span>}
              </div>
            </div>

            <div className="rounded-md bg-sunk p-4">
              <div className={cx(eyebrow, 'mb-2 flex items-center gap-1.5')}><Icon name="activity" className="size-4" />Live transcript</div>
              {lines === 0 ? (
                <p className={cx(meta, 'py-2')}>Your words appear here as you speak.</p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {voiceTranscript.slice(0, lines).map((t, i) => (
                    <p key={i} className="text-[13.5px] leading-snug text-ink-2">{t}</p>
                  ))}
                  {recording && <span className="inline-block h-4 w-[2px] animate-pulse bg-ink/60 motion-reduce:animate-none" aria-hidden="true" />}
                </div>
              )}
            </div>
          </Card>

          {/* Extracted draft */}
          <Card
            title="Extracted report"
            sub="Fields the copilot pulled from the speech."
            extra={<Chip tone={hasDraft ? 'watch' : 'off'}>{hasDraft ? 'Draft' : 'Waiting'}</Chip>}
          >
            {!hasDraft ? (
              <div className="grid min-h-[220px] place-items-center rounded-md border border-dashed border-line-2 text-center">
                <div className="px-6">
                  <Icon name="file" className="mx-auto size-6 text-soft" />
                  <p className={cx(meta, 'mt-2')}>Record a report and the details — type, location, hazard and severity — fill in here.</p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-col">
                  {voiceDraft.map((f) => (
                    <div key={f.field} className="flex items-center justify-between gap-3 border-b border-line py-2.5 last:border-b-0">
                      <span className="w-28 flex-none text-[12.5px] text-muted">{f.field}</span>
                      <span className="min-w-0 flex-1 text-[13.5px] font-medium text-ink">
                        {f.tone ? <Chip tone={f.tone}>{f.value}</Chip> : f.value}
                      </span>
                      <span className={cx('flex-none text-[11.5px] tabular-nums', f.conf >= 95 ? 'text-low' : f.conf >= 85 ? 'text-watch-ink' : 'text-muted')}>{f.conf}%</span>
                    </div>
                  ))}
                </div>
                <div className="rounded-md bg-sage p-3.5 text-[12.5px] text-ink-2">
                  AI draft from speech. A person checks it against the camera and approves before it is filed — the same sign-off as a typed report.
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3.5">
                  <button type="button" onClick={reset} className={cx(link, 'inline-flex items-center gap-1.5')}><Icon name="refresh" className="size-4" />Discard</button>
                  <div className="flex gap-2">
                    <button type="button" className={btn('light', 'sm')}><Icon name="pencil" />Edit</button>
                    <button type="button" className={btn('dark', 'sm')}><Icon name="check" />Approve &amp; file</button>
                  </div>
                </div>
              </>
            )}
          </Card>
        </div>

        <Card title="Recent voice reports" sub="Spoken this shift, newest first.">
          <Table head={['Time', 'Reporter', 'Language', 'What was said', 'Severity']}>
            {voiceLog.map((v) => (
              <tr key={v[0]} className={v[4] === 'High' ? 'warn' : undefined}>
                <td>{v[0]}</td>
                <td>{v[1]}</td>
                <td className="text-muted">{v[2]}</td>
                <td className="font-normal! text-ink-2!">{v[3]}</td>
                <td><Chip tone={SEV[v[4]]}>{v[4]}</Chip></td>
              </tr>
            ))}
          </Table>
        </Card>

        <Foot left="Sample data for the four-week pilot preview." right={<Link className={link} href="/incidents">Filed reports go to Incidents →</Link>} />
      </Panel>
    </>
  );
}
