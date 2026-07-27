import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";

export default function SettingsPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Settings"
        title="Privacy and safety controls."
        description="Guardian nearby monitoring starts with city-level alerts. Live location can be added later as explicit opt-in."
      />
      <div className="grid gap-4 md:grid-cols-2">
        <article className="rounded-md border border-line bg-white p-5 shadow-soft">
          <h2 className="font-semibold">Guardian</h2>
          <p className="mt-2 text-sm text-ink/65">Enabled. External actions require approval.</p>
        </article>
        <article className="rounded-md border border-line bg-white p-5 shadow-soft">
          <h2 className="font-semibold">Location Mode</h2>
          <p className="mt-2 text-sm text-ink/65">City only. Live location is not enabled in the MVP.</p>
        </article>
      </div>
    </AppShell>
  );
}

