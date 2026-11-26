/* Words and levels for the camera module, declared once. */
import type { Tone } from '../data';
import type { EventType, Gear, Processing, Review } from './types';

export const GEAR_LABEL: Record<Gear, string> = { helmet: 'Helmet', vest: 'Safety vest', gloves: 'Gloves', hairnet: 'Hairnet', mask: 'Face mask' };
export const GEARS = Object.keys(GEAR_LABEL) as Gear[];
/** Gear the vision service's model can see; keep in step with CLASSES in vision-service/ppe.py. */
export const MODEL_GEAR: readonly Gear[] = ['helmet', 'vest', 'gloves', 'mask'];

export const EVENT: Record<EventType, { label: string; short: string; tone: Tone }> = {
  restricted_zone_entry: { label: 'Restricted-area entry', short: 'Restricted area', tone: 'act' },
  possible_missing_ppe: { label: 'Possible missing gear', short: 'Safety gear', tone: 'watch' },
};

export const REVIEW: Record<Review, { label: string; tone: Tone }> = {
  needs_review: { label: 'Needs review', tone: 'watch' },
  confirmed: { label: 'Confirmed', tone: 'act' },
  false_alarm: { label: 'False alarm', tone: 'off' },
};

export const PROCESSING: Record<Processing, { label: string; tone: Tone }> = {
  uploaded: { label: 'Uploaded', tone: 'off' },
  processing: { label: 'Processing', tone: 'watch' },
  completed: { label: 'Completed', tone: 'low' },
  failed: { label: 'Failed', tone: 'act' },
};

/** Overlay colours on dark video, one per level (same as the Live floor view). */
export const BOX_COLOR: Record<'act' | 'watch' | 'low', string> = { act: '#ff6a5a', watch: '#f6b43e', low: '#35c877' };
export const DRAFT_COLOR = '#e4f47a';
