//
//  RecommendationEngine.swift
//  BrewCheck
//
//  Created by Sam Rispaud on 12/25/25.
//

import Foundation

/// Generates safety explanations and recommendations for beers
struct RecommendationEngine {

    /// Generate safety assessment explanation for a beer
    /// - Parameter beer: The beer to assess
    /// - Returns: Detailed explanation text
    static func generateExplanation(for beer: Beer) -> String {
        let testCount = beer.testResults.count
        var explanation = ""

        // Safety level assessment
        switch beer.safetyLevel {
        case .verySafe:
            explanation = "This beer is considered very safe for gluten-free diets. "
            if let avg = beer.averagePPM {
                explanation += "Average test result: \(String(format: "%.1f", avg)) ppm. "
            }
            explanation += "Well below the FDA gluten-free standard of 20 ppm."

        case .safe:
            explanation = "This beer is generally safe for gluten-free diets. "
            if let avg = beer.averagePPM {
                explanation += "Average test result: \(String(format: "%.1f", avg)) ppm. "
            }
            explanation += "Below the FDA gluten-free standard of 20 ppm."

        case .useCaution:
            explanation = "Use caution with this beer. "
            if let avg = beer.averagePPM {
                explanation += "Average test result: \(String(format: "%.1f", avg)) ppm. "
            }
            explanation += "Results may vary. Consult with your healthcare provider."

        case .batchVariation:
            explanation = "⚠️ Batch variation detected. This beer has shown inconsistent test results across different batches. "
            if let lowest = beer.lowestPPM, let highest = beer.highestPPM {
                explanation += "PPM range: \(String(format: "%.1f", lowest)) - \(String(format: "%.1f", highest)) ppm. "
            }
            explanation += "Some batches test safe while others may not. We do not recommend this beer for those with celiac disease."

        case .notRecommended:
            explanation = "Not recommended for gluten-free diets. "
            if let avg = beer.averagePPM {
                explanation += "Average test result: \(String(format: "%.1f", avg)) ppm. "
            }
            explanation += "Above safe levels for celiac disease."
        }

        // Test count context
        if testCount == 1 {
            explanation += "\n\nBased on 1 test result."
        } else {
            explanation += "\n\nBased on \(testCount) test results."
        }

        return explanation
    }

    /// Get guidance for beers not in database
    /// - Parameter beerName: Name of the beer
    /// - Returns: Guidance text
    static func getUnknownBeerGuidance(for beerName: String) -> String {
        return """
        We don't have test data for "\(beerName)" yet.

        For beers not in our database:
        • Check if the beer is labeled gluten-free
        • Contact the brewery for gluten testing information
        • Consider using a home gluten test kit
        • When in doubt, avoid if you have celiac disease

        If you find test results for this beer, please consider contributing to our database.
        """
    }

    /// Rank matches by combined score (confidence + GF score + test count)
    /// - Parameter matches: Array of beer matches
    /// - Returns: Sorted array with highest ranked first
    static func rankMatches(_ matches: [BeerMatch]) -> [BeerMatch] {
        return matches.sorted { first, second in
            // Primary: confidence
            if first.confidence != second.confidence {
                return first.confidence > second.confidence
            }

            // Secondary: GF score
            if first.beer.gfConfidenceScore != second.beer.gfConfidenceScore {
                return first.beer.gfConfidenceScore > second.beer.gfConfidenceScore
            }

            // Tertiary: test count
            return first.beer.testResults.count > second.beer.testResults.count
        }
    }
}
