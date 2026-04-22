import type { ArticleProject, PublishPackage } from "@/lib/types";
import { truncate } from "@/lib/utils";

export function buildPublishPackage(input: { project: ArticleProject; finalMarkdown: string }): PublishPackage {
  const { project, finalMarkdown } = input;
  const summary = buildSummary(finalMarkdown, project);

  return {
    titleOptions: [
      {
        title: project.hamd.hook || project.styleCore.sentenceBreak || `${project.topic}，真正的问题不在标签，在结构`,
        rationale: "直接兑现 Hook，适合主推。",
        isPrimary: true,
      },
      {
        title: `${project.topic} 为什么总被看错`,
        rationale: "强化误解纠偏感，适合更广泛传播。",
        isPrimary: false,
      },
      {
        title: `${project.topic}，你买的可能不是一个板块，而是几个世界`,
        rationale: "强调片区差异和空间结构。",
        isPrimary: false,
      },
    ],
    summary,
    finalMarkdown: injectImageCues(finalMarkdown),
    imageCues: [
      {
        id: "img-1",
        placement: "开头判断段后",
        purpose: "快速建立板块位置和误解点",
        brief: "一张板块总图，标出核心切割线和主要片区",
        imageType: "地图",
        layout: "单张全宽",
        context: "紧跟主判断段，先把空间关系建立起来",
        captionGoal: "解释板块位置、边界和误解点",
      },
      {
        id: "img-2",
        placement: "空间骨架段后",
        purpose: "帮助读者理解为什么板块不是一个整体",
        brief: "一张示意图，突出高架、河道、轨交和价值断层",
        imageType: "示意图",
        layout: "单张全宽",
        context: "放在空间骨架段后，把抽象结构变成可视化关系",
        captionGoal: "说明切割线如何影响板块连通性和价值传导",
      },
      {
        id: "img-3",
        placement: "供地/未来走势段后",
        purpose: "解释后续兑现节奏和供地结构",
        brief: "一张规划或地块分布图，标出关键变量",
        imageType: "时间线",
        layout: "图文卡片",
        context: "放在供地和未来变量段后，帮助读者理解兑现节奏",
        captionGoal: "说明未来兑现节奏和关键变量",
      },
    ],
    publishChecklist: [
      "确认主标题是否兑现 Hook",
      "确认摘要不是机械摘要，而是导语式摘要",
      "确认正文至少保留一个抓手式命名或断裂句",
      "确认关键判断保留资料引用",
      "确认生命力检查已经过线",
      "确认每个配图位都服务理解，而不是只装饰",
    ],
  };
}

function buildSummary(markdown: string, project: ArticleProject): string {
  const paragraphs = markdown
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .filter((paragraph) => !paragraph.startsWith("#"));

  const first = paragraphs[0] ?? project.thesis;
  const second = paragraphs[1] ?? project.coreQuestion;
  return truncate(`${first} ${second}`, 180);
}

function injectImageCues(markdown: string): string {
  const lines = markdown.split("\n");
  const result: string[] = [];
  let injectedHead = false;
  let injectedStructure = false;
  let injectedSupply = false;

  for (const line of lines) {
    result.push(line);
    if (!injectedHead && line.includes("主判断")) {
      result.push("", "[配图位：板块总图 / 误解点示意]", "");
      injectedHead = true;
      continue;
    }

    if (!injectedStructure && (line.includes("空间骨架") || line.includes("鱼骨") || line.includes("切割"))) {
      result.push("", "[配图位：空间骨架示意图]", "");
      injectedStructure = true;
      continue;
    }

    if (!injectedSupply && (line.includes("供地") || line.includes("供应") || line.includes("未来"))) {
      result.push("", "[配图位：供地 / 未来变量示意图]", "");
      injectedSupply = true;
    }
  }

  return result.join("\n");
}
