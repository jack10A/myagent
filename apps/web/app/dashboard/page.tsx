import { AppShell } from "@/components/app-shell";
import { DashboardCommandCenter } from "@/components/dashboard-command-center";
import { PageHeader } from "@/components/page-header";

export default function DashboardPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Dashboard"
        title="Your MyAgent command center."
        description="Start from profile context, then connect career sources, check nearby Guardian alerts, and approve smart actions."
      />
      <DashboardCommandCenter />
    </AppShell>
  );
}
