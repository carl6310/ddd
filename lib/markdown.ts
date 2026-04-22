import { buildEvidenceSummaryLines } from "@/lib/evidence/analyzer";
import type { ArticleProject, OutlineDraft, ProjectBundle, PublishPackage, SectorModel, SourceCard } from "@/lib/types";
import { buildWritingQualitySummaryLines } from "@/lib/writing-quality/summary";

export function buildProjectMarkdown(bundle: ProjectBundle): string {
  const { project, researchBrief, sectorModel, outlineDraft, articleDraft, sourceCards, reviewReport } = bundle;
  const publishPackage = bundle.publishPackage;
  const draft = publishPackage?.finalMarkdown || articleDraft?.editedMarkdown || articleDraft?.narrativeMarkdown || articleDraft?.analysisMarkdown || "";

  const sections = [
    `# ${project.topic}`,
    `> 文章类型：${project.articleType} | 目标读者：${project.audience} | 当前阶段：${project.stage}`,
    `> 主命题：${project.thesis}`,
    "",
    "## ThinkCard",
    `- 素材吃透：${project.thinkCard.materialDigest || "待补"}`,
    `- 选题值：${project.thinkCard.topicVerdict || "待补"}`,
    `- 判断原因：${project.thinkCard.verdictReason || "待补"}`,
    `- HKR：${project.thinkCard.hkr.happy || "待补"} / ${project.thinkCard.hkr.knowledge || "待补"} / ${project.thinkCard.hkr.resonance || "待补"}`,
    `- 改方向建议：${project.thinkCard.rewriteSuggestion || "待补"}`,
    `- 替代角度：${project.thinkCard.alternativeAngles.join(" / ") || "暂无"}`,
    `- AI 角色：${project.thinkCard.aiRole || "待补"}`,
    "",
    "## StyleCore",
    `- 节奏推进：${project.styleCore.rhythm || "待补"}`,
    `- 故意打破：${project.styleCore.breakPattern || "待补"}`,
    `- 知识顺手掏出来：${project.styleCore.knowledgeDrop || "待补"}`,
    `- 私人视角：${project.styleCore.personalView || "待补"}`,
    `- 判断力：${project.styleCore.judgement || "待补"}`,
    `- 对立面理解：${project.styleCore.counterView || "待补"}`,
    `- 情绪递进：${project.styleCore.emotionCurve || "待补"}`,
    `- 亲自下场：${project.styleCore.personalStake || "待补"}`,
    `- 人物画像法：${project.styleCore.characterPortrait || "待补"}`,
    `- 文化升维：${project.styleCore.culturalLift || "待补"}`,
    `- 句式断裂：${project.styleCore.sentenceBreak || "待补"}`,
    `- 回环呼应：${project.styleCore.echo || "待补"}`,
    `- 谦逊铺垫法：${project.styleCore.humbleSetup || "待补"}`,
    `- 现实代价：${project.styleCore.costSense || "待补"}`,
    "",
    "## 核心问题",
    project.coreQuestion || "暂未生成",
    "",
    researchBrief
      ? [
          "## 研究清单",
          `- 角度：${researchBrief.angle}`,
          ...researchBrief.mustResearch.map(
            (item) => `- ${item.dimension}：${item.reason}（需要补齐：${item.expectedEvidence}）`,
          ),
          "",
        ].join("\n")
      : "",
    sectorModel
      ? [
          "## 板块建模",
          `- 总判断：${sectorModel.summaryJudgement}`,
          `- 误解点：${sectorModel.misconception}`,
          `- 空间骨架：${sectorModel.spatialBackbone}`,
          `- 切割线：${sectorModel.cutLines.join(" / ")}`,
          "",
        ].join("\n")
      : "",
    outlineDraft
      ? [
          "## 提纲",
          ...outlineDraft.sections.map(
            (section, index) =>
              `${index + 1}. ${section.heading}\n   - 目标：${section.purpose}\n   - 段落主判断：${section.sectionThesis || "待补"}\n   - 唯一动作：${section.singlePurpose || "待补"}\n   - 必须落地：${section.mustLandDetail || "待补"}\n   - 场景/代价：${section.sceneOrCost || "待补"}\n   - 动作：${section.move}\n   - 打破：${section.break}\n   - 承接：${section.bridge}\n   - 承接目标：${section.transitionTarget || "待补"}\n   - 反面/反证：${section.counterPoint || "待补"}\n   - 风格目标：${section.styleObjective}\n   - 强约束证据：${section.mustUseEvidenceIds?.join(", ") || "待补"}\n   - 证据：${section.evidenceIds.join(", ") || "待补"}\n   - 节奏：${section.tone}`,
          ),
          "",
        ].join("\n")
      : "",
    "## 成文稿",
    draft || "暂未生成",
    "",
    "## 资料卡索引",
    ...sourceCards.map((card) => formatSourceCard(card)),
    "",
    sourceCards.length > 0
      ? [
          "## Evidence Summary",
          ...buildEvidenceSummaryLines(bundle),
          "",
        ].join("\n")
      : "",
    bundle.articleDraft || bundle.reviewReport
      ? [
          "## Writing Quality Summary",
          ...buildWritingQualitySummaryLines(bundle),
          "",
        ].join("\n")
      : "",
    reviewReport
      ? [
          "## 质检报告",
          `- 总结：${reviewReport.overallVerdict}`,
          `- 完成度：${reviewReport.completionScore}`,
          ...reviewReport.checks.map((check) => `- [${check.status}] ${check.title}：${check.detail}`),
        ].join("\n")
      : "",
    project.vitalityCheck
      ? [
          "## VitalityCheck",
          `- 总结：${project.vitalityCheck.overallVerdict}`,
          `- 状态：${project.vitalityCheck.overallStatus}`,
          ...project.vitalityCheck.entries.map((entry) => `- [${entry.status}] ${entry.title}：${entry.detail}`),
        ].join("\n")
      : "",
    publishPackage ? buildPublishMarkdown(publishPackage) : "",
    "",
  ].filter(Boolean);

  return sections.join("\n");
}

function formatSourceCard(card: SourceCard): string {
  const locator = card.url || card.note || "无外部链接";
  return `- [SC:${card.id}] ${card.title} | ${locator} | 可信度：${card.credibility} | 来源：${card.sourceType} | 支撑：${card.supportLevel} | 论断：${card.claimType}${card.intendedSection ? ` | 预期落段：${card.intendedSection}` : ""}`;
}

export function buildCitationCoverageText(project: ArticleProject, sourceCards: SourceCard[]): string {
  return `${project.topic} 当前已有 ${sourceCards.length} 张资料卡。`;
}

export function buildAnalysisDraft(input: {
  project: ArticleProject;
  sectorModel: SectorModel;
  outlineDraft: OutlineDraft;
  sourceCards: SourceCard[];
}): string {
  const { project, sectorModel, outlineDraft, sourceCards } = input;
  const sourceMap = new Map(sourceCards.map((card) => [card.id, card]));

  const zoneLines = sectorModel.zones.map((zone) => {
    const evidenceTitles = zone.evidenceIds
      .map((id) => sourceMap.get(id)?.title || id)
      .join("、");
    return `- ${zone.name}：${zone.label}。优势：${zone.strengths.join("、")}。风险：${zone.risks.join("、")}。证据：${evidenceTitles}`;
  });

  const outlineLines = outlineDraft.sections.map(
    (section) =>
      `- ${section.heading}：主判断：${section.sectionThesis || "待补"}。唯一动作：${section.singlePurpose || "待补"}。必须落地：${section.mustLandDetail || "待补"}。场景/代价：${section.sceneOrCost || "待补"}。动作：${section.move}。打破：${section.break}。承接：${section.bridge}。承接目标：${section.transitionTarget || "待补"}。反面/反证：${section.counterPoint || "待补"}。风格目标：${section.styleObjective}。强约束证据：${section.mustUseEvidenceIds?.join("、") || "待补"}。一般证据：${section.evidenceIds.join("、") || "待补"}`,
  );

  return [
    `# ${project.topic}，分析版`,
    "",
    `**主判断**：${project.thesis}`,
    "",
    `**选题值**：${project.thinkCard.topicVerdict || "待补"}`,
    `**判断原因**：${project.thinkCard.verdictReason || "待补"}`,
    "",
    "## ThinkCard",
    `- 素材吃透：${project.thinkCard.materialDigest || "待补"}`,
    `- HKR-Happy：${project.thinkCard.hkr.happy || "待补"}`,
    `- HKR-Knowledge：${project.thinkCard.hkr.knowledge || "待补"}`,
    `- HKR-Resonance：${project.thinkCard.hkr.resonance || "待补"}`,
    `- 改方向建议：${project.thinkCard.rewriteSuggestion || "待补"}`,
    "",
    "## StyleCore",
    `- 节奏推进：${project.styleCore.rhythm || "待补"}`,
    `- 故意打破：${project.styleCore.breakPattern || "待补"}`,
    `- 人物画像法：${project.styleCore.characterPortrait || "待补"}`,
    `- 文化升维：${project.styleCore.culturalLift || "待补"}`,
    `- 句式断裂：${project.styleCore.sentenceBreak || "待补"}`,
    `- 回环呼应：${project.styleCore.echo || "待补"}`,
    `- 现实代价：${project.styleCore.costSense || "待补"}`,
    "",
    "## 空间结构",
    `- 误解点：${sectorModel.misconception}`,
    `- 空间骨架：${sectorModel.spatialBackbone}`,
    `- 切割线：${sectorModel.cutLines.join(" / ")}`,
    `- 供地判断：${sectorModel.supplyObservation}`,
    "",
    "## 片区拆解",
    ...zoneLines,
    "",
    "## 提纲摘要",
    ...outlineLines,
    "",
    "## 资料卡索引",
    ...sourceCards.map((card) => `- [SC:${card.id}] ${card.title}`),
  ].join("\n");
}

function buildPublishMarkdown(publishPackage: PublishPackage): string {
  return [
    "## 发布前整理",
    "### 标题候选",
    ...publishPackage.titleOptions.map((option, index) =>
      `- ${index + 1}. ${option.title}${option.isPrimary ? "（主打）" : ""}：${option.rationale}`,
    ),
    "",
    "### 摘要",
    publishPackage.summary,
    "",
    "### 配图位",
    ...publishPackage.imageCues.map(
      (cue) =>
        `- ${cue.id} | ${cue.placement} | ${cue.imageType} | ${cue.layout} | ${cue.purpose} | ${cue.brief} | 上下文：${cue.context} | 图注目标：${cue.captionGoal}`,
    ),
    "",
  ].join("\n");
}
