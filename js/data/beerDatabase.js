// Loads beer data from /data/beer_data.json once and exposes search().

import { match as fuzzyMatch } from "./fuzzyMatcher.js";
import { tierFor, compareBeersByTier } from "../services/scoreEngine.js";
import { bucketForStyle } from "../utils/styleBuckets.js";

let beers = [];
let beersById = new Map();

export async function loadDatabase() {
  const response = await fetch("data/beer_data.json", { cache: "default" });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} loading beer data`);
  }
  beers = await response.json();
  beersById = new Map(beers.map(b => [b.id, b]));
  console.log(`✅ Loaded ${beers.length} beers`);
  return beers.length;
}

export function search(query, threshold = 0.5) {
  if (!query || query.trim().length < 2) return [];
  return fuzzyMatch(query, beers, threshold);
}

// Used by milestone 3 (OCR) — match many candidate strings, dedupe by beer.id.
export function searchMultiple(queries, threshold = 0.6) {
  const seen = new Map();
  for (const q of queries) {
    const results = fuzzyMatch(q, beers, threshold);
    for (const r of results) {
      const existing = seen.get(r.beer.id);
      if (!existing || r.confidence > existing.confidence) {
        seen.set(r.beer.id, r);
      }
    }
  }
  return [...seen.values()].sort((a, b) => {
    if (a.confidence !== b.confidence) return b.confidence - a.confidence;
    return b.beer.gfConfidenceScore - a.beer.gfConfidenceScore;
  });
}

export function getBeer(id) {
  return beersById.get(id) || null;
}

export function getCount() {
  return beers.length;
}

// Cached default-sorted list — tier+score order doesn't change during a session.
let allSorted = null;
function getAllSorted() {
  if (allSorted) return allSorted;
  allSorted = [...beers].sort(compareBeersByTier);
  return allSorted;
}

/**
 * Unified entry point used by the search view.
 *
 *   - No query (or < 2 chars): full DB sorted by tier+score descending.
 *   - Query ≥ 2 chars: fuzzy-matched, ranked by match confidence.
 *
 * Then filters (if any) drop non-matching beers. Returns an array of
 * { beer, confidence?, matchReason? } so the renderer doesn't have to
 * branch on shape.
 */
export function searchAndFilter({ query = "", tiers = [], styleBuckets = [] } = {}) {
  const tierSet = tiers.length ? new Set(tiers) : null;
  const styleSet = styleBuckets.length ? new Set(styleBuckets) : null;

  const matchesFilters = (beer) => {
    if (tierSet && !tierSet.has(tierFor(beer).key)) return false;
    if (styleSet && !styleSet.has(bucketForStyle(beer.style))) return false;
    return true;
  };

  const trimmed = (query || "").trim();
  if (trimmed.length < 2) {
    return getAllSorted()
      .filter(matchesFilters)
      .map(beer => ({ beer }));
  }

  return fuzzyMatch(trimmed, beers, 0.5).filter(m => matchesFilters(m.beer));
}
