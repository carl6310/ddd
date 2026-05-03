"use client";

import type { Dispatch, SetStateAction } from "react";
import type { ProjectBundle, SectorZone } from "@/lib/types";
import { AutoGrowTextarea } from "@/components/ui/auto-grow-textarea";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import type { SectorModelEvidenceViewModel, SectorModelWorkspaceViewModel, SectorZoneViewModel } from "@/lib/design/view-models";
import type { WorkbenchStepPath } from "../workflow-state";
import type { WorkbenchDisplayMode } from "../display-mode";

type BundleSetter = Dispatch<SetStateAction<ProjectBundle | null>>;
type StaleArtifact = "research-brief" | "sector-model" | "outline" | "drafts" | "review" | "publish-prep";

export function SectorModelWorkspace({
  model,
  selectedBundle,
  selectedProjectId,
  setSelectedBundle,
  refreshProjectsAndBundle,
  isPending,
  setIsPending,
  setMessage,
  markArtifactsStale,
  onExecute,
  displayMode,
}: {
  model: SectorModelWorkspaceViewModel;
  selectedBundle: ProjectBundle;
  selectedProjectId: string;
  setSelectedBundle: BundleSetter;
  refreshProjectsAndBundle: (id?: string) => Promise<void>;
  isPending: boolean;
  setIsPending: (pending: boolean) => void;
  setMessage: (msg: string) => void;
  markArtifactsStale: (artifacts: StaleArtifact[]) => void;
  onExecute: (step: WorkbenchStepPath) => Promise<void>;
  displayMode: WorkbenchDisplayMode;
}) {
  const sectorModel = selectedBundle.sectorModel;

  async function saveSectorModel() {
    if (!selectedProjectId || !selectedBundle.sectorModel) {
      return;
    }

    setIsPending(true);
    try {
      setMessage("");
      const response = await fetch(`/api/projects/${selectedProjectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectorModel: selectedBundle.sectorModel }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "保存板块建模失败。");
      }
      await refreshProjectsAndBundle(selectedProjectId);
      markArtifactsStale(["outline", "drafts", "review", "publish-prep"]);
      setMessage("板块建模已保存。提纲、正文、检查和发布整理可能需要重生成。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存板块建模失败。");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <section className="redesign-sector-model" aria-label="板块建模">
      <div className="redesign-sector-hero">
        <div className="redesign-sector-hero-copy">
          <span>板块建模</span>
          <h2>{model.projectTitle}</h2>
          <p>{model.hasSectorModel ? model.summaryJudgement || "板块建模已生成，可以继续修正空间骨架和片区证据。" : "把研究资料翻成空间骨架、切割线和片区证据地图。"}</p>
        </div>
        <div className="redesign-sector-actions">
          <Button type="button" variant="secondary" disabled={isPending || !model.hasSectorModel} onClick={() => void saveSectorModel()}>
            保存修改
          </Button>
          <Button type="button" variant="primary" disabled={isPending || !model.canGenerateSectorModel} onClick={() => void onExecute("sector-model")}>
            {model.hasSectorModel ? "重新生成建模" : "生成板块建模"}
          </Button>
        </div>
      </div>

      <div className="redesign-sector-metrics" aria-label="板块建模概览">
        <SectorMetric label="片区" value={model.zoneCount} detail={model.hasSectorModel ? "空间分组" : "待生成"} />
        <SectorMetric label="资料卡" value={model.sourceCount} detail={`${model.highCredibilityCount} 高可信`} />
        <SectorMetric label="建模证据" value={model.modelEvidenceCount} detail={`${model.orphanSourceCount} 未接入`} />
        <SectorMetric label="切割线" value={model.cutLines.length} detail={`${model.futureWatchpoints.length} 未来变量`} />
      </div>

      {!sectorModel ? (
        <EmptyState
          title="还没有板块建模"
          className="workbench-empty-state redesign-sector-empty"
          action={
            <Button type="button" variant="primary" disabled={isPending || !model.canGenerateSectorModel} onClick={() => void onExecute("sector-model")}>
              生成板块建模
            </Button>
          }
        >
          <p>{model.canGenerateSectorModel ? "研究清单和资料卡已就绪，可以生成空间判断。" : "需要先完成研究清单并录入至少一张资料卡。"}</p>
        </EmptyState>
      ) : (
        <div className="redesign-sector-grid">
          <main className="redesign-sector-main" aria-label="宏观判断">
            <div className="redesign-sector-panel-head">
              <div>
                <span>全局判断</span>
                <h3>宏观判断</h3>
              </div>
              <Chip tone="accent">{model.zoneCount} 个片区</Chip>
            </div>
            <div className="redesign-sector-form-grid">
              <TextAreaField label="总判断" value={sectorModel.summaryJudgement} rows={3} onChange={(value) => updateSectorModel(setSelectedBundle, { ...sectorModel, summaryJudgement: value })} />
              <TextAreaField label="误解点" value={sectorModel.misconception} rows={3} onChange={(value) => updateSectorModel(setSelectedBundle, { ...sectorModel, misconception: value })} />
              <TextAreaField label="空间骨架" value={sectorModel.spatialBackbone} rows={4} onChange={(value) => updateSectorModel(setSelectedBundle, { ...sectorModel, spatialBackbone: value })} />
              <TextAreaField label="供地判断" value={sectorModel.supplyObservation} rows={4} onChange={(value) => updateSectorModel(setSelectedBundle, { ...sectorModel, supplyObservation: value })} />
              <ListField label="切割线" value={sectorModel.cutLines} rows={5} onChange={(value) => updateSectorModel(setSelectedBundle, { ...sectorModel, cutLines: value })} />
              <ListField label="未来变量" value={sectorModel.futureWatchpoints} rows={5} onChange={(value) => updateSectorModel(setSelectedBundle, { ...sectorModel, futureWatchpoints: value })} />
            </div>
            <section className="redesign-sector-evidence-map" aria-label="全局证据">
              <div className="redesign-sector-panel-head">
                <div>
                  <span>建模证据</span>
                  <h3>建模证据池</h3>
                </div>
              </div>
              <EvidenceSelector
                selectedIds={sectorModel.evidenceIds}
                sourceCards={model.sourceCards}
                helperText="给整个板块模型挑选最关键的资料卡。"
                displayMode={displayMode}
                onChange={(nextIds) => updateSectorModel(setSelectedBundle, { ...sectorModel, evidenceIds: nextIds })}
              />
            </section>
          </main>

          <aside className="redesign-sector-side" aria-label="片区证据地图">
            <div className="redesign-sector-panel-head">
              <div>
                <span>片区地图</span>
                <h3>片区证据地图</h3>
              </div>
            </div>
            <div className="redesign-sector-zone-list">
              {model.zones.map((zone) => (
                <SectorZoneCard
                  zone={zone}
                  key={zone.id}
                  sourceCards={model.sourceCards}
                  displayMode={displayMode}
                  selectedBundle={selectedBundle}
                  setSelectedBundle={setSelectedBundle}
                />
              ))}
            </div>
          </aside>
        </div>
      )}
    </section>
  );
}

function SectorMetric({ label, value, detail }: { label: string; value: string | number; detail: string }) {
  return (
    <div className="redesign-sector-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

function SectorZoneCard({
  zone,
  sourceCards,
  displayMode,
  selectedBundle,
  setSelectedBundle,
}: {
  zone: SectorZoneViewModel;
  sourceCards: SectorModelEvidenceViewModel[];
  displayMode: WorkbenchDisplayMode;
  selectedBundle: ProjectBundle;
  setSelectedBundle: BundleSetter;
}) {
  const sectorModel = selectedBundle.sectorModel;
  const sourceZone = sectorModel?.zones[zone.index] ?? null;
  if (!sectorModel || !sourceZone) {
    return null;
  }
  const currentSectorModel = sectorModel;

  function updateZone(patch: Partial<SectorZone>) {
    updateSectorModel(setSelectedBundle, {
      ...currentSectorModel,
      zones: currentSectorModel.zones.map((entry, index) => (index === zone.index ? { ...entry, ...patch } : entry)),
    });
  }

  return (
    <article className={`redesign-sector-zone-card redesign-tone-${zone.tone}`}>
      <div className="redesign-sector-zone-head">
        <span>{String(zone.index + 1).padStart(2, "0")}</span>
        <Chip tone={zone.evidenceCount > 0 ? "success" : "warning"}>{zone.evidenceCount} 证据</Chip>
      </div>
      <div className="redesign-sector-zone-fields">
        <InputField label="片区名" value={sourceZone.name} onChange={(value) => updateZone({ name: value })} />
        <InputField label="标签" value={sourceZone.label} onChange={(value) => updateZone({ label: value })} />
        <TextAreaField label="片区描述" value={sourceZone.description} rows={4} onChange={(value) => updateZone({ description: value })} />
        <ListField label="优势" value={sourceZone.strengths} rows={4} onChange={(value) => updateZone({ strengths: value })} />
        <ListField label="风险" value={sourceZone.risks} rows={4} onChange={(value) => updateZone({ risks: value })} />
        <ListField label="适合人群" value={sourceZone.suitableBuyers} rows={4} onChange={(value) => updateZone({ suitableBuyers: value })} />
      </div>
      <EvidenceSelector
        selectedIds={sourceZone.evidenceIds}
        sourceCards={sourceCards}
        helperText="给这个片区挑几张最能支撑判断的资料卡。"
        displayMode={displayMode}
        onChange={(nextIds) => updateZone({ evidenceIds: nextIds })}
      />
    </article>
  );
}

function EvidenceSelector({
  selectedIds,
  sourceCards,
  helperText,
  displayMode,
  onChange,
}: {
  selectedIds: string[];
  sourceCards: SectorModelEvidenceViewModel[];
  helperText: string;
  displayMode: WorkbenchDisplayMode;
  onChange: (nextIds: string[]) => void;
}) {
  const selectedCards = selectedIds
    .map((id) => sourceCards.find((card) => card.id === id))
    .filter((card): card is SectorModelEvidenceViewModel => Boolean(card));

  function toggleSourceCard(sourceCardId: string) {
    if (selectedIds.includes(sourceCardId)) {
      onChange(selectedIds.filter((id) => id !== sourceCardId));
      return;
    }
    onChange([...selectedIds, sourceCardId]);
  }

  return (
    <div className="redesign-sector-evidence-picker">
      <p>{helperText}</p>
      {selectedCards.length ? (
        <div className="redesign-sector-evidence-selected">
          {selectedCards.map((card) => (
            <button type="button" key={card.id} onClick={() => toggleSourceCard(card.id)} title={`点击移除：${card.title}`}>
              <strong>{card.title}</strong>
              {displayMode === "debug" ? <span>{card.id}</span> : null}
            </button>
          ))}
        </div>
      ) : (
        <p className="redesign-sector-muted">还没选资料卡。下面按标题勾选即可。</p>
      )}
      <div className="redesign-sector-evidence-list">
        {sourceCards.map((card) => {
          const checked = selectedIds.includes(card.id);
          return (
            <label key={card.id} className={`redesign-sector-evidence-card ${checked ? "is-selected" : ""}`}>
              <input type="checkbox" checked={checked} onChange={() => toggleSourceCard(card.id)} />
              <span>
                <strong>{card.title}</strong>
                <small>{card.summary}</small>
                <em>{card.credibility}可信 / {formatSupportLevel(card.supportLevel)}</em>
                {displayMode === "debug" ? <code>{card.id}</code> : null}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

function TextAreaField({
  label,
  value,
  rows,
  onChange,
}: {
  label: string;
  value: string;
  rows: number;
  onChange: (value: string) => void;
}) {
  return (
    <label className="redesign-sector-field">
      <span>{label}</span>
      <AutoGrowTextarea value={value} rows={rows} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function InputField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="redesign-sector-field">
      <span>{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function ListField({
  label,
  value,
  rows,
  onChange,
}: {
  label: string;
  value: string[];
  rows: number;
  onChange: (value: string[]) => void;
}) {
  return <TextAreaField label={label} value={value.join("\n")} rows={rows} onChange={(nextValue) => onChange(splitLines(nextValue))} />;
}

function updateSectorModel(setSelectedBundle: BundleSetter, nextSectorModel: NonNullable<ProjectBundle["sectorModel"]>) {
  setSelectedBundle((current) =>
    current
      ? {
          ...current,
          sectorModel: nextSectorModel,
        }
      : current,
  );
}

function splitLines(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatSupportLevel(value: SectorModelEvidenceViewModel["supportLevel"]) {
  switch (value) {
    case "high":
      return "强支撑";
    case "medium":
      return "中支撑";
    case "low":
      return "弱支撑";
  }
}
