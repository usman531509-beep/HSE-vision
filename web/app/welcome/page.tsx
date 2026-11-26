import type { Metadata } from 'next';
import { Instrument_Serif } from 'next/font/google';
import { Landing } from '@/components/landing/landing';
import './landing.css';

const serif = Instrument_Serif({ weight: '400', subsets: ['latin'], display: 'swap', variable: '--font-serif' });

export const metadata: Metadata = {
  title: 'See the risk before it becomes an incident',
  description:
    'Visual HSE watches the factory floor through cameras and sensors, checks permits, lockout and the roster before it raises an alert, and leaves every report for a person to approve.',
};

export default function Page() {
  return (
    <div className={serif.variable}>
      <Landing />
    </div>
  );
}
