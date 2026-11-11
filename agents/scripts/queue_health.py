#!/usr/bin/env python3
"""Read-only queue health check. No API keys, no network, no database access."""
from pathlib import Path
import json
import re

ROOT = Path("agents")
TASK_RE = re.compile(r"^HM-\d{8}-\d{4}-[CM]\d{2}$")

def status():
    reports = {p.stem.removesuffix("-result") for p in (ROOT / "to-chatgpt").glob("*-result.md")}
    out = {"outstanding": {}, "completed": {}, "reports": len(reports)}
    for agent in ("codex", "muse"):
        tasks = sorted((ROOT / f"to-{agent}").glob("HM-*.md"))
        names = [p.stem for p in tasks if TASK_RE.fullmatch(p.stem)]
        out["outstanding"][agent] = [n for n in names if n not in reports]
        out["completed"][agent] = [n for n in names if n in reports]
    return out

if __name__ == "__main__":
    print(json.dumps(status(), ensure_ascii=False, indent=2))
