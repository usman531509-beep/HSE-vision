'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createRecognition, readResults, splitWords, type Recognition } from './recognition';

/** 'mic' hears the person; 'demo' speaks a scripted question where the browser has no speech-to-text or the mic is refused. */
export type VoiceMode = 'starting' | 'mic' | 'demo';

export interface Voice {
  mode: VoiceMode;
  elapsed: number;
  /** Ends the recording and hands back what was heard. */
  finish: () => string;
  /** 0–1, read every frame by the canvas, so it lives outside React state. */
  level: () => number;
}

/** Recording stops by itself here, s: a question to Shade is one sentence. */
export const MAX_S = 30;
/** Demo pacing, ms: a calm speaking rate. */
const DEMO = { lead: 700, gap: 380 } as const;
/** RMS to 0–1; speech sits around 0.02–0.15 RMS. Rises fast, falls slow, like a VU meter. */
const GAIN = 7;
const ATTACK = 0.35;
const RELEASE = 0.08;

export function useVoice({ script, onWord }: { script: string; onWord: (word: string) => void }): Voice {
  const [mode, setMode] = useState<VoiceMode>('starting');
  const [elapsed, setElapsed] = useState(0);
  const word = useRef(onWord);
  // Both are read when needed, so a new script or callback never restarts a recording in progress.
  const scriptRef = useRef(script);
  const level = useRef(0);
  const text = useRef('');
  // Bumped on every start and stop, so a mic prompt that resolves late (or twice, under Strict Mode) is ignored.
  const run = useRef(0);
  const cleanup = useRef<(() => void)[]>([]);

  useEffect(() => { word.current = onWord; scriptRef.current = script; }, [onWord, script]);

  const stopAll = useCallback((): void => {
    cleanup.current.splice(0).forEach((fn) => fn());
  }, []);

  const loop = useCallback((frame: (now: number) => void): void => {
    let raf = 0;
    const tick = (now: number): void => { frame(now); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    cleanup.current.push(() => cancelAnimationFrame(raf));
  }, []);

  const startDemo = useCallback((): void => {
    stopAll();
    setMode('demo');
    text.current = '';
    let last = performance.now();
    splitWords(scriptRef.current).forEach((w, i) => {
      const t = window.setTimeout(() => {
        text.current = text.current ? `${text.current} ${w}` : w;
        last = performance.now();
        word.current(w);
      }, DEMO.lead + i * DEMO.gap);
      cleanup.current.push(() => window.clearTimeout(t));
    });
    // A burst on each word that decays, over a soft breath: reads as speech without a mic.
    loop((now) => { level.current = 0.18 + 0.6 * Math.exp(-(now - last) / 260) + 0.05 * Math.sin(now / 180); });
  }, [stopAll, loop]);

  /** Chromium ends a session after a pause; keep listening and carry the text across sessions. */
  const listen = useCallback((rec: Recognition): void => {
    let committed = '';
    let emitted = 0;
    let live = true;
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';
    rec.onresult = (e) => {
      const { text: now, settled } = readResults(e);
      const words = splitWords(now);
      for (let i = emitted; i < settled; i++) word.current(words[i]);
      emitted = Math.max(emitted, settled);
      text.current = [committed, now].filter(Boolean).join(' ');
    };
    rec.onerror = (e) => {
      if (e.error === 'aborted' || e.error === 'no-speech') return;
      console.warn('Shade voice: speech-to-text failed', e.error);
      // Nothing heard yet and the service failed (offline, blocked): the demo keeps the preview working.
      if (!text.current) { live = false; startDemo(); }
    };
    rec.onend = () => {
      if (!live) return;
      committed = text.current;
      emitted = 0;
      rec.start();
    };
    rec.start();
    cleanup.current.push(() => { live = false; rec.abort(); });
  }, [startDemo]);

  const startMic = useCallback(async (id: number): Promise<void> => {
    const rec = createRecognition();
    if (!rec || !navigator.mediaDevices?.getUserMedia) { startDemo(); return; }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      console.warn('Shade voice: microphone unavailable, using the demo voice', err);
      if (run.current === id) startDemo();
      return;
    }
    // Closed while the permission prompt was open.
    if (run.current !== id) { stream.getTracks().forEach((t) => t.stop()); return; }
    const audio = new AudioContext();
    const analyser = audio.createAnalyser();
    analyser.fftSize = 1024;
    audio.createMediaStreamSource(stream).connect(analyser);
    const buf = new Float32Array(analyser.fftSize);
    loop(() => {
      analyser.getFloatTimeDomainData(buf);
      const target = Math.min(1, Math.sqrt(buf.reduce((s, v) => s + v * v, 0) / buf.length) * GAIN);
      level.current += (target - level.current) * (target > level.current ? ATTACK : RELEASE);
    });
    cleanup.current.push(() => { stream.getTracks().forEach((t) => t.stop()); void audio.close(); });
    listen(rec);
    setMode('mic');
  }, [startDemo, loop, listen]);

  useEffect(() => {
    const id = ++run.current;
    void startMic(id);
    const started = performance.now();
    const t = window.setInterval(() => setElapsed(Math.floor((performance.now() - started) / 1000)), 250);
    return () => { run.current++; window.clearInterval(t); stopAll(); };
  }, [startMic, stopAll]);

  const finish = useCallback((): string => { stopAll(); return text.current.trim(); }, [stopAll]);
  const read = useCallback((): number => level.current, []);

  return { mode, elapsed, finish, level: read };
}
