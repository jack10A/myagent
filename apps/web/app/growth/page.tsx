import { AppShell } from "@/components/app-shell";
import { CvAnalyzer } from "@/components/cv-analyzer";
import { GrowthOverview } from "@/components/growth-overview";
import { JobSearchAgent } from "@/components/job-search-agent";
import { PageHeader } from "@/components/page-header";

export default function GrowthPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Growth Agent"
        title="MyAgent learns your study path, job, and field."
        description="It recommends latest studies to follow, jobs to target, and concrete skills to improve."
      />

      <CvAnalyzer />

      <JobSearchAgent />

      <GrowthOverview />
    </AppShell>
  );
}
