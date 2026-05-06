#!/usr/bin/env python3
"""
Fill missing test_date values across data/sources/*.csv and
data/beer_data.json using a hybrid strategy:

1. smartgurlsolutions   → bulk 2020-07-01 (matches the existing 32 dated rows
                          from that source; safe convention).
2. gluteninbeer         → inherit from same-beer dated test if one exists
                          (URLs encode date as /YYYY/MM/...). Fallback: 2015-01-01.
3. lowgluten.org        → inherit from same-beer dated test if one exists.
                          Fallback: 2015-01-01 + note flagging approximation.

For inheritance, we use data/beer_data.json's existing dated tests as the
source of truth — that file carries per-post URLs and per-test dates from
the original Swift dataset. CSV rows can also pick up the per-post URL
(replacing the stale homepage URL) when a sibling is found.

Idempotent: re-running on already-dated data is a no-op.

Usage:
    python3 fill_test_dates.py            # apply
    python3 fill_test_dates.py --dry-run  # preview
"""

import csv
import json
import re
import shutil
import sys
from datetime import datetime
from pathlib import Path
from collections import defaultdict

ROOT = Path(__file__).parent
DB_PATH = ROOT / "data" / "beer_data.json"
CSV_DIR = ROOT / "data" / "sources"

# Source → host substring (used to identify which source a testLink belongs to)
SOURCE_HOSTS = {
    "smartgurlsolutions": "smartgurlsolutions.com",
    "gluteninbeer":       "gluteninbeer.blogspot",
    "lowgluten_org":      "lowgluten.org",
}

# Bulk fallback dates per source (used when inheritance fails)
FALLBACK_DATES = {
    "smartgurlsolutions": "2020-07-01",
    "gluteninbeer":       "2015-01-01",
    "lowgluten_org":      "2015-01-01",
}

# Sources where a fallback date should be flagged as approximate in the note.
# smartgurl is excluded — its existing 32 rows all use 2020-07-01 as a known
# convention, not an approximation.
APPROXIMATE_NOTE_SOURCES = {"gluteninbeer", "lowgluten_org"}
APPROXIMATE_NOTE = "Date approximate — original post date not captured in source."

CSV_FILES_BY_SOURCE = {
    "smartgurlsolutions": "smartgurlsolutions_results.csv",
    "gluteninbeer":       "gluteninbeer_results.csv",
    "lowgluten_org":      "lowgluten_org_results.csv",
}


def norm_name(s):
    return re.sub(r"\s+", " ", re.sub(r"[\.\,'\"’]", "", (s or "").lower().strip()))


def host_of(link):
    if not link or "://" not in link:
        return None
    return link.split("/")[2]


def source_of_link(link):
    h = host_of(link) or ""
    for src, sub in SOURCE_HOSTS.items():
        if sub in h:
            return src
    return None


def build_inheritance_map(db):
    """For each (source, normalized_beer_name) → best (date, link) we can
    inherit. 'Best' = earliest dated occurrence on that source for that beer."""
    out = defaultdict(list)
    for b in db:
        nb = norm_name(b["name"])
        for t in b["testResults"]:
            link = t.get("testLink") or ""
            date = (t.get("testDate") or "").strip()
            src = source_of_link(link)
            if src and date and link != f"https://www.{SOURCE_HOSTS.get(src,'')}/" and link != f"http://{SOURCE_HOSTS.get(src,'')}/":
                # only inherit from per-post URLs (skip homepage)
                if not _is_homepage(link):
                    out[(src, nb)].append((date, link))
    # Pick earliest per key
    best = {}
    for key, items in out.items():
        items.sort()
        best[key] = items[0]
    return best


def _is_homepage(link):
    if not link:
        return True
    # Strip protocol + trailing slash, count path segments
    after = re.sub(r"^https?://", "", link).rstrip("/")
    parts = after.split("/", 1)
    return len(parts) == 1 or parts[1] == ""


def fill_csv(path, src_name, inheritance, stats):
    with open(path, encoding="utf-8") as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames
        rows = list(reader)

    for r in rows:
        if (r.get("test_date") or "").strip():
            continue
        nb = norm_name(r.get("beer", ""))
        inherited = inheritance.get((src_name, nb))
        if inherited:
            date, link = inherited
            r["test_date"] = date
            # Upgrade the URL too if currently a homepage
            if _is_homepage(r.get("testing_source", "")):
                r["testing_source"] = link
            stats["inherited"] += 1
        else:
            r["test_date"] = FALLBACK_DATES[src_name]
            if src_name in APPROXIMATE_NOTE_SOURCES:
                existing = (r.get("testing_notes") or "").strip()
                if APPROXIMATE_NOTE not in existing:
                    r["testing_notes"] = (existing + (" " if existing else "") + APPROXIMATE_NOTE).strip()
            stats["fallback"] += 1
    return rows, fieldnames


def fill_json(db, inheritance, stats):
    for b in db:
        nb = norm_name(b["name"])
        for t in b["testResults"]:
            if (t.get("testDate") or "").strip():
                continue
            src = source_of_link(t.get("testLink") or "")
            if not src:
                continue
            inherited = inheritance.get((src, nb))
            if inherited:
                date, link = inherited
                t["testDate"] = date
                if _is_homepage(t.get("testLink") or ""):
                    t["testLink"] = link
                stats["inherited"] += 1
            else:
                t["testDate"] = FALLBACK_DATES[src]
                if src in APPROXIMATE_NOTE_SOURCES:
                    existing = (t.get("testNotes") or "").strip() if t.get("testNotes") else ""
                    if APPROXIMATE_NOTE not in existing:
                        t["testNotes"] = (existing + (" " if existing else "") + APPROXIMATE_NOTE).strip() or None
                stats["fallback"] += 1
    return db


def main(dry_run=False):
    with open(DB_PATH, encoding="utf-8") as f:
        db = json.load(f)

    inheritance = build_inheritance_map(db)
    print(f"Inheritance map built: {len(inheritance)} (source, beer) → (date, url) entries\n")

    # CSVs
    csv_results = {}
    for src, fname in CSV_FILES_BY_SOURCE.items():
        path = CSV_DIR / fname
        stats = {"inherited": 0, "fallback": 0}
        rows, fieldnames = fill_csv(path, src, inheritance, stats)
        csv_results[src] = (path, rows, fieldnames, stats)
        print(f"  CSV {fname:<35} inherited={stats['inherited']:<3} fallback={stats['fallback']:<3}")

    # JSON
    json_stats = {"inherited": 0, "fallback": 0}
    db_filled = fill_json(db, inheritance, json_stats)
    print(f"\n  JSON beer_data.json                inherited={json_stats['inherited']:<3} fallback={json_stats['fallback']:<3}")

    # Counts after
    remaining_undated_csv = 0
    for src, (path, rows, _, _) in csv_results.items():
        for r in rows:
            if not (r.get("test_date") or "").strip():
                remaining_undated_csv += 1
    remaining_undated_json = 0
    for b in db_filled:
        for t in b["testResults"]:
            if not (t.get("testDate") or "").strip():
                remaining_undated_json += 1

    print(f"\nAfter fill — remaining undated:")
    print(f"  CSV:  {remaining_undated_csv}")
    print(f"  JSON: {remaining_undated_json}")

    if dry_run:
        print("\nDRY RUN — nothing written.")
        return

    # Backup JSON
    backup = DB_PATH.parent / f"beer_data.backup-{datetime.now().strftime('%Y%m%d-%H%M%S')}.json"
    shutil.copy2(DB_PATH, backup)
    print(f"\nBackup → {backup}")

    # Write CSVs
    for src, (path, rows, fieldnames, _) in csv_results.items():
        with open(path, "w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=fieldnames)
            w.writeheader()
            w.writerows(rows)
        print(f"  wrote {path}")

    # Write JSON
    with open(DB_PATH, "w", encoding="utf-8") as f:
        json.dump(db_filled, f, indent=2, ensure_ascii=False)
    print(f"  wrote {DB_PATH}")


if __name__ == "__main__":
    main(dry_run="--dry-run" in sys.argv)
