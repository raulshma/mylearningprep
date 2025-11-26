import { Sidebar } from '@/components/dashboard/sidebar';
import { SharedHeaderProvider } from '@/components/dashboard/shared-header-context';
import { SidebarPageWrapper } from '@/components/dashboard/sidebar-page-wrapper';

export default function SidebarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SharedHeaderProvider>
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <SidebarPageWrapper>{children}</SidebarPageWrapper>
      </div>
    </SharedHeaderProvider>
  );
}
