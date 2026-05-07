"use client";

import type { Dispatch, SetStateAction } from "react";
import type { ArticleProject, ProjectBundle } from "@/lib/types";
import { EmptyState } from "@/components/ui/empty-state";
import { Callout } from "@/components/ui/callout";
import { Button } from "@/components/ui/button";
import { OverviewTab } from "@/components/workbench/OverviewTab";
import { ResearchTab } from "@/components/workbench/ResearchTab";
import { DraftsTab } from "@/components/workbench/DraftsTab";
import type { WorkbenchInspectorSelection } from "@/components/workbench/WorkbenchInspector";
import { DraftEditorWorkspace } from "@/components/workbench/redesign/draft-editor-workspace";
import { EvidenceWorkspace } from "@/components/workbench/redesign/evidence-workspace";
import { JudgementWorkspace } from "@/components/workbench/redesign/judgement-workspace";
import { ProjectDashboard } from "@/components/workbench/redesign/project-dashboard";
import { OutlineEditorWorkspace } from "@/components/workbench/redesign/outline-editor-workspace";
import { PublishCenterWorkspace } from "@/components/workbench/redesign/publish-center-workspace";
import { SectorModelWorkspace } from "@/components/workbench/redesign/sector-model-workspace";
import { WorkbenchWorkspace } from "@/components/workbench/redesign/workbench-workspace";
import { CompatibilityWorkspace } from "@/components/workbench/redesign/compatibility-workspace";
import {
  buildCompatibilityWorkspaceViewModel,
  buildDraftEditorViewModel,
  buildJudgementWorkspaceViewModel,
  buildOutlineEditorViewModel,
  buildPublishCenterViewModel,
  buildProjectDashboardViewModel,
  buildResearchIntakeViewModel,
  buildSectorModelWorkspaceViewModel,
  buildSourceLibraryViewModel,
  buildWorkbenchDesignViewModel,
} from "@/lib/design/view-models";
import type { WorkbenchView } from "@/lib/design/navigation";
import type { JobStatus } from "@/lib/jobs/types";
import type { WorkbenchDisplayMode } from "./display-mode";
import type {
  ActiveTab,
  StaleArtifact,
  WorkbenchStepPath,
  WorkspaceSection,
  buildWorkbenchWorkflow,
} from "./workflow-state";

type WorkbenchWorkflow = ReturnType<typeof buildWorkbenchWorkflow>;

type DraftHeaderAction = {
  id: number;
  kind: "save" | "focus" | "history";
};

export function WorkbenchMain({
  activeView,
  activeTab,
  focusedSection,
  projects,
  selectedBundle,
  selectedProjectId,
  staleArtifacts,
  jobs,
  queueSummary,
  workflow,
  inspectorSelection,
  draftHeaderAction,
  displayMode,
  isPending,
  setSelectedBundle,
  setIsPending,
  setMessage,
  refreshProjectsAndBundle,
  markArtifactsStale,
  clearArtifacts,
  onNavigate,
  onExecute,
  onCreateProject,
  onCocreateTopic,
  onSelectProject,
  onSaveProjectFrame,
  onSaveEditedDraft,
  onGeneratePublishPrep,
  onInspectorSelectionChange,
}: {
  activeView: WorkbenchView;
  activeTab: ActiveTab;
  focusedSection: WorkspaceSection;
  projects: ArticleProject[];
  selectedBundle: ProjectBundle | null;
  selectedProjectId: string;
  staleArtifacts: StaleArtifact[];
  jobs: Array<{ step: string; status: JobStatus }>;
  queueSummary: { activeCount: number; runningCount: number; queuedCount: number };
  workflow: WorkbenchWorkflow | null;
  inspectorSelection: WorkbenchInspectorSelection;
  draftHeaderAction: DraftHeaderAction | null;
  displayMode: WorkbenchDisplayMode;
  isPending: boolean;
  setSelectedBundle: Dispatch<SetStateAction<ProjectBundle | null>>;
  setIsPending: (pending: boolean) => void;
  setMessage: (msg: string, kind?: "success" | "error" | "info") => void;
  refreshProjectsAndBundle: (id?: string) => Promise<void>;
  markArtifactsStale: (artifacts: StaleArtifact[], projectId?: string) => void;
  clearArtifacts: (artifacts: StaleArtifact[], projectId?: string) => void;
  onNavigate: (tab: ActiveTab, section: WorkspaceSection) => void;
  onExecute: (step: WorkbenchStepPath) => Promise<void>;
  onCreateProject: () => void;
  onCocreateTopic: () => void;
  onSelectProject: (projectId: string) => void;
  onSaveProjectFrame: () => Promise<void>;
  onSaveEditedDraft: (value: string) => Promise<void>;
  onGeneratePublishPrep: () => Promise<void>;
  onInspectorSelectionChange: (selection: WorkbenchInspectorSelection) => void;
}) {
  if (!selectedBundle) {
    return (
      <EmptyState title="还没有选中项目" className="blank-state workbench-empty-state">
        <p>请在左侧选择或新建一个项目。</p>
      </EmptyState>
    );
  }

  const isProjectDashboard = activeView === "dashboard" && activeTab === "overview" && focusedSection === null;
  const isWorkbenchDashboard = activeTab === "overview" && focusedSection === "workbench-dashboard";
  const isCompatibilityWorkspace = displayMode === "debug" && activeTab === "overview" && focusedSection === "overview-compatibility";
  const isJudgementWorkspace =
    activeView === "judgement" &&
    activeTab === "overview" &&
    (focusedSection === "overview-think-card" || focusedSection === "overview-style-core" || focusedSection === "overview-vitality" || focusedSection === "overview-compatibility");
  const isEvidenceWorkspace = activeView === "evidence" && activeTab === "research";
  const isSectorModelWorkspace = activeView === "model" && activeTab === "structure" && focusedSection === "sector-model";
  const isOutlineEditor = activeView === "outline" && activeTab === "structure" && focusedSection === "outline";
  const isDraftEditor = activeView === "draft" && activeTab === "drafts" && focusedSection === "drafts";
  const isPublishCenter = activeView === "publish" && activeTab === "publish" && focusedSection === "publish-prep";
  const designModel = buildWorkbenchDesignViewModel({
    activeView,
    projects,
    selectedBundle,
    jobs,
    staleArtifacts,
  });
  const projectDashboardModel = buildProjectDashboardViewModel({
    projects,
    selectedBundle,
    queue: queueSummary,
  });
  const judgementModel = buildJudgementWorkspaceViewModel(selectedBundle);
  const researchIntakeModel = buildResearchIntakeViewModel(selectedBundle);
  const sourceLibraryModel = buildSourceLibraryViewModel(selectedBundle);
  const sectorModelWorkspaceModel = buildSectorModelWorkspaceViewModel(selectedBundle);
  const outlineEditorModel = buildOutlineEditorViewModel(selectedBundle);
  const draftEditorModel = buildDraftEditorViewModel(selectedBundle);
  const publishCenterModel = buildPublishCenterViewModel(selectedBundle);
  const compatibilityModel = buildCompatibilityWorkspaceViewModel(selectedBundle);

  return (
    <>
      <StaleArtifactNotice selectedBundle={selectedBundle} staleArtifacts={staleArtifacts} onNavigate={onNavigate} onClear={clearArtifacts} />

      {isProjectDashboard && workflow ? (
        <ProjectDashboard
          model={projectDashboardModel}
          nextAction={workflow.nextAction}
          isPending={isPending}
          onCreateProject={onCreateProject}
          onCocreateTopic={onCocreateTopic}
          onSelectProject={onSelectProject}
          onNavigate={onNavigate}
          onExecute={onExecute}
        />
      ) : null}

      {isWorkbenchDashboard && workflow ? (
        <WorkbenchWorkspace model={designModel} nextAction={workflow.nextAction} isPending={isPending} onNavigate={onNavigate} onExecute={onExecute} />
      ) : null}

      {isJudgementWorkspace ? (
        <JudgementWorkspace
          model={judgementModel}
          selectedBundle={selectedBundle}
          activeSection={displayMode === "debug" ? focusedSection : focusedSection === "overview-compatibility" ? "overview-think-card" : focusedSection}
          setSelectedBundle={setSelectedBundle}
          isPending={isPending}
          onNavigate={onNavigate}
          onExecute={onExecute}
          onSaveProjectFrame={onSaveProjectFrame}
          displayMode={displayMode}
        />
      ) : null}

      {isCompatibilityWorkspace ? <CompatibilityWorkspace model={compatibilityModel} isPending={isPending} onNavigate={onNavigate} /> : null}

      {isEvidenceWorkspace ? (
        <EvidenceWorkspace
          researchModel={researchIntakeModel}
          sourceLibraryModel={sourceLibraryModel}
          selectedBundle={selectedBundle}
          selectedProjectId={selectedProjectId}
          activeSection={focusedSection}
          selectedSourceCardId={inspectorSelection?.kind === "source-card" ? inspectorSelection.sourceCardId : null}
          setSelectedBundle={setSelectedBundle}
          refreshProjectsAndBundle={refreshProjectsAndBundle}
          isPending={isPending}
          setIsPending={setIsPending}
          setMessage={setMessage}
          markArtifactsStale={markArtifactsStale}
          onNavigate={onNavigate}
          onExecute={onExecute}
          onInspectorSelectionChange={onInspectorSelectionChange}
        />
      ) : null}

      {isSectorModelWorkspace ? (
        <SectorModelWorkspace
          model={sectorModelWorkspaceModel}
          selectedBundle={selectedBundle}
          selectedProjectId={selectedProjectId}
          setSelectedBundle={setSelectedBundle}
          refreshProjectsAndBundle={refreshProjectsAndBundle}
          isPending={isPending}
          setIsPending={setIsPending}
          setMessage={setMessage}
          markArtifactsStale={markArtifactsStale}
          onExecute={onExecute}
          displayMode={displayMode}
        />
      ) : null}

      {isOutlineEditor ? (
        <OutlineEditorWorkspace
          model={outlineEditorModel}
          selectedSectionId={inspectorSelection?.kind === "outline-section" ? inspectorSelection.sectionId : null}
          isPending={isPending}
          onExecute={onExecute}
          onInspectorSelectionChange={onInspectorSelectionChange}
        />
      ) : null}

      {isDraftEditor ? (
        <DraftEditorWorkspace
          model={draftEditorModel}
          selectedSectionId={inspectorSelection?.kind === "outline-section" ? inspectorSelection.sectionId : null}
          isPending={isPending}
          onNavigate={onNavigate}
          onExecute={onExecute}
          onSaveEditedDraft={onSaveEditedDraft}
          headerAction={draftHeaderAction}
          onInform={setMessage}
          onInspectorSelectionChange={onInspectorSelectionChange}
        />
      ) : null}

      {isPublishCenter ? (
        <PublishCenterWorkspace
          model={publishCenterModel}
          isPending={isPending}
          exportHref={`/api/projects/${selectedProjectId}/export/markdown`}
          onNavigate={onNavigate}
          onRunReview={() => onExecute("review")}
          onGeneratePublishPrep={onGeneratePublishPrep}
        />
      ) : null}

      {activeTab === "overview" && !isProjectDashboard && !isWorkbenchDashboard && !isJudgementWorkspace && !isCompatibilityWorkspace ? (
        <section role="tabpanel" id="workbench-panel-overview" aria-labelledby="workbench-tab-overview">
          <OverviewTab
            selectedBundle={selectedBundle}
            setSelectedBundle={setSelectedBundle}
            isPending={isPending}
            runProjectStep={onExecute}
            generatePublishPrep={onGeneratePublishPrep}
            saveProjectFrame={onSaveProjectFrame}
            setFocusedSection={(section) => onNavigate("overview", section)}
            focusSection={focusedSection}
            onNavigate={onNavigate}
            onInspectorSelectionChange={onInspectorSelectionChange}
          />
        </section>
      ) : null}

      {activeTab === "research" && !isEvidenceWorkspace ? (
        <section role="tabpanel" id="workbench-panel-research" aria-labelledby="workbench-tab-research">
          <ResearchTab
            selectedBundle={selectedBundle}
            setSelectedBundle={setSelectedBundle}
            selectedProjectId={selectedProjectId}
            refreshProjectsAndBundle={refreshProjectsAndBundle}
            isPending={isPending}
            setIsPending={setIsPending}
            setMessage={setMessage}
            markArtifactsStale={markArtifactsStale}
            runProjectStep={onExecute}
            focusSection={mapResearchFocus(focusedSection)}
            onInspectorSelectionChange={onInspectorSelectionChange}
            displayMode={displayMode}
          />
        </section>
      ) : null}

      {((activeTab === "structure" && !isSectorModelWorkspace && !isOutlineEditor) || (activeTab === "drafts" && !isDraftEditor) || (activeTab === "publish" && !isPublishCenter)) ? (
        <section
          role="tabpanel"
          id={activeTab === "structure" ? "workbench-panel-structure" : activeTab === "publish" ? "workbench-panel-publish" : "workbench-panel-drafts"}
          aria-labelledby={activeTab === "structure" ? "workbench-tab-structure" : activeTab === "publish" ? "workbench-tab-publish" : "workbench-tab-drafts"}
        >
          <DraftsTab
            selectedBundle={selectedBundle}
            setSelectedBundle={setSelectedBundle}
            selectedProjectId={selectedProjectId}
            refreshProjectsAndBundle={refreshProjectsAndBundle}
            isPending={isPending}
            setIsPending={setIsPending}
            setMessage={setMessage}
            markArtifactsStale={markArtifactsStale}
            runProjectStep={onExecute}
            generatePublishPrep={onGeneratePublishPrep}
            surfaceTitle={activeTab === "structure" ? "结构" : activeTab === "publish" ? "发布" : "写作"}
            surfaceMode={activeTab === "structure" ? "structure" : activeTab === "publish" ? "publish" : "writing"}
            onOpenVitalityCheck={() => {
              onNavigate("publish", "publish-prep");
            }}
            onInspectorSelectionChange={onInspectorSelectionChange}
            displayMode={displayMode}
            focusSection={activeTab === "structure" ? mapStructureFocus(focusedSection) : activeTab === "publish" ? "publish-prep" : mapWritingFocus(focusedSection)}
          />
        </section>
      ) : null}
    </>
  );
}

function StaleArtifactNotice({
  selectedBundle,
  staleArtifacts,
  onNavigate,
  onClear,
}: {
  selectedBundle: ProjectBundle;
  staleArtifacts: StaleArtifact[];
  onNavigate: (tab: ActiveTab, section: WorkspaceSection) => void;
  onClear: (artifacts: StaleArtifact[]) => void;
}) {
  const visibleArtifacts = staleArtifacts.filter((artifact) => hasArtifact(selectedBundle, artifact));
  if (visibleArtifacts.length === 0) {
    return null;
  }
  const target = getArtifactTarget(visibleArtifacts[0]);

  return (
    <Callout
      className="stale-artifact-notice"
      title="下游结果可能已过期"
      action={(
        <div className="stale-artifact-actions">
          <Button variant="secondary" onClick={() => onNavigate(target.tab, target.section)}>
            去处理
          </Button>
          <Button variant="ghost" onClick={() => onClear(visibleArtifacts)}>
            标记已处理
          </Button>
        </div>
      )}
    >
      <p>上游内容已经改过，建议重新生成：{visibleArtifacts.map(getArtifactLabel).join("、")}。</p>
    </Callout>
  );
}

function hasArtifact(bundle: ProjectBundle, artifact: StaleArtifact) {
  switch (artifact) {
    case "research-brief":
      return Boolean(bundle.researchBrief);
    case "sector-model":
      return Boolean(bundle.sectorModel);
    case "outline":
      return Boolean(bundle.outlineDraft);
    case "drafts":
      return Boolean(bundle.articleDraft);
    case "review":
      return Boolean(bundle.reviewReport);
    case "publish-prep":
      return Boolean(bundle.publishPackage);
  }
}

function getArtifactLabel(artifact: StaleArtifact) {
  switch (artifact) {
    case "research-brief":
      return "研究清单";
    case "sector-model":
      return "板块建模";
    case "outline":
      return "论证提纲";
    case "drafts":
      return "正文";
    case "review":
      return "VitalityCheck";
    case "publish-prep":
      return "发布包";
  }
}

function getArtifactTarget(artifact: StaleArtifact): { tab: ActiveTab; section: WorkspaceSection } {
  switch (artifact) {
    case "research-brief":
      return { tab: "research", section: "research-brief" };
    case "sector-model":
      return { tab: "structure", section: "sector-model" };
    case "outline":
      return { tab: "structure", section: "outline" };
    case "drafts":
      return { tab: "drafts", section: "drafts" };
    case "review":
    case "publish-prep":
      return { tab: "publish", section: "publish-prep" };
  }
}

function mapResearchFocus(section: WorkspaceSection) {
  if (section === "research-brief" || section === "source-form" || section === "source-library" || section === null) {
    return section;
  }
  return null;
}

function mapStructureFocus(section: WorkspaceSection) {
  if (section === "sector-model" || section === "outline" || section === null) {
    return section;
  }
  return null;
}

function mapWritingFocus(section: WorkspaceSection) {
  if (section === "drafts" || section === null) {
    return section;
  }
  return null;
}
