import type { Metadata } from 'next';
import { VoiceView } from '@/components/views/voice';

export const metadata: Metadata = { title: 'Voice reporting' };

export default function Page() {
  return <VoiceView />;
}
