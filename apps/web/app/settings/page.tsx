import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { PrivacyCenter } from "@/components/privacy-center";

export default function SettingsPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Settings"
        title="Privacy and permissions."
        description="See what MyAgent can read, what it can write, what needs approval, and how to export or clear memory."
      />
      <PrivacyCenter />
    </AppShell>
  );
}
