import { buildEvidenceSummaryLines } from "@/lib/evidence/analyzer";
import type { ArticleProject, OutlineDraft, ProjectBundle, PublishPackage, SectorModel, SourceCard } from "@/lib/types";
import { buildWritingQualitySummaryLines } from "@/lib/writing-quality/summary";

export function buildProjectMarkdown(bundle: ProjectBundle): string {
  const { project, researchBrief, sectorModel, outlineDraft, articleDraft, sourceCards, reviewReport, editorialFeedbackEvents } = bundle;
  const publishPackage = bundle.publishPackage;
  const sourceTitleById = new Map(sourceCards.map((card) => [card.id, card.title]));
  const draft = formatExportCitations(
    publishPackage?.finalMarkdown || articleDraft?.editedMarkdown || articleDraft?.narrativeMarkdown || articleDraft?.analysisMarkdown || "",
    sourceTitleById,
  );

  const sections = [
    `# ${project.topic}`,
    `> 文章类型：${project.articleType} | 目标读者：${project.audience} | 当前阶段：${project.stage}`,
    `> 主命题：${project.thesis}`,
    project.topicMeta.topicScorecard ? `> 开题建议：${project.topicMeta.topicScorecard.status} | HKR：${project.topicMeta.topicScorecard.hkr.h}/${project.topicMeta.topicScorecard.hkr.k}/${project.topicMeta.topicScorecard.hkr.r}` : "",
    "",
    project.topicMeta.signalBrief
      ? [
          "## 信号摘要",
          `- 模式：${project.topicMeta.signalMode || "未记录"}`,
          `- 新鲜度：${project.topicMeta.signalBrief.freshnessNote}`,
          ...project.topicMeta.signalBrief.signals.map(
            (signal) => `- [${signal.signalType}] ${signal.title} | ${[signal.source, signal.publishedAt].filter(Boolean).join(" / ")} | ${signal.summary}`,
          ),
          `- 缺口：${project.topicMeta.signalBrief.gaps.join(" / ") || "暂无"}`,
          "",
        ].join("\n")
      : "",
    project.topicMeta.topicScorecard
      ? [
          "## 选题评分",
          `- 状态：${project.topicMeta.topicScorecard.status}`,
          `- HKR：${project.topicMeta.topicScorecard.hkr.h} / ${project.topicMeta.topicScorecard.hkr.k} / ${project.topicMeta.topicScorecard.hkr.r}（总分 ${project.topicMeta.topicScorecard.hkr.total}）`,
          `- 读者价值：${project.topicMeta.topicScorecard.readerValueSummary}`,
          `- 信号覆盖：${project.topicMeta.topicScorecard.signalCoverageSummary}`,
          `- 风险：${project.topicMeta.topicScorecard.evidenceRisk}`,
          `- 建议：${project.topicMeta.topicScorecard.recommendation}`,
          "",
        ].join("\n")
      : "",
    "## 选题判断",
    `- 素材吃透：${project.thinkCard.materialDigest || "待补"}`,
    `- 选题值：${formatTopicVerdict(project.thinkCard.topicVerdict)}`,
    `- 判断原因：${project.thinkCard.verdictReason || "待补"}`,
    `- 文章原型：${formatArticlePrototype(project.thinkCard.articlePrototype)}`,
    `- 目标读者画像：${formatReaderPersona(project.thinkCard.targetReaderPersona)}`,
    `- 创作锚点：${project.thinkCard.creativeAnchor || "待补"}`,
    `- HKR：${project.thinkCard.hkr.happy || "待补"} / ${project.thinkCard.hkr.knowledge || "待补"} / ${project.thinkCard.hkr.resonance || "待补"}`,
    `- 改方向建议：${project.thinkCard.rewriteSuggestion || "待补"}`,
    `- 替代角度：${project.thinkCard.alternativeAngles.join(" / ") || "暂无"}`,
    `- AI 角色：${project.thinkCard.aiRole || "待补"}`,
    "",
    "## 表达策略",
    `- 节奏推进：${project.styleCore.rhythm || "待补"}`,
    `- 故意打破：${project.styleCore.breakPattern || "待补"}`,
    `- 开头动作：${project.styleCore.openingMoves.join(" / ") || "待补"}`,
    `- 转场动作：${project.styleCore.transitionMoves.join(" / ") || "待补"}`,
    `- 结尾回环动作：${project.styleCore.endingEchoMoves.join(" / ") || "待补"}`,
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
    `- 禁止编造：${project.styleCore.forbiddenFabrications.join(" / ") || "待补"}`,
    `- 泛化黑名单：${project.styleCore.genericLanguageBlackList.join(" / ") || "待补"}`,
    `- 不可靠场景检测：${project.styleCore.unsupportedSceneDetector || "待补"}`,
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
              `${index + 1}. ${section.heading}\n   - 目标：${section.purpose}\n   - 段落主判断：${section.sectionThesis || "待补"}\n   - 唯一动作：${section.singlePurpose || "待补"}\n   - 主线句：${section.mainlineSentence || "待补"}\n   - 回环目标：${section.callbackTarget || "待补"}\n   - 微型故事：${section.microStoryNeed || "待补"}\n   - 发现转折：${section.discoveryTurn || "待补"}\n   - 必须落地：${section.mustLandDetail || "待补"}\n   - 场景/代价：${section.sceneOrCost || "待补"}\n   - 对立观点：${section.opposingView || "待补"}\n   - 读者用途：${section.readerUsefulness || "待补"}\n   - 动作：${section.move}\n   - 打破：${section.break}\n   - 承接：${section.bridge}\n   - 承接目标：${section.transitionTarget || "待补"}\n   - 反面/反证：${section.counterPoint || "待补"}\n   - 风格目标：${section.styleObjective}\n   - 强约束证据：${formatEvidenceRefs(section.mustUseEvidenceIds ?? [], sourceTitleById)}\n   - 证据：${formatEvidenceRefs(section.evidenceIds, sourceTitleById)}\n   - 节奏：${section.tone}`,
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
          "## 资料覆盖摘要",
          ...buildEvidenceSummaryLines(bundle),
          "",
        ].join("\n")
      : "",
    bundle.articleDraft || bundle.reviewReport
      ? [
          "## 写作质量摘要",
          ...buildWritingQualitySummaryLines(bundle),
          "",
        ].join("\n")
      : "",
    reviewReport
      ? [
          "## 质检报告",
          `- 总结：${formatUserFacingWorkflowText(reviewReport.overallVerdict)}`,
          `- 完成度：${reviewReport.completionScore}`,
          ...reviewReport.checks.map((check) => `- [${formatUserFacingWorkflowText(check.status)}] ${formatUserFacingWorkflowText(check.title)}：${formatUserFacingWorkflowText(check.detail)}`),
          "",
          "## 质量金字塔",
          ...reviewReport.qualityPyramid.map(
            (layer) =>
              `- ${layer.level} ${formatUserFacingWorkflowText(layer.title)} [${formatUserFacingWorkflowText(layer.status)}]：${formatUserFacingWorkflowText(layer.summary)}${layer.mustFix.length ? ` | 必须修：${layer.mustFix.map(formatUserFacingWorkflowText).join("；")}` : ""}${layer.shouldFix.length ? ` | 建议修：${layer.shouldFix.map(formatUserFacingWorkflowText).join("；")}` : ""}`,
          ),
        ].join("\n")
      : "",
    editorialFeedbackEvents.length > 0
      ? [
          "## 编辑反馈",
          ...editorialFeedbackEvents.map((event) => `- ${formatEditorialEventType(event.eventType)} | ${event.sectionHeading} | 修改前=${event.beforeText.slice(0, 24)} | 修改后=${event.afterText.slice(0, 24)}`),
        ].join("\n")
      : "",
    project.vitalityCheck
      ? [
          "## 质量检查",
          `- 总结：${formatUserFacingWorkflowText(project.vitalityCheck.overallVerdict)}`,
          `- 状态：${formatUserFacingWorkflowText(project.vitalityCheck.overallStatus)}`,
          ...project.vitalityCheck.entries.map((entry) => `- [${formatUserFacingWorkflowText(entry.status)}] ${formatUserFacingWorkflowText(entry.title)}：${formatUserFacingWorkflowText(entry.detail)}`),
        ].join("\n")
      : "",
    publishPackage ? buildPublishMarkdown(publishPackage) : "",
    "",
  ].filter(Boolean);

  return sections.join("\n");
}

function formatSourceCard(card: SourceCard): string {
  const locator = card.url || card.note || "无外部链接";
  return `- ${card.title} | ${locator} | 可信度：${formatSourceMeta(card.credibility)} | 来源：${formatSourceMeta(card.sourceType)} | 支撑：${formatSourceMeta(card.supportLevel)} | 论断：${formatSourceMeta(card.claimType)}${card.intendedSection ? ` | 预期落段：${card.intendedSection}` : ""}`;
}

function formatExportCitations(markdown: string, sourceTitleById: Map<string, string>): string {
  return markdown.replace(/\[SC:([a-zA-Z0-9_-]+)\]/g, (_match, id: string) => `【资料：${sourceTitleById.get(id) ?? "未匹配资料卡"}】`);
}

function formatEvidenceRefs(ids: string[], sourceTitleById: Map<string, string>): string {
  if (ids.length === 0) {
    return "待补";
  }
  return ids.map((id) => sourceTitleById.get(id) ?? id).join("、");
}

function formatUserFacingWorkflowText(value: string): string {
  return value
    .replaceAll("ThinkCard / HKR", "选题判断")
    .replaceAll("ThinkCard", "选题判断")
    .replaceAll("StyleCore", "表达策略")
    .replaceAll("VitalityCheck", "质量检查")
    .replaceAll("WritingLint", "写作硬伤")
    .replaceAll("StructureFlow", "结构推进")
    .replaceAll("ContentDepth", "内容深度")
    .replaceAll("HumanFeel", "人感")
    .replaceAll("Quality Pyramid", "质量金字塔")
    .replaceAll("Quality gate", "质量门槛")
    .replaceAll("warn-only", "仅提醒")
    .replaceAll("hard-block", "强阻塞")
    .replaceAll("must_fix", "必须修")
    .replaceAll("should_fix", "建议修")
    .replaceAll("unsupported scene", "无证据场景")
    .replaceAll("pass", "通过")
    .replaceAll("warn", "提醒")
    .replaceAll("fail", "未通过");
}

function formatTopicVerdict(value: string | undefined): string {
  switch (value) {
    case "strong":
      return "值得写";
    case "rework":
      return "需要换角度";
    case "weak":
      return "暂不建议写";
    default:
      return value || "待补";
  }
}

function formatArticlePrototype(value: string | undefined): string {
  switch (value) {
    case "value_reassessment":
      return "价值重估";
    case "total_judgement":
      return "总体判断";
    case "spatial_segmentation":
      return "空间切割";
    case "buyer_split":
      return "买方分层";
    case "transaction_observation":
      return "成交观察";
    case "decision_service":
      return "决策服务";
    case "risk_deconstruction":
      return "风险拆解";
    case "scene_character":
      return "场景人物";
    default:
      return value || "待补";
  }
}

function formatReaderPersona(value: string | undefined): string {
  switch (value) {
    case "busy_relocator":
      return "通勤敏感的换房读者";
    case "improver_buyer":
      return "改善型购房读者";
    case "risk_aware_reader":
      return "风险敏感读者";
    case "local_life_reader":
      return "本地生活读者";
    default:
      return value || "待补";
  }
}

function formatSourceMeta(value: string): string {
  switch (value) {
    case "high":
      return "高";
    case "medium":
      return "中";
    case "low":
      return "低";
    case "manual":
      return "手动录入";
    case "official":
      return "官方资料";
    case "media":
      return "媒体资料";
    case "other":
      return "其他资料";
    case "direct":
      return "直接支撑";
    case "indirect":
      return "间接支撑";
    case "weak":
      return "弱支撑";
    case "fact":
      return "事实";
    case "analysis":
      return "分析";
    case "quote":
      return "引用";
    default:
      return value;
  }
}

function formatEditorialEventType(value: string): string {
  switch (value) {
    case "delete_fluff":
      return "删除空话";
    case "add_evidence":
      return "补充证据";
    case "add_cost":
      return "补充代价";
    case "reorder_paragraph":
      return "调整段落";
    case "rewrite_opening":
      return "重写开头";
    case "tighten_ending":
      return "收紧结尾";
    default:
      return value;
  }
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
      `- ${section.heading}：主判断：${section.sectionThesis || "待补"}。唯一动作：${section.singlePurpose || "待补"}。主线句：${section.mainlineSentence || "待补"}。回环目标：${section.callbackTarget || "待补"}。微型故事：${section.microStoryNeed || "待补"}。发现转折：${section.discoveryTurn || "待补"}。必须落地：${section.mustLandDetail || "待补"}。场景/代价：${section.sceneOrCost || "待补"}。动作：${section.move}。打破：${section.break}。承接：${section.bridge}。承接目标：${section.transitionTarget || "待补"}。反面/反证：${section.opposingView || section.counterPoint || "待补"}。读者用途：${section.readerUsefulness || "待补"}。风格目标：${section.styleObjective}。强约束证据：${section.mustUseEvidenceIds?.join("、") || "待补"}。一般证据：${section.evidenceIds.join("、") || "待补"}`,
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
    `- 文章原型：${project.thinkCard.articlePrototype || "待补"}`,
    `- 目标读者画像：${project.thinkCard.targetReaderPersona || "待补"}`,
    `- 创作锚点：${project.thinkCard.creativeAnchor || "待补"}`,
    `- HKR-Happy：${project.thinkCard.hkr.happy || "待补"}`,
    `- HKR-Knowledge：${project.thinkCard.hkr.knowledge || "待补"}`,
    `- HKR-Resonance：${project.thinkCard.hkr.resonance || "待补"}`,
    `- 改方向建议：${project.thinkCard.rewriteSuggestion || "待补"}`,
    "",
    "## StyleCore",
    `- 节奏推进：${project.styleCore.rhythm || "待补"}`,
    `- 故意打破：${project.styleCore.breakPattern || "待补"}`,
    `- 开头动作：${project.styleCore.openingMoves.join(" / ") || "待补"}`,
    `- 转场动作：${project.styleCore.transitionMoves.join(" / ") || "待补"}`,
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
