#!/usr/bin/env python3
"""
把 wz 目录中的 .docx 文章导入到 SQLite 样本库。

示例：
python3 scripts/import_wz_samples.py --source-dir wz --db-path data/workbench.db
"""

from __future__ import annotations

import argparse
import hashlib
import re
import sqlite3
from dataclasses import dataclass
from datetime import datetime, UTC
from pathlib import Path
from typing import Iterable

from docx import Document


ARTICLE_TYPES = ("断供型", "价值重估型", "规划拆解型", "误解纠偏型", "更新拆迁型")
GENERIC_PREFIXES = ("大家好", "我是", "这是我")


@dataclass
class SampleRecord:
    sample_id: str
    title: str
    sector_name: str
    article_type: str
    core_thesis: str
    structure_summary: str
    highlight_lines: list[str]
    metaphors: list[str]
    opening_patterns: list[str]
    source_path: str
    body_text: str
    created_at: str


def read_docx_text(path: Path) -> list[str]:
    document = Document(str(path))
    return [paragraph.text.strip() for paragraph in document.paragraphs if paragraph.text.strip()]


def infer_article_type(title: str, body: str) -> str:
    if "断供" in title or "断供" in body:
        return "断供型"
    if any(keyword in title for keyword in ("才是", "高估", "低估")) or any(keyword in body for keyword in ("高估", "低估", "真正")):
        return "价值重估型"
    if any(keyword in title for keyword in ("拆迁", "旧改", "要拆")) or any(keyword in body for keyword in ("拆迁", "旧改", "要拆")):
        return "更新拆迁型"
    if any(keyword in title for keyword in ("误解", "为什么", "灯下黑")):
        return "误解纠偏型"
    if "规划" in title or "看规划" in title or "控规" in body:
        return "规划拆解型"
    return "误解纠偏型"


def infer_sector_name(path: Path, paragraphs: list[str]) -> str:
    filename = path.stem
    candidates = ["北蔡", "三林", "周浦", "川沙", "康桥", "浦锦", "唐镇", "前滩", "华泾"]

    for candidate in candidates:
        if candidate in filename:
            return candidate

    for candidate in candidates:
        if any(candidate in paragraph for paragraph in paragraphs[:10]):
            return candidate

    return filename[:6]


def infer_core_thesis(title: str, paragraphs: list[str]) -> str:
    interesting = [paragraph for paragraph in paragraphs[:8] if len(paragraph) >= 18]
    if interesting:
        return interesting[0]
    return title


def infer_structure_summary(paragraphs: list[str]) -> str:
    headings = [paragraph for paragraph in paragraphs if re.match(r"^(0?\d{1,2}|[一二三四五六七八九十]+[、\.])", paragraph)]
    if headings:
      return f"以开头判断切入，随后按 {min(len(headings), 5)} 个片区/章节逐段拆解，最后回到供地和结论。"
    return "先抛判断，再解释误解来源，随后拆空间结构和板块拼图，最后回到供给和价值结论。"


def collect_highlight_lines(paragraphs: list[str]) -> list[str]:
    highlights = []
    for paragraph in paragraphs:
        if len(highlights) >= 6:
            break
        if len(paragraph) >= 16 and any(keyword in paragraph for keyword in ("不是", "真正", "其实", "像", "断供", "前滩", "低估", "高估")):
            highlights.append(paragraph)
    return highlights or paragraphs[:4]


def collect_metaphors(paragraphs: Iterable[str]) -> list[str]:
    metaphors = []
    for paragraph in paragraphs:
        if "像" in paragraph or "是" in paragraph:
            if len(paragraph) >= 12:
                metaphors.append(paragraph)
        if len(metaphors) >= 5:
            break
    return metaphors


def collect_opening_patterns(paragraphs: list[str]) -> list[str]:
    return paragraphs[:3]


def choose_title(path: Path, paragraphs: list[str]) -> str:
    for paragraph in paragraphs[:6]:
        if not paragraph.startswith(GENERIC_PREFIXES) and len(paragraph) >= 10:
            return paragraph
    return path.stem


def build_record(path: Path) -> SampleRecord:
    paragraphs = read_docx_text(path)
    body_text = "\n".join(paragraphs)
    title = choose_title(path, paragraphs) if paragraphs else path.stem
    article_type = infer_article_type(title, body_text)
    if article_type not in ARTICLE_TYPES:
        article_type = "规划拆解型"

    return SampleRecord(
        sample_id=f"sample_{hashlib.sha1(str(path).encode('utf-8')).hexdigest()[:16]}",
        title=title,
        sector_name=infer_sector_name(path, paragraphs),
        article_type=article_type,
        core_thesis=infer_core_thesis(title, paragraphs),
        structure_summary=infer_structure_summary(paragraphs),
        highlight_lines=collect_highlight_lines(paragraphs),
        metaphors=collect_metaphors(paragraphs),
        opening_patterns=collect_opening_patterns(paragraphs),
        source_path=str(path),
        body_text=body_text,
        created_at=datetime.now(UTC).isoformat(),
    )


def ensure_schema(connection: sqlite3.Connection) -> None:
    connection.execute(
        """
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
        )
        """
    )


def upsert_record(connection: sqlite3.Connection, record: SampleRecord) -> None:
    import json

    connection.execute(
        """
        INSERT INTO sample_articles (
          id, title, sector_name, article_type, core_thesis, structure_summary,
          highlight_lines_json, metaphors_json, opening_patterns_json, source_path, body_text, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(source_path) DO UPDATE SET
          title = excluded.title,
          sector_name = excluded.sector_name,
          article_type = excluded.article_type,
          core_thesis = excluded.core_thesis,
          structure_summary = excluded.structure_summary,
          highlight_lines_json = excluded.highlight_lines_json,
          metaphors_json = excluded.metaphors_json,
          opening_patterns_json = excluded.opening_patterns_json,
          body_text = excluded.body_text,
          created_at = excluded.created_at
        """,
        (
            record.sample_id,
            record.title,
            record.sector_name,
            record.article_type,
            record.core_thesis,
            record.structure_summary,
            json.dumps(record.highlight_lines, ensure_ascii=False),
            json.dumps(record.metaphors, ensure_ascii=False),
            json.dumps(record.opening_patterns, ensure_ascii=False),
            record.source_path,
            record.body_text,
            record.created_at,
        ),
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="导入 wz 样本文档到 SQLite")
    parser.add_argument("--source-dir", default="wz", help="样本文档目录")
    parser.add_argument("--db-path", default="data/workbench.db", help="SQLite 文件路径")
    args = parser.parse_args()

    source_dir = Path(args.source_dir)
    db_path = Path(args.db_path)
    db_path.parent.mkdir(parents=True, exist_ok=True)

    if not source_dir.exists():
        raise SystemExit(f"源目录不存在：{source_dir}")

    files = sorted(source_dir.glob("*.docx"))
    if not files:
        raise SystemExit(f"没有找到 .docx 文件：{source_dir}")

    connection = sqlite3.connect(str(db_path))
    ensure_schema(connection)

    imported = 0
    for file in files:
        record = build_record(file)
        upsert_record(connection, record)
        imported += 1

    connection.commit()
    connection.close()
    print(f"[OK] 已导入 {imported} 篇样本到 {db_path}")


if __name__ == "__main__":
    main()
