/* Drawing on top of a camera frame, in video pixels. Shared by the player and the zone editor. */
import type { ReactNode } from 'react';
import { BOX_COLOR, DRAFT_COLOR } from '@/lib/camera/labels';
import { FRAME } from '@/lib/camera/geometry';
import type { BoxView } from '@/lib/camera/status';
import type { Point, Zone } from '@/lib/camera/types';

const LABEL_H = 30;
const pts = (p: Point[]) => p.map((q) => `${q.x},${q.y}`).join(' ');
/** Rough text width for the label chip at the overlay's font size. */
const textW = (s: string) => s.length * 11.2 + 16;

function Tag({ x, y, text, fill, ink = '#111' }: { x: number; y: number; text: string; fill: string; ink?: string }) {
  const w = textW(text);
  const left = Math.min(Math.max(0, x), FRAME.w - w);
  const top = Math.min(Math.max(0, y), FRAME.h - LABEL_H);
  return (
    <g>
      <rect x={left} y={top} width={w} height={LABEL_H} rx={5} fill={fill} />
      <text x={left + 8} y={top + 21} fontSize={20} fontWeight={600} fill={ink}>{text}</text>
    </g>
  );
}

export function ZoneShape({ zone, label = true, highlight = false }: { zone: Zone; label?: boolean; highlight?: boolean }) {
  const top = zone.points.reduce((a, b) => (b.y < a.y ? b : a));
  return (
    <g>
      <polygon points={pts(zone.points)} fill="rgb(255 106 90 / 0.18)" stroke={BOX_COLOR.act} strokeWidth={highlight ? 5 : 3} strokeDasharray="14 9" />
      {label ? <Tag x={top.x - 40} y={top.y + 8} text={zone.name} fill={BOX_COLOR.act} /> : null}
    </g>
  );
}

export function DraftShape({ points }: { points: Point[] }) {
  return (
    <g>
      {points.length > 1 ? <polyline points={pts(points.length > 2 ? [...points, points[0]] : points)} fill="rgb(228 244 122 / 0.18)" stroke={DRAFT_COLOR} strokeWidth={3} strokeDasharray="10 7" /> : null}
      {points.map((p, i) => <rect key={i} x={p.x - 8} y={p.y - 8} width={16} height={16} fill={DRAFT_COLOR} stroke="#141414" strokeWidth={2} />)}
    </g>
  );
}

export function Boxes({ boxes, ids, focus }: { boxes: BoxView[]; ids: boolean; focus?: number }) {
  return (
    <g>
      {boxes.map((b) => {
        const color = BOX_COLOR[b.tone];
        const dim = focus !== undefined && focus !== b.id;
        return (
          <g key={b.id} opacity={dim ? 0.4 : 1}>
            <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={4} fill="none" stroke={color} strokeWidth={focus === b.id ? 6 : 4} />
            {ids ? <Tag x={b.x - 2} y={b.y - LABEL_H - 2 < 0 ? b.y + 4 : b.y - LABEL_H - 2} text={`person-${b.id} · ${b.status}`} fill={color} /> : null}
          </g>
        );
      })}
    </g>
  );
}

/** An SVG layer sized to the frame; children draw in video pixels. */
export function FrameLayer({ children, label, className }: { children: ReactNode; label?: string; className?: string }) {
  return (
    <svg viewBox={`0 0 ${FRAME.w} ${FRAME.h}`} className={className ?? 'pointer-events-none absolute inset-0 size-full'} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      {children}
    </svg>
  );
}
