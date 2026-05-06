# BrewCheck Web App

A static web app that helps assess beer gluten safety by matching user queries (text, voice, or menu photo) against a database of 250 beers with verified gluten test results.

## Project Overview

**Status**: In development
**Platform**: Web (mobile-first, PWA-installable)
**Hosting**: GitHub Pages (deploys from `main` branch root)
**Stack**: Vanilla HTML + CSS + JavaScript (ES modules), no build step
**Offline**: Yes (service worker caches all assets after first load)
**Backend**: None — data is bundled, all logic runs in the browser

## Technology Stack

- **UI**: Plain HTML + CSS + ES modules
- **Speech recognition**: Web Speech API (Chrome/Edge/Safari; Firefox shows fallback message)
- **OCR**: Tesseract.js loaded from CDN (best-effort, runs in browser via WASM)
- **Data storage**: Static `data/beer_data.json` fetched at startup
- **Pattern matching**: Custom fuzzy matcher (Levenshtein + 3 other strategies), ported from Swift
- **PWA**: Manifest + service worker for installable + offline support

## File Structure

```
brewcheck/
├── index.html              # Single-page app shell
├── manifest.webmanifest    # PWA manifest
├── service-worker.js       # Offline cache
├── css/
│   └── styles.css
├── js/
│   ├── app.js              # Bootstrap, view routing, state
│   ├── data/
│   │   ├── beerDatabase.js
│   │   └── fuzzyMatcher.js
│   ├── utils/
│   │   └── queryPreprocessor.js
│   ├── services/
│   │   ├── recommendationEngine.js
│   │   ├── speechRecognizer.js
│   │   └── textRecognizer.js
│   └── views/
│       ├── searchView.js
│       ├── beerDetailView.js
│       ├── menuScanView.js
│       └── disclaimerView.js
├── data/
│   ├── beer_data.json      # 250 beers — canonical, served by the app
│   └── sources/            # Raw per-source CSVs (one per source, version-controlled)
│       ├── cookingaldante_results.csv
│       ├── gluteninbeer_results.csv
│       ├── lowgluten_org_results.csv
│       ├── nfa_2009_results.csv
│       └── smartgurlsolutions_results.csv
├── icons/                  # PWA icons (favicon, apple-touch, 192, 512, maskable)
├── icon-master.png         # 1254×1254 source icon (regenerate other sizes from this)
├── merge_csv_data.py       # data/sources/*.csv → data/beer_data.json (idempotent)
├── clean_test_data.py      # Strips 'Mixed' verdicts and cross-source narration; idempotent
└── data-extraction-guide.md  # Spec for scraping new sources into the CSV format
```

**Data pipeline:** scrape into `data/sources/*.csv` → run `merge_csv_data.py` → run `clean_test_data.py` → commit `data/beer_data.json`. Both scripts are idempotent and can be re-run safely.

## Conventions

- **No build step.** Author plain ES modules; the browser loads them directly. GitHub Pages serves the repo root as-is.
- **No external runtime dependencies** other than Tesseract.js (loaded from CDN only when the user opens the menu-scan view).
- **Mobile-first CSS.** Default styles target small screens; use `@media (min-width: …)` for larger.
- **System fonts** (no web-font downloads) for fast first paint.
- **Accessibility:** semantic HTML, ARIA labels on icon buttons, focus rings preserved, color is never the only signal (always pair with icon + text).

## Local Development

The site is plain static files. To preview:

```bash
# From the repo root, any of these work:
python3 -m http.server 8000        # then open http://localhost:8000
# or
npx serve .                        # if you have node
```

Service workers require a real http(s) origin (don't open `index.html` via `file://` for PWA testing).

## Deployment

GitHub Pages serves from `main` branch root. Every push to `main` redeploys automatically (after Pages is enabled once in repo settings → Pages → "Deploy from branch: main /").

Site URL: `https://samrispaud.github.io/brewcheck/`

## Git Workflow

After completing each milestone:
1. Verify the milestone's acceptance criteria are met
2. Test in a browser (mobile + desktop)
3. User confirms milestone completion
4. Commit: `git add . && git commit -m "feat: [milestone description]"`
5. Push: `git push origin main`

---

## Milestone 1: Foundation — Search & Beer Detail

**Goal**: Working web app that loads beer data and performs text search with full detail views.

**Visual test**: Open page on mobile, type "corona" → matching beers with safety indicators; tap one → full test results.

### Tasks

- Scaffold `index.html`, `css/styles.css`, `data/beer_data.json`
- Port from Swift to JS:
  - `Beer` + `TestResult` + `SafetyLevel` types and computed properties
  - `FuzzyMatcher` (4 strategies: exact, contains, token, Levenshtein) + threshold filtering
  - `QueryPreprocessor` (natural-language cleanup)
  - `RecommendationEngine` (safety explanation text)
  - `BeerDatabase` (loads JSON, exposes `search()`)
- Build search view: input + real-time results list (≥2 chars), each row showing safety icon + name + brewery + style + GF score badge
- Build beer detail view: safety header, assessment paragraph, test results list with date/type/result/notes/source link, disclaimer footer
- Apply distinctive mobile-first design via `frontend-design` skill

### Acceptance Criteria

- [x] Page loads on mobile + desktop
- [x] Console shows "Loaded 250 beers"
- [x] Typing "corona" finds Corona Extra
- [x] Typing "is heineken safe for celiac?" finds Heineken (preprocessor strips question/filler words)
- [x] Typing "guin" finds Guinness (substring + Levenshtein)
- [x] Tapping a result shows detail view with all test results, dates, PPM values
- [x] Test result links open in a new tab
- [x] Empty state shown when no query / no matches
- [x] Tap targets ≥44px, no horizontal scroll at mobile width
- [x] Hash routing: detail view sets `#/beer/{id}`, browser back returns to search with query preserved

**Known matcher limit (faithful to Swift port):** Levenshtein compares the whole query against the whole beer name including suffixes (e.g., "cornona" vs "Corona Extra" → similarity 0.5, below the 0.6 threshold, so single-word typos for multi-word beers don't match). Adding token-level Levenshtein would close this — flagging for a later iteration if it bites in real use.

---

## Milestone 2: Voice Search

**Goal**: Hands-free beer lookups via Web Speech API.

**Visual test**: Tap mic, say "Blue Moon" → search field populates, results appear.

### Tasks

- `services/speechRecognizer.js` wrapping `webkitSpeechRecognition` / `SpeechRecognition`
- Mic button in search view: idle/recording states, Firefox fallback ("voice search not supported")
- Permission handling: prompt on first tap, alert with guidance if denied
- Wire transcript into the search input

### Acceptance Criteria

- [ ] Mic button visible next to search input
- [ ] First tap requests microphone permission
- [ ] Recording state visually distinct (e.g., red icon, pulse)
- [ ] Speaking "Corona" populates the search field and triggers results
- [ ] Natural language works ("is heineken gluten free?")
- [ ] Tapping mic again stops recording
- [ ] Firefox shows fallback message instead of broken button

---

## Milestone 3: Menu OCR

**Goal**: Snap or upload a beer-menu photo, extract beer names, show matches.

**Visual test**: Tap "Scan Menu", choose a menu photo, see extracted beers with safety ratings.

### Tasks

- `services/textRecognizer.js` wrapping Tesseract.js (loaded from CDN on demand)
- Menu scan view: file/camera input (`<input type="file" accept="image/*" capture="environment">`), preview, progress indicator, results list, "Scan another" reset
- `database.searchMultiple(lines)` for batch matching with deduplication
- Filter OCR output: drop prices ($X.XX), pure numbers, ALL-CAPS section headers (TAP / DRAFT / etc.) before matching
- Clear messaging that OCR is best-effort and may take 5–15s on a phone

### Acceptance Criteria

- [ ] "Scan Menu" view accessible from bottom nav
- [ ] Camera/file input opens (camera on mobile, file picker on desktop)
- [ ] Preview thumbnail shown after selection
- [ ] Progress indicator while OCR runs
- [ ] Multiple beers in one menu are all matched
- [ ] Prices and section headers filtered out
- [ ] "No beers found" shown for non-menu images
- [ ] "Scan another" resets the view
- [ ] Tapping a result opens beer detail

---

## Milestone 4: PWA + Polish + Deploy

**Goal**: Installable, offline-capable, accessible, deployed to GitHub Pages.

### Tasks

- Generate icon variants from `icon-master.png`: `favicon-16/32`, `apple-touch-icon-180`, `icon-192`, `icon-512`, `icon-maskable-512`
- `manifest.webmanifest` with name, short_name, theme/background colors, icons, display: standalone
- `service-worker.js`: cache-first for static assets, network-first for `beer_data.json`
- Debounce search input (300ms)
- Disclaimer view (FDA 20ppm standard, batch variation explanation, data source credits)
- ARIA labels for all icon-only buttons; verify VoiceOver/TalkBack
- Verify Dynamic Type / text-size scaling
- Enable GitHub Pages in repo settings (`main` branch root)
- Verify live URL works on mobile + desktop

### Acceptance Criteria

- [ ] Site live at `https://samrispaud.github.io/brewcheck/`
- [ ] Lighthouse PWA score ≥90
- [ ] "Add to Home Screen" works on iOS Safari + Android Chrome
- [ ] App works offline after first load (verify by toggling airplane mode)
- [ ] All icon buttons have accessible labels
- [ ] Color contrast meets WCAG AA
- [ ] Debounced search (no flicker on fast typing)
- [ ] Disclaimer reachable from main view
- [ ] Tested on real iOS + Android device

---

## Data

- 250 beers, sourced from GlutenInBeer.blogspot.com, LowGluten.org, CookingAlDante.com, SmartGurlSolutions.com, and NFA 2009 (Swedish Food Administration via liveatthewitchtrials.blogspot.com)
- Last updated: December 2025
- Schema: `{ id, name, brewery, style, gfConfidenceScore (1–5), testResults[] }`
- Personal use only; not medical advice. Batch variation disclaimer required for `gfConfidenceScore = 2` beers.

## Scoring Methodology

The legacy `gfConfidenceScore` field on each beer is **ignored**. Tier and score are computed at runtime from raw test data via `js/services/scoreEngine.js`. The Python merge/clean scripts also no longer hand-set scores — they only manage the test rows.

### Source weights

Each source gets a weight = `kit_validity + methodological_rigor`, both 1–5.

**Kit validity (1–5):** how appropriate is the test method for *fermented* beverages?
- 5: R5 competitive ELISA (lab-grade, only validated method for beer)
- 4: R5 lateral flow (R5 antibody, less precise)
- 3: Skerritt polyclonal (EZ Gluten — appropriate for fragmented gluten)
- 2: G12 monoclonal lateral flow (Reveal, GlutenTox — known kit limitations for beer)
- 1: Sandwich ELISA (invalid for fermented products)

**Methodological rigor (1–5):**
- 5: Published lab study with controls + replicates
- 4: Multi-kit testing per beer with photo + control evidence
- 3: Home kit, often retests over time (dated and traceable)
- 2: Home kit, single test per beer, summary table only
- 1: Aggregated summary with little per-test provenance

**Current sources:**

| Source | Kit | Rigor | Weight |
|---|---|---|---|
| NFA 2009 (Swedish Food Agency) | 5 | 5 | **10** |
| CookingAlDante (2022–23) | 3 | 5 | **8** |
| GlutenInBeer (2013–15) | 3 | 4 | **7** |
| SmartGurlSolutions (2018–20) | 2 | 3 | **5** |
| lowgluten.org (2013–20) | 2 | 2 | **4** |

To add a new source: score it on both dimensions, sum, and add to `SOURCE_WEIGHTS` in `scoreEngine.js`.

### Per-test recency

Every test is multiplied by a recency factor with a **10-year halflife**:

```
recency = 0.5 ^ (years_since_test / 10)
```

A 2026 test contributes 1.0× its source weight. A 2016 test contributes 0.5×. A 2009 NFA test contributes ~0.3×. Beer formulations drift; old data should fade.

### Score formula

```
contribution    = source_weight × recency × (+1 if negative, −1 if positive)
raw             = (Σ contributions) / (Σ |contributions|) × 50 + 50    # 0–100
coverage        = min(1, n_distinct_sources / 3)
batch_penalty   = 0.7 if any source has produced both pos and neg results, else 1.0
reliability     = coverage × batch_penalty
score           = round(raw × reliability)
```

### Tier resolution

| Tier | Label | Rule |
|---|---|---|
| 5 | Consistently below 20 ppm | score ≥ 60 AND ≥ 2 distinct sources |
| 4 | Likely below 20 ppm | score ≥ 45 AND ≥ 2 distinct sources |
| 3 | Inconsistent | score ≥ 25 AND ≥ 2 distinct sources |
| — | **Limited evidence** | only 1 distinct source has tested it (any direction) |
| 2 | Often above 20 ppm | score ≥ 10 AND ≥ 2 distinct sources |
| 1 | Above 20 ppm | score < 10 AND ≥ 2 distinct sources |

The "Limited evidence" tier is non-judgmental — a single source is too thin to support a confident "safe" or "unsafe" claim. Within the UI it's shown in neutral gray rather than the safe→unsafe color spectrum.

**No numeric score for Limited Evidence beers.** A single data point doesn't justify a 0–100 number; the algorithm computes one but `tierFor()` deliberately returns `score: null` for these beers so the UI shows only the tier label plus the actual test result. The reader decides.
