import type { ArticleProject, ProjectIntent } from "@/lib/types";

type ProjectIntentSource = Partial<ArticleProject> & {
  topic?: string;
  thesis?: string;
  coreQuestion?: string;
};

const MAX_TITLE_LENGTH = 28;
const MAX_QUESTION_LENGTH = 90;
const MAX_THESIS_LENGTH = 120;
const MAX_PAYOFF_LENGTH = 100;
const GENERATED_SEPARATOR_RE = /[|｜\n]+/;
const GENERATED_SEPARATORS = /[|｜\n]+/g;
const LABEL_PREFIX_RE =
  /^(标题|题目|选题|角度|候选角度|核心问题|问题|主命题|主判断|核心判断|结论|读者价值|读者收益|readerValue|coreJudgement|title|thesis|question)\s*[:：-]\s*/i;
const INTERNAL_LABEL_RE =
  /(selectedAngleTitle|candidateAngle|candidateAngles|recommendedNextStep|articlePrototype|targetReaderPersona|creativeAnchor|whyNow|readerLens|signalRefs|riskOfMisfire|neededEvidence|coreJudgement|readerValue)/i;
const QUESTION_RE = /(为什么|怎么|如何|是否|能不能|该不该|值不值|高估|低估|还能不能|吗|？|\?)/;
const THESIS_SIGNAL_RE = /(不是|而是|但|但是|支撑|代价|上限|风险|意味着|真正|核心|判断|结论|值得|不值得|泡沫)/;

export function normalizeProjectIntent(project: ProjectIntentSource): ProjectIntent {
  const forbiddenInternalPhrases = buildForbiddenInternalPhrases(project);
  const cleanTitle = buildCleanTitle(project, forbiddenInternalPhrases);
  const cleanQuestion = buildCleanQuestion(project, cleanTitle, forbiddenInternalPhrases);
  const cleanThesis = buildCleanThesis(project, cleanTitle, forbiddenInternalPhrases);
  const cleanReaderPayoff = buildCleanReaderPayoff(project, cleanTitle, forbiddenInternalPhrases);

  return {
    cleanTitle,
    cleanQuestion,
    cleanThesis,
    cleanReaderPayoff,
    forbiddenInternalPhrases,
  };
}

function buildForbiddenInternalPhrases(project: ProjectIntentSource) {
  const candidates = [
    project.topicMeta?.selectedAngleTitle,
    project.topic,
    project.coreQuestion,
    project.thesis,
    project.thinkCard?.coreJudgement,
    project.thinkCard?.readerPayoff,
  ];
  const phrases = candidates
    .map((value) => normalizeWhitespace(value ?? ""))
    .filter((value) => value.length >= 36 || looksLikeGeneratedInternalString(value));
  return Array.from(new Set(phrases));
}

function buildCleanTitle(project: ProjectIntentSource, forbiddenInternalPhrases: string[]) {
  const selectedAngle = project.topicMeta?.selectedAngleTitle ?? "";
  const candidates = [
    ...splitGeneratedString(project.topic ?? ""),
    ...splitGeneratedString(selectedAngle),
    project.coreQuestion ?? "",
  ];
  const clean = pickBestSegment(candidates, {
    forbiddenInternalPhrases,
    preferQuestion: true,
    maxLength: MAX_TITLE_LENGTH,
  });
  return ensureQuestionMark(clean || truncateSmart(stripInternalLabels(project.topic ?? selectedAngle) || "未命名选题", MAX_TITLE_LENGTH));
}

function buildCleanQuestion(project: ProjectIntentSource, cleanTitle: string, forbiddenInternalPhrases: string[]) {
  const candidates = [
    ...splitGeneratedString(project.coreQuestion ?? ""),
    ...splitGeneratedString(project.topicMeta?.selectedAngleTitle ?? ""),
    ...splitGeneratedString(project.topic ?? ""),
  ];
  const whyQuestion = candidates.find((item) => /为什么|如何|怎么|是否|能不能|该不该|值不值/.test(stripInternalLabels(item)));
  const clean = cleanSegment(whyQuestion ?? pickBestSegment(candidates, {
    forbiddenInternalPhrases,
    preferQuestion: true,
    maxLength: MAX_QUESTION_LENGTH,
  }), forbiddenInternalPhrases);
  return ensureQuestionMark(truncateSmart(clean || cleanTitle, MAX_QUESTION_LENGTH));
}

function buildCleanThesis(project: ProjectIntentSource, cleanTitle: string, forbiddenInternalPhrases: string[]) {
  const candidates = [
    ...splitGeneratedString(project.thesis ?? ""),
    ...splitGeneratedString(project.thinkCard?.coreJudgement ?? ""),
    ...splitGeneratedString(project.thinkCard?.verdictReason ?? ""),
  ];
  const clean = pickBestSegment(candidates, {
    forbiddenInternalPhrases,
    preferThesis: true,
    maxLength: MAX_THESIS_LENGTH,
  });
  return stripPunctuationChains(
    truncateSmart(clean || `${cleanTitle.replace(/[？?]$/, "")}需要回到事实和读者决策里判断。`, MAX_THESIS_LENGTH),
  );
}

function buildCleanReaderPayoff(project: ProjectIntentSource, cleanTitle: string, forbiddenInternalPhrases: string[]) {
  const candidates = [
    ...splitGeneratedString(project.thinkCard?.readerPayoff ?? ""),
    ...splitGeneratedString(project.thinkCard?.decisionImplication ?? ""),
    ...splitGeneratedString(project.topicMeta?.topicScorecard?.readerValueSummary ?? ""),
  ];
  const clean = pickBestSegment(candidates, {
    forbiddenInternalPhrases,
    maxLength: MAX_PAYOFF_LENGTH,
  });
  return truncateSmart(
    clean || `读者能判断${cleanTitle.replace(/[？?]$/, "")}这件事对自己的选择意味着什么。`,
    MAX_PAYOFF_LENGTH,
  );
}

function pickBestSegment(
  candidates: string[],
  options: {
    forbiddenInternalPhrases: string[];
    preferQuestion?: boolean;
    preferThesis?: boolean;
    maxLength: number;
  },
) {
  const cleaned = candidates
    .map((candidate) => cleanSegment(candidate, options.forbiddenInternalPhrases))
    .filter(Boolean);
  const preferred = cleaned.find((candidate) => {
    if (options.preferQuestion) {
      return QUESTION_RE.test(candidate) && candidate.length <= options.maxLength;
    }
    if (options.preferThesis) {
      return THESIS_SIGNAL_RE.test(candidate) && candidate.length <= options.maxLength;
    }
    return candidate.length <= options.maxLength;
  });
  return truncateSmart(preferred ?? cleaned[0] ?? "", options.maxLength);
}

function splitGeneratedString(value: string) {
  const normalized = normalizeWhitespace(value);
  if (!normalized) {
    return [];
  }
  return normalized
    .replace(/。/g, "。|")
    .replace(/；/g, "；|")
    .replace(GENERATED_SEPARATORS, "|")
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
}

function cleanSegment(value: string, forbiddenInternalPhrases: string[]) {
  let next = stripInternalLabels(value);
  for (const phrase of forbiddenInternalPhrases) {
    if (next === phrase) {
      next = "";
      break;
    }
    next = next.replace(phrase, "");
  }
  return stripPunctuationChains(next);
}

function stripInternalLabels(value: string) {
  return normalizeWhitespace(value)
    .replace(/^["'“”‘’]+|["'“”‘’]+$/g, "")
    .replace(LABEL_PREFIX_RE, "")
    .replace(/\s*(?:=>|->|→)\s*/g, "，")
    .trim();
}

function looksLikeGeneratedInternalString(value: string) {
  return value.length >= 30 && (GENERATED_SEPARATOR_RE.test(value) || INTERNAL_LABEL_RE.test(value) || (value.match(/[：:]/g)?.length ?? 0) >= 2);
}

function stripPunctuationChains(value: string) {
  return normalizeWhitespace(value)
    .replace(/[|｜]+/g, "")
    .replace(/[，,。；;：:、\s-]+$/g, "")
    .replace(/^[，,。；;：:、\s-]+/g, "")
    .replace(/([？?。！!]){2,}/g, "$1")
    .trim();
}

function ensureQuestionMark(value: string) {
  const clean = stripPunctuationChains(value);
  if (!clean) {
    return "这篇文章到底要回答什么？";
  }
  return /[？?]$/.test(clean) ? clean.replace(/\?$/, "？") : `${clean}？`;
}

function truncateSmart(value: string, maxLength: number) {
  const clean = stripPunctuationChains(value);
  if (clean.length <= maxLength) {
    return clean;
  }
  const sentence = clean.split(/[。；;]/).find((item) => item.trim().length > 0 && item.trim().length <= maxLength);
  if (sentence) {
    return stripPunctuationChains(sentence);
  }
  return stripPunctuationChains(`${clean.slice(0, maxLength - 1)}…`);
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}
