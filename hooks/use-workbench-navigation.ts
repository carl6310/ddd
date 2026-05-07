"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ProjectBundle, ProjectStage } from "@/lib/types";
import type { WorkbenchView } from "@/lib/design/navigation";
import type { ActiveTab, WorkspaceSection } from "@/components/workbench/workflow-state";

export function useWorkbenchNavigation(selectedBundle: ProjectBundle | null) {
  const initialView = getProjectViewState(selectedBundle?.project.stage);
  const [activeTab, setActiveTab] = useState<ActiveTab>(initialView.tab);
  const [focusedSection, setFocusedSection] = useState<WorkspaceSection>(initialView.section);
  const lastAutoNavigatedProjectId = useRef(selectedBundle?.project.id ?? "");

  useEffect(() => {
    if (!selectedBundle?.project.id || selectedBundle.project.id === lastAutoNavigatedProjectId.current) {
      return;
    }
    const nextView = getProjectViewState(selectedBundle.project.stage);
    const projectId = selectedBundle.project.id;
    const timer = window.setTimeout(() => {
      setActiveTab(nextView.tab);
      setFocusedSection(nextView.section);
      lastAutoNavigatedProjectId.current = projectId;
    }, 0);
    return () => window.clearTimeout(timer);
  }, [selectedBundle?.project.id, selectedBundle?.project.stage]);

  const navigateWorkbench = useCallback((tab: ActiveTab, section: WorkspaceSection) => {
    setActiveTab(tab);
    setFocusedSection(section);
  }, []);

  const changeWorkbenchView = useCallback(
    (view: WorkbenchView) => {
      switch (view) {
        case "dashboard":
          navigateWorkbench("overview", null);
          return;
        case "judgement":
          navigateWorkbench("overview", "overview-think-card");
          return;
        case "evidence":
          navigateWorkbench("research", "research-brief");
          return;
        case "model":
          navigateWorkbench("structure", "sector-model");
          return;
        case "outline":
          navigateWorkbench("structure", "outline");
          return;
        case "draft":
          navigateWorkbench("drafts", "drafts");
          return;
        case "publish":
          navigateWorkbench("publish", "publish-prep");
          return;
        default:
          return;
      }
    },
    [navigateWorkbench],
  );

  const activeView = getActiveWorkbenchView(activeTab, focusedSection);

  return {
    activeTab,
    focusedSection,
    activeView,
    setActiveTab,
    setFocusedSection,
    navigateWorkbench,
    changeWorkbenchView,
    markProjectAutoNavigated(projectId: string) {
      lastAutoNavigatedProjectId.current = projectId;
    },
  };
}

export function getActiveWorkbenchView(activeTab: ActiveTab, focusedSection: WorkspaceSection): WorkbenchView {
  if (activeTab === "research") {
    return "evidence";
  }
  if (activeTab === "structure") {
    return focusedSection === "sector-model" ? "model" : "outline";
  }
  if (activeTab === "drafts") {
    return "draft";
  }
  if (activeTab === "publish") {
    return "publish";
  }
  if (activeTab === "overview" && focusedSection === "overview-vitality") {
    return "publish";
  }
  if (focusedSection === null) {
    return "dashboard";
  }
  return "judgement";
}

export function getProjectViewState(stage?: ProjectStage): { tab: ActiveTab; section: WorkspaceSection } {
  switch (stage) {
    case "ThinkCard / HKR":
      return { tab: "overview", section: "overview-think-card" };
    case "StyleCore":
      return { tab: "overview", section: "overview-style-core" };
    case "研究清单":
      return { tab: "research", section: "research-brief" };
    case "资料卡整理":
      return { tab: "research", section: "source-form" };
    case "板块建模":
      return { tab: "structure", section: "sector-model" };
    case "提纲生成":
      return { tab: "structure", section: "outline" };
    case "正文生成":
      return { tab: "drafts", section: "drafts" };
    case "VitalityCheck":
    case "发布前整理":
      return { tab: "publish", section: "publish-prep" };
    case "选题定义":
    default:
      return { tab: "overview", section: "overview-think-card" };
  }
}
