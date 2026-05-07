"use client";

import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";

export function WorkbenchLayout({
  header,
  sidebar,
  inspector,
  overlays,
  children,
}: {
  header: ReactNode;
  sidebar: ReactNode;
  inspector: ReactNode;
  overlays: ReactNode;
  children: ReactNode;
}) {
  return (
    <AppShell header={header} overlays={overlays} sidebar={sidebar} inspector={inspector}>
      {children}
    </AppShell>
  );
}
