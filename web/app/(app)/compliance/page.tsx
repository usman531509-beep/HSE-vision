import type { Metadata } from 'next';
import { ComplianceView } from '@/components/views/compliance';

export const metadata: Metadata = { title: 'Compliance' };

export default function Page() {
  return <ComplianceView />;
}
