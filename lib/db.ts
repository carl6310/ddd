import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

let database: DatabaseSync | null = null;

function databasePath() {
  return join(process.cwd(), "data", "workbench.db");
}

function initialise(db: DatabaseSync) {
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
  `);

  ensureColumn(db, "article_projects", "hkrr_json", "TEXT NOT NULL DEFAULT '{}'");
  ensureColumn(db, "article_projects", "hamd_json", "TEXT NOT NULL DEFAULT '{}'");
  ensureColumn(db, "article_projects", "writing_moves_json", "TEXT NOT NULL DEFAULT '{}'");
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
}

function ensureColumn(db: DatabaseSync, tableName: string, columnName: string, definition: string) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>;
  if (!columns.some((column) => column.name === columnName)) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

export function getDb(): DatabaseSync {
  if (database) {
    return database;
  }

  mkdirSync(join(process.cwd(), "data"), { recursive: true });
  database = new DatabaseSync(databasePath());
  initialise(database);
  return database;
}
