import { AppShell } from "@/components/app-shell";
import { NotificationCenter } from "@/components/notification-center";
import { PageHeader } from "@/components/page-header";

export default function NotificationsPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Alerts"
        title="Guardian only interrupts when it matters."
        description="Nearby accidents, severe weather, meeting disruption, and high-priority work events appear here."
      />
      <NotificationCenter />
    </AppShell>
  );
}
