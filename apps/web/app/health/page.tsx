import { AppShell } from "@/components/app-shell";
import { HealthTracker } from "@/components/health-tracker";
import { PageHeader } from "@/components/page-header";

export default function HealthPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Health Agent"
        title="Track wellbeing without guessing."
        description="Log sleep, mood, energy, symptoms, hydration, movement, and reminders. MyAgent watches trends and flags urgent signals."
      />
      <HealthTracker />
    </AppShell>
  );
}
