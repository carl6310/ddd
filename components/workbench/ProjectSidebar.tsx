"use client";

import { useState } from "react";
import type { ArticleProject, TopicCoCreationCandidate, TopicCoCreationResponse } from "@/lib/types";
import { AutoGrowTextarea } from "@/components/ui/auto-grow-textarea";
import { ContainedScrollArea } from "@/components/ui/contained-scroll-area";
import { Modal } from "@/components/ui/modal";

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
  const recentProjects = projects.slice(0, 5);
  const historicalProjects = projects.slice(5);
  const [projectForm, setProjectForm] = useState({
    topic: "",
    audience: "关注上海板块和买房决策的读者",
    targetWords: "2600",
    notes: "",
  });
  const [coCreationForm, setCoCreationForm] = useState({
    sector: "",
    currentIntuition: "",
    rawMaterials: "",
    avoidAngles: "不想写成泛板块介绍和中介稿",
  });
  const [coCreationCandidates, setCoCreationCandidates] = useState<TopicCoCreationCandidate[]>([]);
  const [coCreationSourceDigests, setCoCreationSourceDigests] = useState<TopicCoCreationResponse["sourceDigests"]>([]);
  const [coCreationInsights, setCoCreationInsights] = useState<TopicCoCreationResponse["result"]["materialInsights"] | null>(null);
  const [openModal, setOpenModal] = useState<"create" | "cocreate" | null>(projects.length === 0 ? "create" : null);

  async function runTopicCoCreation() {
    setIsPending(true);
    try {
      setMessage("");
      const response = await fetch("/api/topic-cocreate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(coCreationForm),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "选题共创失败。");
      }
      setCoCreationCandidates(payload.result.candidateAngles);
      setCoCreationSourceDigests(payload.sourceDigests || []);
      setCoCreationInsights(payload.result.materialInsights || null);
      setMessage("候选选题角度已生成。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "选题共创失败。");
    } finally {
      setIsPending(false);
    }
  }

  async function createProjectFromCandidate(candidate: TopicCoCreationCandidate) {
    setIsPending(true);
    try {
      setMessage("");
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: candidate.title,
          audience: "关注上海板块和买房决策的读者",
          targetWords: 2600,
          notes: candidate.whyItWorks,
          articleType: candidate.articleType,
          thesis: candidate.thesis,
          coreQuestion: `这篇文章要回答，${candidate.title} 背后的真实结构和购房判断是什么。`,
          hkrr: candidate.hkrr,
          hamd: {
            hook: candidate.hook,
            anchor: candidate.anchor,
            different: candidate.different,
            mindMap: [],
          },
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
        notes: candidate.whyItWorks,
      }));
      setMessage("已把这个候选角度设为本次选题。");
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
          <div className="project-list-section">
            <div className="project-list-header">
              <h3>最近项目</h3>
              <small>{recentProjects.length} 个</small>
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
                    <span className="project-stage-pill">{project.stage}</span>
                  </div>
                </button>
              ))}
              {projects.length === 0 ? <p className="empty-inline">还没有项目，点上面按钮新建。</p> : null}
            </div>
          </div>
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
                      <span className="project-stage-pill">{project.stage}</span>
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
        wide={coCreationCandidates.length > 0}
      >
        <div className="stack">
          <label>
            只讲哪个板块/片区？
            <input value={coCreationForm.sector} onChange={(event) => setCoCreationForm({ ...coCreationForm, sector: event.target.value })} placeholder="例如：唐镇" />
          </label>
          <label>
            你对它现有的碎片直觉？
            <AutoGrowTextarea value={coCreationForm.currentIntuition} onChange={(event) => setCoCreationForm({ ...coCreationForm, currentIntuition: event.target.value })} placeholder="例如：感觉现在去接盘唐镇的都是冤大头，但新盘还在日光。" rows={2} />
          </label>
          <label>
            要加入讨论的生肉材料？
            <AutoGrowTextarea value={coCreationForm.rawMaterials} onChange={(event) => setCoCreationForm({ ...coCreationForm, rawMaterials: event.target.value })} placeholder="例如一段长长的中介带看反馈或专家言论..." rows={2} />
          </label>
          <label>
            要避开什么烂大街角度？
            <input value={coCreationForm.avoidAngles} onChange={(event) => setCoCreationForm({ ...coCreationForm, avoidAngles: event.target.value })} />
          </label>
          {!coCreationForm.sector.trim() ? <p className="subtle action-hint">先填板块或片区，才能生成候选角度。</p> : null}
          <button className="primary-button" onClick={runTopicCoCreation} disabled={isPending || !coCreationForm.sector.trim()}>
            生成选题候选池
          </button>
        </div>

        {coCreationCandidates.length > 0 ? (
          <div className="modal-results stack">
            {coCreationSourceDigests.length > 0 ? (
              <details>
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
              <details>
                <summary>材料升维洞察发现</summary>
                <p><strong>高频主题：</strong>{coCreationInsights.themes.join(" / ") || "暂无"}</p>
                <p><strong>主要张力：</strong>{coCreationInsights.tensions.join(" / ") || "暂无"}</p>
                <p><strong>盲区提醒：</strong>{coCreationInsights.blindSpots.join(" / ") || "暂无"}</p>
              </details>
            ) : null}

            <h3>可以直接立项的候选角度</h3>
            <div className="cocreation-candidates-grid">
              {coCreationCandidates.map((cad, i) => (
                <article key={i} className="zone-card stack">
                  <strong>{cad.title}</strong>
                  <p className="subtle">{cad.whyItWorks}</p>
                  <small>结构：{cad.articleType}</small>
                  <details>
                    <summary>展开查看详情预演</summary>
                    <div className="stack subtle">
                      <p><strong>论点：</strong>{cad.thesis}</p>
                      <p><strong>钩子：</strong>{cad.hook} / <strong>锚点：</strong>{cad.anchor} / <strong>异质：</strong>{cad.different}</p>
                      <p><strong>HKRR：</strong>{cad.hkrr.summary}</p>
                    </div>
                  </details>
                  <button className="primary-button" onClick={() => createProjectFromCandidate(cad)} disabled={isPending}>
                    就用这个角度立项
                  </button>
                </article>
              ))}
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  );
}
