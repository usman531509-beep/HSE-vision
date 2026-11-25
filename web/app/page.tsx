import type { Metadata } from 'next';
import { ControlView } from '@/components/views/control';

export const metadata: Metadata = { title: 'Control room' };

export default function Page() {
  return <ControlView />;
}
