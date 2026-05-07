"use client";

import type { Dispatch, SetStateAction } from "react";
import type { ProjectBundle } from "@/lib/types";
import type { ResearchIntakeViewModel, SourceLibraryViewModel } from "@/lib/design/view-models";
import type { WorkbenchInspectorSelection } from "@/components/workbench/WorkbenchInspector";
import { ResearchIntakeWorkspace } from "./research-intake-workspace";
import { SourceLibraryWorkspace } from "./source-library-workspace";
import type { ActiveTab, StaleArtifact, WorkbenchStepPath, WorkspaceSection } from "../workflow-state";

type EvidenceSection = "research-brief" | "source-form" | "source-library";

export function EvidenceWorkspace({
  researchModel,
  sourceLibraryModel,
  selectedBundle,
  selectedProjectId,
  activeSection,
  selectedSourceCardId,
  setSelectedBundle,
  refreshProjectsAndBundle,
  isPending,
  setIsPending,
  setMessage,
  markArtifactsStale,
  onNavigate,
  onExecute,
  onInspectorSelectionChange,
}: {
  researchModel: ResearchIntakeViewModel;
  sourceLibraryModel: SourceLibraryViewModel;
  selectedBundle: ProjectBundle;
  selectedProjectId: string;
  activeSection: WorkspaceSection;
  selectedSourceCardId: string | null;
  setSelectedBundle: Dispatch<SetStateAction<ProjectBundle | null>>;
  refreshProjectsAndBundle: (id?: string) => Promise<void>;
  isPending: boolean;
  setIsPending: (pending: boolean) => void;
  setMessage: (msg: string) => void;
  markArtifactsStale: (artifacts: StaleArtifact[]) => void;
  onNavigate: (tab: ActiveTab, section: WorkspaceSection) => void;
  onExecute: (step: WorkbenchStepPath) => Promise<void>;
  onInspectorSelectionChange: (selection: WorkbenchInspectorSelection) => void;
}) {
  const currentSection = getEvidenceSection(activeSection);

  return (
    <section className="redesign-evidence-workspace" aria-label="资料沉淀">
      <div className="redesign-evidence-tabs" role="tablist" aria-label="资料沉淀二级入口">
        <EvidenceTab
          index="01"
          label="研究清单"
          description="先列必须验证的问题"
          meta={researchModel.hasResearchBrief ? `${researchModel.dimensions.length} 个维度` : "待生成"}
          active={currentSection === "research-brief"}
          onClick={() => onNavigate("research", "research-brief")}
        />
        <EvidenceTab
          index="02"
          label="资料录入"
          description="把链接和原文沉淀成资料卡"
          meta={researchModel.sourceCount ? `${researchModel.sourceCount} 张资料` : "待录入"}
          active={currentSection === "source-form"}
          onClick={() => onNavigate("research", "source-form")}
        />
        <EvidenceTab
          index="03"
          label="资料库"
          description="按标题、片区和证据强度检索"
          meta={sourceLibraryModel.totalCount ? `${sourceLibraryModel.totalCount} 张资料` : "空库"}
          active={currentSection === "source-library"}
          onClick={() => onNavigate("research", "source-library")}
        />
      </div>

      {currentSection === "source-library" ? (
        <SourceLibraryWorkspace
          model={sourceLibraryModel}
          selectedSourceCardId={selectedSourceCardId}
          isPending={isPending}
          onNavigate={onNavigate}
          onExecute={onExecute}
          onInspectorSelectionChange={onInspectorSelectionChange}
        />
      ) : (
        <ResearchIntakeWorkspace
          model={researchModel}
          selectedBundle={selectedBundle}
          selectedProjectId={selectedProjectId}
          activeSection={currentSection}
          setSelectedBundle={setSelectedBundle}
          refreshProjectsAndBundle={refreshProjectsAndBundle}
          isPending={isPending}
          setIsPending={setIsPending}
          setMessage={setMessage}
          markArtifactsStale={markArtifactsStale}
          onNavigate={onNavigate}
          onExecute={onExecute}
        />
      )}
    </section>
  );
}

function EvidenceTab({
  index,
  label,
  description,
  meta,
  active,
  onClick,
}: {
  index: string;
  label: string;
  description: string;
  meta: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" role="tab" aria-selected={active} className={active ? "active" : ""} onClick={onClick}>
      <span className="redesign-evidence-tab-index">{index}</span>
      <strong>{label}</strong>
      <small>{description}</small>
      <em>{meta}</em>
    </button>
  );
}

function getEvidenceSection(section: WorkspaceSection): EvidenceSection {
  if (section === "source-form" || section === "source-library") {
    return section;
  }
  return "research-brief";
}
