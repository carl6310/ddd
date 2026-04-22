import type {
  ArticleDraft,
  ArticleProject,
  ArticleType,
  HAMDFrame,
  HKRRFrame,
  OutlineDraft,
  ProjectBundle,
  PublishPackage,
  ResearchBrief,
  ReviewReport,
  SampleArticle,
  EditorialFeedbackEvent,
  SourceClaimType,
  SectorModel,
  SourceCard,
  SourceSupportLevel,
  SourceTimeSensitivity,
  SourceType,
  ThinkCard,
  StyleCore,
  VitalityCheck,
} from "@/lib/types";
import { getDb } from "@/lib/db";
import { nowIso, parseJson, stringifyJson, toNumber } from "@/lib/utils";
import { buildDefaultWritingMoves } from "@/lib/writing-moves";
import { buildCardsFromLegacy, defaultVitalityCheck, deriveLegacyFrames } from "@/lib/author-cards";
import { buildSampleActionAssets, buildStyleActionReference, type SampleActionAssetRecord } from "@/lib/style-assets/registry";

function defaultHKRR(): HKRRFrame {
  return {
    happy: "",
    knowledge: "",
    resonance: "",
    rhythm: "",
    summary: "",
  };
}

function defaultHAMD(): HAMDFrame {
  return {
    hook: "",
    anchor: "",
    mindMap: [],
    different: "",
  };
}

function normalizeOutlineDraft(outline: OutlineDraft): OutlineDraft {
  return {
    hook: outline.hook ?? "",
    closing: outline.closing ?? "",
    sections: (outline.sections ?? []).map((section, index) => ({
      id: section.id || `section-${index + 1}`,
      heading: section.heading ?? "",
      purpose: section.purpose ?? "",
      sectionThesis: section.sectionThesis ?? "",
      singlePurpose: section.singlePurpose ?? "",
      mustLandDetail: section.mustLandDetail ?? "",
      sceneOrCost: section.sceneOrCost ?? "",
      evidenceIds: section.evidenceIds ?? [],
      mustUseEvidenceIds: section.mustUseEvidenceIds ?? [],
      tone: section.tone ?? "",
      move: section.move ?? "",
      break: section.break ?? "",
      bridge: section.bridge ?? "",
      transitionTarget: section.transitionTarget ?? "",
      counterPoint: section.counterPoint ?? "",
      styleObjective: section.styleObjective ?? "",
      keyPoints: section.keyPoints ?? [],
      expectedTakeaway: section.expectedTakeaway ?? "",
    })),
  };
}

function mapProject(row: Record<string, unknown>): ArticleProject {
  const articleType = String(row.article_type) as ArticleProject["articleType"];
  const topic = String(row.topic);
  const thesis = String(row.thesis);
  const hkrr = parseJson<HKRRFrame>(String(row.hkrr_json ?? "{}"), defaultHKRR());
  const hamd = parseJson<HAMDFrame>(String(row.hamd_json ?? "{}"), defaultHAMD());
  const writingMoves = parseJson(
    String(row.writing_moves_json ?? "{}"),
    buildDefaultWritingMoves({
      topic,
      articleType,
      thesis,
    }),
  );
  const cards = buildCardsFromLegacy({
    topic,
    articleType,
    audience: String(row.audience),
    thesis,
    notes: String(row.notes),
    hkrr,
    hamd,
    writingMoves,
    thinkCard: parseJson<Partial<ThinkCard>>(String(row.think_card_json ?? "{}"), {}),
    styleCore: parseJson<Partial<StyleCore>>(String(row.style_core_json ?? "{}"), {}),
    vitalityCheck: parseJson<VitalityCheck>(String(row.vitality_check_json ?? "{}"), defaultVitalityCheck()),
  });
  return {
    id: String(row.id),
    topic,
    audience: String(row.audience),
    articleType,
    stage: mapProjectStage(String(row.stage)),
    thesis,
    coreQuestion: String(row.core_question),
    targetWords: toNumber(row.target_words, 2400),
    notes: String(row.notes),
    thinkCard: cards.thinkCard,
    styleCore: cards.styleCore,
    vitalityCheck: cards.vitalityCheck,
    hkrr,
    hamd,
    writingMoves,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapProjectStage(stage: string): ArticleProject["stage"] {
  if (stage === "初稿与质检") {
    return "正文生成";
  }
  if (stage === "HKRR / HAMD 开题卡") {
    return "ThinkCard / HKR";
  }
  if (stage === "质检与发布前整理") {
    return "VitalityCheck";
  }

  return stage as ArticleProject["stage"];
}

function mapSourceCard(row: Record<string, unknown>): SourceCard {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    title: String(row.title),
    url: String(row.url),
    note: String(row.note),
    publishedAt: String(row.published_at),
    summary: String(row.summary),
    evidence: String(row.evidence),
    credibility: String(row.credibility) as SourceCard["credibility"],
    sourceType: String(row.source_type ?? "media") as SourceType,
    supportLevel: String(row.support_level ?? "medium") as SourceSupportLevel,
    claimType: String(row.claim_type ?? "fact") as SourceClaimType,
    timeSensitivity: String(row.time_sensitivity ?? "timely") as SourceTimeSensitivity,
    intendedSection: String(row.intended_section ?? ""),
    reliabilityNote: String(row.reliability_note ?? ""),
    tags: parseJson<string[]>(String(row.tags_json), []),
    zone: String(row.zone),
    rawText: String(row.raw_text),
    createdAt: String(row.created_at),
  };
}

export function listProjects(): ArticleProject[] {
  const db = getDb();
  const statement = db.prepare("SELECT * FROM article_projects ORDER BY updated_at DESC");
  return statement.all().map((row) => mapProject(row as Record<string, unknown>));
}

export function getProject(projectId: string): ArticleProject | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM article_projects WHERE id = ?").get(projectId) as Record<string, unknown> | undefined;
  return row ? mapProject(row) : null;
}

export function createProject(project: ArticleProject): ArticleProject {
  const db = getDb();
  db.prepare(
    `
      INSERT INTO article_projects (
        id, topic, audience, article_type, stage, thesis, core_question, target_words, notes, think_card_json, style_core_json, vitality_check_json, hkrr_json, hamd_json, writing_moves_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
  ).run(
    project.id,
    project.topic,
    project.audience,
    project.articleType,
    project.stage,
    project.thesis,
    project.coreQuestion,
    project.targetWords,
    project.notes,
    stringifyJson(project.thinkCard),
    stringifyJson(project.styleCore),
    stringifyJson(project.vitalityCheck),
    stringifyJson(project.hkrr),
    stringifyJson(project.hamd),
    stringifyJson(project.writingMoves),
    project.createdAt,
    project.updatedAt,
  );

  return project;
}

export function updateProject(projectId: string, patch: Partial<ArticleProject>): ArticleProject {
  const current = getProject(projectId);
  if (!current) {
    throw new Error("项目不存在。");
  }

  const mergedThinkCard = patch.thinkCard ? { ...current.thinkCard, ...patch.thinkCard } : current.thinkCard;
  const mergedStyleCore = patch.styleCore ? { ...current.styleCore, ...patch.styleCore } : current.styleCore;
  const compatibilityFrames =
    patch.thinkCard || patch.styleCore
      ? deriveLegacyFrames({
          topic: patch.topic ?? current.topic,
          articleType: patch.articleType ?? current.articleType,
          thesis: patch.thesis ?? current.thesis,
          thinkCard: mergedThinkCard,
          styleCore: mergedStyleCore,
          currentHAMD: patch.hamd ?? current.hamd,
          currentWritingMoves: patch.writingMoves ?? current.writingMoves,
        })
      : null;

  const nextProject: ArticleProject = {
    ...current,
    ...patch,
    thinkCard: mergedThinkCard,
    styleCore: mergedStyleCore,
    vitalityCheck: patch.vitalityCheck ?? current.vitalityCheck,
    hkrr: compatibilityFrames?.hkrr ?? patch.hkrr ?? current.hkrr,
    hamd: compatibilityFrames?.hamd ?? patch.hamd ?? current.hamd,
    writingMoves: compatibilityFrames?.writingMoves ?? patch.writingMoves ?? current.writingMoves,
    updatedAt: nowIso(),
  };

  const db = getDb();
  db.prepare(
    `
      UPDATE article_projects
      SET topic = ?, audience = ?, article_type = ?, stage = ?, thesis = ?, core_question = ?, target_words = ?, notes = ?, think_card_json = ?, style_core_json = ?, vitality_check_json = ?, hkrr_json = ?, hamd_json = ?, writing_moves_json = ?, updated_at = ?
      WHERE id = ?
    `,
  ).run(
    nextProject.topic,
    nextProject.audience,
    nextProject.articleType,
    nextProject.stage,
    nextProject.thesis,
    nextProject.coreQuestion,
    nextProject.targetWords,
    nextProject.notes,
    stringifyJson(nextProject.thinkCard),
    stringifyJson(nextProject.styleCore),
    stringifyJson(nextProject.vitalityCheck),
    stringifyJson(nextProject.hkrr),
    stringifyJson(nextProject.hamd),
    stringifyJson(nextProject.writingMoves),
    nextProject.updatedAt,
    projectId,
  );

  return nextProject;
}

function getJsonEntity<T>(tableName: string, projectId: string): T | null {
  const db = getDb();
  const row = db.prepare(`SELECT data_json FROM ${tableName} WHERE project_id = ?`).get(projectId) as
    | { data_json: string }
    | undefined;
  return row ? parseJson<T>(row.data_json, null as T) : null;
}

function upsertJsonEntity<T>(tableName: string, projectId: string, value: T): T {
  const db = getDb();
  const now = nowIso();
  db.prepare(
    `
      INSERT INTO ${tableName} (project_id, data_json, created_at, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(project_id) DO UPDATE SET
        data_json = excluded.data_json,
        updated_at = excluded.updated_at
    `,
  ).run(projectId, stringifyJson(value), now, now);
  return value;
}

export function getResearchBrief(projectId: string): ResearchBrief | null {
  return getJsonEntity<ResearchBrief>("research_briefs", projectId);
}

export function saveResearchBrief(projectId: string, brief: ResearchBrief): ResearchBrief {
  return upsertJsonEntity("research_briefs", projectId, brief);
}

export function listSourceCards(projectId: string): SourceCard[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM source_cards WHERE project_id = ? ORDER BY created_at DESC")
    .all(projectId)
    .map((row) => mapSourceCard(row as Record<string, unknown>));
}

export function createSourceCard(card: SourceCard): SourceCard {
  const db = getDb();
  db.prepare(
    `
      INSERT INTO source_cards (
        id, project_id, title, url, note, published_at, summary, evidence, credibility,
        source_type, support_level, claim_type, time_sensitivity, intended_section, reliability_note,
        tags_json, zone, raw_text, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
  ).run(
    card.id,
    card.projectId,
    card.title,
    card.url,
    card.note,
    card.publishedAt,
    card.summary,
    card.evidence,
    card.credibility,
    card.sourceType,
    card.supportLevel,
    card.claimType,
    card.timeSensitivity,
    card.intendedSection,
    card.reliabilityNote,
    stringifyJson(card.tags),
    card.zone,
    card.rawText,
    card.createdAt,
  );
  return card;
}

export function deleteSourceCard(projectId: string, sourceCardId: string): void {
  const db = getDb();
  db.prepare("DELETE FROM source_cards WHERE id = ? AND project_id = ?").run(sourceCardId, projectId);
}

export function getSectorModel(projectId: string): SectorModel | null {
  return getJsonEntity<SectorModel>("sector_models", projectId);
}

export function saveSectorModel(projectId: string, model: SectorModel): SectorModel {
  return upsertJsonEntity("sector_models", projectId, model);
}

export function getOutlineDraft(projectId: string): OutlineDraft | null {
  const outline = getJsonEntity<OutlineDraft>("outline_drafts", projectId);
  return outline ? normalizeOutlineDraft(outline) : null;
}

export function saveOutlineDraft(projectId: string, outline: OutlineDraft): OutlineDraft {
  return upsertJsonEntity("outline_drafts", projectId, normalizeOutlineDraft(outline));
}

export function getArticleDraft(projectId: string): ArticleDraft | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM article_drafts WHERE project_id = ?").get(projectId) as
    | Record<string, unknown>
    | undefined;

  if (!row) {
    return null;
  }

  return {
    analysisMarkdown: String(row.analysis_markdown),
    narrativeMarkdown: String(row.narrative_markdown),
    editedMarkdown: String(row.edited_markdown),
  };
}

export function saveArticleDraft(projectId: string, draft: ArticleDraft): ArticleDraft {
  const db = getDb();
  const now = nowIso();
  db.prepare(
    `
      INSERT INTO article_drafts (
        project_id, analysis_markdown, narrative_markdown, edited_markdown, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(project_id) DO UPDATE SET
        analysis_markdown = excluded.analysis_markdown,
        narrative_markdown = excluded.narrative_markdown,
        edited_markdown = excluded.edited_markdown,
        updated_at = excluded.updated_at
    `,
  ).run(projectId, draft.analysisMarkdown, draft.narrativeMarkdown, draft.editedMarkdown, now, now);
  return draft;
}

export function listEditorialFeedbackEvents(projectId: string): EditorialFeedbackEvent[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM editorial_feedback_events WHERE project_id = ? ORDER BY created_at DESC")
    .all(projectId)
    .map((row) => mapEditorialFeedbackEvent(row as Record<string, unknown>));
}

export function replaceEditorialFeedbackEvents(projectId: string, events: EditorialFeedbackEvent[]) {
  const db = getDb();
  db.prepare("DELETE FROM editorial_feedback_events WHERE project_id = ?").run(projectId);
  const statement = db.prepare(
    `
      INSERT INTO editorial_feedback_events (
        id, project_id, draft_revision_id, event_type, section_heading,
        before_text, after_text, detail_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
  );
  for (const event of events) {
    statement.run(
      event.id,
      event.projectId,
      event.draftRevisionId,
      event.eventType,
      event.sectionHeading,
      event.beforeText,
      event.afterText,
      stringifyJson(event.detail),
      event.createdAt,
    );
  }
}

export function getReviewReport(projectId: string): ReviewReport | null {
  return getJsonEntity<ReviewReport>("review_reports", projectId);
}

export function saveReviewReport(projectId: string, report: ReviewReport): ReviewReport {
  return upsertJsonEntity("review_reports", projectId, report);
}

export function getPublishPackage(projectId: string): PublishPackage | null {
  return getJsonEntity<PublishPackage>("publish_packages", projectId);
}

export function savePublishPackage(projectId: string, publishPackage: PublishPackage): PublishPackage {
  return upsertJsonEntity("publish_packages", projectId, publishPackage);
}

export function getProjectBundle(projectId: string): ProjectBundle | null {
  const project = getProject(projectId);
  if (!project) {
    return null;
  }

  return {
    project,
    researchBrief: getResearchBrief(projectId),
    sourceCards: listSourceCards(projectId),
    sectorModel: getSectorModel(projectId),
    outlineDraft: getOutlineDraft(projectId),
    articleDraft: getArticleDraft(projectId),
    reviewReport: getReviewReport(projectId),
    publishPackage: getPublishPackage(projectId),
  };
}

function mapSampleArticle(row: Record<string, unknown>): SampleArticle {
  return {
    id: String(row.id),
    title: String(row.title),
    sectorName: String(row.sector_name),
    articleType: String(row.article_type) as SampleArticle["articleType"],
    coreThesis: String(row.core_thesis),
    structureSummary: String(row.structure_summary),
    highlightLines: parseJson<string[]>(String(row.highlight_lines_json), []),
    metaphors: parseJson<string[]>(String(row.metaphors_json), []),
    openingPatterns: parseJson<string[]>(String(row.opening_patterns_json), []),
    sourcePath: String(row.source_path),
    bodyText: String(row.body_text),
    createdAt: String(row.created_at),
  };
}

function mapSampleActionAsset(row: Record<string, unknown>): SampleActionAssetRecord {
  return {
    id: String(row.id),
    sampleId: String(row.sample_id),
    actionType: String(row.action_type) as SampleActionAssetRecord["actionType"],
    assetText: String(row.asset_text),
    rationale: String(row.rationale),
    weight: toNumber(row.weight, 1),
    createdAt: String(row.created_at),
  };
}

function mapEditorialFeedbackEvent(row: Record<string, unknown>): EditorialFeedbackEvent {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    draftRevisionId: String(row.draft_revision_id),
    eventType: String(row.event_type) as EditorialFeedbackEvent["eventType"],
    sectionHeading: String(row.section_heading),
    beforeText: String(row.before_text),
    afterText: String(row.after_text),
    detail: parseJson<Record<string, unknown>>(String(row.detail_json ?? "{}"), {}),
    createdAt: String(row.created_at),
  };
}

export function listSampleArticles(): SampleArticle[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM sample_articles ORDER BY created_at DESC, title ASC")
    .all()
    .map((row) => mapSampleArticle(row as Record<string, unknown>));
}

function listSampleActionAssets(sampleIds: string[]): SampleActionAssetRecord[] {
  if (sampleIds.length === 0) {
    return [];
  }
  const db = getDb();
  const placeholders = sampleIds.map(() => "?").join(", ");
  return db
    .prepare(`SELECT * FROM sample_action_assets WHERE sample_id IN (${placeholders}) ORDER BY weight DESC, created_at DESC`)
    .all(...sampleIds)
    .map((row) => mapSampleActionAsset(row as Record<string, unknown>));
}

function replaceSampleActionAssets(sampleId: string, assets: SampleActionAssetRecord[]) {
  const db = getDb();
  db.prepare("DELETE FROM sample_action_assets WHERE sample_id = ?").run(sampleId);
  const statement = db.prepare(
    `
      INSERT INTO sample_action_assets (id, sample_id, action_type, asset_text, rationale, weight, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
  );
  for (const asset of assets) {
    statement.run(asset.id, asset.sampleId, asset.actionType, asset.assetText, asset.rationale, asset.weight, asset.createdAt);
  }
}

function ensureSampleActionAssets(samples: SampleArticle[]) {
  const existing = listSampleActionAssets(samples.map((sample) => sample.id));
  const existingIds = new Set(existing.map((asset) => asset.sampleId));

  for (const sample of samples) {
    if (existingIds.has(sample.id)) {
      continue;
    }
    replaceSampleActionAssets(sample.id, buildSampleActionAssets(sample));
  }
}

export function rebuildAllSampleActionAssets() {
  const samples = listSampleArticles();
  for (const sample of samples) {
    replaceSampleActionAssets(sample.id, buildSampleActionAssets(sample));
  }
  return samples.length;
}

export function getSampleDigest(limit = 5): string {
  return listSampleArticles()
    .slice(0, limit)
    .map((sample, index) =>
      `${index + 1}. ${sample.title} | ${sample.articleType} | 主判断：${sample.coreThesis} | 结构：${sample.structureSummary}`,
    )
    .join("\n");
}

function tokenizeTopic(topic: string): string[] {
  const cleaned = topic.replace(/[，。！？、,.!?：:（）()\-\s]/g, " ").trim();
  const dictionary = ["北蔡", "三林", "周浦", "川沙", "康桥", "浦锦", "唐镇", "前滩", "断供", "供应", "高估", "低估", "拆迁", "规划"];
  const hits = dictionary.filter((token) => cleaned.includes(token));
  if (hits.length > 0) {
    return hits;
  }

  return cleaned
    .split(" ")
    .map((item) => item.trim())
    .filter((item) => item.length >= 2);
}

export function getRelevantSamples(input: {
  topic: string;
  articleType?: ArticleProject["articleType"] | null;
  limit?: number;
}): SampleArticle[] {
  const { topic, articleType, limit = 3 } = input;
  const tokens = tokenizeTopic(topic);

  return listSampleArticles()
    .map((sample) => {
      let score = 0;

      if (articleType && sample.articleType === articleType) {
        score += 5;
      }

      if (topic.includes(sample.sectorName)) {
        score += 9;
      }

      for (const token of tokens) {
        if (sample.title.includes(token)) {
          score += 4;
        }
        if (sample.coreThesis.includes(token)) {
          score += 3;
        }
        if (sample.bodyText.includes(token)) {
          score += 1;
        }
      }

      return { sample, score };
    })
    .sort((left, right) => right.score - left.score || left.sample.title.localeCompare(right.sample.title))
    .slice(0, limit)
    .map((item) => item.sample);
}

export function buildStyleReference(topic: string, articleType?: ArticleType | null): string {
  const samples = getRelevantSamples({ topic, articleType, limit: 3 });
  if (samples.length === 0) {
    return "暂无风格样本。";
  }

  ensureSampleActionAssets(samples);
  const actionAssets = listSampleActionAssets(samples.map((sample) => sample.id));
  const actionReference = buildStyleActionReference(actionAssets);
  if (actionReference.trim()) {
    return [
      "动作资产（只借动作，不借原句）：",
      actionReference,
      "",
      "样本提醒：",
      ...samples.map((sample, index) => `${index + 1}. ${sample.title} | 类型：${sample.articleType} | 结构：${sample.structureSummary}`),
      "",
      "禁止复用样本里的标题词、比喻、金句和命名抓手。",
    ].join("\n");
  }

  return samples
    .map((sample, index) => {
      return [
        `${index + 1}. ${sample.title}`,
        `- 板块：${sample.sectorName}`,
        `- 类型：${sample.articleType}`,
        `- 主判断：${sample.coreThesis}`,
        `- 结构：${sample.structureSummary}`,
        "- 只学习这篇如何立判断、怎么拆结构、如何回到购房者决策；不要复用标题词、比喻、金句或命名抓手。",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");
}
