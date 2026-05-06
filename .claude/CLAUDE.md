## Working Style

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

### 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

### 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

## Stack

- No build step. Plain ES modules, served directly by GitHub Pages.
- No npm packages at runtime. Tesseract.js is the only CDN dependency, loaded on demand in `menuScanView.js`.
- `service-worker.js` and `manifest.webmanifest` must stay at the repo root — moving them breaks PWA scope and offline support.
- `data/beer_data.json` is the only data file the app fetches. All logic runs in the browser.

## Scoring

Tiers and scores are computed at runtime by `js/services/scoreEngine.js`. `gfConfidenceScore` in `beer_data.json` is a legacy field the display logic ignores — don't use it for anything new.

## Data Pipeline

Scrape → `data/sources/*.csv` → `python3 scripts/merge_csv_data.py` → `python3 scripts/clean_test_data.py` → commit `data/beer_data.json`. Both scripts are idempotent. `scripts/fill_test_dates.py` was a one-time backfill, not part of the regular pipeline.

## Commits

Prefixes: `feature:`, `maintenance:`, `documentation:`, `data:`, `bugfix:`. Spell them out — no conventional-commits shorthand.
