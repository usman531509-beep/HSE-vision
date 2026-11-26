import type { Metadata } from 'next';
import { GuideView } from '@/components/views/guide';

export const metadata: Metadata = { title: 'User guide' };

export default function Page() {
  return <GuideView />;
}
