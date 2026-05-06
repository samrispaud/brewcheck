// Recommendation surface — wraps scoreEngine to provide UI-ready data.
// Replaces the legacy gfConfidenceScore-based scoring with a computed
// algorithm; see scoreEngine.js for the math.

import { tierFor, evidenceSummary, evaluateBeer } from "./scoreEngine.js";

// Map tier keys to UI color buckets. Aligned with CSS data-safety values.
export function safetyFor(beer) {
  const t = tierFor(beer);
  return { key: t.key, label: t.label, score: t.score, sources: t.sources, batchVariation: t.batchVariation };
}

export function summaryFor(beer) {
  return evidenceSummary(beer);
}

// Test-row helpers (used by detail view)

export function ppmValue(testResult) {
  const m = String(testResult.testResult).toLowerCase().match(/(\d+\.?\d*)\s*ppm/);
  return m ? parseFloat(m[1]) : null;
}

export function isNegative(testResult) {
  return String(testResult.testResult).toLowerCase().includes("negative");
}

export function isPositive(testResult) {
  return String(testResult.testResult).toLowerCase().includes("positive");
}

export function formatDate(isoDate) {
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

// Long-form assessment text for the detail view.
export function generateExplanation(beer) {
  const t = tierFor(beer);
  const ev = evaluateBeer(beer);
  const ns = t.sources;
  const { nNeg, nPos, batchVariation } = t;

  let explanation;
  switch (t.key) {
    case "consistently-safe":
      explanation = `Consistently negative across ${ns} sources (${nNeg} negative tests, no positives). The strongest evidence pattern in the dataset.`;
      break;
    case "likely-safe":
      explanation = `Mostly negative results across ${ns} sources (${nNeg} negative${nNeg === 1 ? "" : "s"} vs ${nPos} positive${nPos === 1 ? "" : "s"}). Evidence leans clearly toward "below 20 ppm" but isn't unanimous.`;
      break;
    case "inconsistent":
      explanation = `Tests across ${ns} sources disagree (${nNeg} negative${nNeg === 1 ? "" : "s"} vs ${nPos} positive${nPos === 1 ? "" : "s"}). The data is genuinely mixed — treat as uncertain.`;
      break;
    case "limited":
      if (nPos === 0) {
        explanation = `Only one source has tested this beer (${nNeg} negative result${nNeg === 1 ? "" : "s"}). The result is promising but a single test is too thin to support a confident "safe" claim.`;
      } else if (nNeg === 0) {
        explanation = `Only one source has tested this beer (${nPos} positive result${nPos === 1 ? "" : "s"}). The result is concerning but a single test isn't conclusive.`;
      } else {
        explanation = `Only one source has tested this beer with mixed results. Too thin to draw a confident conclusion either way.`;
      }
      break;
    case "often-above":
      explanation = `Mostly positive results across ${ns} sources (${nPos} positive${nPos === 1 ? "" : "s"} vs ${nNeg} negative${nNeg === 1 ? "" : "s"}). Evidence leans toward "above the 20 ppm threshold."`;
      break;
    case "above":
    default:
      explanation = `Tests consistently report gluten above safe levels across ${ns} source${ns === 1 ? "" : "s"} (${nPos} positive vs ${nNeg} negative).`;
      break;
  }

  if (batchVariation) {
    explanation += " ⚠ At least one source has reported both positive and negative results across different test runs — batch variation is a real concern.";
  }

  // Numeric score is shown only when we have ≥2 sources. Single-source beers
  // get the Limited Evidence label and the raw test row(s) — no number, so
  // the reader isn't anchored on a misleading single-data-point computation.
  if (t.key !== "limited" && ev && ev.score !== null) {
    explanation += `\n\nScore: ${ev.score}/100.`;
  }
  return explanation;
}
