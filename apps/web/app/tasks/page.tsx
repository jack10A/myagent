import { AppShell } from "@/components/app-shell";
import { ApplicationTrackerBoard } from "@/components/application-tracker-board";
import { ApprovalQueue } from "@/components/approval-queue";
import { CalendarTaskList } from "@/components/calendar-task-list";
import { CaptureTaskList } from "@/components/capture-task-list";
import { JobTaskList } from "@/components/job-task-list";
import { LearningTaskList } from "@/components/learning-task-list";
import { PageHeader } from "@/components/page-header";

export default function TasksPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Tasks"
        title="Actions and learning plans."
        description="MyAgent turns recommendations into tracked work, while Guardian keeps risky actions approval-first."
      />
      <div className="space-y-6">
        <ApplicationTrackerBoard />
        <CalendarTaskList />
        <CaptureTaskList />
        <LearningTaskList />
        <JobTaskList />
        <ApprovalQueue />
      </div>
    </AppShell>
  );
}
