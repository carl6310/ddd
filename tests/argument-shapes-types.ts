import type { ArgumentFrame, OutlineDraft } from "@/lib/types";

const baseSection = {
  id: "section-1",
  heading: "判断先行",
  purpose: "回答标题问题",
  sectionThesis: "不是简单高估。",
  singlePurpose: "先给答案",
  mustLandDetail: "价格支撑和风险边界。",
  sceneOrCost: "",
  mainlineSentence: "回到判断本身。",
  callbackTarget: "",
  microStoryNeed: "",
  discoveryTurn: "",
  opposingView: "",
  readerUsefulness: "读者知道如何判断。",
  evidenceIds: [],
  mustUseEvidenceIds: [],
  tone: "",
  move: "",
  break: "",
  bridge: "",
  transitionTarget: "",
  counterPoint: "",
  styleObjective: "",
  keyPoints: [],
  expectedTakeaway: "形成条件化判断。",
};

export const outlineWithoutArgumentFrame: OutlineDraft = {
  hook: "先回答问题。",
  sections: [baseSection],
  closing: "回到读者决策。",
};

export const milestoneArgumentFrame: ArgumentFrame = {
  primaryShape: "judgement_essay",
  secondaryShapes: ["risk_decomposition", "tradeoff_decision"],
  centralTension: "价格支撑和安全边际之间的张力。",
  answer: "不是简单高估，但安全边际不厚。",
  notThis: ["不要写成片区导览", "不要让每个 zone 自动变成章节"],
  supportingClaims: [
    {
      id: "claim-1",
      claim: "价格支撑来自成熟配套和供应约束。",
      role: "prove",
      evidenceIds: ["sc_1"],
      mustUseEvidenceIds: ["sc_1"],
      zonesAsEvidence: ["北广场"],
      shouldNotBecomeSection: true,
    },
  ],
  strongestCounterArgument: "板块内部差异太大，不能一概而论。",
  howToHandleCounterArgument: "承认差异，并把差异作为判断边界。",
  readerDecisionFrame: "读者按预算、等待周期和风险承受力判断。",
};

export const outlineWithArgumentFrame: OutlineDraft = {
  hook: "先回答问题。",
  sections: [baseSection],
  argumentFrame: milestoneArgumentFrame,
  closing: "回到读者决策。",
};
