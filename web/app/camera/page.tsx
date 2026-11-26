import type { Metadata } from 'next';
import { CameraView } from '@/components/views/camera';

export const metadata: Metadata = { title: 'Camera analysis' };

export default function Page() {
  return <CameraView />;
}
