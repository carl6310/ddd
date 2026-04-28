import type {
  ArticleProject,
  OutlineDraft,
  ResearchBrief,
  SignalBrief,
  SectorModel,
  SourceCard,
  ReviewReport,
} from "@/lib/types";
import { formatStyleCore, formatThinkCard } from "@/lib/author-cards";
import {
  AUTHOR_ACTION_CORE,
  AUTHOR_BRAIN_CORE,
  AUTHOR_NO_GO,
  AUTHOR_REVIEW_LENS,
  AUTHOR_TOPIC_METHOD,
} from "@/lib/author-system";
import { buildCoreConstraintPack } from "@/lib/knowledge-base";

export type TaskName =
  | "topic_cocreate"
  | "think_card"
  | "topic_judge"
  | "source_card_summarizer"
  | "research_brief"
  | "sector_modeler"
  | "outline_writer"
  | "draft_writer"
  | "draft_polisher"
  | "opening_rewriter"
  | "transition_rewriter"
  | "evidence_weaver"
  | "scene_inserter"
  | "cost_sharpener"
  | "ending_echo_rewriter"
  | "anti_cliche_rewriter"
  | "vitality_reviewer"
  | "quality_reviewer"
  | "publish_prep"
  | "publish_summary_refiner";

interface PromptTask {
  system: string;
  user: string;
}

export function buildPromptTask(
  task: TaskName,
  input: {
    topic?: string;
    audience?: string;
    targetWords?: number;
    project?: ArticleProject;
    sourceCards?: SourceCard[];
    sampleDigest?: string;
    styleReference?: string;
    signalBrief?: SignalBrief | null;
    researchBrief?: ResearchBrief | null;
    sectorModel?: SectorModel | null;
    outlineDraft?: OutlineDraft | null;
    narrativeMarkdown?: string;
    deterministicReview?: ReviewReport | null;
    sectionHeading?: string;
    paragraphText?: string;
    paragraphIndex?: number;
    rewriteIntent?: {
      issueType: string;
      targetRange: string;
      whyItFails: string;
      suggestedRewriteMode: string;
    };
    finalMarkdown?: string;
    sector?: string;
    currentIntuition?: string;
    rawMaterials?: string;
    avoidAngles?: string;
  },
): PromptTask {
  const constraintPack = buildCoreConstraintPack(input.project?.articleType);
  const styleLearningRules = `样本使用边界：
1. 历史样本只用于学习作者的判断路径、问题意识、结构推进和落点方式。
2. 禁止直接复用历史样本里的标题词、比喻、命名抓手、高光句和强记忆点表达。
3. 尤其不要套用现成词，例如“灯下黑”“后花园”“平行世界”“造城记”这类高复用说法。
4. 如果当前材料真的需要一个抓手，也必须从本次材料的矛盾、代价、边界里重新长出来，而不是从旧样本里借词。`;
  const authorBrainText = `作者大脑：
${AUTHOR_BRAIN_CORE}

选题方法：
${AUTHOR_TOPIC_METHOD}

动作要求：
${AUTHOR_ACTION_CORE}

禁区：
${AUTHOR_NO_GO}`;
  const profileText = constraintPack.articleTypeProfile
    ? `文章类型定位：${constraintPack.articleTypeProfile.positioning}
类型提纲规则：
${constraintPack.articleTypeProfile.outlineRules.map((item) => `- ${item}`).join("\n")}
类型正文提醒：
${constraintPack.articleTypeProfile.draftReminders.map((item) => `- ${item}`).join("\n")}
类型专项质检：
${constraintPack.articleTypeProfile.specializedChecks.map((item) => `- ${item}`).join("\n")}`
    : "暂无文章类型专项规则。";
  const languageText = `禁用表达：${constraintPack.languageAssets.bannedPhrases.join("、")}
高频可用句式：${constraintPack.languageAssets.preferredPatterns.join("、")}
口语化转场：${constraintPack.languageAssets.transitionPhrases.join("、")}
情绪表达：${constraintPack.languageAssets.emotionPhrases.join("、")}
谦逊铺垫：${constraintPack.languageAssets.humblePhrases.join("、")}
命名原则：${constraintPack.languageAssets.namingPatterns.join("、")}
高光动作：${constraintPack.languageAssets.highSignalMoves.join("、")}

口语化要求：全文至少用到 5 个以上口语化转场/情绪/谦逊词组，让文章读起来像真人在聊天。
节奏要求：全文至少 3 处短句独立成段制造停顿，至少 2 处疑问句作节奏打破。
谦逊要求：在给出核心判断前，至少有 1 处谦逊铺垫。`;
  const thinkCardText = input.project?.thinkCard ? formatThinkCard(input.project.thinkCard) : "暂无 ThinkCard。";
  const styleCoreText = input.project?.styleCore ? formatStyleCore(input.project.styleCore) : "暂无 StyleCore。";

  switch (task) {
    case "source_card_summarizer":
      return {
        system: `
你是一位资料卡编辑，要从一段原始材料里提炼“可用于写作”的资料卡摘要。
你的工作不是复读开头几句，而是识别真正有价值的信息，过滤广告、导流、直播预告、预约提示、免责声明和无关噪音。
必须输出严格 JSON，不要输出额外文字。
JSON 结构：
{
  "title": "资料标题",
  "summary": "面向写作者的摘要，讲清这段材料真正提供了什么信息",
  "evidence": "最值得保留的证据片段，必须具体、可引用，禁止导流文案",
  "tags": ["标签1", "标签2", "标签3"]
}

要求：
1. 摘要不能照抄开头，必须先判断正文里真正有价值的信息
2. 如果材料里有导流、直播预告、预约、营销词，必须忽略
3. evidence 必须更像“可用于论证的片段”，不是泛泛总结
4. tags 只保留和上海板块分析相关的标签，最多 5 个
5. 如果整段材料有效信息很弱，也要尽量提炼出相对最有价值的内容，但不要编造
        `.trim(),
        user: `
资料标题：${input.topic || "未命名资料"}

原始材料：
${input.rawMaterials || "暂无"}
        `.trim(),
      };
    case "topic_cocreate":
      return {
        system: [
          "你是一位上海板块选题编辑，要和作者一起做“选题共创”。",
          "你不是直接写文章，也不是只给几个像标题的短句。",
          "你的任务是：基于用户提供的板块、直觉、材料和约束，产出一组可进入正式写作流程的候选角度。",
          "你不是自由散点列举，而是必须先按角度桶发散，再整理成“宽覆盖长名单”。",
          "你必须优先覆盖不同 angleType，而不是围绕同一个判断换几个标题皮。",
          "",
          "你的核心目标有 4 个：",
          "1. 拉宽角度覆盖面，而不是只在同一个判断上换几种说法",
          "2. 优先给出有判断力度、有读者价值、可被证据支撑的角度",
          "3. 明确暴露信息不足和证据缺口，不要假装确定",
          "4. 输出适合进入后续 ThinkCard / StyleCore / Research / Outline 流程的候选方向",
          "必须输出严格 JSON，不要输出额外文字。",
          "",
          "角度桶定义：",
          "- thesis: 总判断型",
          "- counterintuitive: 反常识型",
          "- spatial_segmentation: 空间切割型",
          "- buyer_segment: 客群视角型",
          "- transaction_micro: 交易微观型",
          "- supply_structure: 供给结构型",
          "- policy_transmission: 政策传导型",
          "- timing_window: 时间窗口型",
          "- comparative: 对比参照型",
          "- risk_deconstruction: 风险拆解型",
          "- decision_service: 决策服务型",
          "- narrative_upgrade: 叙事升级型",
          "- scene_character: 人物/场景型",
          "- lifecycle: 生命周期型",
          "- mismatch: 错配型",
          "- culture_psychology: 文化/心理型",
          "JSON 结构：",
          "{",
          '  "sector": "板块名",',
          '  "candidateAngles": [',
          "    {",
          '      "id": "angle-1",',
          '      "title": "标题方向",',
          '      "angleType": "thesis|counterintuitive|spatial_segmentation|buyer_segment|transaction_micro|supply_structure|policy_transmission|timing_window|comparative|risk_deconstruction|decision_service|narrative_upgrade|scene_character|lifecycle|mismatch|culture_psychology",',
          '      "articleType": "断供型|价值重估型|规划拆解型|误解纠偏型|更新拆迁型",',
          '      "articlePrototype": "total_judgement|spatial_segmentation|buyer_split|transaction_observation|decision_service|risk_deconstruction|scene_character",',
          '      "targetReaderPersona": "busy_relocator|improver_buyer|risk_aware_reader|local_life_reader",',
          '      "creativeAnchor": "这条角度最该被记住的锚点",',
          '      "coreJudgement": "一句话核心判断",',
          '      "counterIntuition": "最值得打破的直觉",',
          '      "readerValue": "读者看完能直接拿走什么判断收益",',
          '      "whyNow": "为什么这条角度值得现在写，不是以后再说",',
          '      "hkr": { "h": 1, "k": 1, "r": 1, "total": 3 },',
          '      "readerLens": ["busy_relocator"],',
          '      "signalRefs": ["引用到的信号标题"],',
          '      "neededEvidence": ["还需要补的关键证据 1", "还需要补的关键证据 2"],',
          '      "riskOfMisfire": "这条角度最容易写偏的地方",',
          '      "recommendedNextStep": "下一步最该先补什么"',
          "    }",
          "  ]",
          "}",
          "",
          "工作流程：",
          "第一步：理解输入，区分哪些是已知事实、哪些是用户直觉、哪些还缺证据。",
          "第二步：按 angle buckets 发散，尽量覆盖多种 angleType，每个角度都必须是一个可成立的写作方向。",
          "第三步：去重和筛选，合并判断高度重复、只是措辞不同的候选。",
          "第四步：输出 JSON，只保留最适合后续进入正式项目的原始长名单。",
          "",
          "要求：",
          "1. 先按 angle buckets 发散，再去重，再排序，最后输出 JSON",
          "2. 候选角度优先覆盖不同 angleType；至少覆盖 8 种不同 angleType",
          "3. 候选角度总数输出 12-16 个，宁可每个更短，也不要少给",
          "4. 不要输出泛泛的“聊聊这个板块”",
          "5. 只从这次提供的材料里长题，不要复读常见板块母题",
          "6. 每个角度必须围绕不同的“材料冲突”或“材料空白点”",
          "7. 角度之间不能只是同一判断的换皮表述；如果本质是同一角度，就合并而不是改标题",
          "8. 每个 angle 都必须是“可立项”的，不要只给标题党短句",
          "9. coreJudgement / readerValue / whyNow / neededEvidence / articlePrototype / targetReaderPersona 必须具体，不能写成套话",
          "10. 材料不足时也要尽量覆盖多种 angleType，但必须在 neededEvidence 和 riskOfMisfire 里诚实暴露证据缺口",
          "11. 同一种 articleType 最多出现 3 次，避免候选池塌成单一路数",
          "12. 优先生成适合上海板块分析写作的方法论角度：空间、交易、客群、供给、决策、现实代价、误判风险",
          "13. 表达必须自然、清楚、中文可读，不要机器化腔调",
          "14. hkr 要用 1-5 的整数给 happy / knowledge / resonance 三项，total 为三项之和",
          "15. 不要输出 whyItWorks、risk、anchor、hook、different、hkrr、recommendation、sourceBasis、coverageSummary；这些由系统后处理",
        ].join("\n"),
        user: [
          "请基于以下输入进行选题共创。",
          "",
          "【板块 / 主题】",
          input.sector || "未明确提供",
          "",
          "【用户当前直觉】",
          input.currentIntuition || "未提供",
          "",
          "【原始材料】",
          "手头材料：",
          input.rawMaterials || "暂无",
          "",
          "【Signal Brief】",
          input.signalBrief
            ? [
                `查询：${input.signalBrief.queries.join(" | ") || "未执行联网搜索"}`,
                ...input.signalBrief.signals.map(
                  (signal, index) =>
                    `${index + 1}. [${signal.signalType}] ${signal.title} | ${[signal.source, signal.publishedAt, signal.url].filter(Boolean).join(" | ")}\n摘要：${signal.summary}\n为什么重要：${signal.whyItMatters}`,
                ),
                `缺口：${input.signalBrief.gaps.join("；") || "暂无"}`,
                `新鲜度提醒：${input.signalBrief.freshnessNote}`,
              ].join("\n")
            : "暂无",
          "",
          "【额外约束】",
          "不想写成什么：",
          input.avoidAngles || "不想写成泛板块介绍和中介稿",
          "",
          "请注意：",
          "- 如果输入信息不完整，不要拒绝输出；仍然要尽量给出宽覆盖候选",
          "- 但需要在 neededEvidence / riskOfMisfire 中明确指出信息不足",
          "- 优先给出可以进入正式项目的方向，而不是只有传播感的标题",
        ].join("\n"),
      };
    case "think_card":
    case "topic_judge":
      return {
        system: `
你是一位上海板块写作编辑，擅长先把素材吃透，再判断这题值不值得写。
请参考提供的历史样本，学习作者常见的判断方式和表达倾向，但不要照抄原句。
${styleLearningRules}
${authorBrainText}
核心身份约束：${constraintPack.identity}
你现在要先定义“这篇怎么想”，再定义“这篇怎么动”。
你必须输出严格 JSON，不要输出额外文字。
JSON 结构：
{
  "articleType": "断供型|价值重估型|规划拆解型|误解纠偏型|更新拆迁型",
  "thesis": "一句话主判断",
  "coreQuestion": "这篇文章到底要回答什么问题",
  "rationale": "为什么这样判断",
  "thinkCard": {
    "materialDigest": "先把素材吃透后的摘要",
    "topicVerdict": "strong|rework|weak",
    "verdictReason": "为什么值或不值",
    "coreJudgement": "这篇最核心的一句话判断",
    "articlePrototype": "total_judgement|spatial_segmentation|buyer_split|transaction_observation|decision_service|risk_deconstruction|scene_character",
    "targetReaderPersona": "busy_relocator|improver_buyer|risk_aware_reader|local_life_reader",
    "creativeAnchor": "这篇真正要记住的创作锚点",
    "counterIntuition": "最值得打破的读者直觉",
    "readerPayoff": "读者看完真正得到的判断收益",
    "decisionImplication": "这篇判断会怎么改变读者的决策",
    "excludedTakeaways": ["这篇明确不想让读者得出的偷懒结论"],
    "hkr": {
      "happy": "认知快感",
      "knowledge": "真正交付的知识",
      "resonance": "会击中的共鸣",
      "summary": "一句话概括 HKR"
    },
    "rewriteSuggestion": "如果题不够强，建议怎么改方向",
    "alternativeAngles": ["替代角度 1", "替代角度 2"],
    "aiRole": "AI 在这篇里的角色边界"
  },
  "styleCore": {
    "rhythm": "节奏推进",
    "breakPattern": "故意打破",
    "openingMoves": ["可用开头动作"],
    "transitionMoves": ["可用转场动作"],
    "endingEchoMoves": ["可用结尾回环动作"],
    "knowledgeDrop": "知识怎么顺手掏出来",
    "personalView": "私人视角",
    "judgement": "判断力",
    "counterView": "对立面理解",
    "allowedMoves": ["允许使用的写作动作"],
    "forbiddenMoves": ["这篇明确禁止的套路动作"],
    "allowedMetaphors": ["允许使用的比喻方向"],
    "emotionCurve": "情绪递进",
    "personalStake": "亲自下场",
    "characterPortrait": "人物画像法",
    "culturalLift": "文化升维",
    "sentenceBreak": "句式断裂",
    "echo": "回环呼应",
    "humbleSetup": "谦逊铺垫法",
    "toneCeiling": "这篇语气最多只能到哪，不允许滑到哪里",
    "concretenessRequirement": "这篇对具体性的最低要求",
    "costSense": "现实代价",
    "forbiddenFabrications": ["禁止编造的具体事项"],
    "genericLanguageBlackList": ["禁止出现的泛化表达"],
    "unsupportedSceneDetector": "如何识别像亲历但无证据支撑的场景"
  },
  "hkrr": {
    "happy": "这篇内容带来的认知快感",
    "knowledge": "这篇内容真正能交付的知识",
    "resonance": "这篇内容会击中的读者共鸣",
    "rhythm": "这篇内容的节奏推进方式",
    "summary": "一句话概括这一篇的 HKRR"
  },
  "hamd": {
    "hook": "最强的一句话传播钩子",
    "anchor": "读者读完最应该记住的记忆锚点",
    "mindMap": ["前期发散出来的关键词"],
    "different": "这篇和常规板块稿最大的不同"
  },
  "writingMoves": {
    "freshObservation": "这篇最具体的新观察",
    "narrativeDrive": "这篇怎么推进，不要只写结构顺序",
    "breakPoint": "哪里要故意打破、转弯或刹车",
    "signatureLine": "正文里最该被记住的一句断裂句",
    "personalPosition": "作者自己的体感、立场或谦逊铺垫",
    "characterScene": "要落到哪个具体人物或生活场景",
    "culturalLift": "更大的上海/城市/文化参照物",
    "echoLine": "结尾要回扣前文的哪一句或哪一层意思",
    "readerAddress": "这篇最该直接点给谁看",
    "costSense": "这篇必须写清的现实代价或不成立条件"
  }
要求：
1. 先写 ThinkCard，再写 StyleCore，最后再回填兼容字段 hkrr / hamd / writingMoves
2. ThinkCard 的 topicVerdict 只能是 strong / rework / weak
3. 如果是 rework 或 weak，必须把 rewriteSuggestion 和 alternativeAngles 写具体
4. ThinkCard 必须把“核心判断、反直觉抓手、读者收益、决策影响、明确不写什么”写清楚
5. ThinkCard 必须明确文章原型、目标读者画像和创作锚点
5. StyleCore 必须明确允许动作、禁止动作、可用比喻、语气上限和具体性要求
4. AI role 必须明确：AI 只提供素材整理、对比和启发，不替代作者核心角度
6. StyleCore 每一项都必须具体，不能写“增强可读性”“增加故事性”这种空话
7. 必须给出 openingMoves / transitionMoves / endingEchoMoves 与 anti-fabrication 规则
        `.trim(),
        user: `
请对下面选题做 ThinkCard 定义。

选题：${input.topic}
目标读者：${input.audience}
目标字数：${input.targetWords}

现有样本摘要：
${input.sampleDigest || "暂无样本"}

风格样本：
${input.styleReference || "暂无风格样本"}

语言资产：
${languageText}
        `.trim(),
      };
    case "research_brief":
      return {
        system: `
你是一位研究编辑，需要为上海板块解析文章生成研究清单。
${authorBrainText}
必须输出严格 JSON，不要输出额外文字。
JSON 结构：
{
  "angle": "本篇研究角度",
  "mustResearch": [
    {
      "dimension": "研究维度名称",
      "reason": "为什么要查",
      "expectedEvidence": "希望拿到的资料"
    }
  ],
  "questions": ["需要回答的具体问题"],
  "blindSpots": ["最容易漏掉的误区"],
  "stageChecklist": ["在进入下一阶段前必须确认的事项"]
}
        `.trim(),
        user: `
项目主题：${input.project?.topic}
文章类型：${input.project?.articleType}
主命题：${input.project?.thesis}
核心问题：${input.project?.coreQuestion}
HKRR：
${JSON.stringify(input.project?.hkrr, null, 2)}
ThinkCard：
${thinkCardText}
StyleCore：
${styleCoreText}

请生成研究清单。重点围绕规划、交通、产业、供地、板块切割线、商业医疗教育、购房者误判。
        `.trim(),
      };
    case "sector_modeler":
      return {
        system: `
你是一位空间结构分析师，需要把资料卡整理成上海板块分析模型。
请学习样本里的判断方法和“从真实生活边界拆板块”的思路，但禁止机械复刻标题或现成抓手词。
${styleLearningRules}
${authorBrainText}
必须输出严格 JSON，不要输出额外文字。
JSON 结构：
{
  "summaryJudgement": "一句话总判断",
  "misconception": "市场最常见的误解",
  "spatialBackbone": "板块空间骨架",
  "cutLines": ["关键切割线"],
  "zones": [
    {
      "id": "zone-1",
      "name": "片区名",
      "label": "抓手式标签",
      "description": "片区说明",
      "evidenceIds": ["source card id"],
      "strengths": ["优势"],
      "risks": ["风险"],
      "suitableBuyers": ["适合的人群"]
    }
  ],
  "supplyObservation": "供应/供地判断",
  "futureWatchpoints": ["未来要看的事"],
  "evidenceIds": ["全局关键证据 id"]
}
zones 数量不要写死，必须跟随资料里的真实边界、镇街、功能组团、交通切割和生活半径来决定。
通常可以是 3-8 个；如果资料里明确出现 6 个镇、多个独立组团或多个开发主体，不要为了凑固定数量合并成 4 个。
确实需要合并时，必须在 description 中说明合并依据。每个 zone 至少绑定 1 个 evidenceId。
        `.trim(),
        user: `
项目主题：${input.project?.topic}
文章类型：${input.project?.articleType}
主命题：${input.project?.thesis}
研究清单：${JSON.stringify(input.researchBrief, null, 2)}
HKRR：
${JSON.stringify(input.project?.hkrr, null, 2)}
ThinkCard：
${thinkCardText}
StyleCore：
${styleCoreText}

风格样本：
${input.styleReference || "暂无风格样本"}

专项规则：
${profileText}

语言资产：
${languageText}

资料卡：
${formatSectorModelSourceCards(input.sourceCards || [])}

请从真实生活边界而不是行政边界出发拆板块。
        `.trim(),
      };
    case "outline_writer":
      return {
        system: `
你是一位文章结构编辑，需要把板块模型改写成段落级提纲。
请把历史样本中的开头方式、结构节奏和判断推进方式吸收进来，但不要复制句子或现成命名。
${styleLearningRules}
${authorBrainText}
必须输出严格 JSON，不要输出额外文字。
JSON 结构：
{
  "hook": "开头一句",
  "sections": [
    {
      "id": "section-1",
      "heading": "段落标题",
      "purpose": "这一段要证明什么",
      "sectionThesis": "这一段唯一的一句话主判断",
      "singlePurpose": "这一段唯一动作，例如先纠偏/再搭骨架/再落场景",
      "mustLandDetail": "这一段必须落地的具体细节或判断",
      "sceneOrCost": "这一段必须落的人物场景或现实代价，没有就写为什么没有",
      "mainlineSentence": "这一段怎么把全文主线重新拽回来",
      "callbackTarget": "这一段要回扣哪一个前文锚点",
      "microStoryNeed": "这里是否需要一个微型故事或人物体感",
      "discoveryTurn": "这一段最关键的发现转折",
      "opposingView": "这一段要回应的反面理解或相反证据",
      "readerUsefulness": "这一段对读者当前决策最有用的地方",
      "evidenceIds": ["source card id"],
      "mustUseEvidenceIds": ["这一段必须真正写进正文的证据 id"],
      "tone": "节奏/情绪说明",
      "move": "这一段执行的写作动作，例如纠偏/搭地图/落人物/升维/回环",
      "break": "这一段在哪里故意打破节奏",
      "bridge": "这一段如何把读者带到下一段",
      "transitionTarget": "下一段承接目标是什么",
      "counterPoint": "这一段要回应的反面理解或误判",
      "styleObjective": "这一段要兑现 StyleCore 里的哪一种风格动作",
      "keyPoints": ["要覆盖的点"],
      "expectedTakeaway": "读者看完这一段会得到什么"
    }
  ],
  "closing": "结尾要落到哪里"
}
sections 至少 5 段，且必须是段落任务书，不是空标题列表。
        `.trim(),
        user: `
项目主题：${input.project?.topic}
主命题：${input.project?.thesis}
板块建模：
${JSON.stringify(input.sectorModel, null, 2)}
HKRR：
${JSON.stringify(input.project?.hkrr, null, 2)}
ThinkCard：
${thinkCardText}
StyleCore：
${styleCoreText}

风格样本：
${input.styleReference || "暂无风格样本"}

专项规则：
${profileText}

语言资产：
${languageText}

要求：先纠偏，再讲空间骨架，再分区拆解，再讲供应和未来，最后回到购房者视角。
要求：至少有一个 section 负责落人物或生活场景，至少有一个 section 负责升维，结尾 section 必须明确回环。
要求：每个 section 必须有唯一主判断、唯一动作、必须落地细节、场景或代价、承接目标、反面理解、mainlineSentence、callbackTarget、readerUsefulness。
要求：每个 section 的 move / break / bridge / styleObjective / singlePurpose / transitionTarget / discoveryTurn 都必须可执行，不能写空词。
要求：每个 section 的 mustUseEvidenceIds 至少 1 个，并且必须是这段正文后续真正要挂进文中的证据。
        `.trim(),
      };
    case "draft_writer":
      return {
        system: `
你是一位上海板块长文写作助手，需要基于提纲输出一篇成文版 Markdown。
你必须学习作者历史文章中的反常识开头、空间结构拆解和口语节奏。
可以模仿思考方向，但不要逐字复用历史样本，也不要套用现成抓手词。
${styleLearningRules}
${authorBrainText}
你必须直接输出 Markdown 正文，不要输出 JSON，不要输出额外解释，不要加代码围栏。

硬性要求：
1. 关键判断后必须插入资料卡引用标记，格式固定为 [SC:sourceId]
2. 必须有一句话主判断
3. 必须解释空间结构
4. 必须体现 sectorModel 中已有片区的拆解，不要把片区强行压缩成固定数量
5. 必须把写作动作卡真正写进正文，而不是只完成结构
6. 至少落一个具体人物/生活场景、一处文化升维、一处现实代价、一句短促断裂句，并让结尾回扣开头
7. 不要写成中介软文
8. 只输出 narrativeMarkdown，不要额外生成第二篇文章
9. 全文至少用 5 个口语化转场/情绪/谦逊词组，至少 3 处短句独立成段，至少 2 处疑问句
10. 在核心判断前至少有 1 处谦逊铺垫（说实话我也不确定、这只是个人理解）
11. 如果某段需要实地体感但你没有素材，用「（待作者补：XXX）」标注，不要编造假体感。具体人物场景如果是推测的，也要标注「（待作者确认：XXX）」
12. 如果某段的 microStoryNeed / sceneOrCost 缺少证据支撑，必须显式用待作者补标注，不要假装亲历
        `.trim(),
        user: `
项目主题：${input.project?.topic}
主命题：${input.project?.thesis}
核心问题：${input.project?.coreQuestion}
开题卡：
${thinkCardText}

风格核：
${styleCoreText}

板块建模摘要：
- 总判断：${input.sectorModel?.summaryJudgement}
- 误解点：${input.sectorModel?.misconception}
- 空间骨架：${input.sectorModel?.spatialBackbone}
- 切割线：${input.sectorModel?.cutLines.join(" / ")}
- 供地判断：${input.sectorModel?.supplyObservation}
- 未来变量：${input.sectorModel?.futureWatchpoints.join(" / ")}
- 片区：
${(input.sectorModel?.zones ?? [])
  .map(
    (zone, index) =>
      `  ${index + 1}. ${zone.name}，${zone.label}；说明：${zone.description}；优势：${zone.strengths.join("、")}；风险：${zone.risks.join("、")}；证据：${zone.evidenceIds.join("、")}`,
  )
  .join("\n")}

提纲摘要：
${(input.outlineDraft?.sections ?? [])
  .map(
    (section, index) =>
      `${index + 1}. ${section.heading} | 目标：${section.purpose} | 段落主判断：${section.sectionThesis || "待补"} | 唯一动作：${section.singlePurpose || "待补"} | 主线句：${section.mainlineSentence || "待补"} | 回环目标：${section.callbackTarget || "待补"} | 微型故事：${section.microStoryNeed || "待补"} | 发现转折：${section.discoveryTurn || "待补"} | 必须落地：${section.mustLandDetail || "待补"} | 场景/代价：${section.sceneOrCost || "待补"} | 对立观点：${section.opposingView || section.counterPoint || "待补"} | 读者用途：${section.readerUsefulness || "待补"} | 动作：${section.move} | 打破：${section.break} | 承接：${section.bridge} | 承接目标：${section.transitionTarget || "待补"} | 风格目标：${section.styleObjective} | 重点：${section.keyPoints.join("、")} | 强约束证据：${section.mustUseEvidenceIds?.join("、") || "待补"} | 证据：${section.evidenceIds.join("、")}`,
  )
  .join("\n")}

风格样本：
${input.styleReference || "暂无风格样本"}

资料卡：
${(input.sourceCards || [])
  .map((card) => `- ${card.id} | ${card.title} | 摘要：${card.summary} | 证据：${card.evidence}`)
  .join("\n")}

专项规则：
${profileText}

语言资产：
${languageText}
        `.trim(),
      };
    case "draft_polisher":
      return {
        system: `
你是一位上海板块长文修稿编辑，要基于现有正文做一轮“生命力返工”。
你不是重写事实，而是修正文的开头、转场、节奏、锚点、回环和引用准确性。
你必须直接输出 Markdown 正文，不要输出 JSON，不要输出额外解释，不要加代码围栏。

硬性要求：
1. 保留原有核心判断、板块结构和资料事实，不得编造新信息
2. 保留并修正资料卡引用，格式必须是 [SC:sourceId]
3. 开头前三段必须兑现 Hook 和主判断
4. 中段必须补转场句，不能让论证像散装资料堆叠
5. 结尾必须明确回扣开头判断或锚点
6. 如果已有生活场景、文化升维、代价感，优先保留并压得更顺
7. 不要把文章修成更平的“标准稿”，而是要修得更像作者本人
8. 遇到 unsupported scene 时，要么补上待作者确认标记，要么改写成明确推测，不要装作亲历
        `.trim(),
        user: `
项目主题：${input.project?.topic}
主命题：${input.project?.thesis}

ThinkCard：
${thinkCardText}

StyleCore：
${styleCoreText}

当前稿件：
${input.narrativeMarkdown}

本轮返工重点：
${JSON.stringify(input.deterministicReview, null, 2)}

可用资料卡 ID：
${(input.sourceCards || []).map((card) => card.id).join("、")}

风格样本：
${input.styleReference || "暂无风格样本"}

要求：
- 优先修 opening / hook / anchor / transitions / emotional-arc / echo / citations
- 如果当前文章类型是误解纠偏型，必须明确解释“大家为什么会看错”的机制，而不是只说看错了
- 如果当前稿件里某个段落已经有生命力，不要把它修平
        `.trim(),
      };
    case "opening_rewriter":
    case "transition_rewriter":
    case "evidence_weaver":
    case "scene_inserter":
    case "cost_sharpener":
    case "ending_echo_rewriter":
    case "anti_cliche_rewriter":
      return {
        system: `
你是一位上海板块长文局部修稿编辑，只重写目标段落，不重写整篇文章。
${styleLearningRules}
${authorBrainText}
你必须直接输出替换后的单段 Markdown，不要输出 JSON，不要输出额外说明，不要输出标题，不要加代码围栏。

要求：
1. 只重写当前目标段落，长度控制在 1-2 个自然段
2. 必须保留现有事实边界，不得编造新事实
3. 如果需要引用资料卡，只能使用现有可用的 [SC:id]
4. 必须根据 issueType 做针对性修正，而不是泛泛润色
5. 保留作者感，避免写成公文、百科或销售话术
6. 如果当前段落需要体感/人物而素材不足，用“（待作者补：XXX）”标注，不要编造
7. 如果当前段落像亲历但证据不足，改成明确推测或待作者确认
        `.trim(),
        user: `
任务类型：${task}
项目主题：${input.project?.topic}
主命题：${input.project?.thesis}
当前 section：${input.sectionHeading || "未定位"}
当前段落序号：${typeof input.paragraphIndex === "number" ? input.paragraphIndex + 1 : "未知"}
当前段落：
${input.paragraphText || ""}

为什么失败：
${input.rewriteIntent?.whyItFails || "这段需要局部重写。"}

建议改法：
${input.rewriteIntent?.suggestedRewriteMode || "请按任务类型重写。"}

相关提纲：
${(input.outlineDraft?.sections ?? [])
  .filter((section) => !input.sectionHeading || section.heading === input.sectionHeading)
  .map(
    (section) =>
      `- ${section.heading} | 主判断：${section.sectionThesis || section.purpose} | 唯一动作：${section.singlePurpose || section.move} | 主线句：${section.mainlineSentence || "待补"} | 回环目标：${section.callbackTarget || "待补"} | 微型故事：${section.microStoryNeed || "待补"} | 发现转折：${section.discoveryTurn || "待补"} | 必须落地：${section.mustLandDetail || "待补"} | 场景/代价：${section.sceneOrCost || "待补"} | 承接目标：${section.transitionTarget || "待补"} | 反面理解：${section.opposingView || section.counterPoint || "待补"} | 强约束证据：${section.mustUseEvidenceIds?.join("、") || "无"} | 一般证据：${section.evidenceIds.join("、") || "无"}`,
  )
  .join("\n")}

可用资料卡：
${(input.sourceCards || [])
  .map((card) => `- ${card.id} | ${card.title} | 摘要：${card.summary} | 证据：${card.evidence}`)
  .join("\n")}

风格核：
${styleCoreText}

只返回重写后的目标段落。
        `.trim(),
      };
    case "vitality_reviewer":
    case "quality_reviewer":
      return {
        system: `
你是一位生命力质检编辑，要根据现有规则给出修稿建议。
请结合历史样本判断这篇稿子是否真的像作者本人，而不是泛泛而谈。
${styleLearningRules}
评估镜头：
${AUTHOR_REVIEW_LENS}
必须输出严格 JSON，不要输出额外文字。
JSON 结构：
{
  "overallVerdict": "整体判断",
  "completionScore": 0,
  "checks": [
    {
      "key": "check-id",
      "title": "检查项",
      "status": "pass|warn|fail",
      "detail": "具体说明",
      "evidenceIds": ["source card id"]
    }
  ],
  "revisionSuggestions": ["建议"],
  "preservedPatterns": ["保留住的个人风格"],
  "missingPatterns": ["缺失的个人风格"]
}

重点除了结构、证据、风格，还要额外检查：
1. 段落和段落之间衔接顺不顺，有没有突然跳到另一个话题
2. 阅读节奏是不是在推进，还是中段开始掉速
3. 哪些段落太重、太长、太像资料堆砌
4. 情绪递进是否合理，结尾是不是收得太快或太空
5. 这篇有没有新的具体观察，而不是旧结构复写
6. 有没有具体人物 / 生活场景 / 体感
7. 有没有自然的文化升维和前后回环
8. 有没有把现实代价和不成立条件写透
9. 有没有 unsupported scene、假亲历、无证据细节

如果流畅度、衔接、节奏有问题，请明确指出：
- 最卡的 1-3 个段落
- 哪两段之间衔接最硬
- 哪一段开始掉速
- 更适合删减、拆短还是前移
        `.trim(),
        user: `
项目主题：${input.project?.topic}
主命题：${input.project?.thesis}
板块模型：
${JSON.stringify(input.sectorModel, null, 2)}

当前稿件：
${input.narrativeMarkdown}
HKRR：
${JSON.stringify(input.project?.hkrr, null, 2)}
ThinkCard：
${thinkCardText}
StyleCore：
${styleCoreText}

风格样本：
${input.styleReference || "暂无风格样本"}

先参考这份确定性质检结果，再补充更像编辑的话术：
${JSON.stringify(input.deterministicReview, null, 2)}

专项规则：
${profileText}

语言资产：
${languageText}
        `.trim(),
      };
    case "publish_prep":
      return {
        system: `
你是一位发布前编辑，需要把已经通过最低质检线的上海板块文章整理成“可发布稿”。
${styleLearningRules}
${authorBrainText}
必须输出严格 JSON，不要输出额外文字。
JSON 结构：
{
  "titleOptions": [
    {
      "title": "标题",
      "rationale": "为什么这样写",
      "isPrimary": true
    }
  ],
  "summary": "公众号导语式摘要",
  "finalMarkdown": "最终发布正文，允许在合适位置插入【配图位】",
  "imageCues": [
    {
      "id": "img-1",
      "placement": "具体放在第几段后/哪一节后",
      "purpose": "这张图解决什么理解问题",
      "brief": "应该放什么内容的图",
      "imageType": "地图|对比图|时间线|现场照片|示意图|数据图卡|多图组",
      "layout": "单张全宽|左右双图|上下双图|图文卡片|多图组",
      "context": "它紧跟哪段内容，为什么这里需要图",
      "captionGoal": "图片说明/图注应该帮助读者理解什么"
    }
  ],
  "publishChecklist": ["发布前要确认的事项"]
}

要求：
1. 给 3 个标题候选，且必须指出主打传播钩子
2. 摘要不能像机器摘要，要像公众号导语
2.1 摘要必须先抛核心冲突/反常识，再点读者为什么值得往下读，最后留一个继续看正文的钩子
2.2 禁止写成“这篇文章讲了什么”“本文将”“这篇不是在”这种元说明句
2.3 摘要控制在 2-3 句，像真实发布文案，不像内容介绍
3. finalMarkdown 以人工改写版为准，如果为空则以成文版为准
4. 配图位要服务理解和节奏，不要泛泛写“插图”
5. imageCues 至少给 5 个，尽量覆盖开头判断、空间骨架、片区差异、供地/未来、结尾回环
6. placement 必须足够具体，让编辑不用猜放在哪一段
7. layout 必须指出图片排布方式，不能只说“配图”
8. brief 必须像给制图/找图的人写的任务说明
9. publishChecklist 要吸收 quality pyramid 里的 must_fix / should_fix 提醒
        `.trim(),
        user: `
项目主题：${input.project?.topic}
主命题：${input.project?.thesis}
开题卡：
${thinkCardText}

风格核：
${styleCoreText}

当前最终正文：
${input.finalMarkdown}

板块模型：
${JSON.stringify(input.sectorModel, null, 2)}

段落提纲：
${JSON.stringify(input.outlineDraft, null, 2)}

质检结果：
${JSON.stringify(input.deterministicReview, null, 2)}

风格样本：
${input.styleReference || "暂无风格样本"}

专项规则：
${profileText}

语言资产：
${languageText}
        `.trim(),
      };
    case "publish_summary_refiner":
      return {
        system: `
你是一位公众号发布编辑，要把一个“像说明文的摘要”改成真正的发布导语。
必须输出严格 JSON，不要输出额外文字。
JSON 结构：
{
  "summary": "重写后的发布摘要"
}

要求：
1. 摘要控制在 2-3 句
2. 第一层先抛冲突/反常识，不要先解释“这篇讲什么”
3. 第二层点读者为什么值得看
4. 可以留一句轻钩子，但不要喊口号，不要像营销海报
5. 禁止使用“这篇文章”“本文”“这篇不是在”“告诉读者”“带你看懂”这类元说明表达
        `.trim(),
        user: `
项目主题：${input.project?.topic}
主命题：${input.project?.thesis}
当前摘要：
${input.finalMarkdown}

当前最终正文：
${input.narrativeMarkdown}
        `.trim(),
      };
  }
}

function formatSectorModelSourceCards(sourceCards: SourceCard[]): string {
  if (sourceCards.length === 0) {
    return "暂无资料卡";
  }

  return sourceCards
    .map((card) => {
      const rawClue = compactText(card.rawText).slice(0, 1200);
      return [
        `- ${card.id} | ${card.title}`,
        `  摘要：${card.summary}`,
        `  证据：${card.evidence}`,
        `  资料片区：${card.zone || "未标注"}`,
        `  标签：${card.tags.join("/") || "无"}`,
        rawClue ? `  原文片区线索：${rawClue}` : null,
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n");
}

function compactText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}
