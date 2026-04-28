import type {
  ArticleDraft,
  ArticleType,
  ContinuityBeat,
  ContinuityFlag,
  HAMDFrame,
  HKRRFrame,
  OutlineDraft,
  ReviewParagraphFlag,
  ReviewCheck,
  ReviewReport,
  ReviewSectionScore,
  RewriteIntent,
  SectorModel,
  SourceCard,
  VitalityCheck,
  WritingMovesFrame,
} from "@/lib/types";
import { createVitalityEntry, vitalityStatusFromEntries } from "@/lib/author-cards";
import { AUTHOR_LANGUAGE_ASSETS, getArticleTypeProfile } from "@/lib/knowledge-base";
import { isWritingMovesComplete } from "@/lib/writing-moves";

const AI_CLICHES = [...AUTHOR_LANGUAGE_ASSETS.bannedPhrases, "赋能", "打造闭环"];
const DISCOURSE_MARKERS = new Set(["首先", "其次", "最后"]);
const TRANSITION_TOKENS = ["先说", "再看", "另外", "与此同时", "更关键的是", "回到", "问题在于", "但", "其实", "另一方面", "再往下", "最后"];
const SCENE_TOKENS = ["通勤", "地铁", "早高峰", "晚高峰", "接娃", "买菜", "小区", "商场", "下班", "一家人", "首改", "改善"];
const CULTURAL_LIFT_TOKENS = ["上海", "城市", "承接", "梯度", "系统", "更新", "代际", "放到更大", "更大的", "长期趋势"];
const OPENING_ANCHOR_MARKERS = ["不是", "真正", "误解", "高估", "低估", "问题在于", "这次", "变化", "代价", "门槛", "确定性", "分化", "重估"];

export function runDeterministicReview(input: {
  articleType: ArticleType;
  thesis: string;
  hkrr?: HKRRFrame;
  hamd?: HAMDFrame;
  writingMoves?: WritingMovesFrame;
  outlineDraft?: OutlineDraft | null;
  sectorModel: SectorModel | null;
  articleDraft: ArticleDraft | null;
  sourceCards: SourceCard[];
}): ReviewReport {
  const { articleType, thesis, hkrr, hamd, writingMoves, outlineDraft, sectorModel, articleDraft, sourceCards } = input;
  const draft = articleDraft?.editedMarkdown || articleDraft?.narrativeMarkdown || "";
  const checks: ReviewCheck[] = [];
  const paragraphs = extractParagraphs(draft);
  const openingWindow = paragraphs.slice(0, 3).join("\n");
  const lastParagraph = paragraphs.at(-1) ?? "";
  const articleTypeProfile = getArticleTypeProfile(articleType);

  checks.push({
    key: "hamd-card",
    title: "HAMD 开题卡",
    status: hamd?.hook && hamd.anchor && hamd.different ? "pass" : "warn",
    detail: hamd?.hook && hamd.anchor && hamd.different ? "Hook / Anchor / Different 已定义。" : "建议先补齐 Hook / Anchor / Different，再继续往下写。",
    evidenceIds: [],
  });

  checks.push({
    key: "language-assets",
    title: "语言资产使用",
    status: AUTHOR_LANGUAGE_ASSETS.preferredPatterns.some((pattern) => draft.includes(pattern.slice(0, 4))) ? "pass" : "warn",
    detail:
      AUTHOR_LANGUAGE_ASSETS.preferredPatterns.some((pattern) => draft.includes(pattern.slice(0, 4)))
        ? "正文里已经出现作者常用句式方向。"
        : "正文还不够像你的句式习惯，建议主动补“不是 X，而是 Y”或“真正决定它的不是标签，而是结构”这类表达。",
    evidenceIds: [],
  });

  checks.push({
    key: "hkrr-card",
    title: "HKRR 传播约束",
    status: hkrr?.happy && hkrr.knowledge && hkrr.resonance && hkrr.rhythm ? "pass" : "warn",
    detail:
      hkrr?.happy && hkrr.knowledge && hkrr.resonance && hkrr.rhythm
        ? "快乐、知识、共鸣、节奏四项已定义。"
        : "HKRR 还没写满，后面容易只有知识，没有传播抓手。",
    evidenceIds: [],
  });

  checks.push({
    key: "writing-moves-card",
    title: "写作动作卡",
    status: writingMoves && isWritingMovesComplete(writingMoves) ? "pass" : "warn",
    detail:
      writingMoves && isWritingMovesComplete(writingMoves)
        ? "动作卡已补齐，正文可以围绕节奏、打破、场景、升维和回环来写。"
        : "动作卡还不完整，正文容易只有结构，没有生命力。",
    evidenceIds: [],
  });

  if (articleTypeProfile) {
    const specializedStatus = runSpecializedCheck(articleType, draft);
    checks.push({
      key: "article-type-specialized",
      title: `${articleType}专项检查`,
      status: specializedStatus.status,
      detail: specializedStatus.detail,
      evidenceIds: sectorModel?.evidenceIds ?? [],
    });
  }

  checks.push({
    key: "thesis",
    title: "一句话主判断",
    status: thesis.trim() ? "pass" : "fail",
    detail: thesis.trim() ? `已存在主命题：${thesis}` : "缺少清晰的一句话主判断。",
    evidenceIds: [],
  });

  const zoneCount = sectorModel?.zones.length ?? 0;
  checks.push({
    key: "zones",
    title: "片区拆解完整性",
    status: zoneCount >= 2 ? "pass" : "fail",
    detail:
      zoneCount >= 2
        ? `当前共拆出 ${zoneCount} 个片区。`
        : `当前片区数量为 ${zoneCount}，还没有形成可比较的片区拆解。`,
    evidenceIds: sectorModel?.zones.flatMap((zone) => zone.evidenceIds) ?? [],
  });

  checks.push({
    key: "spatial",
    title: "空间结构解释",
    status: sectorModel?.spatialBackbone ? "pass" : "fail",
    detail: sectorModel?.spatialBackbone ? sectorModel.spatialBackbone : "缺少空间骨架说明。",
    evidenceIds: sectorModel?.evidenceIds ?? [],
  });

  const citedIds = Array.from(new Set(draft.match(/\[SC:([a-zA-Z0-9_-]+)\]/g)?.map((token) => token.slice(4, -1)) ?? []));
  const missingSourceBinding = sectorModel?.evidenceIds.filter((id) => !citedIds.includes(id)) ?? [];
  checks.push({
    key: "citations",
    title: "关键判断挂来源",
    status: sourceCards.length === 0 ? "fail" : missingSourceBinding.length === 0 ? "pass" : "warn",
    detail:
      sourceCards.length === 0
        ? "当前没有资料卡，无法支撑关键判断。"
        : missingSourceBinding.length === 0
          ? `正文已引用 ${citedIds.length} 张资料卡。`
          : `仍有 ${missingSourceBinding.length} 条关键证据未在正文中引用。`,
    evidenceIds: missingSourceBinding,
  });

  const clichéMatches = AI_CLICHES.filter((phrase) => {
    if (DISCOURSE_MARKERS.has(phrase)) {
      return draft
        .split(/\n+/)
        .some((line) => line.trim().startsWith(`${phrase}，`) || line.trim() === phrase || line.trim().startsWith(`${phrase},`));
    }
    return draft.includes(phrase);
  });
  checks.push({
    key: "ai-tone",
    title: "AI 套话检查",
    status: clichéMatches.length === 0 ? "pass" : "warn",
    detail: clichéMatches.length === 0 ? "未检测到常见 AI 套话。" : `检测到套话：${clichéMatches.join("、")}`,
    evidenceIds: [],
  });

  const softWords = ["闭眼", "无脑", "神盘", "顶配", "史诗级", "王炸"];
  const riskSignals = ["风险", "短板", "代价", "问题", "门槛", "缺点"];
  const softWordMatches = softWords.filter((phrase) => draft.includes(phrase));
  const hasRiskSignal = riskSignals.some((phrase) => draft.includes(phrase));
  checks.push({
    key: "soft-sell",
    title: "软文风险",
    status: softWordMatches.length > 2 && !hasRiskSignal ? "fail" : softWordMatches.length > 0 && !hasRiskSignal ? "warn" : "pass",
    detail:
      softWordMatches.length === 0 || hasRiskSignal
        ? "已保留风险或代价表达，整体不像纯销售软文。"
        : `出现过多营销化表达：${softWordMatches.join("、")}，且缺少风险提示。`,
    evidenceIds: [],
  });

  const openingAnchorSignal = hasOpeningAnchorSignal(openingWindow);
  const contrarianSignal = openingAnchorSignal || ["但", "其实", "很多人", "？"].some((token) => openingWindow.includes(token));
  checks.push({
    key: "opening",
    title: "反常识开头",
    status: contrarianSignal ? "pass" : "warn",
    detail: contrarianSignal ? "开头带有反常识或纠偏信号。" : "开头还不够像你的反常识切入，可以再收紧主判断。",
    evidenceIds: [],
  });

  const anchorSignal = openingAnchorSignal || (hamd?.anchor?.trim() ? hasAnchorSignal(draft, hamd.anchor.trim()) : false);
  checks.push({
    key: "anchor",
    title: "记忆锚点落地",
    status: anchorSignal ? "pass" : "warn",
    detail: anchorSignal ? "正文里已经能看到记忆锚点。" : hamd?.anchor ? "Anchor 已定义，但正文里还没有把它立起来。" : "还没有定义 Anchor。",
    evidenceIds: [],
  });

  const hookSignal = hamd?.hook?.trim() ? openingAnchorSignal : false;
  checks.push({
    key: "hook",
    title: "传播钩子落地",
    status: hamd?.hook ? (hookSignal ? "pass" : "warn") : "warn",
    detail: hamd?.hook ? (hookSignal ? "开头已经像在兑现 Hook。" : "Hook 已定义，但开头还不够锋利。") : "还没有定义 Hook。",
    evidenceIds: [],
  });

  const differentSignal = hamd?.different?.trim() ? draft.includes("不是") || draft.includes("误解") || draft.includes("真正") : false;
  checks.push({
    key: "different",
    title: "差异视角落地",
    status: hamd?.different ? (differentSignal ? "pass" : "warn") : "warn",
    detail: hamd?.different ? (differentSignal ? "正文已经在强调与常规板块稿的不同。" : "Different 已定义，但正文里还没有明显立出来。") : "还没有定义 Different。",
    evidenceIds: [],
  });

  const personalSignal = hasPersonalPosition(draft);
  checks.push({
    key: "personal-position",
    title: "私人视角与姿态",
    status: personalSignal ? "pass" : "warn",
    detail: personalSignal ? "正文里已经能看到作者自己的体感或姿态。" : "正文还偏客观陈述，缺少“这是我真的相信的判断”。",
    evidenceIds: [],
  });

  const sceneSignal = hasSceneSignal(draft);
  checks.push({
    key: "character-scene",
    title: "人物 / 生活场景",
    status: sceneSignal ? "pass" : "warn",
    detail: sceneSignal ? "正文里已经落到了具体生活场景，不只是地图和信息。" : "还没有写出具体人物或生活场景，读者容易只记住结构，不记住体感。",
    evidenceIds: [],
  });

  const unsupportedSceneCount = paragraphs.filter(
    (paragraph) =>
      hasSceneSignal(paragraph) &&
      !/\[SC:[a-zA-Z0-9_-]+\]/.test(paragraph) &&
      !paragraph.includes("待作者补") &&
      !paragraph.includes("待作者确认"),
  ).length;
  checks.push({
    key: "unsupported-scene",
    title: "Unsupported Scene",
    status: unsupportedSceneCount === 0 ? "pass" : "fail",
    detail:
      unsupportedSceneCount === 0
        ? "未发现像亲历但无证据支撑的场景段落。"
        : `检测到 ${unsupportedSceneCount} 段场景像亲历但没有证据或待作者确认标记，必须改写。`,
    evidenceIds: [],
  });

  const culturalLiftSignal = hasCulturalLiftSignal(draft);
  checks.push({
    key: "cultural-lift",
    title: "文化升维",
    status: culturalLiftSignal ? "pass" : "warn",
    detail: culturalLiftSignal ? "正文已经把板块放进更大的上海结构或城市参照物里。" : "正文还停留在板块内部，缺少更大的参照物来抬高判断。",
    evidenceIds: [],
  });

  const hasCostSenseSignal = riskSignals.some((phrase) => draft.includes(phrase));
  checks.push({
    key: "cost-sense",
    title: "现实代价",
    status: hasCostSenseSignal ? "pass" : "warn",
    detail: hasCostSenseSignal ? "正文里已经明确写到了门槛、问题或代价。" : "正文还没把现实代价写透，容易只剩判断没有代价感。",
    evidenceIds: [],
  });

  const freshObservationSignal = hasFreshObservationSignal(draft, writingMoves?.freshObservation);
  checks.push({
    key: "fresh-observation",
    title: "新的具体观察",
    status: freshObservationSignal ? "pass" : "warn",
    detail: freshObservationSignal ? "正文里已经能看到这篇新的具体观察。" : "正文还没有把这次真正新的观察立起来，容易滑向旧稿复写。",
    evidenceIds: [],
  });

  const echoSignal = hasEchoSignal(openingWindow, lastParagraph, hamd?.anchor ?? writingMoves?.echoLine);
  checks.push({
    key: "echo",
    title: "回环呼应",
    status: echoSignal ? "pass" : "warn",
    detail: echoSignal ? "结尾已经能回扣开头的判断或锚点。" : "结尾还没有明显回扣前文，容易收得太平。",
    evidenceIds: [],
  });

  const longParagraphs = paragraphs.filter((paragraph) => paragraph.length > 220);
  checks.push({
    key: "readability",
    title: "流畅度与阅读阻力",
    status: longParagraphs.length <= 2 ? "pass" : longParagraphs.length <= 4 ? "warn" : "fail",
    detail:
      longParagraphs.length <= 2
        ? "段落长度整体可控，阅读阻力不高。"
        : `存在 ${longParagraphs.length} 段过长段落，读者读到中段时可能会明显掉速。`,
    evidenceIds: [],
  });

  const transitionCoverage = calculateTransitionCoverage(paragraphs);
  checks.push({
    key: "transitions",
    title: "上下文衔接",
    status: transitionCoverage >= 0.45 ? "pass" : transitionCoverage >= 0.25 ? "warn" : "fail",
    detail:
      transitionCoverage >= 0.45
        ? "段落之间有比较明显的承接与推进。"
        : transitionCoverage >= 0.25
          ? "有一部分转场，但中段仍有几处跳接感。"
          : "段落之间的承接较弱，读者会感觉像在跳着看资料卡。",
    evidenceIds: [],
  });

  const openingSignal = contrarianSignal || Boolean(hamd?.hook && openingWindow.includes("不是"));
  const middleSignal = paragraphs.slice(1, -1).some((paragraph) =>
    ["先说", "再看", "另一块", "另外", "更关键", "与此同时", "问题在于"].some((token) => paragraph.includes(token)),
  );
  const endingSignal = ["所以", "总结", "如果", "适合", "不适合", "门槛", "代价", "值不值得", "回到开头", "真正决定", "不是标签", "而是结构"].some((token) =>
    lastParagraph.includes(token),
  );
  const progressionScore = [openingSignal, middleSignal, endingSignal].filter(Boolean).length;
  checks.push({
    key: "emotional-arc",
    title: "情绪与节奏递进",
    status: progressionScore === 3 ? "pass" : progressionScore === 2 ? "warn" : "fail",
    detail:
      progressionScore === 3
        ? "开头、推进、收束三段式都比较清楚，阅读情绪有递进。"
        : progressionScore === 2
          ? "主线递进基本在，但某个阶段还不够明显，容易出现中段掉速或结尾收得太快。"
          : "情绪和节奏递进不够清楚，文章更像信息堆叠，不像一篇被推进着读完的稿子。",
    evidenceIds: [],
  });

  // ===== 模块一：口语化覆盖率检查 =====
  const oralPhrases = [
    ...AUTHOR_LANGUAGE_ASSETS.transitionPhrases,
    ...AUTHOR_LANGUAGE_ASSETS.emotionPhrases,
    ...AUTHOR_LANGUAGE_ASSETS.humblePhrases,
  ];
  const oralCoverage = oralPhrases.filter((phrase) => draft.includes(phrase.slice(0, Math.min(4, phrase.length)))).length;
  checks.push({
    key: "oral-coverage",
    title: "口语化覆盖率",
    status: oralCoverage >= 5 ? "pass" : oralCoverage >= 2 ? "warn" : "fail",
    detail:
      oralCoverage >= 5
        ? `正文里已使用 ${oralCoverage} 个口语化表达，读起来像真人在聊。`
        : `口语化表达只出现了 ${oralCoverage} 个，正文容易读起来像分析报告。`,
    evidenceIds: [],
  });

  // ===== 模块二：句子级节奏检查 =====
  const shortParagraphs = paragraphs.filter((p) => p.length <= 20 && p.length > 0);
  checks.push({
    key: "sentence-break",
    title: "句式断裂",
    status: shortParagraphs.length >= 3 ? "pass" : shortParagraphs.length >= 1 ? "warn" : "fail",
    detail:
      shortParagraphs.length >= 3
        ? `全文有 ${shortParagraphs.length} 处短句独立成段，节奏有停顿感。`
        : `短句断裂不够，全文缺少节奏停顿。目前只有 ${shortParagraphs.length} 处。`,
    evidenceIds: [],
  });

  const questionCount = paragraphs.filter((p) => p.includes("？")).length;
  checks.push({
    key: "question-rhythm",
    title: "疑问句节奏",
    status: questionCount >= 2 ? "pass" : questionCount >= 1 ? "warn" : "fail",
    detail:
      questionCount >= 2
        ? `全文有 ${questionCount} 处疑问句作节奏打破。`
        : "疑问句太少，正文容易变成纯陈述平推。",
    evidenceIds: [],
  });

  const longRunMax = calculateLongParagraphRun(paragraphs);
  checks.push({
    key: "long-run",
    title: "连续长段检查",
    status: longRunMax <= 3 ? "pass" : longRunMax <= 5 ? "warn" : "fail",
    detail:
      longRunMax <= 3
        ? "没有过长的连续长段，节奏整体可控。"
        : `有 ${longRunMax} 段连续长段落，中段可能掉速。建议拆短或插入断裂句。`,
    evidenceIds: [],
  });

  // ===== 模块三：L4 活人感检查 =====
  const bodyMemoryTokens = ["愣", "懵", "复杂", "心情", "走一遍", "实地", "跑了", "看了一圈", "拧巴", "别扭"];
  const abstractDescTokens = ["感到震撼", "令人印象深刻", "非常重要", "具有重大意义", "值得关注"];
  const hasBodyMemory = bodyMemoryTokens.some((t) => draft.includes(t));
  const hasAbstractDesc = abstractDescTokens.some((t) => draft.includes(t));
  checks.push({
    key: "body-memory",
    title: "体感记忆",
    status: hasBodyMemory && !hasAbstractDesc ? "pass" : hasBodyMemory ? "warn" : "fail",
    detail:
      hasBodyMemory && !hasAbstractDesc
        ? "正文用的是体感式描述，读起来像真人走过现场。"
        : hasBodyMemory
          ? "有体感表达，但也夹杂了知识性描述，建议把「感到震撼」类表达换成更具体的体感。"
          : "正文缺少体感记忆，读起来像在读报告而不是听人聊天。",
    evidenceIds: [],
  });

  const humbleSignal = AUTHOR_LANGUAGE_ASSETS.humblePhrases.some((p) => draft.includes(p.slice(0, Math.min(6, p.length))));
  checks.push({
    key: "humble-setup",
    title: "谦逊铺垫",
    status: humbleSignal ? "pass" : "warn",
    detail: humbleSignal
      ? "正文里有谦逊铺垫，判断不会显得居高临下。"
      : "正文里缺少谦逊铺垫，判断容易显得过于武断。建议在关键判断前加一句「说实话我也不确定」类表达。",
    evidenceIds: [],
  });

  const aiSmellTokens = ["赋能", "打造闭环", "全面赋能", "多维度", "全方位", "系统性", "高质量发展", "深度融合", "有效提升"];
  const aiSmellHits = aiSmellTokens.filter((t) => draft.includes(t));
  checks.push({
    key: "ai-smell",
    title: "AI味浓度",
    status: aiSmellHits.length === 0 ? "pass" : "fail",
    detail:
      aiSmellHits.length === 0
        ? "未检测到高浓度AI味表达。"
        : `检测到强AI味表达：${aiSmellHits.join("、")}，必须替换。`,
    evidenceIds: [],
  });

  const genericLanguageHits = [...AI_CLICHES, ...aiSmellTokens].filter((token) => draft.includes(token));
  checks.push({
    key: "generic-language",
    title: "泛化表达黑名单",
    status: genericLanguageHits.length === 0 ? "pass" : genericLanguageHits.length <= 2 ? "warn" : "fail",
    detail:
      genericLanguageHits.length === 0
        ? "没有命中明显的泛化黑名单表达。"
        : `命中泛化/套话表达：${Array.from(new Set(genericLanguageHits)).join("、")}`,
    evidenceIds: [],
  });

  const failed = checks.filter((item) => item.status === "fail").length;
  const warned = checks.filter((item) => item.status === "warn").length;
  const completionScore = Math.max(0, 100 - failed * 25 - warned * 8);
  const sectionScores = buildSectionScores({
    draft,
    outlineDraft,
    checks,
    sourceCards,
  });
  const continuityFlags = buildContinuityFlags({
    draft,
    outlineDraft,
  });
  const paragraphFlags = buildParagraphFlags({
    draft,
    paragraphs,
    sourceCards,
    openingWindow,
    openingAnchorSignal,
    lastParagraph,
    sectionScores,
  });
  const rewriteIntents = buildRewriteIntents(paragraphFlags);
  const qualityPyramid = buildQualityPyramid(checks);

  return {
    overallVerdict:
      failed > 0 ? "当前稿件仍需返工，先补齐硬伤再做风格微调。" : warned > 0 ? "主流程已跑通，但还需要做一轮针对性修稿。" : "结构、证据和风格检查都已过线，可以进入人工精修。",
    completionScore,
    globalScore: completionScore,
    checks,
    qualityPyramid,
    sectionScores,
    paragraphFlags,
    rewriteIntents,
    continuityFlags,
    structuralRewriteIntents: buildStructuralRewriteIntents(continuityFlags),
    revisionSuggestions: buildRevisionSuggestions(checks),
    preservedPatterns: [
      contrarianSignal ? "反常识开头" : null,
      personalSignal ? "私人姿态" : null,
      sceneSignal ? "生活场景" : null,
      culturalLiftSignal ? "文化升维" : null,
      echoSignal ? "回环呼应" : null,
      humbleSignal ? "谦逊铺垫" : null,
      hasBodyMemory ? "体感记忆" : null,
    ].filter((item): item is string => Boolean(item)),
    missingPatterns: [
      contrarianSignal ? null : "反常识开头",
      personalSignal ? null : "私人姿态",
      sceneSignal ? null : "生活场景",
      culturalLiftSignal ? null : "文化升维",
      echoSignal ? null : "回环呼应",
      humbleSignal ? null : "谦逊铺垫",
      hasBodyMemory ? null : "体感记忆",
    ].filter((item): item is string => Boolean(item)),
  };
}

function buildSectionScores(input: {
  draft: string;
  outlineDraft?: OutlineDraft | null;
  checks: ReviewCheck[];
  sourceCards: SourceCard[];
}): ReviewSectionScore[] {
  const headings =
    input.outlineDraft?.sections.map((section) => ({
      heading: section.heading,
      evidenceIds: section.mustUseEvidenceIds?.length ? section.mustUseEvidenceIds : section.evidenceIds,
    })) ??
    extractMarkdownHeadings(input.draft).map((heading) => ({ heading, evidenceIds: [] }));

  const citedIds = Array.from(new Set(input.draft.match(/\[SC:([a-zA-Z0-9_-]+)\]/g)?.map((token) => token.slice(4, -1)) ?? []));

  return headings.map((section) => {
    const sectionText = extractSectionBody(input.draft, section.heading);
    const issues: string[] = [];
    const sectionCitations = Array.from(new Set(sectionText.match(/\[SC:([a-zA-Z0-9_-]+)\]/g)?.map((token) => token.slice(4, -1)) ?? []));

    if (!sectionText.trim()) {
      issues.push("正文里没有找到这一段对应内容。");
    }
    if (section.evidenceIds.length > 0 && section.evidenceIds.every((id) => !sectionCitations.includes(id))) {
      issues.push("这一段的强约束证据没有真正写进正文。");
    }
    if (!hasTransitionSignal(sectionText)) {
      issues.push("这一段缺少明确的推进或承接信号。");
    }
    if (!hasParagraphJudgement(sectionText)) {
      issues.push("这一段还没有立住一句明确判断。");
    }
    if (sectionText.length > 550) {
      issues.push("这一段明显过重，建议拆短。");
    }

    const score = Math.max(0, 100 - issues.length * 20);
    return {
      heading: section.heading,
      score,
      status: score >= 80 ? "pass" : score >= 60 ? "warn" : "fail",
      issues,
      evidenceIds: section.evidenceIds.filter((id) => citedIds.includes(id)),
    };
  });
}

function buildContinuityFlags(input: { draft: string; outlineDraft?: OutlineDraft | null }): ContinuityFlag[] {
  const beats = input.outlineDraft?.continuityLedger?.beats ?? [];
  if (beats.length === 0) {
    return [];
  }

  const flags: ContinuityFlag[] = [];
  const seenNewInformation: Array<{ beat: ContinuityBeat; text: string }> = [];
  const unlinkedPairs: Array<{ current: ContinuityBeat; next: ContinuityBeat }> = [];

  for (const beat of beats) {
    const newInfo = beat.newInformation.trim();
    const sectionText = extractSectionBody(input.draft, beat.heading);
    const sectionCitations = extractCitedIds(sectionText);

    if (isWeakNewInformation(newInfo)) {
      flags.push({
        type: "no_new_information",
        severity: "fail",
        sectionIds: [beat.sectionId],
        reason: `${beat.heading} 没有交付清楚的新信息。`,
        suggestedAction: "重写这一节的 section role，只保留一个前文没有的新判断或新事实。",
      });
    }

    if (sectionText.trim()) {
      if (newInfo && !hasStrongSignalConnection(sectionText, newInfo)) {
        flags.push({
          type: "section_does_not_deliver_new_information",
          severity: "fail",
          sectionIds: [beat.sectionId],
          reason: `${beat.heading} 的正文没有兑现 continuityLedger.newInformation。`,
          suggestedAction: "重写本节主判断和关键事实，让正文真正交付 ledger 里承诺的新信息。",
        });
      }

      if (beat.answerThisSection.trim() && !hasStrongSignalConnection(sectionText, beat.answerThisSection)) {
        flags.push({
          type: "section_does_not_answer_ledger",
          severity: "fail",
          sectionIds: [beat.sectionId],
          reason: `${beat.heading} 的正文没有回答 continuityLedger.answerThisSection。`,
          suggestedAction: "重写本节开头和主判断，先把 ledger 里规定的回答说清楚，再展开材料。",
        });
      }

      const missingEvidenceIds = beat.evidenceIds.filter((id) => !sectionCitations.includes(id));
      if (missingEvidenceIds.length > 0) {
        flags.push({
          type: "section_missing_required_evidence",
          severity: "fail",
          sectionIds: [beat.sectionId],
          reason: `${beat.heading} 没有引用 continuityLedger 要求的资料卡：${missingEvidenceIds.join("、")}。`,
          suggestedAction: "把缺失资料卡织进本节对应判断里；如果正文不再使用该事实，重写本节 role 或调整证据绑定。",
        });
      }
    } else {
      flags.push({
        type: "section_does_not_answer_ledger",
        severity: "fail",
        sectionIds: [beat.sectionId],
        reason: `${beat.heading} 在正文里没有匹配到对应小节。`,
        suggestedAction: "补回这一节，或重写结构让 ledger 和正文小节一一对应。",
      });
    }

    const repeated = seenNewInformation.find((item) => textSimilarity(item.text, newInfo) >= 0.25 || hasRepeatedDomainClaim(item.beat, beat));
    if (repeated) {
      flags.push({
        type: "repeated_claim",
        severity: "fail",
        sectionIds: [repeated.beat.sectionId, beat.sectionId],
        reason: `${beat.heading} 的新增信息与 ${repeated.beat.heading} 高度接近。`,
        suggestedAction: "合并重复判断，或重写后一节让它回答一个新的读者问题。",
      });
      flags.push({
        type: "no_new_information",
        severity: "fail",
        sectionIds: [beat.sectionId],
        reason: `${beat.heading} 更像是在重复前文判断，而不是推进新信息。`,
        suggestedAction: "删掉重复段或改写为下一层机制、成本、差异或决策用途。",
      });
    }
    seenNewInformation.push({ beat, text: newInfo });

    if (sectionText && startsWithFakeBridge(sectionText, beat)) {
      flags.push({
        type: "fake_bridge",
        severity: "warn",
        sectionIds: [beat.sectionId],
        reason: `${beat.heading} 开头有转场词，但没有接住上一节留下的问题。`,
        suggestedAction: "不要补独立转场句，重写上一节结尾和本节开头，让本节成为上一节问题的自然答案。",
      });
    }

    if (beat.inheritedQuestion.trim() && sectionText && !mentionsAnySignal(sectionText, beat.inheritedQuestion) && !mentionsAnySignal(beat.answerThisSection, beat.inheritedQuestion)) {
      flags.push({
        type: "does_not_answer_previous",
        severity: "warn",
        sectionIds: [beat.sectionId],
        reason: `${beat.heading} 没有明显回答 inheritedQuestion。`,
        suggestedAction: "重写本节开头和主判断，先回答上一节留下的问题，再展开本节新信息。",
      });
    }
  }

  for (let index = 0; index < beats.length - 1; index += 1) {
    const current = beats[index];
    const next = beats[index + 1];
    const linked = continuityLinkScore(current, next) > 0;
    const similar = current.role === next.role || textSimilarity(current.answerThisSection, next.answerThisSection) >= 0.25 || textSimilarity(current.newInformation, next.newInformation) >= 0.25;

    if (current.leavesQuestionForNext.trim() && next.inheritedQuestion.trim() && !linked) {
      unlinkedPairs.push({ current, next });
    }

    if (!linked && similar) {
      flags.push({
        type: "can_be_swapped",
        severity: "fail",
        sectionIds: [current.sectionId, next.sectionId],
        reason: `${current.heading} 与 ${next.heading} 缺少前后问答关系，且承担的判断功能接近。`,
        suggestedAction: "重排或重写相邻 section role，让后一节必须回答前一节留下的问题。",
      });
    }
  }

  for (const pair of unlinkedPairs) {
    flags.push({
      type: "unlinked_adjacency",
      severity: unlinkedPairs.length >= 2 ? "fail" : "warn",
      sectionIds: [pair.current.sectionId, pair.next.sectionId],
      reason: `${pair.current.heading} 留下的问题没有接到 ${pair.next.heading} 的 inheritedQuestion。`,
      suggestedAction:
        unlinkedPairs.length >= 2
          ? "重写相邻 section role 和段尾/段首问答链，连续两处以上断链需要结构性返工。"
          : "重写上一节结尾或下一节开头，让下一节继承上一节留下的问题。",
    });
  }

  return dedupeContinuityFlags(flags);
}

function buildStructuralRewriteIntents(flags: ContinuityFlag[]) {
  const structuralTypes = new Set([
    "can_be_swapped",
    "section_redundant",
    "no_new_information",
    "repeated_claim",
    "does_not_answer_previous",
    "section_does_not_deliver_new_information",
    "section_does_not_answer_ledger",
    "section_missing_required_evidence",
    "unlinked_adjacency",
  ]);
  const seriousFlags = flags.filter((flag) => structuralTypes.has(flag.type) && (flag.severity === "fail" || flag.type === "does_not_answer_previous"));
  if (seriousFlags.length === 0) {
    return [];
  }

  return [
    {
      issueTypes: Array.from(new Set(seriousFlags.map((flag) => flag.type))),
      affectedSectionIds: Array.from(new Set(seriousFlags.flatMap((flag) => flag.sectionIds))),
      whyItFails: seriousFlags.map((flag) => flag.reason).join("；"),
      suggestedRewriteMode: chooseStructuralRewriteMode(seriousFlags),
    },
  ];
}

function chooseStructuralRewriteMode(flags: ContinuityFlag[]) {
  if (flags.some((flag) => flag.type === "can_be_swapped")) {
    return "rewrite_section_roles" as const;
  }
  if (flags.some((flag) => flag.type === "unlinked_adjacency" || flag.type === "does_not_answer_previous" || flag.type === "section_does_not_answer_ledger")) {
    return "rewrite_opening_and_next_section" as const;
  }
  if (flags.some((flag) => flag.type === "repeated_claim" || flag.type === "section_redundant")) {
    return "merge_sections" as const;
  }
  if (flags.some((flag) => flag.type === "no_new_information" || flag.type === "section_does_not_deliver_new_information")) {
    return "delete_redundant_section" as const;
  }
  return "rewrite_opening_and_next_section" as const;
}

function dedupeContinuityFlags(flags: ContinuityFlag[]) {
  const seen = new Set<string>();
  return flags.filter((flag) => {
    const key = `${flag.type}:${flag.sectionIds.join("|")}:${flag.reason}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function isWeakNewInformation(text: string) {
  const compact = text.replace(/\s+/g, "");
  if (compact.length < 8) {
    return true;
  }
  return ["继续分析", "进一步说明", "补充信息", "展开论述", "承接上文", "总结一下"].some((token) => compact.includes(token));
}

function startsWithFakeBridge(sectionText: string, beat: ContinuityBeat) {
  const firstParagraph = sectionText.split(/\n\s*\n/).find((item) => item.trim())?.trim() ?? "";
  if (!TRANSITION_TOKENS.some((token) => firstParagraph.startsWith(token))) {
    return false;
  }
  return !mentionsAnySignal(firstParagraph, beat.inheritedQuestion) && !mentionsAnySignal(firstParagraph, beat.leavesQuestionForNext);
}

function continuityLinkScore(current: ContinuityBeat, next: ContinuityBeat) {
  const fromPrevious = termsOverlap(current.leavesQuestionForNext, next.inheritedQuestion);
  const fromCurrentAnswer = termsOverlap(current.answerThisSection, next.inheritedQuestion);
  return fromPrevious + fromCurrentAnswer;
}

function extractCitedIds(text: string) {
  return Array.from(new Set(text.match(/\[SC:([a-zA-Z0-9_-]+)\]/g)?.map((token) => token.slice(4, -1)) ?? []));
}

function mentionsAnySignal(text: string, signal: string) {
  const terms = extractSignalTerms(signal);
  if (terms.length === 0) {
    return false;
  }
  return terms.some((term) => text.includes(term));
}

function hasStrongSignalConnection(text: string, signal: string) {
  const terms = extractSignalTerms(signal);
  if (terms.length === 0) {
    return false;
  }

  const matched = terms.filter((term) => text.includes(term)).length;
  if (terms.length <= 3) {
    return matched >= 1;
  }
  return matched >= 2 || matched / terms.length >= 0.12;
}

function termsOverlap(left: string, right: string) {
  const leftTerms = extractSignalTerms(left);
  const rightTerms = new Set(extractSignalTerms(right));
  return leftTerms.filter((term) => rightTerms.has(term)).length;
}

function extractSignalTerms(text: string) {
  const compact = text.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]+/g, "");
  const terms = new Set<string>();
  for (let size = 2; size <= 4; size += 1) {
    for (let index = 0; index <= compact.length - size; index += 1) {
      terms.add(compact.slice(index, index + size));
    }
  }
  return Array.from(terms).filter((term) => !["这一", "一节", "什么", "为什么", "问题", "读者", "下一", "上一", "如何", "怎么"].includes(term));
}

function textSimilarity(left: string, right: string) {
  const leftTerms = new Set(extractSignalTerms(left));
  const rightTerms = new Set(extractSignalTerms(right));
  if (leftTerms.size === 0 || rightTerms.size === 0) {
    return 0;
  }
  const shared = Array.from(leftTerms).filter((term) => rightTerms.has(term)).length;
  return shared / Math.min(leftTerms.size, rightTerms.size);
}

function hasRepeatedDomainClaim(left: ContinuityBeat, right: ContinuityBeat) {
  if (left.role !== right.role) {
    return false;
  }

  const domainTokens = ["资源", "重估", "排序", "分化", "价格", "成本", "热度", "人群", "片区", "确定性", "供应", "交通", "产业"];
  const leftText = `${left.answerThisSection} ${left.newInformation}`;
  const rightText = `${right.answerThisSection} ${right.newInformation}`;
  return domainTokens.some((token) => leftText.includes(token) && rightText.includes(token));
}

function buildParagraphFlags(input: {
  draft: string;
  paragraphs: string[];
  sourceCards: SourceCard[];
  openingWindow: string;
  openingAnchorSignal: boolean;
  lastParagraph: string;
  sectionScores: ReviewSectionScore[];
}): ReviewParagraphFlag[] {
  const sourceIds = new Set(input.sourceCards.map((card) => card.id));

  return input.paragraphs
    .map((paragraph, index) => {
      const preview = paragraph.slice(0, 40);
      const issueTypes: string[] = [];
      const sectionHeading = findSectionHeadingForParagraph(input.draft, paragraph);

      if (index === 0 && !hasOpeningAnchorSignal(paragraph)) {
        issueTypes.push("weak_opening");
      }
      if (paragraph.length > 220) {
        issueTypes.push("generic_language");
      }
      if (index > 0 && !hasTransitionSignal(paragraph)) {
        issueTypes.push("weak_transition");
      }
      const citations = Array.from(new Set(paragraph.match(/\[SC:([a-zA-Z0-9_-]+)\]/g)?.map((token) => token.slice(4, -1)) ?? []));
      if (citations.some((id) => !sourceIds.has(id)) || (paragraph.includes("判断") && citations.length === 0)) {
        issueTypes.push("evidence_not_integrated");
      }
      if (!hasSceneSignal(paragraph) && index > 1 && index < input.paragraphs.length - 1) {
        issueTypes.push("missing_scene");
      }
      if (!["代价", "门槛", "问题", "风险", "短板"].some((token) => paragraph.includes(token)) && index >= input.paragraphs.length - 2) {
        issueTypes.push("missing_cost");
      }
      if (index === input.paragraphs.length - 1 && !hasEchoSignal(input.openingWindow, input.lastParagraph)) {
        issueTypes.push("weak_ending_echo");
      }
      if (paragraph.includes("赋能") || paragraph.includes("多维度") || paragraph.includes("全方位") || paragraph.includes("高质量发展")) {
        issueTypes.push("generic_language");
      }
      if (index <= 2 && !input.openingAnchorSignal && paragraph.length > 120) {
        issueTypes.push("missing_anchor");
      }

      if (issueTypes.length === 0) {
        return null;
      }

      const dedupedIssues = Array.from(new Set(issueTypes));
      return {
        paragraphIndex: index,
        sectionHeading,
        preview,
        issueTypes: dedupedIssues,
        detail: describeParagraphIssues(dedupedIssues),
        suggestedAction: chooseSuggestedAction(dedupedIssues),
      };
    })
    .filter((item): item is ReviewParagraphFlag => Boolean(item))
    .slice(0, 8);
}

function buildRewriteIntents(flags: ReviewParagraphFlag[]): RewriteIntent[] {
  const intentPriority: RewriteIntent["issueType"][] = [
    "weak_opening",
    "missing_anchor",
    "weak_transition",
    "evidence_not_integrated",
    "generic_language",
    "missing_scene",
    "missing_cost",
    "weak_ending_echo",
  ];

  return flags
    .flatMap((flag) =>
      flag.issueTypes
        .filter((issueType): issueType is RewriteIntent["issueType"] => intentPriority.includes(issueType as RewriteIntent["issueType"]))
        .map((issueType) => ({
          targetRange: flag.sectionHeading ? `section:${flag.sectionHeading}#paragraph:${flag.paragraphIndex + 1}` : `paragraph:${flag.paragraphIndex + 1}`,
          issueType,
          whyItFails: flag.detail,
          suggestedRewriteMode: mapRewriteMode(issueType),
        })),
    )
    .slice(0, 8);
}

function mapRewriteMode(issueType: RewriteIntent["issueType"]) {
  switch (issueType) {
    case "weak_opening":
      return "重写开头前三句，把反常识判断往前提。";
    case "missing_anchor":
      return "补一个更可记忆的判断锚点。";
    case "weak_transition":
      return "不要补独立转场句。请重写上一节结尾和下一节开头，让下一节成为上一节问题的自然答案。";
    case "evidence_not_integrated":
      return "把证据直接织入论证，而不是只在句末挂引用。";
    case "generic_language":
      return "删空话、拆长段，换成更具体的判断。";
    case "missing_scene":
      return "补人物或生活场景，让判断落地。";
    case "missing_cost":
      return "补门槛、代价或不成立条件。";
    case "weak_ending_echo":
      return "重写结尾，让它回扣开头判断。";
  }
}

function chooseSuggestedAction(issueTypes: string[]): ReviewParagraphFlag["suggestedAction"] {
  if (issueTypes.includes("weak_transition")) {
    return "move";
  }
  if (issueTypes.includes("generic_language")) {
    return "split";
  }
  if (issueTypes.includes("evidence_not_integrated")) {
    return "trim";
  }
  return "rewrite";
}

function describeParagraphIssues(issueTypes: string[]) {
  return issueTypes
    .map((issueType) => {
      switch (issueType) {
        case "weak_opening":
          return "开头没把反常识判断立住";
        case "missing_anchor":
          return "缺少可记忆的锚点";
        case "weak_transition":
          return "上下文承接偏硬";
        case "evidence_not_integrated":
          return "判断和证据没有真正缝合";
        case "generic_language":
          return "这段太泛、太长或太像资料堆叠";
        case "missing_scene":
          return "缺少人物或生活场景";
        case "missing_cost":
          return "缺少现实代价或门槛";
        case "weak_ending_echo":
          return "结尾没有回扣开头";
        default:
          return issueType;
      }
    })
    .join("；");
}

function extractMarkdownHeadings(markdown: string) {
  return markdown
    .split("\n")
    .filter((line) => line.startsWith("## "))
    .map((line) => line.replace(/^##\s+/, "").trim());
}

function extractSectionBody(markdown: string, heading: string) {
  const startMarker = `## ${heading}`;
  const startIndex = markdown.indexOf(startMarker);
  if (startIndex < 0) {
    return "";
  }
  const contentStart = startIndex + startMarker.length;
  const rest = markdown.slice(contentStart);
  const nextIndex = rest.indexOf("\n## ");
  return rest.slice(0, nextIndex >= 0 ? nextIndex : undefined).trim();
}

function findSectionHeadingForParagraph(markdown: string, paragraph: string) {
  const sections = extractMarkdownHeadings(markdown);
  return sections.find((heading) => extractSectionBody(markdown, heading).includes(paragraph.slice(0, Math.min(20, paragraph.length)))) ?? null;
}

function hasParagraphJudgement(paragraph: string) {
  return ["不是", "真正", "问题在于", "更准确地说", "其实", "关键是"].some((token) => paragraph.includes(token));
}

function hasTransitionSignal(paragraph: string) {
  return TRANSITION_TOKENS.some((token) => paragraph.includes(token));
}

function hasOpeningAnchorSignal(text: string) {
  return OPENING_ANCHOR_MARKERS.some((token) => text.includes(token));
}

function buildRevisionSuggestions(checks: ReviewCheck[]): string[] {
  return checks
    .filter((check) => check.status !== "pass")
    .map((check) => {
      switch (check.key) {
        case "citations":
          return "先把关键判断补上资料卡引用，再继续润色文风。";
        case "zones":
          return "按真实生活边界、镇街、交通切割或功能组团拆片区，不要强行凑固定数量。";
        case "soft-sell":
          return "加一段风险、门槛或代价，压住软文感。";
        case "ai-tone":
          return "把检测到的套话改成更口语、更像你自己的表达。";
        case "opening":
          return "把开头重写成更强的一句话判断，让读者立刻知道你在纠什么偏。";
        case "hamd-card":
          return "先补全 Hook、Anchor、Different，再继续推进提纲和正文。";
        case "hkrr-card":
          return "把这篇的 Happy / Knowledge / Resonance / Rhythm 写具体，后面才更容易出传播感。";
        case "writing-moves-card":
          return "先把这篇的新观察、场景、升维、回环和代价写成动作卡，再继续修正文。";
        case "anchor":
          return "正文里要明确立一个能让读者记住的锚点，不要只有信息没有抓手。";
        case "hook":
          return "把标题承诺写进开头前三段，让传播钩子真正落到正文里。";
        case "different":
          return "把这篇和常规板块稿最大的不同写出来，不要写成泛板块介绍。";
        case "personal-position":
          return "补一层作者自己的体感和立场，让判断像你自己说出来的，而不是机器转述。";
        case "character-scene":
          return "加一个具体人物或生活场景，把地图、通勤和代价翻译成真实生活。";
        case "cultural-lift":
          return "给正文补一个更大的上海或城市参照物，让这篇不只是局部信息整理。";
        case "echo":
          return "把结尾改成回扣开头判断或锚点的收束句，别平着落地。";
        case "readability":
          return "把最重的几段拆短，把一个段落里同时出现的多个判断拆开写，减轻阅读阻力。";
        case "transitions":
          return "给段落之间补‘拉主线句’，明确告诉读者为什么这一段会接下一段。";
        case "emotional-arc":
          return "重新检查开头钩子、中段推进和结尾收束，别让文章变成平推资料。";
        case "language-assets":
          return "主动补你自己的高频句式和抓手式命名，不要让正文只剩信息没有作者感。";
        case "article-type-specialized":
          return "回到当前文章类型的专项要求，补齐这一类文章最关键的判断动作。";
        case "oral-coverage":
          return "主动用口语化转场词（说真的、其实吧、你想想看）替换平铺连接，让正文读起来像人在聊天。";
        case "sentence-break":
          return "找到最有力的判断，把它单独拎出来成一段，制造停顿和重量感。全文至少 3 处。";
        case "question-rhythm":
          return "在中段加 1-2 个疑问句（那问题到底在哪？听着离谱对吧？），作为节奏刹车。";
        case "long-run":
          return "把最重的连续长段拆短，中间插入断裂句或生活场景，让读者喘口气。";
        case "body-memory":
          return "把'感到震撼'类表达换成体感记忆（愣了一下、走一遍就知道、心情很复杂）。";
        case "humble-setup":
          return "在主判断前加一句谦逊铺垫（说实话我也不确定、这只是个人理解），卸掉'我来教你'的感觉。";
        case "ai-smell":
          return `检测到强AI味：${check.detail}。必须替换成更口语的表达。`;
        default:
          return check.detail;
      }
    });
}

function extractParagraphs(markdown: string): string[] {
  return markdown
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .filter((paragraph) => !paragraph.startsWith("#"))
    .filter((paragraph) => !paragraph.startsWith("- "))
    .filter((paragraph) => !paragraph.startsWith(">"));
}

function calculateTransitionCoverage(paragraphs: string[]): number {
  if (paragraphs.length <= 1) {
    return 1;
  }

  const candidates = paragraphs.slice(1);
  const hits = candidates.filter((paragraph) => {
    const preview = paragraph.slice(0, 30);
    return TRANSITION_TOKENS.some((token) => preview.includes(token) || paragraph.includes(token));
  }).length;

  return hits / candidates.length;
}

function hasPersonalPosition(draft: string): boolean {
  return ["我", "我会", "我更愿意", "我自己的感觉", "我宁愿", "我反而觉得"].some((token) => draft.includes(token));
}

function hasSceneSignal(draft: string): boolean {
  return SCENE_TOKENS.some((token) => draft.includes(token));
}

function hasCulturalLiftSignal(draft: string): boolean {
  return CULTURAL_LIFT_TOKENS.some((token) => draft.includes(token));
}

function hasEchoSignal(firstParagraph: string, lastParagraph: string, anchorText?: string): boolean {
  if (anchorText?.trim()) {
    const anchor = anchorText.trim().slice(0, Math.min(10, anchorText.trim().length));
    if (anchor && lastParagraph.includes(anchor)) {
      return true;
    }
  }

  const cues = ["不是", "结构", "误解", "代价", "成立", "看错", "世界"];
  return cues.some((cue) => firstParagraph.includes(cue) && lastParagraph.includes(cue));
}

function hasAnchorSignal(draft: string, anchorText: string): boolean {
  const anchor = anchorText.trim();
  const directSeed = anchor.slice(0, Math.min(8, anchor.length));
  if (directSeed && draft.includes(directSeed)) {
    return true;
  }

  const keywords = anchor
    .split(/[，。、“”‘’、\s]/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 2);

  const hits = keywords.filter((part) => draft.includes(part)).length;
  if (hits >= 2) {
    return true;
  }

  if (anchor.includes("不是一个") && draft.includes("不是一个")) {
    return true;
  }

  if (anchor.includes("世界") && (draft.includes("世界") || draft.includes("生活路径"))) {
    return true;
  }

  return false;
}

function hasFreshObservationSignal(draft: string, freshObservation?: string): boolean {
  if (freshObservation?.trim()) {
    const seed = freshObservation.trim().slice(0, Math.min(10, freshObservation.trim().length));
    if (seed && draft.includes(seed)) {
      return true;
    }
  }

  return ["不是一个板块", "错位", "拼图", "几种生活", "真正的问题"].some((token) => draft.includes(token));
}

function calculateLongParagraphRun(paragraphs: string[]): number {
  let maxRun = 0;
  let currentRun = 0;
  for (const p of paragraphs) {
    if (p.length > 150) {
      currentRun++;
      maxRun = Math.max(maxRun, currentRun);
    } else {
      currentRun = 0;
    }
  }
  return maxRun;
}

export function buildVitalityCheck(input: {
  reviewReport: ReviewReport;
  sourceCards: SourceCard[];
}): VitalityCheck {
  const checkMap = new Map(input.reviewReport.checks.map((check) => [check.key, check]));
  const citations = checkMap.get("citations");
  const softSell = checkMap.get("soft-sell");
  const personal = checkMap.get("personal-position");
  const scene = checkMap.get("character-scene");
  const momentum = checkMap.get("emotional-arc");
  const transitions = checkMap.get("transitions");
  const echo = checkMap.get("echo");
  const cost = checkMap.get("cost-sense");
  const cultural = checkMap.get("cultural-lift");
  const freshObservation = checkMap.get("fresh-observation");
  const soften = (status: ReviewCheck["status"] | undefined): ReviewCheck["status"] => {
    if (status === "pass") {
      return "pass";
    }
    return "warn";
  };

  const entries = [
    createVitalityEntry("cannot-fake", "不能假", softSell?.status === "fail" ? "fail" : personal?.status ?? "warn", softSell?.status === "fail" ? softSell.detail : personal?.detail ?? "还没有确认作者姿态是否真实。"),
    createVitalityEntry("cannot-invent", "不能编", citations?.status === "fail" ? "fail" : citations?.status ?? "warn", citations?.detail ?? "还没有确认引用和事实是否过线。"),
    createVitalityEntry("true-position", "真实立场", soften(personal?.status), personal?.detail ?? "还没有确认作者是否真正下场表达。"),
    createVitalityEntry("character-warmth", "人物温度", soften(scene?.status), scene?.detail ?? "还没有确认人物或生活场景是否成立。"),
    createVitalityEntry(
      "momentum",
      "推进感",
      momentum?.status === "pass" && transitions?.status === "pass" ? "pass" : "warn",
      momentum?.status === "fail" || transitions?.status === "fail"
        ? `${momentum?.detail ?? ""} ${transitions?.detail ?? ""}`.trim()
        : momentum?.detail ?? transitions?.detail ?? "推进感已过线。",
    ),
    createVitalityEntry("echo", "回环", soften(echo?.status), echo?.detail ?? "还没有确认结尾是否回扣前文。"),
    createVitalityEntry("cost-sense", "代价感", soften(cost?.status), cost?.detail ?? "还没有确认现实代价是否写透。"),
    createVitalityEntry("cultural-lift", "文化升维", soften(cultural?.status), cultural?.detail ?? "还没有确认更大的城市参照物。"),
    createVitalityEntry("not-old-copy", "不是旧稿复写", soften(freshObservation?.status), freshObservation?.detail ?? "还没有确认这篇是否立起新的具体观察。"),
    createVitalityEntry("body-memory", "体感记忆", soften(checkMap.get("body-memory")?.status), checkMap.get("body-memory")?.detail ?? "还没有确认体感记忆是否到位。"),
    createVitalityEntry("humble-setup", "谦逊铺垫", soften(checkMap.get("humble-setup")?.status), checkMap.get("humble-setup")?.detail ?? "还没有确认是否有谦逊铺垫。"),
    createVitalityEntry("oral-tone", "口语化语感", soften(checkMap.get("oral-coverage")?.status), checkMap.get("oral-coverage")?.detail ?? "还没有确认口语化覆盖率。"),
  ];

  return vitalityStatusFromEntries(entries);
}

function buildQualityPyramid(checks: ReviewCheck[]) {
  const keySet = new Map(checks.map((check) => [check.key, check]));
  return [
    buildQualityLayer("L1", "WritingLint", [
      keySet.get("ai-tone"),
      keySet.get("ai-smell"),
      keySet.get("generic-language"),
      keySet.get("unsupported-scene"),
      keySet.get("citations"),
    ]),
    buildQualityLayer("L2", "StructureFlow", [
      keySet.get("opening"),
      keySet.get("hook"),
      keySet.get("anchor"),
      keySet.get("echo"),
      keySet.get("transitions"),
      keySet.get("emotional-arc"),
      keySet.get("sentence-break"),
      keySet.get("question-rhythm"),
    ]),
    buildQualityLayer("L3", "ContentDepth", [
      keySet.get("citations"),
      keySet.get("fresh-observation"),
      keySet.get("cost-sense"),
      keySet.get("cultural-lift"),
      keySet.get("article-type-specialized"),
      keySet.get("zones"),
      keySet.get("spatial"),
    ]),
    buildQualityLayer("L4", "HumanFeel", [
      keySet.get("personal-position"),
      keySet.get("character-scene"),
      keySet.get("body-memory"),
      keySet.get("humble-setup"),
      keySet.get("oral-coverage"),
    ]),
  ];
}

function buildQualityLayer(level: "L1" | "L2" | "L3" | "L4", title: string, checks: Array<ReviewCheck | undefined>) {
  const activeChecks = checks.filter((check): check is ReviewCheck => Boolean(check));
  const mustFix = activeChecks.filter((check) => check.status === "fail").map((check) => `${check.title}：${check.detail}`);
  const shouldFix = activeChecks.filter((check) => check.status === "warn").map((check) => `${check.title}：${check.detail}`);
  const passCount = activeChecks.filter((check) => check.status === "pass").length;
  const status: ReviewCheck["status"] = mustFix.length > 0 ? "fail" : shouldFix.length > 0 ? "warn" : "pass";

  return {
    level,
    title,
    status,
    summary:
      status === "pass"
        ? `${title} 已过线（${passCount}/${activeChecks.length}）。`
        : status === "warn"
          ? `${title} 还有 ${shouldFix.length} 个建议优化点。`
          : `${title} 还有 ${mustFix.length} 个必须先修的问题。`,
    mustFix,
    shouldFix,
    optionalPolish: status === "pass" ? activeChecks.map((check) => check.title).slice(0, 3) : [],
  };
}

function runSpecializedCheck(articleType: ArticleType, draft: string) {
  switch (articleType) {
    case "断供型": {
      const hasSupply = draft.includes("断供") && (draft.includes("供应") || draft.includes("供地"));
      const hasDifference = draft.includes("结构性断供") || draft.includes("总量断供");
      const status: ReviewCheck["status"] = hasSupply && hasDifference ? "pass" : hasSupply ? "warn" : "fail";
      return {
        status,
        detail: hasSupply
          ? hasDifference
            ? "已经区分了断供类型，不只是泛泛讲供应紧张。"
            : "讲到了断供，但还没清晰区分总量断供和结构性断供。"
          : "断供型文章却没有把供应和断供逻辑讲透。",
      };
    }
    case "价值重估型": {
      const hasRewrite = draft.includes("不是") && draft.includes("而是");
      const hasNewDefinition = draft.includes("真正") || draft.includes("更准确地说");
      const status: ReviewCheck["status"] = hasRewrite && hasNewDefinition ? "pass" : hasRewrite ? "warn" : "fail";
      return {
        status,
        detail: hasRewrite
          ? hasNewDefinition
            ? "已经完成旧标签重写，并提出了新定义。"
            : "有反常识判断，但新的定义标准还不够清楚。"
          : "价值重估型文章却没有真正重写旧标签。",
      };
    }
    case "规划拆解型": {
      const hasPlan = draft.includes("规划") || draft.includes("控规");
      const hasMeaning = draft.includes("意味着") || draft.includes("不只是") || draft.includes("节奏");
      const status: ReviewCheck["status"] = hasPlan && hasMeaning ? "pass" : hasPlan ? "warn" : "fail";
      return {
        status,
        detail: hasPlan
          ? hasMeaning
            ? "不只讲规划信息，也讲了这些规划意味着什么。"
            : "有规划信息，但对板块影响的解释还不够。"
          : "规划拆解型文章却没有把规划/地块逻辑立住。",
      };
    }
    case "误解纠偏型": {
      const hasMisread = draft.includes("误解") || draft.includes("看错");
      const hasCause = draft.includes("因为") || draft.includes("来源") || draft.includes("标签");
      const status: ReviewCheck["status"] = hasMisread && hasCause ? "pass" : hasMisread ? "warn" : "fail";
      return {
        status,
        detail: hasMisread
          ? hasCause
            ? "误解和误解来源都已经写出来了。"
            : "点到了误解，但为什么会误解还不够清楚。"
          : "纠偏型文章却没有把“大家为什么会看错”讲出来。",
      };
    }
    case "更新拆迁型": {
      const hasDemolition = draft.includes("拆") || draft.includes("更新");
      const hasAfter = draft.includes("变成") || draft.includes("改造后") || draft.includes("兑现");
      const status: ReviewCheck["status"] = hasDemolition && hasAfter ? "pass" : hasDemolition ? "warn" : "fail";
      return {
        status,
        detail: hasDemolition
          ? hasAfter
            ? "已经讲到更新之后会变成什么，不只是写要拆。"
            : "讲到了更新和拆迁，但还没有写清拆完之后的板块变化。"
          : "更新拆迁型文章却没有真正讲更新逻辑。",
      };
    }
  }
}
