import { AppShell } from "@/components/app-shell";
import { ActivityTrace } from "@/components/activity-trace";
import { PageHeader } from "@/components/page-header";

export default function ActivityPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Agent Activity"
        title="Your agent's real timeline."
        description="Every command, collaboration chain, Guardian review, and approval state in one place."
      />
      <ActivityTrace />
    </AppShell>
  );
}
