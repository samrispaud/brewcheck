// Loads beer data from /data/beer_data.json once and exposes search().

import { match as fuzzyMatch } from "./fuzzyMatcher.js";

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
