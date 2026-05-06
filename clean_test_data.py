#!/usr/bin/env python3
"""
Clean test data:

1. Replace 'Mixed' rows with explicit per-test Negative/Positive rows so
   the dataset never has aggregate verdicts where individual results exist.
2. Strip cross-source references and meta-narration from testing_notes
   ("contradicted by X", "per site", "in summary chart"). Each test row
   should describe its own observation, not commentary about other tests.

Operates on the 5 source CSVs in /Users/samrispaud/Downloads/files/ and
on data/beer_data.json. Idempotent.

Usage:
    python3 clean_test_data.py            # apply
    python3 clean_test_data.py --dry-run  # preview
"""

import csv
import json
import re
import shutil
import sys
import uuid
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).parent
DB_PATH = ROOT / "data" / "beer_data.json"
CSV_DIR = ROOT / "data" / "sources"
CSV_FILES = [
    "cookingaldante_results.csv",
    "gluteninbeer_results.csv",
    "lowgluten_org_results.csv",
    "nfa_2009_results.csv",
    "smartgurlsolutions_results.csv",
]

# Mapping for Mixed → split rows. Each entry: list of (test_result, test_date, testing_notes)
# replacing the original Mixed row. Empty list = delete.
# All from cookingaldante 2022 EZ Gluten retests, plus one Beck's entry that's
# redundant with an already-captured gluteninbeer test.
MIXED_REPLACEMENTS = {
    # (csv_filename, normalized_beer_name) → replacement rows
    ("cookingaldante_results.csv", "corona extra"): [
        ("Negative at 10ppm", "2022-01-01", "Initial 2022 EZ Gluten test."),
        ("Positive at 10ppm", "2022-06-01", "Retest later in 2022 returned positive."),
    ],
    ("cookingaldante_results.csv", "modelo especial"): [
        ("Negative at 10ppm", "2022-01-01", "Initial January 2022 test."),
        ("Positive at 10ppm", "2022-10-01", "October 2022 retest returned positive."),
    ],
    ("cookingaldante_results.csv", "corona light"): [
        ("Negative at 10ppm", "2022-06-01", "Initial June 2022 test."),
        ("Positive at 10ppm", "2022-10-01", "Retest pattern across multiple draws was -/+/+/+; majority positive."),
    ],
    ("cookingaldante_results.csv", "modelo negra"): [
        ("Positive at 10ppm", "2022-06-01", "Initial June 2022 test returned positive."),
        ("Negative at 10ppm", "2022-09-01", "September 2022 retest returned negative."),
    ],
    # Beck's gluteninbeer 'Mixed' entry is redundant with the already-captured
    # 2014-06 E-Z Gluten 'Positive at 20ppm' result. Delete.
    # Note: norm_name strips the apostrophe, so the lookup key has none.
    ("gluteninbeer_results.csv", "becks"): [],
}


def norm_name(s):
    return re.sub(r"\s+", " ", re.sub(r"[\.\,'\"’]", "", (s or "").lower().strip()))


# ── Note cleanup ──────────────────────────────────────────────────────────────

# Sentence-level patterns: if a sentence matches one of these, drop the whole sentence.
DROP_SENTENCE_PATTERNS = [
    r"\b(contradict|contradicted|disagrees? with|partially contradicted)\b",
    r"\bcorroborates?\b|\bcorroborated by\b",
    r"\bconfirmed (negative|positive) by (lowgluten|cookingaldante|cooking ?al ?dante|nfa|gluteninbeer|smartgurl)",
    r"\bconsistent with .*(nfa|cookingaldante|lowgluten|gluteninbeer)",
    r"\bper (site|blog)\b",
    r"\bin summary chart\b|\bsummary chart\b",
    r"^result unclear",  # leftover from the deleted Beck's Mixed
    r"\bmixed (results? )?(across|over)\b",  # "Mixed across kits", "Mixed results across three tests"
]

DROP_SENTENCE_RE = re.compile("|".join(DROP_SENTENCE_PATTERNS), re.I)


def clean_notes(notes):
    if not notes:
        return notes
    # Split into sentences (naive: split on '. ')
    parts = re.split(r"(?<=[\.\!\?])\s+", notes.strip())
    kept = []
    for p in parts:
        if not p.strip():
            continue
        if DROP_SENTENCE_RE.search(p):
            continue
        kept.append(p.strip())
    out = " ".join(kept).strip()
    # Collapse double spaces
    out = re.sub(r"\s{2,}", " ", out)
    # Tidy trailing punct fragments left behind
    out = re.sub(r"^[,\.;:\s]+", "", out)
    out = out.strip()
    return out or None  # null if everything was dropped


# ── CSV processing ────────────────────────────────────────────────────────────

def process_csv(path):
    """Returns (new_rows, stats_dict)"""
    with open(path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames
        rows = list(reader)

    new_rows = []
    stats = {"mixed_split": 0, "mixed_deleted": 0, "notes_cleaned": 0}
    fname = path.name

    for r in rows:
        beer_n = norm_name(r.get("beer", ""))
        result = (r.get("test_result", "") or "").strip().lower()

        # Mixed handling
        if "mixed" in result:
            key = (fname, beer_n)
            if key in MIXED_REPLACEMENTS:
                replacement = MIXED_REPLACEMENTS[key]
                if not replacement:
                    stats["mixed_deleted"] += 1
                    continue
                for new_result, new_date, new_notes in replacement:
                    new_row = dict(r)
                    new_row["test_result"] = new_result
                    new_row["test_date"] = new_date
                    new_row["testing_notes"] = new_notes
                    new_rows.append(new_row)
                stats["mixed_split"] += 1
                continue
            else:
                raise RuntimeError(f"Unmapped Mixed in {fname}: {r.get('beer')!r}. Add a MIXED_REPLACEMENTS entry.")

        # Note cleanup
        original_notes = r.get("testing_notes", "")
        cleaned = clean_notes(original_notes)
        if cleaned != original_notes:
            stats["notes_cleaned"] += 1
            r["testing_notes"] = cleaned or ""

        new_rows.append(r)

    return new_rows, fieldnames, stats


# ── JSON processing ───────────────────────────────────────────────────────────

# Mapping for Mixed entries in beer_data.json. Same key as the CSV mapping but
# without the source filename (one Mixed per beer in the merged JSON).
JSON_MIXED_REPLACEMENTS = {
    "corona extra": MIXED_REPLACEMENTS[("cookingaldante_results.csv", "corona extra")],
    "modelo especial": MIXED_REPLACEMENTS[("cookingaldante_results.csv", "modelo especial")],
    "corona light": MIXED_REPLACEMENTS[("cookingaldante_results.csv", "corona light")],
    "modelo negra": MIXED_REPLACEMENTS[("cookingaldante_results.csv", "modelo negra")],
    "becks": MIXED_REPLACEMENTS[("gluteninbeer_results.csv", "becks")],
}


def _kit_key(s):
    """Aggressive kit-name normalization: strip hyphens/whitespace so
    'E-Z Gluten' and 'EZ Gluten' collapse to the same key."""
    return re.sub(r"[\-\s]+", "", (s or "").lower().strip())


def _result_key(s):
    return re.sub(r"\s+", " ", (s or "").lower().strip())


def dedupe_tests(tests):
    """Drop duplicates by (testType_norm, testResult_norm, testDate).
    For each duplicate group, keep the row with the richest testNotes —
    repeated imports of the same source row often differ only in how
    much detail the scraper captured."""
    groups = {}
    order = []
    for t in tests:
        key = (
            _kit_key(t.get("testType")),
            _result_key(t.get("testResult")),
            (t.get("testDate") or "").strip(),
        )
        if key not in groups:
            groups[key] = t
            order.append(key)
        else:
            cur = groups[key]
            cur_len = len(cur.get("testNotes") or "")
            new_len = len(t.get("testNotes") or "")
            if new_len > cur_len:
                groups[key] = t
    return [groups[k] for k in order]


def process_json(db):
    stats = {"mixed_split": 0, "mixed_deleted": 0, "notes_cleaned": 0, "dedupe_dropped": 0}
    for beer in db:
        beer_n = norm_name(beer["name"])
        new_tests = []
        for t in beer["testResults"]:
            res = (t.get("testResult") or "").strip().lower()
            if "mixed" in res and beer_n in JSON_MIXED_REPLACEMENTS:
                replacement = JSON_MIXED_REPLACEMENTS[beer_n]
                if not replacement:
                    stats["mixed_deleted"] += 1
                    continue
                for new_result, new_date, new_notes in replacement:
                    new_tests.append({
                        "id": str(uuid.uuid4()),
                        "testType": t.get("testType") or "EZ Gluten",
                        "testResult": new_result,
                        "testDate": new_date,
                        "testLink": t.get("testLink"),
                        "testNotes": new_notes,
                    })
                stats["mixed_split"] += 1
                continue
            elif "mixed" in res:
                raise RuntimeError(f"Unmapped Mixed in JSON: {beer['name']!r}")

            # Note cleanup
            original = t.get("testNotes")
            cleaned = clean_notes(original)
            if cleaned != original:
                stats["notes_cleaned"] += 1
                t["testNotes"] = cleaned
            new_tests.append(t)
        deduped = dedupe_tests(new_tests)
        stats["dedupe_dropped"] += len(new_tests) - len(deduped)
        beer["testResults"] = deduped
    return stats


# ── Main ──────────────────────────────────────────────────────────────────────

def main(dry_run=False):
    print("─" * 60)
    print("CSV cleanup")
    print("─" * 60)
    csv_changes = {}
    for fname in CSV_FILES:
        path = CSV_DIR / fname
        if not path.exists():
            print(f"  ⚠ missing: {path}")
            continue
        new_rows, fieldnames, stats = process_csv(path)
        csv_changes[fname] = (new_rows, fieldnames, stats)
        print(f"  {fname:<35} mixed_split={stats['mixed_split']} mixed_deleted={stats['mixed_deleted']} notes_cleaned={stats['notes_cleaned']}")

    print()
    print("─" * 60)
    print("JSON cleanup")
    print("─" * 60)
    with open(DB_PATH, encoding="utf-8") as f:
        db = json.load(f)
    json_stats = process_json(db)
    print(f"  data/beer_data.json    mixed_split={json_stats['mixed_split']} mixed_deleted={json_stats['mixed_deleted']} notes_cleaned={json_stats['notes_cleaned']} dedupe_dropped={json_stats['dedupe_dropped']}")

    if dry_run:
        print("\nDRY RUN — nothing written.")
        return

    # Backup JSON
    backup = DB_PATH.parent / f"beer_data.backup-{datetime.now().strftime('%Y%m%d-%H%M%S')}.json"
    shutil.copy2(DB_PATH, backup)
    print(f"\nBackup → {backup}")

    # Write CSVs
    for fname, (new_rows, fieldnames, _) in csv_changes.items():
        path = CSV_DIR / fname
        with open(path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(new_rows)
        print(f"  wrote {path}")

    # Write JSON
    with open(DB_PATH, "w", encoding="utf-8") as f:
        json.dump(db, f, indent=2, ensure_ascii=False)
    print(f"  wrote {DB_PATH}")


if __name__ == "__main__":
    main(dry_run="--dry-run" in sys.argv)
