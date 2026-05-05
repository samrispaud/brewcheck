// Generates safety explanation text for a beer.
// Direct port of RecommendationEngine.swift.

export const SAFETY_LEVELS = {
  5: { key: "very-safe", label: "Very Safe" },
  4: { key: "safe",      label: "Safe" },
  3: { key: "caution",   label: "Use Caution" },
  2: { key: "batch",     label: "Batch Variation" },
  1: { key: "danger",    label: "Not Recommended" },
};

export function safetyFor(beer) {
  return SAFETY_LEVELS[beer.gfConfidenceScore] || SAFETY_LEVELS[1];
}

// Test result helpers (replace Swift computed properties)

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

// Beer-level aggregations

function ppmList(beer) {
  return beer.testResults.map(ppmValue).filter(v => v !== null);
}

export function averagePPM(beer) {
  const list = ppmList(beer);
  if (!list.length) return null;
  return list.reduce((a, b) => a + b, 0) / list.length;
}

export function lowestPPM(beer) {
  const list = ppmList(beer);
  return list.length ? Math.min(...list) : null;
}

export function highestPPM(beer) {
  const list = ppmList(beer);
  return list.length ? Math.max(...list) : null;
}

export function generateExplanation(beer) {
  const score = beer.gfConfidenceScore;
  const testCount = beer.testResults.length;
  const avg = averagePPM(beer);
  const lo = lowestPPM(beer);
  const hi = highestPPM(beer);
  const f = n => n.toFixed(1);

  let explanation = "";
  if (score === 5) {
    explanation = "This beer is considered very safe for gluten-free diets. ";
    if (avg !== null) explanation += `Average test result: ${f(avg)} ppm. `;
    explanation += "Well below the FDA gluten-free standard of 20 ppm.";
  } else if (score === 4) {
    explanation = "This beer is generally safe for gluten-free diets. ";
    if (avg !== null) explanation += `Average test result: ${f(avg)} ppm. `;
    explanation += "Below the FDA gluten-free standard of 20 ppm.";
  } else if (score === 3) {
    explanation = "Use caution with this beer. ";
    if (avg !== null) explanation += `Average test result: ${f(avg)} ppm. `;
    explanation += "Results may vary. Consult with your healthcare provider.";
  } else if (score === 2) {
    explanation = "⚠️ Batch variation detected. This beer has shown inconsistent test results across different batches. ";
    if (lo !== null && hi !== null) explanation += `PPM range: ${f(lo)} – ${f(hi)} ppm. `;
    explanation += "Some batches test safe while others may not. We do not recommend this beer for those with celiac disease.";
  } else {
    explanation = "Not recommended for gluten-free diets. ";
    if (avg !== null) explanation += `Average test result: ${f(avg)} ppm. `;
    explanation += "Above safe levels for celiac disease.";
  }

  explanation += testCount === 1
    ? "\n\nBased on 1 test result."
    : `\n\nBased on ${testCount} test results.`;

  return explanation;
}
