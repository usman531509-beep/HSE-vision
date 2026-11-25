import type { Metadata } from 'next';
import { SpatialView } from '@/components/views/spatial';

export const metadata: Metadata = { title: 'Spatial view' };

export default function Page() {
  return <SpatialView />;
}
