import type { ReactNode } from "react";
import { Panel } from "@/components/ui/surface";

export function AppShell({
  header,
  overlays,
  sidebar,
  inspector,
  children,
}: {
  header: ReactNode;
  overlays?: ReactNode;
  sidebar: ReactNode;
  inspector?: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="page-shell app-shell" data-ui="app-shell">
      <header className="page-topbar" data-ui="app-shell-header">
        <div className="mac-window-controls" aria-hidden="true">
          <span className="mac-window-control mac-window-control-close" />
          <span className="mac-window-control mac-window-control-minimize" />
          <span className="mac-window-control mac-window-control-zoom" />
        </div>
        {header}
      </header>
      {overlays}
      <section className="workspace-grid" data-ui="app-shell-grid">
        {sidebar}
        <Panel className="main-panel" data-ui="main-stage">
          {children}
        </Panel>
        {inspector}
      </section>
    </main>
  );
}
