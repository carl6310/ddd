#!/usr/bin/env python3
"""
给旧项目回填 HKRR / HAMD 开题卡。

示例：
python3 scripts/backfill_project_frames.py --db-path data/workbench.db
python3 scripts/backfill_project_frames.py --db-path data/workbench.db --project-id proj_xxx
"""

from __future__ import annotations

import argparse
import json
import sqlite3
from pathlib import Path


def infer_hkrr(topic: str, thesis: str) -> dict[str, str]:
    return {
        "happy": f"用一句反常识判断拆开“{topic}”的表面标签，让读者产生“原来如此”的认知快感。",
        "knowledge": f"讲清 {topic} 的空间结构、切割线、供地节奏和适配人群，而不是只复述板块标签。",
        "resonance": "击中买房人对“买错片区比买错板块更可怕”的焦虑，以及对通勤、界面、预算错配的真实共鸣。",
        "rhythm": "开头先立判断，中段拆空间骨架和片区差异，最后回到供地和购房者判断，避免平铺直叙。",
        "summary": f"这篇不是介绍 {topic}，而是拆它为什么容易被看错，以及这种误判会带来什么后果。",
    }


def infer_hamd(topic: str, thesis: str) -> dict[str, object]:
    return {
        "hook": f"{topic} 最容易被高估的，不是位置，而是市场对它的想象被打得太满。",
        "anchor": f"{topic} 不是一个均质板块，而是几个价值完全不同的世界拼在一起。",
        "mindMap": ["张江外溢", "2号线", "国际社区", "空间切割", "供地节奏", "片区差异", "兑现速度"],
        "different": "不是重复“张江后花园”的旧叙事，而是拆市场为什么会过早给它过高定价。",
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="给旧项目回填 HKRR / HAMD")
    parser.add_argument("--db-path", default="data/workbench.db", help="SQLite 文件路径")
    parser.add_argument("--project-id", default="", help="只回填某一个项目")
    args = parser.parse_args()

    db_path = Path(args.db_path)
    if not db_path.exists():
        raise SystemExit(f"数据库不存在：{db_path}")

    conn = sqlite3.connect(str(db_path))
    query = "SELECT id, topic, thesis, hkrr_json, hamd_json FROM article_projects"
    params: tuple[str, ...] = ()
    if args.project_id:
        query += " WHERE id = ?"
        params = (args.project_id,)

    rows = conn.execute(query, params).fetchall()
    updated = 0

    for project_id, topic, thesis, hkrr_json, hamd_json in rows:
        current_hkrr = json.loads(hkrr_json or "{}")
        current_hamd = json.loads(hamd_json or "{}")

        if current_hkrr and current_hamd:
            continue

        hkrr = current_hkrr or infer_hkrr(topic, thesis)
        hamd = current_hamd or infer_hamd(topic, thesis)

        conn.execute(
            """
            UPDATE article_projects
            SET hkrr_json = ?, hamd_json = ?
            WHERE id = ?
            """,
            (json.dumps(hkrr, ensure_ascii=False), json.dumps(hamd, ensure_ascii=False), project_id),
        )
        updated += 1

    conn.commit()
    conn.close()
    print(f"[OK] 已回填 {updated} 个项目")


if __name__ == "__main__":
    main()

