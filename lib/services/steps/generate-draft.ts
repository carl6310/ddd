import { runStructuredTask } from "@/lib/llm";
import { buildAnalysisDraft } from "@/lib/markdown";
import { extractMarkdownParagraphs, replaceMarkdownParagraphAt } from "@/lib/markdown-blocks";
import { buildStyleReference, getOutlineDraft, getProject, getSectorModel, listSourceCards, saveArticleDraft, updateProject } from "@/lib/repository";
import { runDeterministicReview } from "@/lib/review";
import { canGenerateDraft } from "@/lib/workflow";
import type { JobExecutionContext } from "@/lib/jobs/types";
import { JobError } from "@/lib/jobs/types";
import type { StructuralRewriteIntent, RewriteIntent } from "@/lib/types";
import type { TaskName } from "@/lib/prompt-engine";

export async function generateDraftStep(input: { projectId: string; forceProceed?: boolean; context: JobExecutionContext }) {
  const { projectId, forceProceed = false, context } = input;

  context.setProgress("loading_bundle", "正在读取项目材料。");
  const project = getProject(projectId);
  if (!project) {
    throw new JobError("project_missing", "项目不存在。");
  }

  const gate = canGenerateDraft(project, forceProceed);
  if (!gate.ok) {
    throw new JobError("gate_failed", gate.gate.message);
  }

  const sourceCards = listSourceCards(projectId);
  if (sourceCards.length === 0) {
    throw new JobError("missing_sources", "无资料卡时，系统禁止直接生成正式初稿。");
  }

  const sectorModel = getSectorModel(projectId);
  const outlineDraft = getOutlineDraft(projectId);
  if (!sectorModel || !outlineDraft) {
    throw new JobError("missing_prerequisites", "请先完成板块建模和提纲生成。");
  }
  context.log("info", "bundle_loaded", "已读取 ProjectBundle。", {
    sourceCardCount: sourceCards.length,
    outlineSectionCount: outlineDraft.sections.length,
  });

  context.setProgress("calling_llm", "正在生成正文。");
  const generatedDraft = await runStructuredTask<{ narrativeMarkdown: string }>(
    "draft_writer",
    {
      project,
      sourceCards,
      sectorModel,
      outlineDraft,
      styleReference: buildStyleReference(project.topic, project.articleType),
    },
    {
      audit: {
        jobId: context.job.id,
        projectId,
      },
    },
  );
  context.log("info", "llm_call_finished", "正文生成完成。", { task: "draft_writer" });

  let finalNarrativeMarkdown = stitchNarrativeFlow(
    normalizeCitationIds(generatedDraft.narrativeMarkdown, sourceCards),
    outlineDraft,
    project.thesis,
    project.hamd.anchor,
  );

  for (let attempt = 0; attempt < 2; attempt += 1) {
    let review = runDeterministicReview({
      articleType: project.articleType,
      thesis: project.thesis,
      hkrr: project.hkrr,
      hamd: project.hamd,
      writingMoves: project.writingMoves,
      outlineDraft,
      sectorModel,
      articleDraft: {
        analysisMarkdown: "",
        narrativeMarkdown: finalNarrativeMarkdown,
        editedMarkdown: "",
      },
      sourceCards,
    });

    const structuralRewriteCandidates = review.structuralRewriteIntents?.slice(0, 1) ?? [];
    if (structuralRewriteCandidates.length > 0) {
      context.setProgress("calling_llm", `正在结构性重写，第 ${attempt + 1} 轮。`);
      finalNarrativeMarkdown = await applyStructuralRewritePipeline({
        markdown: finalNarrativeMarkdown,
        intents: structuralRewriteCandidates,
        project,
        sourceCards,
        sectorModel,
        outlineDraft,
        review,
        context,
      });
      review = runDeterministicReview({
        articleType: project.articleType,
        thesis: project.thesis,
        hkrr: project.hkrr,
        hamd: project.hamd,
        writingMoves: project.writingMoves,
        outlineDraft,
        sectorModel,
        articleDraft: {
          analysisMarkdown: "",
          narrativeMarkdown: finalNarrativeMarkdown,
          editedMarkdown: "",
        },
        sourceCards,
      });
    } else if (review.rewriteIntents.length > 0) {
      const rewriteCandidates = review.rewriteIntents.slice(0, 4);
      context.setProgress("calling_llm", `正在定点修段，第 ${attempt + 1} 轮。`);
      finalNarrativeMarkdown = await applyRewriteIntentPipeline({
        markdown: finalNarrativeMarkdown,
        intents: rewriteCandidates,
        project,
        sourceCards,
        sectorModel,
        outlineDraft,
        review,
        context,
      });
      review = runDeterministicReview({
        articleType: project.articleType,
        thesis: project.thesis,
        hkrr: project.hkrr,
        hamd: project.hamd,
        writingMoves: project.writingMoves,
        outlineDraft,
        sectorModel,
        articleDraft: {
          analysisMarkdown: "",
          narrativeMarkdown: finalNarrativeMarkdown,
          editedMarkdown: "",
        },
        sourceCards,
      });
    }

    const shouldPolish = review.checks.some(
      (check) =>
        [
          "article-type-specialized",
          "opening",
          "hook",
          "anchor",
          "echo",
          "transitions",
          "emotional-arc",
          "paragraph-transitions",
          "reading-rhythm",
          "paragraph-weight",
          "emotional-progression",
          "citations",
        ].includes(check.key) && check.status !== "pass",
    );

    if (!shouldPolish) {
      break;
    }

    context.setProgress("calling_llm", `正在优化正文，第 ${attempt + 1} 轮。`);
    const polishedDraft = await runStructuredTask<{ narrativeMarkdown: string }>(
      "draft_polisher",
      {
        project,
        sourceCards,
        sectorModel,
        outlineDraft,
        narrativeMarkdown: finalNarrativeMarkdown,
        deterministicReview: review,
        styleReference: buildStyleReference(project.topic, project.articleType),
      },
      {
        audit: {
          jobId: context.job.id,
          projectId,
        },
      },
    );
    context.log("info", "llm_call_finished", "正文优化完成。", {
      task: "draft_polisher",
      attempt: attempt + 1,
    });

    finalNarrativeMarkdown = stitchNarrativeFlow(
      normalizeCitationIds(polishedDraft.narrativeMarkdown, sourceCards),
      outlineDraft,
      project.thesis,
      project.hamd.anchor,
    );
  }

  context.setProgress("saving_result", "正在保存正文结果。");
  saveArticleDraft(projectId, {
    analysisMarkdown: buildAnalysisDraft({
      project,
      sectorModel,
      outlineDraft,
      sourceCards,
    }),
    narrativeMarkdown: finalNarrativeMarkdown,
    editedMarkdown: "",
  });
  updateProject(projectId, { stage: "正文生成" });
  context.log("info", "result_saved", "正文结果已保存。");
}

async function applyRewriteIntentPipeline(input: {
  markdown: string;
  intents: RewriteIntent[];
  project: NonNullable<ReturnType<typeof getProject>>;
  sourceCards: ReturnType<typeof listSourceCards>;
  sectorModel: NonNullable<ReturnType<typeof getSectorModel>>;
  outlineDraft: NonNullable<ReturnType<typeof getOutlineDraft>>;
  review: ReturnType<typeof runDeterministicReview>;
  context: JobExecutionContext;
}) {
  let nextMarkdown = input.markdown;

  for (const intent of input.intents) {
    const target = resolveRewriteTarget(nextMarkdown, intent);
    if (!target) {
      input.context.log("warn", "rewrite_target_missing", "未找到可重写的目标段落。", { targetRange: intent.targetRange });
      continue;
    }

    const task = mapRewriteTask(intent.issueType);
    const rewritten = await runStructuredTask<{ narrativeMarkdown: string }>(
      task,
      {
        project: input.project,
        sourceCards: input.sourceCards,
        sectorModel: input.sectorModel,
        outlineDraft: input.outlineDraft,
        narrativeMarkdown: nextMarkdown,
        deterministicReview: input.review,
        styleReference: buildStyleReference(input.project.topic, input.project.articleType),
        sectionHeading: target.sectionHeading ?? undefined,
        paragraphIndex: target.paragraphIndex,
        paragraphText: target.paragraphText,
        rewriteIntent: intent,
      },
      {
        audit: {
          jobId: input.context.job.id,
          projectId: input.project.id,
          promptVersion: `${task}:v1`,
        },
      },
    );

    nextMarkdown = replaceMarkdownParagraphAt(nextMarkdown, target.paragraphIndex, rewritten.narrativeMarkdown.trim());
    input.context.log("info", "llm_call_finished", "定点修段完成。", {
      task,
      targetRange: intent.targetRange,
      issueType: intent.issueType,
    });
  }

  return stitchNarrativeFlow(
    normalizeCitationIds(nextMarkdown, input.sourceCards),
    input.outlineDraft,
    input.project.thesis,
    input.project.hamd.anchor,
  );
}

async function applyStructuralRewritePipeline(input: {
  markdown: string;
  intents: StructuralRewriteIntent[];
  project: NonNullable<ReturnType<typeof getProject>>;
  sourceCards: ReturnType<typeof listSourceCards>;
  sectorModel: NonNullable<ReturnType<typeof getSectorModel>>;
  outlineDraft: NonNullable<ReturnType<typeof getOutlineDraft>>;
  review: ReturnType<typeof runDeterministicReview>;
  context: JobExecutionContext;
}) {
  let nextMarkdown = input.markdown;

  for (const intent of input.intents) {
    const rewritten = await runStructuredTask<{ narrativeMarkdown: string }>(
      "structural_rewriter",
      {
        project: input.project,
        sourceCards: input.sourceCards,
        sectorModel: input.sectorModel,
        outlineDraft: input.outlineDraft,
        narrativeMarkdown: nextMarkdown,
        deterministicReview: input.review,
        structuralRewriteIntent: intent,
        styleReference: buildStyleReference(input.project.topic, input.project.articleType),
      },
      {
        audit: {
          jobId: input.context.job.id,
          projectId: input.project.id,
          promptVersion: "structural_rewriter:v1",
        },
      },
    );

    nextMarkdown = rewritten.narrativeMarkdown.trim() || nextMarkdown;
    input.context.log("info", "llm_call_finished", "结构性重写完成。", {
      task: "structural_rewriter",
      issueTypes: intent.issueTypes,
      affectedSectionIds: intent.affectedSectionIds,
    });
  }

  return stitchNarrativeFlow(
    normalizeCitationIds(nextMarkdown, input.sourceCards),
    input.outlineDraft,
    input.project.thesis,
    input.project.hamd.anchor,
  );
}

function mapRewriteTask(issueType: RewriteIntent["issueType"]): TaskName {
  switch (issueType) {
    case "weak_opening":
      return "opening_rewriter";
    case "missing_anchor":
      return "opening_rewriter";
    case "weak_transition":
      return "transition_rewriter";
    case "evidence_not_integrated":
      return "evidence_weaver";
    case "generic_language":
      return "anti_cliche_rewriter";
    case "missing_scene":
      return "scene_inserter";
    case "missing_cost":
      return "cost_sharpener";
    case "weak_ending_echo":
      return "ending_echo_rewriter";
  }
}

function resolveRewriteTarget(markdown: string, intent: RewriteIntent) {
  const paragraphMatch = intent.targetRange.match(/paragraph:(\d+)/);
  const paragraphIndex = paragraphMatch ? Math.max(0, Number(paragraphMatch[1]) - 1) : 0;
  const paragraphs = extractMarkdownParagraphs(markdown);
  const paragraphText = paragraphs[paragraphIndex];
  if (!paragraphText) {
    return null;
  }
  const sectionMatch = intent.targetRange.match(/section:([^#]+)/);
  return {
    paragraphIndex,
    paragraphText,
    sectionHeading: sectionMatch?.[1] ?? null,
  };
}

function normalizeCitationIds(markdown: string, sourceCards: Array<{ id: string }>) {
  if (!markdown.trim()) {
    return markdown;
  }

  const exactIds = new Set(sourceCards.map((card) => card.id));
  const suffixToId = new Map<string, string>();
  for (const card of sourceCards) {
    const suffix = card.id.replace(/^sc_/, "");
    if (!suffixToId.has(suffix)) {
      suffixToId.set(suffix, card.id);
    }
  }

  return markdown.replace(/\[SC:([a-zA-Z0-9_-]+)\]/g, (_match, rawId: string) => {
    if (exactIds.has(rawId)) {
      return `[SC:${rawId}]`;
    }

    const normalized = rawId.replace(/^sc_/, "");
    const resolved = suffixToId.get(normalized);
    return resolved ? `[SC:${resolved}]` : `[SC:${rawId}]`;
  });
}

export function stitchNarrativeFlow(
  markdown: string,
  outlineDraft: { sections: Array<{ heading: string; bridge: string }>; closing: string; continuityLedger?: unknown },
  thesis: string,
  anchor: string,
) {
  if (outlineDraft.continuityLedger) {
    return safelyFormatNarrativeMarkdown(markdown);
  }

  const lines = markdown.split("\n");
  const rewritten: string[] = [];

  for (const line of lines) {
    if (line.startsWith("## ")) {
      const heading = line.replace(/^##\s+/, "").trim();
      const sectionIndex = outlineDraft.sections.findIndex((section) => section.heading === heading);
      if (sectionIndex > 0) {
        const bridge = naturalizeBridge(outlineDraft.sections[sectionIndex - 1]?.bridge ?? "", sectionIndex);
        const lastMeaningful = [...rewritten].reverse().find((item) => item.trim());
        if (bridge && lastMeaningful !== bridge) {
          if (rewritten.at(-1)?.trim()) {
            rewritten.push("");
          }
          rewritten.push(bridge, "");
        }
      }
    }

    rewritten.push(line);
  }

  const nextMarkdown = safelyFormatNarrativeMarkdown(rewritten.join("\n"));
  const paragraphs = extractMarkdownParagraphs(nextMarkdown);
  const lastParagraph = paragraphs.at(-1) ?? "";
  const anchorSeed = (anchor || thesis).trim().slice(0, Math.min(16, (anchor || thesis).trim().length));

  if (anchorSeed && !lastParagraph.includes(anchorSeed)) {
    return `${nextMarkdown}\n\n回到开头，${thesis}`;
  }

  return nextMarkdown;
}

function naturalizeBridge(bridge: string, index: number) {
  const cleaned = bridge
    .replace(/^引出问题[:：]\s*/, "")
    .replace(/^直接导向/, "")
    .replace(/^自然过渡到/, "")
    .trim();

  if (!cleaned) {
    return "";
  }

  const prefix = index === 1 ? "问题在于，" : "再往下看，";
  const sentence = /^(问题在于|再往下看|回到|但)/.test(cleaned) ? cleaned : `${prefix}${cleaned}`;
  return /[。！？]$/.test(sentence) ? sentence : `${sentence}。`;
}

function safelyFormatNarrativeMarkdown(markdown: string) {
  return markdown.replace(/[ \t]+$/gm, "").replace(/\n{4,}/g, "\n\n\n").trim();
}
