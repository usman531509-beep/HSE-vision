import type { Metadata } from 'next';
import { CameraSetupView } from '@/components/views/camera/setup';

export const metadata: Metadata = { title: 'Camera setup' };

export default function Page() {
  return <CameraSetupView />;
}
