import { analyzeEvidenceCoverage } from "@/lib/evidence/coverage";
import type { ProjectBundle, WritingQualityGateItem, WritingQualityGateResult } from "@/lib/types";

function createItem(code: string, title: string, detail: string): WritingQualityGateItem {
  return { code, title, detail };
}

export function buildWritingQualityGate(bundle: ProjectBundle): WritingQualityGateResult {
  const evidence = analyzeEvidenceCoverage(bundle);
  const mustFix: WritingQualityGateItem[] = [];
  const shouldFix: WritingQualityGateItem[] = [];
  const optionalPolish: WritingQualityGateItem[] = [];
  let mode: WritingQualityGateResult["mode"] = "warn-only";

  if (evidence.summary.brokenCitationCount > 0) {
    mustFix.push(createItem("broken_citations", "存在无效引用", `正文里有 ${evidence.summary.brokenCitationCount} 处无效 [SC] 引用，发布前必须修掉。`));
  }

  if (evidence.criticalJudgementAlerts.length > 0) {
    const first = evidence.criticalJudgementAlerts[0];
    mustFix.push(createItem("missing_key_evidence", "关键段缺证据", first.detail));
  }

  const review = bundle.reviewReport;
  if (review) {
    for (const layer of review.qualityPyramid ?? []) {
      if (layer.status === "fail") {
        mode = layer.level === "L1" ? "hard-block" : "soft-block";
      } else if (layer.status === "warn" && mode === "warn-only") {
        mode = "soft-block";
      }
      for (const item of layer.mustFix) {
        mustFix.push(createItem(`pyramid_${layer.level.toLowerCase()}_${mustFix.length + 1}`, `${layer.title} 必修`, item));
      }
      for (const item of layer.shouldFix) {
        shouldFix.push(createItem(`pyramid_${layer.level.toLowerCase()}_${shouldFix.length + 1}`, `${layer.title} 建议优化`, item));
      }
    }

    const rewriteIntents = review.rewriteIntents ?? [];
    const paragraphFlags = review.paragraphFlags ?? [];

    if (rewriteIntents.some((intent) => intent.issueType === "weak_ending_echo")) {
      mustFix.push(createItem("weak_ending_echo", "结尾回环偏弱", "结尾没有真正回扣开头判断，建议先补回环再生成发布包。"));
    }

    if (rewriteIntents.some((intent) => intent.issueType === "generic_language")) {
      shouldFix.push(createItem("generic_language", "仍有泛化表达", "部分段落仍然偏泛、偏长或太像资料堆叠，建议先再修一轮。"));
    }

    if (rewriteIntents.some((intent) => intent.issueType === "missing_cost")) {
      shouldFix.push(createItem("missing_cost", "现实代价不够透", "部分关键段仍缺少门槛、代价或不成立条件。"));
    }

    const hasScenePassed = review.checks.some((check) => check.key === "character-scene" && check.status === "pass");
    if (!hasScenePassed && rewriteIntents.some((intent) => intent.issueType === "missing_scene")) {
      shouldFix.push(createItem("missing_scene", "人物/生活场景偏弱", "正文仍有段落缺少生活场景承接。"));
    }

    if (paragraphFlags.length) {
      optionalPolish.push(
        createItem(
          "paragraph_hotspots",
          "仍有弱段可继续修",
          `当前还定位到 ${paragraphFlags.length} 段弱段，可继续做局部优化。`,
        ),
      );
    }
  }

  if (evidence.summary.orphanSourceCardCount > 0) {
    optionalPolish.push(createItem("orphan_source_cards", "存在未利用资料卡", `当前有 ${evidence.summary.orphanSourceCardCount} 张资料卡还没进入正文或提纲要求。`));
  }

  const overallStatus: WritingQualityGateResult["overallStatus"] =
    mustFix.length > 0 ? "fail" : shouldFix.length > 0 ? "warn" : "pass";

  return {
    mode,
    overallStatus,
    mustFix,
    shouldFix,
    optionalPolish,
  };
}
