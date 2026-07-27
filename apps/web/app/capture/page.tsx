import { AppShell } from "@/components/app-shell";
import { CaptureWorkbench } from "@/components/capture-workbench";
import { PageHeader } from "@/components/page-header";

export default function CapturePage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Capture Agent"
        title="Turn meetings and videos into memory."
        description="Record or paste meeting notes, ask questions about YouTube transcripts, extract important parts, and create approval-ready follow-ups."
      />
      <CaptureWorkbench />
    </AppShell>
  );
}
