import { AppShell } from "@/components/app-shell";
import { MemoryVault } from "@/components/memory-vault";
import { PageHeader } from "@/components/page-header";

export default function MemoryPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Memory"
        title="Searchable long-term context."
        description="Memory stores goals, preferences, entities, events, and past decisions so recommendations stay personal."
      />
      <MemoryVault />
    </AppShell>
  );
}
