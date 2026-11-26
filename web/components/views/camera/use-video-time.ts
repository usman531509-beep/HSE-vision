'use client';

import { useEffect, useState, type RefObject } from 'react';

/** Current time of a <video>, updated on every rendered frame while playing so overlays stay locked to the picture. */
export function useVideoTime(ref: RefObject<HTMLVideoElement | null>, src: string): { t: number; playing: boolean } {
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    let handle = 0;
    let live = true;
    const tick = (): void => {
      if (!live) return;
      setT(v.currentTime);
      handle = 'requestVideoFrameCallback' in v ? v.requestVideoFrameCallback(tick) : requestAnimationFrame(tick);
    };
    const stop = (): void => {
      if ('cancelVideoFrameCallback' in v) v.cancelVideoFrameCallback(handle); else cancelAnimationFrame(handle);
    };
    const onPlay = (): void => { setPlaying(true); stop(); tick(); };
    const onPause = (): void => { setPlaying(false); stop(); setT(v.currentTime); };
    const onSeek = (): void => setT(v.currentTime);
    setT(v.currentTime);
    setPlaying(!v.paused);
    v.addEventListener('play', onPlay);
    v.addEventListener('pause', onPause);
    v.addEventListener('ended', onPause);
    v.addEventListener('seeked', onSeek);
    v.addEventListener('loadedmetadata', onSeek);
    return () => {
      live = false;
      stop();
      v.removeEventListener('play', onPlay);
      v.removeEventListener('pause', onPause);
      v.removeEventListener('ended', onPause);
      v.removeEventListener('seeked', onSeek);
      v.removeEventListener('loadedmetadata', onSeek);
    };
  }, [ref, src]);

  return { t, playing };
}
