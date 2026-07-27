"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Brain, BriefcaseBusiness, Cable, CheckSquare, HeartPulse, Home, ListTodo, Map, Menu, Mic, Settings, Shield, Sparkles, X } from "lucide-react";
import { useState } from "react";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/onboarding", label: "Create Agent", icon: Sparkles },
  { href: "/connectors", label: "Connectors", icon: Cable },
  { href: "/capture", label: "Capture", icon: Mic },
  { href: "/memory", label: "Memory", icon: Brain },
  { href: "/growth", label: "Growth", icon: BriefcaseBusiness },
  { href: "/health", label: "Health", icon: HeartPulse },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/notifications", label: "Alerts", icon: Bell },
  { href: "/map", label: "Map", icon: Map },
  { href: "/activity", label: "Activity", icon: ListTodo },
  { href: "/settings", label: "Settings", icon: Settings }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navigation = (onNavigate?: () => void) => (
    <nav className="space-y-1">
      {nav.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            aria-current={active ? "page" : undefined}
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex h-10 items-center gap-3 rounded-md px-3 text-sm transition ${
              active ? "bg-ink font-semibold text-white" : "text-ink/70 hover:bg-white hover:text-ink"
            }`}
          >
            <item.icon size={17} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-[1000] flex h-16 items-center justify-between border-b border-line bg-panel/95 px-4 backdrop-blur lg:hidden">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-ink text-white"><Shield size={18} /></span>
          MyAgent
        </Link>
        <button
          aria-expanded={mobileOpen}
          aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
          className="flex h-10 w-10 items-center justify-center rounded-md border border-line bg-white"
          onClick={() => setMobileOpen((value) => !value)}
          type="button"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {mobileOpen ? (
        <div className="fixed inset-0 z-[900] bg-ink/25 pt-16 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)}>
          <aside className="h-full w-[min(82vw,320px)] overflow-y-auto border-r border-line bg-panel p-4" onClick={(event) => event.stopPropagation()}>
            <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-[0.18em] text-teal">Workspace</p>
            {navigation(() => setMobileOpen(false))}
          </aside>
        </div>
      ) : null}

      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-line bg-panel px-4 py-5 lg:block">
        <Link href="/dashboard" className="flex items-center gap-3 px-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-ink text-white">
            <Shield size={20} />
          </span>
          <span>
            <span className="block text-lg font-semibold">MyAgent</span>
            <span className="text-xs text-ink/60">Guardian enabled</span>
          </span>
        </Link>
        <div className="mt-8">{navigation()}</div>
        <div className="absolute bottom-5 left-4 right-4 rounded-md border border-sage/40 bg-white p-3">
          <div className="flex items-center gap-2 text-xs font-semibold"><span className="h-2 w-2 rounded-full bg-sage" />System ready</div>
          <p className="mt-1 text-xs text-ink/50">Guardian is monitoring</p>
        </div>
      </aside>
      <section className="lg:pl-64">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>
      </section>
    </main>
  );
}
