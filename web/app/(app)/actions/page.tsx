import type { Metadata } from 'next';
import { ActionsView } from '@/components/views/actions';

export const metadata: Metadata = { title: 'Follow-up actions' };

export default function Page() {
  return <ActionsView />;
}
