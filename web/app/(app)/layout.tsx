import { ConfirmProvider } from '@/components/confirm';
import { AppShell } from '@/components/shell';
import { HseProvider } from '@/components/state';

/** The product: every screen shares the sidebar shell and session state. The landing page (/welcome) sits outside it. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <HseProvider>
      <ConfirmProvider>
        <AppShell>{children}</AppShell>
      </ConfirmProvider>
    </HseProvider>
  );
}
