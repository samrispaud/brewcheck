#!/usr/bin/env python3
"""Convert data/sources/*.csv → data/beer_data.json.

Usage:
    python3 scripts/merge_csv_data.py
"""

import csv
import json
import re
import uuid
from pathlib import Path

ROOT = Path(__file__).parent.parent
CSV_DIR = ROOT / "data" / "sources"
DB_PATH = ROOT / "data" / "beer_data.json"


def norm(s):
    return re.sub(r"\s+", " ", re.sub(r"[.,'\"’]", "", (s or "").lower().strip()))


def main():
    # Preserve existing beer IDs so bookmarked URLs don't break
    existing_ids = {}
    if DB_PATH.exists():
        with open(DB_PATH, encoding="utf-8") as f:
            for b in json.load(f):
                existing_ids[norm(b["name"])] = b["id"]

    beers = {}  # norm_name -> beer dict
    for path in sorted(CSV_DIR.glob("*.csv")):
        with open(path, newline="", encoding="utf-8") as f:
            for r in csv.DictReader(f):
                r = {k: (v or "").strip() for k, v in r.items()}
                name = r.get("beer", "")
                if not name or not r.get("test_result"):
                    continue
                nb = norm(name)
                if nb not in beers:
                    beers[nb] = {
                        "id": existing_ids.get(nb, str(uuid.uuid4())),
                        "name": name,
                        "brewery": r.get("producer") or "Unknown",
                        "style": r.get("style") or "",
                        "testResults": [],
                    }
                beers[nb]["testResults"].append({
                    "testType": r.get("test_type") or "Unknown",
                    "testResult": r.get("test_result"),
                    "testDate": r.get("test_date") or "",
                    "testLink": r.get("testing_source") or None,
                    "testNotes": r.get("testing_notes") or None,
                })

    db = sorted(beers.values(), key=lambda b: b["name"].lower())
    with open(DB_PATH, "w", encoding="utf-8") as f:
        json.dump(db, f, indent=2, ensure_ascii=False)
        f.write("\n")
    print(f"Wrote {len(db)} beers, {sum(len(b['testResults']) for b in db)} tests → {DB_PATH}")


if __name__ == "__main__":
    main()
