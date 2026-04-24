import { mkdirSync } from "node:fs";
import { join } from "node:path";
import type { DatabaseSync as SQLiteDatabaseSync } from "node:sqlite";

let database: SQLiteDatabaseSync | null = null;
let DatabaseSyncCtor: typeof SQLiteDatabaseSync | null = null;

function databasePath() {
  return join(process.cwd(), "data", "workbench.db");
}

function initialise(db: SQLiteDatabaseSync) {
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS sample_articles (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      sector_name TEXT NOT NULL,
      article_type TEXT NOT NULL,
      core_thesis TEXT NOT NULL,
      structure_summary TEXT NOT NULL,
      highlight_lines_json TEXT NOT NULL,
      metaphors_json TEXT NOT NULL,
      opening_patterns_json TEXT NOT NULL,
      source_path TEXT NOT NULL UNIQUE,
      body_text TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sample_action_assets (
      id TEXT PRIMARY KEY,
      sample_id TEXT NOT NULL REFERENCES sample_articles(id) ON DELETE CASCADE,
      action_type TEXT NOT NULL,
      asset_text TEXT NOT NULL,
      rationale TEXT NOT NULL,
      weight INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS editorial_feedback_events (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES article_projects(id) ON DELETE CASCADE,
      draft_revision_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      section_heading TEXT NOT NULL,
      before_text TEXT NOT NULL,
      after_text TEXT NOT NULL,
      detail_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS article_projects (
      id TEXT PRIMARY KEY,
      topic TEXT NOT NULL,
      audience TEXT NOT NULL,
      article_type TEXT NOT NULL,
      stage TEXT NOT NULL,
      thesis TEXT NOT NULL,
      core_question TEXT NOT NULL,
      target_words INTEGER NOT NULL,
      notes TEXT NOT NULL,
      topic_meta_json TEXT NOT NULL DEFAULT '{}',
      think_card_json TEXT NOT NULL DEFAULT '{}',
      style_core_json TEXT NOT NULL DEFAULT '{}',
      vitality_check_json TEXT NOT NULL DEFAULT '{}',
      hkrr_json TEXT NOT NULL DEFAULT '{}',
      hamd_json TEXT NOT NULL DEFAULT '{}',
      writing_moves_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS research_briefs (
      project_id TEXT PRIMARY KEY REFERENCES article_projects(id) ON DELETE CASCADE,
      data_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS source_cards (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES article_projects(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      note TEXT NOT NULL,
      published_at TEXT NOT NULL,
      summary TEXT NOT NULL,
      evidence TEXT NOT NULL,
      credibility TEXT NOT NULL,
      source_type TEXT NOT NULL DEFAULT 'media',
      support_level TEXT NOT NULL DEFAULT 'medium',
      claim_type TEXT NOT NULL DEFAULT 'fact',
      time_sensitivity TEXT NOT NULL DEFAULT 'timely',
      intended_section TEXT NOT NULL DEFAULT '',
      reliability_note TEXT NOT NULL DEFAULT '',
      tags_json TEXT NOT NULL,
      zone TEXT NOT NULL,
      raw_text TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sector_models (
      project_id TEXT PRIMARY KEY REFERENCES article_projects(id) ON DELETE CASCADE,
      data_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS outline_drafts (
      project_id TEXT PRIMARY KEY REFERENCES article_projects(id) ON DELETE CASCADE,
      data_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS article_drafts (
      project_id TEXT PRIMARY KEY REFERENCES article_projects(id) ON DELETE CASCADE,
      analysis_markdown TEXT NOT NULL,
      narrative_markdown TEXT NOT NULL,
      edited_markdown TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS review_reports (
      project_id TEXT PRIMARY KEY REFERENCES article_projects(id) ON DELETE CASCADE,
      data_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS publish_packages (
      project_id TEXT PRIMARY KEY REFERENCES article_projects(id) ON DELETE CASCADE,
      data_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS topic_cocreate_runs (
      id TEXT PRIMARY KEY,
      input_json TEXT NOT NULL,
      response_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS topic_discovery_sessions (
      id TEXT PRIMARY KEY,
      sector TEXT NOT NULL,
      intuition TEXT NOT NULL DEFAULT '',
      focus_points_json TEXT NOT NULL DEFAULT '[]',
      raw_materials TEXT NOT NULL DEFAULT '',
      avoid_angles TEXT NOT NULL DEFAULT '',
      search_mode TEXT NOT NULL DEFAULT 'input_only',
      status TEXT NOT NULL DEFAULT 'draft',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS topic_discovery_links (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES topic_discovery_sessions(id) ON DELETE CASCADE,
      url TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      error_message TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pre_source_cards (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES topic_discovery_sessions(id) ON DELETE CASCADE,
      link_id TEXT REFERENCES topic_discovery_links(id) ON DELETE SET NULL,
      url TEXT NOT NULL,
      source_title TEXT NOT NULL,
      source_type TEXT NOT NULL DEFAULT 'media',
      published_at TEXT NOT NULL DEFAULT '',
      summary TEXT NOT NULL DEFAULT '',
      key_claims_json TEXT NOT NULL DEFAULT '[]',
      signal_tags_json TEXT NOT NULL DEFAULT '[]',
      suggested_angles_json TEXT NOT NULL DEFAULT '[]',
      risk_hints_json TEXT NOT NULL DEFAULT '[]',
      extract_status TEXT NOT NULL DEFAULT 'pending',
      raw_content_ref TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS signal_briefs (
      session_id TEXT PRIMARY KEY REFERENCES topic_discovery_sessions(id) ON DELETE CASCADE,
      queries_json TEXT NOT NULL,
      signals_json TEXT NOT NULL,
      gaps_json TEXT NOT NULL,
      freshness_note TEXT NOT NULL,
      generated_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS topic_angle_candidates (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES topic_discovery_sessions(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      angle_type TEXT NOT NULL,
      core_judgement TEXT NOT NULL,
      counter_intuition TEXT NOT NULL,
      reader_value TEXT NOT NULL,
      why_now TEXT NOT NULL,
      hkr_json TEXT NOT NULL,
      reader_lens_json TEXT NOT NULL,
      signal_refs_json TEXT NOT NULL,
      pre_source_refs_json TEXT NOT NULL,
      needed_evidence_json TEXT NOT NULL,
      risk_of_misfire TEXT NOT NULL,
      recommended_next_step TEXT NOT NULL,
      is_recommended INTEGER NOT NULL DEFAULT 0,
      rank INTEGER NOT NULL DEFAULT 0,
      angle_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS topic_discovery_job_runs (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES topic_discovery_sessions(id) ON DELETE CASCADE,
      step TEXT NOT NULL,
      status TEXT NOT NULL,
      dedupe_key TEXT NOT NULL,
      payload_json TEXT NOT NULL DEFAULT '{}',
      progress_stage TEXT,
      progress_message TEXT,
      result_json TEXT,
      error_code TEXT,
      error_message TEXT,
      created_at TEXT NOT NULL,
      started_at TEXT,
      heartbeat_at TEXT,
      finished_at TEXT
    );

    CREATE TABLE IF NOT EXISTS topic_discovery_job_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id TEXT NOT NULL REFERENCES topic_discovery_job_runs(id) ON DELETE CASCADE,
      level TEXT NOT NULL,
      code TEXT NOT NULL,
      message TEXT NOT NULL,
      detail_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS job_runs (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES article_projects(id) ON DELETE CASCADE,
      step TEXT NOT NULL,
      status TEXT NOT NULL,
      parent_job_id TEXT REFERENCES job_runs(id) ON DELETE SET NULL,
      dedupe_key TEXT NOT NULL,
      payload_json TEXT NOT NULL DEFAULT '{}',
      attempt_count INTEGER NOT NULL DEFAULT 0,
      max_attempts INTEGER NOT NULL DEFAULT 2,
      progress_stage TEXT,
      progress_message TEXT,
      result_json TEXT,
      error_code TEXT,
      error_message TEXT,
      created_at TEXT NOT NULL,
      started_at TEXT,
      heartbeat_at TEXT,
      finished_at TEXT
    );

    CREATE TABLE IF NOT EXISTS job_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id TEXT NOT NULL REFERENCES job_runs(id) ON DELETE CASCADE,
      level TEXT NOT NULL,
      code TEXT NOT NULL,
      message TEXT NOT NULL,
      detail_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS llm_calls (
      id TEXT PRIMARY KEY,
      job_id TEXT REFERENCES job_runs(id) ON DELETE SET NULL,
      project_id TEXT,
      task_type TEXT NOT NULL,
      model_mode TEXT NOT NULL,
      model_name TEXT NOT NULL,
      prompt_version TEXT NOT NULL,
      timeout_ms INTEGER NOT NULL,
      max_tokens INTEGER NOT NULL,
      temperature REAL NOT NULL,
      input_hash TEXT NOT NULL,
      output_hash TEXT NOT NULL,
      latency_ms INTEGER NOT NULL,
      token_usage_json TEXT NOT NULL DEFAULT '{}',
      status TEXT NOT NULL,
      error_message TEXT,
      created_at TEXT NOT NULL
    );
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_job_runs_project_created_at
    ON job_runs(project_id, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_job_runs_status_created_at
    ON job_runs(status, created_at ASC);

    CREATE UNIQUE INDEX IF NOT EXISTS uniq_job_runs_active_dedupe
    ON job_runs(dedupe_key)
    WHERE status IN ('queued', 'running');

    CREATE INDEX IF NOT EXISTS idx_job_logs_job_id_created_at
    ON job_logs(job_id, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_llm_calls_job_id_created_at
    ON llm_calls(job_id, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_llm_calls_project_id_created_at
    ON llm_calls(project_id, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_sample_action_assets_sample_id
    ON sample_action_assets(sample_id, action_type);

    CREATE UNIQUE INDEX IF NOT EXISTS uniq_sample_action_asset
    ON sample_action_assets(sample_id, action_type, asset_text);

    CREATE INDEX IF NOT EXISTS idx_editorial_feedback_project_created_at
    ON editorial_feedback_events(project_id, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_editorial_feedback_revision
    ON editorial_feedback_events(draft_revision_id, created_at ASC);

    CREATE INDEX IF NOT EXISTS idx_topic_cocreate_runs_created_at
    ON topic_cocreate_runs(created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_topic_discovery_sessions_updated_at
    ON topic_discovery_sessions(updated_at DESC);

    CREATE INDEX IF NOT EXISTS idx_topic_discovery_links_session_id
    ON topic_discovery_links(session_id, created_at ASC);

    CREATE INDEX IF NOT EXISTS idx_pre_source_cards_session_id
    ON pre_source_cards(session_id, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_topic_angle_candidates_session_id
    ON topic_angle_candidates(session_id, rank ASC, created_at ASC);

    CREATE INDEX IF NOT EXISTS idx_topic_discovery_job_runs_session_created_at
    ON topic_discovery_job_runs(session_id, created_at DESC);

    CREATE UNIQUE INDEX IF NOT EXISTS uniq_topic_discovery_job_runs_active_dedupe
    ON topic_discovery_job_runs(dedupe_key)
    WHERE status IN ('queued', 'running');

    CREATE INDEX IF NOT EXISTS idx_topic_discovery_job_logs_job_id_created_at
    ON topic_discovery_job_logs(job_id, created_at DESC);
  `);

  ensureColumn(db, "article_projects", "hkrr_json", "TEXT NOT NULL DEFAULT '{}'");
  ensureColumn(db, "article_projects", "hamd_json", "TEXT NOT NULL DEFAULT '{}'");
  ensureColumn(db, "article_projects", "writing_moves_json", "TEXT NOT NULL DEFAULT '{}'");
  ensureColumn(db, "article_projects", "topic_meta_json", "TEXT NOT NULL DEFAULT '{}'");
  ensureColumn(db, "article_projects", "think_card_json", "TEXT NOT NULL DEFAULT '{}'");
  ensureColumn(db, "article_projects", "style_core_json", "TEXT NOT NULL DEFAULT '{}'");
  ensureColumn(db, "article_projects", "vitality_check_json", "TEXT NOT NULL DEFAULT '{}'");
  ensureColumn(db, "job_runs", "result_json", "TEXT");
  ensureColumn(db, "source_cards", "source_type", "TEXT NOT NULL DEFAULT 'media'");
  ensureColumn(db, "source_cards", "support_level", "TEXT NOT NULL DEFAULT 'medium'");
  ensureColumn(db, "source_cards", "claim_type", "TEXT NOT NULL DEFAULT 'fact'");
  ensureColumn(db, "source_cards", "time_sensitivity", "TEXT NOT NULL DEFAULT 'timely'");
  ensureColumn(db, "source_cards", "intended_section", "TEXT NOT NULL DEFAULT ''");
  ensureColumn(db, "source_cards", "reliability_note", "TEXT NOT NULL DEFAULT ''");
  ensureColumn(db, "topic_discovery_sessions", "raw_materials", "TEXT NOT NULL DEFAULT ''");
  ensureColumn(db, "topic_discovery_sessions", "avoid_angles", "TEXT NOT NULL DEFAULT ''");
}

function ensureColumn(db: SQLiteDatabaseSync, tableName: string, columnName: string, definition: string) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>;
  if (!columns.some((column) => column.name === columnName)) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

function getDatabaseSyncCtor() {
  if (DatabaseSyncCtor) {
    return DatabaseSyncCtor;
  }

  const sqliteModule = process.getBuiltinModule?.("node:sqlite") as typeof import("node:sqlite") | undefined;
  if (!sqliteModule?.DatabaseSync) {
    throw new Error("当前 Node 运行环境不支持 node:sqlite。");
  }
  DatabaseSyncCtor = sqliteModule.DatabaseSync;
  return DatabaseSyncCtor;
}

export function getDb(): SQLiteDatabaseSync {
  if (database) {
    return database;
  }

  mkdirSync(join(process.cwd(), "data"), { recursive: true });
  const DatabaseSync = getDatabaseSyncCtor();
  database = new DatabaseSync(databasePath());
  initialise(database);
  return database;
}
