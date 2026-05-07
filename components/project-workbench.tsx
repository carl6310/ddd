"use client";

import { useCallback, useEffect, useState } from "react";
import type { ArticleProject, ProjectBundle, SampleArticle } from "@/lib/types";
import { ProjectSidebar } from "./workbench/ProjectSidebar";
import { WorkbenchInspector, type WorkbenchInspectorSelection } from "./workbench/WorkbenchInspector";
import type { ProjectSidebarActionRequest } from "./workbench/ProjectSidebar";
import { WorkbenchMain } from "./workbench/workbench-main";
import { WorkbenchLayout } from "./workbench/workbench-layout";
import { JobLogPanel } from "./workbench/job-log-panel";
import { TaskCenterModal } from "./workbench/task-center-modal";
import { Toast } from "./ui/toast";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import type { WorkbenchView } from "@/lib/design/navigation";
import { getWorkbenchFlowByProjectStage, getWorkbenchFlowLabel } from "@/lib/workbench/flow-definition";
import { canPreparePublish } from "@/lib/workflow";
import { useProjectWorkbenchState } from "@/hooks/use-project-workbench-state";
import { useWorkbenchJobs } from "@/hooks/use-workbench-jobs";
import { useWorkbenchNavigation } from "@/hooks/use-workbench-navigation";
import {
  buildWorkbenchWorkflow,
  type ActiveTab,
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

type DraftHeaderAction = {
  id: number;
  kind: "save" | "focus" | "history";
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
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const showFeedback = useCallback((text: string, forcedKind?: MessageKind) => {
    if (!text.trim()) {
      setFeedback(null);
      return;
    }
    setFeedback({ text, kind: forcedKind ?? inferMessageKind(text) });
  }, []);
  const showWorkbenchError = useCallback((message: string) => showFeedback(message, "error"), [showFeedback]);
  const {
    projects,
    selectedProjectId,
    selectedBundle,
    selectedStaleArtifacts,
    sampleDigest,
    selectProject,
    setSelectedBundle,
    refreshProjectsAndBundle,
    markArtifactsStale,
    clearArtifacts,
  } = useProjectWorkbenchState({
    initialProjects,
    initialSamples,
    initialSelectedBundle,
    onError: showWorkbenchError,
  });
  const {
    activeTab,
    focusedSection,
    activeView,
    navigateWorkbench,
    changeWorkbenchView,
    markProjectAutoNavigated,
  } = useWorkbenchNavigation(selectedBundle);
  const [isPending, setIsPending] = useState(false);
  const [isTaskCenterOpen, setIsTaskCenterOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isPublishConfirmOpen, setIsPublishConfirmOpen] = useState(false);
  const [draftHeaderAction, setDraftHeaderAction] = useState<DraftHeaderAction | null>(null);
  const [sidebarActionRequest, setSidebarActionRequest] = useState<ProjectSidebarActionRequest | null>(null);
  const [inspectorSelection, setInspectorSelection] = useState<WorkbenchInspectorSelection>(null);
  const [displayMode, setDisplayMode] = useState<WorkbenchDisplayMode>("writing");
  const {
    jobs,
    queueSummary,
    refreshJobs,
    jobDetail,
    visibleJob,
    isRetryingJob,
    isSubmitting: jobSubmissionPending,
    runProjectStep,
    retryFailedJob,
    generatePublishPrep,
  } = useWorkbenchJobs({
    selectedProjectId,
    refreshProjectsAndBundle,
    markArtifactsStale,
    clearArtifacts,
    navigateWorkbench,
    showFeedback,
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      setDisplayMode(normalizeWorkbenchDisplayMode(window.localStorage.getItem(workbenchDisplayModeStorageKey)));
    } catch {
      setDisplayMode("writing");
    }
  }, []);

  function changeDisplayMode(mode: WorkbenchDisplayMode) {
    setDisplayMode(mode);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(workbenchDisplayModeStorageKey, mode);
    }
  }

  useEffect(() => {
    setInspectorSelection(null);
  }, [selectedProjectId]);

  const uiPending = isPending || jobSubmissionPending;

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
      showFeedback("人工改写稿已保存。体检和发布包可能需要重生成。", "success");
    } catch (error) {
      showFeedback(error instanceof Error ? error.message : "保存人工改写稿失败。", "error");
    } finally {
      setIsPending(false);
    }
  }

  const workflow = selectedBundle
    ? buildWorkbenchWorkflow({
        selectedBundle,
        staleArtifacts: selectedStaleArtifacts,
        activeTab,
        focusedSection,
        jobs,
      })
    : null;

  function selectProjectFromDashboard(projectId: string) {
    markProjectAutoNavigated(projectId);
    selectProject(projectId);
    navigateWorkbench("overview", null);
  }

  function requestSidebarAction(kind: ProjectSidebarActionRequest["kind"]) {
    setSidebarActionRequest({ kind, nonce: Date.now() });
  }

  const appHeaderMeta = getAppHeaderMeta({
    activeView,
    selectedBundle,
    nextActionTitle: workflow?.nextAction.title,
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
        <button
          type="button"
          className="app-icon-button"
          aria-label="搜索"
          title="搜索项目和资料"
          onClick={() => showFeedback("全局搜索会以 Popover 形式开放；当前请在项目列表和资料沉淀里使用搜索与筛选。", "info")}
        >
          ⌕
        </button>
        <button type="button" className="app-icon-button app-icon-button-notify" onClick={() => setIsTaskCenterOpen(true)} aria-label="后台任务" title="查看后台任务">
          ♢
        </button>
        <button
          type="button"
          className="app-avatar-button"
          onClick={() => setIsAccountMenuOpen((current) => !current)}
          aria-label="打开工作区菜单"
          aria-expanded={isAccountMenuOpen}
          title="打开工作区菜单"
        >
          C
        </button>
        {isAccountMenuOpen ? (
          <div className="app-account-menu" role="menu" aria-label="工作区菜单">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                changeDisplayMode(displayMode === "writing" ? "debug" : "writing");
                setIsAccountMenuOpen(false);
                showFeedback(displayMode === "writing" ? "已切到调试模式。" : "已切到写作模式。", "success");
              }}
            >
              <strong>{displayMode === "writing" ? "切到调试模式" : "切到写作模式"}</strong>
              <span>控制内部字段和调试信息是否显示</span>
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsTaskCenterOpen(true);
                setIsAccountMenuOpen(false);
              }}
            >
              <strong>后台任务</strong>
              <span>查看运行中、失败和可重试任务</span>
            </button>
          </div>
        ) : null}
        <div className={`app-header-actions app-header-actions-${activeView}`} aria-label="当前页面操作">
          <HeaderActions
            activeView={activeView}
            selectedProjectId={selectedProjectId}
            selectedBundle={selectedBundle}
            isPending={uiPending}
            onCreateProject={() => requestSidebarAction("create")}
            onCocreateTopic={() => requestSidebarAction("cocreate")}
            onNavigate={navigateWorkbench}
            onExecute={(step) => runProjectStep(step)}
            onConfirmPublish={() => setIsPublishConfirmOpen(true)}
            onDraftAction={(kind) => {
              navigateWorkbench("drafts", "drafts");
              setDraftHeaderAction({ id: Date.now(), kind });
            }}
            onInform={showFeedback}
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
        logs={jobDetail?.job ? jobDetail.logsTail : []}
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

      <Modal
        open={isPublishConfirmOpen}
        onClose={() => setIsPublishConfirmOpen(false)}
        title="确认生成发布包"
        description="这一步不会外发内容，只会生成标题候选、摘要、配图建议和发布检查结果。"
        kind="alert"
        size="sm"
      >
        <div className="app-confirm-panel">
          <p>如果正文或质量检查还没有完成，系统会保留风险提示；完成后可以再回到体检发布重新生成。</p>
          <div className="app-confirm-actions">
            <Button type="button" variant="secondary" onClick={() => setIsPublishConfirmOpen(false)}>
              先不处理
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={uiPending || !selectedBundle?.articleDraft}
              onClick={() => {
                setIsPublishConfirmOpen(false);
                void generatePublishPrep();
              }}
            >
              确认整理
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );

  const appSidebar = (
    <ProjectSidebar
          projects={projects}
          selectedProjectId={selectedProjectId}
          setSelectedProjectId={selectProject}
          isPending={uiPending}
          setIsPending={setIsPending}
          setMessage={showFeedback}
          refreshProjectsAndBundle={refreshProjectsAndBundle}
          sampleDigest={sampleDigest}
          displayMode={displayMode}
          activeView={activeView}
          workflowSteps={workflow?.steps ?? []}
          onViewChange={changeWorkbenchView}
          actionRequest={sidebarActionRequest}
        />
  );

  const shouldShowAppInspector =
    selectedBundle &&
    activeView !== "dashboard" &&
    activeView !== "publish" &&
    activeView !== "outline" &&
    !(activeView === "evidence" && focusedSection === "source-library");
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
      onExecute={(step) => runProjectStep(step)}
      displayMode={displayMode}
    />
  ) : null;

  return (
    <WorkbenchLayout header={appHeader} overlays={appOverlays} sidebar={appSidebar} inspector={appInspector}>
      <WorkbenchMain
        activeView={activeView}
        activeTab={activeTab}
        focusedSection={focusedSection}
        projects={projects}
        selectedBundle={selectedBundle}
        selectedProjectId={selectedProjectId}
        staleArtifacts={selectedStaleArtifacts}
        jobs={jobs}
        queueSummary={queueSummary}
        workflow={workflow}
        inspectorSelection={inspectorSelection}
        draftHeaderAction={draftHeaderAction}
        displayMode={displayMode}
        isPending={uiPending}
        setSelectedBundle={setSelectedBundle}
        setIsPending={setIsPending}
        setMessage={showFeedback}
        refreshProjectsAndBundle={refreshProjectsAndBundle}
        markArtifactsStale={markArtifactsStale}
        clearArtifacts={clearArtifacts}
        onNavigate={navigateWorkbench}
        onExecute={(step) => runProjectStep(step)}
        onCreateProject={() => requestSidebarAction("create")}
        onCocreateTopic={() => requestSidebarAction("cocreate")}
        onSelectProject={selectProjectFromDashboard}
        onSaveProjectFrame={saveProjectFrame}
        onSaveEditedDraft={saveEditedDraft}
        onGeneratePublishPrep={generatePublishPrep}
        onInspectorSelectionChange={setInspectorSelection}
      />
    </WorkbenchLayout>
  );
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
  onConfirmPublish,
  onDraftAction,
  onInform,
}: {
  activeView: WorkbenchView;
  selectedProjectId: string;
  selectedBundle: ProjectBundle | null;
  isPending: boolean;
  onCreateProject: () => void;
  onCocreateTopic: () => void;
  onNavigate: (tab: ActiveTab, section: WorkspaceSection) => void;
  onExecute: (step: WorkbenchStepPath) => Promise<void>;
  onConfirmPublish: () => void;
  onDraftAction: (kind: DraftHeaderAction["kind"]) => void;
  onInform: (text: string, forcedKind?: MessageKind) => void;
}) {
  if (activeView === "dashboard") {
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

  if (activeView === "judgement") {
    return (
      <>
        <Button type="button" variant="secondary" size="md" disabled={isPending} onClick={() => onNavigate("overview", "overview-style-core")}>
          表达策略
        </Button>
        <Button type="button" variant="primary" size="md" disabled={isPending} onClick={() => onInform("请在选题判断页完成修改后点“保存判断”。", "info")}>
          保存判断
        </Button>
      </>
    );
  }

  if (activeView === "evidence") {
    return (
      <>
        <Button type="button" variant="secondary" size="md" disabled={isPending} onClick={() => void onExecute("research-brief")}>
          生成研究清单
        </Button>
        <Button type="button" variant="primary" size="md" onClick={() => onNavigate("research", "source-form")}>
          新增资料卡
        </Button>
      </>
    );
  }

  if (activeView === "model") {
    return (
      <>
        <Button type="button" variant="secondary" size="md" onClick={() => onNavigate("research", "source-library")}>
          查看资料
        </Button>
        <Button type="button" variant="primary" size="md" disabled={isPending} onClick={() => void onExecute("sector-model")}>
          生成板块建模
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
        <Button type="button" variant="secondary" size="md" className="planned-action" data-planned="true" onClick={() => onInform("新增章节会以局部编辑状态开放；当前请先用自动生成或在提纲详情中调整。", "info")}>
          新增章节
        </Button>
        <Button type="button" variant="primary" size="md" className="planned-action" data-planned="true" title="提纲页目前自动同步，暂未开放顶部手动保存。" onClick={() => onInform("提纲页当前是自动同步视图，顶部手动保存会在局部编辑能力完成后开放。", "info")}>
          保存提纲
        </Button>
      </>
    );
  }

  if (activeView === "draft") {
    return (
      <>
        <Button type="button" variant="secondary" size="md" disabled={isPending || !selectedBundle?.articleDraft} onClick={() => onDraftAction("save")}>
          保存
        </Button>
        <Button type="button" variant="secondary" size="md" disabled={!selectedBundle?.articleDraft} onClick={() => onDraftAction("focus")}>
          专注模式
        </Button>
        <Button type="button" variant="secondary" size="md" disabled={!selectedBundle?.articleDraft} onClick={() => onDraftAction("history")}>
          版本历史
        </Button>
        <Button type="button" variant="primary" size="md" disabled={isPending || !selectedBundle?.articleDraft} onClick={() => void onExecute("review")}>
          继续写作
        </Button>
      </>
    );
  }

  if (activeView === "publish") {
    const hasReview = Boolean(selectedBundle?.reviewReport);
    const canGeneratePublishPrep = Boolean(
      selectedBundle?.reviewReport && canPreparePublish(selectedBundle.reviewReport, selectedBundle.project.vitalityCheck),
    );
    return (
      <>
        {selectedProjectId ? (
          <a className="secondary-button button-size-md app-header-link" href={`/api/projects/${selectedProjectId}/export/markdown`} target="_blank" rel="noreferrer">
            导出 Markdown
          </a>
        ) : null}
        {!hasReview ? (
          <Button type="button" variant="primary" size="md" disabled={isPending || !selectedBundle?.articleDraft} onClick={() => void onExecute("review")}>
            运行体检
          </Button>
        ) : null}
        {hasReview && !canGeneratePublishPrep ? (
          <Button type="button" variant="primary" size="md" disabled={!selectedBundle?.articleDraft} onClick={() => onNavigate("drafts", "drafts")}>
            回正文打磨
          </Button>
        ) : null}
        {canGeneratePublishPrep ? (
          <Button type="button" variant="primary" size="md" disabled={isPending || !selectedBundle?.articleDraft} onClick={onConfirmPublish}>
            {selectedBundle?.publishPackage ? "重新整理发布包" : "生成发布包"}
          </Button>
        ) : null}
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
  nextActionTitle,
}: {
  activeView: WorkbenchView;
  selectedBundle: ProjectBundle | null;
  nextActionTitle?: string;
}) {
  const titleByView: Record<WorkbenchView, string> = {
    dashboard: "总览",
    judgement: "选题判断",
    evidence: "资料沉淀",
    model: "板块建模",
    outline: "论证提纲",
    draft: "正文打磨",
    publish: "体检发布",
  };
  const stageLabel = selectedBundle ? getWorkbenchFlowLabel(getWorkbenchFlowByProjectStage(selectedBundle.project.stage)) : "未选择项目";
  const projectLabel = selectedBundle?.project.topic ?? "请选择或新建项目";
  const nextLabel = nextActionTitle ?? "等待项目";

  return {
    kicker: `当前项目：${projectLabel}`,
    title: `当前页面：${titleByView[activeView]}`,
    detail: `下一步：${nextLabel} · 项目阶段：${stageLabel}`,
  };
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
