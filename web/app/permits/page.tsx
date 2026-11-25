import type { Metadata } from 'next';
import { PermitsView } from '@/components/views/permits';

export const metadata: Metadata = { title: 'Permits & lockout' };

export default function Page() {
  return <PermitsView />;
}
