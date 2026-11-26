import type { Metadata } from 'next';
import { CamerasView } from '@/components/views/cameras';

export const metadata: Metadata = { title: 'Cameras' };

export default function Page() {
  return <CamerasView />;
}
