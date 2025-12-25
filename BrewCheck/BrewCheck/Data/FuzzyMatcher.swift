//
//  FuzzyMatcher.swift
//  BrewCheck
//
//  Created by Sam Rispaud on 12/25/25.
//

import Foundation

/// Fuzzy matching engine with 4 strategies: exact, contains, token, and Levenshtein distance
struct FuzzyMatcher {

    /// Match beers against a query using multiple strategies
    /// - Parameters:
    ///   - query: Search query
    ///   - beers: Array of beers to search
    ///   - threshold: Minimum confidence threshold (0.0-1.0)
    /// - Returns: Array of BeerMatch sorted by confidence
    static func match(query: String, in beers: [Beer], threshold: Double = 0.5) -> [BeerMatch] {
        let normalizedQuery = QueryPreprocessor.normalize(query)

        guard !normalizedQuery.isEmpty else { return [] }

        var matches: [BeerMatch] = []

        for beer in beers {
            let normalizedBeerName = QueryPreprocessor.normalize(beer.name)
            let normalizedBrewery = QueryPreprocessor.normalize(beer.brewery)

            // Try multiple matching strategies
            var bestConfidence = 0.0
            var matchReason = ""

            // Strategy 1: Exact match
            if let (confidence, reason) = exactMatch(query: normalizedQuery, beerName: normalizedBeerName) {
                if confidence > bestConfidence {
                    bestConfidence = confidence
                    matchReason = reason
                }
            }

            // Strategy 2: Contains/substring matching
            if let (confidence, reason) = containsMatch(query: normalizedQuery, beerName: normalizedBeerName) {
                if confidence > bestConfidence {
                    bestConfidence = confidence
                    matchReason = reason
                }
            }

            // Strategy 3: Token matching (word order)
            if let (confidence, reason) = tokenMatch(query: normalizedQuery, beerName: normalizedBeerName) {
                if confidence > bestConfidence {
                    bestConfidence = confidence
                    matchReason = reason
                }
            }

            // Strategy 4: Levenshtein distance (typo tolerance)
            if let (confidence, reason) = levenshteinMatch(query: normalizedQuery, beerName: normalizedBeerName) {
                if confidence > bestConfidence {
                    bestConfidence = confidence
                    matchReason = reason
                }
            }

            // Also check brewery name
            if normalizedBrewery.contains(normalizedQuery) || normalizedQuery.contains(normalizedBrewery) {
                let breweryConfidence = 0.6
                if breweryConfidence > bestConfidence {
                    bestConfidence = breweryConfidence
                    matchReason = "Brewery match"
                }
            }

            // Add to matches if above threshold
            if bestConfidence >= threshold {
                matches.append(BeerMatch(
                    beer: beer,
                    confidence: bestConfidence,
                    matchReason: matchReason
                ))
            }
        }

        // Sort by confidence (desc), then by GF score (desc)
        return matches.sorted { first, second in
            if first.confidence != second.confidence {
                return first.confidence > second.confidence
            }
            return first.beer.gfConfidenceScore > second.beer.gfConfidenceScore
        }
    }

    // MARK: - Matching Strategies

    /// Strategy 1: Exact match
    private static func exactMatch(query: String, beerName: String) -> (confidence: Double, reason: String)? {
        if query == beerName {
            return (1.0, "Exact match")
        }
        return nil
    }

    /// Strategy 2: Contains/substring matching
    private static func containsMatch(query: String, beerName: String) -> (confidence: Double, reason: String)? {
        if beerName.contains(query) {
            let confidence = Double(query.count) / Double(beerName.count)
            return (max(confidence, 0.7), "Name contains query")
        }

        if query.contains(beerName) {
            let confidence = Double(beerName.count) / Double(query.count)
            return (max(confidence, 0.7), "Query contains name")
        }

        return nil
    }

    /// Strategy 3: Token matching (word order independent)
    private static func tokenMatch(query: String, beerName: String) -> (confidence: Double, reason: String)? {
        let queryTokens = query.components(separatedBy: .whitespaces).filter { !$0.isEmpty }
        let beerTokens = beerName.components(separatedBy: .whitespaces).filter { !$0.isEmpty }

        guard !queryTokens.isEmpty && !beerTokens.isEmpty else { return nil }

        var matchedTokens = 0

        for queryToken in queryTokens {
            for beerToken in beerTokens {
                if beerToken.contains(queryToken) || queryToken.contains(beerToken) {
                    matchedTokens += 1
                    break
                }
            }
        }

        if matchedTokens > 0 {
            let confidence = Double(matchedTokens) / Double(max(queryTokens.count, beerTokens.count))
            if confidence >= 0.5 {
                return (confidence, "Token match (\(matchedTokens) words)")
            }
        }

        return nil
    }

    /// Strategy 4: Levenshtein distance (typo tolerance)
    private static func levenshteinMatch(query: String, beerName: String) -> (confidence: Double, reason: String)? {
        let distance = levenshteinDistance(query, beerName)
        let maxLength = max(query.count, beerName.count)

        guard maxLength > 0 else { return nil }

        let similarity = 1.0 - (Double(distance) / Double(maxLength))

        if similarity >= 0.6 {
            return (similarity, "Similar name (typo tolerance)")
        }

        return nil
    }

    // MARK: - Levenshtein Distance Algorithm

    /// Calculate Levenshtein distance between two strings
    /// - Parameters:
    ///   - lhs: First string
    ///   - rhs: Second string
    /// - Returns: Edit distance (number of changes needed)
    private static func levenshteinDistance(_ lhs: String, _ rhs: String) -> Int {
        let lhsCount = lhs.count
        let rhsCount = rhs.count

        if lhsCount == 0 { return rhsCount }
        if rhsCount == 0 { return lhsCount }

        var matrix = Array(repeating: Array(repeating: 0, count: rhsCount + 1), count: lhsCount + 1)

        for i in 0...lhsCount {
            matrix[i][0] = i
        }

        for j in 0...rhsCount {
            matrix[0][j] = j
        }

        let lhsArray = Array(lhs)
        let rhsArray = Array(rhs)

        for i in 1...lhsCount {
            for j in 1...rhsCount {
                let cost = lhsArray[i - 1] == rhsArray[j - 1] ? 0 : 1
                matrix[i][j] = min(
                    matrix[i - 1][j] + 1,      // deletion
                    matrix[i][j - 1] + 1,      // insertion
                    matrix[i - 1][j - 1] + cost // substitution
                )
            }
        }

        return matrix[lhsCount][rhsCount]
    }
}
