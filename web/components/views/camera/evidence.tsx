/* Evidence frame for an event: the nearest still from the video's contact sheet, with the person's box on it. */
import { BOX_COLOR, EVENT } from '@/lib/camera/labels';
import { boxOf, FRAME } from '@/lib/camera/geometry';
import { SPRITE } from '@/lib/camera/constants';
import type { CameraEvent, Video } from '@/lib/camera/types';

export function Evidence({ event, video, className }: { event: CameraEvent; video: Video; className?: string }) {
  if (!video.sprite || !video.tracks) return null;
  const n = Math.round(event.t / SPRITE.step);
  const col = n % SPRITE.cols;
  const row = Math.floor(n / SPRITE.cols);
  const rows = Math.ceil(Math.ceil(video.durationS / SPRITE.step) / SPRITE.cols);
  const box = boxOf(video.tracks, event.trackId, event.t);
  const tone = event.review === 'false_alarm' ? 'low' : EVENT[event.type].tone === 'act' ? 'act' : 'watch';
  return (
    <div
      className={className ?? 'relative aspect-video w-full overflow-hidden rounded-[10px] bg-cam'}
      role="img"
      aria-label={`Evidence frame ${event.frame}: ${event.description}`}
      style={{
        backgroundImage: `url(${video.sprite})`,
        backgroundSize: `${SPRITE.cols * 100}% ${rows * 100}%`,
        backgroundPosition: `${SPRITE.cols > 1 ? (col / (SPRITE.cols - 1)) * 100 : 0}% ${rows > 1 ? (row / (rows - 1)) * 100 : 0}%`,
      }}
    >
      {box ? (
        <svg viewBox={`0 0 ${FRAME.w} ${FRAME.h}`} className="absolute inset-0 size-full" aria-hidden="true">
          <rect x={box[1]} y={box[2]} width={box[3]} height={box[4]} rx={6} fill="none" stroke={BOX_COLOR[tone]} strokeWidth={10} />
        </svg>
      ) : null}
    </div>
  );
}
