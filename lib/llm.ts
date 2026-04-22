import type { OutlineDraft, PublishPackage, ResearchBrief, ReviewReport, SectorModel, SourceCard, TopicCoCreationResult, TopicJudgeResult } from "@/lib/types";
import type { TaskName } from "@/lib/prompt-engine";
import { buildPromptTask } from "@/lib/prompt-engine";
import { buildLLMCallHashes, recordLLMCall, summarizeLLMError } from "@/lib/observability/llm-calls";
import { extractJson, firstNonEmptyLine, truncate } from "@/lib/utils";
import { buildMaterialInsights, buildTopicCoCreateFallback as buildTopicCoCreateFromMaterials } from "@/lib/topic-cocreate";
import type { CoCreationSourceDigest } from "@/lib/co-creation-materials";
import { buildCardsFromLegacy, deriveLegacyFrames } from "@/lib/author-cards";
import { buildDefaultWritingMoves } from "@/lib/writing-moves";
import { generateSourceSummary, type GeneratedSourceSummary } from "@/lib/source-summary";

const modelMode = process.env.MODEL_MODE ?? (process.env.MODEL_API_KEY ? "remote" : "mock");
const modelName = process.env.MODEL_NAME ?? "gpt-4.1-mini";
const apiBaseUrl = process.env.MODEL_API_BASE_URL ?? "https://api.openai.com/v1";
const apiPath = process.env.MODEL_API_PATH ?? "/chat/completions";
const temperature = Number(process.env.MODEL_TEMPERATURE ?? "0.4");

type TaskTuning = {
  timeoutMs: number;
  maxTokens: number;
  retryMaxTokens?: number;
  useJsonMode: boolean;
};

type StructuredTaskOptions = {
  audit?: {
    jobId?: string | null;
    projectId?: string | null;
    promptVersion?: string;
  };
};

export async function runStructuredTask<T>(
  task: TaskName,
  input: Parameters<typeof buildPromptTask>[1],
  options: StructuredTaskOptions = {},
): Promise<T> {
  const prompt = buildPromptTask(task, input);
  if (modelMode === "mock") {
    const mockOutput = buildMockResponse(task, input);
    maybeRecordAudit({
      task,
      prompt,
      content: JSON.stringify(mockOutput),
      timeoutMs: getTaskTuning(task).timeoutMs,
      maxTokens: getTaskTuning(task).maxTokens,
      latencyMs: 0,
      tokenUsage: {},
      status: "ok",
      options,
    });
    return mockOutput as T;
  }

  const apiKey = process.env.MODEL_API_KEY;
  if (!apiKey) {
    throw new Error("缺少 MODEL_API_KEY，无法调用远程模型。");
  }

  const tuning = getTaskTuning(task);
  const tokenAttempts = [tuning.maxTokens, tuning.retryMaxTokens].filter(
    (value, index, values): value is number => typeof value === "number" && values.indexOf(value) === index,
  );

  let lastContent = "";
  let lastUsage: Record<string, unknown> = {};
  let lastLatencyMs = 0;
  let lastFinishReason = "";
  for (let attemptIndex = 0; attemptIndex < tokenAttempts.length; attemptIndex += 1) {
    let content = "";
    let finishReason = "";
    let usage: Record<string, unknown> = {};
    let latencyMs = 0;
    try {
      const modelResult = await callModel(task, prompt, {
        timeoutMs: tuning.timeoutMs,
        maxTokens: tokenAttempts[attemptIndex],
        useJsonMode: tuning.useJsonMode,
        apiKey,
      });
      content = modelResult.content;
      finishReason = modelResult.finishReason ?? "";
      usage = modelResult.usage;
      latencyMs = modelResult.latencyMs;
    } catch (error) {
      maybeRecordAudit({
        task,
        prompt,
        content: "",
        timeoutMs: tuning.timeoutMs,
        maxTokens: tokenAttempts[attemptIndex],
        latencyMs: 0,
        tokenUsage: {},
        status: isTimeoutError(error) ? "timeout" : "api_error",
        errorMessage: summarizeLLMError(error),
        options,
      });
      throw error;
    }

    lastContent = content;
    lastUsage = usage;
    lastLatencyMs = latencyMs;
    lastFinishReason = finishReason;

    if (
      task === "draft_writer" ||
      task === "draft_polisher" ||
      task === "opening_rewriter" ||
      task === "transition_rewriter" ||
      task === "evidence_weaver" ||
      task === "scene_inserter" ||
      task === "cost_sharpener" ||
      task === "ending_echo_rewriter" ||
      task === "anti_cliche_rewriter"
    ) {
      maybeRecordAudit({
        task,
        prompt,
        content,
        timeoutMs: tuning.timeoutMs,
        maxTokens: tokenAttempts[attemptIndex],
        latencyMs,
        tokenUsage: usage,
        status: "ok",
        options,
      });
      return { narrativeMarkdown: normaliseMarkdownResponse(content) } as T;
    }

    try {
      const parsed = extractJson<T>(content);
      maybeRecordAudit({
        task,
        prompt,
        content,
        timeoutMs: tuning.timeoutMs,
        maxTokens: tokenAttempts[attemptIndex],
        latencyMs,
        tokenUsage: usage,
        status: "ok",
        options,
      });
      return parsed;
    } catch {
      const isTruncated = finishReason && finishReason !== "stop";
      if (isTruncated) {
        console.error(`[runStructuredTask] ${task} truncated`, {
          finishReason,
          attempt: attemptIndex + 1,
          maxTokens: tokenAttempts[attemptIndex],
          preview: truncate(content, 300),
        });
        if (attemptIndex < tokenAttempts.length - 1) {
          continue;
        }
        maybeRecordAudit({
          task,
          prompt,
          content,
          timeoutMs: tuning.timeoutMs,
          maxTokens: tokenAttempts[attemptIndex],
          latencyMs,
          tokenUsage: usage,
          status: "parse_error",
          errorMessage: buildStructuredTaskLengthError(task),
          options,
        });
        throw new Error(buildStructuredTaskLengthError(task));
      }

      console.error(`[runStructuredTask] ${task} invalid_json`, {
        attempt: attemptIndex + 1,
        maxTokens: tokenAttempts[attemptIndex],
        preview: truncate(content, 300),
      });
      maybeRecordAudit({
        task,
        prompt,
        content,
        timeoutMs: tuning.timeoutMs,
        maxTokens: tokenAttempts[attemptIndex],
        latencyMs,
        tokenUsage: usage,
        status: "parse_error",
        errorMessage: buildStructuredTaskParseError(task),
        options,
      });
      throw new Error(buildStructuredTaskParseError(task));
    }
  }

  console.error(`[runStructuredTask] ${task} exhausted_attempts`, {
    finishReason: lastFinishReason,
    preview: truncate(lastContent, 300),
  });
  maybeRecordAudit({
    task,
    prompt,
    content: lastContent,
    timeoutMs: tuning.timeoutMs,
    maxTokens: tuning.retryMaxTokens ?? tuning.maxTokens,
    latencyMs: lastLatencyMs,
    tokenUsage: lastUsage,
    status: "parse_error",
    errorMessage: buildStructuredTaskLengthError(task),
    options,
  });
  throw new Error(buildStructuredTaskLengthError(task));
}

async function callModel(
  task: TaskName,
  prompt: ReturnType<typeof buildPromptTask>,
  input: { timeoutMs: number; maxTokens: number; useJsonMode: boolean; apiKey: string },
) {
  let response: Response;
  const startedAt = Date.now();
  try {
    response = await fetch(`${apiBaseUrl}${apiPath}`, {
      method: "POST",
      signal: AbortSignal.timeout(input.timeoutMs),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${input.apiKey}`,
      },
      body: JSON.stringify({
        model: modelName,
        temperature,
        max_tokens: input.maxTokens,
        ...(input.useJsonMode ? { response_format: { type: "json_object" } } : {}),
        messages: [
          { role: "system", content: prompt.system },
          { role: "user", content: prompt.user },
        ],
      }),
    });
  } catch (error) {
    if (isTimeoutError(error)) {
      const timeoutError = new Error(
        task === "draft_writer"
          ? "正文生成超时，当前稿子对模型来说还是偏重。"
          : `${task} 超时，当前结构化任务在模型侧返回太慢，需要继续压缩 prompt 或提高超时阈值。`,
      );
      timeoutError.name = "TimeoutError";
      throw timeoutError;
    }
    throw error;
  }

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`模型调用失败：${response.status} ${message}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
    usage?: Record<string, unknown>;
  };
  const content = payload.choices?.[0]?.message?.content;
  const finishReason = payload.choices?.[0]?.finish_reason;
  if (!content) {
    throw new Error("模型没有返回内容。");
  }

  return {
    content,
    finishReason,
    usage: payload.usage ?? {},
    latencyMs: Date.now() - startedAt,
  };
}

function getTaskTuning(task: TaskName): TaskTuning {
  switch (task) {
    case "topic_cocreate":
      return { timeoutMs: 180000, maxTokens: 2200, retryMaxTokens: 3000, useJsonMode: true };
    case "research_brief":
      return { timeoutMs: 120000, maxTokens: 1800, retryMaxTokens: 2800, useJsonMode: true };
    case "source_card_summarizer":
      return { timeoutMs: 60000, maxTokens: 1200, retryMaxTokens: 1800, useJsonMode: true };
    case "sector_modeler":
      return { timeoutMs: 120000, maxTokens: 2400, retryMaxTokens: 3200, useJsonMode: true };
    case "outline_writer":
      return { timeoutMs: 90000, maxTokens: 2200, retryMaxTokens: 3200, useJsonMode: true };
    case "draft_polisher":
      return { timeoutMs: 90000, maxTokens: 2400, useJsonMode: false };
    case "opening_rewriter":
    case "transition_rewriter":
    case "evidence_weaver":
    case "scene_inserter":
    case "cost_sharpener":
    case "ending_echo_rewriter":
    case "anti_cliche_rewriter":
      return { timeoutMs: 60000, maxTokens: 900, retryMaxTokens: 1400, useJsonMode: false };
    case "vitality_reviewer":
    case "quality_reviewer":
      return { timeoutMs: 120000, maxTokens: 2400, retryMaxTokens: 3200, useJsonMode: true };
    case "draft_writer":
      return { timeoutMs: 90000, maxTokens: 2200, useJsonMode: false };
    case "publish_prep":
      return { timeoutMs: 30000, maxTokens: 1400, retryMaxTokens: 2200, useJsonMode: true };
    case "publish_summary_refiner":
      return { timeoutMs: 30000, maxTokens: 500, retryMaxTokens: 800, useJsonMode: true };
    case "think_card":
    case "topic_judge":
      return { timeoutMs: 120000, maxTokens: 2600, retryMaxTokens: 3600, useJsonMode: true };
  }
}

function buildStructuredTaskLengthError(task: TaskName): string {
  switch (task) {
    case "think_card":
    case "topic_judge":
      return "模型在生成选题定义卡时输出过长，结果没有完整返回。请直接重试；如果仍然失败，需要进一步压缩输入材料。";
    case "topic_cocreate":
      return "模型在生成选题候选池时输出过长，结果没有完整返回。请重试，或减少输入材料长度。";
    default:
      return "模型输出过长，结构化结果没有完整返回。请重试；如果持续失败，需要压缩输入或继续提高输出上限。";
  }
}

function buildStructuredTaskParseError(task: TaskName): string {
  switch (task) {
    case "think_card":
    case "topic_judge":
      return "模型返回的选题定义结果不完整，暂时无法生成项目。请重试一次。";
    case "topic_cocreate":
      return "模型返回的选题候选结果不完整，暂时无法解析。请重试一次。";
    default:
      return `${task} 返回的结构化结果不完整，暂时无法解析。请重试一次。`;
  }
}

function isTimeoutError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === "TimeoutError" ||
      error.name === "AbortError" ||
      error.message.includes("aborted due to timeout") ||
      error.message.includes("timed out"))
  );
}

function maybeRecordAudit(input: {
  task: TaskName;
  prompt: ReturnType<typeof buildPromptTask>;
  content: string;
  timeoutMs: number;
  maxTokens: number;
  latencyMs: number;
  tokenUsage: Record<string, unknown>;
  status: "ok" | "timeout" | "parse_error" | "api_error";
  errorMessage?: string;
  options: StructuredTaskOptions;
}) {
  if (!input.options.audit) {
    return;
  }

  const hashes = buildLLMCallHashes({
    prompt: input.prompt,
    output: input.content || input.errorMessage || "",
  });

  recordLLMCall({
    jobId: input.options.audit.jobId ?? null,
    projectId: input.options.audit.projectId ?? null,
    taskType: input.task,
    modelMode,
    modelName,
    promptVersion: input.options.audit.promptVersion ?? `${input.task}:v1`,
    timeoutMs: input.timeoutMs,
    maxTokens: input.maxTokens,
    temperature,
    inputHash: hashes.inputHash,
    outputHash: hashes.outputHash,
    latencyMs: input.latencyMs,
    tokenUsage: input.tokenUsage,
    status: input.status,
    errorMessage: input.errorMessage ?? null,
  });
}

export function buildTopicCoCreateFallback(
  sector: string,
  currentIntuition: string,
  rawMaterials: string,
  sourceDigests: CoCreationSourceDigest[] = [],
): TopicCoCreationResult {
  return {
    sector,
    candidateAngles: buildTopicCoCreateFromMaterials(sector, currentIntuition, rawMaterials, sourceDigests),
    materialInsights: buildMaterialInsights({
      currentIntuition,
      rawMaterials,
      sourceDigests,
    }),
  };
}

function buildMockResponse(task: TaskName, input: Parameters<typeof buildPromptTask>[1]) {
  switch (task) {
    case "think_card":
    case "topic_judge":
      return mockTopicJudge(input.topic ?? "", input.audience ?? "", input.targetWords ?? 2400);
    case "topic_cocreate":
      return mockTopicCoCreate(input.sector ?? "", input.currentIntuition ?? "", input.rawMaterials ?? "");
    case "source_card_summarizer":
      return mockSourceCardSummary(input.topic ?? "", input.rawMaterials ?? "");
    case "research_brief":
      return mockResearchBrief(input.project?.topic ?? "", input.project?.thesis ?? "");
    case "sector_modeler":
      return mockSectorModel(input.project?.topic ?? "", input.project?.thesis ?? "", input.sourceCards ?? []);
    case "outline_writer":
      return mockOutlineDraft(input.project?.topic ?? "", input.project?.thesis ?? "", input.sectorModel);
    case "draft_writer":
      return mockArticleDraft(input.project, input.outlineDraft, input.sourceCards ?? []);
    case "draft_polisher":
      return { narrativeMarkdown: input.narrativeMarkdown ?? "" };
    case "opening_rewriter":
    case "transition_rewriter":
    case "evidence_weaver":
    case "scene_inserter":
    case "cost_sharpener":
    case "ending_echo_rewriter":
    case "anti_cliche_rewriter":
      return { narrativeMarkdown: mockRewriteParagraph(task, input.paragraphText ?? "", input.rewriteIntent?.whyItFails ?? "", input.sourceCards ?? []) };
    case "vitality_reviewer":
    case "quality_reviewer":
      return mockQualityReviewer(input.deterministicReview);
    case "publish_prep":
      return mockPublishPrep(input.project?.topic ?? "", input.finalMarkdown ?? "");
    case "publish_summary_refiner":
      return { summary: mockPublishSummary(input.project?.topic ?? "", input.narrativeMarkdown ?? "") };
  }
}

function mockRewriteParagraph(task: TaskName, paragraphText: string, whyItFails: string, sourceCards: SourceCard[]) {
  const citations = sourceCards.slice(0, 1).map((card) => `[SC:${card.id}]`).join(" ");
  const base = paragraphText.trim() || "这一段需要重写。";

  switch (task) {
    case "opening_rewriter":
      return `说真的，问题不在表面位置，而在结构。${citations} ${base}`;
    case "transition_rewriter":
      return `问题在于，前面那层标签只是入口，真正要看的，是它怎么一步步落到结构和生活路径上。${citations}`;
    case "evidence_weaver":
      return `${base} 更关键的是，这个判断不能只停在感觉上，得拿现成证据压实。${citations}`;
    case "scene_inserter":
      return `${base} 你把一个早高峰通勤、接娃买菜都压在这里的人放进去，就会明白这不是地图上两厘米的事。${citations}`;
    case "cost_sharpener":
      return `${base} 但代价也摆在这里：时间成本、生活便利度和兑现节奏，没有一个是能跳过去不看的。${citations}`;
    case "ending_echo_rewriter":
      return `${base} 回到开头，真正决定它成立与否的，始终不是标签，而是结构。${citations}`;
    case "anti_cliche_rewriter":
      return `${base.replace(/赋能|多维度|全方位|高质量发展/g, "更具体地说")} ${citations}`.trim();
    default:
      return `${base} ${whyItFails}`.trim();
  }
}

function mockTopicCoCreate(sector: string, currentIntuition: string, rawMaterials: string): TopicCoCreationResult {
  return buildTopicCoCreateFallback(sector || "未命名板块", currentIntuition, rawMaterials, []);
}

function mockTopicJudge(topic: string, audience: string, targetWords: number): TopicJudgeResult {
  const mapping: Array<{ match: RegExp; type: TopicJudgeResult["articleType"] }> = [
    { match: /断供|供应/, type: "断供型" },
    { match: /拆|旧改|更新/, type: "更新拆迁型" },
    { match: /高估|低估|才是|真正/, type: "价值重估型" },
    { match: /误解|为什么.*看不见|被忽略/, type: "误解纠偏型" },
  ];

  const articleType = mapping.find((item) => item.match.test(topic))?.type ?? "规划拆解型";

  const thesis = `${topic} 的核心，不是表面热度，而是城市结构和供给节奏的错位。`;
  const hkrr = {
      happy: `用一句反常识判断拆开 ${topic} 的表面标签，让读者产生“原来如此”的认知快感。`,
      knowledge: `交付 ${topic} 的空间结构、切割线、供地节奏和适配人群判断。`,
      resonance: `击中读者对“买错片区比买错板块更可怕”的焦虑和共鸣。`,
      rhythm: "开头先立判断，中段拆骨架和片区，尾段快速收回到购房者判断。",
      summary: "先用反常识把人拉进来，再用结构和供给把结论立住。",
    };
  const hamd = {
      hook: `${topic} 最容易被看错的，不是位置，而是市场想象被打得太满。`,
      anchor: `${topic} 不是一个均质板块，而是几个完全不同的世界拼在一起。`,
      mindMap: ["误解", "空间骨架", "切割线", "片区差异", "供地节奏", "适配人群"],
      different: "不是在复述板块配套，而是在拆市场为什么会看错这个地方。",
    };
  const writingMoves = buildDefaultWritingMoves({
    topic,
    articleType,
    thesis,
  });
  const cards = buildCardsFromLegacy({
    topic,
    articleType,
    audience,
    thesis,
    notes: `面向 ${audience}，建议控制在 ${targetWords} 字左右，先纠偏再拆结构。`,
    hkrr,
    hamd,
    writingMoves,
  });
  const compatibility = deriveLegacyFrames({
    topic,
    articleType,
    thesis,
    thinkCard: cards.thinkCard,
    styleCore: cards.styleCore,
    currentHAMD: hamd,
    currentWritingMoves: writingMoves,
  });

  return {
    articleType,
    thesis,
    coreQuestion: `这篇文章要回答，${topic} 为什么会被市场误判，以及真正的结构性机会和限制在哪里。`,
    rationale: `面向 ${audience}，建议控制在 ${targetWords} 字左右，先纠偏再拆结构。`,
    thinkCard: cards.thinkCard,
    styleCore: cards.styleCore,
    hkrr: compatibility.hkrr,
    hamd: compatibility.hamd,
    writingMoves: compatibility.writingMoves,
  };
}

function mockSourceCardSummary(title: string, rawMaterials: string): GeneratedSourceSummary {
  return generateSourceSummary(rawMaterials, title || "未命名资料");
}

function mockResearchBrief(topic: string, thesis: string): ResearchBrief {
  return {
    angle: `${topic} 的研究角度，先拆误解，再看空间结构，最后落到供给与人群适配。`,
    mustResearch: [
      { dimension: "规划/控规", reason: "判断空间骨架和未来供给边界", expectedEvidence: "控规图、专项规划、更新公告" },
      { dimension: "交通与切割线", reason: "判断真实生活边界", expectedEvidence: "地铁、主干道、高架、河道" },
      { dimension: "供地与新房供应", reason: "验证 thesis 是否站得住", expectedEvidence: "储备用地、土地出让、在售项目" },
      { dimension: "配套与产业", reason: "判断板块承接能力", expectedEvidence: "商业、学校、医院、产业节点" },
      { dimension: "购房者误判", reason: "写出纠偏价值", expectedEvidence: "常见认知偏差和真实板块感知" },
    ],
    questions: [
      `${topic} 最容易被误解的点是什么`,
      "这个板块真正的切割线在哪里",
      "未来供应是增加、收缩还是结构性错位",
      thesis,
    ],
    blindSpots: ["只看行政边界", "只看单价不看结构", "只看新房不看储备用地"],
    stageChecklist: ["至少补齐 4 个维度的资料卡", "至少有 1 条供应证据和 1 条空间切割线证据", "先定义误解再写文章"],
  };
}

function mockSectorModel(topic: string, thesis: string, sourceCards: SourceCard[]): SectorModel {
  const evidenceIds = sourceCards.slice(0, 5).map((card) => card.id);
  const zoneEvidence = buildZoneEvidenceIds(sourceCards);

  return {
    summaryJudgement: thesis || `${topic} 真正的价值，不在概念，而在结构。`,
    misconception: `市场对 ${topic} 的误解，通常来自行政边界和销售话术，而不是空间结构。`,
    spatialBackbone: `${topic} 的骨架由主通勤线、供地节奏和高架/主干道切割共同决定。`,
    cutLines: ["主干道切割", "轨交通勤差异", "新旧社区界面落差"],
    zones: [
      {
        id: "zone-1",
        name: "核心承接区",
        label: "最像大家想象中的那个板块",
        description: "资源浓度最高，也是最容易被高估的一段。",
        evidenceIds: zoneEvidence[0],
        strengths: ["通勤效率高", "资源最完整"],
        risks: ["价格门槛高", "后续供给有限"],
        suitableBuyers: ["预算足够的改善购房者"],
      },
      {
        id: "zone-2",
        name: "错配居住区",
        label: "认知偏差最大的拼图",
        description: "生活感与地段感错位，容易被低估。",
        evidenceIds: zoneEvidence[1],
        strengths: ["性价比高", "通勤可接受"],
        risks: ["界面一般", "市场接受度分化"],
        suitableBuyers: ["首改和务实型买家"],
      },
      {
        id: "zone-3",
        name: "未来供应区",
        label: "决定下半场走势的地方",
        description: "真正决定未来故事还能不能讲下去的片区。",
        evidenceIds: zoneEvidence[2],
        strengths: ["想象空间大", "规划弹性更强"],
        risks: ["兑现周期长", "变量多"],
        suitableBuyers: ["能接受兑现周期的人群"],
      },
    ],
    supplyObservation: `${topic} 后续走势，很大程度取决于储备用地释放节奏，而不是当下热度。`,
    futureWatchpoints: ["储备用地何时出让", "关键配套兑现顺序", "市场是否重新定价"],
    evidenceIds,
  };
}

function buildZoneEvidenceIds(sourceCards: SourceCard[]): string[][] {
  const ids = sourceCards.map((card) => card.id);
  if (ids.length === 0) {
    return [["sc-missing-1"], ["sc-missing-2"], ["sc-missing-3"]];
  }

  return [
    [ids[0]],
    [ids[1] ?? ids[0]],
    [ids[2] ?? ids[0]],
  ];
}

function mockOutlineDraft(topic: string, thesis: string, sectorModel: SectorModel | null | undefined): OutlineDraft {
  const zones = sectorModel?.zones ?? [];
  return {
    hook: `很多人看 ${topic}，第一眼看到的是热度和标签，但真正决定价值的，其实是另一套东西。`,
    sections: [
      {
        id: "section-1",
        heading: "先把误解拨开",
        purpose: "先纠正市场对板块的典型误判",
        sectionThesis: `${topic} 真正的问题不是表面标签，而是结构。`,
        singlePurpose: "先纠偏",
        mustLandDetail: "一句话把主判断立住",
        sceneOrCost: "先落一个读者最容易误判的现实感受",
        evidenceIds: sectorModel?.evidenceIds.slice(0, 1) ?? [],
        mustUseEvidenceIds: sectorModel?.evidenceIds.slice(0, 1) ?? [],
        tone: "反常识、拉住读者",
        move: "先纠偏，把旧标签撕开",
        break: "在板块标签快被接受时，用一句反常识短句切断惯性。",
        bridge: "把误解撕开之后，立刻转去解释它为什么会被看错。",
        transitionTarget: "把读者带到空间骨架",
        counterPoint: "回应“离核心近就该涨”的误判",
        styleObjective: "兑现判断力和句式断裂",
        keyPoints: [thesis, sectorModel?.misconception ?? "市场误解"],
        expectedTakeaway: "读者知道这篇不是在复述销售话术。",
      },
      {
        id: "section-2",
        heading: "真正的空间骨架是什么",
        purpose: "解释板块内部真实边界",
        sectionThesis: sectorModel?.spatialBackbone ?? `${topic} 不是一个整体空间，而是被切开的几个生活路径。`,
        singlePurpose: "搭骨架",
        mustLandDetail: "讲清切割线和空间骨架",
        sceneOrCost: "落到通勤或生活路径上的实际差别",
        evidenceIds: sectorModel?.evidenceIds.slice(0, 2) ?? [],
        mustUseEvidenceIds: sectorModel?.evidenceIds.slice(0, 1) ?? [],
        tone: "拆结构、做地图感",
        move: "搭地图，让读者脑子里出现空间骨架",
        break: "从抽象误解切到具体地图感，让文章落地。",
        bridge: "地图搭出来以后，再顺着骨架把片区一个个拆开。",
        transitionTarget: "把整体骨架带进分区拆解",
        counterPoint: "回应“一个板块就该一个价格带”的误判",
        styleObjective: "兑现知识顺手掏出来和节奏推进",
        keyPoints: [sectorModel?.spatialBackbone ?? "空间骨架", ...(sectorModel?.cutLines ?? [])],
        expectedTakeaway: "读者开始明白板块不是一个整体。",
      },
      ...zones.map((zone, index) => ({
        id: `zone-section-${index + 1}`,
        heading: `${zone.name}，${zone.label}`,
        purpose: `拆解 ${zone.name} 的真实定位`,
        sectionThesis: `${zone.name} 的成立逻辑和风险，不是外界以为的那一套。`,
        singlePurpose: index === 0 ? "落人物场景" : "拆片区差异",
        mustLandDetail: `让读者记住 ${zone.name} 的一句话画像`,
        sceneOrCost: index === 0 ? "落一个具体生活场景" : "写清现实代价或门槛",
        evidenceIds: zone.evidenceIds,
        mustUseEvidenceIds: zone.evidenceIds.slice(0, Math.max(1, Math.min(2, zone.evidenceIds.length))),
        tone: "分区拆解、给抓手",
        move: index === 0 ? "先给片区画像，再把人物或生活场景落进去" : "继续拆片区差异，同时补代价和不成立条件",
        break: index === 0 ? "用一个人物或生活场景把地图翻成体感。" : "在优势之后立刻补短板，避免滑成顺推。",
        bridge: index === zones.length - 1 ? "片区拆完以后，把视角收回到供地和未来走势。" : "从这一块的优劣顺势转到下一块为什么完全不是同一种生活。",
        transitionTarget: index === zones.length - 1 ? "收回整体判断" : "继续拆下一个片区",
        counterPoint: zone.risks[0] ?? "回应市场对这一区的惯性想象",
        styleObjective: index === 0 ? "兑现人物画像法和亲自下场" : "兑现对立面理解和现实代价",
        keyPoints: [zone.description, ...zone.strengths, ...zone.risks],
        expectedTakeaway: `读者能记住 ${zone.name} 的一句话画像。`,
      })),
      {
        id: "section-final",
        heading: "供应和下半场怎么走",
        purpose: "回到供地和未来走势",
        sectionThesis: `${topic} 是否成立，最后还是取决于具体片区、具体门槛和具体代价。`,
        singlePurpose: "回环收束",
        mustLandDetail: "明确对谁成立、对谁不成立",
        sceneOrCost: "落一个最真实的门槛或代价",
        evidenceIds: sectorModel?.evidenceIds.slice(-2) ?? [],
        mustUseEvidenceIds: sectorModel?.evidenceIds.slice(-1) ?? [],
        tone: "收束、落到购房者判断",
        move: "把前文判断升维，再回到具体买房代价和适配人群",
        break: "在要下结论前，先把代价说透，压住软文感。",
        bridge: "用开头那句判断收住，不要平着结束。",
        transitionTarget: "把读者带回开头的主判断",
        counterPoint: "回应“只看标签就能下结论”的偷懒判断",
        styleObjective: "兑现文化升维、回环呼应和现实代价",
        keyPoints: [sectorModel?.supplyObservation ?? "供应判断", ...(sectorModel?.futureWatchpoints ?? [])],
        expectedTakeaway: "读者知道这个板块对谁成立，对谁不成立。",
      },
    ],
    closing: `${topic} 值不值得看，从来不是一句“行”或“不行”，而是你买的是哪一块、承受什么代价、又指望它兑现什么。`,
  };
}

function mockArticleDraft(
  project: { topic?: string; thesis?: string; writingMoves?: TopicJudgeResult["writingMoves"] } | undefined,
  outlineDraft: OutlineDraft | null | undefined,
  sourceCards: SourceCard[],
): { narrativeMarkdown: string } {
  const topic = project?.topic ?? "未命名板块";
  const thesis = project?.thesis ?? `${topic} 真正决定价值的不是热度，而是结构。`;
  const writingMoves = project?.writingMoves;
  const sections = outlineDraft?.sections ?? [];
  const citations = sourceCards.length
    ? sourceCards.map((card) => `[SC:${card.id}]`).join(" ")
    : "[SC:sc-missing-1]";

  const narrativeMarkdown = [
    `# ${topic}`,
    "",
    `${outlineDraft?.hook ?? `${topic} 这件事，真正该看的不是表面热度。`} ${citations}`,
    "",
    `如果一定要先给一句话判断，那就是，${thesis} ${citations}`,
    "",
    `我更愿意把 ${topic} 看成一种被错认的生活结构，而不只是一个地图标签。${citations}`,
    "",
    `${writingMoves?.signatureLine ?? `${topic} 不是一个板块，而是几种生活路径挤在一起。`} ${citations}`,
    "",
    `先把场景放进来。${writingMoves?.characterScene ?? `你可以想象一个首改家庭，早高峰从地铁口出来，第一眼看到的不是宣传图里的界面，而是真正的通勤和生活顺手度。`} ${citations}`,
    "",
    ...sections.map((section) => {
      const preferredEvidenceIds = section.mustUseEvidenceIds?.length ? section.mustUseEvidenceIds : section.evidenceIds;
      const citationSuffix = preferredEvidenceIds.map((id) => `[SC:${id}]`).join(" ") || citations;
      return `## ${section.heading}\n主判断：${section.sectionThesis || section.purpose}。唯一动作：${section.singlePurpose || section.move}。必须落地：${section.mustLandDetail || section.expectedTakeaway}。场景/代价：${section.sceneOrCost || "待作者补"}。动作：${section.move}。打破：${section.break}。承接：${section.bridge}。承接目标：${section.transitionTarget || "待补"}。反面理解：${section.counterPoint || "待补"}。风格目标：${section.styleObjective}。重点：${section.keyPoints.join("，")}。${section.expectedTakeaway} ${citationSuffix}`;
    }),
    "",
    `${writingMoves?.culturalLift ?? `把 ${topic} 放到更大的上海结构里看，它成立与否从来不只是一个板块自己的事。`} ${citations}`,
    "",
    `${writingMoves?.costSense ?? `${topic} 最终成立与否，还是要回到具体片区、具体门槛和具体代价上。`} ${citations}`,
    "",
    writingMoves?.echoLine ?? outlineDraft?.closing ?? `${topic} 最终成立与否，还是要回到具体片区、具体门槛和具体代价上。`,
  ].join("\n\n");

  return {
    narrativeMarkdown,
  };
}

function mockQualityReviewer(deterministicReview: ReviewReport | null | undefined): ReviewReport {
  if (!deterministicReview) {
    return {
      overallVerdict: "缺少基础质检结果，暂时无法形成完整判断。",
      completionScore: 40,
      globalScore: 40,
      checks: [],
      sectionScores: [],
      paragraphFlags: [],
      rewriteIntents: [],
      revisionSuggestions: ["先运行确定性质检。"],
      preservedPatterns: [],
      missingPatterns: ["反常识开头", "抓手式命名"],
    };
  }

  return {
    ...deterministicReview,
    overallVerdict: `${deterministicReview.overallVerdict} 目前使用的是 mock 评审，可在接入真实模型后提升质检颗粒度。`,
    revisionSuggestions: Array.from(new Set([...deterministicReview.revisionSuggestions, "把最强的一句话判断再往前提一层。"])),
    preservedPatterns: Array.from(new Set([...deterministicReview.preservedPatterns, "板块拆解节奏"])),
  };
}

export function summariseSourceCards(sourceCards: SourceCard[]): string {
  return sourceCards.map((card) => `${card.id} | ${card.title} | ${truncate(card.summary, 80)}`).join("\n");
}

export function buildNarrativePreview(markdown: string): string {
  return truncate(firstNonEmptyLine(markdown), 120);
}

function mockPublishPrep(topic: string, finalMarkdown: string): PublishPackage {
  const body = finalMarkdown.trim() || `# ${topic}\n\n正文待补。`;
  return {
    titleOptions: [
      { title: `${topic}，真正的问题不在标签，在结构`, rationale: "主打反常识判断。", isPrimary: true },
      { title: `${topic} 为什么总被看错`, rationale: "主打误解纠偏。", isPrimary: false },
      { title: `${topic}，你买的可能不是一个板块，而是几个世界`, rationale: "主打片区差异。", isPrimary: false },
    ],
    summary: `这篇不是在重复板块标签，而是拆开 ${topic} 的空间骨架、供地节奏和片区差异，告诉读者到底哪里容易看错、对谁成立。`,
    finalMarkdown: body,
    imageCues: [
      {
        id: "img-1",
        placement: "开头主判断段后",
        purpose: "让读者快速建立板块位置感",
        brief: "一张板块总图，标出塘桥、陆家嘴方向、主切割线和核心片区边界",
        imageType: "地图",
        layout: "单张全宽",
        context: "放在开头主判断后，让读者先知道这篇文章在讲哪个空间结构问题",
        captionGoal: "解释塘桥为什么离核心近，却没有自然承接红利",
      },
      {
        id: "img-2",
        placement: "空间骨架段后",
        purpose: "解释板块为什么不是一个整体",
        brief: "一张示意图，突出浦建路、杨高南路、河道和老旧存量如何切开片区",
        imageType: "示意图",
        layout: "单张全宽",
        context: "紧跟空间骨架判断段，帮助读者把抽象结构判断具体化",
        captionGoal: "说明主要切割线如何影响片区连通性和价值传导",
      },
      {
        id: "img-3",
        placement: "片区差异拆解开始后",
        purpose: "帮助读者快速比较不同片区的城市界面和居住感受",
        brief: "两张对比图，分别表现老北片区与次新项目区的界面、楼龄和生活感受差异",
        imageType: "现场照片",
        layout: "左右双图",
        context: "放在片区拆解段开始后，避免片区差异只停留在文字层面",
        captionGoal: "让读者一眼看懂“同属塘桥但像两个世界”",
      },
      {
        id: "img-4",
        placement: "供地与更新节奏段后",
        purpose: "把规划和兑现之间的时间差讲清楚",
        brief: "一张时间线图，标出规划节点、旧改推进、已落地项目和停滞阶段",
        imageType: "时间线",
        layout: "图文卡片",
        context: "放在供地/更新判断后，用时间证据压实“规划好但涨不动”",
        captionGoal: "说明关键节点很多，但真正落地节奏一直偏慢",
      },
      {
        id: "img-5",
        placement: "通勤便利度判断段后",
        purpose: "拆开“地图上近”和“真实好用”之间的差别",
        brief: "一张通勤示意图，对比地图距离、步行连接和真实到达效率",
        imageType: "数据图卡",
        layout: "上下双图",
        context: "放在讲便利度误判的段落后，让读者停止用直线距离判断价值",
        captionGoal: "说明位置近不等于功能连接强",
      },
      {
        id: "img-6",
        placement: "结尾回环段前",
        purpose: "在收束前帮读者重新整理整篇判断链",
        brief: "一张关系图，把夹心层、切割线、老旧存量、更新节奏四个因素压缩到一张图里",
        imageType: "信息图",
        layout: "单张全宽",
        context: "放在结尾回环前，让读者带着一张结构图离开文章",
        captionGoal: "总结塘桥为什么不涨的完整解释链条",
      },
    ],
    publishChecklist: [
      "确认标题是否兑现 Hook",
      "确认正文里至少有一个抓手式命名",
      "确认所有关键判断都有资料来源支撑",
      "确认配图位不是装饰，而是服务理解",
    ],
  };
}

function mockPublishSummary(topic: string, finalMarkdown: string): string {
  const body = finalMarkdown.trim();
  const preview = body ? truncate(body.replace(/[#*\[\]]/g, " ").replace(/\s+/g, " "), 90) : "";
  return `${topic} 最容易被看错的，从来不是表面标签。真正把它压住的，是结构、节奏和片区差异。${preview ? ` 你往下看，会发现问题并不在你第一眼以为的地方。` : ""}`;
}

function normaliseMarkdownResponse(content: string): string {
  const fencedMarkdown = content.match(/```(?:markdown|md)?\s*([\s\S]*?)```/i)?.[1];
  if (fencedMarkdown) {
    return fencedMarkdown.trim();
  }

  const fencedJson = content.match(/```json\s*([\s\S]*?)```/i)?.[1];
  if (fencedJson) {
    try {
      const parsed = JSON.parse(fencedJson) as { narrativeMarkdown?: string };
      if (parsed.narrativeMarkdown?.trim()) {
        return parsed.narrativeMarkdown.trim();
      }
    } catch {
      // ignore and fall through to raw content
    }
  }

  const directJson = content.trim();
  if (directJson.startsWith("{") && directJson.endsWith("}")) {
    try {
      const parsed = JSON.parse(directJson) as { narrativeMarkdown?: string };
      if (parsed.narrativeMarkdown?.trim()) {
        return parsed.narrativeMarkdown.trim();
      }
    } catch {
      // ignore and fall through to raw content
    }
  }

  return content.trim();
}
