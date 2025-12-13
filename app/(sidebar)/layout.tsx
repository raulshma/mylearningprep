import { Sidebar, getSidebarData } from '@/components/dashboard/sidebar';
import { SharedHeaderProvider } from '@/components/dashboard/shared-header-context';
import { SidebarPageWrapper } from '@/components/dashboard/sidebar-page-wrapper';
import { ResponsiveSidebarLayout } from '@/components/dashboard/responsive-sidebar-layout';

export const dynamic = 'force-dynamic';

export default async function SidebarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sidebarData = await getSidebarData();

  return (
    <SharedHeaderProvider>
      <ResponsiveSidebarLayout
        sidebarData={sidebarData}
        desktopSidebar={<Sidebar />}
      >
        <SidebarPageWrapper>{children}</SidebarPageWrapper>
      </ResponsiveSidebarLayout>
    </SharedHeaderProvider>
  );
}
