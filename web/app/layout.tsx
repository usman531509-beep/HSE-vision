import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { ConfirmProvider } from '@/components/confirm';
import { AppShell } from '@/components/shell';
import { HseProvider } from '@/components/state';
import './globals.css';

const inter = localFont({
  src: './fonts/inter-latin.woff2',
  weight: '100 900',
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: { template: 'Visual HSE · %s', default: 'Visual HSE · Control room' },
  description: 'Visual HSE control room: zone risk, live events, permits, incidents, inspections, compliance, training and reports.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen font-sans text-ink">
        <HseProvider>
          <ConfirmProvider>
            <AppShell>{children}</AppShell>
          </ConfirmProvider>
        </HseProvider>
      </body>
    </html>
  );
}
