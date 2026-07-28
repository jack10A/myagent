import type { Metadata } from "next";
import { AgentInterviewModal } from "@/components/agent-interview-modal";
import "./globals.css";

export const metadata: Metadata = {
  title: "MyAgent",
  description: "A proactive AI chief-of-staff with Guardian safety alerts."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        {children}
        <AgentInterviewModal />
      </body>
    </html>
  );
}
