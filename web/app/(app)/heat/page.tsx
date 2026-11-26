import type { Metadata } from 'next';
import { HeatView } from '@/components/views/heat';

export const metadata: Metadata = { title: 'Heat risk' };

export default function Page() {
  return <HeatView />;
}
