/* Safety-gear results for the sample videos. Demo values until a PPE model is connected:
   uploads have none, so only person detection and restricted areas apply to them. */
import type { GearSighting } from './types';

/* Read off the footage: in the aisle nobody wears a helmet (caps only); on the bench, person-4 has the mask
   pulled below the nose and person-1 faces away, so the mask cannot be confirmed; at stitching all hairnets are on. */
export const SIGHTINGS: GearSighting[] = [
  { videoId: 'v-aisle', trackId: 1, gear: 'helmet', seen: false, confidence: 0.88 },
  { videoId: 'v-aisle', trackId: 2, gear: 'helmet', seen: false, confidence: 0.9 },
  { videoId: 'v-aisle', trackId: 3, gear: 'helmet', seen: false, confidence: 0.86 },
  { videoId: 'v-aisle', trackId: 1, gear: 'gloves', seen: true, confidence: 0.81 },
  { videoId: 'v-aisle', trackId: 3, gear: 'gloves', seen: true, confidence: 0.77 },
  { videoId: 'v-assembly', trackId: 1, gear: 'mask', seen: false, confidence: 0.54 },
  { videoId: 'v-assembly', trackId: 2, gear: 'mask', seen: true, confidence: 0.92 },
  { videoId: 'v-assembly', trackId: 2, gear: 'gloves', seen: true, confidence: 0.81 },
  { videoId: 'v-assembly', trackId: 3, gear: 'mask', seen: true, confidence: 0.94 },
  { videoId: 'v-assembly', trackId: 3, gear: 'gloves', seen: true, confidence: 0.9 },
  { videoId: 'v-assembly', trackId: 4, gear: 'mask', seen: false, confidence: 0.71 },
  { videoId: 'v-stitching', trackId: 1, gear: 'hairnet', seen: true, confidence: 0.84 },
  { videoId: 'v-stitching', trackId: 2, gear: 'hairnet', seen: true, confidence: 0.95 },
  { videoId: 'v-stitching', trackId: 3, gear: 'hairnet', seen: true, confidence: 0.9 },
];
