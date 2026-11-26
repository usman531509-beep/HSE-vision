import type { Metadata } from 'next';
import { InspectionsView } from '@/components/views/inspections';

export const metadata: Metadata = { title: 'Inspections' };

export default function Page() {
  return <InspectionsView />;
}
