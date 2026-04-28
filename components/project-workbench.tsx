"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import type { ArticleProject, ProjectBundle, ProjectStage, SampleArticle } from "@/lib/types";
import { ProjectSidebar } from "./workbench/ProjectSidebar";
import { OverviewTab } from "./workbench/OverviewTab";
import { ResearchTab } from "./workbench/ResearchTab";
import { DraftsTab } from "./workbench/DraftsTab";
import { ReviewSidebar } from "./workbench/ReviewSidebar";
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

type ActiveTab = "overview" | "research" | "structure" | "drafts" | "publish";
type WorkbenchStepPath = "research-brief" | "sector-model" | "outline" | "drafts" | "review";
type StaleArtifact = "research-brief" | "sector-model" | "outline" | "drafts" | "review" | "publish-prep";
type WorkspaceSection =
  | "overview-think-card"
  | "overview-style-core"
  | "overview-compatibility"
  | "overview-vitality"
  | "research-brief"
  | "source-form"
  | "source-library"
  | "sector-model"
  | "outline"
  | "drafts"
  | "publish-prep"
  | null;
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
  const [activeTab, setActiveTab] = useState<ActiveTab>(initialView.tab);
  const [focusedSection, setFocusedSection] = useState<WorkspaceSection>(initialView.section);
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
      const stored = window.localStorage.getItem("workbench-stale-artifacts");
      if (stored) {
        setStaleArtifactsByProject(JSON.parse(stored) as Record<string, StaleArtifact[]>);
      }
    } catch {
      setStaleArtifactsByProject({});
    }
  }, []);

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

  const appHeader = (
    <>
        <div className="topbar-left">
          <h1 className="topbar-title">上海板块写作工作台</h1>
        </div>
        <div className="topbar-right">
          <div className="mode-chip service-status-chip">
            <span className="service-status-dot" aria-hidden="true" />
            {process.env.NEXT_PUBLIC_MODEL_MODE ? `模型模式：${process.env.NEXT_PUBLIC_MODEL_MODE}` : "本地服务已连接"}
          </div>
          <button type="button" className="mode-chip task-center-trigger" onClick={() => setIsTaskCenterOpen(true)}>
            后台任务 {queueSummary.runningCount} 运行 / {queueSummary.queuedCount} 排队
          </button>
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
        />
  );

  const appInspector = selectedBundle ? (
    <ReviewSidebar
      selectedBundle={selectedBundle}
      activeTab={activeTab}
      focusedSection={focusedSection}
      isPending={uiPending}
      onNavigate={(tab, section) => {
        setActiveTab(tab);
        setFocusedSection(section);
      }}
      onExecute={(step) => runProjectStep(step, getSuccessMessageForStep(step))}
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
                onNavigate={(tab, section) => {
                  setActiveTab(tab);
                  setFocusedSection(section);
                }}
                onClear={clearArtifacts}
              />
              <div className="workflow-tabs" role="tablist" aria-label="工作台主阶段" onKeyDown={handleTabListKeyDown}>
                <button
                  type="button"
                  role="tab"
                  className={`tab-button ${activeTab === "overview" ? "active" : ""}`}
                  onClick={() => {
                    setActiveTab("overview");
                    setFocusedSection(null);
                  }}
                  data-tab="overview"
                  aria-selected={activeTab === "overview"}
                  aria-controls="workbench-panel-overview"
                  id="workbench-tab-overview"
                  tabIndex={activeTab === "overview" ? 0 : -1}
                >
                  <StageIcon name="overview" />
                  <span>判断</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  className={`tab-button ${activeTab === "research" ? "active" : ""}`}
                  onClick={() => {
                    setActiveTab("research");
                    setFocusedSection(null);
                  }}
                  data-tab="research"
                  aria-selected={activeTab === "research"}
                  aria-controls="workbench-panel-research"
                  id="workbench-tab-research"
                  tabIndex={activeTab === "research" ? 0 : -1}
                >
                  <StageIcon name="research" />
                  <span>资料</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  className={`tab-button ${activeTab === "structure" ? "active" : ""}`}
                  onClick={() => {
                    setActiveTab("structure");
                    setFocusedSection(null);
                  }}
                  data-tab="structure"
                  aria-selected={activeTab === "structure"}
                  aria-controls="workbench-panel-structure"
                  id="workbench-tab-structure"
                  tabIndex={activeTab === "structure" ? 0 : -1}
                >
                  <StageIcon name="structure" />
                  <span>结构</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  className={`tab-button ${activeTab === "drafts" ? "active" : ""}`}
                  onClick={() => {
                    setActiveTab("drafts");
                    setFocusedSection(null);
                  }}
                  data-tab="drafts"
                  aria-selected={activeTab === "drafts"}
                  aria-controls="workbench-panel-drafts"
                  id="workbench-tab-drafts"
                  tabIndex={activeTab === "drafts" ? 0 : -1}
                >
                  <StageIcon name="drafts" />
                  <span>写作</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  className={`tab-button ${activeTab === "publish" ? "active" : ""}`}
                  onClick={() => {
                    setActiveTab("publish");
                    setFocusedSection("publish-prep");
                  }}
                  data-tab="publish"
                  aria-selected={activeTab === "publish"}
                  aria-controls="workbench-panel-publish"
                  id="workbench-tab-publish"
                  tabIndex={activeTab === "publish" ? 0 : -1}
                >
                  <StageIcon name="publish" />
                  <span>发布</span>
                </button>
              </div>

              {activeTab === "overview" && (
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
                />
                </section>
              )}

              {activeTab === "research" && (
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
                />
                </section>
              )}

              {(activeTab === "structure" || activeTab === "drafts" || activeTab === "publish") && (
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
                    setActiveTab("overview");
                    setFocusedSection("overview-vitality");
                  }}
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

function StageIcon({ name }: { name: ActiveTab }) {
  if (name === "overview") {
    return (
      <svg className="tab-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 3.5 19 6v5.5c0 4.1-2.4 7.2-7 9-4.6-1.8-7-4.9-7-9V6l7-2.5Z" />
        <path d="m9.5 12 1.7 1.7 3.8-4.1" />
      </svg>
    );
  }
  if (name === "research") {
    return (
      <svg className="tab-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M7 4.5h8l2 2V19a1.5 1.5 0 0 1-1.5 1.5h-8A1.5 1.5 0 0 1 6 19V6A1.5 1.5 0 0 1 7.5 4.5Z" />
        <path d="M15 4.5V7h2.5" />
        <path d="M9 10h6M9 14h6M9 17h4" />
      </svg>
    );
  }
  if (name === "structure") {
    return (
      <svg className="tab-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 4.5v5M7 14h10M7 14v5M17 14v5" />
        <rect x="9" y="3" width="6" height="4" rx="1.2" />
        <rect x="4" y="17" width="6" height="4" rx="1.2" />
        <rect x="14" y="17" width="6" height="4" rx="1.2" />
      </svg>
    );
  }
  if (name === "drafts") {
    return (
      <svg className="tab-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M5 19.5 6.1 15 15.4 5.7a2 2 0 0 1 2.8 2.8L8.9 17.8 5 19.5Z" />
        <path d="m14 7 3 3" />
      </svg>
    );
  }
  return (
    <svg className="tab-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12h12" />
      <path d="m13 7 5 5-5 5" />
      <path d="M6 6.5h4M6 17.5h4" />
    </svg>
  );
}

function handleTabListKeyDown(event: KeyboardEvent<HTMLDivElement>) {
  if (event.key !== "ArrowRight" && event.key !== "ArrowLeft" && event.key !== "Home" && event.key !== "End") {
    return;
  }
  const tabs = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
  const currentIndex = tabs.findIndex((tab) => tab === document.activeElement);
  if (tabs.length === 0 || currentIndex === -1) {
    return;
  }
  event.preventDefault();
  const lastIndex = tabs.length - 1;
  const nextIndex =
    event.key === "Home"
      ? 0
      : event.key === "End"
        ? lastIndex
        : event.key === "ArrowRight"
          ? currentIndex === lastIndex ? 0 : currentIndex + 1
          : currentIndex === 0 ? lastIndex : currentIndex - 1;
  tabs[nextIndex]?.focus();
  tabs[nextIndex]?.click();
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
