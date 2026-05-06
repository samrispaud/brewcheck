#!/usr/bin/env python3
"""
Merge 5 web-scraped CSV datasets into data/beer_data.json.

Behavior:
- Backs up the existing data/beer_data.json before writing.
- For beers already in the DB (by exact-or-fuzzy name match), appends any
  test results that aren't already present. Existing gfConfidenceScore is
  preserved — operator decides whether to re-score.
- For beers not in the DB, creates a new entry with a UUID, taking
  brewery/style from the CSV's `producer`/`style` columns. A best-effort
  gfConfidenceScore is computed from the test data (see score_for()).
- Skips empty rows and exact-duplicate tests.

Usage:
    python3 scripts/merge_csv_data.py            # apply merge
    python3 scripts/merge_csv_data.py --dry-run  # show counts without writing
"""

import csv
import json
import re
import shutil
import sys
import uuid
from collections import defaultdict
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).parent.parent
DB_PATH = ROOT / "data" / "beer_data.json"
BACKUP_PATH = ROOT / "data" / f"beer_data.backup-{datetime.now().strftime('%Y%m%d-%H%M%S')}.json"
CSV_DIR = ROOT / "data" / "sources"

CSV_FILES = [
    "cookingaldante_results.csv",
    "gluteninbeer_results.csv",
    "lowgluten_org_results.csv",
    "nfa_2009_results.csv",
    "smartgurlsolutions_results.csv",
]

# Fuzzy-match overrides: CSV name (normalized) → DB beer name (normalized).
# Built from manual review of the comparison output.
FUZZY_MATCHES = {
    "daura damm": "daura dam",
    "balboa premium": "balboa premium classic lager",
    "budweiser czech original": "budweiser",
    "budweiser us": "budweiser",
    "hofbräu oktoberfestbier": "hofbräu oktoberfest",
    "kingfisher premium": "kingfisher premium lager",
    "lost & grounded keller pils": "keller pils",
    "löwenbräu oktoberfestbier": "löwenbräu oktoberfest",
    "perlenbacher pils": "perlenbacher pilsner",
    "san miguel": "san miguel especial",
    "carlsberg beer": "carlsberg",
    "grolsch premium": "grolsch",
    "lapin kulta premium": "lapin kulta",
    "deschutes black butte porter": "black butte porter",
    "sierra nevada sidecar ipa": "sidecar ipa",
    "pelican bad santa": "bad santa",
    # Skipped intentionally (false positives in fuzzy match):
    # - "Imperial Stout" matched "Black is Beautiful- Cookies & Cream Imperial Stout" — too generic.
}


def norm(s):
    if not s:
        return ""
    s = s.lower().strip()
    s = re.sub(r"\s+", " ", s)
    s = re.sub(r"[\.\,'\"’]", "", s)
    return s


def kit_key(s):
    """Aggressive kit-name normalization: strip all whitespace and hyphens
    so 'E-Z Gluten' and 'EZ Gluten' collapse to the same key."""
    return re.sub(r"[\-\s]+", "", (s or "").lower().strip())


def parse_ppm(test_result):
    """Pull a numeric ppm value out of strings like 'Negative at 10ppm' or 'Positive 48ppm'."""
    if not test_result:
        return None
    m = re.search(r"(\d+\.?\d*)\s*(?:ppm|mg/?l)", test_result.lower())
    return float(m.group(1)) if m else None


def is_positive(test_result):
    if not test_result:
        return False
    return "positive" in test_result.lower()


def is_negative(test_result):
    if not test_result:
        return False
    return "negative" in test_result.lower()


def is_mixed(test_result):
    if not test_result:
        return False
    return "mixed" in test_result.lower()


def score_for(test_results):
    """Best-effort gfConfidenceScore from test data, mirroring the dataset's existing patterns.

    Only used for *new* beers — existing scores are preserved.
    """
    if not test_results:
        return 1
    has_mixed = any(is_mixed(t.get("testResult", "")) for t in test_results)
    has_positive = any(is_positive(t.get("testResult", "")) for t in test_results)
    has_negative = any(is_negative(t.get("testResult", "")) for t in test_results)

    if has_mixed:
        return 2  # Inconsistent across batches

    if has_positive and has_negative:
        return 2  # Conflicting tests = batch variation
    if has_positive and not has_negative:
        # All positive: how high?
        ppms = [parse_ppm(t.get("testResult", "")) for t in test_results]
        ppms = [p for p in ppms if p is not None]
        if ppms and min(ppms) >= 20:
            return 1
        return 1  # Conservative: any positive without offsetting negatives = bad

    # All negative
    ppms = [parse_ppm(t.get("testResult", "")) for t in test_results]
    ppms = [p for p in ppms if p is not None]
    if not ppms:
        return 3
    best = min(ppms)  # smaller ppm threshold = more sensitive test
    if best <= 2 and len(test_results) >= 2:
        return 5
    if best <= 5 and len(test_results) >= 2:
        return 4
    if best <= 10:
        return 4
    if best <= 20:
        return 3
    return 3


def load_csv_rows(path):
    rows = []
    with open(path, newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            rows.append({k: (v or "").strip() for k, v in r.items()})
    return rows


def main(dry_run=False):
    # Load DB
    with open(DB_PATH, encoding="utf-8") as f:
        db = json.load(f)

    db_by_norm = {norm(b["name"]): b for b in db}
    original_beer_count = len(db)
    original_test_count = sum(len(b["testResults"]) for b in db)

    new_beers_created = []
    tests_appended_existing = []
    tests_skipped_duplicate = 0
    tests_skipped_empty = 0
    rows_processed = 0
    score_conflicts = []  # beers where new data contradicts existing score

    for fname in CSV_FILES:
        src_label = fname.replace("_results.csv", "")
        path = CSV_DIR / fname
        if not path.exists():
            print(f"⚠ Missing CSV: {path}", file=sys.stderr)
            continue

        for r in load_csv_rows(path):
            rows_processed += 1
            beer = r.get("beer", "")
            if not beer:
                tests_skipped_empty += 1
                continue
            nb = norm(beer)

            # Resolve target beer
            target_key = None
            if nb in db_by_norm:
                target_key = nb
            elif nb in FUZZY_MATCHES and FUZZY_MATCHES[nb] in db_by_norm:
                target_key = FUZZY_MATCHES[nb]

            test_obj = {
                "id": str(uuid.uuid4()),
                "testType": r.get("test_type", "") or "Unknown",
                "testResult": r.get("test_result", "") or "",
                "testDate": r.get("test_date", "") or "",
                "testLink": r.get("testing_source", "") or None,
                "testNotes": r.get("testing_notes", "") or None,
            }
            if not test_obj["testResult"]:
                tests_skipped_empty += 1
                continue

            if target_key:
                target = db_by_norm[target_key]
                # Skip if duplicate. Use kit-key (strips hyphens/spaces) so
                # 'E-Z Gluten' and 'EZ Gluten' collapse to the same entry.
                existing_keys = {(kit_key(t.get("testType", "")), norm(t.get("testResult", "")))
                                 for t in target["testResults"]}
                tk = (kit_key(test_obj["testType"]), norm(test_obj["testResult"]))
                if tk in existing_keys:
                    tests_skipped_duplicate += 1
                    continue
                target["testResults"].append(test_obj)
                tests_appended_existing.append((target["name"], test_obj["testType"], test_obj["testResult"], src_label))

                # Detect score conflicts on first append per beer (rough heuristic)
                cur_score = target.get("gfConfidenceScore", 0)
                ppm = parse_ppm(test_obj["testResult"])
                if cur_score >= 4 and is_positive(test_obj["testResult"]) and ppm and ppm >= 20:
                    score_conflicts.append({
                        "beer": target["name"],
                        "current_score": cur_score,
                        "new_evidence": f"{test_obj['testResult']} ({src_label})",
                    })
                if cur_score == 1 and is_negative(test_obj["testResult"]):
                    score_conflicts.append({
                        "beer": target["name"],
                        "current_score": cur_score,
                        "new_evidence": f"{test_obj['testResult']} ({src_label})",
                    })
            else:
                # New beer
                new_id = str(uuid.uuid4())
                new_beer = {
                    "id": new_id,
                    "name": beer,
                    "brewery": r.get("producer", "") or "Unknown",
                    "style": r.get("style", "") or "",
                    "gfConfidenceScore": score_for([test_obj]),
                    "testResults": [test_obj],
                }
                db.append(new_beer)
                db_by_norm[nb] = new_beer
                new_beers_created.append(new_beer)

    # For genuinely new beers that accumulated multiple tests across CSVs,
    # recompute their score from the merged test set.
    new_beer_ids = {b["id"] for b in new_beers_created}
    for b in db:
        if b["id"] in new_beer_ids:
            b["gfConfidenceScore"] = score_for(b["testResults"])

    # Print summary
    final_beer_count = len(db)
    final_test_count = sum(len(b["testResults"]) for b in db)

    print("=" * 60)
    print(f"Rows processed:                    {rows_processed}")
    print(f"Beers before merge:                {original_beer_count}")
    print(f"Beers after merge:                 {final_beer_count}  (+{final_beer_count - original_beer_count})")
    print(f"Test results before:               {original_test_count}")
    print(f"Test results after:                {final_test_count}  (+{final_test_count - original_test_count})")
    print(f"Tests appended to existing beers:  {len(tests_appended_existing)}")
    print(f"Tests skipped (duplicate):         {tests_skipped_duplicate}")
    print(f"Tests skipped (empty):             {tests_skipped_empty}")
    print(f"New beers created:                 {len(new_beers_created)}")
    print("=" * 60)

    if score_conflicts:
        print(f"\n⚠  Score conflicts to review ({len(score_conflicts)}):")
        # Dedupe per beer
        seen = set()
        for c in score_conflicts:
            if c["beer"] in seen:
                continue
            seen.add(c["beer"])
            print(f"  {c['beer']:<35} score={c['current_score']}/5  ←  {c['new_evidence']}")

    if dry_run:
        print("\nDRY RUN — no files written.")
        return

    # Backup + write
    shutil.copy2(DB_PATH, BACKUP_PATH)
    print(f"\nBackup → {BACKUP_PATH}")

    with open(DB_PATH, "w", encoding="utf-8") as f:
        json.dump(db, f, indent=2, ensure_ascii=False)
    print(f"Wrote → {DB_PATH}")


if __name__ == "__main__":
    main(dry_run="--dry-run" in sys.argv)
