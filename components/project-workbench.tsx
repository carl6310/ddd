"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ArticleProject, ProjectBundle, ProjectStage, SampleArticle } from "@/lib/types";
import { ProjectSidebar } from "./workbench/ProjectSidebar";
import { OverviewTab } from "./workbench/OverviewTab";
import { ResearchTab } from "./workbench/ResearchTab";
import { DraftsTab } from "./workbench/DraftsTab";
import { ReviewSidebar } from "./workbench/ReviewSidebar";
import { JobLogPanel } from "./workbench/job-log-panel";
import { useJobPolling, type JobDetail, type ProjectJobSummary } from "@/hooks/use-job-polling";
import { useJobAction } from "@/hooks/use-job-action";
import type { JobStatus, JobStep } from "@/lib/jobs/types";
import { Toast } from "./ui/toast";

type ActiveTab = "overview" | "research" | "drafts";
type WorkbenchStepPath = "research-brief" | "sector-model" | "outline" | "drafts" | "review";
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
  const [activeTab, setActiveTab] = useState<ActiveTab>(initialView.tab);
  const [focusedSection, setFocusedSection] = useState<WorkspaceSection>(initialView.section);
  const lastAutoNavigatedProjectId = useRef(initialSelectedBundle?.project.id ?? "");
  const previousJobStatuses = useRef(new Map<string, JobStatus>());
  const handledTerminalJobs = useRef(new Set<string>());
  const { jobs, refresh: refreshJobs, loadJobDetail } = useJobPolling(selectedProjectId);
  const stepJobAction = useJobAction({ trackDetail: false });
  const publishPrepJobAction = useJobAction({ trackDetail: false });

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

  const highlightedJob = useMemo(() => {
    return jobs.find((job) => job.status === "queued" || job.status === "running") ?? jobs.find((job) => job.status === "failed") ?? null;
  }, [jobs]);

  useEffect(() => {
    if (!highlightedJob) {
      setJobDetail(null);
      return;
    }

    void loadJobDetail(highlightedJob.id)
      .then((detail) => {
        setJobDetail(detail);
      })
      .catch((error) => {
        showFeedback(error instanceof Error ? error.message : "读取任务详情失败。");
      });
  }, [highlightedJob, loadJobDetail]);

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
      }

      if ((previousStatus === "queued" || previousStatus === "running") && job.status === "failed") {
        handledTerminalJobs.current.add(job.id);
        failedJobs.push(job);
      }
    }

    if (completedJobs.length > 0) {
      const latestCompletedJob = completedJobs[0];
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
  }, [jobs, loadJobDetail, refreshProjectsAndBundle, selectedProjectId]);

  const stepSubmissionPending = stepJobAction.isSubmitting || publishPrepJobAction.isSubmitting;
  const uiPending = isPending || stepSubmissionPending;

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
        throw new Error(payload.error || "保存 ThinkCard / StyleCore 失败。");
      }
      await refreshProjectsAndBundle(selectedProjectId);
      showFeedback("ThinkCard / StyleCore 已保存。", "success");
    } catch (error) {
      showFeedback(error instanceof Error ? error.message : "保存 ThinkCard / StyleCore 失败。");
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
      setActiveTab("drafts");
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
      showFeedback(payload.job?.deduped ? "已有同类任务在后台执行，已继续跟踪。" : "失败任务已重新入队。", "info");
    } catch (error) {
      showFeedback(error instanceof Error ? error.message : "任务重试失败。");
    } finally {
      setIsRetryingJob(false);
    }
  }

  const detailedVisibleJob = jobDetail && highlightedJob && jobDetail.job.id === highlightedJob.id ? jobDetail.job : null;
  const visibleJob = detailedVisibleJob ?? highlightedJob;

  return (
    <main className="page-shell">
      <header className="page-topbar">
        <div className="topbar-left">
          <h1 className="topbar-title">上海板块写作工作台</h1>
        </div>
        <div className="topbar-right">
          <div className="mode-chip">{process.env.NEXT_PUBLIC_MODEL_MODE ? `模型模式：${process.env.NEXT_PUBLIC_MODEL_MODE}` : "本地服务已连接"}</div>
        </div>
      </header>

      <JobLogPanel
        job={visibleJob}
        logs={detailedVisibleJob ? jobDetail?.logsTail ?? [] : []}
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

      <section className="workspace-grid">
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

        <section className="panel main-panel">
          {!selectedBundle ? (
            <div className="card blank-state">
              <p>请在左侧选择或新建一个项目...</p>
            </div>
          ) : (
            <>
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
              <div className="workflow-tabs">
                <button
                  className={`tab-button ${activeTab === "overview" ? "active" : ""}`}
                  onClick={() => setActiveTab("overview")}
                  data-tab="overview"
                >
                  选题与检查
                </button>
                <button
                  className={`tab-button ${activeTab === "research" ? "active" : ""}`}
                  onClick={() => setActiveTab("research")}
                  data-tab="research"
                >
                  资料准备
                </button>
                <button
                  className={`tab-button ${activeTab === "drafts" ? "active" : ""}`}
                  onClick={() => setActiveTab("drafts")}
                  data-tab="drafts"
                >
                  写作推进
                </button>
              </div>

              {activeTab === "overview" && (
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
              )}

              {activeTab === "research" && (
                <ResearchTab 
                  selectedBundle={selectedBundle}
                  setSelectedBundle={setSelectedBundle}
                  selectedProjectId={selectedProjectId}
                  refreshProjectsAndBundle={refreshProjectsAndBundle}
                  isPending={uiPending}
                  setIsPending={setIsPending}
                  setMessage={showFeedback}
                  runProjectStep={runProjectStep}
                  focusSection={mapResearchFocus(focusedSection)}
                />
              )}

              {activeTab === "drafts" && (
                <DraftsTab 
                  selectedBundle={selectedBundle}
                  setSelectedBundle={setSelectedBundle}
                  selectedProjectId={selectedProjectId}
                  refreshProjectsAndBundle={refreshProjectsAndBundle}
                  isPending={uiPending}
                  setIsPending={setIsPending}
                  setMessage={showFeedback}
                  runProjectStep={runProjectStep}
                  generatePublishPrep={generatePublishPrep}
                  onOpenVitalityCheck={() => {
                    setActiveTab("overview");
                    setFocusedSection("overview-vitality");
                  }}
                  focusSection={mapDraftsFocus(focusedSection)}
                />
              )}
            </>
          )}
        </section>
      </section>
    </main>
  );

  function showFeedback(text: string, forcedKind?: MessageKind) {
    if (!text.trim()) {
      setFeedback(null);
      return;
    }
    setFeedback({ text, kind: forcedKind ?? inferMessageKind(text) });
  }
}

function getResultTabForStep(path: WorkbenchStepPath): ActiveTab {
  switch (path) {
    case "research-brief":
      return "research";
    case "sector-model":
    case "outline":
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
    case "drafts":
    case "publish-prep":
      return "drafts";
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

function mapDraftsFocus(section: WorkspaceSection) {
  if (section === "sector-model" || section === "outline" || section === "drafts" || section === "publish-prep" || section === null) {
    return section;
  }
  return null;
}

function getProjectViewState(stage?: ProjectStage): { tab: ActiveTab; section: WorkspaceSection } {
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
      return { tab: "drafts", section: "sector-model" };
    case "提纲生成":
      return { tab: "drafts", section: "outline" };
    case "正文生成":
      return { tab: "drafts", section: "drafts" };
    case "VitalityCheck":
      return { tab: "overview", section: "overview-vitality" };
    case "发布前整理":
      return { tab: "drafts", section: "publish-prep" };
    case "选题定义":
    default:
      return { tab: "overview", section: null };
  }
}
