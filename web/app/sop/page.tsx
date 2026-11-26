import type { Metadata } from 'next';
import { SopView } from '@/components/views/sop';

export const metadata: Metadata = { title: 'SOP & document control' };

export default function Page() {
  return <SopView />;
}
