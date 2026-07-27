import { AppShell } from "@/components/app-shell";
import { ConnectorGrid } from "@/components/connector-grid";
import { PageHeader } from "@/components/page-header";

export default function ConnectorsPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Connectors"
        title="Connect work, safety, and career proof."
        description="MyAgent asks for approval before using LinkedIn, CV, GitHub, Gmail, Calendar, Drive, or alert sources."
      />
      <ConnectorGrid />
    </AppShell>
  );
}
