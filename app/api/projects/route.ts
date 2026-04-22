import { fail, ok } from "@/lib/api";
import { buildCardsFromLegacy, deriveLegacyFrames } from "@/lib/author-cards";
import { runStructuredTask } from "@/lib/llm";
import { buildStyleReference, createProject, listProjects } from "@/lib/repository";
import type { ArticleProject, TopicJudgeResult } from "@/lib/types";
import { createId, nowIso, toNumber } from "@/lib/utils";
import { buildDefaultWritingMoves } from "@/lib/writing-moves";

export async function GET() {
  return ok({ projects: listProjects() });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      topic?: string;
      audience?: string;
      targetWords?: number;
      notes?: string;
      sampleDigest?: string;
      articleType?: ArticleProject["articleType"];
      thesis?: string;
      coreQuestion?: string;
      thinkCard?: ArticleProject["thinkCard"];
      styleCore?: ArticleProject["styleCore"];
      vitalityCheck?: ArticleProject["vitalityCheck"];
      hkrr?: ArticleProject["hkrr"];
      hamd?: ArticleProject["hamd"];
      writingMoves?: ArticleProject["writingMoves"];
    };

    if (!body.topic?.trim()) {
      return fail("创建项目时必须填写选题。");
    }

    const topicJudge =
      body.articleType && body.thesis && body.coreQuestion && (body.thinkCard || (body.hkrr && body.hamd))
        ? {
            articleType: body.articleType,
            thesis: body.thesis,
            coreQuestion: body.coreQuestion,
            rationale: body.notes?.trim() || "从选题共创结果直接创建。",
            thinkCard: body.thinkCard,
            styleCore: body.styleCore,
            hkrr: body.hkrr,
            hamd: body.hamd,
            writingMoves:
              body.writingMoves ??
              buildDefaultWritingMoves({
                topic: body.topic.trim(),
                articleType: body.articleType,
                thesis: body.thesis,
              }),
          }
        : await runStructuredTask<TopicJudgeResult>("think_card", {
            topic: body.topic.trim(),
            audience: body.audience?.trim() || "关注上海板块和买房决策的读者",
            targetWords: toNumber(body.targetWords, 2400),
            sampleDigest: body.sampleDigest,
            styleReference: buildStyleReference(body.topic.trim(), null),
          });

    const cards = buildCardsFromLegacy({
      topic: body.topic.trim(),
      articleType: topicJudge.articleType,
      audience: body.audience?.trim() || "关注上海板块和买房决策的读者",
      thesis: topicJudge.thesis,
      notes: body.notes?.trim() || topicJudge.rationale,
      hkrr: topicJudge.hkrr,
      hamd: topicJudge.hamd,
      writingMoves: topicJudge.writingMoves,
      thinkCard: body.thinkCard ?? topicJudge.thinkCard,
      styleCore: body.styleCore ?? topicJudge.styleCore,
      vitalityCheck: body.vitalityCheck,
    });

    const compatibility = deriveLegacyFrames({
      topic: body.topic.trim(),
      articleType: topicJudge.articleType,
      thesis: topicJudge.thesis,
      thinkCard: cards.thinkCard,
      styleCore: cards.styleCore,
      currentHAMD: topicJudge.hamd,
      currentWritingMoves: topicJudge.writingMoves,
    });

    const timestamp = nowIso();
    const project: ArticleProject = {
      id: createId("proj"),
      topic: body.topic.trim(),
      audience: body.audience?.trim() || "关注上海板块和买房决策的读者",
      articleType: topicJudge.articleType,
      stage: "ThinkCard / HKR",
      thesis: topicJudge.thesis,
      coreQuestion: topicJudge.coreQuestion,
      targetWords: toNumber(body.targetWords, 2400),
      notes: body.notes?.trim() || topicJudge.rationale,
      thinkCard: cards.thinkCard,
      styleCore: cards.styleCore,
      vitalityCheck: cards.vitalityCheck,
      hkrr: compatibility.hkrr,
      hamd: compatibility.hamd,
      writingMoves: compatibility.writingMoves,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    return ok({ project: createProject(project) }, { status: 201 });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "创建项目失败。", 500);
  }
}
