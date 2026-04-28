import type {
  ArticleDraft,
  ArticleProject,
  ArticleType,
  HAMDFrame,
  HKRRFrame,
  OutlineDraft,
  PersistedSignalBrief,
  PreSourceCard,
  ProjectBundle,
  PublishPackage,
  ResearchBrief,
  ReviewReport,
  SampleArticle,
  EditorialFeedbackEvent,
  TopicAngle,
  TopicDiscoveryBundle,
  TopicDiscoveryLink,
  TopicDiscoverySession,
  TopicCoCreationRun,
  TopicMeta,
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
import { createId, nowIso, parseJson, stringifyJson, toNumber } from "@/lib/utils";
import { buildDefaultWritingMoves } from "@/lib/writing-moves";
import { buildCardsFromLegacy, defaultTopicMeta, defaultVitalityCheck, deriveLegacyFrames } from "@/lib/author-cards";
import { classifyEditorialFeedbackEvents } from "@/lib/editorial-feedback/classifier";
import { buildSampleActionAssets, buildStyleActionReference, type SampleActionAssetRecord } from "@/lib/style-assets/registry";
import { normalizeArgumentFrame } from "@/lib/argument-frame";

function normalizeTopicMeta(value: TopicMeta | null | undefined): TopicMeta {
  const fallback = defaultTopicMeta();
  return {
    ...fallback,
    ...(value ?? {}),
    signalBrief: value?.signalBrief ?? fallback.signalBrief,
    topicScorecard: value?.topicScorecard ?? fallback.topicScorecard,
    readerLens: value?.readerLens ?? fallback.readerLens,
    selectedAngleId: value?.selectedAngleId ?? fallback.selectedAngleId,
    selectedAngleTitle: value?.selectedAngleTitle ?? fallback.selectedAngleTitle,
  };
}

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
    continuityLedger: outline.continuityLedger,
    argumentFrame: outline.argumentFrame ? normalizeArgumentFrame(outline.argumentFrame) : undefined,
    closing: outline.closing ?? "",
    sections: (outline.sections ?? []).map((section, index) => ({
      id: section.id || `section-${index + 1}`,
      heading: section.heading ?? "",
      purpose: section.purpose ?? "",
      sectionThesis: section.sectionThesis ?? "",
      singlePurpose: section.singlePurpose ?? "",
      mustLandDetail: section.mustLandDetail ?? "",
      sceneOrCost: section.sceneOrCost ?? "",
      mainlineSentence: section.mainlineSentence ?? "",
      callbackTarget: section.callbackTarget ?? "",
      microStoryNeed: section.microStoryNeed ?? "",
      discoveryTurn: section.discoveryTurn ?? "",
      opposingView: section.opposingView ?? section.counterPoint ?? "",
      readerUsefulness: section.readerUsefulness ?? section.expectedTakeaway ?? "",
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
    topicMeta: normalizeTopicMeta(parseJson<TopicMeta>(String(row.topic_meta_json ?? "{}"), defaultTopicMeta())),
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
        id, topic, audience, article_type, stage, thesis, core_question, target_words, notes, topic_meta_json, think_card_json, style_core_json, vitality_check_json, hkrr_json, hamd_json, writing_moves_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
    stringifyJson(project.topicMeta),
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
    topicMeta: patch.topicMeta ? normalizeTopicMeta({ ...current.topicMeta, ...patch.topicMeta }) : current.topicMeta,
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
      SET topic = ?, audience = ?, article_type = ?, stage = ?, thesis = ?, core_question = ?, target_words = ?, notes = ?, topic_meta_json = ?, think_card_json = ?, style_core_json = ?, vitality_check_json = ?, hkrr_json = ?, hamd_json = ?, writing_moves_json = ?, updated_at = ?
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
    stringifyJson(nextProject.topicMeta),
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
  replaceEditorialFeedbackEvents(
    projectId,
    draft.editedMarkdown.trim()
      ? classifyEditorialFeedbackEvents({
          projectId,
          narrativeMarkdown: draft.narrativeMarkdown,
          editedMarkdown: draft.editedMarkdown,
        })
      : [],
  );
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
    editorialFeedbackEvents: listEditorialFeedbackEvents(projectId),
    reviewReport: getReviewReport(projectId),
    publishPackage: getPublishPackage(projectId),
  };
}

export function getLatestTopicCoCreationRun(): TopicCoCreationRun | null {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM topic_cocreate_runs ORDER BY updated_at DESC, created_at DESC LIMIT 1")
    .get() as Record<string, unknown> | undefined;
  return row ? mapTopicCoCreationRun(row) : null;
}

export function saveTopicCoCreationRun(input: {
  input: TopicCoCreationRun["input"];
  response: TopicCoCreationRun["response"];
}): TopicCoCreationRun {
  const db = getDb();
  const now = nowIso();
  const run: TopicCoCreationRun = {
    id: createId("tccr"),
    input: input.input,
    response: input.response,
    createdAt: now,
    updatedAt: now,
  };

  db.prepare(
    `
      INSERT INTO topic_cocreate_runs (id, input_json, response_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `,
  ).run(run.id, stringifyJson(run.input), stringifyJson(run.response), run.createdAt, run.updatedAt);

  db.prepare(
    `
      DELETE FROM topic_cocreate_runs
      WHERE id NOT IN (
        SELECT id FROM topic_cocreate_runs ORDER BY updated_at DESC, created_at DESC LIMIT 10
      )
    `,
  ).run();

  return run;
}

export function createTopicDiscoverySession(input: {
  sector: string;
  intuition?: string;
  focusPoints?: string[];
  rawMaterials?: string;
  avoidAngles?: string;
  searchMode?: TopicDiscoverySession["searchMode"];
  status?: TopicDiscoverySession["status"];
}): TopicDiscoverySession {
  const db = getDb();
  const now = nowIso();
  const session: TopicDiscoverySession = {
    id: createId("tds"),
    sector: input.sector.trim(),
    intuition: input.intuition?.trim() ?? "",
    focusPoints: input.focusPoints?.map((item) => item.trim()).filter(Boolean) ?? [],
    rawMaterials: input.rawMaterials?.trim() ?? "",
    avoidAngles: input.avoidAngles?.trim() ?? "",
    searchMode: input.searchMode ?? "input_only",
    status: input.status ?? "draft",
    createdAt: now,
    updatedAt: now,
  };

  db.prepare(
    `
      INSERT INTO topic_discovery_sessions (
        id, sector, intuition, focus_points_json, raw_materials, avoid_angles, search_mode, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
  ).run(
    session.id,
    session.sector,
    session.intuition,
    stringifyJson(session.focusPoints),
    session.rawMaterials,
    session.avoidAngles,
    session.searchMode,
    session.status,
    session.createdAt,
    session.updatedAt,
  );

  return session;
}

export function getTopicDiscoverySession(sessionId: string): TopicDiscoverySession | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM topic_discovery_sessions WHERE id = ?").get(sessionId) as Record<string, unknown> | undefined;
  return row ? mapTopicDiscoverySession(row) : null;
}

export function getLatestTopicDiscoverySession(): TopicDiscoverySession | null {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM topic_discovery_sessions ORDER BY updated_at DESC, created_at DESC LIMIT 1")
    .get() as Record<string, unknown> | undefined;
  return row ? mapTopicDiscoverySession(row) : null;
}

export function updateTopicDiscoverySession(
  sessionId: string,
  patch: Partial<Pick<TopicDiscoverySession, "sector" | "intuition" | "focusPoints" | "rawMaterials" | "avoidAngles" | "searchMode" | "status">>,
): TopicDiscoverySession {
  const current = getTopicDiscoverySession(sessionId);
  if (!current) {
    throw new Error("选题发现会话不存在。");
  }

  const next: TopicDiscoverySession = {
    ...current,
    ...patch,
    sector: patch.sector?.trim() ?? current.sector,
    intuition: patch.intuition?.trim() ?? current.intuition,
    focusPoints: patch.focusPoints?.map((item) => item.trim()).filter(Boolean) ?? current.focusPoints,
    rawMaterials: patch.rawMaterials?.trim() ?? current.rawMaterials,
    avoidAngles: patch.avoidAngles?.trim() ?? current.avoidAngles,
    updatedAt: nowIso(),
  };

  const db = getDb();
  db.prepare(
    `
      UPDATE topic_discovery_sessions
      SET sector = ?, intuition = ?, focus_points_json = ?, raw_materials = ?, avoid_angles = ?, search_mode = ?, status = ?, updated_at = ?
      WHERE id = ?
    `,
  ).run(next.sector, next.intuition, stringifyJson(next.focusPoints), next.rawMaterials, next.avoidAngles, next.searchMode, next.status, next.updatedAt, sessionId);

  return next;
}

export function listTopicDiscoveryLinks(sessionId: string): TopicDiscoveryLink[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM topic_discovery_links WHERE session_id = ? ORDER BY created_at ASC")
    .all(sessionId)
    .map((row) => mapTopicDiscoveryLink(row as Record<string, unknown>));
}

export function replaceTopicDiscoveryLinks(sessionId: string, urls: string[]): TopicDiscoveryLink[] {
  const db = getDb();
  const now = nowIso();
  db.prepare("DELETE FROM topic_discovery_links WHERE session_id = ?").run(sessionId);
  const statement = db.prepare(
    `
      INSERT INTO topic_discovery_links (id, session_id, url, status, error_message, created_at, updated_at)
      VALUES (?, ?, ?, 'pending', NULL, ?, ?)
    `,
  );
  const links = Array.from(new Set(urls.map((url) => url.trim()).filter(Boolean))).map((url) => {
    const link: TopicDiscoveryLink = {
      id: createId("tdl"),
      sessionId,
      url,
      status: "pending",
      errorMessage: null,
      createdAt: now,
      updatedAt: now,
    };
    statement.run(link.id, link.sessionId, link.url, link.createdAt, link.updatedAt);
    return link;
  });

  return links;
}

export function updateTopicDiscoveryLink(linkId: string, patch: Partial<Pick<TopicDiscoveryLink, "status" | "errorMessage">>) {
  const db = getDb();
  db.prepare(
    `
      UPDATE topic_discovery_links
      SET status = COALESCE(?, status),
          error_message = ?,
          updated_at = ?
      WHERE id = ?
    `,
  ).run(patch.status ?? null, patch.errorMessage ?? null, nowIso(), linkId);
}

export function listPreSourceCards(sessionId: string): PreSourceCard[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM pre_source_cards WHERE session_id = ? ORDER BY created_at DESC")
    .all(sessionId)
    .map((row) => mapPreSourceCard(row as Record<string, unknown>));
}

export function replacePreSourceCards(sessionId: string, cards: PreSourceCard[]): PreSourceCard[] {
  const db = getDb();
  db.prepare("DELETE FROM pre_source_cards WHERE session_id = ?").run(sessionId);
  const statement = db.prepare(
    `
      INSERT INTO pre_source_cards (
        id, session_id, link_id, url, source_title, source_type, published_at, summary,
        key_claims_json, signal_tags_json, suggested_angles_json, risk_hints_json,
        extract_status, raw_content_ref, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
  );
  for (const card of cards) {
    statement.run(
      card.id,
      card.sessionId,
      card.linkId,
      card.url,
      card.sourceTitle,
      card.sourceType,
      card.publishedAt,
      card.summary,
      stringifyJson(card.keyClaims),
      stringifyJson(card.signalTags),
      stringifyJson(card.suggestedAngles),
      stringifyJson(card.riskHints),
      card.extractStatus,
      card.rawContentRef,
      card.createdAt,
      card.updatedAt,
    );
  }
  return cards;
}

export function getSignalBrief(sessionId: string): PersistedSignalBrief | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM signal_briefs WHERE session_id = ?").get(sessionId) as Record<string, unknown> | undefined;
  return row ? mapPersistedSignalBrief(row) : null;
}

export function saveSignalBrief(brief: PersistedSignalBrief): PersistedSignalBrief {
  const db = getDb();
  const now = nowIso();
  db.prepare(
    `
      INSERT INTO signal_briefs (session_id, queries_json, signals_json, gaps_json, freshness_note, generated_at, input_hash, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(session_id) DO UPDATE SET
        queries_json = excluded.queries_json,
        signals_json = excluded.signals_json,
        gaps_json = excluded.gaps_json,
        freshness_note = excluded.freshness_note,
        generated_at = excluded.generated_at,
        input_hash = excluded.input_hash,
        updated_at = excluded.updated_at
    `,
  ).run(
    brief.sessionId,
    stringifyJson(brief.queries),
    stringifyJson(brief.signals),
    stringifyJson(brief.gaps),
    brief.freshnessNote,
    brief.generatedAt,
    brief.inputHash ?? "",
    now,
    now,
  );
  return brief;
}

export function listTopicAngleCandidates(sessionId: string): TopicAngle[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM topic_angle_candidates WHERE session_id = ? ORDER BY rank ASC, created_at ASC")
    .all(sessionId)
    .map((row) => mapTopicAngleCandidate(row as Record<string, unknown>));
}

export function replaceTopicAngleCandidates(sessionId: string, angles: TopicAngle[]): TopicAngle[] {
  const db = getDb();
  const now = nowIso();
  const persistedAngles = angles.map((angle, index) => ({
    ...angle,
    id: `${sessionId}_angle_${index + 1}`,
  }));
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare("DELETE FROM topic_angle_candidates WHERE session_id = ?").run(sessionId);
    const statement = db.prepare(
      `
        INSERT INTO topic_angle_candidates (
          id, session_id, title, angle_type, core_judgement, counter_intuition, reader_value, why_now,
          hkr_json, reader_lens_json, signal_refs_json, pre_source_refs_json, needed_evidence_json,
          risk_of_misfire, recommended_next_step, is_recommended, rank, angle_json, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
    );

    for (const [index, angle] of persistedAngles.entries()) {
      statement.run(
        angle.id,
        sessionId,
        angle.title,
        angle.angleType,
        angle.coreJudgement,
        angle.counterIntuition,
        angle.readerValue,
        angle.whyNow,
        stringifyJson(angle.hkr),
        stringifyJson(angle.readerLens),
        stringifyJson(angle.signalRefs),
        stringifyJson(angle.sourceBasis),
        stringifyJson(angle.neededEvidence),
        angle.riskOfMisfire,
        angle.recommendedNextStep,
        index < 6 ? 1 : 0,
        index,
        stringifyJson(angle),
        now,
        now,
      );
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  return persistedAngles;
}

export function getTopicDiscoveryBundle(sessionId: string): TopicDiscoveryBundle | null {
  const session = getTopicDiscoverySession(sessionId);
  if (!session) {
    return null;
  }

  return {
    session,
    links: listTopicDiscoveryLinks(sessionId),
    preSourceCards: listPreSourceCards(sessionId),
    signalBrief: getSignalBrief(sessionId),
    topicAngles: listTopicAngleCandidates(sessionId),
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

function mapTopicCoCreationRun(row: Record<string, unknown>): TopicCoCreationRun {
  return {
    id: String(row.id),
    input: parseJson<TopicCoCreationRun["input"]>(String(row.input_json), {
      sector: "",
      currentIntuition: "",
      rawMaterials: "",
      avoidAngles: "",
      signalMode: "input_only",
    }),
    response: parseJson<TopicCoCreationRun["response"]>(String(row.response_json), {
      signalMode: "input_only",
      signalBrief: {
        queries: [],
        signals: [],
        gaps: [],
        freshnessNote: "",
      },
      result: {
        sector: "",
        recommendedAngles: [],
        angleLonglist: [],
        coverageSummary: {
          includedTypes: [],
          missingTypes: [],
          duplicatesMerged: 0,
        },
        angles: [],
        candidateAngles: [],
      },
      sourceDigests: [],
    }),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapTopicDiscoverySession(row: Record<string, unknown>): TopicDiscoverySession {
  return {
    id: String(row.id),
    sector: String(row.sector),
    intuition: String(row.intuition ?? ""),
    focusPoints: parseJson<string[]>(String(row.focus_points_json ?? "[]"), []),
    rawMaterials: String(row.raw_materials ?? ""),
    avoidAngles: String(row.avoid_angles ?? ""),
    searchMode: String(row.search_mode ?? "input_only") as TopicDiscoverySession["searchMode"],
    status: String(row.status ?? "draft") as TopicDiscoverySession["status"],
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapTopicDiscoveryLink(row: Record<string, unknown>): TopicDiscoveryLink {
  return {
    id: String(row.id),
    sessionId: String(row.session_id),
    url: String(row.url),
    status: String(row.status ?? "pending") as TopicDiscoveryLink["status"],
    errorMessage: row.error_message ? String(row.error_message) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapPreSourceCard(row: Record<string, unknown>): PreSourceCard {
  return {
    id: String(row.id),
    sessionId: String(row.session_id),
    linkId: row.link_id ? String(row.link_id) : null,
    url: String(row.url),
    sourceTitle: String(row.source_title),
    sourceType: String(row.source_type ?? "media") as PreSourceCard["sourceType"],
    publishedAt: String(row.published_at ?? ""),
    summary: String(row.summary ?? ""),
    keyClaims: parseJson<string[]>(String(row.key_claims_json ?? "[]"), []),
    signalTags: parseJson<string[]>(String(row.signal_tags_json ?? "[]"), []),
    suggestedAngles: parseJson<string[]>(String(row.suggested_angles_json ?? "[]"), []),
    riskHints: parseJson<string[]>(String(row.risk_hints_json ?? "[]"), []),
    extractStatus: String(row.extract_status ?? "pending") as PreSourceCard["extractStatus"],
    rawContentRef: String(row.raw_content_ref ?? ""),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapPersistedSignalBrief(row: Record<string, unknown>): PersistedSignalBrief {
  return {
    sessionId: String(row.session_id),
    queries: parseJson<string[]>(String(row.queries_json ?? "[]"), []),
    signals: parseJson<PersistedSignalBrief["signals"]>(String(row.signals_json ?? "[]"), []),
    gaps: parseJson<string[]>(String(row.gaps_json ?? "[]"), []),
    freshnessNote: String(row.freshness_note ?? ""),
    generatedAt: String(row.generated_at),
    inputHash: String(row.input_hash ?? ""),
  };
}

function mapTopicAngleCandidate(row: Record<string, unknown>): TopicAngle {
  const parsed = parseJson<TopicAngle>(String(row.angle_json), null as unknown as TopicAngle);
  if (parsed) {
    return parsed;
  }
  throw new Error("topic angle candidate 数据损坏。");
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
