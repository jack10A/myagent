import { AppShell } from "@/components/app-shell";
import { ApplicationTrackerBoard } from "@/components/application-tracker-board";
import { ApprovalQueue } from "@/components/approval-queue";
import { CalendarTaskList } from "@/components/calendar-task-list";
import { CaptureTaskList } from "@/components/capture-task-list";
import { JobTaskList } from "@/components/job-task-list";
import { LearningTaskList } from "@/components/learning-task-list";
import { PageHeader } from "@/components/page-header";
import { TaskCommandCenter } from "@/components/task-command-center";

export default function TasksPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Tasks"
        title="Actions and learning plans."
        description="MyAgent turns recommendations into tracked work, while Guardian keeps risky actions approval-first."
      />
      <div className="space-y-6">
        <TaskCommandCenter />
        <ApplicationTrackerBoard />
        <div id="calendar-tasks" className="scroll-mt-20">
          <CalendarTaskList />
        </div>
        <div id="capture-tasks" className="scroll-mt-20">
          <CaptureTaskList />
        </div>
        <div id="learning-tasks" className="scroll-mt-20">
          <LearningTaskList />
        </div>
        <div id="job-tasks" className="scroll-mt-20">
          <JobTaskList />
        </div>
        <ApprovalQueue />
      </div>
    </AppShell>
  );
}
