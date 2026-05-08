// Scoring engine: turn a beer's raw test results into a 0–100 score and
// a six-tier label including a "Limited evidence" non-judgmental tier.
//
// Methodology (full doc in claude.md):
//   1. Each source has a weight = kit_validity (1–5) + methodological_rigor (1–5)
//   2. Each test is weighted by source_weight × recency_factor (10y halflife)
//   3. Negative tests contribute +weight, positive tests contribute −weight
//   4. raw = (Σ contributions) / (Σ |contributions|) × 50 + 50      (range 0–100)
//   5. reliability = min(1, effective_sources / 3) × batch_penalty
//      where effective_sources = n_distinct_sources + 1 if total_tests > n_distinct_sources
//      and batch_penalty = 0.7 if any source disagrees with itself, else 1.0
//   6. score = round(raw × reliability)
//   7. Limited Evidence override: if only 1 source AND fewer than 2 tests, the
//      score still computes but the displayed tier is "limited" regardless
//      (a single unreplicated test is too thin to support a confident claim).

const SOURCE_WEIGHTS = {
  nfa:            10,  // kit=5 (R5 ELISA, lab-grade), rigor=5 (published study)
  cookingaldante:  8,  // kit=3 (Skerritt), rigor=5 (multi-test, photo evidence)
  gluteninbeer:    7,  // kit=3 (Skerritt), rigor=4 (single tests, blog)
  smartgurl:       5,  // kit=2 (G12), rigor=3 (summary)
  lowgluten:       4,  // kit=2 (G12/GlutenTox), rigor=2 (kit known issues)
};

const HALFLIFE_YEARS = 10;
const BATCH_PENALTY = 0.7;

// Tier cutoffs (score values, descending)
const TIERS = {
  CONSISTENTLY_SAFE: { key: "consistently-safe", label: "Consistently below 20 ppm", min: 60 },
  LIKELY_SAFE:       { key: "likely-safe",       label: "Likely below 20 ppm",       min: 45 },
  INCONSISTENT:      { key: "inconsistent",      label: "Inconsistent",               min: 25 },
  OFTEN_ABOVE:       { key: "often-above",       label: "Often above 20 ppm",         min: 10 },
  ABOVE:             { key: "above",             label: "Above 20 ppm",               min: 0 },
};

const LIMITED = { key: "limited", label: "Limited evidence" };

// Display order for the safety filter chips and default sort. Higher = safer.
// Limited Evidence sits at the bottom regardless of internal score because
// it's a non-judgmental "we don't know enough" tier — it shouldn't compete
// with scored beers for top placement.
export const TIER_ORDER = [
  "consistently-safe",
  "likely-safe",
  "inconsistent",
  "limited",
  "often-above",
  "above",
];

const TIER_RANK = {
  "consistently-safe": 5,
  "likely-safe":       4,
  "inconsistent":      3,
  "often-above":       2,
  "above":             1,
  "limited":          -1, // always last in score-descending sort
};

// Comparator that puts safer beers first, breaking ties by raw score.
// Use Array.prototype.sort(compareBeersByTier) on a beer[] to get the
// default home-page ordering.
export function compareBeersByTier(a, b, today = new Date()) {
  const ta = tierFor(a, today);
  const tb = tierFor(b, today);
  const ra = TIER_RANK[ta.key] ?? 0;
  const rb = TIER_RANK[tb.key] ?? 0;
  if (ra !== rb) return rb - ra;
  // Within a tier, higher score first. Limited has score: null → fall back
  // to the underlying eval score so single-source beers still order amongst
  // themselves predictably.
  const sa = ta.score ?? evaluateBeer(a, today)?.score ?? -1;
  const sb = tb.score ?? evaluateBeer(b, today)?.score ?? -1;
  if (sa !== sb) return sb - sa;
  return (a.name || "").localeCompare(b.name || "");
}

export function sourceOfLink(link) {
  if (!link) return null;
  const h = link.toLowerCase();
  if (h.includes("nfa") || h.includes("witchtrials")) return "nfa";
  if (h.includes("cookingaldante")) return "cookingaldante";
  if (h.includes("gluteninbeer")) return "gluteninbeer";
  if (h.includes("smartgurl")) return "smartgurl";
  if (h.includes("lowgluten")) return "lowgluten";
  return null;
}

function parseDate(s) {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function recencyFactor(testDate, today = new Date()) {
  if (!testDate) return 0.5;
  const ageYears = (today - testDate) / (365.25 * 24 * 60 * 60 * 1000);
  return Math.pow(0.5, ageYears / HALFLIFE_YEARS);
}

function isNegative(t) {
  return /negative/i.test(t.testResult || "");
}
function isPositive(t) {
  return /positive/i.test(t.testResult || "");
}

/**
 * Compute the full evidence + score breakdown for a beer.
 * Returns { score, sources: Set<string>, contributions: number,
 *           absSum: number, batchVariation: boolean, nNeg, nPos }
 * or null if the beer has no scorable test data (no recognized sources).
 */
export function evaluateBeer(beer, today = new Date()) {
  const sources = new Set();
  const sourceResults = new Map(); // source → Set<"neg"|"pos">
  let signedSum = 0;
  let absSum = 0;
  let nNeg = 0, nPos = 0;

  for (const t of beer.testResults || []) {
    const src = sourceOfLink(t.testLink);
    if (!src || !(src in SOURCE_WEIGHTS)) continue;
    sources.add(src);
    const weight = SOURCE_WEIGHTS[src] * recencyFactor(parseDate(t.testDate), today);

    if (isNegative(t)) {
      signedSum += weight;
      absSum += weight;
      nNeg++;
      if (!sourceResults.has(src)) sourceResults.set(src, new Set());
      sourceResults.get(src).add("neg");
    } else if (isPositive(t)) {
      signedSum -= weight;
      absSum += weight;
      nPos++;
      if (!sourceResults.has(src)) sourceResults.set(src, new Set());
      sourceResults.get(src).add("pos");
    }
  }

  if (absSum === 0) return null;

  const raw = (signedSum / absSum) * 50 + 50;
  const totalTests = nNeg + nPos;
  const effectiveSources = sources.size + (totalTests > sources.size ? 1 : 0);
  const coverage = Math.min(1, effectiveSources / 3);
  const batchVariation = [...sourceResults.values()].some(set => set.size > 1);
  const reliability = coverage * (batchVariation ? BATCH_PENALTY : 1.0);
  const score = Math.round(raw * reliability);

  return {
    score,
    raw: Math.round(raw),
    sources,
    coverage,
    batchVariation,
    reliability,
    nNeg,
    nPos,
  };
}

/**
 * Resolve the displayed tier given an evaluation.
 * Returns { key, label, score } — score may be null if the beer has no
 * recognized test data.
 *
 * Limited Evidence rule: any beer with exactly one distinct source AND fewer
 * than 2 tests falls into the "limited" tier regardless of score, because a
 * single unreplicated test is too thin to support a confident safety claim.
 */
export function tierFor(beer, today = new Date()) {
  const ev = evaluateBeer(beer, today);
  if (!ev) {
    return { ...LIMITED, score: null, sources: 0, batchVariation: false, nNeg: 0, nPos: 0 };
  }
  const base = { score: ev.score, sources: ev.sources.size, batchVariation: ev.batchVariation, nNeg: ev.nNeg, nPos: ev.nPos };

  if (ev.sources.size === 1 && (ev.nNeg + ev.nPos) < 2) {
    // For limited-evidence beers we deliberately suppress the numeric score —
    // a single test isn't enough to support a confident number. Show the
    // label and the raw test result(s); let the reader decide.
    return { ...LIMITED, ...base, score: null };
  }

  for (const t of [TIERS.CONSISTENTLY_SAFE, TIERS.LIKELY_SAFE, TIERS.INCONSISTENT, TIERS.OFTEN_ABOVE, TIERS.ABOVE]) {
    if (ev.score >= t.min) {
      return { key: t.key, label: t.label, ...base };
    }
  }
  return { key: TIERS.ABOVE.key, label: TIERS.ABOVE.label, ...base };
}

/**
 * Short evidence summary for UI subtext.
 * Examples:
 *   "Tested 6 times · 5 negative + 1 positive · batch variation"
 *   "Tested once · 2 negative results"
 *   "Tested once · 1 positive result"
 */
export function evidenceSummary(beer, today = new Date()) {
  const ev = evaluateBeer(beer, today);
  if (!ev) return "No recognized test data.";
  const { sources, nNeg, nPos, batchVariation } = ev;
  const ns = sources.size;
  const total = nNeg + nPos;
  const timesLabel = total === 1 ? "Tested once" : `Tested ${total} times`;

  if (ns === 1) {
    if (nPos === 0) return `${timesLabel} · ${nNeg} negative result${nNeg === 1 ? "" : "s"}`;
    if (nNeg === 0) return `${timesLabel} · ${nPos} positive result${nPos === 1 ? "" : "s"}`;
    return `${timesLabel} · ${nNeg} negative + ${nPos} positive`;
  }

  const parts = [timesLabel];
  const resultParts = [];
  if (nNeg > 0) resultParts.push(`${nNeg} negative`);
  if (nPos > 0) resultParts.push(`${nPos} positive`);
  parts.push(resultParts.join(" + "));
  if (batchVariation) parts.push("batch variation observed");
  return parts.join(" · ");
}

// Re-export constants for tests / inspection.
export { SOURCE_WEIGHTS, HALFLIFE_YEARS, BATCH_PENALTY, TIERS, LIMITED };
