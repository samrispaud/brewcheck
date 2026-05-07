// Loads beer data from /data/beer_data.json once.

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
