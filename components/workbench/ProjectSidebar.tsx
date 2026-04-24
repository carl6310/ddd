"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ARTICLE_PROTOTYPE_LABELS,
  TOPIC_READER_PERSONA_LABELS,
  TOPIC_ANGLE_TYPE_LABELS,
  type ArticleProject,
  type PreSourceCard,
  type SignalProviderMode,
  type TopicAngle,
  type TopicAngleType,
  type TopicCoCreationResponse,
  type TopicDiscoveryBundle,
  type TopicDiscoverySession,
} from "@/lib/types";
import { AutoGrowTextarea } from "@/components/ui/auto-grow-textarea";
import { ContainedScrollArea } from "@/components/ui/contained-scroll-area";
import { Modal } from "@/components/ui/modal";
import { formatProjectStage } from "@/lib/project-stage-labels";
import { filterAnglesByType } from "@/lib/topic-cocreate-postprocess";
import { extractUrls } from "@/lib/utils";

interface ProjectSidebarProps {
  projects: ArticleProject[];
  selectedProjectId: string;
  setSelectedProjectId: (id: string) => void;
  isPending: boolean;
  setIsPending: (pending: boolean) => void;
  setMessage: (msg: string) => void;
  refreshProjectsAndBundle: (id?: string) => Promise<void>;
  sampleDigest: string;
}

type DiscoveryStep = "pre-source-extract" | "signal-brief" | "topic-discovery-cocreate";

const discoveryStepWaitMs = 20 * 60 * 1000;
const discoveryPollMs = 1200;
const signalModeOptions: Array<{ value: SignalProviderMode; label: string; title: string }> = [
  { value: "input_only", label: "仅输入", title: "只基于当前填写内容和已抽取链接信号" },
  { value: "url_enriched", label: "链接增强", title: "处理输入里的文章链接，不额外搜索" },
  { value: "search_enabled", label: "联网检索", title: "自动搜索并抓取少量结果补充信号" },
];

export function ProjectSidebar({
  projects,
  selectedProjectId,
  setSelectedProjectId,
  isPending,
  setIsPending,
  setMessage,
  refreshProjectsAndBundle,
  sampleDigest,
}: ProjectSidebarProps) {
  const [projectForm, setProjectForm] = useState({
    topic: "",
    audience: "关注上海板块和买房决策的读者",
    targetWords: "2600",
    notes: "",
  });
  const [coCreationForm, setCoCreationForm] = useState({
    sector: "",
    currentIntuition: "",
    focusPoints: "",
    rawMaterials: "",
    articleLinks: "",
    avoidAngles: "不想写成泛板块介绍和中介稿",
    signalMode: "input_only" as SignalProviderMode,
  });
  const [coCreationSessionId, setCoCreationSessionId] = useState<string | null>(null);
  const [coCreationSessionStatus, setCoCreationSessionStatus] = useState<TopicDiscoverySession["status"] | null>(null);
  const [coCreationJobId, setCoCreationJobId] = useState<string | null>(null);
  const [coCreationResult, setCoCreationResult] = useState<TopicCoCreationResponse["result"] | null>(null);
  const [coCreationSignalBrief, setCoCreationSignalBrief] = useState<TopicCoCreationResponse["signalBrief"] | null>(null);
  const [coCreationSignalMode, setCoCreationSignalMode] = useState<TopicCoCreationResponse["signalMode"]>("input_only");
  const [coCreationSourceDigests, setCoCreationSourceDigests] = useState<TopicCoCreationResponse["sourceDigests"]>([]);
  const [coCreationPreSourceCards, setCoCreationPreSourceCards] = useState<PreSourceCard[]>([]);
  const [selectedPreSourceCardIds, setSelectedPreSourceCardIds] = useState<string[]>([]);
  const [coCreationInsights, setCoCreationInsights] = useState<TopicCoCreationResponse["result"]["materialInsights"] | null>(null);
  const [coCreationAngleFilter, setCoCreationAngleFilter] = useState<TopicAngleType | "all">("all");
  const [showAngleLonglist, setShowAngleLonglist] = useState(false);
  const [openModal, setOpenModal] = useState<"create" | "cocreate" | null>(projects.length === 0 ? "create" : null);
  const [projectSearch, setProjectSearch] = useState("");
  const [showTestProjects, setShowTestProjects] = useState(false);
  const [selectedCoCreationAngleId, setSelectedCoCreationAngleId] = useState<string | null>(null);
  const hiddenTestProjectCount = useMemo(() => projects.filter(isLikelyTestProject).length, [projects]);
  const selectedProject = useMemo(() => projects.find((project) => project.id === selectedProjectId) ?? null, [projects, selectedProjectId]);
  const visibleProjects = useMemo(
    () =>
      projects.filter((project) => {
        if (!showTestProjects && isLikelyTestProject(project)) {
          return false;
        }
        return matchesProjectSearch(project, projectSearch);
      }),
    [projectSearch, projects, showTestProjects],
  );
  const recentProjects = visibleProjects.slice(0, 5);
  const historicalProjects = visibleProjects.slice(5);
  const recommendedAngles = useMemo(() => coCreationResult?.recommendedAngles ?? coCreationResult?.angles ?? [], [coCreationResult]);
  const angleLonglist = useMemo(() => coCreationResult?.angleLonglist ?? [], [coCreationResult]);
  const visibleRecommendedAngles = useMemo(() => recommendedAngles.slice(0, 3), [recommendedAngles]);
  const extraAngles = useMemo(
    () => angleLonglist.filter((angle) => !recommendedAngles.some((recommended) => recommended.id === angle.id)),
    [angleLonglist, recommendedAngles],
  );
  const overflowAngles = useMemo(() => [...recommendedAngles.slice(3), ...extraAngles], [extraAngles, recommendedAngles]);
  const filteredOverflowAngles = useMemo(
    () => filterAnglesByType(overflowAngles, coCreationAngleFilter),
    [coCreationAngleFilter, overflowAngles],
  );
  const allCoCreationAngles = useMemo(() => [...recommendedAngles, ...extraAngles], [extraAngles, recommendedAngles]);
  const selectedCoCreationAngle = useMemo(
    () => allCoCreationAngles.find((angle) => angle.id === selectedCoCreationAngleId) ?? null,
    [allCoCreationAngles, selectedCoCreationAngleId],
  );
  const availableAngleTypes = useMemo(() => coCreationResult?.coverageSummary.includedTypes ?? [], [coCreationResult]);
  const readyPreSourceCount = useMemo(
    () => coCreationPreSourceCards.filter((card) => card.extractStatus === "ready").length,
    [coCreationPreSourceCards],
  );
  const hasCoCreationOutput = recommendedAngles.length > 0;

  useEffect(() => {
    if (!hasCoCreationOutput) {
      setSelectedCoCreationAngleId(null);
      return;
    }
    if (!selectedCoCreationAngleId || !allCoCreationAngles.some((angle) => angle.id === selectedCoCreationAngleId)) {
      setSelectedCoCreationAngleId(recommendedAngles[0]?.id ?? null);
    }
  }, [allCoCreationAngles, hasCoCreationOutput, recommendedAngles, selectedCoCreationAngleId]);

  function hydrateFromDiscoveryBundle(bundle: TopicDiscoveryBundle) {
    setCoCreationSessionId(bundle.session.id);
    setCoCreationSessionStatus(bundle.session.status);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("topic-discovery-session-id", bundle.session.id);
    }
    setCoCreationForm((current) => ({
      ...current,
      sector: bundle.session.sector,
      currentIntuition: bundle.session.intuition,
      focusPoints: bundle.session.focusPoints.join("\n"),
      rawMaterials: bundle.session.rawMaterials,
      articleLinks: bundle.links.map((item) => item.url).join("\n"),
      avoidAngles: bundle.session.avoidAngles || current.avoidAngles,
      signalMode: bundle.session.searchMode,
    }));
    setCoCreationPreSourceCards(bundle.preSourceCards);
    setSelectedPreSourceCardIds(bundle.preSourceCards.filter((card) => card.extractStatus === "ready").map((card) => card.id));
    setCoCreationSignalMode(bundle.session.searchMode);
    if (bundle.signalBrief) {
      setCoCreationSignalBrief({
        queries: bundle.signalBrief.queries,
        signals: bundle.signalBrief.signals,
        gaps: bundle.signalBrief.gaps,
        freshnessNote: bundle.signalBrief.freshnessNote,
      });
      setCoCreationSourceDigests(
        bundle.preSourceCards.map((card) => ({
          url: card.url,
          title: card.sourceTitle,
          summary: card.summary,
          publishedAt: card.publishedAt,
          note: card.extractStatus === "failed" ? card.riskHints.join("；") : "预资料卡",
          ok: card.extractStatus === "ready",
          error: card.extractStatus === "failed" ? card.riskHints.join("；") : undefined,
        })),
      );
    }
    if (bundle.topicAngles.length > 0) {
      setCoCreationResult({
        sector: bundle.session.sector,
        recommendedAngles: bundle.topicAngles.slice(0, 6),
        angleLonglist: bundle.topicAngles,
        coverageSummary: {
          includedTypes: Array.from(new Set(bundle.topicAngles.map((angle) => angle.angleType))),
          missingTypes: [],
          duplicatesMerged: 0,
        },
        angles: bundle.topicAngles.slice(0, 6),
        candidateAngles: bundle.topicAngles.slice(0, 6),
      });
    }
  }

  function hasReusablePreSourceCards(bundle: TopicDiscoveryBundle, urls: string[]) {
    const normalizedUrls = Array.from(new Set(urls.map((url) => url.trim()).filter(Boolean))).sort();
    if (normalizedUrls.length === 0) {
      return true;
    }

    const readyCardUrls = new Set(bundle.preSourceCards.filter((card) => card.extractStatus === "ready").map((card) => card.url));
    return normalizedUrls.every((url) => readyCardUrls.has(url));
  }

  async function loadDiscoveryBundle(sessionId: string) {
    const response = await fetch(`/api/topic-discovery/sessions/${sessionId}`);
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "读取选题发现会话失败。");
    }
    return payload.bundle as TopicDiscoveryBundle;
  }

  async function runDiscoveryJob(sessionId: string, step: DiscoveryStep) {
    setMessage(`${formatDiscoveryStepLabel(step)}已开始，正在后台处理。`);
    const response = await fetch(`/api/topic-discovery/sessions/${sessionId}/jobs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ step }),
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || `${step} 失败。`);
    }

    setCoCreationJobId(payload.job.id);
    const startedAt = Date.now();
    while (Date.now() - startedAt < discoveryStepWaitMs) {
      const detailResponse = await fetch(`/api/topic-discovery/jobs/${payload.job.id}`);
      const detailPayload = await detailResponse.json();
      if (!detailResponse.ok) {
        throw new Error(detailPayload.error || "读取选题发现任务详情失败。");
      }
      if (detailPayload.job.status === "succeeded") {
        setMessage(`${formatDiscoveryStepLabel(step)}已完成。`);
        return detailPayload.job.result;
      }
      if (detailPayload.job.status === "failed") {
        throw new Error(detailPayload.job.errorMessage || `${step} 执行失败。`);
      }
      if (detailPayload.job.progressMessage) {
        setMessage(`${formatDiscoveryStepLabel(step)}：${detailPayload.job.progressMessage}`);
      }
      await new Promise((resolve) => window.setTimeout(resolve, discoveryPollMs));
    }

    throw new Error(`${formatDiscoveryStepLabel(step)}仍在后台执行，当前前端等待超时。请稍后重新打开会话继续。`);
  }

  async function ensureTopicDiscoverySession() {
    if (coCreationSessionId) {
      const patchResponse = await fetch(`/api/topic-discovery/sessions/${coCreationSessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sector: coCreationForm.sector,
          intuition: coCreationForm.currentIntuition,
          focusPoints: splitLines(coCreationForm.focusPoints),
          rawMaterials: coCreationForm.rawMaterials,
          avoidAngles: coCreationForm.avoidAngles,
          searchMode: coCreationForm.signalMode,
        }),
      });
      const patchPayload = await patchResponse.json();
      if (!patchResponse.ok) {
        throw new Error(patchPayload.error || "更新选题发现会话失败。");
      }
      setCoCreationSessionStatus(patchPayload.session.status);
      return patchPayload.session.id as string;
    }

    const createResponse = await fetch("/api/topic-discovery/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sector: coCreationForm.sector,
        intuition: coCreationForm.currentIntuition,
        focusPoints: splitLines(coCreationForm.focusPoints),
        rawMaterials: coCreationForm.rawMaterials,
        avoidAngles: coCreationForm.avoidAngles,
        searchMode: coCreationForm.signalMode,
      }),
    });
    const createPayload = await createResponse.json();
    if (!createResponse.ok) {
      throw new Error(createPayload.error || "创建选题发现会话失败。");
    }
    setCoCreationSessionId(createPayload.session.id);
    setCoCreationSessionStatus(createPayload.session.status);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("topic-discovery-session-id", createPayload.session.id);
    }
    return createPayload.session.id as string;
  }

  useEffect(() => {
    if (openModal !== "cocreate" || coCreationSessionId || coCreationResult) {
      return;
    }

    const storedSessionId = typeof window !== "undefined" ? window.localStorage.getItem("topic-discovery-session-id") : null;
    const targetUrl = storedSessionId
      ? `/api/topic-discovery/sessions/${storedSessionId}`
      : "/api/topic-discovery/sessions/latest";

    void (async () => {
      try {
        const response = await fetch(targetUrl);
        const payload = await response.json();
        if (!response.ok) {
          return;
        }

        const bundle = (payload.bundle ?? null) as TopicDiscoveryBundle | null;
        if (!bundle) {
          return;
        }

        hydrateFromDiscoveryBundle(bundle);
      } catch {
        // Ignore restore failures so the modal stays usable.
      }
    })();
  }, [openModal, coCreationResult, coCreationSessionId]);

  async function runTopicCoCreation() {
    setIsPending(true);
    try {
      setMessage("");
      const sessionId = await ensureTopicDiscoverySession();
      const linkResponse = await fetch(`/api/topic-discovery/sessions/${sessionId}/links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          urls: extractUrls(coCreationForm.articleLinks),
        }),
      });
      const linkPayload = await linkResponse.json();
      if (!linkResponse.ok) {
        throw new Error(linkPayload.error || "保存文章链接失败。");
      }

      const articleUrls = extractUrls(coCreationForm.articleLinks);
      const currentBundle = await loadDiscoveryBundle(sessionId);
      if (hasReusablePreSourceCards(currentBundle, articleUrls)) {
        hydrateFromDiscoveryBundle(currentBundle);
        setMessage("已有可复用的预资料池，跳过链接抓取，继续生成 Signal Brief。");
      } else {
        await runDiscoveryJob(sessionId, "pre-source-extract");
      }
      await runDiscoveryJob(sessionId, "signal-brief");
      const cocreateResult = await runDiscoveryJob(sessionId, "topic-discovery-cocreate");

      hydrateFromDiscoveryBundle(await loadDiscoveryBundle(sessionId));
      setCoCreationInsights(cocreateResult.result?.materialInsights ?? null);
      setCoCreationAngleFilter("all");
      setShowAngleLonglist(false);
      setMessage(`Signal Brief 已生成，并产出 ${cocreateResult.result?.recommendedAngles?.length ?? 0} 个推荐角度、${cocreateResult.result?.angleLonglist?.length ?? 0} 个长名单角度。`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "选题共创失败。");
    } finally {
      setIsPending(false);
    }
  }

  async function createProjectFromCandidate(candidate: TopicAngle) {
    if (candidate.topicScorecard.canForceProceed) {
      const confirmed = window.confirm(
        candidate.topicScorecard.status === "weak_topic"
          ? `这条题当前建议“放弃或改写”。\n\nHKR：${candidate.hkr.h}/${candidate.hkr.k}/${candidate.hkr.r}（总分 ${candidate.hkr.total}）\n原因：${candidate.topicScorecard.evidenceRisk}\n\n如果你仍然要继续，系统会明确带着风险标记立项。`
          : `这条题当前建议“补信号再开题”。\n\nHKR：${candidate.hkr.h}/${candidate.hkr.k}/${candidate.hkr.r}（总分 ${candidate.hkr.total}）\n建议：${candidate.topicScorecard.recommendation}\n\n是否仍然继续立项？`,
      );
      if (!confirmed) {
        return;
      }
    }

    const notes = buildAngleNotes(candidate);
    setIsPending(true);
    try {
      setMessage("");
      if (!coCreationSessionId) {
        throw new Error("当前没有可用的选题发现会话。");
      }

      const response = await fetch(`/api/topic-discovery/sessions/${coCreationSessionId}/create-project`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateId: candidate.id,
          selectedPreSourceCardIds,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "根据候选角度创建项目失败。");
      }
      await refreshProjectsAndBundle(payload.project.id);
      setOpenModal(null);
      setProjectForm((current) => ({
        ...current,
        topic: candidate.title,
        notes,
      }));
      const importedCount = Number(payload.importedSourceCardCount ?? 0);
      setMessage(importedCount > 0 ? `已立项，并同步 ${importedCount} 条共创资料到资料索引。` : "已把这个候选角度设为本次选题。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "创建项目失败。");
    } finally {
      setIsPending(false);
    }
  }

  async function createProject() {
    setIsPending(true);
    try {
      setMessage("");
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...projectForm,
          targetWords: Number(projectForm.targetWords),
          sampleDigest,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "创建项目失败。");
      }

      setProjectForm({
        topic: "",
        audience: "关注上海板块和买房决策的读者",
        targetWords: "2600",
        notes: "",
      });
      await refreshProjectsAndBundle(payload.project.id);
      setOpenModal(null);
      setMessage("新项目已经创建并完成选题定义。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "创建项目失败。");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <>
      <aside className="panel sidebar">
        <section className="card stack sidebar-card">
          {/* Compact action bar */}
          <div className="sidebar-action-bar">
            <button
              type="button"
              className="sidebar-add-btn"
              onClick={() => setOpenModal("create")}
              title="新建空白项目"
            >
              ＋ 新建
            </button>
            <button
              type="button"
              className="sidebar-add-btn sidebar-add-btn-alt"
              onClick={() => setOpenModal("cocreate")}
              title="选题共创"
            >
              ✦ 共创
            </button>
          </div>

          {/* Project list */}
          <div className="project-list-tools">
            <input
              className="project-list-search"
              value={projectSearch}
              onChange={(event) => setProjectSearch(event.target.value)}
              placeholder="搜索项目、阶段、受众"
              aria-label="搜索项目"
            />
            {hiddenTestProjectCount > 0 ? (
              <label className="project-list-toggle">
                <input
                  type="checkbox"
                  checked={showTestProjects}
                  onChange={(event) => setShowTestProjects(event.target.checked)}
                />
                显示测试项目
              </label>
            ) : null}
          </div>
          <div className="project-list-section">
            <div className="project-list-header">
              <h3>最近项目</h3>
              <small>
                {visibleProjects.length} / {projects.length}
              </small>
            </div>
            <div className="project-list">
              {recentProjects.map((project) => (
                <button
                  key={project.id}
                  className={`project-item ${project.id === selectedProjectId ? "selected" : ""}`}
                  onClick={() => setSelectedProjectId(project.id)}
                  title={project.topic}
                >
                  <strong className="project-item-title">{project.topic}</strong>
                  <div className="project-item-meta">
                    <small>{project.articleType}</small>
                    <span className="project-stage-pill">{formatProjectStage(project.stage)}</span>
                  </div>
                </button>
              ))}
              {projects.length === 0 ? <p className="empty-inline">还没有项目，点上面按钮新建。</p> : null}
              {projects.length > 0 && visibleProjects.length === 0 ? <p className="empty-inline">没有匹配项目，调整搜索或显示测试项目。</p> : null}
            </div>
          </div>
          <details className="mobile-project-switcher">
            <summary>
              <span>当前项目</span>
              <strong>{selectedProject?.topic ?? "还没有选择项目"}</strong>
              <small>{selectedProject ? `${selectedProject.articleType} · ${formatProjectStage(selectedProject.stage)}` : "先新建或选择一个项目"}</small>
            </summary>
            <div className="mobile-project-switcher-list">
              {visibleProjects.map((project) => (
                <button
                  key={project.id}
                  className={`project-item ${project.id === selectedProjectId ? "selected" : ""}`}
                  onClick={() => setSelectedProjectId(project.id)}
                  title={project.topic}
                  type="button"
                >
                  <strong className="project-item-title">{project.topic}</strong>
                  <div className="project-item-meta">
                    <small>{project.articleType}</small>
                    <span className="project-stage-pill">{formatProjectStage(project.stage)}</span>
                  </div>
                </button>
              ))}
              {projects.length === 0 ? <p className="empty-inline">还没有项目，点上面按钮新建。</p> : null}
              {projects.length > 0 && visibleProjects.length === 0 ? <p className="empty-inline">没有匹配项目，调整搜索或显示测试项目。</p> : null}
            </div>
          </details>
          {historicalProjects.length > 0 ? (
            <details className="project-history">
              <summary>查看更多历史项目 ({historicalProjects.length})</summary>
              <ContainedScrollArea className="project-list project-list-scroll">
                {historicalProjects.map((project) => (
                  <button
                    key={project.id}
                    className={`project-item ${project.id === selectedProjectId ? "selected" : ""}`}
                    onClick={() => setSelectedProjectId(project.id)}
                    title={project.topic}
                  >
                    <strong className="project-item-title">{project.topic}</strong>
                    <div className="project-item-meta">
                      <small>{project.articleType}</small>
                      <span className="project-stage-pill">{formatProjectStage(project.stage)}</span>
                    </div>
                  </button>
                ))}
              </ContainedScrollArea>
            </details>
          ) : null}
        </section>
      </aside>

      {/* ── Create Project Modal ── */}
      <Modal
        open={openModal === "create"}
        onClose={() => setOpenModal(null)}
        title="新建空白项目"
        description="已有明确选题时，快速立项进入主流程。"
      >
        <div className="stack">
          <label>
            核心命题 / 抓眼球标题
            <input value={projectForm.topic} onChange={(event) => setProjectForm({ ...projectForm, topic: event.target.value })} placeholder="例如：唐镇为什么总被高估" />
          </label>
          <label>
            受众人群
            <input value={projectForm.audience} onChange={(event) => setProjectForm({ ...projectForm, audience: event.target.value })} />
          </label>
          <label>
            目标字数
            <input value={projectForm.targetWords} onChange={(event) => setProjectForm({ ...projectForm, targetWords: event.target.value })} inputMode="numeric" />
          </label>
          <label>
            前置直觉笔记
            <AutoGrowTextarea value={projectForm.notes} onChange={(event) => setProjectForm({ ...projectForm, notes: event.target.value })} rows={3} placeholder="可留空，系统会补一段选题判断。" />
          </label>
          {!projectForm.topic.trim() ? <p className="subtle action-hint">先补一个标题，按钮就会解锁。</p> : null}
          <button className="primary-button" onClick={createProject} disabled={isPending || !projectForm.topic.trim()}>
            新建项目并自动写简报
          </button>
        </div>
      </Modal>

      {/* ── Co-creation Modal ── */}
      <Modal
        open={openModal === "cocreate"}
        onClose={() => setOpenModal(null)}
        title="选题共创"
        description="只填板块和几条零碎直觉，让系统先帮你打几个可立项角度。"
        wide={hasCoCreationOutput || angleLonglist.length > 0}
      >
        <details className="cocreation-input-panel" open={!hasCoCreationOutput}>
          <summary className="cocreation-input-summary">
            <span>{hasCoCreationOutput ? "生成条件" : "填写生成条件"}</span>
            <small>{coCreationForm.sector.trim() || "未填写板块"} · {formatSignalModeLabel(coCreationForm.signalMode)}</small>
          </summary>
          <div className="stack cocreation-input-body">
            <label>
              只讲哪个板块/片区？
              <input value={coCreationForm.sector} onChange={(event) => setCoCreationForm({ ...coCreationForm, sector: event.target.value })} placeholder="例如：唐镇" />
            </label>
            <label>
              你对它现有的碎片直觉？
              <AutoGrowTextarea className="cocreation-auto-field" value={coCreationForm.currentIntuition} onChange={(event) => setCoCreationForm({ ...coCreationForm, currentIntuition: event.target.value })} placeholder="例如：感觉现在去接盘唐镇的都是冤大头，但新盘还在日光。" rows={1} />
            </label>
            <label>
              关注方向
              <AutoGrowTextarea className="cocreation-auto-field" value={coCreationForm.focusPoints} onChange={(event) => setCoCreationForm({ ...coCreationForm, focusPoints: event.target.value })} placeholder="例如：规划兑现、成交承接、改善客群、界面体感" rows={1} />
            </label>
            <label>
              要加入讨论的生肉材料？
              <AutoGrowTextarea className="cocreation-auto-field" value={coCreationForm.rawMaterials} onChange={(event) => setCoCreationForm({ ...coCreationForm, rawMaterials: event.target.value })} placeholder="例如一段长长的中介带看反馈或专家言论..." rows={1} />
            </label>
            <label>
              文章链接
              <AutoGrowTextarea className="cocreation-auto-field cocreation-link-field" value={coCreationForm.articleLinks} onChange={(event) => setCoCreationForm({ ...coCreationForm, articleLinks: event.target.value })} placeholder="每行一条文章链接，系统会先抽取为预资料卡" rows={2} />
            </label>
            <div className="cocreation-mode-field">
              <span className="field-label">信号来源</span>
              <div className="cocreation-mode-segment" role="radiogroup" aria-label="Signal Brief 模式">
                {signalModeOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={coCreationForm.signalMode === option.value}
                    title={option.title}
                    className={`cocreation-mode-button ${coCreationForm.signalMode === option.value ? "active" : ""}`}
                    onClick={() => setCoCreationForm({ ...coCreationForm, signalMode: option.value })}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <label>
              要避开什么烂大街角度？
              <AutoGrowTextarea className="cocreation-auto-field" value={coCreationForm.avoidAngles} onChange={(event) => setCoCreationForm({ ...coCreationForm, avoidAngles: event.target.value })} rows={1} />
            </label>
            {!coCreationForm.sector.trim() ? <p className="subtle action-hint">先填板块或片区，才能生成候选角度。</p> : null}
            <button className={hasCoCreationOutput ? "secondary-button" : "primary-button"} onClick={runTopicCoCreation} disabled={isPending || !coCreationForm.sector.trim()}>
              {hasCoCreationOutput ? "重新生成候选池" : "生成选题候选池"}
            </button>
          </div>
        </details>

        {hasCoCreationOutput ? (
          <div className="modal-results stack">
            <div className="cocreation-result-summary">
              <div>
                <strong>{recommendedAngles.length}</strong>
                <span>推荐角度</span>
              </div>
              <div>
                <strong>{angleLonglist.length}</strong>
                <span>长名单</span>
              </div>
              <div>
                <strong>{readyPreSourceCount}</strong>
                <span>可用资料</span>
              </div>
              <div>
                <strong>{formatSignalModeLabel(coCreationSignalMode)}</strong>
                <span>信号来源</span>
              </div>
            </div>
            {coCreationSessionId ? (
              <p className="subtle cocreation-session-meta">
                会话 {coCreationSessionId} · {coCreationSessionStatus || "draft"}{coCreationJobId ? ` · 最近任务 ${coCreationJobId}` : ""}
              </p>
            ) : null}

            <div className="cocreation-selection-bar">
              <div>
                <span>当前选择</span>
                <strong>{selectedCoCreationAngle?.title ?? "先选择一个推荐角度"}</strong>
              </div>
              <button className="primary-button" onClick={() => selectedCoCreationAngle ? void createProjectFromCandidate(selectedCoCreationAngle) : undefined} disabled={isPending || !selectedCoCreationAngle}>
                用选中角度立项
              </button>
            </div>

            <h3>推荐角度 ({visibleRecommendedAngles.length} / {recommendedAngles.length})</h3>
            <div className="cocreation-candidates-grid">
              {visibleRecommendedAngles.map((angle, index) => (
                <TopicAngleCard
                  key={angle.id}
                  angle={angle}
                  rank={index + 1}
                  isPending={isPending}
                  isSelected={angle.id === selectedCoCreationAngleId}
                  onChoose={setSelectedCoCreationAngleId}
                />
              ))}
            </div>

            {overflowAngles.length > 0 ? (
              <section className="stack">
                <div className="cocreation-more-head">
                  <h3>更多角度 ({overflowAngles.length})</h3>
                  <button type="button" className="secondary-button" onClick={() => setShowAngleLonglist((value) => !value)}>
                    {showAngleLonglist ? "收起更多角度" : "展开更多角度"}
                  </button>
                </div>

                {showAngleLonglist ? (
                  <>
                    <div className="cocreation-filter-row">
                      <button
                        type="button"
                        className={`section-subnav-button ${coCreationAngleFilter === "all" ? "active" : ""}`}
                        onClick={() => setCoCreationAngleFilter("all")}
                      >
                        全部
                      </button>
                      {availableAngleTypes.map((type) => (
                        <button
                          type="button"
                          key={type}
                          className={`section-subnav-button ${coCreationAngleFilter === type ? "active" : ""}`}
                          onClick={() => setCoCreationAngleFilter(type)}
                        >
                          {TOPIC_ANGLE_TYPE_LABELS[type]}
                        </button>
                      ))}
                    </div>
                    <ContainedScrollArea className="cocreation-longlist-scroll">
                      <div className="cocreation-candidates-grid">
                        {filteredOverflowAngles.map((angle) => (
                          <TopicAngleCard
                            key={angle.id}
                            angle={angle}
                            isPending={isPending}
                            isSelected={angle.id === selectedCoCreationAngleId}
                            onChoose={setSelectedCoCreationAngleId}
                            compact
                          />
                        ))}
                      </div>
                    </ContainedScrollArea>
                  </>
                ) : null}
              </section>
            ) : null}

            <details className="cocreation-coverage cocreation-collapsible">
              <summary className="cocreation-summary-row">
                <span>诊断与材料</span>
                <small className="cocreation-summary-meta">
                  资料 {coCreationPreSourceCards.length} · 信号 {coCreationSignalBrief?.signals.length ?? 0} · 覆盖 {coCreationResult?.coverageSummary.includedTypes.length ?? 0}
                </small>
              </summary>
              <div className="stack cocreation-collapsible-body">
                {coCreationPreSourceCards.length > 0 ? (
                  <details className="cocreation-nested-detail">
                    <summary>预资料池：{coCreationPreSourceCards.length} 条 · 可用 {readyPreSourceCount} · 已选 {selectedPreSourceCardIds.length}</summary>
                    <div className="stack subtle">
                      {coCreationPreSourceCards.map((card) => (
                        <article className="status-block stack compact-editor-card" key={card.id}>
                          <label className="project-item-meta">
                            <input
                              type="checkbox"
                              checked={selectedPreSourceCardIds.includes(card.id)}
                              onChange={(event) =>
                                setSelectedPreSourceCardIds((current) =>
                                  event.target.checked ? Array.from(new Set([...current, card.id])) : current.filter((item) => item !== card.id),
                                )
                              }
                            />
                            <strong>{card.sourceTitle}</strong>
                            <span className="status-chip cocreation-filter-chip">{card.extractStatus}</span>
                          </label>
                          <p>{card.summary || "暂无摘要"}</p>
                          <p><strong>关键判断：</strong>{card.keyClaims.join(" / ") || "暂无"}</p>
                          <p><strong>风险提示：</strong>{card.riskHints.join(" / ") || "暂无"}</p>
                        </article>
                      ))}
                    </div>
                  </details>
                ) : null}

                {coCreationSignalBrief ? (
                  <details className="cocreation-nested-detail">
                    <summary>Signal Brief：{formatSignalModeLabel(coCreationSignalMode)}</summary>
                    <div className="stack subtle">
                      {coCreationSignalBrief.queries.length > 0 ? (
                        <p><strong>查询：</strong>{coCreationSignalBrief.queries.join(" / ")}</p>
                      ) : (
                        <p><strong>查询：</strong>本次没有联网搜索，直接整理输入信号。</p>
                      )}
                      <p><strong>新鲜度提醒：</strong>{coCreationSignalBrief.freshnessNote}</p>
                      {coCreationSignalBrief.signals.map((signal, index) => (
                        <article className="status-block stack compact-editor-card" key={`${signal.title}-${index}`}>
                          <div className="project-item-meta">
                            <strong>{signal.title}</strong>
                            <span className="status-chip cocreation-filter-chip">{signal.signalType}</span>
                          </div>
                          <p>{signal.summary}</p>
                          <p><strong>为什么重要：</strong>{signal.whyItMatters}</p>
                          <p><strong>来源：</strong>{[signal.source, signal.publishedAt, signal.url].filter(Boolean).join(" / ") || "用户输入"}</p>
                        </article>
                      ))}
                      {coCreationSignalBrief.gaps.length > 0 ? (
                        <p><strong>当前缺口：</strong>{coCreationSignalBrief.gaps.join(" / ")}</p>
                      ) : null}
                    </div>
                  </details>
                ) : null}

                {coCreationResult?.coverageSummary ? (
                  <details className="cocreation-nested-detail">
                    <summary>覆盖情况：{coCreationResult.coverageSummary.includedTypes.length} 类 · 去重 {coCreationResult.coverageSummary.duplicatesMerged}</summary>
                    <div className="stack subtle">
                      <p>推荐名单已经从长名单里筛出；这里用于检查是否集中在单一路数。</p>
                      <div className="cocreation-filter-row">
                        <strong>已覆盖：</strong>
                        {coCreationResult.coverageSummary.includedTypes.map((type) => (
                          <span key={type} className="status-chip cocreation-filter-chip">
                            {TOPIC_ANGLE_TYPE_LABELS[type]}
                          </span>
                        ))}
                      </div>
                      {coCreationResult.coverageSummary.missingTypes.length > 0 ? (
                        <div className="cocreation-filter-row">
                          <strong>尚缺：</strong>
                          {coCreationResult.coverageSummary.missingTypes.map((type) => (
                            <span key={type} className="status-chip status-chip-warn cocreation-filter-chip">
                              {TOPIC_ANGLE_TYPE_LABELS[type]}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </details>
                ) : null}

                {coCreationSourceDigests.length > 0 ? (
                  <details className="cocreation-nested-detail">
                    <summary>被萃取的有效材料点 ({coCreationSourceDigests.length})</summary>
                    <ul className="compact-list">
                      {coCreationSourceDigests.map((md, i) => (
                        <li key={`${md.url}-${i}`}>
                          <strong>{md.title || "未命名材料"}</strong>
                          <span>{md.summary || md.note || (md.ok ? "已抓取材料。" : md.error || "抓取失败。")}</span>
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : null}

                {coCreationInsights ? (
                  <details className="cocreation-nested-detail">
                    <summary>材料升维洞察发现</summary>
                    <p><strong>高频主题：</strong>{coCreationInsights.themes.join(" / ") || "暂无"}</p>
                    <p><strong>主要张力：</strong>{coCreationInsights.tensions.join(" / ") || "暂无"}</p>
                    <p><strong>盲区提醒：</strong>{coCreationInsights.blindSpots.join(" / ") || "暂无"}</p>
                  </details>
                ) : null}
              </div>
            </details>
          </div>
        ) : null}
      </Modal>
    </>
  );
}

function TopicAngleCard({
  angle,
  rank,
  isPending,
  isSelected,
  onChoose,
  compact = false,
}: {
  angle: TopicAngle;
  rank?: number;
  isPending: boolean;
  isSelected: boolean;
  onChoose: (angleId: string) => void;
  compact?: boolean;
}) {
  const readerLensLabels = Array.isArray(angle.readerLens)
    ? angle.readerLens.map((item) => TOPIC_READER_PERSONA_LABELS[item]).join(" / ")
    : "";

  return (
    <article className={`zone-card stack cocreation-angle-card ${isSelected ? "is-selected" : ""} ${compact ? "cocreation-angle-card-compact" : ""}`}>
      <div className="cocreation-angle-head">
        <div className="cocreation-angle-title-row">
          {rank ? <span className="cocreation-angle-rank">{rank}</span> : null}
          <strong className="cocreation-angle-title" title={angle.title}>{angle.title}</strong>
        </div>
        <div className="project-item-meta">
          <span className="status-chip cocreation-filter-chip">{angle.angleTypeLabel}</span>
          <span className="project-stage-pill">{angle.articleType}</span>
        </div>
      </div>
      <p className="subtle cocreation-angle-judgement" title={angle.coreJudgement}>{angle.coreJudgement}</p>
      <div className="cocreation-angle-score">
        <span>HKR {angle.hkr.h}/{angle.hkr.k}/{angle.hkr.r}</span>
        <span>{formatScorecardStatus(angle.topicScorecard.status)}</span>
        <span>{ARTICLE_PROTOTYPE_LABELS[angle.articlePrototype]}</span>
      </div>
      <details className="cocreation-card-detail">
        <summary>展开判断依据</summary>
        <div className="stack subtle">
          <p><strong>目标读者：</strong>{TOPIC_READER_PERSONA_LABELS[angle.targetReaderPersona]}</p>
          <p><strong>读者视角：</strong>{readerLensLabels || "未记录"}</p>
          <p><strong>反常识：</strong>{angle.counterIntuition}</p>
          <p><strong>读者价值：</strong>{angle.readerValue}</p>
          <p><strong>为什么现在：</strong>{angle.whyNow}</p>
          <p><strong>Signal refs：</strong>{angle.signalRefs.join(" / ") || "暂无"}</p>
          <p><strong>创作锚点：</strong>{angle.creativeAnchor}</p>
          <p><strong>Scorecard：</strong>{angle.topicScorecard.recommendation}</p>
          <p><strong>风险解释：</strong>{angle.topicScorecard.evidenceRisk}</p>
          <p><strong>需要补的证据：</strong>{angle.neededEvidence.join(" / ")}</p>
          <p><strong>容易写偏的点：</strong>{angle.riskOfMisfire}</p>
          <p><strong>建议下一步：</strong>{angle.recommendedNextStep}</p>
        </div>
      </details>
      <button className="secondary-button cocreation-select-button" type="button" onClick={() => onChoose(angle.id)} disabled={isPending}>
        {isSelected ? "已选中" : "选中角度"}
      </button>
    </article>
  );
}

function buildAngleNotes(angle: TopicAngle) {
  const readerLensLabels = Array.isArray(angle.readerLens)
    ? angle.readerLens.map((item) => TOPIC_READER_PERSONA_LABELS[item]).join(" / ")
    : "未记录";

  return [
    `【角度类型】${angle.angleTypeLabel}`,
    `【文章原型】${ARTICLE_PROTOTYPE_LABELS[angle.articlePrototype]}`,
    `【目标读者】${TOPIC_READER_PERSONA_LABELS[angle.targetReaderPersona]}`,
    `【读者视角】${readerLensLabels}`,
    `【核心判断】${angle.coreJudgement}`,
    `【反常识】${angle.counterIntuition}`,
    `【HKR】${angle.hkr.h}/${angle.hkr.k}/${angle.hkr.r}（总分 ${angle.hkr.total}）`,
    `【开题建议】${formatScorecardStatus(angle.topicScorecard.status)}：${angle.topicScorecard.recommendation}`,
    `【读者价值】${angle.readerValue}`,
    `【为什么现在】${angle.whyNow}`,
    `【Signal refs】${angle.signalRefs.join("；") || "暂无"}`,
    `【创作锚点】${angle.creativeAnchor}`,
    `【需要补的证据】${angle.neededEvidence.join("；")}`,
    `【容易写偏】${angle.riskOfMisfire}`,
    `【建议下一步】${angle.recommendedNextStep}`,
  ].join("\n");
}

function formatSignalModeLabel(mode: SignalProviderMode) {
  switch (mode) {
    case "search_enabled":
      return "联网检索";
    case "url_enriched":
      return "链接增强";
    case "input_only":
    default:
      return "仅输入";
  }
}

function formatDiscoveryStepLabel(step: DiscoveryStep) {
  switch (step) {
    case "pre-source-extract":
      return "链接抓取";
    case "signal-brief":
      return "Signal Brief";
    case "topic-discovery-cocreate":
      return "候选角度生成";
  }
}

function formatScorecardStatus(status: TopicAngle["topicScorecard"]["status"]) {
  switch (status) {
    case "ready_to_open":
      return "建议开题";
    case "needs_more_signals":
      return "建议补信号";
    case "weak_topic":
    default:
      return "建议放弃";
  }
}

function isLikelyTestProject(project: ArticleProject) {
  const text = `${project.topic} ${project.notes} ${project.audience}`.toLowerCase();
  return /测试|test|debug|样例|任务中心/.test(text);
}

function matchesProjectSearch(project: ArticleProject, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }
  return [
    project.topic,
    project.audience,
    project.articleType,
    project.stage,
    project.thesis,
    project.coreQuestion,
    project.notes,
  ]
    .join(" ")
    .toLowerCase()
    .includes(normalizedQuery);
}

function splitLines(value: string) {
  return value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}
