"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ArticleProject, ProjectBundle, ProjectStage, SampleArticle } from "@/lib/types";
import { ProjectSidebar } from "./workbench/ProjectSidebar";
import { OverviewTab } from "./workbench/OverviewTab";
import { ResearchTab } from "./workbench/ResearchTab";
import { DraftsTab } from "./workbench/DraftsTab";
import { WorkbenchInspector, type WorkbenchInspectorSelection } from "./workbench/WorkbenchInspector";
import type { ProjectSidebarActionRequest } from "./workbench/ProjectSidebar";
import { DraftEditorWorkspace } from "./workbench/redesign/draft-editor-workspace";
import { JudgementWorkspace } from "./workbench/redesign/judgement-workspace";
import { ProjectDashboard } from "./workbench/redesign/project-dashboard";
import { OutlineEditorWorkspace } from "./workbench/redesign/outline-editor-workspace";
import { PublishCenterWorkspace } from "./workbench/redesign/publish-center-workspace";
import { ResearchIntakeWorkspace } from "./workbench/redesign/research-intake-workspace";
import { SectorModelWorkspace } from "./workbench/redesign/sector-model-workspace";
import { SourceLibraryWorkspace } from "./workbench/redesign/source-library-workspace";
import { WorkbenchCockpit } from "./workbench/redesign/workbench-cockpit";
import { WorkbenchWorkspace } from "./workbench/redesign/workbench-workspace";
import { JobLogPanel } from "./workbench/job-log-panel";
import { TaskCenterModal } from "./workbench/task-center-modal";
import { useJobPolling, type JobDetail, type ProjectJobSummary } from "@/hooks/use-job-polling";
import { useJobAction } from "@/hooks/use-job-action";
import type { JobStatus, JobStep } from "@/lib/jobs/types";
import { Toast } from "./ui/toast";
import { AppShell } from "./layout/app-shell";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { EmptyState } from "@/components/ui/empty-state";
import { getWorkbenchViewLabel, type WorkbenchView } from "@/lib/design/navigation";
import { formatProjectStage } from "@/lib/project-stage-labels";
import { CompatibilityWorkspace } from "./workbench/redesign/compatibility-workspace";
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
import {
  buildWorkbenchWorkflow,
  type ActiveTab,
  type StaleArtifact,
  type WorkbenchStepPath,
  type WorkspaceSection,
} from "./workbench/workflow-state";
import {
  normalizeWorkbenchDisplayMode,
  workbenchDisplayModeStorageKey,
  type WorkbenchDisplayMode,
} from "./workbench/display-mode";
type MessageKind = "success" | "error" | "info";

type FeedbackState = {
  text: string;
  kind: MessageKind;
};

export function ProjectWorkbench({
  initialProjects,
  initialSamples,
  initialSelectedBundle,
}: {
  initialProjects: ArticleProject[];
  initialSamples: SampleArticle[];
  initialSelectedBundle: ProjectBundle | null;
}) {
  const initialView = getProjectViewState(initialSelectedBundle?.project.stage);
  const [projects, setProjects] = useState(initialProjects);
  const [samples] = useState(initialSamples);
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjects[0]?.id ?? "");
  const [selectedBundle, setSelectedBundle] = useState<ProjectBundle | null>(initialSelectedBundle);
  
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [jobDetail, setJobDetail] = useState<JobDetail | null>(null);
  const [isRetryingJob, setIsRetryingJob] = useState(false);
  const [isTaskCenterOpen, setIsTaskCenterOpen] = useState(false);
  const [sidebarActionRequest, setSidebarActionRequest] = useState<ProjectSidebarActionRequest | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>(initialView.tab);
  const [focusedSection, setFocusedSection] = useState<WorkspaceSection>(initialView.section);
  const [inspectorSelection, setInspectorSelection] = useState<WorkbenchInspectorSelection>(null);
  const [displayMode, setDisplayMode] = useState<WorkbenchDisplayMode>("writing");
  const [staleArtifactsByProject, setStaleArtifactsByProject] = useState<Record<string, StaleArtifact[]>>({});
  const lastAutoNavigatedProjectId = useRef(initialSelectedBundle?.project.id ?? "");
  const previousJobStatuses = useRef(new Map<string, JobStatus>());
  const handledTerminalJobs = useRef(new Set<string>());
  const { jobs, queueSummary, refresh: refreshJobs, loadJobDetail } = useJobPolling(selectedProjectId);
  const stepJobAction = useJobAction({ trackDetail: false });
  const publishPrepJobAction = useJobAction({ trackDetail: false });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      setDisplayMode(normalizeWorkbenchDisplayMode(window.localStorage.getItem(workbenchDisplayModeStorageKey)));
      const stored = window.localStorage.getItem("workbench-stale-artifacts");
      if (stored) {
        setStaleArtifactsByProject(JSON.parse(stored) as Record<string, StaleArtifact[]>);
      }
    } catch {
      setStaleArtifactsByProject({});
    }
  }, []);

  function changeDisplayMode(mode: WorkbenchDisplayMode) {
    setDisplayMode(mode);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(workbenchDisplayModeStorageKey, mode);
    }
  }

  useEffect(() => {
    if (!selectedProjectId && projects[0]?.id) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  useEffect(() => {
    if (!selectedProjectId) {
      setSelectedBundle(null);
      return;
    }

    void (async () => {
      try {
        const response = await fetch(`/api/projects/${selectedProjectId}`);
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error || "读取项目失败。");
        }
        setSelectedBundle(payload.bundle);
        if (payload.bundle?.project.id && payload.bundle.project.id !== lastAutoNavigatedProjectId.current) {
          const nextView = getProjectViewState(payload.bundle.project.stage);
          setActiveTab(nextView.tab);
          setFocusedSection(nextView.section);
          lastAutoNavigatedProjectId.current = payload.bundle.project.id;
        }
      } catch (error) {
        showFeedback(error instanceof Error ? error.message : "读取项目失败。");
      }
    })();
  }, [selectedProjectId]);

  useEffect(() => {
    previousJobStatuses.current.clear();
    handledTerminalJobs.current.clear();
    setJobDetail(null);
    setInspectorSelection(null);
  }, [selectedProjectId]);

  const sampleDigest = useMemo(
    () =>
      samples
        .slice(0, 5)
        .map((sample, index) => `${index + 1}. ${sample.title} | ${sample.articleType} | ${sample.coreThesis}`)
        .join("\n"),
    [samples],
  );

  const refreshProjectsAndBundle = useCallback(async (projectId?: string) => {
    const projectsResponse = await fetch("/api/projects");
    const projectsPayload = await projectsResponse.json();
    if (!projectsResponse.ok) {
      throw new Error(projectsPayload.error || "刷新项目列表失败。");
    }

    setProjects(projectsPayload.projects);
    const nextProjectId = projectId ?? selectedProjectId ?? projectsPayload.projects[0]?.id;
    if (nextProjectId) {
      setSelectedProjectId(nextProjectId);
      const bundleResponse = await fetch(`/api/projects/${nextProjectId}`);
      const bundlePayload = await bundleResponse.json();
      if (!bundleResponse.ok) {
        throw new Error(bundlePayload.error || "刷新项目详情失败。");
      }
      setSelectedBundle(bundlePayload.bundle);
      if (projectId && bundlePayload.bundle?.project.id) {
        const nextView = getProjectViewState(bundlePayload.bundle.project.stage);
        setActiveTab(nextView.tab);
        setFocusedSection(nextView.section);
        lastAutoNavigatedProjectId.current = bundlePayload.bundle.project.id;
      }
    }
  }, [selectedProjectId]);

  const updateProjectStaleArtifacts = useCallback((projectId: string, updater: (current: StaleArtifact[]) => StaleArtifact[]) => {
    setStaleArtifactsByProject((currentMap) => {
      const nextItems = updater(currentMap[projectId] ?? []);
      const nextMap = { ...currentMap };
      if (nextItems.length > 0) {
        nextMap[projectId] = nextItems;
      } else {
        delete nextMap[projectId];
      }
      if (typeof window !== "undefined") {
        window.localStorage.setItem("workbench-stale-artifacts", JSON.stringify(nextMap));
      }
      return nextMap;
    });
  }, []);

  const markArtifactsStale = useCallback(
    (artifacts: StaleArtifact[], projectId = selectedProjectId) => {
      if (!projectId || artifacts.length === 0) {
        return;
      }
      updateProjectStaleArtifacts(projectId, (current) => Array.from(new Set([...current, ...artifacts])));
    },
    [selectedProjectId, updateProjectStaleArtifacts],
  );

  const clearArtifacts = useCallback(
    (artifacts: StaleArtifact[], projectId = selectedProjectId) => {
      if (!projectId || artifacts.length === 0) {
        return;
      }
      updateProjectStaleArtifacts(projectId, (current) => current.filter((item) => !artifacts.includes(item)));
    },
    [selectedProjectId, updateProjectStaleArtifacts],
  );

  useEffect(() => {
    if (!selectedProjectId) {
      return;
    }

    const completedJobs: ProjectJobSummary[] = [];
    const failedJobs: ProjectJobSummary[] = [];

    for (const job of jobs) {
      const previousStatus = previousJobStatuses.current.get(job.id);
      previousJobStatuses.current.set(job.id, job.status);

      if (handledTerminalJobs.current.has(job.id)) {
        continue;
      }

      if ((previousStatus === "queued" || previousStatus === "running") && job.status === "succeeded") {
        handledTerminalJobs.current.add(job.id);
        completedJobs.push(job);
        reconcileStaleArtifactsForCompletedJob(job.step, selectedProjectId, clearArtifacts, markArtifactsStale);
      }

      if ((previousStatus === "queued" || previousStatus === "running") && job.status === "failed") {
        handledTerminalJobs.current.add(job.id);
        failedJobs.push(job);
      }
    }

    if (completedJobs.length > 0) {
      const latestCompletedJob = completedJobs[0];
      setJobDetail(null);
      setActiveTab(getResultTabForJobStep(latestCompletedJob.step));
      setFocusedSection(getResultSectionForJobStep(latestCompletedJob.step));
      showFeedback(getSuccessMessageForJobStep(latestCompletedJob.step), "success");
      void refreshProjectsAndBundle(selectedProjectId).catch((error) => {
        showFeedback(error instanceof Error ? error.message : "刷新项目详情失败。");
      });
    }

    if (failedJobs.length > 0) {
      const latestFailedJob = failedJobs[0];
      showFeedback(latestFailedJob.errorMessage || getFailureMessageForJobStep(latestFailedJob.step), "error");
      void loadJobDetail(latestFailedJob.id)
        .then((detail) => {
          setJobDetail(detail);
        })
        .catch((error) => {
          showFeedback(error instanceof Error ? error.message : "读取任务详情失败。");
        });
    }
  }, [clearArtifacts, jobs, loadJobDetail, markArtifactsStale, refreshProjectsAndBundle, selectedProjectId]);

  const stepSubmissionPending = stepJobAction.isSubmitting || publishPrepJobAction.isSubmitting;
  const uiPending = isPending || stepSubmissionPending;
  const selectedStaleArtifacts = selectedProjectId ? staleArtifactsByProject[selectedProjectId] ?? [] : [];

  async function runProjectStep(path: WorkbenchStepPath, _successMessage: string, forceProceed = false) {
    if (!selectedProjectId) {
      return;
    }

    try {
      showFeedback(path === "drafts" ? "正在生成双稿，真实模型可能需要 20-60 秒，请稍等。" : "", "info");
      const submission = await stepJobAction.submitJob({
        url: `/api/projects/${selectedProjectId}/${path}`,
        body: forceProceed ? { forceProceed: true } : {},
        onNeedsConfirmation(payload) {
          const confirmed = window.confirm((payload.error as string) || "这一步有风险提醒，是否仍然继续？");
          return {
            retry: confirmed,
            body: { forceProceed: true },
          };
        },
      });
      setActiveTab(getResultTabForStep(path));
      setFocusedSection(getResultSectionForStep(path));
      await refreshJobs();
      showFeedback(
        submission.deduped ? "同一步骤已经有后台任务在执行，已继续跟踪这条任务。" : getQueuedMessageForStep(path),
        "info",
      );
    } catch (error) {
      showFeedback(error instanceof Error ? error.message : "执行步骤失败。");
    }
  }

  async function saveProjectFrame() {
    if (!selectedProjectId || !selectedBundle) {
      return;
    }

    setIsPending(true);
    try {
      showFeedback("", "info");
      const response = await fetch(`/api/projects/${selectedProjectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          thesis: selectedBundle.project.thesis,
          coreQuestion: selectedBundle.project.coreQuestion,
          notes: selectedBundle.project.notes,
          thinkCard: selectedBundle.project.thinkCard,
          styleCore: selectedBundle.project.styleCore,
          vitalityCheck: selectedBundle.project.vitalityCheck,
          hkrr: selectedBundle.project.hkrr,
          hamd: selectedBundle.project.hamd,
          writingMoves: selectedBundle.project.writingMoves,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "保存选题判断 / 表达策略失败。");
      }
      await refreshProjectsAndBundle(selectedProjectId);
      markArtifactsStale(["research-brief", "sector-model", "outline", "drafts", "review", "publish-prep"]);
      showFeedback("选题判断 / 表达策略已保存。", "success");
    } catch (error) {
      showFeedback(error instanceof Error ? error.message : "保存选题判断 / 表达策略失败。");
    } finally {
      setIsPending(false);
    }
  }

  async function generatePublishPrep() {
    if (!selectedProjectId) {
      return;
    }

    try {
      showFeedback("", "info");
      const submission = await publishPrepJobAction.submitJob({
        url: `/api/projects/${selectedProjectId}/publish-prep`,
        onQueued(_jobId, deduped) {
          showFeedback(
            deduped ? "发布前整理任务已经在后台执行，已继续跟踪这条任务。" : "发布前整理任务已入队，正在后台执行。",
            "info",
          );
        },
      });
      setActiveTab("publish");
      setFocusedSection("publish-prep");
      await refreshJobs();
      if (submission.deduped) {
        showFeedback("发布前整理任务已经在后台执行，已继续跟踪这条任务。", "info");
      }
    } catch (error) {
      showFeedback(error instanceof Error ? error.message : "生成发布前整理稿失败。");
    }
  }

  async function saveEditedDraft(value: string) {
    if (!selectedProjectId) {
      return;
    }

    setIsPending(true);
    try {
      showFeedback("", "info");
      const response = await fetch(`/api/projects/${selectedProjectId}/drafts`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ editedMarkdown: value }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "保存人工改写稿失败。");
      }
      setSelectedBundle((current) =>
        current && current.articleDraft
          ? {
              ...current,
              articleDraft: {
                ...current.articleDraft,
                editedMarkdown: payload.articleDraft?.editedMarkdown ?? value,
              },
            }
          : current,
      );
      await refreshProjectsAndBundle(selectedProjectId);
      markArtifactsStale(["review", "publish-prep"]);
      showFeedback("人工改写稿已保存。VitalityCheck 和发布整理可能需要重生成。", "success");
    } catch (error) {
      showFeedback(error instanceof Error ? error.message : "保存人工改写稿失败。", "error");
    } finally {
      setIsPending(false);
    }
  }

  async function retryFailedJob(jobId: string) {
    setIsRetryingJob(true);
    try {
      const response = await fetch(`/api/jobs/${jobId}/retry`, {
        method: "POST",
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "任务重试失败。");
      }
      await refreshJobs();
      setJobDetail(null);
      showFeedback(payload.job?.deduped ? "已有同类任务在后台执行，已继续跟踪。" : "失败任务已重新入队。", "info");
    } catch (error) {
      showFeedback(error instanceof Error ? error.message : "任务重试失败。");
    } finally {
      setIsRetryingJob(false);
    }
  }

  const detailedVisibleJob = jobDetail?.job ?? null;
  const visibleJob = detailedVisibleJob;
  const activeView = getActiveWorkbenchView(activeTab, focusedSection);
  const isProjectDashboard = activeTab === "overview" && focusedSection === null;
  const isWorkbenchDashboard = activeTab === "overview" && focusedSection === "workbench-dashboard";
  const isCompatibilityWorkspace = activeTab === "overview" && focusedSection === "overview-compatibility";
  const isJudgementWorkspace =
    activeTab === "overview" &&
    (focusedSection === "overview-think-card" || focusedSection === "overview-style-core" || focusedSection === "overview-vitality");
  const isResearchIntake = activeTab === "research" && (focusedSection === "research-brief" || focusedSection === "source-form");
  const isSourceLibrary = activeTab === "research" && focusedSection === "source-library";
  const isSectorModelWorkspace = activeTab === "structure" && focusedSection === "sector-model";
  const isOutlineEditor = activeTab === "structure" && focusedSection === "outline";
  const isDraftEditor = activeTab === "drafts" && focusedSection === "drafts";
  const isPublishCenter = activeTab === "publish" && focusedSection === "publish-prep";
  const workflow = selectedBundle
    ? buildWorkbenchWorkflow({
        selectedBundle,
        staleArtifacts: selectedStaleArtifacts,
        activeTab,
        focusedSection,
        jobs,
      })
    : null;
  const designModel = selectedBundle
    ? buildWorkbenchDesignViewModel({
        activeView,
        projects,
        selectedBundle,
        jobs,
        staleArtifacts: selectedStaleArtifacts,
      })
    : null;
  const shouldShowWorkbenchCockpit = false;
  const projectDashboardModel = selectedBundle
    ? buildProjectDashboardViewModel({
        projects,
        selectedBundle,
        queue: queueSummary,
      })
    : null;
  const judgementModel = selectedBundle ? buildJudgementWorkspaceViewModel(selectedBundle) : null;
  const researchIntakeModel = selectedBundle ? buildResearchIntakeViewModel(selectedBundle) : null;
  const sourceLibraryModel = selectedBundle ? buildSourceLibraryViewModel(selectedBundle) : null;
  const sectorModelWorkspaceModel = selectedBundle ? buildSectorModelWorkspaceViewModel(selectedBundle) : null;
  const outlineEditorModel = selectedBundle ? buildOutlineEditorViewModel(selectedBundle) : null;
  const draftEditorModel = selectedBundle ? buildDraftEditorViewModel(selectedBundle) : null;
  const publishCenterModel = selectedBundle ? buildPublishCenterViewModel(selectedBundle) : null;
  const compatibilityModel = selectedBundle ? buildCompatibilityWorkspaceViewModel(selectedBundle) : null;

  function navigateWorkbench(tab: ActiveTab, section: WorkspaceSection) {
    setActiveTab(tab);
    setFocusedSection(section);
  }

  function selectProjectFromDashboard(projectId: string) {
    lastAutoNavigatedProjectId.current = projectId;
    setSelectedProjectId(projectId);
    navigateWorkbench("overview", null);
  }

  function requestSidebarAction(kind: ProjectSidebarActionRequest["kind"]) {
    setSidebarActionRequest({ kind, nonce: Date.now() });
  }

  function changeWorkbenchView(view: WorkbenchView) {
    switch (view) {
      case "projects":
        navigateWorkbench("overview", null);
        return;
      case "workbench":
        navigateWorkbench("overview", "workbench-dashboard");
        return;
      case "sources":
        navigateWorkbench("research", "source-library");
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
      case "settings":
      default:
        return;
    }
  }

  const appHeaderMeta = getAppHeaderMeta({
    activeView,
    selectedBundle,
  });

  const appHeader = (
    <>
      <div className="topbar-left">
        <div>
          <h1 className="topbar-title">上海板块写作工作台</h1>
        </div>
      </div>
      <div className="topbar-center">
        <div>
          <span className="topbar-kicker">{appHeaderMeta.kicker}</span>
          <strong>{appHeaderMeta.title}</strong>
          <small>{appHeaderMeta.detail}</small>
        </div>
      </div>
      <div className="topbar-right">
        <button type="button" className="app-icon-button" aria-label="搜索" title="打开项目搜索" onClick={() => navigateWorkbench("overview", null)}>
          ⌕
        </button>
        <button
          type="button"
          className="app-icon-button"
          aria-label="外观"
          title={displayMode === "writing" ? "切到调试模式" : "切到写作模式"}
          onClick={() => changeDisplayMode(displayMode === "writing" ? "debug" : "writing")}
        >
          ☼
        </button>
        <button type="button" className="app-icon-button app-icon-button-notify" onClick={() => setIsTaskCenterOpen(true)} aria-label="后台任务">
          ♢
        </button>
        <button
          type="button"
          className="app-avatar-button"
          onClick={() => changeDisplayMode(displayMode === "writing" ? "debug" : "writing")}
          aria-label="切换写作和调试模式"
          title={displayMode === "writing" ? "切到调试模式" : "切到写作模式"}
        >
          C
        </button>
        <div className="app-header-actions" aria-label="当前页面操作">
          <HeaderActions
            activeView={activeView}
            selectedProjectId={selectedProjectId}
            selectedBundle={selectedBundle}
            isPending={uiPending}
            onCreateProject={() => requestSidebarAction("create")}
            onCocreateTopic={() => requestSidebarAction("cocreate")}
            onNavigate={navigateWorkbench}
            onExecute={(step) => runProjectStep(step, getSuccessMessageForStep(step))}
            onGeneratePublishPrep={generatePublishPrep}
          />
        </div>
      </div>
    </>
  );

  const appOverlays = (
    <>
      <TaskCenterModal
        open={isTaskCenterOpen}
        onClose={() => setIsTaskCenterOpen(false)}
        onChanged={async () => {
          await refreshJobs();
          if (selectedProjectId) {
            await refreshProjectsAndBundle(selectedProjectId);
          }
        }}
      />

      <JobLogPanel
        job={visibleJob}
        logs={detailedVisibleJob ? jobDetail?.logsTail ?? [] : []}
        queueSummary={queueSummary}
        onRetry={visibleJob?.status === "failed" ? () => void retryFailedJob(visibleJob.id) : null}
        isRetrying={isRetryingJob}
        displayMode={displayMode}
      />

      {feedback?.text ? (
        <Toast 
          message={feedback.text} 
          kind={feedback.kind} 
          onClose={() => setFeedback(null)} 
        />
      ) : null}
    </>
  );

  const appSidebar = (
    <ProjectSidebar
          projects={projects}
          selectedProjectId={selectedProjectId}
          setSelectedProjectId={setSelectedProjectId}
          isPending={uiPending}
          setIsPending={setIsPending}
          setMessage={showFeedback}
          refreshProjectsAndBundle={refreshProjectsAndBundle}
          sampleDigest={sampleDigest}
          displayMode={displayMode}
          activeView={activeView}
          onViewChange={changeWorkbenchView}
          actionRequest={sidebarActionRequest}
        />
  );

  const shouldShowAppInspector =
    selectedBundle && !isProjectDashboard && !isWorkbenchDashboard && !isSourceLibrary && !isOutlineEditor && !isDraftEditor && !isPublishCenter;
  const appInspector = shouldShowAppInspector ? (
    <WorkbenchInspector
      selectedBundle={selectedBundle}
      activeTab={activeTab}
      focusedSection={focusedSection}
      selection={inspectorSelection}
      onClearSelection={() => setInspectorSelection(null)}
      isPending={uiPending}
      onNavigate={(tab, section) => {
        navigateWorkbench(tab, section);
      }}
      onExecute={(step) => runProjectStep(step, getSuccessMessageForStep(step))}
      displayMode={displayMode}
    />
  ) : null;

  return (
    <AppShell header={appHeader} overlays={appOverlays} sidebar={appSidebar} inspector={appInspector}>
          {!selectedBundle ? (
            <EmptyState title="还没有选中项目" className="blank-state workbench-empty-state">
              <p>请在左侧选择或新建一个项目。</p>
            </EmptyState>
          ) : (
            <>
              <StaleArtifactNotice
                selectedBundle={selectedBundle}
                staleArtifacts={selectedStaleArtifacts}
                onNavigate={navigateWorkbench}
                onClear={clearArtifacts}
              />
              {shouldShowWorkbenchCockpit && workflow && designModel ? (
                <WorkbenchCockpit
                  model={designModel}
                  nextAction={workflow.nextAction}
                  isPending={uiPending}
                  onNavigate={navigateWorkbench}
                  onExecute={(step) => runProjectStep(step, getSuccessMessageForStep(step))}
                />
              ) : null}

              {isProjectDashboard && workflow && projectDashboardModel ? (
                <ProjectDashboard
                  model={projectDashboardModel}
                  nextAction={workflow.nextAction}
                  isPending={uiPending}
                  onCreateProject={() => requestSidebarAction("create")}
                  onCocreateTopic={() => requestSidebarAction("cocreate")}
                  onSelectProject={selectProjectFromDashboard}
                  onNavigate={navigateWorkbench}
                  onExecute={(step) => runProjectStep(step, getSuccessMessageForStep(step))}
                />
              ) : null}

              {isWorkbenchDashboard && workflow && designModel ? (
                <WorkbenchWorkspace
                  model={designModel}
                  nextAction={workflow.nextAction}
                  isPending={uiPending}
                  onNavigate={navigateWorkbench}
                  onExecute={(step) => runProjectStep(step, getSuccessMessageForStep(step))}
                />
              ) : null}

              {isJudgementWorkspace && judgementModel ? (
                <JudgementWorkspace
                  model={judgementModel}
                  selectedBundle={selectedBundle}
                  activeSection={focusedSection}
                  setSelectedBundle={setSelectedBundle}
                  isPending={uiPending}
                  onNavigate={navigateWorkbench}
                  onExecute={(step) => runProjectStep(step, getSuccessMessageForStep(step))}
                  onSaveProjectFrame={saveProjectFrame}
                />
              ) : null}

              {isCompatibilityWorkspace && compatibilityModel ? (
                <CompatibilityWorkspace
                  model={compatibilityModel}
                  isPending={uiPending}
                  onNavigate={navigateWorkbench}
                />
              ) : null}

              {isResearchIntake && researchIntakeModel ? (
                <ResearchIntakeWorkspace
                  model={researchIntakeModel}
                  selectedBundle={selectedBundle}
                  selectedProjectId={selectedProjectId}
                  activeSection={focusedSection}
                  setSelectedBundle={setSelectedBundle}
                  refreshProjectsAndBundle={refreshProjectsAndBundle}
                  isPending={uiPending}
                  setIsPending={setIsPending}
                  setMessage={showFeedback}
                  markArtifactsStale={markArtifactsStale}
                  onNavigate={navigateWorkbench}
                  onExecute={(step) => runProjectStep(step, getSuccessMessageForStep(step))}
                />
              ) : null}

              {isSourceLibrary && sourceLibraryModel ? (
                <SourceLibraryWorkspace
                  model={sourceLibraryModel}
                  selectedSourceCardId={inspectorSelection?.kind === "source-card" ? inspectorSelection.sourceCardId : null}
                  isPending={uiPending}
                  onNavigate={navigateWorkbench}
                  onExecute={(step) => runProjectStep(step, getSuccessMessageForStep(step))}
                  onInspectorSelectionChange={setInspectorSelection}
                />
              ) : null}

              {isSectorModelWorkspace && sectorModelWorkspaceModel ? (
                <SectorModelWorkspace
                  model={sectorModelWorkspaceModel}
                  selectedBundle={selectedBundle}
                  selectedProjectId={selectedProjectId}
                  setSelectedBundle={setSelectedBundle}
                  refreshProjectsAndBundle={refreshProjectsAndBundle}
                  isPending={uiPending}
                  setIsPending={setIsPending}
                  setMessage={showFeedback}
                  markArtifactsStale={markArtifactsStale}
                  onExecute={(step) => runProjectStep(step, getSuccessMessageForStep(step))}
                  displayMode={displayMode}
                />
              ) : null}

              {isOutlineEditor && outlineEditorModel ? (
                <OutlineEditorWorkspace
                  model={outlineEditorModel}
                  selectedSectionId={inspectorSelection?.kind === "outline-section" ? inspectorSelection.sectionId : null}
                  isPending={uiPending}
                  onExecute={(step) => runProjectStep(step, getSuccessMessageForStep(step))}
                  onInspectorSelectionChange={setInspectorSelection}
                />
              ) : null}

              {isDraftEditor && draftEditorModel ? (
                <DraftEditorWorkspace
                  model={draftEditorModel}
                  selectedSectionId={inspectorSelection?.kind === "outline-section" ? inspectorSelection.sectionId : null}
                  isPending={uiPending}
                  onNavigate={navigateWorkbench}
                  onExecute={(step) => runProjectStep(step, getSuccessMessageForStep(step))}
                  onSaveEditedDraft={saveEditedDraft}
                  onInspectorSelectionChange={setInspectorSelection}
                />
              ) : null}

              {isPublishCenter && publishCenterModel ? (
                <PublishCenterWorkspace
                  model={publishCenterModel}
                  isPending={uiPending}
                  exportHref={`/api/projects/${selectedProjectId}/export/markdown`}
                  onNavigate={navigateWorkbench}
                  onRunReview={() => runProjectStep("review", getSuccessMessageForStep("review"))}
                  onGeneratePublishPrep={generatePublishPrep}
                />
              ) : null}

              {activeTab === "overview" && !isProjectDashboard && !isWorkbenchDashboard && !isJudgementWorkspace && !isCompatibilityWorkspace && (
                <section role="tabpanel" id="workbench-panel-overview" aria-labelledby="workbench-tab-overview">
                <OverviewTab 
                  selectedBundle={selectedBundle}
                  setSelectedBundle={setSelectedBundle}
                  isPending={uiPending}
                  runProjectStep={runProjectStep}
                  generatePublishPrep={generatePublishPrep}
                  saveProjectFrame={saveProjectFrame}
                  setFocusedSection={setFocusedSection}
                  focusSection={focusedSection}
                  onNavigate={navigateWorkbench}
                  onInspectorSelectionChange={setInspectorSelection}
                />
                </section>
              )}

              {activeTab === "research" && !isResearchIntake && !isSourceLibrary && (
                <section role="tabpanel" id="workbench-panel-research" aria-labelledby="workbench-tab-research">
                <ResearchTab 
                  selectedBundle={selectedBundle}
                  setSelectedBundle={setSelectedBundle}
                  selectedProjectId={selectedProjectId}
                  refreshProjectsAndBundle={refreshProjectsAndBundle}
	                  isPending={uiPending}
	                  setIsPending={setIsPending}
	                  setMessage={showFeedback}
                  markArtifactsStale={markArtifactsStale}
	                  runProjectStep={runProjectStep}
                  focusSection={mapResearchFocus(focusedSection)}
                  onInspectorSelectionChange={setInspectorSelection}
                  displayMode={displayMode}
                />
                </section>
              )}

              {((activeTab === "structure" && !isSectorModelWorkspace && !isOutlineEditor) || (activeTab === "drafts" && !isDraftEditor) || (activeTab === "publish" && !isPublishCenter)) && (
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
	                  isPending={uiPending}
	                  setIsPending={setIsPending}
	                  setMessage={showFeedback}
                  markArtifactsStale={markArtifactsStale}
                  runProjectStep={runProjectStep}
                  generatePublishPrep={generatePublishPrep}
                  surfaceTitle={activeTab === "structure" ? "结构" : activeTab === "publish" ? "发布" : "写作"}
                  surfaceMode={activeTab === "structure" ? "structure" : activeTab === "publish" ? "publish" : "writing"}
                  onOpenVitalityCheck={() => {
                    navigateWorkbench("overview", "overview-vitality");
                  }}
                  onInspectorSelectionChange={setInspectorSelection}
                  displayMode={displayMode}
                  focusSection={
                    activeTab === "structure"
                      ? mapStructureFocus(focusedSection)
                      : activeTab === "publish"
                        ? "publish-prep"
                        : mapWritingFocus(focusedSection)
                  }
                />
                </section>
              )}
            </>
          )}
    </AppShell>
  );

  function showFeedback(text: string, forcedKind?: MessageKind) {
    if (!text.trim()) {
      setFeedback(null);
      return;
    }
    setFeedback({ text, kind: forcedKind ?? inferMessageKind(text) });
  }
}

function HeaderActions({
  activeView,
  selectedProjectId,
  selectedBundle,
  isPending,
  onCreateProject,
  onCocreateTopic,
  onNavigate,
  onExecute,
  onGeneratePublishPrep,
}: {
  activeView: WorkbenchView;
  selectedProjectId: string;
  selectedBundle: ProjectBundle | null;
  isPending: boolean;
  onCreateProject: () => void;
  onCocreateTopic: () => void;
  onNavigate: (tab: ActiveTab, section: WorkspaceSection) => void;
  onExecute: (step: WorkbenchStepPath) => Promise<void>;
  onGeneratePublishPrep: () => Promise<void>;
}) {
  if (activeView === "projects") {
    return (
      <>
        <Button type="button" variant="secondary" size="md" onClick={onCocreateTopic}>
          选题共创
        </Button>
        <Button type="button" variant="primary" size="md" onClick={onCreateProject}>
          新建项目
        </Button>
      </>
    );
  }

  if (activeView === "sources") {
    return (
      <>
        <Button type="button" variant="secondary" size="md" disabled={isPending} onClick={() => void onExecute("research-brief")}>
          批量整理
        </Button>
        <Button type="button" variant="primary" size="md" onClick={() => onNavigate("research", "source-form")}>
          新增资料卡
        </Button>
      </>
    );
  }

  if (activeView === "outline") {
    return (
      <>
        <Button type="button" variant="secondary" size="md" disabled={isPending} onClick={() => void onExecute("outline")}>
          自动生成
        </Button>
        <Button type="button" variant="secondary" size="md" disabled>
          新增章节
        </Button>
        <Button type="button" variant="primary" size="md" disabled title="提纲页目前自动同步，暂未开放顶部手动保存。">
          保存提纲
        </Button>
      </>
    );
  }

  if (activeView === "draft") {
    return (
      <>
        <Button type="button" variant="secondary" size="md" disabled>
          保存
        </Button>
        <Button type="button" variant="secondary" size="md" onClick={() => onNavigate("overview", "overview-style-core")}>
          专注模式
        </Button>
        <Button type="button" variant="secondary" size="md" disabled>
          版本历史
        </Button>
        <Button type="button" variant="primary" size="md" disabled={isPending || !selectedBundle?.articleDraft} onClick={() => void onExecute("review")}>
          继续写作
        </Button>
      </>
    );
  }

  if (activeView === "publish") {
    return (
      <>
        {selectedProjectId ? (
          <a className="secondary-button button-size-md app-header-link" href={`/api/projects/${selectedProjectId}/export/markdown`} target="_blank" rel="noreferrer">
            导出 Markdown
          </a>
        ) : null}
        <Button type="button" variant="secondary" size="md" disabled>
          生成 DOCX
        </Button>
        <Button type="button" variant="secondary" size="md" disabled>
          复制公众号版
        </Button>
        <Button type="button" variant="primary" size="md" disabled={isPending || !selectedBundle?.articleDraft} onClick={() => void onGeneratePublishPrep()}>
          确认发布
        </Button>
      </>
    );
  }

  return (
    <>
      <Button type="button" variant="secondary" size="md" onClick={() => onNavigate("publish", "publish-prep")}>
        导出
      </Button>
      <Button type="button" variant="primary" size="md" onClick={() => onNavigate("drafts", "drafts")}>
        继续写作
      </Button>
    </>
  );
}

function getAppHeaderMeta({
  activeView,
  selectedBundle,
}: {
  activeView: WorkbenchView;
  selectedBundle: ProjectBundle | null;
}) {
  const titleByView: Record<WorkbenchView, string> = {
    projects: "项目",
    workbench: selectedBundle?.project.topic ?? "工作台",
    sources: "资料卡库",
    outline: "文章提纲",
    draft: selectedBundle?.project.topic ?? "正文",
    publish: "发布与导出",
    settings: "设置",
  };
  const stageLabel = selectedBundle ? formatProjectStage(selectedBundle.project.stage) : "未选择项目";
  const savedLabel = selectedBundle ? `最后保存：${formatHeaderTime(selectedBundle.project.updatedAt)}` : "请选择或新建项目";

  return {
    kicker: activeView === "projects" ? "当前项目" : getWorkbenchViewLabel(activeView),
    title: titleByView[activeView],
    detail: activeView === "projects" ? "管理你的研究与写作项目，洞察进度，把控全局。" : `${savedLabel} · ${stageLabel}`,
  };
}

function formatHeaderTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "今天";
  }
  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
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

function getActiveWorkbenchView(activeTab: ActiveTab, focusedSection: WorkspaceSection): WorkbenchView {
  if (activeTab === "research") {
    return "sources";
  }
  if (activeTab === "structure") {
    return "outline";
  }
  if (activeTab === "drafts") {
    return "draft";
  }
  if (activeTab === "publish") {
    return "publish";
  }
  if (focusedSection === null) {
    return "projects";
  }
  return "workbench";
}

function reconcileStaleArtifactsForCompletedJob(
  step: JobStep,
  projectId: string,
  clearArtifacts: (artifacts: StaleArtifact[], projectId?: string) => void,
  markArtifactsStale: (artifacts: StaleArtifact[], projectId?: string) => void,
) {
  switch (step) {
    case "research-brief":
      clearArtifacts(["research-brief"], projectId);
      markArtifactsStale(["sector-model", "outline", "drafts", "review", "publish-prep"], projectId);
      return;
    case "sector-model":
      clearArtifacts(["sector-model"], projectId);
      markArtifactsStale(["outline", "drafts", "review", "publish-prep"], projectId);
      return;
    case "outline":
      clearArtifacts(["outline"], projectId);
      markArtifactsStale(["drafts", "review", "publish-prep"], projectId);
      return;
    case "drafts":
      clearArtifacts(["drafts"], projectId);
      markArtifactsStale(["review", "publish-prep"], projectId);
      return;
    case "review":
      clearArtifacts(["review"], projectId);
      markArtifactsStale(["publish-prep"], projectId);
      return;
    case "publish-prep":
      clearArtifacts(["publish-prep"], projectId);
      return;
    default:
      return;
  }
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
      return "段落提纲";
    case "drafts":
      return "双稿";
    case "review":
      return "VitalityCheck";
    case "publish-prep":
      return "发布整理";
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
      return { tab: "overview", section: "overview-vitality" };
    case "publish-prep":
      return { tab: "publish", section: "publish-prep" };
  }
}

function getResultTabForStep(path: WorkbenchStepPath): ActiveTab {
  switch (path) {
    case "research-brief":
      return "research";
    case "sector-model":
    case "outline":
      return "structure";
    case "drafts":
      return "drafts";
    case "review":
    default:
      return "overview";
  }
}

function getResultSectionForStep(path: WorkbenchStepPath): WorkspaceSection {
  switch (path) {
    case "research-brief":
      return "research-brief";
    case "sector-model":
      return "sector-model";
    case "outline":
      return "outline";
    case "drafts":
      return "drafts";
    case "review":
      return "overview-vitality";
    default:
      return null;
  }
}

function getSuccessMessageForStep(path: WorkbenchStepPath) {
  switch (path) {
    case "research-brief":
      return "研究清单已生成。";
    case "sector-model":
      return "板块建模已生成。";
    case "outline":
      return "提纲已生成。";
    case "drafts":
      return "双稿初稿已生成。";
    case "review":
    default:
      return "质检报告已更新。";
  }
}

function getResultTabForJobStep(step: JobStep): ActiveTab {
  switch (step) {
    case "research-brief":
    case "source-card-extract":
    case "source-card-summarize":
      return "research";
    case "sector-model":
    case "outline":
      return "structure";
    case "drafts":
      return "drafts";
    case "publish-prep":
      return "publish";
    case "review":
    default:
      return "overview";
  }
}

function getResultSectionForJobStep(step: JobStep): WorkspaceSection {
  switch (step) {
    case "research-brief":
      return "research-brief";
    case "source-card-extract":
    case "source-card-summarize":
      return "source-form";
    case "sector-model":
      return "sector-model";
    case "outline":
      return "outline";
    case "drafts":
      return "drafts";
    case "publish-prep":
      return "publish-prep";
    case "review":
    default:
      return "overview-vitality";
  }
}

function getSuccessMessageForJobStep(step: JobStep) {
  switch (step) {
    case "research-brief":
      return "研究清单已生成。";
    case "source-card-extract":
      return "链接正文已抓取完成。";
    case "source-card-summarize":
      return "资料摘要已生成。";
    case "sector-model":
      return "板块建模已生成。";
    case "outline":
      return "提纲已生成。";
    case "drafts":
      return "双稿初稿已生成。";
    case "publish-prep":
      return "发布前整理稿已生成。";
    case "review":
    default:
      return "质检报告已更新。";
  }
}

function getFailureMessageForJobStep(step: JobStep) {
  switch (step) {
    case "research-brief":
      return "生成研究清单失败。";
    case "source-card-extract":
      return "从链接抓正文失败。";
    case "source-card-summarize":
      return "生成资料摘要失败。";
    case "sector-model":
      return "生成板块建模失败。";
    case "outline":
      return "生成提纲失败。";
    case "drafts":
      return "生成双稿失败。";
    case "publish-prep":
      return "生成发布前整理稿失败。";
    case "review":
    default:
      return "运行质检失败。";
  }
}

function getQueuedMessageForStep(step: WorkbenchStepPath) {
  switch (step) {
    case "research-brief":
      return "研究清单任务已入队，正在后台执行。";
    case "sector-model":
      return "板块建模任务已入队，正在后台执行。";
    case "outline":
      return "提纲任务已入队，正在后台执行。";
    case "drafts":
      return "双稿任务已入队，正在后台执行。";
    case "review":
      return "质检任务已入队，正在后台执行。";
    default:
      return "任务已入队，正在后台执行。";
  }
}

function inferMessageKind(text: string): MessageKind {
  const infoPatterns = [/请先/, /需要先/, /还没有/, /暂时不能/, /先填/, /先点/, /待作者补/];
  const errorPatterns = [/失败/, /不存在/, /超时/, /禁止/, /不完整/, /无法/, /被截断/, /调用失败/, /已取消/];

  if (infoPatterns.some((pattern) => pattern.test(text))) {
    return "info";
  }
  if (errorPatterns.some((pattern) => pattern.test(text))) {
    return "error";
  }
  return "success";
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

function getProjectViewState(stage?: ProjectStage): { tab: ActiveTab; section: WorkspaceSection } {
  switch (stage) {
    case "ThinkCard / HKR":
      return { tab: "overview", section: null };
    case "StyleCore":
      return { tab: "overview", section: null };
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
      return { tab: "overview", section: "overview-vitality" };
    case "发布前整理":
      return { tab: "publish", section: "publish-prep" };
    case "选题定义":
    default:
      return { tab: "overview", section: null };
  }
}
