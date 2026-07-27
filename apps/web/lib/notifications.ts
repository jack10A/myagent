import { apiFetch } from "@/lib/api";

export type MyAgentNotification = {
  id: string;
  kind: string;
  title: string;
  body: string;
  priority: "urgent" | "high" | "medium" | "low";
  source: string;
  action_label?: string | null;
  action_href?: string | null;
  created_at: string;
  read: boolean;
  metadata?: Record<string, unknown>;
};

export type NotificationFeed = {
  items: MyAgentNotification[];
  count: number;
  unread: number;
  summary: {
    urgent: number;
    high: number;
    medium: number;
    low: number;
  };
};

export async function getNotificationFeed() {
  return apiFetch<NotificationFeed>("/notifications/demo");
}
