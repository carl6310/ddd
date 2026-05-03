"use client";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import type { CompatibilityFieldViewModel, CompatibilityGroupViewModel, CompatibilityWorkspaceViewModel } from "@/lib/design/view-models";
import type { ActiveTab, WorkspaceSection } from "../workflow-state";

export function CompatibilityWorkspace({
  model,
  isPending,
  onNavigate,
}: {
  model: CompatibilityWorkspaceViewModel;
  isPending: boolean;
  onNavigate: (tab: ActiveTab, section: WorkspaceSection) => void;
}) {
  return (
    <section className="redesign-compatibility-workspace" aria-label="系统映射">
      <div className={`redesign-compatibility-hero redesign-tone-${model.tone}`}>
        <div className="redesign-compatibility-hero-copy">
          <span>系统映射</span>
          <h2>{model.projectTitle}</h2>
          <p>{model.summary}</p>
        </div>
        <div className="redesign-compatibility-actions">
          <Button type="button" variant="secondary" disabled={isPending} onClick={() => onNavigate("overview", "overview-think-card")}>
            回选题判断
          </Button>
          <Button type="button" variant="primary" disabled={isPending} onClick={() => onNavigate("overview", "overview-style-core")}>
            调整表达策略
          </Button>
        </div>
      </div>

      <div className="redesign-compatibility-metrics" aria-label="兼容层概览">
        <CompatibilityMetric label="字段完整度" value={model.completionLabel} detail={`${model.totalFieldCount} 个兼容字段`} tone={model.tone} />
        <CompatibilityMetric label="已对齐" value={model.alignedCount} detail="与当前主字段一致" tone="success" />
        <CompatibilityMetric label="有差异" value={model.differenceCount} detail="保存判断后可重新派生" tone={model.differenceCount > 0 ? "warning" : "success"} />
        <CompatibilityMetric label="待同步" value={model.missingCount} detail="旧字段仍为空" tone={model.missingCount > 0 ? "accent" : "success"} />
      </div>

      <div className="redesign-compatibility-grid">
        <main className="redesign-compatibility-main" aria-label="兼容字段映射">
          <div className="redesign-compatibility-panel-head">
            <div>
              <span>读取模型</span>
              <h3>旧字段与新判断核心</h3>
            </div>
            <Chip tone={model.tone}>{model.completionLabel}</Chip>
          </div>
          <div className="redesign-compatibility-group-list">
            {model.groups.map((group) => (
              <CompatibilityGroup key={group.id} group={group} />
            ))}
          </div>
        </main>

        <aside className="redesign-compatibility-side" aria-label="兼容说明">
          <div className="redesign-compatibility-panel-head">
            <div>
              <span>运行说明</span>
              <h3>运行态说明</h3>
            </div>
          </div>
          <div className="redesign-compatibility-note">
            <strong>主工作流以 ThinkCard / StyleCore 为准。</strong>
            <p>HKRR、HAMD 和旧动作卡仍保留为兼容字段，供旧提示词、正文生成和质检链路读取。</p>
          </div>
          <div className="redesign-compatibility-note">
            <strong>这里不直接编辑旧字段。</strong>
            <p>当选题判断或表达策略被保存时，仓储层会用现有兼容派生逻辑重新写入旧字段。</p>
          </div>
          <div className="redesign-compatibility-note">
            <strong>差异不是阻塞。</strong>
            <p>它表示历史兼容字段和当前主字段不完全一致；优先以新判断核心继续推进。</p>
          </div>
        </aside>
      </div>
    </section>
  );
}

function CompatibilityMetric({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string | number;
  detail: string;
  tone: CompatibilityWorkspaceViewModel["tone"];
}) {
  return (
    <div className={`redesign-compatibility-metric redesign-tone-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

function CompatibilityGroup({ group }: { group: CompatibilityGroupViewModel }) {
  return (
    <article className={`redesign-compatibility-group redesign-tone-${group.tone}`}>
      <div className="redesign-compatibility-group-head">
        <div>
          <span>{group.title}</span>
          <h4>{group.filled}/{group.total} 已填写</h4>
          <p>{group.subtitle}</p>
        </div>
        <Chip tone={group.tone}>{group.differenceCount > 0 ? `${group.differenceCount} 差异` : group.missingCount > 0 ? `${group.missingCount} 待同步` : "已对齐"}</Chip>
      </div>
      <p className="redesign-compatibility-summary">{group.summary}</p>
      <div className="redesign-compatibility-field-list">
        {group.fields.map((field) => (
          <CompatibilityField key={field.id} field={field} />
        ))}
      </div>
    </article>
  );
}

function CompatibilityField({ field }: { field: CompatibilityFieldViewModel }) {
  return (
    <article className={`redesign-compatibility-field redesign-tone-${field.tone}`}>
      <div className="redesign-compatibility-field-head">
        <div>
          <span>{field.label}</span>
          <strong>{field.sourceLabel}</strong>
        </div>
        <Chip tone={field.tone}>{field.statusLabel}</Chip>
      </div>
      <div className="redesign-compatibility-field-values">
        <div>
          <span>兼容字段</span>
          <p>{field.storedValue}</p>
        </div>
        <div>
          <span>当前主字段</span>
          <p>{field.canonicalValue}</p>
        </div>
      </div>
    </article>
  );
}
