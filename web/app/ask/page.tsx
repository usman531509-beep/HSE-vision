import type { Metadata } from 'next';
import { AskView } from '@/components/views/ask';

export const metadata: Metadata = { title: 'Ask IonHSE' };

export default function Page() {
  return <AskView />;
}
