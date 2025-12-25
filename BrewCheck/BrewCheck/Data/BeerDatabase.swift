//
//  BeerDatabase.swift
//  BrewCheck
//
//  Created by Sam Rispaud on 12/25/25.
//

import Foundation
import Combine

/// Observable database that loads and searches beer data
class BeerDatabase: ObservableObject {

    // MARK: - Properties

    @Published var beers: [Beer] = []
    @Published var isLoading = false
    @Published var error: Error?

    // Sorted beers by safety (cached)
    private var sortedBeers: [Beer] = []

    // MARK: - Initialization

    init() {
        // Database starts empty, call loadData() to populate
    }

    // MARK: - Data Loading

    /// Load beer data from JSON bundle
    func loadData() async {
        isLoading = true
        error = nil

        do {
            // Find beer_data.json in bundle
            guard let url = Bundle.main.url(forResource: "beer_data", withExtension: "json") else {
                throw DatabaseError.fileNotFound
            }

            // Load and decode JSON
            let data = try Data(contentsOf: url)
            let decoder = JSONDecoder()
            let loadedBeers = try decoder.decode([Beer].self, from: data)

            // Update state on main actor
            await MainActor.run {
                self.beers = loadedBeers
                // Sort beers by safety (GF score descending, then by test count)
                self.sortedBeers = loadedBeers.sorted { first, second in
                    if first.gfConfidenceScore != second.gfConfidenceScore {
                        return first.gfConfidenceScore > second.gfConfidenceScore
                    }
                    return first.testResults.count > second.testResults.count
                }
                self.isLoading = false
                print("✅ Loaded \(loadedBeers.count) beers")
            }

        } catch {
            await MainActor.run {
                self.error = error
                self.isLoading = false
                print("❌ Error loading beer data: \(error)")
            }
        }
    }

    // MARK: - Search Methods

    /// Search for beers using natural language query
    /// - Parameter query: User's search query
    /// - Returns: Array of matching beers sorted by relevance
    func search(_ query: String) -> [BeerMatch] {
        guard !query.isEmpty else { return [] }

        // Preprocess query to extract beer name
        let cleanedQuery = QueryPreprocessor.extractBeerName(from: query)

        // Use fuzzy matcher to find matches
        return FuzzyMatcher.match(query: cleanedQuery, in: beers, threshold: 0.5)
    }

    /// Search for multiple terms (used for OCR menu scanning)
    /// - Parameter terms: Array of search terms from OCR
    /// - Returns: Deduplicated array of matching beers
    func searchMultiple(_ terms: [String]) -> [BeerMatch] {
        var allMatches: [BeerMatch] = []
        var seenBeerIds = Set<String>()

        for term in terms {
            let matches = search(term)

            for match in matches {
                if !seenBeerIds.contains(match.beer.id) {
                    allMatches.append(match)
                    seenBeerIds.insert(match.beer.id)
                }
            }
        }

        // Sort by confidence, then GF score
        return allMatches.sorted { first, second in
            if first.confidence != second.confidence {
                return first.confidence > second.confidence
            }
            return first.beer.gfConfidenceScore > second.beer.gfConfidenceScore
        }
    }

    /// Get a specific beer by ID
    /// - Parameter id: Beer ID
    /// - Returns: Beer if found, nil otherwise
    func getBeer(id: String) -> Beer? {
        return beers.first { $0.id == id }
    }

    /// Get paginated beers sorted by safety
    /// - Parameters:
    ///   - page: Page number (0-indexed)
    ///   - pageSize: Number of beers per page
    /// - Returns: Array of beers for the requested page
    func getSafeBeers(page: Int = 0, pageSize: Int = 30) -> [Beer] {
        let startIndex = page * pageSize
        let endIndex = min(startIndex + pageSize, sortedBeers.count)

        guard startIndex < sortedBeers.count else { return [] }

        return Array(sortedBeers[startIndex..<endIndex])
    }

    /// Total count of beers
    var totalCount: Int {
        return beers.count
    }
}

// MARK: - Errors

enum DatabaseError: LocalizedError {
    case fileNotFound
    case decodingFailed

    var errorDescription: String? {
        switch self {
        case .fileNotFound:
            return "Could not find beer_data.json in app bundle"
        case .decodingFailed:
            return "Failed to decode beer data"
        }
    }
}
