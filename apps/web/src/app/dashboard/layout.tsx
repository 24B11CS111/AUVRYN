import { requireInstitution } from '@/lib/auth';
import { DashboardShell } from '@/components/dashboard/DashboardShell';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessionContext = await requireInstitution();

  return (
    <DashboardShell sessionContext={sessionContext}>
      {children}
    </DashboardShell>
  );
}
