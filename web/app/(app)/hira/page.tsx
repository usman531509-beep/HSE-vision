import type { Metadata } from 'next';
import { HiraView } from '@/components/views/hira';

export const metadata: Metadata = { title: 'Hazard ID & risk assessment' };

export default function Page() {
  return <HiraView />;
}
