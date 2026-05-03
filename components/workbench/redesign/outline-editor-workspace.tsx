"use client";

import { useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import type {
  OutlineClaimViewModel,
  OutlineEditorViewModel,
  OutlineSectionActionViewModel,
  OutlineSectionFlagViewModel,
  OutlineSectionViewModel,
} from "@/lib/design/view-models";
import type { WorkbenchStepPath } from "../workflow-state";
import type { WorkbenchInspectorSelection } from "../WorkbenchInspector";

export function OutlineEditorWorkspace({
  model,
  selectedSectionId,
  isPending,
  onExecute,
  onInspectorSelectionChange,
}: {
  model: OutlineEditorViewModel;
  selectedSectionId: string | null;
  isPending: boolean;
  onExecute: (step: WorkbenchStepPath) => Promise<void>;
  onInspectorSelectionChange: (selection: WorkbenchInspectorSelection) => void;
}) {
  const effectiveSectionId = useMemo(() => {
    if (selectedSectionId && model.sections.some((section) => section.id === selectedSectionId)) {
      return selectedSectionId;
    }
    return model.sections[0]?.id ?? null;
  }, [model.sections, selectedSectionId]);
  const selectedSection = model.sections.find((section) => section.id === effectiveSectionId) ?? null;
  const selectedIndex = selectedSection ? model.sections.findIndex((section) => section.id === selectedSection.id) : -1;

  useEffect(() => {
    if (effectiveSectionId) {
      onInspectorSelectionChange({ kind: "outline-section", sectionId: effectiveSectionId });
    }
  }, [effectiveSectionId, onInspectorSelectionChange]);

  function selectSection(sectionId: string) {
    onInspectorSelectionChange({ kind: "outline-section", sectionId });
  }

  function selectRelativeSection(offset: number) {
    const nextSection = model.sections[selectedIndex + offset];
    if (nextSection) {
      selectSection(nextSection.id);
    }
  }

  return (
    <section className="redesign-outline-editor" aria-label="结构编辑器">
      <div className="redesign-outline-hero">
        <div className="redesign-outline-hero-copy">
          <span>文章提纲</span>
          <h2>结构编辑器</h2>
          <p>把提纲压缩成可扫读的结构树，只展开当前段落的任务、证据和连续性，不再把所有章节长展开。</p>
        </div>
        <div className="redesign-outline-actions">
          <Button
            type="button"
            variant="primary"
            disabled={isPending || !model.canGenerateOutline}
            onClick={() => void onExecute("outline")}
          >
            {model.hasOutline ? "重新生成提纲" : "生成提纲"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={isPending || !model.canGenerateDraft}
            onClick={() => void onExecute("drafts")}
          >
            生成正文
          </Button>
        </div>
      </div>

      <div className="redesign-outline-metrics" aria-label="结构概览">
        <OutlineMetric label="段落" value={model.totalSections} detail={`${model.linkedSectionCount} 段有证据`} />
        <OutlineMetric label="弱支撑" value={model.weakSectionCount} detail={`${model.sourceCount} 张资料卡`} />
        <OutlineMetric label="质检提示" value={model.flaggedSectionCount} detail="来自 VitalityCheck" />
        <OutlineMetric label="连续性" value={model.continuityCoverageLabel} detail="段落链路覆盖" />
      </div>

      {!model.hasOutline || model.sections.length === 0 ? (
        <EmptyState
          title={model.hasOutline ? "提纲还没有正文段落" : "还没有段落提纲"}
          className="workbench-empty-state redesign-outline-empty"
          action={
            <Button
              type="button"
              variant="primary"
              disabled={isPending || !model.canGenerateOutline}
              onClick={() => void onExecute("outline")}
            >
              生成提纲
            </Button>
          }
        >
          <p>{model.canGenerateOutline ? "先把板块建模翻成段落任务书。" : "需要先完成板块建模，才能生成提纲。"}</p>
        </EmptyState>
      ) : (
        <div className="redesign-outline-grid">
          <aside className="redesign-outline-tree" aria-label="提纲结构树">
          <div className="redesign-outline-tree-head">
              <span>提纲结构</span>
              <Chip tone="accent">{model.totalSections} 段</Chip>
            </div>
            <div className="redesign-outline-tree-list" role="list">
              {model.sections.map((section) => (
                <button
                  type="button"
                  className={`redesign-outline-node redesign-tone-${section.tone} ${section.id === selectedSection?.id ? "is-selected" : ""}`}
                  key={section.id}
                  onClick={() => selectSection(section.id)}
                  aria-pressed={section.id === selectedSection?.id}
                >
                  <span>{String(section.index + 1).padStart(2, "0")}</span>
                  <strong>{section.heading}</strong>
                  <small>{section.thesis}</small>
                  <em>{section.statusLabel}</em>
                </button>
              ))}
            </div>
          </aside>

          <div className="redesign-outline-detail">
            <OutlineFrameSummary hook={model.hook} closing={model.closing} />
            {model.argumentFrame ? (
              <OutlineArgumentFrame
                frame={model.argumentFrame}
                onSelectClaim={(claimId) => onInspectorSelectionChange({ kind: "argument-claim", claimId })}
              />
            ) : null}

            {selectedSection ? (
              <SelectedOutlineSection
                section={selectedSection}
                isFirst={selectedIndex <= 0}
                isLast={selectedIndex >= model.sections.length - 1}
                onPrevious={() => selectRelativeSection(-1)}
                onNext={() => selectRelativeSection(1)}
              />
            ) : null}
          </div>
          {selectedSection ? <OutlineSectionRail section={selectedSection} model={model} /> : null}
        </div>
      )}
    </section>
  );
}

function OutlineSectionRail({ section, model }: { section: OutlineSectionViewModel; model: OutlineEditorViewModel }) {
  return (
    <aside className="redesign-outline-rail" aria-label="章节检查">
      <OutlineSectionHealth section={section} />
      <section className="redesign-outline-rail-card">
        <div className="redesign-outline-section-head">
          <div>
            <span>章节强度</span>
            <h3>结构雷达</h3>
          </div>
          <Chip tone={section.tone}>{section.statusLabel}</Chip>
        </div>
        <div className="redesign-outline-radar" aria-label={`章节健康度 ${section.healthScore}`}>
          <strong>{section.healthScore}</strong>
          <span>{section.healthLabel}</span>
        </div>
        <div className="redesign-outline-rail-list">
          <div>
            <span>总章节</span>
            <strong>{model.totalSections}</strong>
          </div>
          <div>
            <span>证据覆盖</span>
            <strong>{model.continuityCoverageLabel}</strong>
          </div>
          <div>
            <span>弱支撑段落</span>
            <strong>{model.weakSectionCount}</strong>
          </div>
        </div>
      </section>
    </aside>
  );
}

function OutlineMetric({ label, value, detail }: { label: string; value: string | number; detail: string }) {
  return (
    <div className="redesign-outline-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

function OutlineFrameSummary({ hook, closing }: { hook: string; closing: string }) {
  return (
    <section className="redesign-outline-frame" aria-label="文章开合">
      <div>
        <span>引子</span>
        <p>{hook || "还没有引子。"}</p>
      </div>
      <div>
        <span>收尾</span>
        <p>{closing || "还没有收尾。"}</p>
      </div>
    </section>
  );
}

function OutlineArgumentFrame({
  frame,
  onSelectClaim,
}: {
  frame: NonNullable<OutlineEditorViewModel["argumentFrame"]>;
  onSelectClaim: (claimId: string) => void;
}) {
  return (
    <section className="redesign-outline-argument" aria-label="论证骨架">
      <div className="redesign-outline-section-head">
        <div>
          <span>论证骨架</span>
          <h3>{frame.primaryShapeLabel}</h3>
        </div>
        {frame.secondaryShapeLabels.length ? <Chip tone="neutral">{frame.secondaryShapeLabels.join(" / ")}</Chip> : null}
      </div>
      <div className="redesign-outline-argument-copy">
        <p>{frame.centralTension}</p>
        <strong>{frame.answer}</strong>
      </div>
      {frame.notThis.length ? (
        <div className="redesign-outline-not-this">
          <span>不要写成</span>
          <div>
            {frame.notThis.map((item) => (
              <Chip key={item}>{item}</Chip>
            ))}
          </div>
        </div>
      ) : null}
      <div className="redesign-outline-claim-list">
        {frame.claims.map((claim) => (
          <OutlineClaimButton claim={claim} key={claim.id} onSelect={() => onSelectClaim(claim.id)} />
        ))}
      </div>
    </section>
  );
}

function OutlineClaimButton({ claim, onSelect }: { claim: OutlineClaimViewModel; onSelect: () => void }) {
  return (
    <button type="button" className="redesign-outline-claim" onClick={onSelect}>
      <span>{claim.roleLabel}</span>
      <strong>{claim.claim}</strong>
      <small>{claim.evidenceCount} 证据 / {claim.mustUseEvidenceCount} 必要</small>
      {claim.shouldNotBecomeSection ? <em>不独立成章</em> : null}
    </button>
  );
}

function SelectedOutlineSection({
  section,
  isFirst,
  isLast,
  onPrevious,
  onNext,
}: {
  section: OutlineSectionViewModel;
  isFirst: boolean;
  isLast: boolean;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <article className={`redesign-outline-selected redesign-tone-${section.tone}`} aria-label="当前段落详情">
      <div className="redesign-outline-selected-head">
        <div>
          <span>段落 {section.index + 1}</span>
          <h3>{section.heading}</h3>
        </div>
        <div className="redesign-outline-head-actions">
          <Chip tone={section.tone}>{section.statusLabel}</Chip>
          <Button type="button" variant="ghost" size="sm" disabled={isFirst} onClick={onPrevious}>
            上一段
          </Button>
          <Button type="button" variant="ghost" size="sm" disabled={isLast} onClick={onNext}>
            下一段
          </Button>
        </div>
      </div>

      <div className="redesign-outline-selected-body">
        <section>
          <span>主判断</span>
          <p>{section.thesis}</p>
        </section>
        <section>
          <span>段落目的</span>
          <p>{section.purpose}</p>
        </section>
        <section>
          <span>主线句</span>
          <p>{section.mainlineSentence}</p>
        </section>
        <section>
          <span>必须落地</span>
          <p>{section.mustLandDetail}</p>
        </section>
        <section>
          <span>场景 / 代价</span>
          <p>{section.sceneOrCost}</p>
        </section>
        <section>
          <span>读者用途</span>
          <p>{section.readerUsefulness}</p>
        </section>
      </div>

      {section.flags.length ? <OutlineFlags flags={section.flags} /> : null}
      {section.continuity ? (
        <section className="redesign-outline-continuity" aria-label="连续性">
          <div>
            <span>承接问题</span>
            <p>{section.continuity.inheritedQuestion}</p>
          </div>
          <div>
            <span>本段回答</span>
            <p>{section.continuity.answerThisSection}</p>
          </div>
          <div>
            <span>留下问题</span>
            <p>{section.continuity.leavesQuestionForNext}</p>
          </div>
          <div>
            <span>下一段必要性</span>
            <p>{section.continuity.nextSectionNecessity}</p>
          </div>
        </section>
      ) : null}

      {section.supportingClaim ? (
        <section className="redesign-outline-supporting-claim" aria-label="支撑论点">
          <span>{section.supportingClaim.roleLabel}</span>
          <p>{section.supportingClaim.claim}</p>
        </section>
      ) : null}

      <section className="redesign-outline-evidence" aria-label="支撑资料">
        <div className="redesign-outline-section-head">
          <div>
            <span>支撑资料</span>
            <h3>{section.evidenceCount} 条证据</h3>
          </div>
          <Chip tone={section.requiredEvidenceCount ? "accent" : "warning"}>{section.requiredEvidenceCount} 必要</Chip>
        </div>
        {section.sourceReferences.length ? (
          <div className="redesign-outline-source-list">
            {section.sourceReferences.map((source) => (
              <div className="redesign-outline-source" key={source.id}>
                <strong>{source.title}</strong>
                <p>{source.summary}</p>
                <Chip tone={source.credibility === "高" ? "success" : source.credibility === "低" ? "warning" : "neutral"}>
                  {source.credibility === "未知" ? "未知可信度" : `${source.credibility}可信`}
                </Chip>
              </div>
            ))}
          </div>
        ) : (
          <p className="redesign-outline-no-evidence">这段还没有绑定可读资料卡。</p>
        )}
      </section>
    </article>
  );
}

function OutlineSectionHealth({ section }: { section: OutlineSectionViewModel }) {
  return (
    <section className="redesign-outline-health" aria-label="章节体检">
      <div className="redesign-outline-health-score">
        <span>章节健康度</span>
        <strong>{section.healthScore}</strong>
        <small>{section.healthLabel}</small>
      </div>
      <div className="redesign-outline-health-grid">
        <OutlineHealthMetric label="证据" value={section.evidenceCount} detail={`${section.requiredEvidenceCount} 必要`} />
        <OutlineHealthMetric label="连续性" value={section.continuity ? "已绑定" : "缺失"} detail="段落链路" />
        <OutlineHealthMetric label="复查项" value={section.flags.length} detail={section.statusLabel} />
      </div>
      <OutlineActionList title="缺失论据" emptyLabel="暂无明显缺口" items={section.missingItems} />
      <OutlineActionList title="优化建议" emptyLabel="保持当前结构" items={section.optimizationSuggestions} />
    </section>
  );
}

function OutlineHealthMetric({ label, value, detail }: { label: string; value: string | number; detail: string }) {
  return (
    <div className="redesign-outline-health-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

function OutlineActionList({
  title,
  emptyLabel,
  items,
}: {
  title: string;
  emptyLabel: string;
  items: OutlineSectionActionViewModel[];
}) {
  return (
    <div className="redesign-outline-action-list">
      <span>{title}</span>
      {items.length ? (
        <div>
          {items.map((item) => (
            <div className={`redesign-outline-action-item redesign-tone-${item.tone}`} key={item.id}>
              <strong>{item.title}</strong>
              <p>{item.detail}</p>
            </div>
          ))}
        </div>
      ) : (
        <p>{emptyLabel}</p>
      )}
    </div>
  );
}

function OutlineFlags({ flags }: { flags: OutlineSectionFlagViewModel[] }) {
  return (
    <div className="redesign-outline-flags" aria-label="段落风险">
      {flags.map((flag) => (
        <Chip tone={flag.tone} key={flag.label}>
          {flag.label}
        </Chip>
      ))}
    </div>
  );
}
