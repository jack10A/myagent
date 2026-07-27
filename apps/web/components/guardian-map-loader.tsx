"use client";

import dynamic from "next/dynamic";

export const GuardianMapLoader = dynamic(
  () => import("@/components/guardian-map").then((module) => module.GuardianMap),
  {
    ssr: false,
    loading: () => <div className="h-[520px] w-full rounded-md border border-line bg-panel" />
  }
);

