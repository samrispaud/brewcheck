// Four-strategy fuzzy matcher: exact, contains, token, Levenshtein.
// Direct port of FuzzyMatcher.swift — same thresholds, same scoring.

import { normalize, extractBeerName } from "../utils/queryPreprocessor.js";

export function match(query, beers, threshold = 0.5) {
  const normalizedQuery = normalize(extractBeerName(query));
  if (!normalizedQuery) return [];

  const matches = [];

  for (const beer of beers) {
    const beerName = normalize(beer.name);
    const brewery = normalize(beer.brewery);

    let bestConfidence = 0;
    let matchReason = "";

    const exact = exactMatch(normalizedQuery, beerName);
    if (exact && exact.confidence > bestConfidence) {
      bestConfidence = exact.confidence;
      matchReason = exact.reason;
    }

    const contains = containsMatch(normalizedQuery, beerName);
    if (contains && contains.confidence > bestConfidence) {
      bestConfidence = contains.confidence;
      matchReason = contains.reason;
    }

    const token = tokenMatch(normalizedQuery, beerName);
    if (token && token.confidence > bestConfidence) {
      bestConfidence = token.confidence;
      matchReason = token.reason;
    }

    const lev = levenshteinMatch(normalizedQuery, beerName);
    if (lev && lev.confidence > bestConfidence) {
      bestConfidence = lev.confidence;
      matchReason = lev.reason;
    }

    if (brewery.includes(normalizedQuery) || normalizedQuery.includes(brewery)) {
      const breweryConfidence = 0.6;
      if (breweryConfidence > bestConfidence) {
        bestConfidence = breweryConfidence;
        matchReason = "Brewery match";
      }
    }

    if (bestConfidence >= threshold) {
      matches.push({
        beer,
        confidence: bestConfidence,
        matchReason,
      });
    }
  }

  matches.sort((a, b) => {
    if (a.confidence !== b.confidence) return b.confidence - a.confidence;
    return b.beer.gfConfidenceScore - a.beer.gfConfidenceScore;
  });

  return matches;
}

function exactMatch(query, beerName) {
  if (query === beerName) return { confidence: 1.0, reason: "Exact match" };
  return null;
}

function containsMatch(query, beerName) {
  if (beerName.includes(query)) {
    const confidence = query.length / beerName.length;
    return { confidence: Math.max(confidence, 0.7), reason: "Name contains query" };
  }
  if (query.includes(beerName)) {
    const confidence = beerName.length / query.length;
    return { confidence: Math.max(confidence, 0.7), reason: "Query contains name" };
  }
  return null;
}

function tokenMatch(query, beerName) {
  const queryTokens = query.split(/\s+/).filter(Boolean);
  const beerTokens = beerName.split(/\s+/).filter(Boolean);

  if (!queryTokens.length || !beerTokens.length) return null;

  let matchedTokens = 0;
  for (const qt of queryTokens) {
    for (const bt of beerTokens) {
      if (bt.includes(qt) || qt.includes(bt)) {
        matchedTokens++;
        break;
      }
    }
  }

  if (matchedTokens > 0) {
    const confidence = matchedTokens / Math.max(queryTokens.length, beerTokens.length);
    if (confidence >= 0.5) {
      return { confidence, reason: `Token match (${matchedTokens} words)` };
    }
  }
  return null;
}

function levenshteinMatch(query, beerName) {
  const distance = levenshteinDistance(query, beerName);
  const maxLength = Math.max(query.length, beerName.length);
  if (maxLength === 0) return null;

  const similarity = 1 - distance / maxLength;
  if (similarity >= 0.6) {
    return { confidence: similarity, reason: "Similar name (typo tolerance)" };
  }
  return null;
}

function levenshteinDistance(a, b) {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  let prev = new Array(n + 1);
  let curr = new Array(n + 1);

  for (let j = 0; j <= n; j++) prev[j] = j;

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,        // deletion
        curr[j - 1] + 1,    // insertion
        prev[j - 1] + cost  // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }

  return prev[n];
}
