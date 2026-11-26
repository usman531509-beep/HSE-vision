import type { Metadata } from 'next';
import { IncidentsView } from '@/components/views/incidents';

export const metadata: Metadata = { title: 'Incidents' };

export default function Page() {
  return <IncidentsView />;
}
