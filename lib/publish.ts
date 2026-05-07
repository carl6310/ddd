import type { ArticleProject, PublishPackage } from "@/lib/types";
import { truncate } from "@/lib/utils";

export function buildPublishPackage(input: { project: ArticleProject; finalMarkdown: string }): PublishPackage {
  const { project, finalMarkdown } = input;
  const summary = buildSummary(finalMarkdown, project);
  const titleOptions = buildTitleOptions(project, finalMarkdown);

  return {
    titleOptions,
    summary,
    finalMarkdown: injectImageCues(finalMarkdown),
    imageCues: buildImageCues(),
    publishChecklist: [
      "确认主标题是否兑现 Hook",
      "确认摘要不是机械摘要，而是导语式摘要",
      "确认正文至少保留一个抓手式命名或断裂句",
      "确认关键判断保留资料引用",
      "确认质量检查已经过线",
      "确认每个配图位都服务理解，而不是只装饰",
    ],
  };
}

function buildTitleOptions(project: ArticleProject, markdown: string) {
  const primarySeed = firstUsableTitleSeed([project.hamd.hook, project.styleCore.sentenceBreak, project.writingMoves?.signatureLine]);
  const topic = cleanTopic(project.topic);
  const title = primarySeed || deriveTitleFromMarkdown(markdown, topic) || `${topic}，贵的不是环线，是结构`;

  return [
    {
      title,
      rationale: "直接兑现主判断，适合主推。",
      isPrimary: true,
    },
    {
      title: `${topic}，为什么总被看错`,
      rationale: "强化误解纠偏感，适合更广泛传播。",
      isPrimary: false,
    },
    {
      title: `${topic}，买的不是一圈环线，是一个城市节点`,
      rationale: "强调节点价值和环线误解。",
      isPrimary: false,
    },
  ];
}

function firstUsableTitleSeed(values: Array<string | undefined>) {
  for (const value of values) {
    const cleaned = cleanTitleSeed(value);
    if (cleaned) {
      return cleaned;
    }
  }
  return "";
}

function cleanTitleSeed(value?: string) {
  const text = value?.trim() ?? "";
  if (!text || /^(如|例如|比如)[:：]/.test(text) || text.includes(" 或 ") || text.includes("例如")) {
    return "";
  }
  return text.replace(/[“”‘’]/g, "").replace(/^标题[:：]/, "").trim();
}

function cleanTopic(topic: string) {
  const parts = topic
    .split(/[-_]/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]}：${parts.slice(1).join(" ")}`;
  }
  return topic.replace(/\s+/g, " ").trim() || "这个板块";
}

function deriveTitleFromMarkdown(markdown: string, topic: string) {
  const plain = markdown.replace(/^# .+$/m, "").replace(/\[SC:[^\]]+\]/g, "");
  if (plain.includes("不是一个外环外的反常样本，而是一种更早熟的城市节点")) {
    return `${topic}，不是外环外异类，而是早熟城市节点`;
  }
  if (plain.includes("贵出来的部分不是为故事付费，而是为少一点不确定性付费")) {
    return `${topic}，贵出来的是确定性`;
  }
  if (plain.includes("真正决定价格的，不是它站在哪一圈")) {
    return `${topic}，真正决定价格的不是环线`;
  }
  return "";
}

function buildSummary(markdown: string, project: ArticleProject): string {
  const paragraphs = markdown
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .filter((paragraph) => !paragraph.startsWith("#"));

  const judgement = paragraphs.find((paragraph) => paragraph.includes("真正要问的是")) ?? project.thesis;
  const answer = paragraphs.find((paragraph) => paragraph.includes("贵出来的部分") || paragraph.includes("不是情绪，而是结构")) ?? project.coreQuestion;
  return truncate(`${stripCitationIds(judgement)} ${stripCitationIds(answer)}`.replace(/\s+/g, " ").trim(), 180);
}

function buildImageCues() {
  return [
    {
      id: "img-1",
      placement: "开头判断段后",
      purpose: "快速建立环线误解和节点判断",
      brief: "一张上海西南简图，标出莘庄位于外环外，但承担交通和生活节点功能",
      imageType: "地图",
      layout: "单张全宽",
      context: "紧跟开头主判断，先让读者看到“外环外”和“节点”的冲突",
      captionGoal: "解释为什么不能只用环线判断莘庄",
    },
    {
      id: "img-2",
      placement: "城市节点段后",
      purpose: "展示交通、商业、学校、行政资源叠加",
      brief: "四象限或放射图：轨交换乘、快速路、商业、学校/行政资源共同支撑成熟度",
      imageType: "结构图",
      layout: "图文卡片",
      context: "放在“不是睡城，而是城市节点”段落之后",
      captionGoal: "说明莘庄贵的是成熟资源密度",
    },
    {
      id: "img-3",
      placement: "内部价差段后",
      purpose: "解释莘庄内部不是均质高价",
      brief: "一张内部阶梯图：南北广场、老小区、次新、外围大盘的产品和体感差异",
      imageType: "阶梯图",
      layout: "单张全宽",
      context: "放在“一平米差两万”段落之后",
      captionGoal: "说明高价只集中在资源可及性更强的位置",
    },
    {
      id: "img-4",
      placement: "成熟代价段后",
      purpose: "把确定性和代价并列展示",
      brief: "左右对照卡：确定性包括交通和生活成熟，代价包括高密度、拥堵、产品老化、内部切割",
      imageType: "对照卡",
      layout: "图文卡片",
      context: "放在结尾判断前，帮助读者做取舍",
      captionGoal: "提醒读者莘庄不是完美答案，而是确定性和代价的交换",
    },
  ];
}

function stripCitationIds(text: string) {
  return text.replace(/\[SC:[^\]]+\]/g, "").trim();
}

function injectImageCues(markdown: string): string {
  const paragraphs = markdown.split(/\n\s*\n/);
  const result: string[] = [];
  let injectedHead = false;
  let injectedNode = false;
  let injectedSplit = false;
  let injectedCost = false;

  for (const paragraph of paragraphs) {
    result.push(paragraph);
    if (!injectedHead && paragraph.includes("真正要问的是")) {
      result.push("[配图位：环线误解 / 节点总图]");
      injectedHead = true;
      continue;
    }

    if (!injectedNode && paragraph.includes("不是睡城，而是城市节点")) {
      result.push("[配图位：交通与生活资源叠加图]");
      injectedNode = true;
      continue;
    }

    if (!injectedSplit && paragraph.includes("同板块内，每平米差2万")) {
      result.push("[配图位：内部产品与价格阶梯图]");
      injectedSplit = true;
      continue;
    }

    if (!injectedCost && paragraph.includes("成熟的代价")) {
      result.push("[配图位：确定性与代价对照卡]");
      injectedCost = true;
    }
  }

  return result.join("\n\n");
}
